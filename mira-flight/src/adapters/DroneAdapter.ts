import React, {createContext, useContext} from 'react';
import {Waypoint, CapturedPhoto, CameraLens, DroneState, TelemetryPoint} from '../types/shared';

export type TelemetryCallback = (point: TelemetryPoint) => void;
export type WaypointReachedCallback = (index: number) => void;

export interface DroneCapabilities {
  lenses: CameraLens[];
  hasThermal: boolean;
  hasLRF: boolean;
  hasRTK: boolean;
}

export interface DroneAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  arm(): Promise<void>;
  takeoff(altitude: number): Promise<void>;
  land(): Promise<void>;
  returnToHome(): Promise<void>;
  uploadWaypoints(waypoints: Waypoint[]): Promise<void>;
  startWaypointMission(): Promise<void>;
  pauseMission(): Promise<void>;
  resumeMission(): Promise<void>;
  abortMission(): Promise<void>;
  capturePhoto(lens: CameraLens): Promise<CapturedPhoto>;
  captureAllLenses(): Promise<CapturedPhoto[]>;
  // Optional: pull photos that were written to the aircraft's own storage during
  // flight down to local disk for upload (DJI H20T). Adapters that capture straight
  // to local storage (mock) don't implement this.
  downloadMissionMedia?(): Promise<CapturedPhoto[]>;
  setGimbal(pitch: number, yaw: number): Promise<void>;
  setZoom(level: number): Promise<void>;
  switchLens(lens: CameraLens): Promise<void>;
  startVideoRecording(): Promise<void>;
  stopVideoRecording(): Promise<void>;
  getCapabilities(): DroneCapabilities;
  getState(): DroneState;
  isConnected(): boolean;
  onTelemetry(callback: TelemetryCallback): () => void;
  onWaypointReached(callback: WaypointReachedCallback): () => void;
  onMissionComplete(callback: () => void): () => void;
}

export const DroneContext = createContext<DroneAdapter | null>(null);

export function useDrone(): DroneAdapter {
  const adapter = useContext(DroneContext);
  if (!adapter) {
    throw new Error('useDrone must be used within DroneContext.Provider');
  }
  return adapter;
}
