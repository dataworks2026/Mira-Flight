import {Waypoint, ScoutParams} from '../types/shared';
import {destinationPoint, bearingBetween} from '../utils/geoUtils';

export function generateScout(params: ScoutParams): Waypoint[] {
  const {
    center_lat, center_lon, radius_m,
    altitude_m, speed_ms, gimbal_pitch,
  } = params;

  const waypoints: Waypoint[] = [];
  let idx = 0;

  // Circle pattern: 8 evenly spaced points
  for (let i = 0; i < 8; i++) {
    const angle = (i * 360) / 8;
    const point = destinationPoint(center_lat, center_lon, angle, radius_m);
    const headingToCenter = bearingBetween(
      point.lat, point.lon,
      center_lat, center_lon,
    );

    waypoints.push({
      sequence_index: idx++,
      latitude: point.lat,
      longitude: point.lon,
      altitude_m,
      speed_ms,
      heading_deg: headingToCenter,
      gimbal_pitch: gimbal_pitch,
      action: 'photo_all',
    });
  }

  // Cross pattern: N-S-E-W through center
  const crossBearings = [0, 90, 180, 270];
  for (const bearing of crossBearings) {
    const point = destinationPoint(center_lat, center_lon, bearing, radius_m * 0.5);

    waypoints.push({
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

  // Center point
  waypoints.push({
    sequence_index: idx++,
    latitude: center_lat,
    longitude: center_lon,
    altitude_m,
    speed_ms,
    heading_deg: 0,
    gimbal_pitch: gimbal_pitch,
    action: 'photo_all',
  });

  return waypoints;
}
