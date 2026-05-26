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

    fun buildAndWrite(waypoints: ReadableArray, kmzOutPath: String): Boolean {
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
            val alt = wp.getDouble("altitude_m")
            val speed = wp.getDouble("speed_ms")
            val heading = wp.getDouble("heading_deg")
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

            // Yaw: SMOOTH_TRANSITION + yawAngle locks heading to the mission-planner value.
            // (SMOOTH_TRANSITION is the confirmed SDK value that enables yawAngle; FIXED_YAW
            // is not present in the v1.0.5 enum.)
            val yawParam = WaylineWaypointYawParam()
            yawParam.yawMode = WaylineWaypointYawMode.SMOOTH_TRANSITION
            yawParam.yawAngle = heading
            yawParam.enableYawAngle = true
            yawParam.yawPathMode = WaylineWaypointYawPathMode.FOLLOW_BAD_ARC
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
        info.globalFlightHeight = if (waylineWaypoints.isNotEmpty()) waylineWaypoints[0].height else 50.0
        info.isGlobalFlightHeightSet = true
        info.globalTurnMode = WaylineWaypointTurnMode.TO_POINT_AND_STOP_WITH_DISCONTINUITY_CURVATURE
        info.useStraightLine = true
        info.isTemplateGlobalTurnModeSet = true
        val globalYaw = WaylineWaypointYawParam()
        globalYaw.yawMode = WaylineWaypointYawMode.FOLLOW_WAYLINE
        globalYaw.poiLocation = WaylineLocationCoordinate3D()
        info.globalYawParam = globalYaw
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
