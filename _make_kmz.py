"""
Generates a WPMZ KMZ wayline file for DJI Pilot 2 / M350 RTK + H20T.
Nadir grid (top-down survey) over a center lat/lon — for the digital twin.

Tune the values below, run, copy the .kmz onto the RC Plus, import in Pilot 2.

WPMZ spec: https://developer.dji.com/doc/cloud-api-tutorial/en/specifications/dji-wpml.html
"""
import math, os, time, zipfile

# ─── Mission parameters (edit these) ──────────────────────────────────────────
ASSET_NAME       = "Yankee Pier"
CENTER_LAT       = 40.6868      # Yankee Pier center
CENTER_LON       = -74.017
LENGTH_M         = 60           # N-S extent of the polygon over the pier (metres)
WIDTH_M          = 25           # E-W extent  (metres)
HEADING_DEG      = 0            # 0 = lawnmower along N-S axis; rotate to match pier orientation
ALTITUDE_M       = 40           # AGL, above any obstacles + good GSD with H20T wide
SPEED_MS         = 4
FWD_OVERLAP_PCT  = 80           # photogrammetry minimum 75
SIDE_OVERLAP_PCT = 70
GIMBAL_PITCH     = -90          # nadir
# H20T wide-lens approximate footprint at given altitude (full-frame 12 MP, ~84° FOV):
FOV_DEG          = 84
# ─────────────────────────────────────────────────────────────────────────────

# Derived spacings (based on the camera footprint and overlap)
footprint_m = 2 * ALTITUDE_M * math.tan(math.radians(FOV_DEG / 2))  # ~72 m at 40 m alt
fwd_step    = footprint_m * (1 - FWD_OVERLAP_PCT / 100)
side_step   = footprint_m * (1 - SIDE_OVERLAP_PCT / 100)
fwd_step    = max(fwd_step, 4.0)   # never < 4 m (too tight crashes DJI's planner)
side_step   = max(side_step, 6.0)
print(f"footprint={footprint_m:.1f} m  fwd_step={fwd_step:.1f}  side_step={side_step:.1f}")

# Build lawnmower waypoints around CENTER, oriented along HEADING_DEG
def offset_latlon(lat, lon, dn, de):
    """Move (dn metres north, de metres east) from a starting lat/lon. Small-distance approx."""
    R = 6378137.0
    dlat = dn / R
    dlon = de / (R * math.cos(math.radians(lat)))
    return lat + math.degrees(dlat), lon + math.degrees(dlon)

# Number of side rows + photos per row
n_rows    = max(2, int(round(WIDTH_M  / side_step)) + 1)
n_per_row = max(2, int(round(LENGTH_M / fwd_step)) + 1)
print(f"rows={n_rows}  photos/row={n_per_row}  total~{n_rows * n_per_row} photos")

# Generate row by row (boustrophedon — zigzag)
waypoints = []
half_w = WIDTH_M / 2
half_l = LENGTH_M / 2

# Rotate the (n,e) offsets by HEADING_DEG so the grid aligns with the pier's long axis
cos_h, sin_h = math.cos(math.radians(HEADING_DEG)), math.sin(math.radians(HEADING_DEG))

idx = 0
for r in range(n_rows):
    # E offset from center (perpendicular to flight direction)
    e_local = -half_w + r * (WIDTH_M / max(1, n_rows - 1))
    # Along-axis positions
    ns = [(-half_l + i * (LENGTH_M / max(1, n_per_row - 1))) for i in range(n_per_row)]
    if r % 2 == 1:
        ns.reverse()
    for n_local in ns:
        # Rotate (n_local, e_local) by HEADING_DEG
        dn = n_local * cos_h - e_local * sin_h
        de = n_local * sin_h + e_local * cos_h
        lat, lon = offset_latlon(CENTER_LAT, CENTER_LON, dn, de)
        waypoints.append((idx, lat, lon))
        idx += 1

# Build the WPMZ XML
created_ms = int(time.time() * 1000)

def waypoint_placemark(i, lat, lon):
    return f"""    <Placemark>
      <Point><coordinates>{lon:.7f},{lat:.7f}</coordinates></Point>
      <wpml:index>{i}</wpml:index>
      <wpml:executeHeight>{ALTITUDE_M}</wpml:executeHeight>
      <wpml:waypointSpeed>{SPEED_MS}</wpml:waypointSpeed>
      <wpml:waypointHeadingParam>
        <wpml:waypointHeadingMode>followWayline</wpml:waypointHeadingMode>
        <wpml:waypointHeadingAngle>0</wpml:waypointHeadingAngle>
        <wpml:waypointPoiPoint>0,0,0</wpml:waypointPoiPoint>
        <wpml:waypointHeadingAngleEnable>0</wpml:waypointHeadingAngleEnable>
        <wpml:waypointHeadingPathMode>followBadArc</wpml:waypointHeadingPathMode>
      </wpml:waypointHeadingParam>
      <wpml:waypointTurnParam>
        <wpml:waypointTurnMode>toPointAndStopWithDiscontinuityCurvature</wpml:waypointTurnMode>
        <wpml:waypointTurnDampingDist>0</wpml:waypointTurnDampingDist>
      </wpml:waypointTurnParam>
      <wpml:useStraightLine>1</wpml:useStraightLine>
      <wpml:actionGroup>
        <wpml:actionGroupId>{i}</wpml:actionGroupId>
        <wpml:actionGroupStartIndex>{i}</wpml:actionGroupStartIndex>
        <wpml:actionGroupEndIndex>{i}</wpml:actionGroupEndIndex>
        <wpml:actionGroupMode>sequence</wpml:actionGroupMode>
        <wpml:actionTrigger><wpml:actionTriggerType>reachPoint</wpml:actionTriggerType></wpml:actionTrigger>
        <wpml:action>
          <wpml:actionId>0</wpml:actionId>
          <wpml:actionActuatorFunc>gimbalRotate</wpml:actionActuatorFunc>
          <wpml:actionActuatorFuncParam>
            <wpml:gimbalHeadingYawBase>aircraft</wpml:gimbalHeadingYawBase>
            <wpml:gimbalRotateMode>absoluteAngle</wpml:gimbalRotateMode>
            <wpml:gimbalPitchRotateEnable>1</wpml:gimbalPitchRotateEnable>
            <wpml:gimbalPitchRotateAngle>{GIMBAL_PITCH}</wpml:gimbalPitchRotateAngle>
            <wpml:gimbalRollRotateEnable>0</wpml:gimbalRollRotateEnable>
            <wpml:gimbalRollRotateAngle>0</wpml:gimbalRollRotateAngle>
            <wpml:gimbalYawRotateEnable>0</wpml:gimbalYawRotateEnable>
            <wpml:gimbalYawRotateAngle>0</wpml:gimbalYawRotateAngle>
            <wpml:gimbalRotateTimeEnable>0</wpml:gimbalRotateTimeEnable>
            <wpml:gimbalRotateTime>0</wpml:gimbalRotateTime>
            <wpml:payloadPositionIndex>0</wpml:payloadPositionIndex>
          </wpml:actionActuatorFuncParam>
        </wpml:action>
        <wpml:action>
          <wpml:actionId>1</wpml:actionId>
          <wpml:actionActuatorFunc>takePhoto</wpml:actionActuatorFunc>
          <wpml:actionActuatorFuncParam>
            <wpml:payloadPositionIndex>0</wpml:payloadPositionIndex>
            <wpml:fileSuffix>mira_{i:03d}</wpml:fileSuffix>
            <wpml:payloadLensIndex>wide</wpml:payloadLensIndex>
            <wpml:useGlobalPayloadLensIndex>0</wpml:useGlobalPayloadLensIndex>
          </wpml:actionActuatorFuncParam>
        </wpml:action>
      </wpml:actionGroup>
    </Placemark>"""

placemarks = "\n".join(waypoint_placemark(i, la, lo) for i, la, lo in waypoints)

mission_config = f"""    <wpml:missionConfig>
      <wpml:flyToWaylineMode>safely</wpml:flyToWaylineMode>
      <wpml:finishAction>goHome</wpml:finishAction>
      <wpml:exitOnRCLost>executeLostAction</wpml:exitOnRCLost>
      <wpml:executeRCLostAction>goBack</wpml:executeRCLostAction>
      <wpml:globalTransitionalSpeed>10</wpml:globalTransitionalSpeed>
      <wpml:droneInfo>
        <wpml:droneEnumValue>89</wpml:droneEnumValue>
        <wpml:droneSubEnumValue>0</wpml:droneSubEnumValue>
      </wpml:droneInfo>
      <wpml:payloadInfo>
        <wpml:payloadEnumValue>42</wpml:payloadEnumValue>
        <wpml:payloadSubEnumValue>0</wpml:payloadSubEnumValue>
        <wpml:payloadPositionIndex>0</wpml:payloadPositionIndex>
      </wpml:payloadInfo>
    </wpml:missionConfig>"""

template_kml = f"""<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2" xmlns:wpml="http://www.dji.com/wpmz/1.0.6">
<Document>
  <wpml:author>MiraFlight</wpml:author>
  <wpml:createTime>{created_ms}</wpml:createTime>
  <wpml:updateTime>{created_ms}</wpml:updateTime>
{mission_config}
  <Folder>
    <wpml:templateType>waypoint</wpml:templateType>
    <wpml:templateId>0</wpml:templateId>
    <wpml:autoFlightSpeed>{SPEED_MS}</wpml:autoFlightSpeed>
    <wpml:transitionalSpeed>{SPEED_MS}</wpml:transitionalSpeed>
    <wpml:globalHeight>{ALTITUDE_M}</wpml:globalHeight>
    <wpml:caliFlightEnable>0</wpml:caliFlightEnable>
    <wpml:gimbalPitchMode>usePointSetting</wpml:gimbalPitchMode>
    <wpml:globalWaypointHeadingParam>
      <wpml:waypointHeadingMode>followWayline</wpml:waypointHeadingMode>
      <wpml:waypointHeadingAngle>0</wpml:waypointHeadingAngle>
      <wpml:waypointPoiPoint>0,0,0</wpml:waypointPoiPoint>
      <wpml:waypointHeadingAngleEnable>0</wpml:waypointHeadingAngleEnable>
      <wpml:waypointHeadingPathMode>followBadArc</wpml:waypointHeadingPathMode>
    </wpml:globalWaypointHeadingParam>
    <wpml:globalWaypointTurnMode>toPointAndStopWithDiscontinuityCurvature</wpml:globalWaypointTurnMode>
    <wpml:globalUseStraightLine>1</wpml:globalUseStraightLine>
{placemarks}
  </Folder>
</Document>
</kml>
"""

waylines_wpml = f"""<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2" xmlns:wpml="http://www.dji.com/wpmz/1.0.6">
<Document>
{mission_config}
  <Folder>
    <wpml:templateId>0</wpml:templateId>
    <wpml:executeHeightMode>relativeToStartPoint</wpml:executeHeightMode>
    <wpml:waylineId>0</wpml:waylineId>
    <wpml:autoFlightSpeed>{SPEED_MS}</wpml:autoFlightSpeed>
{placemarks}
  </Folder>
</Document>
</kml>
"""

out_path = os.path.join(os.path.dirname(__file__), f"{ASSET_NAME.replace(' ', '_')}_grid.kmz")
with zipfile.ZipFile(out_path, "w", zipfile.ZIP_DEFLATED) as z:
    z.writestr("wpmz/template.kml", template_kml)
    z.writestr("wpmz/waylines.wpml", waylines_wpml)

print(f"\nWrote {out_path}")
print(f"  waypoints: {len(waypoints)}")
print(f"  flight time estimate: ~{(len(waypoints) * (fwd_step / SPEED_MS + 2)) / 60:.1f} min")
