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
    set({
      lat: data.latitude,
      lon: data.longitude,
      alt: data.altitude_agl ?? 0,
      heading: data.heading_deg ?? 0,
      speed: data.speed_ms ?? 0,
      vspeed: data.vertical_speed_ms ?? 0,
      battery: data.battery_pct ?? 100,
      battery_voltage: data.battery_voltage ?? 0,
      battery_temp_c: data.battery_temp_c ?? 0,
      gps_fix: data.gps_fix_type ?? 'none',
      satellites: data.gps_satellites ?? 0,
      signal: data.signal_strength ?? 0,
      rtk_status: data.rtk_status ?? 'NONE',
      gimbal_pitch: data.gimbal_pitch ?? 0,
      gimbal_yaw: data.gimbal_yaw ?? 0,
      telemetry_stale_since: null,
    }),

  setConnected: val => set({connected: val}),
  setArmed: val => set({armed: val}),
  setFlying: val => set({flying: val}),
  markTelemetryStaleSince: ts => set({telemetry_stale_since: ts}),
}));
