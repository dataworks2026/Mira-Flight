import React, {createContext, useContext} from 'react';
import {Waypoint, CapturedPhoto, CameraLens, DroneState, TelemetryPoint} from '../types/shared';

export type TelemetryCallback = (point: TelemetryPoint) => void;
export type WaypointReachedCallback = (index: number) => void;

export interface DroneAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  arm(): Promise<void>;
  takeoff(altitude: number): Promise<void>;
  land(): Promise<void>;
  returnToHome(): Promise<void>;
  uploadWaypoints(waypoints: Waypoint[]): Promise<void>;
  startWaypointMission(): Promise<void>;
  capturePhoto(lens: CameraLens): Promise<CapturedPhoto>;
  captureAllLenses(): Promise<CapturedPhoto[]>;
  setGimbal(pitch: number, yaw: number): Promise<void>;
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
