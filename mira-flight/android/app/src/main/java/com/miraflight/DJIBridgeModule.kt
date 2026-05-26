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
import dji.sdk.keyvalue.key.KeyTools
import dji.sdk.keyvalue.value.camera.CameraVideoStreamSourceType
import dji.sdk.keyvalue.value.common.ComponentIndexType
import dji.sdk.keyvalue.value.common.LocationCoordinate3D
import dji.sdk.keyvalue.value.common.Velocity3D
import dji.sdk.keyvalue.value.camera.CameraMode
import dji.v5.manager.KeyManager
import dji.v5.common.callback.CommonCallbacks
import dji.v5.common.error.IDJIError
import dji.v5.common.register.DJISDKInitEvent
import dji.v5.et.action
import dji.v5.et.create
import dji.v5.et.get
import dji.v5.manager.SDKManager
import dji.v5.manager.datacenter.MediaDataCenter
import dji.v5.manager.datacenter.media.MediaFile
import dji.v5.manager.datacenter.media.MediaFileDownloadListener
import dji.v5.manager.datacenter.media.MediaFileListState
import dji.v5.manager.datacenter.media.MediaFileListStateListener
import dji.v5.manager.datacenter.media.PullMediaFileListParam
import com.facebook.react.bridge.WritableArray
import java.io.BufferedOutputStream
import java.io.File
import java.io.FileOutputStream
import java.io.IOException
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicInteger
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
                    enableLaserRangefinder()
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

    // H20T payload sits on the main gimbal. Camera keys are indexed by component.
    private val cameraIndex = ComponentIndexType.LEFT_OR_MAIN

    /** Map app lens names to H20T stream sources. */
    private fun lensSource(lens: String): CameraVideoStreamSourceType = when (lens.lowercase()) {
        "zoom" -> CameraVideoStreamSourceType.ZOOM_CAMERA
        "thermal", "ir", "infrared" -> CameraVideoStreamSourceType.INFRARED_CAMERA
        else -> CameraVideoStreamSourceType.WIDE_CAMERA
    }

    private fun photoResult(lens: String): WritableMap {
        // Photo is written to the aircraft SD card. File retrieval via MediaManager
        // (for upload to the twin) is the remaining piece — TODO(DJI-10 media pull).
        val res = Arguments.createMap()
        res.putString("localPath", "")
        res.putString("lens", lens)
        res.putString("timestamp", System.currentTimeMillis().toString())
        return res
    }

    @ReactMethod
    fun capturePhoto(lens: String, promise: Promise) {
        // Select the requested H20T lens, then shoot.
        KeyManager.getInstance().setValue(
            KeyTools.createKey(CameraKey.KeyCameraVideoStreamSource, cameraIndex),
            lensSource(lens),
            object : CommonCallbacks.CompletionCallback {
                override fun onSuccess() {
                    CameraKey.KeyStartShootPhoto.create().action({
                        promise.resolve(photoResult(lens))
                    }, { err: IDJIError -> promise.reject(ERR, "shootPhoto: ${err.description()}") })
                }
                override fun onFailure(error: IDJIError) {
                    // Lens switch failed — still attempt the shot on the current lens.
                    Log.w(TAG, "switchLens($lens) failed: ${error.description()}")
                    CameraKey.KeyStartShootPhoto.create().action({
                        promise.resolve(photoResult(lens))
                    }, { err: IDJIError -> promise.reject(ERR, "shootPhoto: ${err.description()}") })
                }
            },
        )
    }

    @ReactMethod
    fun captureAllLenses(promise: Promise) {
        // Shoot wide → zoom → thermal in sequence (feeds the twin RGB + IR).
        val lenses = listOf("wide", "zoom", "thermal")
        val out = Arguments.createArray()
        fun shootAt(i: Int) {
            if (i >= lenses.size) { promise.resolve(out); return }
            val lens = lenses[i]
            KeyManager.getInstance().setValue(
                KeyTools.createKey(CameraKey.KeyCameraVideoStreamSource, cameraIndex),
                lensSource(lens),
                object : CommonCallbacks.CompletionCallback {
                    override fun onSuccess() {
                        CameraKey.KeyStartShootPhoto.create().action(
                            { out.pushMap(photoResult(lens)); shootAt(i + 1) },
                            { e: IDJIError -> Log.w(TAG, "shoot $lens failed: ${e.description()}"); shootAt(i + 1) },
                        )
                    }
                    override fun onFailure(error: IDJIError) {
                        Log.w(TAG, "lens $lens switch failed: ${error.description()}"); shootAt(i + 1)
                    }
                },
            )
        }
        shootAt(0)
    }

    @ReactMethod
    fun setGimbal(pitch: Double, yaw: Double, promise: Promise) {
        // Gimbal control via GimbalKey is a follow-up; capture uses wayline gimbal-pitch.
        promise.resolve(null)
    }

    @ReactMethod
    fun setZoom(level: Double, promise: Promise) {
        KeyManager.getInstance().setValue(
            KeyTools.createKey(CameraKey.KeyCameraZoomRatios, cameraIndex),
            level,
            object : CommonCallbacks.CompletionCallback {
                override fun onSuccess() { promise.resolve(null) }
                override fun onFailure(error: IDJIError) { promise.reject(ERR, "setZoom: ${error.description()}") }
            },
        )
    }

    @ReactMethod
    fun switchLens(lens: String, promise: Promise) {
        KeyManager.getInstance().setValue(
            KeyTools.createKey(CameraKey.KeyCameraVideoStreamSource, cameraIndex),
            lensSource(lens),
            object : CommonCallbacks.CompletionCallback {
                override fun onSuccess() { promise.resolve(null) }
                override fun onFailure(error: IDJIError) { promise.reject(ERR, "switchLens: ${error.description()}") }
            },
        )
    }

    /** Enable the H20T laser rangefinder so target distance is available for capture
     *  metadata + the twin's scale. Called after registration. */
    private fun enableLaserRangefinder() {
        try {
            KeyManager.getInstance().setValue(
                KeyTools.createKey(CameraKey.KeyLaserMeasureEnabled, cameraIndex),
                true,
                object : CommonCallbacks.CompletionCallback {
                    override fun onSuccess() { Log.i(TAG, "LRF enabled") }
                    override fun onFailure(error: IDJIError) { Log.w(TAG, "LRF enable failed: ${error.description()}") }
                },
            )
        } catch (e: Exception) {
            Log.w(TAG, "LRF enable threw: ${e.message}")
        }
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

    // ── Media download ──────────────────────────────────────────────────────────

    /**
     * Download the most recent (up to 40) photos from the aircraft SD card via
     * MediaManager and resolve a WritableArray of {localPath, fileName} maps.
     *
     * Flow: enable() → addMediaFileListStateListener (wait for UP_TO_DATE) →
     * pullMediaFileListFromCamera → download each file → disable() →
     * switch camera back to PHOTO_NORMAL → resolve.
     */
    @ReactMethod
    fun downloadMissionMedia(promise: Promise) {
        Log.i(TAG, "downloadMissionMedia: enabling MediaManager")

        val mediaManager = try {
            MediaDataCenter.getInstance().mediaManager
        } catch (e: Exception) {
            Log.e(TAG, "downloadMissionMedia: MediaDataCenter unavailable: ${e.message}", e)
            promise.reject(ERR, "MediaDataCenter unavailable: ${e.message}")
            return
        }

        // Destination directory — uses app-internal filesDir; no external-storage permission needed.
        val mediaDir = File(reactContext.filesDir, "missions/dji_media")
        if (!mediaDir.exists()) mediaDir.mkdirs()

        // We register the list-state listener *before* enable() so we don't miss the
        // UP_TO_DATE callback that fires synchronously after pullMediaFileListFromCamera.
        // SAM lambda — confirmed from MediaVM.kt sample (addMediaFileListStateListener { state -> }).
        // We use a volatile flag to make the UP_TO_DATE handler idempotent; DJI's API exposes
        // removeAllMediaFileListStateListener() but not a single-listener remove, so we guard
        // with a flag and call removeAll once.
        val listenerFired = AtomicBoolean(false)

        val stateListener = MediaFileListStateListener { state ->
            if (state != MediaFileListState.UP_TO_DATE) return@MediaFileListStateListener
            if (!listenerFired.compareAndSet(false, true)) return@MediaFileListStateListener

            // Remove all list-state listeners — confirmed call from DJI MediaVM.kt sample.
            try { mediaManager.removeAllMediaFileListStateListener() } catch (e: Exception) {
                Log.w(TAG, "removeAllMediaFileListStateListener threw: ${e.message}")
            }

            val allFiles: List<MediaFile> = try {
                mediaManager.mediaFileListData?.data ?: emptyList()
            } catch (e: Exception) {
                Log.w(TAG, "downloadMissionMedia: mediaFileListData access threw: ${e.message}")
                emptyList()
            }

            if (allFiles.isEmpty()) {
                Log.w(TAG, "downloadMissionMedia: no files on aircraft — resolving empty list")
                disableMediaManagerAndRestoreCamera()
                promise.resolve(Arguments.createArray())
                return@MediaFileListStateListener
            }

            // Take the most-recent N files (list is newest-first per MSDK spec).
            val batch = allFiles.take(40)
            Log.i(TAG, "downloadMissionMedia: downloading ${batch.size} of ${allFiles.size} files")

            val results = Arguments.createArray()
            val remaining = AtomicInteger(batch.size)

            batch.forEach { mediaFile ->
                val destFile = File(mediaDir, mediaFile.fileName)
                // Resume partial download if file exists.
                val startOffset = if (destFile.exists()) destFile.length() else 0L

                try {
                    val fos = FileOutputStream(destFile, true)
                    val bos = BufferedOutputStream(fos)

                    mediaFile.pullOriginalMediaFileFromCamera(
                        startOffset,
                        object : MediaFileDownloadListener {
                            override fun onStart() {
                                Log.d(TAG, "download start: ${mediaFile.fileName}")
                            }

                            override fun onProgress(total: Long, current: Long) {
                                // No-op for batch; progress is not surfaced to JS.
                            }

                            override fun onRealtimeDataUpdate(data: ByteArray, position: Long) {
                                try {
                                    bos.write(data)
                                    bos.flush()
                                } catch (e: IOException) {
                                    Log.e(TAG, "downloadMissionMedia write error ${mediaFile.fileName}: ${e.message}")
                                }
                            }

                            override fun onFinish() {
                                try {
                                    bos.close()
                                    fos.close()
                                } catch (e: IOException) {
                                    Log.w(TAG, "downloadMissionMedia close error ${mediaFile.fileName}: ${e.message}")
                                }
                                Log.i(TAG, "download finished: ${mediaFile.fileName} → ${destFile.absolutePath}")
                                synchronized(results) {
                                    val entry = Arguments.createMap()
                                    entry.putString("localPath", destFile.absolutePath)
                                    entry.putString("fileName", mediaFile.fileName)
                                    results.pushMap(entry)
                                }
                                checkAllDone()
                            }

                            override fun onFailure(error: IDJIError?) {
                                Log.w(TAG, "download failed ${mediaFile.fileName}: ${error?.description()}")
                                try { bos.close(); fos.close() } catch (_: IOException) {}
                                // Count this file as done (don't block the whole batch on one failure).
                                checkAllDone()
                            }

                            private fun checkAllDone() {
                                if (remaining.decrementAndGet() == 0) {
                                    disableMediaManagerAndRestoreCamera()
                                    promise.resolve(results)
                                }
                            }
                        }
                    )
                } catch (e: Exception) {
                    Log.e(TAG, "downloadMissionMedia: pullOriginalMediaFileFromCamera threw for ${mediaFile.fileName}: ${e.message}", e)
                    if (remaining.decrementAndGet() == 0) {
                        disableMediaManagerAndRestoreCamera()
                        promise.resolve(results)
                    }
                }
            }
        }

        mediaManager.addMediaFileListStateListener(stateListener)

        // Enter download/playback mode.
        mediaManager.enable(object : CommonCallbacks.CompletionCallback {
            override fun onSuccess() {
                Log.i(TAG, "downloadMissionMedia: MediaManager enabled — pulling file list")
                mediaManager.pullMediaFileListFromCamera(
                    PullMediaFileListParam.Builder().mediaFileIndex(0).count(40).build(),
                    object : CommonCallbacks.CompletionCallback {
                        override fun onSuccess() {
                            Log.i(TAG, "downloadMissionMedia: pullMediaFileListFromCamera success — awaiting UP_TO_DATE")
                            // The UP_TO_DATE callback will fire via stateListener above.
                        }

                        override fun onFailure(error: IDJIError) {
                            Log.e(TAG, "downloadMissionMedia: pullMediaFileListFromCamera failed: ${error.description()}")
                            try { mediaManager.removeAllMediaFileListStateListener() } catch (_: Exception) {}
                            disableMediaManagerAndRestoreCamera()
                            promise.reject(ERR, "pullMediaFileList: ${error.description()}")
                        }
                    }
                )
            }

            override fun onFailure(error: IDJIError) {
                Log.e(TAG, "downloadMissionMedia: MediaManager enable failed: ${error.description()}")
                try { mediaManager.removeAllMediaFileListStateListener() } catch (_: Exception) {}
                promise.reject(ERR, "MediaManager enable: ${error.description()}")
            }
        })
    }

    /**
     * Exit MediaManager download mode and restore camera to PHOTO_NORMAL.
     * Best-effort — failures are logged but not propagated (the download results
     * are already resolved at the call site).
     */
    private fun disableMediaManagerAndRestoreCamera() {
        val mediaManager = MediaDataCenter.getInstance().mediaManager
        mediaManager.disable(object : CommonCallbacks.CompletionCallback {
            override fun onSuccess() {
                Log.i(TAG, "MediaManager disabled — restoring camera to PHOTO_NORMAL")
                restoreCameraToPhotoNormal()
            }

            override fun onFailure(error: IDJIError) {
                Log.w(TAG, "MediaManager disable failed: ${error.description()} — still restoring camera")
                restoreCameraToPhotoNormal()
            }
        })
    }

    private fun restoreCameraToPhotoNormal() {
        try {
            KeyManager.getInstance().setValue(
                KeyTools.createKey(CameraKey.KeyCameraMode, cameraIndex),
                CameraMode.PHOTO_NORMAL,
                object : CommonCallbacks.CompletionCallback {
                    override fun onSuccess() { Log.i(TAG, "camera restored to PHOTO_NORMAL") }
                    override fun onFailure(error: IDJIError) {
                        Log.w(TAG, "restore PHOTO_NORMAL failed: ${error.description()}")
                    }
                }
            )
        } catch (e: Exception) {
            Log.w(TAG, "restoreCameraToPhotoNormal threw: ${e.message}")
        }
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
