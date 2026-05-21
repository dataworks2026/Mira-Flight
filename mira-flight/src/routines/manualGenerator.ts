import {Waypoint} from '../types/shared';

/**
 * MANUAL — validates and normalises hand-placed waypoints.
 * Callers pass their tap-to-place array; this ensures required fields have
 * sensible values and sequence_index is contiguous from 1.
 * No geometry is generated — the user's positions are preserved exactly.
 */
export function generateManualWaypoints(rawWaypoints: Partial<Waypoint>[]): Waypoint[] {
  return rawWaypoints.map((wp, i) => {
    const lat = wp.latitude ?? 0;
    const lng = wp.longitude ?? 0;
    const alt = wp.altitude_m ?? 30;

    return {
      sequence_index: i + 1,
      latitude: lat,
      longitude: lng,
      altitude_m: clampAlt(alt),
      speed_ms: clampSpeed(wp.speed_ms ?? 5),
      heading_deg: normaliseBearing(wp.heading_deg ?? 0),
      gimbal_pitch: clampGimbal(wp.gimbal_pitch ?? -45),
      gimbal_yaw: wp.gimbal_yaw ?? 0,
      action: wp.action ?? 'photo_all',
      hover_time_s: wp.hover_time_s,
    };
  });
}

function clampAlt(v: number): number {
  return Math.max(2, Math.min(120, v));
}

function clampSpeed(v: number): number {
  return Math.max(0.5, Math.min(15, v));
}

function clampGimbal(v: number): number {
  return Math.max(-90, Math.min(0, v));
}

function normaliseBearing(v: number): number {
  return ((v % 360) + 360) % 360;
}
