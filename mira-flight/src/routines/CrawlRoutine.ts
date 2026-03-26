import {Waypoint, CrawlParams} from '../types/shared';
import {destinationPoint, bearingBetween} from '../utils/geoUtils';

export function generateCrawl(params: CrawlParams): Waypoint[] {
  const {
    target_lat, target_lon, standoff_m,
    altitude_m, scan_height_m, speed_ms,
    gimbal_pitch, num_passes,
  } = params;

  const waypoints: Waypoint[] = [];
  let idx = 0;

  // Generate zigzag vertical scan pattern at fixed standoff from target
  const bearings = [0, 90, 180, 270]; // Scan from 4 sides
  const passesPerSide = Math.ceil(num_passes / 4);
  const verticalStep = scan_height_m / (passesPerSide || 1);

  for (let side = 0; side < Math.min(4, num_passes); side++) {
    const bearing = bearings[side];
    const scanPoint = destinationPoint(target_lat, target_lon, bearing, standoff_m);
    const headingToTarget = bearingBetween(
      scanPoint.lat, scanPoint.lon,
      target_lat, target_lon,
    );

    for (let pass = 0; pass < passesPerSide; pass++) {
      const alt = altitude_m + (pass - passesPerSide / 2) * verticalStep;
      const lateralOffset = pass % 2 === 0 ? -standoff_m * 0.3 : standoff_m * 0.3;
      const lateralBearing = (bearing + 90) % 360;
      const wp = destinationPoint(scanPoint.lat, scanPoint.lon, lateralBearing, lateralOffset);

      waypoints.push({
        index: idx++,
        latitude: wp.lat,
        longitude: wp.lon,
        altitude_m: Math.max(5, alt),
        speed_ms,
        heading_deg: headingToTarget,
        gimbal_pitch_deg: gimbal_pitch,
        action: 'photo_all',
      });
    }
  }

  return waypoints;
}
