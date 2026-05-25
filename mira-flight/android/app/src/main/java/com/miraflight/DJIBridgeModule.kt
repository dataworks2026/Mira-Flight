package com.miraflight

import android.util.Log
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.Arguments
import com.facebook.react.modules.core.DeviceEventManagerModule

/**
 * DJI MSDK v5 native bridge.
 *
 * App Key is injected at build time via BuildConfig.DJI_APP_KEY
 * (set dji.app.key=<key> in local.properties — never commit the value).
 *
 * To enable full DJI SDK functionality:
 *   1. Add to app/build.gradle dependencies:
 *        implementation 'com.dji:dji-sdk-v5-aircraft:5.9.0'
 *        compileOnly  'com.dji:dji-sdk-v5-networkImp:5.9.0'
 *   2. Add DJI Maven to project build.gradle repositories:
 *        maven { url 'https://maven.aliyun.com/repository/public' }
 *   3. Uncomment the DJI SDK calls marked [DJI-SDK] below.
 */
class DJIBridgeModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG = "DJIBridgeModule"
        private const val ERR_NOT_READY = "DJI_NOT_READY"

        // Event names consumed by DJIAdapter.ts NativeEventEmitter
        const val EVT_TELEMETRY       = "DJITelemetry"
        const val EVT_WAYPOINT_REACHED = "DJIWaypointReached"
        const val EVT_MISSION_COMPLETE = "DJIMissionComplete"
    }

    override fun getName(): String = "DJIBridge"

    // Required for RN NativeEventEmitter — must be implemented even if empty
    @ReactMethod fun addListener(eventName: String) {}
    @ReactMethod fun removeListeners(count: Int) {}

    // ── Connection ────────────────────────────────────────────────────────────

    @ReactMethod
    fun connect(promise: Promise) {
        try {
            val appKey = BuildConfig.DJI_APP_KEY
            if (appKey.isNullOrBlank()) {
                promise.reject(ERR_NOT_READY, "DJI_APP_KEY not set in local.properties")
                return
            }
            Log.d(TAG, "connect: appKey present, length=${appKey.length}")
            // [DJI-SDK] SDKManager.getInstance().init(reactContext, appKey, object : SDKManagerCallback {
            //     override fun onRegisterSuccess() {
            //         Log.i(TAG, "DJI SDK registered")
            //         promise.resolve(null)
            //     }
            //     override fun onRegisterFailure(error: SDKError?) {
            //         promise.reject(ERR_NOT_READY, error?.description ?: "Registration failed")
            //     }
            //     override fun onProductConnect(productType: ProductType?) { emitConnected(true) }
            //     override fun onProductDisconnect(productType: ProductType?) { emitConnected(false) }
            //     override fun onProductChanged(productType: ProductType?) {}
            //     override fun onInitProcess(event: DJISDKInitEvent?, total: Int) {}
            //     override fun onDatabaseDownloadProgress(current: Long, total: Long) {}
            // })
            promise.reject(ERR_NOT_READY, "DJI SDK dependency not yet added — see DJIBridgeModule.kt setup comments")
        } catch (e: Exception) {
            promise.reject(ERR_NOT_READY, e.message ?: "connect failed")
        }
    }

    @ReactMethod
    fun disconnect(promise: Promise) {
        // [DJI-SDK] SDKManager.getInstance().destroy()
        promise.resolve(null)
    }

    // ── Flight control ────────────────────────────────────────────────────────

    @ReactMethod
    fun arm(promise: Promise) {
        // DJI M350 arms automatically on takeoff — no explicit arm command in MSDK v5.
        // [DJI-SDK] KeyManager.getInstance().setValue(FlightControllerKey.KeyAircraftMotorsOn, true, ...)
        promise.reject(ERR_NOT_READY, "DJI SDK not integrated")
    }

    @ReactMethod
    fun takeoff(altitude: Double, promise: Promise) {
        // [DJI-SDK] KeyManager.getInstance().setValue(FlightControllerKey.KeyStartTakeoff, true, ...)
        Log.d(TAG, "takeoff: altitude=$altitude")
        promise.reject(ERR_NOT_READY, "DJI SDK not integrated")
    }

    @ReactMethod
    fun land(promise: Promise) {
        // [DJI-SDK] KeyManager.getInstance().setValue(FlightControllerKey.KeyStartAutoLanding, true, ...)
        promise.reject(ERR_NOT_READY, "DJI SDK not integrated")
    }

    @ReactMethod
    fun returnToHome(promise: Promise) {
        // [DJI-SDK] KeyManager.getInstance().setValue(FlightControllerKey.KeyStartGoHome, true, ...)
        promise.reject(ERR_NOT_READY, "DJI SDK not integrated")
    }

    // ── Waypoint mission ──────────────────────────────────────────────────────

    @ReactMethod
    fun uploadWaypoints(waypoints: ReadableArray, promise: Promise) {
        // [DJI-SDK] Build WaypointMission from waypoints array, upload via WaypointMissionOperator
        Log.d(TAG, "uploadWaypoints: count=${waypoints.size()}")
        promise.reject(ERR_NOT_READY, "DJI SDK not integrated")
    }

    @ReactMethod
    fun startWaypointMission(promise: Promise) {
        // [DJI-SDK] WaypointMissionOperator.getInstance().startMission(...)
        promise.reject(ERR_NOT_READY, "DJI SDK not integrated")
    }

    @ReactMethod
    fun pauseMission(promise: Promise) {
        // [DJI-SDK] WaypointMissionOperator.getInstance().pauseMission(...)
        promise.reject(ERR_NOT_READY, "DJI SDK not integrated")
    }

    @ReactMethod
    fun resumeMission(promise: Promise) {
        // [DJI-SDK] WaypointMissionOperator.getInstance().resumeMission(...)
        promise.reject(ERR_NOT_READY, "DJI SDK not integrated")
    }

    @ReactMethod
    fun abortMission(promise: Promise) {
        // [DJI-SDK] WaypointMissionOperator.getInstance().stopMission(...)
        promise.reject(ERR_NOT_READY, "DJI SDK not integrated")
    }

    // ── Camera ────────────────────────────────────────────────────────────────

    @ReactMethod
    fun capturePhoto(lens: String, promise: Promise) {
        // [DJI-SDK] CameraKey.KeyShootPhoto → write JPEG to CacheDir → resolve with path + metadata
        Log.d(TAG, "capturePhoto: lens=$lens")
        promise.reject(ERR_NOT_READY, "DJI SDK not integrated")
    }

    @ReactMethod
    fun captureAllLenses(promise: Promise) {
        promise.reject(ERR_NOT_READY, "DJI SDK not integrated")
    }

    @ReactMethod
    fun setGimbal(pitch: Double, yaw: Double, promise: Promise) {
        // [DJI-SDK] GimbalKey.KeyPitch + GimbalKey.KeyYaw via KeyManager
        Log.d(TAG, "setGimbal: pitch=$pitch yaw=$yaw")
        promise.reject(ERR_NOT_READY, "DJI SDK not integrated")
    }

    @ReactMethod
    fun setZoom(level: Double, promise: Promise) {
        // [DJI-SDK] CameraKey.KeyOpticalZoomFocalLength via KeyManager
        promise.reject(ERR_NOT_READY, "DJI SDK not integrated")
    }

    @ReactMethod
    fun switchLens(lens: String, promise: Promise) {
        // [DJI-SDK] CameraKey.KeyVideoStreamSource → map lens string to VideoStreamSource enum
        Log.d(TAG, "switchLens: lens=$lens")
        promise.reject(ERR_NOT_READY, "DJI SDK not integrated")
    }

    @ReactMethod
    fun startVideoRecording(promise: Promise) {
        // [DJI-SDK] CameraKey.KeyStartRecordVideo via KeyManager
        promise.reject(ERR_NOT_READY, "DJI SDK not integrated")
    }

    @ReactMethod
    fun stopVideoRecording(promise: Promise) {
        // [DJI-SDK] CameraKey.KeyStopRecordVideo via KeyManager
        promise.reject(ERR_NOT_READY, "DJI SDK not integrated")
    }

    // ── Internal event helpers ────────────────────────────────────────────────

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
