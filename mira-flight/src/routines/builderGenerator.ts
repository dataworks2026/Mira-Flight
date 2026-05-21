/**
 * builderGenerator.ts
 *
 * Design-spec dispatcher for the 6 canonical routines (ORBIT / FACADE / GRID /
 * PERIMETER / CORRIDOR / MANUAL).  These map onto the backend RoutineType strings
 * but live separately so shared.ts (the backend contract) is never modified.
 *
 * Mapping:
 *   ORBIT     → backend 'orbit'     / OrbitParams
 *   FACADE    → backend 'sweep'     / SweepParams  (vertical raster variant)
 *   GRID      → backend 'grid'      / GridParams
 *   PERIMETER → backend 'crawl'     / CrawlParams  (closest match)
 *   CORRIDOR  → backend 'traverse'  / TraverseParams
 *   MANUAL    → no backend routine  (hand-placed Waypoint[] directly)
 */

import {Waypoint, GpsPosition} from '../types/shared';
import {generateOrbitWaypoints, OrbitGeneratorParams, ORBIT_DEFAULTS} from './orbitGenerator';
import {generateFacadeWaypoints, FacadeGeneratorParams, FACADE_DEFAULTS} from './facadeGenerator';
import {generateGridWaypoints, GridGeneratorParams, GRID_DEFAULTS} from './gridGenerator';
import {
  generatePerimeterWaypoints,
  PerimeterGeneratorParams,
  PERIMETER_DEFAULTS,
} from './perimeterGenerator';
import {
  generateCorridorWaypoints,
  CorridorGeneratorParams,
  CORRIDOR_DEFAULTS,
} from './corridorGenerator';
import {generateManualWaypoints} from './manualGenerator';

export type BuilderRoutineId = 'ORBIT' | 'FACADE' | 'GRID' | 'PERIMETER' | 'CORRIDOR' | 'MANUAL';

export type BuilderRoutineParams =
  | ({kind: 'ORBIT'} & OrbitGeneratorParams)
  | ({kind: 'FACADE'} & FacadeGeneratorParams)
  | ({kind: 'GRID'} & GridGeneratorParams)
  | ({kind: 'PERIMETER'} & PerimeterGeneratorParams)
  | ({kind: 'CORRIDOR'} & CorridorGeneratorParams)
  | {kind: 'MANUAL'; waypoints: Partial<Waypoint>[]};

export {
  ORBIT_DEFAULTS,
  FACADE_DEFAULTS,
  GRID_DEFAULTS,
  PERIMETER_DEFAULTS,
  CORRIDOR_DEFAULTS,
};

/**
 * Single entry point for the Mission Builder UI.
 * (asset, params) → Waypoint[]
 * Waypoints are 1-indexed and FROZEN at plan time — never lazily regenerated.
 */
export function generateBuilderWaypoints(
  params: BuilderRoutineParams,
  assetLat: number,
  assetLng: number,
): Waypoint[] {
  switch (params.kind) {
    case 'ORBIT':
      return generateOrbitWaypoints(params, assetLat, assetLng);

    case 'FACADE':
      return generateFacadeWaypoints(params, assetLat, assetLng);

    case 'GRID': {
      const boundary: GpsPosition[] = params.boundary.length > 0
        ? params.boundary
        : defaultSquareBoundary(assetLat, assetLng, 80, 60);
      return generateGridWaypoints({...params, boundary});
    }

    case 'PERIMETER': {
      const boundary: GpsPosition[] = params.boundary.length > 0
        ? params.boundary
        : defaultSquareBoundary(assetLat, assetLng, 40, 40);
      return generatePerimeterWaypoints({...params, boundary}, assetLat, assetLng);
    }

    case 'CORRIDOR': {
      const path: GpsPosition[] = params.path.length >= 2
        ? params.path
        : [{lat: assetLat, lon: assetLng, alt: params.altitude},
           {lat: assetLat + 0.001, lon: assetLng, alt: params.altitude}];
      return generateCorridorWaypoints({...params, path});
    }

    case 'MANUAL':
      return generateManualWaypoints(params.waypoints);

    default: {
      const _exhaustive: never = params;
      throw new Error(`Unknown routine kind: ${(_exhaustive as BuilderRoutineParams).kind}`);
    }
  }
}

/** Fallback boundary when the asset has no polygon geometry. */
function defaultSquareBoundary(
  lat: number,
  lng: number,
  widthM: number,
  heightM: number,
): GpsPosition[] {
  const dLat = (heightM / 2) / 111320;
  const dLng = (widthM / 2) / (111320 * Math.cos(lat * Math.PI / 180));
  return [
    {lat: lat - dLat, lon: lng - dLng, alt: 0},
    {lat: lat + dLat, lon: lng - dLng, alt: 0},
    {lat: lat + dLat, lon: lng + dLng, alt: 0},
    {lat: lat - dLat, lon: lng + dLng, alt: 0},
  ];
}
