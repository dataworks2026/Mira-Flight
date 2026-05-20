# 07 · Data models

TypeScript types for the whole Mira Flight system. Drop into your codebase as a starting point. Adjust naming to match your conventions; the shape is what matters.

---

## ID conventions

- Assets: `TANK-04`, `PIPE-12`, `HEAT-EX-03`, `SUB-A`, `HELIPAD-N`
- Drones: `M350-A`, `M350-B`, `M30T-D`, `M3T-E`
- Missions: `MR-2026-0428` (year-doy or year-mmdd)
- Waypoints: `WP-{N}` (1-indexed within a mission)
- Captures: `CAP-{missionId}-{N}`

ISO timestamps everywhere. Internally store in UTC; format to local in the UI.

---

## Asset

```ts
type AssetType =
  | 'Storage tank'
  | 'Flare stack'
  | 'Pipe corridor'
  | 'Heat exchanger'
  | 'Cooling tower'
  | 'Electrical yard'
  | 'Landing zone';

type AssetStatus = 'ok' | 'due' | 'overdue';
type Priority = 'low' | 'med' | 'high';

type AssetGeometry =
  | { kind: 'point';    coords: [number, number] }                            // [lng, lat]
  | { kind: 'polygon';  coords: Array<[number, number]> }                     // ring, closed
  | { kind: 'polyline'; coords: Array<[number, number]> };                    // open

type Asset = {
  id: string;                       // "TANK-04"
  name: string;                     // "Tank 04"
  site: string;                     // "Refinery North"
  type: AssetType;
  subtype: string;                  // "Floating roof"
  dimensions: {
    h?: number;                     // m
    diameter?: number;              // m
    width?: number; length?: number;
    areaHa?: number;
    lengthM?: number;
  };
  location: {
    lat: number;                    // decimal degrees
    lng: number;
    altitudeAgl?: number;           // ground elevation if known
  };
  geometry: AssetGeometry;
  lastInspectedAt: string | null;   // ISO datetime
  status: AssetStatus;
  priority: Priority;
  suggestedRoutines: RoutineId[];
  notes?: string;
  createdAt: string; updatedAt: string;
};
```

---

## Routine & mission plan

```ts
type RoutineId = 'ORBIT' | 'FACADE' | 'GRID' | 'PERIMETER' | 'CORRIDOR' | 'MANUAL';

type RoutineParams =
  | { kind: 'ORBIT';     radius: number; altitude: number; photos: number; gimbalPitch: number; startHeading: number; speed: number; }
  | { kind: 'FACADE';    width: number; height: number; spacingH: number; spacingV: number; altitudeStart: number; gimbalPitch: number; speed: number; }
  | { kind: 'GRID';      width: number; height: number; overlapForward: number; overlapSide: number; altitude: number; speed: number; }
  | { kind: 'PERIMETER'; altitude: number; gimbalPitch: number; standoff: number; speed: number; }
  | { kind: 'CORRIDOR';  altitude: number; offset: number; photoEvery: number; gimbalPitch: number; speed: number; }
  | { kind: 'MANUAL'; };

type CameraLens = 'WIDE' | 'ZOOM' | 'IR' | 'LRF';
type ExposureMode = 'AUTO' | 'M';
type CaptureTrigger = 'ON_WP_HOVER' | 'EVERY_M' | 'EVERY_S' | 'MANUAL';

type CaptureConfig = {
  lens: CameraLens;
  zoomLevel?: number;             // for ZOOM
  exposure: ExposureMode;
  trigger: CaptureTrigger;
  intervalM?: number;             // when EVERY_M
  intervalS?: number;             // when EVERY_S
  format: 'JPG' | 'DNG' | 'JPG+DNG';
  geotag: 'RTK+EXIF' | 'GPS+EXIF';
};

type WaypointAction = 'PHOTO_WIDE' | 'PHOTO_ZOOM' | 'PHOTO_IR' | 'LRF' | 'HOVER' | 'CUSTOM';

type Waypoint = {
  i: number;                      // 1-indexed
  lat: number;
  lng: number;
  altitudeAgl: number;
  heading: number;                // 0–359
  gimbalPitch: number;            // -90..0
  gimbalYaw: number;              // relative to drone heading
  speed: number;                  // m/s arrival speed
  action: WaypointAction;
  hoverMs?: number;
  notes?: string;
};

type MissionPlan = {
  id: string;
  name: string;
  assetId: string;
  homePad: { lat: number; lng: number; altitudeAgl: number };
  droneId: string;                // assigned drone
  routine: RoutineParams;
  capture: CaptureConfig;
  waypoints: Waypoint[];          // generated from routine + asset, or hand-placed
  rthAltitude: number;            // m AGL
  safety: {
    geofencePolygonId: string;
    maxAltitudeAgl: number;       // soft cap, defaults 120
    autoRthBatteryPct: number;    // defaults 25
    autoLandBatteryPct: number;   // defaults 15
    linkLossTimeoutSec: number;   // defaults 5
  };
  estimates: {
    durationSec: number;          // 876
    distanceM: number;            // 312
    photoCount: number;           // 24
    dataMb: number;               // 96.4
    batteryOnReturnPct: number;   // 62
  };
  createdBy: string;              // pilot id
  createdAt: string; updatedAt: string;
  status: 'draft' | 'validated' | 'preflight' | 'in_flight' | 'complete' | 'cancelled';
};
```

---

## Drone

```ts
type DroneStatus = 'preflight' | 'flying' | 'returning' | 'idle' | 'charging' | 'offline' | 'maintenance';
type DroneModel = 'M350' | 'M300' | 'M30T' | 'Mavic 3T' | 'Anafi';

type Drone = {
  id: string;                     // "M350-A"
  name: string;
  serial: string;
  model: DroneModel;
  fwVersion: string;
  bay: string;                    // "Helipad N · Bay 2"
  status: DroneStatus;
  liveTelemetry: LiveTelemetry | null;   // null when offline
  currentMissionId: string | null;
  battery: {
    pct: number;
    voltage: number;
    tempC: number;
    cycles: number;
    pack: string;                 // "TB65"
  };
  capabilities: {
    lenses: CameraLens[];
    maxFlightTimeMin: number;
    maxAltAgl: number;
  };
  lastSeenAt: string;             // ISO
};

type LiveTelemetry = {
  ts: string;                     // ISO
  position: { lat: number; lng: number; altitudeAgl: number; altitudeMsl: number };
  heading: number;
  speed: number;                  // m/s ground
  vspeed: number;                 // m/s climb
  gimbal: { pitch: number; yaw: number };
  homeDistanceM: number;
  homeBearingDeg: number;
  battery: { pct: number; voltage: number; tempC: number };
  link: { strengthDbm: number; quality: number /* 0-100 */ };
  gps: { sats: number; hdop: number };
  rtk: 'FIX' | 'FLOAT' | 'NONE';
  windEstimate: { ms: number; bearing: number };
};
```

---

## Mission record (post-flight, immutable)

```ts
type MissionRecord = {
  id: string;
  plan: MissionPlan;              // snapshot of plan at arming
  flownAt: { start: string; end: string };
  droneId: string;
  pilotId: string;
  outcome: 'complete' | 'aborted' | 'land_safe' | 'crash';
  reasonIfNotComplete?: string;
  stats: {
    durationSec: number;
    totalDistanceM: number;
    maxAltAgl: number;
    avgSpeed: number; maxSpeed: number;
    batteryStartPct: number; batteryEndPct: number;
    photosPlanned: number; photosCaptured: number;
    dataMb: number;
    planDeviationMaxM: number;    // max distance between plan and actual
  };
  telemetry: TelemetrySample[];
  captures: CaptureEvent[];
  events: LogEvent[];
};

type TelemetrySample = {
  t: number;                      // seconds since takeoff
  alt: number;                    // m AGL
  batt: number;                   // 0–100
  spd: number;                    // m/s
  vspd?: number;
  heading?: number;
  lat?: number; lng?: number;
};

type CaptureEvent = {
  id: string;
  t: number;
  wp: number;
  lensId: CameraLens;
  format: string;
  bytes: number;
  uploadState: 'uploaded' | 'uploading' | 'queued' | 'failed';
  storageUri?: string;            // s3:// etc once uploaded
  exif?: Record<string, unknown>;
};

type LogEvent = {
  t: number;
  tone: 'cyan' | 'amber' | 'green' | 'blue' | 'red';
  icon: string;                   // material symbol name
  label: string;
  detail: string;
  source: 'pilot' | 'flight_ctrl' | 'mission_engine' | 'cloud_sync';
};
```

---

## Preflight

```ts
type CheckStatus = 'ok' | 'warn' | 'block';

type CheckGroup =
  | 'Hardware'
  | 'Sensors'
  | 'Connectivity'
  | 'Environment'
  | 'Airspace & mission'
  | 'Operator readiness';

type CheckItem = {
  id: string;                     // stable key, e.g. 'hw.props'
  group: CheckGroup;
  label: string;
  detail: string;
  status: CheckStatus;
  value: string;                  // formatted display value e.g. "98%"
  warning?: string;               // longer copy when status === 'warn'
  blocker?: string;               // longer copy when status === 'block'
  remediation?: string;           // how to fix a blocker
  checkedAt: string;              // ISO
};

type Attestations = {
  vlos: boolean;
  airspace: boolean;
  warningsAccepted: boolean;      // only required if any warns
};

type PreflightState = {
  missionId: string;
  pilotId: string;
  checks: Record<string, CheckItem>;
  attestations: Attestations;
  blockingCount: number;          // derived
  warningCount: number;           // derived
  armReady: boolean;              // derived: blockingCount === 0 && all required attestations true
  lastRunAt: string;
};
```

---

## Fleet / dispatcher

```ts
type Mission = {
  id: string;
  name: string;
  assetId: string;
  droneId: string;
  operatorId: string;
  state: 'scheduled' | 'in_flight' | 'complete' | 'cancelled';
  scheduledAt: string;            // ISO
  // live state:
  startedAt?: string;
  progress?: number;              // 0–100
  photosCaptured?: number;
  photosPlanned?: number;
  etaSeconds?: number;
  // post:
  completedAt?: string;
  durationSec?: number;
  cancellationReason?: string;
};

type Alert = {
  id: string;
  tone: 'red' | 'amber';
  category: 'drone_offline' | 'battery_service' | 'weather' | 'airspace' | 'other';
  text: string;
  action: { label: string; href?: string };
  createdAt: string;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
};

type FleetSnapshot = {
  drones: Drone[];
  missionsToday: Mission[];
  alerts: Alert[];
  kpis: {
    elapsedToday: number;         // seconds
    photosToday: number;
    dataMbToday: number;
    qaQueueCount: number;
  };
};
```

---

## HUD state (in-flight)

```ts
type HudState =
  | 'FLYING'
  | 'PAUSED'
  | 'RTH_ACTIVE'
  | 'LOW_BATTERY'
  | 'CRITICAL_BATTERY'
  | 'LOST_LINK'
  | 'GPS_DEGRADED'
  | 'GEOFENCE_HOVER'
  | 'OBSTACLE_BRAKE'
  | 'MISSION_COMPLETE';

type HudViewport = 'video_primary' | 'map_primary';

type HudVm = {
  state: HudState;
  missionId: string;
  plan: MissionPlan;
  drone: Drone;
  telemetry: LiveTelemetry;
  progress: {
    currentWpIndex: number;
    wpDoneCount: number;
    photosCapturedCount: number;
    elapsedSec: number;
    etaSec: number;
  };
  failsafe: {
    autoRthArmedAtBattPct: number;     // default 25
    autoLandArmedAtBattPct: number;    // default 15
    linkLossTimeoutSec: number;        // default 5
    countdownSec?: number;             // if a failsafe is in pilot-grace
  };
  uploadQueueCount: number;
  notices: Array<{ tone: 'amber' | 'red'; label: string }>;
  viewport: HudViewport;
};
```

The HUD's reducer transitions between `HudState` values based on drone telemetry + pilot input. See `02-hud.md` for transition rules.

---

## Pilot

```ts
type Pilot = {
  id: string;
  name: string;
  initials: string;
  email: string;
  license: {
    kind: 'Part107' | 'EASA_A1A3' | 'EASA_A2' | 'other';
    number: string;
    expiresAt: string;
  };
  insurance?: {
    carrier: string;
    coverageUsd: number;
    activeUntil: string;
  };
  role: 'pilot' | 'dispatcher' | 'admin';
  active: boolean;
};
```

---

## Geofence

```ts
type Geofence = {
  id: string;
  name: string;                   // "Refinery N polygon"
  siteId: string;
  polygon: Array<[number, number]>;  // lng, lat, closed ring
  maxAltAgl: number;
  noFlyZones?: Array<{ name: string; polygon: Array<[number, number]>; activeFrom?: string; activeUntil?: string }>;
  notes?: string;
};
```

---

## API surface (suggested)

A high-level outline — adapt to your stack.

**Sync over REST / GraphQL:**
- `GET /assets`, `GET /assets/{id}`
- `GET /drones`, `GET /drones/{id}`
- `GET /missions?state=...`, `GET /missions/{id}`
- `POST /missions`, `PUT /missions/{id}/plan`
- `POST /missions/{id}/preflight/run`
- `POST /missions/{id}/arm` (requires attestations + holds-confirmation token)
- `POST /missions/{id}/control` `{ action: 'pause' | 'resume' | 'rth' | 'land' | 'abort' | 'estop' | 'skip_wp' }`
- `GET /missions/{id}/record` (post-flight)
- `GET /alerts?ack=false`

**Realtime over WebSocket / SSE:**
- `/ws/drones/{id}/telemetry` (1 Hz minimum)
- `/ws/fleet/alerts`
- `/ws/missions/{id}/state` (HUD state changes)
- `/ws/missions/{id}/uploads`

Drone state must be **drone-authoritative** for safety-critical transitions. The UI cannot manufacture a state change without a confirming telemetry packet (e.g. `LOW_BATTERY → RTH_ACTIVE` only after the drone reports it has commanded climb-to-RTH-alt).

---

## Engine actions (mission control protocol)

Mirror the design's destructive-action map:

```ts
type EngineAction =
  | { kind: 'pause' }
  | { kind: 'resume' }
  | { kind: 'skip_wp' }
  | { kind: 'retry_wp' }
  | { kind: 'rth_smart' }
  | { kind: 'rth_direct' }
  | { kind: 'land_here' }
  | { kind: 'abort_mission' }
  | { kind: 'estop' }
  | { kind: 'take_stick' }       // pilot manual override
  | { kind: 'set_altitude'; targetM: number }
  | { kind: 'change_speed'; targetMs: number };
```

All destructive actions (rth_*, land_here, abort_mission, estop) must be gated by hold-to-confirm in the UI and a server-side nonce / token to prevent replay.

---

## Persistence pointers (where to store what)

| Data | Where |
|---|---|
| Assets, drones, pilots, geofences | Relational DB (Postgres) |
| Mission plans (drafts, validated) | Relational DB |
| Mission records (immutable, completed) | Object storage (S3) for telemetry blobs, relational for index + stats |
| Telemetry (live) | Time-series store (InfluxDB / Timescale) |
| Captures (photos, videos) | Object storage (S3); thumbs in CDN; metadata + EXIF in relational |
| Alerts | Relational with WebSocket fan-out |
| Audit log (every flight-control action) | Append-only log store |

---

## Versioning

- All ISO timestamps include timezone offset (`2026-04-28T15:35:00-05:00`).
- API responses are versioned via URL prefix (`/v1/...`).
- Mission plans capture the routine **params and waypoints** at plan time. If the routine generator is later updated, old missions still re-render exactly as flown — don't lazily regenerate waypoints from params.
