import {create} from 'zustand';

export type HudState =
  | 'FLYING'
  | 'PAUSED'
  | 'RTH_ACTIVE'
  | 'LOW_BATTERY'
  | 'CRITICAL_BATTERY'
  | 'LOST_LINK'
  | 'GPS_DEGRADED'
  | 'GEOFENCE_HOVER'
  | 'OBSTACLE_BRAKE'
  | 'MISSION_COMPLETE';

export type HudViewport = 'video_primary' | 'map_primary';

interface HudStoreState {
  hudState: HudState;
  viewport: HudViewport;
  countdownSec: number | null;
  lowBatteryGraceActive: boolean;
  gpsDegradedSince: number | null;

  setHudState: (s: HudState) => void;
  setViewport: (v: HudViewport) => void;
  startLowBatteryGrace: () => void;
  cancelLowBatteryGrace: () => void;
  tickGrace: () => void;
  setGpsDegradedSince: (ts: number | null) => void;
  reset: () => void;
}

export const useHudStore = create<HudStoreState>(set => ({
  hudState: 'FLYING',
  viewport: 'video_primary',
  countdownSec: null,
  lowBatteryGraceActive: false,
  gpsDegradedSince: null,

  setHudState: s => set({hudState: s}),
  setViewport: v => set({viewport: v}),

  startLowBatteryGrace: () =>
    set({lowBatteryGraceActive: true, countdownSec: 10}),

  cancelLowBatteryGrace: () =>
    set({lowBatteryGraceActive: false, countdownSec: null}),

  tickGrace: () =>
    set(prev => {
      if (prev.countdownSec === null || prev.countdownSec <= 0) {
        return {countdownSec: 0};
      }
      return {countdownSec: prev.countdownSec - 1};
    }),

  setGpsDegradedSince: ts => set({gpsDegradedSince: ts}),

  reset: () =>
    set({
      hudState: 'FLYING',
      viewport: 'video_primary',
      countdownSec: null,
      lowBatteryGraceActive: false,
      gpsDegradedSince: null,
    }),
}));

// Transition table — drone-authoritative. UI calls these after telemetry confirms.
// Returns the new HudState given current state + conditions, or null if no change.
export function deriveHudState(
  current: HudState,
  params: {
    batteryPct: number;
    satellites: number;
    rtkStatus: string;
    telemetryStaleMs: number;
    missionComplete: boolean;
    isPaused: boolean;
    isRthActive: boolean;
    geofenceHover: boolean;
    obstacleBrake: boolean;
    gpsDegradedDurationMs: number;
  },
): HudState {
  const {
    batteryPct,
    satellites,
    rtkStatus,
    telemetryStaleMs,
    missionComplete,
    isPaused,
    isRthActive,
    geofenceHover,
    obstacleBrake,
    gpsDegradedDurationMs,
  } = params;

  // Mission-complete is terminal until pilot dismisses
  if (current === 'MISSION_COMPLETE') {
    return 'MISSION_COMPLETE';
  }
  if (missionComplete) {
    return 'MISSION_COMPLETE';
  }

  // Critical battery — non-cancelable auto-land (highest priority after complete)
  if (batteryPct <= 15) {
    return 'CRITICAL_BATTERY';
  }

  // Lost link — RC signal gone > 4s
  if (telemetryStaleMs >= 4000) {
    return 'LOST_LINK';
  }

  // Low battery — 25% threshold, 10s pilot grace before RTH
  if (batteryPct <= 25 && current !== 'RTH_ACTIVE' && current !== 'LOW_BATTERY') {
    return 'LOW_BATTERY';
  }

  // Pilot-driven states (from RTH engage or pause)
  if (isRthActive) {
    return 'RTH_ACTIVE';
  }
  if (isPaused) {
    return 'PAUSED';
  }

  // GPS degraded for > 2s
  const gpsOk = satellites >= 8 && rtkStatus === 'FIX';
  if (!gpsOk && gpsDegradedDurationMs >= 2000) {
    return 'GPS_DEGRADED';
  }
  // GPS recovered for > 5s → back to FLYING
  if (current === 'GPS_DEGRADED' && gpsOk && gpsDegradedDurationMs === 0) {
    return 'FLYING';
  }

  // Boundary / obstacle
  if (geofenceHover) {
    return 'GEOFENCE_HOVER';
  }
  if (obstacleBrake) {
    return 'OBSTACLE_BRAKE';
  }

  // Retain LOW_BATTERY until resolved
  if (current === 'LOW_BATTERY' && batteryPct <= 25) {
    return 'LOW_BATTERY';
  }

  return 'FLYING';
}
