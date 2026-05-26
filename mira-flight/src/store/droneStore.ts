import {create} from 'zustand';

interface DroneStoreState {
  connected: boolean;
  armed: boolean;
  flying: boolean;
  lat: number;
  lon: number;
  alt: number;
  heading: number;
  speed: number;
  vspeed: number;
  battery: number;
  battery_voltage: number;
  battery_temp_c: number;
  gps_fix: string;
  satellites: number;
  signal: number;
  rtk_status: string;
  gimbal_pitch: number;
  gimbal_yaw: number;
  telemetry_stale_since: number | null;
  updateFromTelemetry: (data: {
    latitude: number;
    longitude: number;
    altitude_agl?: number;
    heading_deg?: number;
    speed_ms?: number;
    vertical_speed_ms?: number;
    battery_pct?: number;
    battery_voltage?: number;
    battery_temp_c?: number;
    gps_fix_type?: string;
    gps_satellites?: number;
    signal_strength?: number;
    rtk_status?: string;
    gimbal_pitch?: number;
    gimbal_yaw?: number;
  }) => void;
  setConnected: (val: boolean) => void;
  setArmed: (val: boolean) => void;
  setFlying: (val: boolean) => void;
  markTelemetryStaleSince: (ts: number | null) => void;
}

export const useDroneStore = create<DroneStoreState>(set => ({
  connected: false,
  armed: false,
  flying: false,
  lat: 0,
  lon: 0,
  alt: 0,
  heading: 0,
  speed: 0,
  vspeed: 0,
  battery: 100,
  battery_voltage: 0,
  battery_temp_c: 0,
  gps_fix: 'none',
  satellites: 0,
  signal: 0,
  rtk_status: 'NONE',
  gimbal_pitch: 0,
  gimbal_yaw: 0,
  telemetry_stale_since: null,

  updateFromTelemetry: data =>
    set(prev => {
      // Guard every numeric field: NaN/Infinity/out-of-range → hold last known value.
      const fin = (v: number | undefined, fallback: number) =>
        v !== undefined && isFinite(v) ? v : fallback;
      return {
        lat: isFinite(data.latitude) ? data.latitude : prev.lat,
        lon: isFinite(data.longitude) ? data.longitude : prev.lon,
        alt: fin(data.altitude_agl, prev.alt),
        heading: fin(data.heading_deg, prev.heading),
        speed: fin(data.speed_ms, prev.speed),
        vspeed: fin(data.vertical_speed_ms, prev.vspeed),
        battery: Math.max(0, Math.min(100, fin(data.battery_pct, prev.battery))),
        battery_voltage: fin(data.battery_voltage, prev.battery_voltage),
        battery_temp_c: fin(data.battery_temp_c, prev.battery_temp_c),
        gps_fix: data.gps_fix_type ?? prev.gps_fix,
        satellites: data.gps_satellites !== undefined && isFinite(data.gps_satellites)
          ? Math.max(0, Math.round(data.gps_satellites))
          : prev.satellites,
        signal: fin(data.signal_strength, prev.signal),
        rtk_status: data.rtk_status ?? prev.rtk_status,
        gimbal_pitch: fin(data.gimbal_pitch, prev.gimbal_pitch),
        gimbal_yaw: fin(data.gimbal_yaw, prev.gimbal_yaw),
        telemetry_stale_since: null,
      };
    }),

  setConnected: val => set({connected: val}),
  setArmed: val => set({armed: val}),
  setFlying: val => set({flying: val}),
  markTelemetryStaleSince: ts => set({telemetry_stale_since: ts}),
}));
