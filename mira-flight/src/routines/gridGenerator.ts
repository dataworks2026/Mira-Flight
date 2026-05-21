import {Waypoint, GpsPosition} from '../types/shared';
import {distanceBetween, pointInPolygon} from '../utils/geoUtils';

export interface GridGeneratorParams {
  boundary: GpsPosition[];  // polygon ring (closed or open, ≥3 pts)
  altitude: number;          // m AGL
  speed: number;             // m/s
  overlapForward: number;    // % forward overlap (along flight line), e.g. 75
  overlapSide: number;       // % side overlap (between lines), e.g. 65
  cameraFovDeg?: number;     // horizontal FOV in degrees; defaults to 84
}

export const GRID_DEFAULTS: Omit<GridGeneratorParams, 'boundary'> = {
  altitude: 60,
  speed: 6,
  overlapForward: 75,
  overlapSide: 65,
  cameraFovDeg: 84,
};

/**
 * GRID — top-down boustrophedon ortho scan.
 * Photo spacing is derived from sensor FOV + altitude + overlap percentages.
 * Scan lines run N–S; clipped to boundary polygon.
 */
export function generateGridWaypoints(params: GridGeneratorParams): Waypoint[] {
  const {
    boundary,
    altitude,
    speed,
    overlapForward,
    overlapSide,
    cameraFovDeg = 84,
  } = params;

  if (boundary.length < 3) {
    return [];
  }

  const fovRad = (cameraFovDeg / 2) * (Math.PI / 180);
  const footprint = altitude * Math.tan(fovRad) * 2;
  const lineSpacing = footprint * (1 - overlapSide / 100);
  const photoSpacing = footprint * (1 - overlapForward / 100);

  const lats = boundary.map(p => p.lat);
  const lons = boundary.map(p => p.lon);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);

  const totalWidthM = distanceBetween(minLat, minLon, minLat, maxLon);
  const totalHeightM = distanceBetween(minLat, minLon, maxLat, minLon);

  const numLines = Math.ceil(totalWidthM / lineSpacing) + 1;
  const numPtsPerLine = Math.ceil(totalHeightM / photoSpacing) + 1;
  const poly2d = boundary.map(p => ({lat: p.lat, lon: p.lon}));

  const waypoints: Waypoint[] = [];
  let idx = 1;

  for (let col = 0; col < numLines; col++) {
    const lonFrac = numLines > 1 ? col / (numLines - 1) : 0;
    const colLon = minLon + (maxLon - minLon) * lonFrac;
    const descending = col % 2 === 1;

    for (let row = 0; row < numPtsPerLine; row++) {
      const actualRow = descending ? numPtsPerLine - 1 - row : row;
      const latFrac = numPtsPerLine > 1 ? actualRow / (numPtsPerLine - 1) : 0;
      const ptLat = minLat + (maxLat - minLat) * latFrac;

      if (!pointInPolygon({lat: ptLat, lon: colLon}, poly2d)) {
        continue;
      }

      waypoints.push({
        sequence_index: idx++,
        latitude: ptLat,
        longitude: colLon,
        altitude_m: altitude,
        speed_ms: speed,
        heading_deg: descending ? 180 : 0,
        gimbal_pitch: -90,
        action: 'photo_wide',
      });
    }
  }

  return waypoints;
}
