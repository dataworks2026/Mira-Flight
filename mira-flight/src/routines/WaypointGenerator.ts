import {
  Waypoint,
  RoutineType,
  RoutineParams,
  SweepParams,
  OrbitParams,
  GridParams,
  TraverseParams,
  CrawlParams,
  ScoutParams,
} from '../types/shared';
import {generateSweep} from './SweepRoutine';
import {generateOrbit} from './OrbitRoutine';
import {generateGrid} from './GridRoutine';
import {generateTraverse} from './TraverseRoutine';
import {generateCrawl} from './CrawlRoutine';
import {generateScout} from './ScoutRoutine';

export function generateWaypoints(
  type: RoutineType,
  params: RoutineParams,
): Waypoint[] {
  switch (type) {
    case 'sweep':
      return generateSweep(params as SweepParams);
    case 'orbit':
      return generateOrbit(params as OrbitParams);
    case 'grid':
      return generateGrid(params as GridParams);
    case 'traverse':
      return generateTraverse(params as TraverseParams);
    case 'crawl':
      return generateCrawl(params as CrawlParams);
    case 'scout':
      return generateScout(params as ScoutParams);
    default:
      throw new Error(`Unknown routine type: ${type}`);
  }
}
