import {Waypoint, SweepParams} from '../types/shared';
import {distanceBetween, bearingBetween, destinationPoint} from '../utils/geoUtils';

export function generateSweep(params: SweepParams): Waypoint[] {
  const {
    start_lat, start_lon, end_lat, end_lon,
    altitude_m, speed_ms, photo_interval_m, gimbal_pitch,
  } = params;

  const totalDist = distanceBetween(start_lat, start_lon, end_lat, end_lon);
  const bearing = bearingBetween(start_lat, start_lon, end_lat, end_lon);
  const numPoints = Math.max(2, Math.ceil(totalDist / photo_interval_m) + 1);

  const waypoints: Waypoint[] = [];
  for (let i = 0; i < numPoints; i++) {
    const dist = (i / (numPoints - 1)) * totalDist;
    const point = destinationPoint(start_lat, start_lon, bearing, dist);

    waypoints.push({
      index: i,
      latitude: point.lat,
      longitude: point.lon,
      altitude_m,
      speed_ms,
      heading_deg: bearing,
      gimbal_pitch_deg: gimbal_pitch,
      action: 'photo_all',
    });
  }

  return waypoints;
}
