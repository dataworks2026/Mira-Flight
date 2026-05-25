import RNFS from 'react-native-fs';
import {
  DroneAdapter,
  DroneCapabilities,
  TelemetryCallback,
  WaypointReachedCallback,
} from './DroneAdapter';
import {
  Waypoint,
  CapturedPhoto,
  CameraLens,
  DroneState,
  TelemetryPoint,
} from '../types/shared';

// Minimal valid 1×1 JPEG — real file bytes so UploadWorker can POST to backend
const MOCK_JPEG_B64 =
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEB' +
  'AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEB' +
  'AQH/wAALCAABAAEBAREA/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL' +
  '/9oACAEBAAA/AH+k/9k=';

function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export class MockAdapter implements DroneAdapter {
  private state: DroneState = {
    connected: false,
    armed: false,
    flying: false,
    lat: 39.9612,
    lon: -82.9988,
    alt: 0,
    heading: 0,
    speed: 0,
    battery: 100,
    gps_fix: '3d',
    satellites: 12,
    signal_strength: 95,
    rtk_status: 'rtk_fixed',
    gimbal_pitch: 0,
    gimbal_yaw: 0,
  };

  private waypoints: Waypoint[] = [];
  private telemetryCallbacks: TelemetryCallback[] = [];
  private waypointReachedCallbacks: WaypointReachedCallback[] = [];
  private missionCompleteCallbacks: (() => void)[] = [];
  private telemetryInterval: ReturnType<typeof setInterval> | null = null;
  private missionRunning = false;
  private missionPaused = false;
  private startPosition = {lat: 39.9612, lon: -82.9988};
  private batteryStartTime = 0;
  private zoomLevel = 1;
  private activeLens: CameraLens = 'wide';
  private videoRecording = false;

  async connect(): Promise<void> {
    await this.delay(1000);
    this.state.connected = true;
    this.startTelemetry();
  }

  async disconnect(): Promise<void> {
    this.stopTelemetry();
    this.state.connected = false;
  }

  async arm(): Promise<void> {
    await this.delay(500);
    this.state.armed = true;
  }

  async takeoff(altitude: number): Promise<void> {
    this.state.flying = true;
    this.batteryStartTime = Date.now();
    const steps = 30;
    const stepAlt = altitude / steps;
    for (let i = 0; i < steps; i++) {
      this.state.alt += stepAlt;
      this.fireTelemetry();
      await this.delay(100);
    }
    this.state.alt = altitude;
  }

  async land(): Promise<void> {
    const steps = 30;
    const stepAlt = this.state.alt / steps;
    for (let i = 0; i < steps; i++) {
      this.state.alt -= stepAlt;
      this.state.speed = 1;
      this.fireTelemetry();
      await this.delay(100);
    }
    this.state.alt = 0;
    this.state.speed = 0;
    this.state.flying = false;
    this.state.armed = false;
  }

  async returnToHome(): Promise<void> {
    await this.flyTo(
      this.startPosition.lat,
      this.startPosition.lon,
      this.state.alt,
    );
    await this.land();
  }

  async uploadWaypoints(waypoints: Waypoint[]): Promise<void> {
    this.waypoints = [...waypoints];
  }

  async pauseMission(): Promise<void> {
    this.missionPaused = true;
  }

  async resumeMission(): Promise<void> {
    this.missionPaused = false;
  }

  async abortMission(): Promise<void> {
    this.missionRunning = false;
    this.missionPaused = false;
  }

  async setZoom(level: number): Promise<void> {
    this.zoomLevel = level;
  }

  async switchLens(lens: CameraLens): Promise<void> {
    this.activeLens = lens;
  }

  async startVideoRecording(): Promise<void> {
    this.videoRecording = true;
  }

  async stopVideoRecording(): Promise<void> {
    this.videoRecording = false;
  }

  getCapabilities(): DroneCapabilities {
    return {
      lenses: ['wide', 'zoom', 'thermal', 'laser_rangefinder'],
      hasThermal: true,
      hasLRF: true,
      hasRTK: true,
    };
  }

  async startWaypointMission(): Promise<void> {
    this.missionRunning = true;
    this.missionPaused = false;
    this.startPosition = {lat: this.state.lat, lon: this.state.lon};

    for (let i = 0; i < this.waypoints.length; i++) {
      if (!this.missionRunning) {
        break;
      }
      while (this.missionPaused) {
        await this.delay(200);
      }
      const wp = this.waypoints[i];
      await this.flyTo(wp.latitude, wp.longitude, wp.altitude_m);

      this.state.gimbal_pitch = wp.gimbal_pitch;
      this.state.heading = wp.heading_deg;

      for (const cb of this.waypointReachedCallbacks) {
        cb(i);
      }
    }

    this.missionRunning = false;
    for (const cb of this.missionCompleteCallbacks) {
      cb();
    }
  }

  async capturePhoto(lens: CameraLens): Promise<CapturedPhoto> {
    const filename = `photo_${uuid()}.jpg`;
    const path = `${RNFS.DocumentDirectoryPath}/${filename}`;
    await RNFS.writeFile(path, MOCK_JPEG_B64, 'base64');
    return {
      localPath: `file://${path}`,
      metadata: {
        lat: this.state.lat,
        lon: this.state.lon,
        alt: this.state.alt,
        heading: this.state.heading,
        gimbal_pitch: this.state.gimbal_pitch,
        timestamp: new Date().toISOString(),
        camera_lens: lens,
      },
    };
  }

  async captureAllLenses(): Promise<CapturedPhoto[]> {
    const lenses: CameraLens[] = [
      'zoom',
      'wide',
      'thermal',
      'laser_rangefinder',
    ];
    const photos: CapturedPhoto[] = [];
    for (const lens of lenses) {
      photos.push(await this.capturePhoto(lens));
    }
    return photos;
  }

  async setGimbal(pitch: number, yaw: number): Promise<void> {
    this.state.gimbal_pitch = pitch;
    this.state.gimbal_yaw = yaw;
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

  private async flyTo(
    targetLat: number,
    targetLon: number,
    targetAlt: number,
  ): Promise<void> {
    const steps = 20;
    const startLat = this.state.lat;
    const startLon = this.state.lon;
    const startAlt = this.state.alt;

    for (let i = 1; i <= steps; i++) {
      const frac = i / steps;
      this.state.lat = startLat + (targetLat - startLat) * frac;
      this.state.lon = startLon + (targetLon - startLon) * frac;
      this.state.alt = startAlt + (targetAlt - startAlt) * frac;
      this.state.speed = 2 + Math.random();
      this.state.heading =
        (Math.atan2(targetLon - startLon, targetLat - startLat) * 180) /
        Math.PI;
      this.updateBattery();
      this.fireTelemetry();
      await this.delay(100);
    }

    this.state.lat = targetLat;
    this.state.lon = targetLon;
    this.state.alt = targetAlt;
    this.state.speed = 0;
  }

  private startTelemetry(): void {
    this.telemetryInterval = setInterval(() => {
      this.updateBattery();
      this.fireTelemetry();
    }, 200);
  }

  private stopTelemetry(): void {
    if (this.telemetryInterval) {
      clearInterval(this.telemetryInterval);
      this.telemetryInterval = null;
    }
  }

  private updateBattery(): void {
    if (this.batteryStartTime > 0) {
      const elapsed = (Date.now() - this.batteryStartTime) / 60000;
      this.state.battery = Math.max(0, 100 - elapsed * 0.5);
    }
  }

  private fireTelemetry(): void {
    const point: TelemetryPoint = {
      timestamp: new Date().toISOString(),
      latitude: this.state.lat,
      longitude: this.state.lon,
      altitude_agl: this.state.alt,
      heading_deg: this.state.heading,
      speed_ms: this.state.speed,
      battery_pct: this.state.battery,
      gps_fix_type: this.state.gps_fix,
      gps_satellites: this.state.satellites,
      signal_strength: this.state.signal_strength,
    };
    for (const cb of this.telemetryCallbacks) {
      cb(point);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
