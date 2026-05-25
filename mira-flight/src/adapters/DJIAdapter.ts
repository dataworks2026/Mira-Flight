import {NativeEventEmitter, NativeModule, NativeModules, Platform} from 'react-native';
import {
  DroneAdapter,
  DroneCapabilities,
  TelemetryCallback,
  WaypointReachedCallback,
} from './DroneAdapter';
import {
  CameraLens,
  CapturedPhoto,
  DroneState,
  TelemetryPoint,
  Waypoint,
} from '../types/shared';

interface DJIBridgeInterface extends NativeModule {
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
  setGimbal(pitch: number, yaw: number): Promise<void>;
  setZoom(level: number): Promise<void>;
  switchLens(lens: CameraLens): Promise<void>;
  startVideoRecording(): Promise<void>;
  stopVideoRecording(): Promise<void>;
}

const DJIBridge = NativeModules.DJIBridge as DJIBridgeInterface;

const INITIAL_STATE: DroneState = {
  connected: false,
  armed: false,
  flying: false,
  lat: 0,
  lon: 0,
  alt: 0,
  heading: 0,
  speed: 0,
  battery: 0,
  gps_fix: 'none',
  satellites: 0,
  signal_strength: 0,
  rtk_status: 'none',
  gimbal_pitch: 0,
  gimbal_yaw: 0,
};

export class DJIAdapter implements DroneAdapter {
  private state: DroneState = {...INITIAL_STATE};
  private telemetryCallbacks: TelemetryCallback[] = [];
  private waypointReachedCallbacks: WaypointReachedCallback[] = [];
  private missionCompleteCallbacks: (() => void)[] = [];
  private emitter: NativeEventEmitter | null = null;
  private subscriptions: {remove: () => void}[] = [];

  constructor() {
    if (Platform.OS === 'android' && DJIBridge) {
      this.emitter = new NativeEventEmitter(DJIBridge);
    }
  }

  async connect(): Promise<void> {
    await DJIBridge.connect();
    this.state.connected = true;
    this._attachEvents();
  }

  async disconnect(): Promise<void> {
    this._detachEvents();
    await DJIBridge.disconnect();
    this.state = {...INITIAL_STATE};
  }

  private _attachEvents(): void {
    if (!this.emitter) {return;}
    this.subscriptions = [
      this.emitter.addListener('DJITelemetry', (point: TelemetryPoint) => {
        this.state = {
          ...this.state,
          lat: point.latitude ?? this.state.lat,
          lon: point.longitude ?? this.state.lon,
          alt: point.altitude_agl ?? this.state.alt,
          heading: point.heading_deg ?? this.state.heading,
          speed: point.speed_ms ?? this.state.speed,
          battery: point.battery_pct ?? this.state.battery,
          satellites: point.gps_satellites ?? this.state.satellites,
          gps_fix: point.gps_fix_type ?? this.state.gps_fix,
          signal_strength: point.signal_strength ?? this.state.signal_strength,
        };
        for (const cb of this.telemetryCallbacks) {cb(point);}
      }),
      this.emitter.addListener(
        'DJIWaypointReached',
        ({index}: {index: number}) => {
          for (const cb of this.waypointReachedCallbacks) {cb(index);}
        },
      ),
      this.emitter.addListener('DJIMissionComplete', () => {
        this.state.flying = false;
        for (const cb of this.missionCompleteCallbacks) {cb();}
      }),
    ];
  }

  private _detachEvents(): void {
    for (const sub of this.subscriptions) {sub.remove();}
    this.subscriptions = [];
  }

  async arm(): Promise<void> {
    await DJIBridge.arm();
    this.state.armed = true;
  }

  async takeoff(altitude: number): Promise<void> {
    await DJIBridge.takeoff(altitude);
    this.state.flying = true;
  }

  async land(): Promise<void> {
    await DJIBridge.land();
    this.state.flying = false;
    this.state.armed = false;
  }

  async returnToHome(): Promise<void> {
    await DJIBridge.returnToHome();
  }

  async uploadWaypoints(waypoints: Waypoint[]): Promise<void> {
    await DJIBridge.uploadWaypoints(waypoints);
  }

  async startWaypointMission(): Promise<void> {
    await DJIBridge.startWaypointMission();
    this.state.flying = true;
  }

  async pauseMission(): Promise<void> {
    await DJIBridge.pauseMission();
  }

  async resumeMission(): Promise<void> {
    await DJIBridge.resumeMission();
  }

  async abortMission(): Promise<void> {
    await DJIBridge.abortMission();
    this.state.flying = false;
  }

  async capturePhoto(lens: CameraLens): Promise<CapturedPhoto> {
    return DJIBridge.capturePhoto(lens);
  }

  async captureAllLenses(): Promise<CapturedPhoto[]> {
    return DJIBridge.captureAllLenses();
  }

  async setGimbal(pitch: number, yaw: number): Promise<void> {
    await DJIBridge.setGimbal(pitch, yaw);
    this.state.gimbal_pitch = pitch;
    this.state.gimbal_yaw = yaw;
  }

  async setZoom(level: number): Promise<void> {
    await DJIBridge.setZoom(level);
  }

  async switchLens(lens: CameraLens): Promise<void> {
    await DJIBridge.switchLens(lens);
  }

  async startVideoRecording(): Promise<void> {
    await DJIBridge.startVideoRecording();
  }

  async stopVideoRecording(): Promise<void> {
    await DJIBridge.stopVideoRecording();
  }

  getCapabilities(): DroneCapabilities {
    return {
      lenses: ['wide', 'zoom', 'thermal'],
      hasThermal: true,
      hasLRF: false,
      hasRTK: true,
    };
  }

  getState(): DroneState {
    return {...this.state};
  }

  isConnected(): boolean {
    return this.state.connected;
  }

  onTelemetry(callback: TelemetryCallback): () => void {
    this.telemetryCallbacks.push(callback);
    return () => {
      this.telemetryCallbacks = this.telemetryCallbacks.filter(
        cb => cb !== callback,
      );
    };
  }

  onWaypointReached(callback: WaypointReachedCallback): () => void {
    this.waypointReachedCallbacks.push(callback);
    return () => {
      this.waypointReachedCallbacks = this.waypointReachedCallbacks.filter(
        cb => cb !== callback,
      );
    };
  }

  onMissionComplete(callback: () => void): () => void {
    this.missionCompleteCallbacks.push(callback);
    return () => {
      this.missionCompleteCallbacks = this.missionCompleteCallbacks.filter(
        cb => cb !== callback,
      );
    };
  }
}
