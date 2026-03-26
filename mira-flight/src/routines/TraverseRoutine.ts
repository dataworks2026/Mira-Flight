import {Waypoint, TraverseParams} from '../types/shared';
import {distanceBetween, bearingBetween, destinationPoint} from '../utils/geoUtils';

export function generateTraverse(params: TraverseParams): Waypoint[] {
  const {waypoints: userWps, altitude_m, speed_ms, photo_interval_m, gimbal_pitch} = params;

  if (userWps.length < 2) {
    return userWps.map((wp, i) => ({
      sequence_index: i,
      latitude: wp.lat,
      longitude: wp.lon,
      altitude_m,
      speed_ms,
      heading_deg: 0,
      gimbal_pitch: gimbal_pitch,
      action: 'photo_all' as const,
    }));
  }

  const result: Waypoint[] = [];
  let idx = 0;

  for (let seg = 0; seg < userWps.length - 1; seg++) {
    const from = userWps[seg];
    const to = userWps[seg + 1];
    const segDist = distanceBetween(from.lat, from.lon, to.lat, to.lon);
    const bearing = bearingBetween(from.lat, from.lon, to.lat, to.lon);
    const numPoints = Math.max(1, Math.ceil(segDist / photo_interval_m));

    for (let i = 0; i <= numPoints; i++) {
      // Skip first point of subsequent segments to avoid duplicates
      if (seg > 0 && i === 0) {
        continue;
      }
      const dist = (i / numPoints) * segDist;
      const point = destinationPoint(from.lat, from.lon, bearing, dist);

      result.push({
        sequence_index: idx++,
        latitude: point.lat,
        longitude: point.lon,
        altitude_m,
        speed_ms,
        heading_deg: bearing,
        gimbal_pitch: gimbal_pitch,
        action: 'photo_all',
      });
    }
  }

  return result;
}
