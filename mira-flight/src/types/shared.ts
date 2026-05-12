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
  sequence_index: number;
  latitude: number;
  longitude: number;
  altitude_m: number;
  speed_ms: number;
  heading_deg: number;
  gimbal_pitch: number;
  gimbal_yaw?: number;
  action: WaypointAction;
  hover_time_s?: number;
  // Server-assigned fields
  id?: string;
  mission_id?: string;
  reached_at?: string | null;
  photo_taken?: boolean;
  image_id?: string | null;
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
  latitude: number;
  longitude: number;
  altitude_agl?: number;
  altitude_msl?: number;
  heading_deg?: number;
  speed_ms?: number;
  battery_pct?: number;
  gps_satellites?: number;
  gps_fix_type?: string;
  signal_strength?: number;
  flight_mode?: string;
  pitch_deg?: number;
  roll_deg?: number;
  yaw_deg?: number;
  vertical_speed_ms?: number;
  battery_voltage?: number;
  battery_temp_c?: number;
  warnings?: string;
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
  organization_id?: string;
  inspection_id?: string;
  asset_id: string;
  created_by?: string;
  name: string;
  description?: string;
  routine_type: string;
  status: string;
  drone_model?: string;
  drone_serial?: string;
  sensor_payload?: string;
  routine_params?: RoutineParams;
  area_of_interest?: any;
  laanc_authorization_id?: string;
  preflight_checklist?: Record<string, boolean>;
  planned_start?: string;
  actual_start?: string;
  actual_end?: string;
  flight_duration_s?: number;
  total_waypoints?: number;
  total_photos: number;
  photos_uploaded: number;
  photos_analyzed: number;
  odm_job_id?: string;
  odm_status?: string;
  waypoints?: Waypoint[];
  created_at: string;
  updated_at: string;
}

export interface MissionListResponse {
  missions: Mission[];
  total: number;
}

export interface MissionStatusResponse {
  id?: string;
  status: string;
  total_photos?: number;
  photos_uploaded?: number;
  photos_analyzed?: number;
  odm_status?: string;
}

export interface Asset {
  id: string;
  name: string;
  infrastructure_type: string;
  location_name: string;
  latitude: number;
  longitude: number;
  status: string;
  created_at: string;
  inspection_count: number;
  image_count: number;
  last_inspection_at?: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  organization_id?: string;
  organization_name?: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user_id: string;
  email: string;
  full_name?: string;
  username?: string;
  role: string;
  organization_id?: string;
  organization_name?: string;
}
