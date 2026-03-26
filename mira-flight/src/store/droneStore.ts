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
    lat: number;
    lon: number;
    altitude_m: number;
    heading_deg: number;
    speed_ms: number;
    battery_pct: number;
    gps_fix: string;
    satellites: number;
    signal_strength_pct: number;
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
      lat: data.lat,
      lon: data.lon,
      alt: data.altitude_m,
      heading: data.heading_deg,
      speed: data.speed_ms,
      battery: data.battery_pct,
      gps_fix: data.gps_fix,
      satellites: data.satellites,
      signal: data.signal_strength_pct,
    }),

  setConnected: val => set({connected: val}),
  setArmed: val => set({armed: val}),
  setFlying: val => set({flying: val}),
}));
