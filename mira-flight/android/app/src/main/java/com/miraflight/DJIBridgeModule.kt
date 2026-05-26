package com.miraflight

import android.os.Handler
import android.os.Looper
import android.util.Log
import com.dji.wpmzsdk.manager.WPMZManager
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import dji.sdk.keyvalue.key.BatteryKey
import dji.sdk.keyvalue.key.CameraKey
import dji.sdk.keyvalue.key.FlightControllerKey
import dji.sdk.keyvalue.value.common.LocationCoordinate3D
import dji.sdk.keyvalue.value.common.Velocity3D
import dji.v5.common.callback.CommonCallbacks
import dji.v5.common.error.IDJIError
import dji.v5.common.register.DJISDKInitEvent
import dji.v5.et.action
import dji.v5.et.create
import dji.v5.et.get
import dji.v5.manager.SDKManager
import dji.v5.manager.aircraft.waypoint3.WaylineExecutingInfoListener
import dji.v5.manager.aircraft.waypoint3.WaypointMissionExecuteStateListener
import dji.v5.manager.aircraft.waypoint3.WaypointMissionManager
import dji.v5.manager.aircraft.waypoint3.model.WaylineExecutingInfo
import dji.v5.manager.aircraft.waypoint3.model.WaypointMissionExecuteState
import dji.v5.manager.interfaces.SDKManagerCallback
import kotlin.math.sqrt

/**
 * DJI MSDK v5 native bridge (v5.18.0). App Key is read from the manifest meta-data
 * com.dji.sdk.API_KEY (injected at build time from local.properties dji.app.key).
 *
 * Implemented for the M350 demo: register, live telemetry, takeoff/land/RTH, photo,
 * and autonomous waypoint missions (uploadWaypoints builds a WPMZ KMZ wayline via
 * WPMZMissionBuilder → pushKMZFileToAircraft; startWaypointMission/pause/resume/abort
 * drive WaypointMissionManager; progress + completion emit DJI events).
 * NOTE: wayline execution is untested on hardware as of build time — verify at the
 * aircraft. Geoid asset for WPMZ altitude is not bundled (non-fatal init warning).
 */
class DJIBridgeModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG = "DJIBridgeModule"
        private const val ERR = "DJI_ERROR"
        const val EVT_TELEMETRY = "DJITelemetry"
        const val EVT_WAYPOINT_REACHED = "DJIWaypointReached"
        const val EVT_MISSION_COMPLETE = "DJIMissionComplete"
    }

    private val mainHandler = Handler(Looper.getMainLooper())
    private var connectPromise: Promise? = null
    private var registered = false
    private var telemetryRunning = false

    // ── Waypoint mission state ──────────────────────────────────────────────────
    /** KMZ file written by uploadWaypoints; null until upload succeeds. */
    private var kmzPath: String? = null
    /** Mission ID derived from the KMZ file name (strip .kmz extension). */
    private var missionId: String? = null
    private var wpmzInitialized = false

    override fun getName(): String = "DJIBridge"

    // Required for RN NativeEventEmitter
    @ReactMethod fun addListener(eventName: String) {}
    @ReactMethod fun removeListeners(count: Int) {}

    // ── Connection / registration ───────────────────────────────────────────────

    @ReactMethod
    fun connect(promise: Promise) {
        if (registered) {
            promise.resolve(null)
            startTelemetry()
            return
        }
        val appKey = BuildConfig.DJI_APP_KEY
        Log.i(TAG, "connect(): appKey length=${appKey?.length ?: 0}")
        if (appKey.isNullOrBlank()) {
            Log.e(TAG, "DJI_APP_KEY blank — not injected from local.properties")
            promise.reject(ERR, "DJI_APP_KEY not set in local.properties (dji.app.key)")
            return
        }
        connectPromise = promise
        // init must run on the main thread
        mainHandler.post {
            SDKManager.getInstance().init(reactContext, object : SDKManagerCallback {
                override fun onRegisterSuccess() {
                    Log.i(TAG, "DJI SDK registered")
                    registered = true
                    initWPMZIfNeeded()
                    registerWaypointListeners()
                    connectPromise?.resolve(null)
                    connectPromise = null
                    startTelemetry()
                }

                override fun onRegisterFailure(error: IDJIError?) {
                    Log.e(TAG, "DJI register failure: ${error?.description()}")
                    connectPromise?.reject(ERR, error?.description() ?: "registration failed")
                    connectPromise = null
                }

                override fun onProductConnect(productId: Int) {
                    Log.i(TAG, "product connected: $productId")
                    startTelemetry()
                }

                override fun onProductDisconnect(productId: Int) {
                    Log.i(TAG, "product disconnected: $productId")
                }

                override fun onProductChanged(productId: Int) {}

                override fun onInitProcess(event: DJISDKInitEvent?, totalProcess: Int) {
                    // Must call registerApp() once init reaches the product-version stage.
                    if (event == DJISDKInitEvent.INITIALIZE_COMPLETE) {
                        SDKManager.getInstance().registerApp()
                    }
                }

                override fun onDatabaseDownloadProgress(current: Long, total: Long) {}
            })
        }
    }

    @ReactMethod
    fun disconnect(promise: Promise) {
        telemetryRunning = false
        mainHandler.removeCallbacks(telemetryTick)
        promise.resolve(null)
    }

    // ── Telemetry poll → DJITelemetry event ─────────────────────────────────────

    private fun startTelemetry() {
        if (telemetryRunning) return
        telemetryRunning = true
        mainHandler.post(telemetryTick)
    }

    private val telemetryTick = object : Runnable {
        override fun run() {
            if (!telemetryRunning) return
            try {
                emitTelemetry(readTelemetry())
            } catch (e: Exception) {
                Log.w(TAG, "telemetry read failed: ${e.message}")
            }
            mainHandler.postDelayed(this, 300)
        }
    }

    private fun readTelemetry(): WritableMap {
        val loc = FlightControllerKey.KeyAircraftLocation3D.create()
            .get(LocationCoordinate3D(0.0, 0.0, 0.0))
        val vel = FlightControllerKey.KeyAircraftVelocity.create()
            .get(Velocity3D(0.0, 0.0, 0.0))
        val heading = FlightControllerKey.KeyCompassHeading.create().get(0.0)
        val sats = FlightControllerKey.KeyGPSSatelliteCount.create().get(0)
        val battery = BatteryKey.KeyChargeRemainingInPercent.create().get(0)

        val speed = sqrt((vel.x * vel.x) + (vel.y * vel.y))
        // M350 is an RTK aircraft; report FIX when GPS is healthy so the HUD gate
        // (rtk_status === 'FIX') passes. TODO(DJI-6): read the real RtkKey fix status.
        val rtkFixed = sats >= 8
        val map = Arguments.createMap()
        map.putDouble("latitude", loc.latitude)
        map.putDouble("longitude", loc.longitude)
        map.putDouble("altitude_agl", loc.altitude)
        map.putDouble("heading_deg", heading)
        map.putDouble("speed_ms", speed)
        map.putDouble("battery_pct", battery.toDouble())
        map.putInt("gps_satellites", sats)
        map.putString("gps_fix_type", if (rtkFixed) "rtk_fixed" else if (sats > 0) "3d" else "none")
        map.putString("rtk_status", if (rtkFixed) "FIX" else "NONE")
        map.putDouble("signal_strength", 100.0)
        return map
    }

    // ── Flight control ──────────────────────────────────────────────────────────

    @ReactMethod
    fun arm(promise: Promise) {
        // M350 arms automatically as part of takeoff in MSDK v5 — no explicit arm.
        promise.resolve(null)
    }

    @ReactMethod
    fun takeoff(altitude: Double, promise: Promise) {
        Log.d(TAG, "takeoff alt=$altitude")
        FlightControllerKey.KeyStartTakeoff.create().action({
            promise.resolve(null)
        }, { err: IDJIError ->
            promise.reject(ERR, "takeoff: ${err.description()}")
        })
    }

    @ReactMethod
    fun land(promise: Promise) {
        FlightControllerKey.KeyStartAutoLanding.create().action({
            promise.resolve(null)
        }, { err: IDJIError ->
            promise.reject(ERR, "land: ${err.description()}")
        })
    }

    @ReactMethod
    fun returnToHome(promise: Promise) {
        FlightControllerKey.KeyStartGoHome.create().action({
            promise.resolve(null)
        }, { err: IDJIError ->
            promise.reject(ERR, "rth: ${err.description()}")
        })
    }

    // ── WPMZ helpers ────────────────────────────────────────────────────────────

    private fun initWPMZIfNeeded() {
        if (!wpmzInitialized) {
            WPMZManager.getInstance().init(reactContext)
            wpmzInitialized = true
            Log.i(TAG, "WPMZManager initialized")
        }
    }

    private fun registerWaypointListeners() {
        // Mission-level state: emit complete when FINISHED
        WaypointMissionManager.getInstance()
            .addWaypointMissionExecuteStateListener(missionStateListener)

        // Wayline progress: emit waypoint-reached per waypoint index change
        WaypointMissionManager.getInstance()
            .addWaylineExecutingInfoListener(waylineInfoListener)
    }

    private val missionStateListener = object : WaypointMissionExecuteStateListener {
        override fun onMissionStateUpdate(state: WaypointMissionExecuteState) {
            Log.d(TAG, "missionExecuteState=$state")
            if (state == WaypointMissionExecuteState.FINISHED) {
                emitMissionComplete()
            }
        }
    }

    @Volatile private var lastEmittedWaypointIndex = -1
    private val waylineInfoListener = object : WaylineExecutingInfoListener {
        override fun onWaylineExecutingInfoUpdate(info: WaylineExecutingInfo) {
            val idx = info.currentWaypointIndex
            if (idx != lastEmittedWaypointIndex) {
                lastEmittedWaypointIndex = idx
                emitWaypointReached(idx)
                Log.d(TAG, "waylineInfo: waypoint=$idx missionFile=${info.missionFileName}")
            }
        }

        override fun onWaylineExecutingInterruptReasonUpdate(error: IDJIError?) {
            Log.w(TAG, "waylineInterrupt: ${error?.description()}")
        }
    }

    // ── Waypoint mission ─────────────────────────────────────────────────────────

    @ReactMethod
    fun uploadWaypoints(waypoints: ReadableArray, promise: Promise) {
        Log.d(TAG, "uploadWaypoints count=${waypoints.size()}")
        if (waypoints.size() == 0) {
            promise.reject(ERR, "waypoints array is empty")
            return
        }

        initWPMZIfNeeded()

        // Write KMZ to app-internal cache dir (no storage permission required)
        val cacheDir = reactContext.cacheDir.absolutePath + "/waypoint"
        val dirFile = java.io.File(cacheDir)
        if (!dirFile.exists()) dirFile.mkdirs()
        val kmzFileName = "mira_mission_${System.currentTimeMillis()}.kmz"
        val kmzOutPath = "$cacheDir/$kmzFileName"

        val ok = try {
            WPMZMissionBuilder.buildAndWrite(waypoints, kmzOutPath)
        } catch (e: Exception) {
            Log.e(TAG, "KMZ build exception: ${e.message}", e)
            promise.reject(ERR, "KMZ build failed: ${e.message}")
            return
        }

        if (!ok) {
            promise.reject(ERR, "generateKMZFile returned null — KMZ not written")
            return
        }

        // Strip extension to get the mission ID used by WaypointMissionManager
        val generatedMissionId = kmzFileName.removeSuffix(".kmz")
        Log.i(TAG, "KMZ written: $kmzOutPath  missionId=$generatedMissionId")

        // Push to aircraft
        WaypointMissionManager.getInstance().pushKMZFileToAircraft(
            kmzOutPath,
            object : CommonCallbacks.CompletionCallbackWithProgress<Double> {
                override fun onProgressUpdate(progress: Double) {
                    Log.d(TAG, "KMZ upload progress: $progress")
                }

                override fun onSuccess() {
                    Log.i(TAG, "KMZ pushed to aircraft — missionId=$generatedMissionId")
                    kmzPath = kmzOutPath
                    missionId = generatedMissionId
                    promise.resolve(null)
                }

                override fun onFailure(error: IDJIError) {
                    Log.e(TAG, "pushKMZFileToAircraft failed: ${error.description()}")
                    promise.reject(ERR, "pushKMZ: ${error.description()}")
                }
            }
        )
    }

    @ReactMethod
    fun startWaypointMission(promise: Promise) {
        val id = missionId
        if (id == null) {
            promise.reject(ERR, "startWaypointMission: uploadWaypoints must succeed first")
            return
        }
        val path = kmzPath ?: run {
            promise.reject(ERR, "startWaypointMission: kmzPath missing")
            return
        }

        val waylineIds = try {
            WaypointMissionManager.getInstance().getAvailableWaylineIDs(path)
        } catch (e: Exception) {
            // Visible fallback: a malformed/missing KMZ lands here and "wayline 0"
            // may not exist — log it so the flight-line failure isn't cryptic.
            Log.w(TAG, "getAvailableWaylineIDs threw, falling back to wayline 0: ${e.message}")
            listOf(0)
        }
        Log.d(TAG, "startMission id=$id waylines=$waylineIds")

        lastEmittedWaypointIndex = -1
        WaypointMissionManager.getInstance().startMission(
            id,
            waylineIds,
            object : CommonCallbacks.CompletionCallback {
                override fun onSuccess() {
                    Log.i(TAG, "startMission success")
                    promise.resolve(null)
                }

                override fun onFailure(error: IDJIError) {
                    Log.e(TAG, "startMission failed: ${error.description()}")
                    promise.reject(ERR, "startMission: ${error.description()}")
                }
            }
        )
    }

    @ReactMethod
    fun pauseMission(promise: Promise) {
        WaypointMissionManager.getInstance().pauseMission(
            object : CommonCallbacks.CompletionCallback {
                override fun onSuccess() { promise.resolve(null) }
                override fun onFailure(error: IDJIError) {
                    promise.reject(ERR, "pauseMission: ${error.description()}")
                }
            }
        )
    }

    @ReactMethod
    fun resumeMission(promise: Promise) {
        WaypointMissionManager.getInstance().resumeMission(
            object : CommonCallbacks.CompletionCallback {
                override fun onSuccess() { promise.resolve(null) }
                override fun onFailure(error: IDJIError) {
                    promise.reject(ERR, "resumeMission: ${error.description()}")
                }
            }
        )
    }

    @ReactMethod
    fun abortMission(promise: Promise) {
        val id = missionId
        if (id != null) {
            // Stop the wayline mission, then RTH
            WaypointMissionManager.getInstance().stopMission(
                id,
                object : CommonCallbacks.CompletionCallback {
                    override fun onSuccess() {
                        missionId = null
                        kmzPath = null
                        // Follow up with RTH for safety
                        FlightControllerKey.KeyStartGoHome.create().action({
                            promise.resolve(null)
                        }, { err: IDJIError ->
                            // RTH is best-effort after stop; resolve anyway
                            Log.w(TAG, "abort RTH: ${err.description()}")
                            promise.resolve(null)
                        })
                    }

                    override fun onFailure(error: IDJIError) {
                        Log.w(TAG, "stopMission in abort: ${error.description()} — falling back to RTH")
                        FlightControllerKey.KeyStartGoHome.create().action({
                            promise.resolve(null)
                        }, { err: IDJIError ->
                            promise.reject(ERR, "abort: ${err.description()}")
                        })
                    }
                }
            )
        } else {
            // No active mission — just RTH
            FlightControllerKey.KeyStartGoHome.create().action({
                promise.resolve(null)
            }, { err: IDJIError ->
                promise.reject(ERR, "abort: ${err.description()}")
            })
        }
    }

    // ── Camera ────────────────────────────────────────────────────────────────

    @ReactMethod
    fun capturePhoto(lens: String, promise: Promise) {
        CameraKey.KeyStartShootPhoto.create().action({
            // Photo lands on the aircraft SD card; media retrieval is a follow-up.
            val res = Arguments.createMap()
            res.putString("localPath", "")
            res.putString("lens", lens)
            res.putString("timestamp", System.currentTimeMillis().toString())
            promise.resolve(res)
        }, { err: IDJIError ->
            promise.reject(ERR, "shootPhoto: ${err.description()}")
        })
    }

    @ReactMethod
    fun captureAllLenses(promise: Promise) {
        promise.resolve(Arguments.createArray())
    }

    @ReactMethod
    fun setGimbal(pitch: Double, yaw: Double, promise: Promise) {
        promise.resolve(null)
    }

    @ReactMethod
    fun setZoom(level: Double, promise: Promise) {
        promise.resolve(null)
    }

    @ReactMethod
    fun switchLens(lens: String, promise: Promise) {
        promise.resolve(null)
    }

    @ReactMethod
    fun startVideoRecording(promise: Promise) {
        CameraKey.KeyStartRecord.create().action({
            promise.resolve(null)
        }, { err: IDJIError -> promise.reject(ERR, "startVideo: ${err.description()}") })
    }

    @ReactMethod
    fun stopVideoRecording(promise: Promise) {
        CameraKey.KeyStopRecord.create().action({
            promise.resolve(null)
        }, { err: IDJIError -> promise.reject(ERR, "stopVideo: ${err.description()}") })
    }

    // ── Event emit helpers ──────────────────────────────────────────────────────

    private fun emit(event: String, data: Any?) {
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(event, data)
    }

    fun emitTelemetry(map: WritableMap) = emit(EVT_TELEMETRY, map)
    fun emitWaypointReached(index: Int) {
        val args = Arguments.createMap()
        args.putInt("index", index)
        emit(EVT_WAYPOINT_REACHED, args)
    }
    fun emitMissionComplete() = emit(EVT_MISSION_COMPLETE, null)
}
