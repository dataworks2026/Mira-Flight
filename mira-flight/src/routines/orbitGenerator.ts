import {Waypoint} from '../types/shared';
import {destinationPoint, bearingBetween} from '../utils/geoUtils';

export interface OrbitGeneratorParams {
  radius: number;       // metres from asset centre
  altitude: number;     // m AGL
  photos: number;       // number of waypoints around the circle
  gimbalPitch: number;  // degrees, e.g. -45
  startHeading: number; // bearing of first waypoint from asset, 0 = North
  speed: number;        // m/s
}

// Default params per design spec
export const ORBIT_DEFAULTS: OrbitGeneratorParams = {
  radius: 12,
  altitude: 78,
  photos: 24,
  gimbalPitch: -45,
  startHeading: 0,
  speed: 5,
};

/**
 * ORBIT — evenly-spaced circle of waypoints around asset.
 * Heading at each WP faces the asset centre; gimbalYaw = 0 (forward into centre).
 * Clockwise from startHeading.
 */
export function generateOrbitWaypoints(
  params: OrbitGeneratorParams,
  assetLat: number,
  assetLng: number,
): Waypoint[] {
  const {radius, altitude, photos, gimbalPitch, startHeading, speed} = params;
  if (photos < 1) {
    return [];
  }

  const angleStep = 360 / photos;
  const waypoints: Waypoint[] = [];

  for (let i = 0; i < photos; i++) {
    const bearing = (startHeading + i * angleStep) % 360;
    const pt = destinationPoint(assetLat, assetLng, bearing, radius);
    const headingToCenter = bearingBetween(pt.lat, pt.lon, assetLat, assetLng);

    waypoints.push({
      sequence_index: i + 1,
      latitude: pt.lat,
      longitude: pt.lon,
      altitude_m: altitude,
      speed_ms: speed,
      heading_deg: headingToCenter,
      gimbal_pitch: gimbalPitch,
      gimbal_yaw: 0, // always pointing at centre relative to drone heading
      action: 'photo_all',
    });
  }

  return waypoints;
}
