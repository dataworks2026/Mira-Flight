import {Waypoint, GpsPosition} from '../types/shared';
import {distanceBetween, bearingBetween, destinationPoint} from '../utils/geoUtils';

export interface CorridorGeneratorParams {
  path: GpsPosition[];    // polyline vertices defining the corridor centre-line
  altitude: number;        // m AGL
  offset: number;          // metres lateral offset from centre-line (0 = on line)
  photoEvery: number;      // distance trigger spacing, metres
  gimbalPitch: number;     // degrees, e.g. -90
  speed: number;           // m/s
}

export const CORRIDOR_DEFAULTS: Omit<CorridorGeneratorParams, 'path'> = {
  altitude: 40,
  offset: 4,
  photoEvery: 6,
  gimbalPitch: -90,
  speed: 6,
};

/**
 * CORRIDOR — follows a polyline at fixed altitude and lateral offset.
 * WPs are placed every photoEvery metres along the expanded (offset) path.
 * The offset direction is consistently to the left of the direction of travel.
 */
export function generateCorridorWaypoints(params: CorridorGeneratorParams): Waypoint[] {
  const {path, altitude, offset, photoEvery, gimbalPitch, speed} = params;

  if (path.length < 2) {
    return [];
  }

  const waypoints: Waypoint[] = [];
  let idx = 1;
  let accumulated = 0;

  for (let seg = 0; seg < path.length - 1; seg++) {
    const from = path[seg];
    const to = path[seg + 1];
    const bearing = bearingBetween(from.lat, from.lon, to.lat, to.lon);
    const segLen = distanceBetween(from.lat, from.lon, to.lat, to.lon);
    const leftBearing = (bearing - 90 + 360) % 360;

    let distAlongSeg = seg === 0 ? 0 : photoEvery - accumulated;

    // Ensure we start at the beginning of the first segment
    if (seg === 0) {
      const startPt = destinationPoint(from.lat, from.lon, leftBearing, offset);
      waypoints.push({
        sequence_index: idx++,
        latitude: startPt.lat,
        longitude: startPt.lon,
        altitude_m: altitude,
        speed_ms: speed,
        heading_deg: bearing,
        gimbal_pitch: gimbalPitch,
        action: 'photo_all',
      });
      distAlongSeg = photoEvery;
    }

    while (distAlongSeg <= segLen) {
      const centrePt = destinationPoint(from.lat, from.lon, bearing, distAlongSeg);
      const offsetPt = destinationPoint(centrePt.lat, centrePt.lon, leftBearing, offset);

      waypoints.push({
        sequence_index: idx++,
        latitude: offsetPt.lat,
        longitude: offsetPt.lon,
        altitude_m: altitude,
        speed_ms: speed,
        heading_deg: bearing,
        gimbal_pitch: gimbalPitch,
        action: 'photo_all',
      });
      distAlongSeg += photoEvery;
    }

    accumulated = distAlongSeg - segLen;
  }

  // Ensure the last vertex is included
  const lastVtx = path[path.length - 1];
  const prevVtx = path[path.length - 2];
  const endBearing = bearingBetween(prevVtx.lat, prevVtx.lon, lastVtx.lat, lastVtx.lon);
  const endLeftBearing = (endBearing - 90 + 360) % 360;
  const endPt = destinationPoint(lastVtx.lat, lastVtx.lon, endLeftBearing, offset);

  waypoints.push({
    sequence_index: idx,
    latitude: endPt.lat,
    longitude: endPt.lon,
    altitude_m: altitude,
    speed_ms: speed,
    heading_deg: endBearing,
    gimbal_pitch: gimbalPitch,
    action: 'photo_all',
  });

  return waypoints;
}
