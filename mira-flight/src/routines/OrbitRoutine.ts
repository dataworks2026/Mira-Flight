import {Waypoint, OrbitParams} from '../types/shared';
import {destinationPoint, bearingBetween} from '../utils/geoUtils';

export function generateOrbit(params: OrbitParams): Waypoint[] {
  const {
    center_lat, center_lon, radius_m, altitude_m,
    speed_ms, num_photos, gimbal_pitch, clockwise,
  } = params;

  const waypoints: Waypoint[] = [];
  const angleStep = 360 / num_photos;

  for (let i = 0; i < num_photos; i++) {
    const angle = clockwise ? i * angleStep : 360 - i * angleStep;
    const point = destinationPoint(center_lat, center_lon, angle, radius_m);

    // Heading faces center
    const headingToCenter = bearingBetween(
      point.lat, point.lon,
      center_lat, center_lon,
    );

    waypoints.push({
      sequence_index: i,
      latitude: point.lat,
      longitude: point.lon,
      altitude_m,
      speed_ms,
      heading_deg: headingToCenter,
      gimbal_pitch: gimbal_pitch,
      action: 'photo_all',
    });
  }

  return waypoints;
}
