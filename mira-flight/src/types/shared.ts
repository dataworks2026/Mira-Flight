export interface GpsPosition {
  lat: number;
  lon: number;
  alt: number;
}

export type CameraLens = 'zoom' | 'wide' | 'thermal' | 'laser_rangefinder';

export type WaypointAction =
  | 'photo_all'
  | 'photo_zoom'
  | 'photo_wide'
  | 'photo_thermal'
  | 'hover'
  | 'none';

export interface Waypoint {
  index: number;
  latitude: number;
  longitude: number;
  altitude_m: number;
  speed_ms: number;
  heading_deg: number;
  gimbal_pitch_deg: number;
  action: WaypointAction;
  hover_time_s?: number;
}

export interface PhotoMetadata {
  lat: number;
  lon: number;
  alt: number;
  heading: number;
  gimbal_pitch: number;
  timestamp: string;
  camera_lens: CameraLens;
}

export interface CapturedPhoto {
  localPath: string;
  metadata: PhotoMetadata;
}

export interface PhotoUploadItem {
  missionId: string;
  localPath: string;
  metadata: PhotoMetadata;
  waypointIndex: number;
}

export interface TelemetryPoint {
  timestamp: string;
  lat: number;
  lon: number;
  altitude_m: number;
  heading_deg: number;
  speed_ms: number;
  battery_pct: number;
  gps_fix: string;
  satellites: number;
  signal_strength_pct: number;
  rtk_status: string;
}

export interface DroneState {
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
  signal_strength: number;
  rtk_status: string;
  gimbal_pitch: number;
  gimbal_yaw: number;
}

export type RoutineType = 'sweep' | 'orbit' | 'grid' | 'traverse' | 'crawl' | 'scout';

export interface SweepParams {
  start_lat: number;
  start_lon: number;
  end_lat: number;
  end_lon: number;
  altitude_m: number;
  speed_ms: number;
  photo_interval_m: number;
  gimbal_pitch: number;
}

export interface OrbitParams {
  center_lat: number;
  center_lon: number;
  radius_m: number;
  altitude_m: number;
  speed_ms: number;
  num_photos: number;
  gimbal_pitch: number;
  clockwise: boolean;
}

export interface GridParams {
  boundary: GpsPosition[];
  altitude_m: number;
  speed_ms: number;
  overlap_pct: number;
  sidelap_pct: number;
  gimbal_pitch: number;
  camera_fov_deg: number;
}

export interface TraverseParams {
  waypoints: GpsPosition[];
  altitude_m: number;
  speed_ms: number;
  photo_interval_m: number;
  gimbal_pitch: number;
}

export interface CrawlParams {
  target_lat: number;
  target_lon: number;
  standoff_m: number;
  altitude_m: number;
  scan_height_m: number;
  speed_ms: number;
  gimbal_pitch: number;
  num_passes: number;
}

export interface ScoutParams {
  center_lat: number;
  center_lon: number;
  radius_m: number;
  altitude_m: number;
  speed_ms: number;
  gimbal_pitch: number;
}

export type RoutineParams =
  | SweepParams
  | OrbitParams
  | GridParams
  | TraverseParams
  | CrawlParams
  | ScoutParams;

export interface Mission {
  id: string;
  name: string;
  asset_id: string;
  asset_name: string;
  routine_type: RoutineType;
  routine_params: RoutineParams;
  status: string;
  waypoints: Waypoint[];
  photo_count: number;
  created_at: string;
  updated_at: string;
  preflight_checklist?: Record<string, boolean>;
}

export interface Asset {
  id: string;
  name: string;
  type: string;
  lat: number;
  lon: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}
