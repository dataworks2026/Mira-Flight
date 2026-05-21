import {Waypoint, GpsPosition} from '../types/shared';
import {destinationPoint, bearingBetween, distanceBetween} from '../utils/geoUtils';

export interface PerimeterGeneratorParams {
  boundary: GpsPosition[];   // polygon vertices (closed or open ring, ≥3 pts)
  altitude: number;           // m AGL
  gimbalPitch: number;        // degrees, e.g. -30
  standoff: number;           // metres inward offset from each vertex
  speed: number;              // m/s
  longEdgeInsertEvery?: number; // insert extra WPs on edges longer than this (m); defaults 20
}

export const PERIMETER_DEFAULTS: Omit<PerimeterGeneratorParams, 'boundary'> = {
  altitude: 50,
  gimbalPitch: -30,
  standoff: 8,
  speed: 5,
  longEdgeInsertEvery: 20,
};

/**
 * PERIMETER — traces the boundary polygon at standoff distance.
 * One WP per vertex. Long edges get intermediate WPs every longEdgeInsertEvery metres.
 * gimbalYaw computed to face asset centre (centroid) at each WP.
 */
export function generatePerimeterWaypoints(
  params: PerimeterGeneratorParams,
  assetLat: number,
  assetLng: number,
): Waypoint[] {
  const {
    boundary,
    altitude,
    gimbalPitch,
    standoff,
    speed,
    longEdgeInsertEvery = 20,
  } = params;

  if (boundary.length < 3) {
    return [];
  }

  // Build closed ring
  const ring = [...boundary];
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first.lat !== last.lat || first.lon !== last.lon) {
    ring.push(first);
  }

  // Centroid for gimbal yaw computation
  const centLat = assetLat;
  const centLng = assetLng;

  const candidates: Array<{lat: number; lon: number}> = [];

  for (let i = 0; i < ring.length - 1; i++) {
    const from = ring[i];
    const to = ring[i + 1];
    const edgeBearing = bearingBetween(from.lat, from.lon, to.lat, to.lon);
    // Inward normal: perpendicular toward centroid side
    const inwardBearing = (edgeBearing + 90) % 360; // try +90 first
    const testPt = destinationPoint(from.lat, from.lon, inwardBearing, 1);
    // Choose the perpendicular that goes toward centroid
    const distTest = distanceBetween(testPt.lat, testPt.lon, centLat, centLng);
    const distOpp = distanceBetween(from.lat, from.lon, centLat, centLng);
    const standoffBearing = distTest < distOpp ? inwardBearing : (inwardBearing + 180) % 360;

    // Vertex WP at standoff
    const vPt = destinationPoint(from.lat, from.lon, standoffBearing, standoff);
    candidates.push(vPt);

    // Long-edge insertions
    const edgeLenM = distanceBetween(from.lat, from.lon, to.lat, to.lon);
    if (edgeLenM > longEdgeInsertEvery) {
      const numInserts = Math.floor(edgeLenM / longEdgeInsertEvery) - 1;
      for (let k = 1; k <= numInserts; k++) {
        const frac = k / (numInserts + 1);
        const interLat = from.lat + (to.lat - from.lat) * frac;
        const interLon = from.lon + (to.lon - from.lon) * frac;
        const iPt = destinationPoint(interLat, interLon, standoffBearing, standoff);
        candidates.push(iPt);
      }
    }
  }

  return candidates.map((pt, i) => {
    const headingToCenter = bearingBetween(pt.lat, pt.lon, centLat, centLng);
    const gimbalYaw = 0; // heading already faces centre; relative yaw = 0
    return {
      sequence_index: i + 1,
      latitude: pt.lat,
      longitude: pt.lon,
      altitude_m: altitude,
      speed_ms: speed,
      heading_deg: headingToCenter,
      gimbal_pitch: gimbalPitch,
      gimbal_yaw: gimbalYaw,
      action: 'photo_all' as const,
    };
  });
}
