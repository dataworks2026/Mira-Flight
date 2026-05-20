/* The 9 alt-state configs.
   Each one is a single object describing every region's override. The frame in
   hud-altstates.jsx does the rendering — this file is meant to be readable as a spec. */

/* Shared default WP list re-used where the mission is still progressing. */
const wpDone = [
  { i: 5, action: 'PHOTO_ZOOM', state: 'done',    alt: 78, hdg: 90,  dist: 0 },
  { i: 6, action: 'PHOTO_ZOOM', state: 'done',    alt: 78, hdg: 135, dist: 0 },
  { i: 7, action: 'PHOTO_ZOOM', state: 'done',    alt: 78, hdg: 180, dist: 0 },
  { i: 8, action: 'PHOTO_ZOOM', state: 'current', alt: 78, hdg: 225, dist: 0 },
  { i: 9, action: 'PHOTO_ZOOM', state: 'next',    alt: 78, hdg: 270, dist: 42 },
];

const wpAllDone = [
  { i: 20, action: 'PHOTO_ZOOM', state: 'done', alt: 78, hdg: 0,   dist: 0 },
  { i: 21, action: 'PHOTO_ZOOM', state: 'done', alt: 78, hdg: 60,  dist: 0 },
  { i: 22, action: 'PHOTO_ZOOM', state: 'done', alt: 78, hdg: 120, dist: 0 },
  { i: 23, action: 'PHOTO_ZOOM', state: 'done', alt: 78, hdg: 180, dist: 0 },
  { i: 24, action: 'PHOTO_WIDE', state: 'done', alt: 85, hdg: 240, dist: 0 },
];

/* ===================================================================== */
const STATE_PAUSED = {
  code: 'PAUSED',
  chipColor: T.amber,
  chipBorder: 'rgba(245,158,11,0.5)',

  topPill: { tone: 'amber', icon: ICON.pause, label: 'PAUSED' },
  tplus: '00:04:21', eta: '03:27', etaColor: T.t3,

  link: { tone: 'green', value: '98%' },
  rtk:  { tone: 'green', value: 'FIX' },
  wind: { tone: 'slate', value: '4.2 m/s' },
  cloud: { tone: 'green' },
  notices: [],

  alt: '78.4', spd: '0.0', vspd: '0.0', hdg: '247', homeDist: '124',
  spdHealth: 'ok', altHealth: 'ok',
  spdSub: 'holding · 0 m/s',

  battery: { pct: 74, health: 'ok', volts: '22.3', temp: '41', timerLabel: 'AUTO-RTH', timer: '≈ 06:48', timerColor: T.amber },
  gps:  { health: 'ok',  value: 'FIX',  sub: '22 sat' },
  rc:   { health: 'ok',  value: '−62', sub: 'dBm' },

  waypoints: wpDone,
  wpHeader: 'frozen at 7',

  controls: {
    primaryLabel: 'RESUME', primaryIcon: ICON.play, primaryFg: T.green, primaryBg: 'rgba(16,185,129,0.14)',
    header: 'FLIGHT CONTROL · TAP TO RESUME',
    headerColor: T.amber,
    row1: [{ iconName: ICON.rth, label: 'RTH', tone: 'blue' }, { iconName: ICON.land, label: 'LAND', sub: 'here', tone: 'amber' }],
    row2: [{ iconName: ICON.abort, label: 'ABORT', sub: 'end mission', tone: 'red' }, { iconName: ICON.estop, label: 'E-STOP', sub: 'hold 3s', tone: 'red' }],
  },

  banner: {
    tone: 'amber', icon: ICON.pause,
    title: 'Mission paused at WP 08',
    sub: 'Drone holds position · gimbal locked · video continues recording. Tap RESUME or any RTH/LAND to take over.',
    action: { label: 'RESUME · 1 TAP', icon: ICON.play },
  },

  center: 'paused',
};

/* ===================================================================== */
const STATE_RTH = {
  code: 'RTH_ACTIVE',
  chipColor: T.blue,
  chipBorder: 'rgba(59,130,246,0.5)',

  topPill: { tone: 'blue', icon: ICON.rth, label: 'RTH' },
  tplus: '00:05:42', etaLabel: 'HOME ETA', eta: '01:14', etaColor: T.blue,

  link: { tone: 'green', value: '94%' },
  rtk: { tone: 'green', value: 'FIX' },
  wind: { tone: 'slate', value: '4.2 m/s' },
  cloud: { tone: 'green' },
  notices: [{ tone: 'amber', label: 'MISSION INCOMPLETE' }],

  alt: '90.0', spd: '6.2', vspd: '+1.4', hdg: '142', homeDist: '118',
  altSub: 'climbing to RTH ceiling 90 m', spdSub: 'commanded 6.0 m/s',
  vspdSub: 'climb',

  battery: { pct: 41, health: 'ok', volts: '20.8', temp: '43', timerLabel: 'HOME IN', timer: '01:14', timerColor: T.blue },
  gps:  { health: 'ok', value: 'FIX', sub: '21 sat' },
  rc:   { health: 'ok', value: '−66', sub: 'dBm' },

  missionCard: (
    <div style={{ padding: '18px 22px', borderBottom: `1px solid ${T.hairline2}`, background: 'rgba(59,130,246,0.06)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <MI name={ICON.rth} size={18} color={T.blue} fill={1}/>
        <span style={{ fontFamily: T.ui, fontSize: 12, color: T.blue, letterSpacing: '0.16em', fontWeight: 700 }}>RETURN TO HOME · ACTIVE</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
        <span style={{ fontFamily: 'Roboto Mono', fontSize: 44, color: T.blue, fontWeight: 500, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>118</span>
        <span style={{ fontFamily: T.ui, fontSize: 16, color: T.t2 }}>m to home · bearing 142°</span>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: '#0F1420', overflow: 'hidden', position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, width: '45%', background: T.blue, borderRadius: 3 }}/>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', marginTop: 12, gap: 8 }}>
        <div><div style={{ fontFamily: T.ui, fontSize: 10, color: T.t3, letterSpacing: '0.14em', fontWeight: 500 }}>MODE</div><div style={{ fontFamily: T.ui, fontSize: 14, color: T.t1, fontWeight: 500, marginTop: 2 }}>Smart RTH</div></div>
        <div><div style={{ fontFamily: T.ui, fontSize: 10, color: T.t3, letterSpacing: '0.14em', fontWeight: 500 }}>RTH ALT</div><div style={{ fontFamily: 'Roboto Mono', fontVariantNumeric: 'tabular-nums', fontSize: 18, color: T.t1, fontWeight: 500, marginTop: 2 }}>90 m</div></div>
        <div><div style={{ fontFamily: T.ui, fontSize: 10, color: T.t3, letterSpacing: '0.14em', fontWeight: 500 }}>ETA</div><div style={{ fontFamily: 'Roboto Mono', fontVariantNumeric: 'tabular-nums', fontSize: 18, color: T.blue, fontWeight: 500, marginTop: 2 }}>01:14</div></div>
      </div>
    </div>
  ),

  waypoints: wpDone,
  wpHeader: 'paused at 7 · resume on cancel',

  controls: {
    primaryLabel: 'CANCEL RTH', primaryIcon: ICON.close, primaryFg: T.amber, primaryBg: 'rgba(245,158,11,0.14)',
    header: 'RTH IN PROGRESS · OVERRIDE BELOW',
    headerColor: T.blue,
    row1: [{ iconName: ICON.rth, label: 'RTH', tone: 'blue', active: true }, { iconName: ICON.land, label: 'LAND', sub: 'here', tone: 'amber' }],
    row2: [{ iconName: ICON.abort, label: 'ABORT', sub: 'end mission', tone: 'red' }, { iconName: ICON.estop, label: 'E-STOP', sub: 'hold 3s', tone: 'red' }],
  },

  banner: {
    tone: 'blue', icon: ICON.rth,
    title: 'Returning to home — Smart RTH',
    sub: 'Climbed to 90 m RTH alt · routing around mapped geofence · descent to pad on arrival.',
    countdown: { label: 'HOME ETA', value: '01:14' },
  },

  center: 'rth',
};

/* ===================================================================== */
const STATE_LOW_BATTERY = {
  code: 'LOW_BATTERY · 25%',
  chipColor: T.amber,
  chipBorder: 'rgba(245,158,11,0.5)',

  topPill: { tone: 'amber', icon: ICON.battery_low, label: 'LOW BATT' },
  tplus: '00:09:14', eta: '02:36', etaColor: T.amber,

  link: { tone: 'green', value: '96%' },
  rtk: { tone: 'green', value: 'FIX' },
  wind: { tone: 'slate', value: '4.6 m/s' },
  cloud: { tone: 'green' },
  notices: [{ tone: 'amber', label: 'AUTO-RTH PENDING' }],

  alt: '78.4', spd: '4.8', vspd: '+0.0', hdg: '247', homeDist: '124',

  battery: { pct: 25, health: 'warn', volts: '20.1', temp: '46', timerLabel: 'AUTO-RTH IN', timer: '00:07', timerColor: T.amber },
  gps: { health: 'ok', value: 'FIX', sub: '21 sat' },
  rc:  { health: 'ok', value: '−64', sub: 'dBm' },

  waypoints: wpDone,
  wpHeader: 'mission will pause @ RTH',

  controls: {
    primaryLabel: 'PAUSE', primaryIcon: ICON.pause, primaryFg: T.cyan, primaryBg: 'rgba(0,212,255,0.14)',
    header: 'FLIGHT CONTROL · CONFIRM OR WAIT',
    headerColor: T.amber,
    row1: [{ iconName: ICON.rth, label: 'RTH NOW', tone: 'blue' }, { iconName: ICON.land, label: 'LAND', sub: 'here', tone: 'amber' }],
    row2: [{ iconName: ICON.abort, label: 'ABORT', sub: 'end mission', tone: 'red' }, { iconName: ICON.estop, label: 'E-STOP', sub: 'hold 3s', tone: 'red' }],
  },

  banner: {
    tone: 'amber', icon: ICON.battery_low,
    title: 'Battery 25% — Auto-RTH in 7 seconds',
    sub: 'Mission will pause at current WP, drone will climb to 90 m and return home. Pilot can cancel grace window.',
    countdown: { label: 'AUTO-RTH', value: '00:07' },
    action: { label: 'CANCEL · CONTINUE', icon: ICON.close },
  },

  center: null,
};

/* ===================================================================== */
const STATE_CRITICAL = {
  code: 'CRITICAL_BATTERY · 15%',
  chipColor: T.red,
  chipBorder: 'rgba(239,68,68,0.55)',

  topPill: { tone: 'red', icon: ICON.land, label: 'AUTO-LAND' },
  tplus: '00:11:48', etaLabel: 'LAND IN', eta: '00:34', etaColor: T.red,

  link: { tone: 'green', value: '92%' },
  rtk: { tone: 'green', value: 'FIX' },
  wind: { tone: 'slate', value: '5.1 m/s' },
  cloud: { tone: 'green' },
  notices: [{ tone: 'red', label: 'NON-CANCELABLE' }],

  alt: '32.0', spd: '0.6', vspd: '−1.6', hdg: '142', homeDist: '8',
  altSub: 'descending at 1.6 m/s', vspdSub: 'descent', altHealth: 'warn',

  battery: { pct: 15, health: 'crit', volts: '19.4', temp: '49', timerLabel: 'LAND IN', timer: '00:34', timerColor: T.red },
  gps: { health: 'ok', value: 'FIX', sub: '20 sat' },
  rc:  { health: 'ok', value: '−61', sub: 'dBm' },

  missionCard: (
    <div style={{ padding: '18px 22px', borderBottom: `1px solid ${T.hairline2}`, background: 'rgba(239,68,68,0.08)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <MI name={ICON.emergency} size={18} color={T.red} fill={1}/>
        <span style={{ fontFamily: T.ui, fontSize: 12, color: T.red, letterSpacing: '0.16em', fontWeight: 700 }}>CRITICAL · AUTO-LAND</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
        <span style={{ fontFamily: 'Roboto Mono', fontSize: 44, color: T.red, fontWeight: 500, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>00:34</span>
        <span style={{ fontFamily: T.ui, fontSize: 16, color: T.t2 }}>to touchdown</span>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: '#0F1420', overflow: 'hidden', position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, width: '60%', background: T.red, borderRadius: 3 }}/>
      </div>
      <div style={{ fontFamily: T.ui, fontSize: 12, color: T.t2, marginTop: 12, lineHeight: 1.5 }}>
        Surface check passed · descent rate 1.6 m/s · pilot inputs ignored except E-STOP.
      </div>
    </div>
  ),

  waypoints: wpDone,
  wpHeader: 'aborted at 7',

  controls: {
    disabled: true,
    primaryLabel: 'LOCKED', primaryIcon: ICON.land, primaryFg: T.t3, primaryBg: T.card,
    header: 'CONTROLS LOCKED · LAND IN PROGRESS',
    headerColor: T.red,
    row1: [{ iconName: ICON.rth, label: 'RTH', tone: 'blue', disabled: true }, { iconName: ICON.land, label: 'LAND', tone: 'red', active: true }],
    row2: [{ iconName: ICON.abort, label: 'ABORT', tone: 'red', disabled: true }, { iconName: ICON.estop, label: 'E-STOP', sub: 'still active', tone: 'red' }],
  },

  banner: {
    tone: 'red', icon: ICON.land,
    title: 'Critical battery — Auto-LAND in progress',
    sub: 'Descending in place. This action cannot be canceled. E-STOP remains armed as the only override.',
    countdown: { label: 'TOUCHDOWN', value: '00:34' },
  },

  center: null,
  telemStale: false,
};

/* ===================================================================== */
const STATE_LOST_LINK = {
  code: 'LOST_LINK · failsafe pending',
  chipColor: T.red,
  chipBorder: 'rgba(239,68,68,0.55)',

  topPill: { tone: 'red', icon: ICON.signal, label: 'NO LINK' },
  tplus: '00:04:21', etaLabel: 'FAILSAFE', eta: '00:01', etaColor: T.red,

  link: { tone: 'red',   value: 'LOST' },
  rtk:  { tone: 'amber', value: '—' },
  wind: { tone: 'slate', value: '—' },
  cloud: { tone: 'amber' },
  notices: [{ tone: 'red', label: 'TELEMETRY STALE 4.0 s' }],

  telemStale: true,
  alt: '78.4', spd: '4.8', vspd: '+0.2', hdg: '247', homeDist: '124',

  battery: { pct: 74, health: 'ok', volts: '22.3', temp: '41', timerLabel: 'LAST UPDATE', timer: 'T+04:17', timerColor: T.amber },
  gps:  { health: 'warn', value: 'STALE', sub: 'last 22 sat' },
  rc:   { health: 'crit', value: 'LOST', sub: '4.0 s ago' },

  waypoints: wpDone,
  wpHeader: 'last commanded WP 07',

  controls: {
    disabled: true,
    primaryLabel: 'PAUSE', primaryIcon: ICON.pause, primaryFg: T.t3, primaryBg: T.card,
    header: 'NO COMMAND LINK · FAILSAFE WILL ENGAGE',
    headerColor: T.red,
    row1: [{ iconName: ICON.rth, label: 'RTH', tone: 'blue', disabled: true }, { iconName: ICON.land, label: 'LAND', tone: 'amber', disabled: true }],
    row2: [{ iconName: ICON.abort, label: 'ABORT', tone: 'red', disabled: true }, { iconName: ICON.estop, label: 'E-STOP', tone: 'red', disabled: true }],
  },

  banner: {
    tone: 'red', icon: ICON.signal,
    title: 'RC link lost — failsafe RTH in 1 s',
    sub: 'No commands have reached the drone for 4 seconds. Showing last known telemetry. Drone will auto-RTH to 90 m and home.',
    countdown: { label: 'FAILSAFE', value: '00:01' },
  },

  center: 'lostlink',
};

/* ===================================================================== */
const STATE_GPS_DEGRADED = {
  code: 'GPS_DEGRADED · attitude mode',
  chipColor: T.amber,
  chipBorder: 'rgba(245,158,11,0.5)',

  topPill: { tone: 'amber', icon: ICON.satellite, label: 'ATTI MODE' },
  tplus: '00:04:32', etaLabel: 'ETA', eta: '—', etaColor: T.t3,

  link: { tone: 'green', value: '95%' },
  rtk: { tone: 'red', value: 'LOST' },
  wind: { tone: 'slate', value: '4.5 m/s' },
  cloud: { tone: 'amber' },
  notices: [{ tone: 'amber', label: 'GPS · 4 SAT' }],

  alt: '78.4', spd: '3.1', vspd: '+0.0', hdg: '247', homeDist: '— m',
  spdSub: 'manual stick · no auto', homeSub: 'bearing unknown',

  battery: { pct: 71, health: 'ok', volts: '22.2', temp: '42', timerLabel: 'AUTO-RTH', timer: 'DISABLED', timerColor: T.amber },
  gps: { health: 'crit', value: '4 SAT', sub: 'no RTK' },
  rc:  { health: 'ok', value: '−63', sub: 'dBm' },

  waypoints: wpDone,
  wpHeader: 'mission paused · attitude mode',

  controls: {
    primaryLabel: 'TAKE STICK', primaryIcon: ICON.override, primaryFg: T.purple, primaryBg: 'rgba(167,139,250,0.16)',
    header: 'AUTO FLIGHT UNAVAILABLE · MANUAL ONLY',
    headerColor: T.amber,
    row1: [{ iconName: ICON.rth, label: 'RTH', tone: 'blue', disabled: true }, { iconName: ICON.land, label: 'LAND', sub: 'here', tone: 'amber' }],
    row2: [{ iconName: ICON.abort, label: 'ABORT', sub: 'end mission', tone: 'red' }, { iconName: ICON.estop, label: 'E-STOP', sub: 'hold 3s', tone: 'red' }],
  },

  banner: {
    tone: 'amber', icon: ICON.satellite,
    title: 'GPS degraded — Attitude mode engaged',
    sub: 'RTK lost · only 4 satellites · drone will hold attitude but not position. Auto-RTH disabled until ≥ 8 sats recover.',
    action: { label: 'TAKE STICK CONTROL', icon: ICON.override },
  },

  center: 'attitude',
};

/* ===================================================================== */
const STATE_GEOFENCE = {
  code: 'GEOFENCE_HOVER',
  chipColor: T.amber,
  chipBorder: 'rgba(245,158,11,0.5)',

  topPill: { tone: 'amber', icon: ICON.geofence, label: 'GEOFENCE' },
  tplus: '00:06:08', eta: '— · paused', etaColor: T.amber,

  link: { tone: 'green', value: '97%' },
  rtk: { tone: 'green', value: 'FIX' },
  wind: { tone: 'amber', value: '8.4 m/s' },
  cloud: { tone: 'green' },
  notices: [{ tone: 'amber', label: 'GEOFENCE BREACH PREVENTED' }],

  alt: '78.4', spd: '0.0', vspd: '+0.0', hdg: '270', homeDist: '186',
  spdSub: 'holding · 0 m/s · boundary',

  battery: { pct: 62, health: 'ok', volts: '21.6', temp: '44', timerLabel: 'AUTO-RTH', timer: '≈ 04:28', timerColor: T.amber },
  gps: { health: 'ok', value: 'FIX', sub: '21 sat' },
  rc:  { health: 'ok', value: '−65', sub: 'dBm' },

  waypoints: wpDone,
  wpHeader: 'WP 08 blocked · outside fence',

  controls: {
    primaryLabel: 'REROUTE', primaryIcon: ICON.retry, primaryFg: T.cyan, primaryBg: 'rgba(0,212,255,0.14)',
    header: 'FLIGHT CONTROL · CHOOSE ACTION',
    headerColor: T.amber,
    row1: [{ iconName: ICON.rth, label: 'RTH', tone: 'blue' }, { iconName: ICON.land, label: 'LAND', sub: 'here', tone: 'amber' }],
    row2: [{ iconName: ICON.abort, label: 'ABORT', sub: 'end mission', tone: 'red' }, { iconName: ICON.estop, label: 'E-STOP', sub: 'hold 3s', tone: 'red' }],
  },

  banner: {
    tone: 'amber', icon: ICON.geofence,
    title: 'Geofence boundary reached — hovering',
    sub: 'Next waypoint sits 12 m outside the active geofence. Drone is holding at the edge. Skip WP, reroute, or RTH.',
    action: { label: 'SKIP · CONTINUE', icon: ICON.skip_next },
  },

  center: 'geofence',
};

/* ===================================================================== */
const STATE_OBSTACLE = {
  code: 'OBSTACLE_BRAKE',
  chipColor: T.amber,
  chipBorder: 'rgba(245,158,11,0.5)',

  topPill: { tone: 'amber', icon: ICON.obstacle, label: 'BRAKING' },
  tplus: '00:03:42', eta: '— · paused', etaColor: T.amber,

  link: { tone: 'green', value: '98%' },
  rtk: { tone: 'green', value: 'FIX' },
  wind: { tone: 'slate', value: '3.8 m/s' },
  cloud: { tone: 'green' },
  notices: [{ tone: 'amber', label: 'OBSTACLE · 6.4 m' }],

  alt: '78.4', spd: '0.0', vspd: '−0.0', hdg: '180', homeDist: '94',
  spdSub: 'braked · obstacle 6.4 m',

  battery: { pct: 81, health: 'ok', volts: '22.6', temp: '40', timerLabel: 'AUTO-RTH', timer: '≈ 07:12', timerColor: T.amber },
  gps: { health: 'ok', value: 'FIX', sub: '22 sat' },
  rc:  { health: 'ok', value: '−60', sub: 'dBm' },

  waypoints: wpDone,
  wpHeader: 'WP 08 path blocked',

  controls: {
    primaryLabel: 'RETRY WP 08', primaryIcon: ICON.retry, primaryFg: T.cyan, primaryBg: 'rgba(0,212,255,0.14)',
    header: 'FLIGHT CONTROL · CHOOSE ACTION',
    headerColor: T.amber,
    row1: [{ iconName: ICON.rth, label: 'RTH', tone: 'blue' }, { iconName: ICON.land, label: 'LAND', sub: 'here', tone: 'amber' }],
    row2: [{ iconName: ICON.abort, label: 'ABORT', sub: 'end mission', tone: 'red' }, { iconName: ICON.estop, label: 'E-STOP', sub: 'hold 3s', tone: 'red' }],
  },

  banner: {
    tone: 'amber', icon: ICON.obstacle,
    title: 'Obstacle detected — drone braked',
    sub: 'Vision system flagged a structure 6.4 m ahead along the WP 08 approach. Skip the waypoint, retry, or take stick control.',
    action: { label: 'SKIP · WP 09', icon: ICON.skip_next },
  },

  center: 'obstacle',
};

/* ===================================================================== */
const STATE_COMPLETE = {
  code: 'MISSION_COMPLETE',
  chipColor: T.green,
  chipBorder: 'rgba(16,185,129,0.55)',

  topPill: { tone: 'green', icon: ICON.ok, label: 'COMPLETE' },
  tplus: '00:14:36', etaLabel: 'IDLE', eta: 'awaiting', etaColor: T.green,

  link: { tone: 'green', value: '99%' },
  rtk: { tone: 'green', value: 'FIX' },
  wind: { tone: 'slate', value: '3.6 m/s' },
  cloud: { tone: 'green' },
  notices: [],

  alt: '78.4', spd: '0.0', vspd: '+0.0', hdg: '240', homeDist: '124',
  spdSub: 'station-keeping at WP 24',

  battery: { pct: 38, health: 'ok', volts: '20.6', temp: '44', timerLabel: 'AUTO-RTH', timer: '≈ 03:14', timerColor: T.amber },
  gps: { health: 'ok', value: 'FIX', sub: '23 sat' },
  rc:  { health: 'ok', value: '−59', sub: 'dBm' },

  missionCard: (
    <div style={{ padding: '18px 22px', borderBottom: `1px solid ${T.hairline2}`, background: 'rgba(16,185,129,0.08)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <MI name={ICON.ok} size={18} color={T.green} fill={1}/>
        <span style={{ fontFamily: T.ui, fontSize: 12, color: T.green, letterSpacing: '0.16em', fontWeight: 700 }}>MISSION COMPLETE</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
        <span style={{ fontFamily: 'Roboto Mono', fontSize: 44, color: T.green, fontWeight: 500, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>24</span>
        <span style={{ fontFamily: T.ui, fontSize: 20, color: T.t3 }}>/</span>
        <span style={{ fontFamily: 'Roboto Mono', fontSize: 26, color: T.t2, fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>24</span>
        <span style={{ fontFamily: T.ui, fontSize: 13, color: T.t3, marginLeft: 6 }}>waypoints captured</span>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: '#0F1420', overflow: 'hidden', position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, width: '100%', background: T.green, borderRadius: 3 }}/>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', marginTop: 12, gap: 8 }}>
        <div><div style={{ fontFamily: T.ui, fontSize: 10, color: T.t3, letterSpacing: '0.14em', fontWeight: 500 }}>PHOTOS</div><div style={{ fontFamily: 'Roboto Mono', fontVariantNumeric: 'tabular-nums', fontSize: 18, color: T.t1, fontWeight: 500, marginTop: 2 }}>24 / 24</div></div>
        <div><div style={{ fontFamily: T.ui, fontSize: 10, color: T.t3, letterSpacing: '0.14em', fontWeight: 500 }}>ELAPSED</div><div style={{ fontFamily: 'Roboto Mono', fontVariantNumeric: 'tabular-nums', fontSize: 18, color: T.t1, fontWeight: 500, marginTop: 2 }}>14:36</div></div>
        <div><div style={{ fontFamily: T.ui, fontSize: 10, color: T.t3, letterSpacing: '0.14em', fontWeight: 500 }}>UPLOAD</div><div style={{ fontFamily: 'Roboto Mono', fontVariantNumeric: 'tabular-nums', fontSize: 18, color: T.amber, fontWeight: 500, marginTop: 2 }}>3 left</div></div>
      </div>
    </div>
  ),

  waypoints: wpAllDone,
  wpHeader: 'all complete',

  controls: {
    primaryLabel: 'RTH NOW', primaryIcon: ICON.rth, primaryFg: T.blue, primaryBg: 'rgba(59,130,246,0.14)',
    header: 'AWAITING PILOT · RTH OR LAND',
    headerColor: T.green,
    row1: [{ iconName: ICON.rth, label: 'RTH', tone: 'blue' }, { iconName: ICON.land, label: 'LAND', sub: 'here', tone: 'amber' }],
    row2: [{ iconName: ICON.abort, label: 'ABORT', sub: 'end mission', tone: 'red' }, { iconName: ICON.estop, label: 'E-STOP', sub: 'hold 3s', tone: 'red' }],
  },

  banner: {
    tone: 'green', icon: ICON.ok,
    title: 'Mission complete — 24 / 24 waypoints captured',
    sub: 'Drone is station-keeping at safe altitude. 3 photos still uploading. Tap RTH to return or LAND to set down here.',
    action: { label: 'RTH · HOLD 2s', icon: ICON.rth },
  },

  center: 'complete',
};

const ALL_STATES = [
  STATE_PAUSED,
  STATE_LOW_BATTERY,
  STATE_RTH,
  STATE_CRITICAL,
  STATE_LOST_LINK,
  STATE_GPS_DEGRADED,
  STATE_GEOFENCE,
  STATE_OBSTACLE,
  STATE_COMPLETE,
];

window.STATES = {
  PAUSED: STATE_PAUSED,
  LOW_BATTERY: STATE_LOW_BATTERY,
  RTH: STATE_RTH,
  CRITICAL: STATE_CRITICAL,
  LOST_LINK: STATE_LOST_LINK,
  GPS_DEGRADED: STATE_GPS_DEGRADED,
  GEOFENCE: STATE_GEOFENCE,
  OBSTACLE: STATE_OBSTACLE,
  COMPLETE: STATE_COMPLETE,
};
window.ALL_STATES = ALL_STATES;
