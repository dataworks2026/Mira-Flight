/**
 * ArduPilotAdapter — MAVLink v1 UDP adapter for ArduPilot SITL.
 * Connects via UDP bridge: tablet→laptop:14550→WSL2 SITL, SITL→laptop:14553→tablet:14551.
 * Requires: react-native-udp, react-native-fs
 */

import RNFS from 'react-native-fs';
import UdpSocket from 'react-native-udp';

// 1×1 JPEG written to cache so UploadWorker can POST real bytes to backend
const SITL_JPEG_B64 =
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEB' +
  'AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEB' +
  'AQH/wAALCAABAAEBAREA/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL' +
  '/9oACAEBAAA/AH+k/9k=';
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

// ─── MAVLink constants ────────────────────────────────────────────────────────

const MAVLINK_STX = 0xfe; // MAVLink v1 start byte
const GCS_SYSID = 255;
const GCS_COMPID = 0;
const TARGET_SYSID = 1;
const TARGET_COMPID = 1;

const MSG = {
  HEARTBEAT: 0,
  SYS_STATUS: 1,
  GPS_RAW_INT: 24,
  ATTITUDE: 30,
  GLOBAL_POSITION_INT: 33,
  MISSION_ITEM: 39,
  MISSION_REQUEST: 40,
  MISSION_COUNT: 44,
  MISSION_ITEM_REACHED: 46,
  MISSION_ACK: 47,
  COMMAND_LONG: 76,
  COMMAND_ACK: 77,
  VFR_HUD: 74,
  BATTERY_STATUS: 147,
} as const;

const CMD = {
  DO_SET_MODE: 176,
  TAKEOFF: 22,
  LAND: 21,
  RETURN_TO_LAUNCH: 20,
  COMPONENT_ARM_DISARM: 400,
  MISSION_START: 300,
  DO_MOUNT_CONTROL: 205,
} as const;

// CRC extra seed byte per message ID (MAVLink spec)
const CRC_EXTRA: Record<number, number> = {
  0: 50,
  1: 124,
  24: 24,
  30: 39,
  33: 104,
  39: 254,
  40: 230,
  44: 221,
  46: 11,
  47: 153,
  74: 20,
  76: 152,
  77: 143,
  147: 154,
};

// MAVLink flight modes for ArduCopter
const COPTER_MODE_GUIDED = 4;
const COPTER_MODE_AUTO = 3;

// ─── CRC-16/X.25 ─────────────────────────────────────────────────────────────

function crc16Accumulate(data: number, crc: number): number {
  let tmp = (data ^ (crc & 0xff)) & 0xff;
  tmp ^= (tmp << 4) & 0xff;
  return (
    ((crc >> 8) ^ (tmp << 8) ^ (tmp << 3) ^ (tmp >> 4)) & 0xffff
  );
}

function crc16(buf: Uint8Array, extra: number): number {
  let crc = 0xffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crc16Accumulate(buf[i], crc);
  }
  crc = crc16Accumulate(extra, crc);
  return crc;
}

// ─── MAVLink v1 framing ───────────────────────────────────────────────────────

let _seq = 0;

function buildFrame(msgId: number, payload: Uint8Array): Uint8Array {
  const len = payload.length;
  const header = new Uint8Array([
    MAVLINK_STX,
    len,
    _seq++ & 0xff,
    GCS_SYSID,
    GCS_COMPID,
    msgId,
  ]);
  // CRC covers header bytes 1..5 + payload (after STX)
  const crcInput = new Uint8Array(5 + len);
  crcInput.set(header.slice(1));
  crcInput.set(payload, 5);
  const checksum = crc16(crcInput, CRC_EXTRA[msgId] ?? 0);
  const frame = new Uint8Array(6 + len + 2);
  frame.set(header);
  frame.set(payload, 6);
  frame[6 + len] = checksum & 0xff;
  frame[6 + len + 1] = (checksum >> 8) & 0xff;
  return frame;
}

// ─── Message encoders ─────────────────────────────────────────────────────────

function encodeHeartbeat(): Uint8Array {
  // HEARTBEAT: custom_mode(4), type(1), autopilot(1), base_mode(1), system_status(1), mavlink_version(1)
  const p = new Uint8Array(9);
  const view = new DataView(p.buffer);
  view.setUint32(0, 0, true); // custom_mode = 0
  p[4] = 6; // MAV_TYPE_GCS
  p[5] = 8; // MAV_AUTOPILOT_INVALID
  p[6] = 192; // MAV_MODE_FLAG_SAFETY_ARMED | GUIDED
  p[7] = 0;
  p[8] = 3; // MAVLink version 3
  return buildFrame(MSG.HEARTBEAT, p);
}

function encodeCommandLong(
  cmd: number,
  p1 = 0,
  p2 = 0,
  p3 = 0,
  p4 = 0,
  p5 = 0,
  p6 = 0,
  p7 = 0,
  confirmation = 0,
): Uint8Array {
  const p = new Uint8Array(33);
  const view = new DataView(p.buffer);
  view.setFloat32(0, p1, true);
  view.setFloat32(4, p2, true);
  view.setFloat32(8, p3, true);
  view.setFloat32(12, p4, true);
  view.setFloat32(16, p5, true);
  view.setFloat32(20, p6, true);
  view.setFloat32(24, p7, true);
  view.setUint16(28, TARGET_SYSID, true);
  view.setUint16(30, cmd, true);
  p[32] = confirmation;
  return buildFrame(MSG.COMMAND_LONG, p);
}

function encodeMissionCount(count: number): Uint8Array {
  const p = new Uint8Array(4);
  const view = new DataView(p.buffer);
  view.setUint16(0, TARGET_SYSID, true);
  view.setUint16(2, count, true);
  return buildFrame(MSG.MISSION_COUNT, p);
}

function encodeMissionItem(
  seq: number,
  lat: number,
  lon: number,
  altM: number,
  speedMs: number,
  headingDeg: number,
  gimbalPitch: number,
): Uint8Array {
  // MISSION_ITEM: param1-4 (f32), x=lat, y=lon, z=alt (f32), seq(u16),
  // command(u16), target_system, target_component, frame, current, autocontinue
  const p = new Uint8Array(37);
  const view = new DataView(p.buffer);
  view.setFloat32(0, speedMs, true); // param1 = speed
  view.setFloat32(4, 0, true); // param2
  view.setFloat32(8, headingDeg, true); // param3 = yaw
  view.setFloat32(12, gimbalPitch, true); // param4 = gimbal pitch
  view.setFloat32(16, lat, true); // x
  view.setFloat32(20, lon, true); // y
  view.setFloat32(24, altM, true); // z
  view.setUint16(28, seq, true); // seq
  view.setUint16(30, 16, true); // MAV_CMD_NAV_WAYPOINT
  p[32] = TARGET_SYSID;
  p[33] = TARGET_COMPID;
  p[34] = 3; // MAV_FRAME_GLOBAL_RELATIVE_ALT
  p[35] = seq === 0 ? 1 : 0; // current (first item = 1)
  p[36] = 1; // autocontinue
  return buildFrame(MSG.MISSION_ITEM, p);
}

function encodeMissionAck(): Uint8Array {
  const p = new Uint8Array(3);
  p[0] = TARGET_SYSID;
  p[1] = TARGET_COMPID;
  p[2] = 0; // MAV_MISSION_ACCEPTED
  return buildFrame(MSG.MISSION_ACK, p);
}

// ─── Message decoders ─────────────────────────────────────────────────────────

interface ParsedFrame {
  msgId: number;
  payload: Uint8Array;
}

function parseFrames(data: Uint8Array): ParsedFrame[] {
  const frames: ParsedFrame[] = [];
  let i = 0;
  while (i < data.length) {
    if (data[i] !== MAVLINK_STX) {
      i++;
      continue;
    }
    if (i + 5 >= data.length) {break;}
    const len = data[i + 1];
    const msgId = data[i + 5];
    const totalLen = 6 + len + 2;
    if (i + totalLen > data.length) {break;}
    const payload = data.slice(i + 6, i + 6 + len);
    frames.push({msgId, payload});
    i += totalLen;
  }
  return frames;
}

function decodeGlobalPositionInt(p: Uint8Array): Partial<DroneState> {
  if (p.length < 28) {return {};}
  const view = new DataView(p.buffer, p.byteOffset);
  const lat = view.getInt32(4, true) / 1e7;
  const lon = view.getInt32(8, true) / 1e7;
  const altMm = view.getInt32(16, true); // relative alt in mm
  const vx = view.getInt16(20, true) / 100;
  const vy = view.getInt16(22, true) / 100;
  const hdg = view.getUint16(26, true) / 100;
  const speed = Math.sqrt(vx * vx + vy * vy);
  return {lat, lon, alt: altMm / 1000, heading: hdg, speed};
}

function decodeAttitude(p: Uint8Array): Partial<DroneState & {pitch_deg: number; roll_deg: number}> {
  if (p.length < 28) {return {};}
  const view = new DataView(p.buffer, p.byteOffset);
  const roll = (view.getFloat32(4, true) * 180) / Math.PI;
  const pitch = (view.getFloat32(8, true) * 180) / Math.PI;
  return {roll_deg: roll, pitch_deg: pitch};
}

function decodeSysStatus(p: Uint8Array): Partial<DroneState> {
  if (p.length < 31) {return {};}
  const view = new DataView(p.buffer, p.byteOffset);
  const batteryRemaining = p[30]; // -1 if unknown, else 0-100
  return {battery: batteryRemaining >= 0 ? batteryRemaining : 100};
}

function decodeGpsRawInt(p: Uint8Array): Partial<DroneState> {
  if (p.length < 30) {return {};}
  const fixType = p[8]; // 0=no GPS, 1=no fix, 2=2D, 3=3D, 4=DGPS, 5=RTK Float, 6=RTK Fixed
  const satellites = p[29];
  const fixStr =
    fixType >= 6 ? 'rtk_fixed' :
    fixType === 5 ? 'rtk_float' :
    fixType >= 3 ? '3d' :
    fixType === 2 ? '2d' : 'none';
  return {gps_fix: fixStr, satellites};
}

function decodeHeartbeat(p: Uint8Array): {armed: boolean; flying: boolean; mode: number} {
  if (p.length < 9) {return {armed: false, flying: false, mode: 0};}
  const baseMode = p[6];
  const armed = (baseMode & 128) !== 0;
  const customMode = new DataView(p.buffer, p.byteOffset).getUint32(0, true);
  const flying = armed && (customMode === COPTER_MODE_AUTO || customMode === COPTER_MODE_GUIDED);
  return {armed, flying, mode: customMode};
}

function decodeMissionRequest(p: Uint8Array): number {
  if (p.length < 4) {return -1;}
  return new DataView(p.buffer, p.byteOffset).getUint16(2, true);
}

function decodeMissionItemReached(p: Uint8Array): number {
  if (p.length < 2) {return -1;}
  return new DataView(p.buffer, p.byteOffset).getUint16(0, true);
}

// ─── ArduPilotAdapter ─────────────────────────────────────────────────────────

export class ArduPilotAdapter implements DroneAdapter {
  private sitlHost: string;
  private sitlPort: number;
  private listenPort: number;

  private socket: ReturnType<typeof UdpSocket.createSocket> | null = null;
  private connected = false;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private telemetryTimer: ReturnType<typeof setInterval> | null = null;

  private state: DroneState & {pitch_deg?: number; roll_deg?: number} = {
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
    signal_strength: 0,
    rtk_status: 'none',
    gimbal_pitch: -90,
    gimbal_yaw: 0,
  };

  private waypoints: Waypoint[] = [];
  private pendingMissionUpload: (() => void) | null = null;
  private missionUploadSeq = 0;

  private telemetryCallbacks: TelemetryCallback[] = [];
  private waypointCallbacks: WaypointReachedCallback[] = [];
  private missionCompleteCallbacks: (() => void)[] = [];

  private lastWaypointReached = -1;
  private photoSeq = 0;

  constructor(
    sitlHost = '10.0.2.2', // host machine from Android emulator
    sitlPort = 14550,
    listenPort = 14551,
  ) {
    this.sitlHost = sitlHost;
    this.sitlPort = sitlPort;
    this.listenPort = listenPort;
  }

  async connect(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const sock = UdpSocket.createSocket({type: 'udp4', reusePort: true});
      this.socket = sock;

      sock.on('error', (err: Error) => {
        if (!this.connected) {
          reject(err);
        }
      });

      sock.on('message', (msg: Buffer | Uint8Array) => {
        // Hermes has no Buffer global — react-native-udp data is Uint8Array-compatible
        this.handleIncoming(msg as Uint8Array);
      });

      sock.bind(this.listenPort, () => {
        this.connected = true;
        this.state.connected = true;
        this.startHeartbeat();
        this.startTelemetryEmit();
        // Give SITL a moment to detect us before resolving
        setTimeout(resolve, 1500);
      });
    });
  }

  async disconnect(): Promise<void> {
    this.stopHeartbeat();
    this.stopTelemetryEmit();
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.connected = false;
    this.state.connected = false;
  }

  async arm(): Promise<void> {
    // Switch to GUIDED mode first, then arm
    this.send(encodeCommandLong(CMD.DO_SET_MODE, 1, COPTER_MODE_GUIDED));
    await this.delay(500);
    this.send(encodeCommandLong(CMD.COMPONENT_ARM_DISARM, 1));
    await this.waitFor(() => this.state.armed, 8000, 'arm timeout');
  }

  async takeoff(altitude: number): Promise<void> {
    this.send(encodeCommandLong(CMD.TAKEOFF, 0, 0, 0, 0, 0, 0, altitude));
    await this.waitFor(() => this.state.alt >= altitude * 0.9, 20000, 'takeoff timeout');
  }

  async land(): Promise<void> {
    this.send(encodeCommandLong(CMD.LAND));
    await this.waitFor(() => !this.state.armed, 30000, 'land timeout');
  }

  async returnToHome(): Promise<void> {
    this.send(encodeCommandLong(CMD.RETURN_TO_LAUNCH));
    await this.waitFor(() => !this.state.armed, 60000, 'RTH timeout');
  }

  async uploadWaypoints(waypoints: Waypoint[]): Promise<void> {
    this.waypoints = [...waypoints];
    this.missionUploadSeq = 0;

    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('mission upload timeout')), 30000);
      this.pendingMissionUpload = () => {
        clearTimeout(timeout);
        resolve();
      };
      this.send(encodeMissionCount(waypoints.length));
    });
  }

  async startWaypointMission(): Promise<void> {
    this.lastWaypointReached = -1;
    this.send(encodeCommandLong(CMD.MISSION_START, 0, this.waypoints.length - 1));
    // Switch to AUTO mode
    this.send(encodeCommandLong(CMD.DO_SET_MODE, 1, COPTER_MODE_AUTO));
  }

  async pauseMission(): Promise<void> {
    // Switch to LOITER to pause in place
    this.send(encodeCommandLong(CMD.DO_SET_MODE, 1, 5)); // COPTER_MODE_LOITER = 5
  }

  async resumeMission(): Promise<void> {
    // Switch back to AUTO to resume the mission
    this.send(encodeCommandLong(CMD.DO_SET_MODE, 1, COPTER_MODE_AUTO));
  }

  async abortMission(): Promise<void> {
    // Switch to LOITER — hover in place; caller decides RTH or land
    this.send(encodeCommandLong(CMD.DO_SET_MODE, 1, 5)); // COPTER_MODE_LOITER = 5
  }

  async setZoom(level: number): Promise<void> {
    // Stub — DJI zoom handled by DJIAdapter; ArduPilot has no native zoom API
  }

  async switchLens(_lens: CameraLens): Promise<void> {
    // Stub — multi-lens switching handled by the camera payload controller
  }

  async startVideoRecording(): Promise<void> {
    // Stub — video recording controlled by camera payload (e.g. DJI camera API)
  }

  async stopVideoRecording(): Promise<void> {
    // Stub — video recording controlled by camera payload
  }

  getCapabilities(): DroneCapabilities {
    return {
      lenses: ['wide', 'zoom'],
      hasThermal: false,
      hasLRF: false,
      hasRTK: true,
    };
  }

  async capturePhoto(lens: CameraLens): Promise<CapturedPhoto> {
    const filename = `sitl_photo_${this.photoSeq++}_${lens}.jpg`;
    const path = `${RNFS.CachesDirectoryPath}/${filename}`;
    await RNFS.writeFile(path, SITL_JPEG_B64, 'base64');
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
    const lenses: CameraLens[] = ['zoom', 'wide', 'thermal', 'laser_rangefinder'];
    const photos: CapturedPhoto[] = [];
    for (const lens of lenses) {
      photos.push(await this.capturePhoto(lens));
    }
    return photos;
  }

  async setGimbal(pitch: number, yaw: number): Promise<void> {
    // DO_MOUNT_CONTROL: pitch, roll=0, yaw, altitude=0, lat=0, lon=0, mode=2
    this.send(encodeCommandLong(CMD.DO_MOUNT_CONTROL, pitch, 0, yaw, 0, 0, 0, 2));
    this.state.gimbal_pitch = pitch;
    this.state.gimbal_yaw = yaw;
  }

  getState(): DroneState {
    return {...this.state};
  }

  isConnected(): boolean {
    return this.connected;
  }

  onTelemetry(callback: TelemetryCallback): () => void {
    this.telemetryCallbacks.push(callback);
    return () => {
      this.telemetryCallbacks = this.telemetryCallbacks.filter(cb => cb !== callback);
    };
  }

  onWaypointReached(callback: WaypointReachedCallback): () => void {
    this.waypointCallbacks.push(callback);
    return () => {
      this.waypointCallbacks = this.waypointCallbacks.filter(cb => cb !== callback);
    };
  }

  onMissionComplete(callback: () => void): () => void {
    this.missionCompleteCallbacks.push(callback);
    return () => {
      this.missionCompleteCallbacks = this.missionCompleteCallbacks.filter(cb => cb !== callback);
    };
  }

  // ─── Private ───────────────────────────────────────────────────────────────

  private handleIncoming(data: Uint8Array): void {
    const frames = parseFrames(data);
    for (const {msgId, payload} of frames) {
      switch (msgId) {
        case MSG.HEARTBEAT: {
          const hb = decodeHeartbeat(payload);
          this.state.armed = hb.armed;
          this.state.flying = hb.flying;
          this.state.signal_strength = 100;
          break;
        }
        case MSG.GLOBAL_POSITION_INT: {
          const pos = decodeGlobalPositionInt(payload);
          Object.assign(this.state, pos);
          this.emitTelemetry();
          break;
        }
        case MSG.ATTITUDE: {
          const att = decodeAttitude(payload);
          Object.assign(this.state, att);
          break;
        }
        case MSG.SYS_STATUS: {
          const sys = decodeSysStatus(payload);
          Object.assign(this.state, sys);
          break;
        }
        case MSG.GPS_RAW_INT: {
          const gps = decodeGpsRawInt(payload);
          Object.assign(this.state, gps);
          if (gps.rtk_status !== undefined) {
            this.state.rtk_status = gps.rtk_status as string;
          }
          break;
        }
        case MSG.MISSION_REQUEST: {
          const seq = decodeMissionRequest(payload);
          if (seq >= 0 && seq < this.waypoints.length) {
            const wp = this.waypoints[seq];
            this.send(
              encodeMissionItem(
                seq,
                wp.latitude,
                wp.longitude,
                wp.altitude_m,
                wp.speed_ms,
                wp.heading_deg,
                wp.gimbal_pitch,
              ),
            );
          }
          break;
        }
        case MSG.MISSION_ACK: {
          // Upload complete
          this.send(encodeMissionAck());
          if (this.pendingMissionUpload) {
            this.pendingMissionUpload();
            this.pendingMissionUpload = null;
          }
          break;
        }
        case MSG.MISSION_ITEM_REACHED: {
          const seq = decodeMissionItemReached(payload);
          if (seq !== this.lastWaypointReached) {
            this.lastWaypointReached = seq;
            for (const cb of this.waypointCallbacks) {cb(seq);}
            // Fire mission complete on last waypoint
            if (seq === this.waypoints.length - 1) {
              for (const cb of this.missionCompleteCallbacks) {cb();}
            }
          }
          break;
        }
      }
    }
  }

  private emitTelemetry(): void {
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
      pitch_deg: this.state.pitch_deg,
      roll_deg: this.state.roll_deg,
      flight_mode: this.state.flying ? 'auto' : 'guided',
    };
    for (const cb of this.telemetryCallbacks) {cb(point);}
  }

  private send(frame: Uint8Array): void {
    if (!this.socket) {return;}
    this.socket.send(
      frame as unknown as Buffer,
      0,
      frame.length,
      this.sitlPort,
      this.sitlHost,
      () => {},
    );
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      this.send(encodeHeartbeat());
    }, 1000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private startTelemetryEmit(): void {
    // Emit at 5 Hz even if no GLOBAL_POSITION_INT arrives (keeps HUD alive)
    this.telemetryTimer = setInterval(() => {
      if (this.state.lat !== 0) {this.emitTelemetry();}
    }, 200);
  }

  private stopTelemetryEmit(): void {
    if (this.telemetryTimer) {
      clearInterval(this.telemetryTimer);
      this.telemetryTimer = null;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise<void>(resolve => setTimeout(resolve, ms));
  }

  private waitFor(
    condition: () => boolean,
    timeoutMs: number,
    errorMsg: string,
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const start = Date.now();
      const check = setInterval(() => {
        if (condition()) {
          clearInterval(check);
          resolve();
        } else if (Date.now() - start > timeoutMs) {
          clearInterval(check);
          reject(new Error(errorMsg));
        }
      }, 100);
    });
  }
}
