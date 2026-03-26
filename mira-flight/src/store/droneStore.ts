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
  battery: number;
  gps_fix: string;
  satellites: number;
  signal: number;
  updateFromTelemetry: (data: {
    latitude: number;
    longitude: number;
    altitude_agl?: number;
    heading_deg?: number;
    speed_ms?: number;
    battery_pct?: number;
    gps_fix_type?: string;
    gps_satellites?: number;
    signal_strength?: number;
  }) => void;
  setConnected: (val: boolean) => void;
  setArmed: (val: boolean) => void;
  setFlying: (val: boolean) => void;
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
  battery: 100,
  gps_fix: 'none',
  satellites: 0,
  signal: 0,

  updateFromTelemetry: data =>
    set({
      lat: data.latitude,
      lon: data.longitude,
      alt: data.altitude_agl ?? 0,
      heading: data.heading_deg ?? 0,
      speed: data.speed_ms ?? 0,
      battery: data.battery_pct ?? 100,
      gps_fix: data.gps_fix_type ?? 'none',
      satellites: data.gps_satellites ?? 0,
      signal: data.signal_strength ?? 0,
    }),

  setConnected: val => set({connected: val}),
  setArmed: val => set({armed: val}),
  setFlying: val => set({flying: val}),
}));
