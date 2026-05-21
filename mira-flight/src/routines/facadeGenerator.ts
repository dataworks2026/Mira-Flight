import {Waypoint} from '../types/shared';
import {destinationPoint} from '../utils/geoUtils';

export interface FacadeGeneratorParams {
  width: number;        // facade width, metres
  height: number;       // facade height, metres
  spacingH: number;     // horizontal column spacing, metres
  spacingV: number;     // vertical row spacing, metres
  altitudeStart: number; // AGL of the bottom row, metres
  gimbalPitch: number;  // degrees (0 = level, facing wall)
  speed: number;        // m/s
  standoff?: number;    // distance from wall face; defaults to 8 m
  faceBearing?: number; // bearing the drone flies along the facade; defaults to 90 (east)
}

export const FACADE_DEFAULTS: FacadeGeneratorParams = {
  width: 36,
  height: 28,
  spacingH: 4,
  spacingV: 4,
  altitudeStart: 6,
  gimbalPitch: 0,
  speed: 3,
  standoff: 8,
  faceBearing: 90,
};

/**
 * FACADE — boustrophedon vertical raster across a wall face.
 * Columns advance horizontally; within each column the drone moves vertically.
 * Odd columns ascend, even columns descend (zigzag).
 * assetLat/Lng is the bottom-left corner of the facade (or centre — caller decides).
 */
export function generateFacadeWaypoints(
  params: FacadeGeneratorParams,
  assetLat: number,
  assetLng: number,
): Waypoint[] {
  const {
    width,
    height,
    spacingH,
    spacingV,
    altitudeStart,
    gimbalPitch,
    speed,
    standoff = 8,
    faceBearing = 90,
  } = params;

  const numCols = Math.max(1, Math.round(width / spacingH) + 1);
  const numRows = Math.max(1, Math.round(height / spacingV) + 1);
  // Perpendicular bearing: drone hovers in front of the wall
  const standoffBearing = (faceBearing + 90) % 360;

  const waypoints: Waypoint[] = [];
  let idx = 1;

  for (let col = 0; col < numCols; col++) {
    const horizDist = col * spacingH;
    const colOrigin = destinationPoint(assetLat, assetLng, faceBearing, horizDist);
    // Step back from wall at standoff
    const standoffPt = destinationPoint(colOrigin.lat, colOrigin.lon, standoffBearing, standoff);
    const descending = col % 2 === 1;

    for (let row = 0; row < numRows; row++) {
      const rowIdx = descending ? numRows - 1 - row : row;
      const altAgl = altitudeStart + rowIdx * spacingV;

      waypoints.push({
        sequence_index: idx++,
        latitude: standoffPt.lat,
        longitude: standoffPt.lon,
        altitude_m: altAgl,
        speed_ms: speed,
        heading_deg: (standoffBearing + 180) % 360, // face the wall
        gimbal_pitch: gimbalPitch,
        gimbal_yaw: 0,
        action: 'photo_all',
      });
    }
  }

  return waypoints;
}
