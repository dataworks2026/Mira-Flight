import {Waypoint, GridParams} from '../types/shared';
import {
  destinationPoint,
  bearingBetween,
  distanceBetween,
  pointInPolygon,
} from '../utils/geoUtils';

export function generateGrid(params: GridParams): Waypoint[] {
  const {
    boundary,
    altitude_m,
    speed_ms,
    overlap_pct,
    sidelap_pct,
    gimbal_pitch,
    camera_fov_deg,
  } = params;

  if (boundary.length < 3) {
    return [];
  }

  // Calculate spacings
  const footprint = altitude_m * Math.tan((camera_fov_deg / 2) * (Math.PI / 180)) * 2;
  const lineSpacing = footprint * (1 - sidelap_pct / 100);
  const photoSpacing = footprint * (1 - overlap_pct / 100);

  // Bounding box
  const lats = boundary.map(p => p.lat);
  const lons = boundary.map(p => p.lon);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);

  // Width and height in meters (approximate)
  const height = distanceBetween(minLat, minLon, maxLat, minLon);
  const width = distanceBetween(minLat, minLon, minLat, maxLon);

  const numLines = Math.ceil(width / lineSpacing) + 1;
  const numPointsPerLine = Math.ceil(height / photoSpacing) + 1;

  const poly2d = boundary.map(p => ({lat: p.lat, lon: p.lon}));
  const waypoints: Waypoint[] = [];
  let idx = 0;

  for (let line = 0; line < numLines; line++) {
    const lonFrac = line / (numLines - 1 || 1);
    const lineLon = minLon + (maxLon - minLon) * lonFrac;
    const reverse = line % 2 === 1; // boustrophedon zigzag

    for (let pt = 0; pt < numPointsPerLine; pt++) {
      const actualPt = reverse ? numPointsPerLine - 1 - pt : pt;
      const latFrac = actualPt / (numPointsPerLine - 1 || 1);
      const pointLat = minLat + (maxLat - minLat) * latFrac;
      const pointLon = lineLon;

      // Clip to polygon
      if (!pointInPolygon({lat: pointLat, lon: pointLon}, poly2d)) {
        continue;
      }

      waypoints.push({
        sequence_index: idx++,
        latitude: pointLat,
        longitude: pointLon,
        altitude_m,
        speed_ms,
        heading_deg: reverse ? 180 : 0,
        gimbal_pitch: gimbal_pitch,
        action: 'photo_wide',
      });
    }
  }

  return waypoints;
}
