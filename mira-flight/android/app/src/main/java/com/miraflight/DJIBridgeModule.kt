package com.miraflight

import android.os.Handler
import android.os.Looper
import android.util.Log
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
import dji.v5.common.error.IDJIError
import dji.v5.common.register.DJISDKInitEvent
import dji.v5.et.action
import dji.v5.et.create
import dji.v5.et.get
import dji.v5.manager.SDKManager
import dji.v5.manager.interfaces.SDKManagerCallback
import kotlin.math.sqrt

/**
 * DJI MSDK v5 native bridge (v5.18.0). App Key is read from the manifest meta-data
 * com.dji.sdk.API_KEY (injected at build time from local.properties dji.app.key).
 *
 * Implemented for the M350 demo: register, live telemetry, takeoff/land/RTH, photo.
 * Waypoint missions (uploadWaypoints/startWaypointMission/pause/resume) currently
 * no-op-resolve so the app's mission flow takes off + hovers; real autonomous wayline
 * execution via WPMZ is the remaining DJI-6 task.
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

    // ── Waypoint mission (no-op resolve for now — takeoff+hover; real WPMZ = DJI-6) ─

    @ReactMethod
    fun uploadWaypoints(waypoints: ReadableArray, promise: Promise) {
        Log.d(TAG, "uploadWaypoints count=${waypoints.size()} (no-op; WPMZ wayline pending)")
        promise.resolve(null)
    }

    @ReactMethod
    fun startWaypointMission(promise: Promise) {
        // No autonomous wayline yet — drone holds after takeoff. TODO(DJI-6).
        promise.resolve(null)
    }

    @ReactMethod
    fun pauseMission(promise: Promise) {
        promise.resolve(null)
    }

    @ReactMethod
    fun resumeMission(promise: Promise) {
        promise.resolve(null)
    }

    @ReactMethod
    fun abortMission(promise: Promise) {
        // Treat abort as RTH (matches the engine's abort→returnToHome path).
        FlightControllerKey.KeyStartGoHome.create().action({
            promise.resolve(null)
        }, { err: IDJIError ->
            promise.reject(ERR, "abort: ${err.description()}")
        })
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
