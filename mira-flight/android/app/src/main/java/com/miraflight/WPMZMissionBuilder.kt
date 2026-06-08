package com.miraflight

import android.util.Log
import com.dji.wpmzsdk.common.data.Template
import com.dji.wpmzsdk.manager.WPMZManager
import com.facebook.react.bridge.ReadableArray
import dji.sdk.wpmz.value.mission.ActionGimbalRotateParam
import dji.sdk.wpmz.value.mission.ActionTakePhotoParam
import dji.sdk.wpmz.value.mission.CameraLensType
import dji.sdk.wpmz.value.mission.WaylineActionGroup
import dji.sdk.wpmz.value.mission.WaylineActionInfo
import dji.sdk.wpmz.value.mission.WaylineActionNodeList
import dji.sdk.wpmz.value.mission.WaylineActionTreeNode
import dji.sdk.wpmz.value.mission.WaylineActionTrigger
import dji.sdk.wpmz.value.mission.WaylineActionTriggerType
import dji.sdk.wpmz.value.mission.WaylineActionType
import dji.sdk.wpmz.value.mission.WaylineActionsRelationType
import dji.sdk.wpmz.value.mission.WaylineAltitudeMode
import dji.sdk.wpmz.value.mission.WaylineCoordinateMode
import dji.sdk.wpmz.value.mission.WaylineCoordinateParam
import dji.sdk.wpmz.value.mission.WaylineDroneInfo
import dji.sdk.wpmz.value.mission.WaylineExitOnRCLostAction
import dji.sdk.wpmz.value.mission.WaylineExitOnRCLostBehavior
import dji.sdk.wpmz.value.mission.WaylineFinishedAction
import dji.sdk.wpmz.value.mission.WaylineFlyToWaylineMode
import dji.sdk.wpmz.value.mission.WaylineGimbalActuatorRotateMode
import dji.sdk.wpmz.value.mission.WaylineLocationCoordinate2D
import dji.sdk.wpmz.value.mission.WaylineLocationCoordinate3D
import dji.sdk.wpmz.value.mission.WaylineMission
import dji.sdk.wpmz.value.mission.WaylineMissionConfig
import dji.sdk.wpmz.value.mission.WaylinePayloadInfo
import dji.sdk.wpmz.value.mission.WaylinePositioningType
import dji.sdk.wpmz.value.mission.WaylineTemplateWaypointInfo
import dji.sdk.wpmz.value.mission.WaylineWaypoint
import dji.sdk.wpmz.value.mission.WaylineWaypointPitchMode
import dji.sdk.wpmz.value.mission.WaylineWaypointTurnMode
import dji.sdk.wpmz.value.mission.WaylineWaypointYawMode
import dji.sdk.wpmz.value.mission.WaylineWaypointYawParam
import dji.sdk.wpmz.value.mission.WaylineWaypointYawPathMode

/**
 * Builds a WPMZ KMZ file from the JS waypoint array and writes it to [kmzOutPath].
 *
 * Each JS waypoint has: latitude, longitude, altitude_m, speed_ms, heading_deg,
 * gimbal_pitch, sequence_index.
 *
 * Returns true on success (WPMZManager.generateKMZFile returned a non-null path).
 */
object WPMZMissionBuilder {

    private const val TAG = "WPMZMissionBuilder"

    // Defaults mirrored from KMZTestUtil.java
    private const val DEF_TAKE_OFF_HEIGHT = 20.0
    private const val DEF_GLOBAL_TRANSITION_SPEED = 10.0
    private const val DEF_AUTO_FLIGHT_SPEED = 5.0
    private const val DEF_GLOBAL_FLIGHT_HEIGHT = 20.0
    // Minimum altitude WPMZ tolerates without SEGV in PPalGenerator. The first
    // crash on hardware was a 3 m altitude mission — DJI's SDK doesn't handle
    // ultra-low altitudes. Clamp to this floor before generating the KMZ.
    private const val MIN_SAFE_ALTITUDE = 5.0

    fun buildAndWrite(waypoints: ReadableArray, kmzOutPath: String): Boolean {
        try {
            Log.i(TAG, "buildAndWrite: count=${waypoints.size()} out=$kmzOutPath")
            val waylineMission = createWaylineMission()
            val missionConfig = createMissionConfig()
            val template = createTemplate(waypoints)

            val resultPath = WPMZManager.getInstance()
                .generateKMZFile(kmzOutPath, waylineMission, missionConfig, template)

            return if (resultPath != null) {
                Log.i(TAG, "KMZ written to $resultPath")
                true
            } else {
                Log.e(TAG, "generateKMZFile returned null — KMZ not written")
                false
            }
        } catch (e: Throwable) {
            Log.e(TAG, "generateKMZFile threw: ${e.javaClass.simpleName}: ${e.message}", e)
            return false
        }
    }

    // ── Mission envelope ────────────────────────────────────────────────────────

    private fun createWaylineMission(): WaylineMission {
        val m = WaylineMission()
        val now = System.currentTimeMillis().toDouble()
        m.createTime = now
        m.updateTime = now
        return m
    }

    private fun createMissionConfig(): WaylineMissionConfig {
        val cfg = WaylineMissionConfig()
        cfg.flyToWaylineMode = WaylineFlyToWaylineMode.SAFELY
        cfg.finishAction = WaylineFinishedAction.GO_HOME
        cfg.droneInfo = WaylineDroneInfo()
        cfg.securityTakeOffHeight = DEF_TAKE_OFF_HEIGHT
        cfg.isSecurityTakeOffHeightSet = true
        cfg.exitOnRCLostBehavior = WaylineExitOnRCLostBehavior.EXCUTE_RC_LOST_ACTION
        cfg.exitOnRCLostType = WaylineExitOnRCLostAction.GO_BACK
        cfg.globalTransitionalSpeed = DEF_GLOBAL_TRANSITION_SPEED
        cfg.payloadInfo = mutableListOf<WaylinePayloadInfo>()
        return cfg
    }

    // ── Template (wayline body) ──────────────────────────────────────────────────

    private fun createTemplate(waypointsJs: ReadableArray): Template {
        val template = Template()

        val coordinateParam = WaylineCoordinateParam()
        coordinateParam.coordinateMode = WaylineCoordinateMode.WGS84
        coordinateParam.positioningType = WaylinePositioningType.GPS
        coordinateParam.isWaylinePositioningTypeSet = true
        coordinateParam.altitudeMode = WaylineAltitudeMode.RELATIVE_TO_START_POINT
        template.coordinateParam = coordinateParam

        template.useGlobalTransitionalSpeed = true
        template.autoFlightSpeed = DEF_AUTO_FLIGHT_SPEED
        template.payloadParam = mutableListOf()

        val waypointInfo = buildWaypointInfo(waypointsJs)
        template.waypointInfo = waypointInfo

        return template
    }

    private fun buildWaypointInfo(waypointsJs: ReadableArray): WaylineTemplateWaypointInfo {
        val waylineWaypoints = mutableListOf<WaylineWaypoint>()
        val actionGroups = mutableListOf<WaylineActionGroup>()

        for (i in 0 until waypointsJs.size()) {
            val wp = waypointsJs.getMap(i) ?: continue

            val lat = wp.getDouble("latitude")
            val lon = wp.getDouble("longitude")
            val rawAlt = wp.getDouble("altitude_m")
            // Clamp altitude — the SDK SEGVs in PPalGenerator on ultra-low altitudes (<5 m).
            // First hardware crash was a 3 m mission.
            val alt = if (rawAlt < MIN_SAFE_ALTITUDE) {
                Log.w(TAG, "altitude $rawAlt m below minimum, clamping to $MIN_SAFE_ALTITUDE m")
                MIN_SAFE_ALTITUDE
            } else rawAlt
            val speed = wp.getDouble("speed_ms").coerceIn(1.0, 15.0)
            val gimbalPitch = wp.getDouble("gimbal_pitch")
            val idx = if (wp.hasKey("sequence_index")) wp.getInt("sequence_index") else i

            val waypoint = WaylineWaypoint()
            waypoint.waypointIndex = idx
            waypoint.location = WaylineLocationCoordinate2D(lat, lon)
            waypoint.height = alt
            waypoint.ellipsoidHeight = alt
            waypoint.speed = speed
            waypoint.useGlobalTurnParam = true
            waypoint.gimbalPitchAngle = gimbalPitch
            // Per-waypoint yawParam MUST be non-null — DJI's PPALController.generate
            // does a JNI null check on its byte[] inputs and aborts with
            // "java_array == null" if any field serializes to null (then tries to
            // allocate a 369 MB buffer with a garbage size field). Use FOLLOW_WAYLINE
            // (drone faces direction of travel) with no enableYawAngle / yawPathMode —
            // those were the SEGV-triggering combo.
            val yawParam = WaylineWaypointYawParam()
            yawParam.yawMode = WaylineWaypointYawMode.FOLLOW_WAYLINE
            yawParam.enableYawAngle = false
            yawParam.poiLocation = WaylineLocationCoordinate3D(lat, lon, alt)
            waypoint.yawParam = yawParam
            waypoint.isWaylineWaypointYawParamSet = true
            waypoint.useGlobalYawParam = false

            waylineWaypoints.add(waypoint)

            // Action: gimbal pitch + take photo at every waypoint
            val actionInfos = mutableListOf<WaylineActionInfo>()
            actionInfos.add(buildGimbalAction(gimbalPitch))
            actionInfos.add(buildTakePhotoAction())

            val group = buildActionGroup(actionInfos, groupId = actionGroups.size, waypointIndex = i)
            actionGroups.add(group)
        }

        val info = WaylineTemplateWaypointInfo()
        info.waypoints = waylineWaypoints
        info.actionGroups = actionGroups
        // globalFlightHeight: use the (clamped) first waypoint altitude, never below the floor.
        val firstAlt = if (waylineWaypoints.isNotEmpty()) waylineWaypoints[0].height else DEF_GLOBAL_FLIGHT_HEIGHT
        info.globalFlightHeight = firstAlt.coerceAtLeast(MIN_SAFE_ALTITUDE)
        info.isGlobalFlightHeightSet = true
        info.globalTurnMode = WaylineWaypointTurnMode.TO_POINT_AND_STOP_WITH_DISCONTINUITY_CURVATURE
        info.useStraightLine = true
        info.isTemplateGlobalTurnModeSet = true
        // Global yaw: drone faces direction of travel. Use the FIRST waypoint as a
        // safe non-null poiLocation (rather than an empty 0,0,0 default that may segv).
        val globalYaw = WaylineWaypointYawParam()
        globalYaw.yawMode = WaylineWaypointYawMode.FOLLOW_WAYLINE
        globalYaw.poiLocation = if (waylineWaypoints.isNotEmpty())
            WaylineLocationCoordinate3D(waylineWaypoints[0].location.latitude, waylineWaypoints[0].location.longitude, waylineWaypoints[0].height)
        else WaylineLocationCoordinate3D(0.0, 0.0, 0.0)
        info.globalYawParam = globalYaw
        info.isTemplateGlobalYawParamSet = true
        info.isTemplateGlobalYawParamSet = true
        info.pitchMode = WaylineWaypointPitchMode.USE_POINT_SETTING
        return info
    }

    // ── Per-waypoint action builders ─────────────────────────────────────────────

    private fun buildGimbalAction(pitchDeg: Double): WaylineActionInfo {
        val info = WaylineActionInfo()
        info.actionType = WaylineActionType.GIMBAL_ROTATE
        val param = ActionGimbalRotateParam()
        param.enablePitch = true
        param.pitch = pitchDeg
        param.rotateMode = WaylineGimbalActuatorRotateMode.ABSOLUTE_ANGLE
        param.payloadPositionIndex = 0
        info.gimbalRotateParam = param
        return info
    }

    private fun buildTakePhotoAction(): WaylineActionInfo {
        val info = WaylineActionInfo()
        info.actionType = WaylineActionType.TAKE_PHOTO
        val param = ActionTakePhotoParam(0, true, mutableListOf<CameraLensType>(), "mira")
        param.payloadPositionIndex = 0
        info.takePhotoParam = param
        return info
    }

    private fun buildActionGroup(
        actionInfos: List<WaylineActionInfo>,
        groupId: Int,
        waypointIndex: Int
    ): WaylineActionGroup {
        val group = WaylineActionGroup()
        val trigger = WaylineActionTrigger()
        trigger.triggerType = WaylineActionTriggerType.REACH_POINT
        group.trigger = trigger
        group.groupId = groupId
        group.startIndex = waypointIndex
        group.endIndex = waypointIndex
        group.actions = actionInfos

        // Build the action tree: root SEQUENCE node → N LEAF children
        val nodeLists = mutableListOf<WaylineActionNodeList>()

        val rootList = WaylineActionNodeList()
        val rootNode = WaylineActionTreeNode()
        rootNode.nodeType = WaylineActionsRelationType.SEQUENCE
        rootNode.childrenNum = actionInfos.size
        rootList.nodes = mutableListOf(rootNode)
        nodeLists.add(rootList)

        val childList = WaylineActionNodeList()
        val childNodes = actionInfos.mapIndexed { j, _ ->
            val child = WaylineActionTreeNode()
            child.nodeType = WaylineActionsRelationType.LEAF
            child.actionIndex = j
            child
        }
        childList.nodes = childNodes
        nodeLists.add(childList)

        group.nodeLists = nodeLists
        return group
    }
}
