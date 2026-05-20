/* Mira Flight tokens — Roboto + Roboto Mono + Material Symbols */

const T = {
  bg: '#0A0E14',
  panel: '#131822',
  panelHi: '#1A2030',
  card: '#1E2530',
  cardHi: '#252D3B',
  hairline: '#262E3D',
  hairline2: '#1d2433',
  cyan: '#00D4FF',
  cyanDim: '#0099BD',
  green: '#10B981',
  amber: '#F59E0B',
  red: '#EF4444',
  blue: '#3B82F6',
  purple: '#A78BFA',
  t1: '#F8FAFC',
  t2: '#94A3B8',
  t3: '#475569',
  ui: '"Roboto", system-ui, sans-serif',
  mono: '"Roboto Mono", ui-monospace, monospace',
};

const NUM = {
  fontFamily: T.mono,
  fontVariantNumeric: 'tabular-nums',
  fontFeatureSettings: '"tnum" 1',
  letterSpacing: '-0.01em',
};

/* ---------------- Material Symbols Outlined icon component ----------------
   Uses the Google Fonts variable font (loaded from HTML). The full icon set
   ships with the font; we just render <span class="material-symbols-outlined">name</span>.
   Source: https://fonts.google.com/icons (browse names, download individual SVGs)
*/
const MI = ({ name, size = 24, color, fill = 0, weight = 400, grade = 0, style }) => (
  <span className="ms" style={{
    fontFamily: '"Material Symbols Outlined"',
    fontWeight: 'normal',
    fontStyle: 'normal',
    fontSize: size,
    lineHeight: 1,
    color: color || 'inherit',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: size,
    height: size,
    flexShrink: 0,
    overflow: 'hidden',
    fontVariationSettings: `'FILL' ${fill}, 'wght' ${weight}, 'GRAD' ${grade}, 'opsz' 24`,
    WebkitFontFeatureSettings: '"liga"',
    fontFeatureSettings: '"liga"',
    userSelect: 'none',
    ...style,
  }}>{name}</span>
);

/* Material Symbol NAME map — single source of truth for the design + dev */
const ICON = {
  // identity / chrome
  drone:       'flight',           // alt: 'drone' exists in MS as well
  drone_alt:   'drone',
  operator:    'person',
  menu:        'more_horiz',
  back:        'arrow_back',
  close:       'close',
  swap:        'swap_horiz',
  layers:      'layers',
  expand:      'expand_more',
  collapse:    'expand_less',
  // telemetry
  altitude:    'height',
  speed:       'speed',
  vspeed:      'swap_vert',
  heading:     'navigation',
  gimbal:      'videocam',
  home:        'home',
  battery:     'battery_full',
  battery_low: 'battery_alert',
  signal:      'signal_cellular_alt',
  satellite:   'satellite_alt',
  rtk:         'gps_fixed',
  wind:        'air',
  temp:        'thermostat',
  // mission
  waypoint:    'location_on',
  mission:     'route',
  photo:       'photo_camera',
  video:       'videocam',
  ir:          'thermostat_auto',
  laser:       'straighten',
  // controls
  play:        'play_arrow',
  pause:       'pause',
  stop:        'stop',
  skip_next:   'skip_next',
  skip_prev:   'skip_previous',
  retry:       'refresh',
  zoom_in:     'zoom_in',
  zoom_out:    'zoom_out',
  // emergency / flight control
  rth:         'home_pin',
  land:        'flight_land',
  takeoff:     'flight_takeoff',
  abort:       'cancel',
  estop:       'power_settings_new',
  emergency:   'emergency',
  override:    'pan_tool',
  // status
  ok:          'check_circle',
  warn:        'warning',
  err:         'error',
  info:        'info',
  // map
  target:      'gps_not_fixed',
  reticle:     'center_focus_strong',
  geofence:    'fence',
  no_fly:      'block',
  airspace:    'airplanemode_active',
  ads_b:       'sensors',
  obstacle:    'shield',
  ruler:       'square_foot',
  // upload / cloud
  cloud:       'cloud',
  upload:      'cloud_upload',
  sync:        'sync',
};

/* ---------------- Health threshold logic ----------------
   Each telemetry field has its own thresholds. Returns 'ok' | 'warn' | 'crit'.
   These match what the engine should use to drive auto-failsafes.
*/
const health = {
  battery: (pct) => (pct >= 30 ? 'ok' : pct >= 20 ? 'warn' : 'crit'),
  signal:  (dbm) => (dbm >= -70 ? 'ok' : dbm >= -85 ? 'warn' : 'crit'),
  sats:    (n)   => (n >= 12 ? 'ok' : n >= 8 ? 'warn' : 'crit'),
  rtk:     (s)   => (s === 'FIX' ? 'ok' : s === 'FLOAT' ? 'warn' : 'crit'),
  wind:    (ms)  => (ms <= 8 ? 'ok' : ms <= 12 ? 'warn' : 'crit'),
  vspeed:  (v)   => (Math.abs(v) <= 3 ? 'ok' : Math.abs(v) <= 5 ? 'warn' : 'crit'),
  altitude:(m)   => (m >= 5 && m <= 120 ? 'ok' : m < 5 ? 'warn' : 'crit'),  // FAA 400ft ≈ 120m
};

const toneColor = (h) => h === 'crit' ? T.red : h === 'warn' ? T.amber : T.green;
const toneBg = (h, a = 0.10) => {
  if (h === 'crit') return `rgba(239,68,68,${a})`;
  if (h === 'warn') return `rgba(245,158,11,${a})`;
  return `rgba(16,185,129,${a})`;
};

/* ---------------- Primitives ---------------- */

const StatusPill = ({ tone = 'green', icon, label, value, size = 'md' }) => {
  const toneMap = {
    green: { bg: 'rgba(16,185,129,0.12)', bd: 'rgba(16,185,129,0.4)', fg: T.green },
    amber: { bg: 'rgba(245,158,11,0.12)', bd: 'rgba(245,158,11,0.4)', fg: T.amber },
    red:   { bg: 'rgba(239,68,68,0.14)',  bd: 'rgba(239,68,68,0.5)',  fg: T.red   },
    blue:  { bg: 'rgba(59,130,246,0.12)', bd: 'rgba(59,130,246,0.4)', fg: T.blue  },
    cyan:  { bg: 'rgba(0,212,255,0.10)',  bd: 'rgba(0,212,255,0.4)',  fg: T.cyan  },
    slate: { bg: 'rgba(148,163,184,0.08)',bd: 'rgba(148,163,184,0.2)',fg: T.t2    },
  }[tone];
  const pad = size === 'sm' ? '6px 10px' : '8px 14px';
  const fs = size === 'sm' ? 13 : 15;
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 8,
      padding: pad, borderRadius: 999,
      background: toneMap.bg, border: `1px solid ${toneMap.bd}`,
      color: toneMap.fg, fontFamily: T.ui, fontSize: fs, fontWeight: 500,
      letterSpacing: '0.02em',
    }}>
      {icon}
      {label && <span style={{ color: toneMap.fg }}>{label}</span>}
      {value && <span style={{ ...NUM, color: toneMap.fg, fontWeight: 600 }}>{value}</span>}
    </div>
  );
};

/* Telemetry tape row — accepts health prop, applies icon + value color */
const TelemTape = ({ iconName, label, value, unit, sub, health = 'ok', big = false }) => {
  const c = toneColor(health);
  const valColor = health === 'ok' ? T.t1 : c;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 16,
      padding: big ? '20px 22px' : '14px 22px',
      borderBottom: `1px solid ${T.hairline2}`,
      minHeight: 56,
      background: health === 'crit' ? 'rgba(239,68,68,0.06)' : 'transparent',
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 8,
        background: toneBg(health, 0.10),
        border: `1px solid ${toneBg(health, 0.25)}`,
        display: 'grid', placeItems: 'center',
        color: c, flexShrink: 0,
      }}>
        <MI name={iconName} size={big ? 24 : 22} color={c} weight={500}/>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
        <div style={{ fontFamily: T.ui, fontSize: 12, fontWeight: 500, color: T.t3, letterSpacing: '0.12em', textTransform: 'uppercase' }}>{label}</div>
        {sub && <div style={{ fontFamily: T.ui, fontSize: 12, color: T.t2 }}>{sub}</div>}
      </div>
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{ ...NUM, fontSize: big ? 48 : 32, fontWeight: 500, color: valColor, lineHeight: 1 }}>{value}</span>
        {unit && <span style={{ fontFamily: T.ui, fontSize: 14, fontWeight: 500, color: T.t2 }}>{unit}</span>}
      </div>
    </div>
  );
};

const Section = ({ title, right, children, style }) => (
  <div style={{ display: 'flex', flexDirection: 'column', ...style }}>
    {title && (
      <div style={{ display: 'flex', alignItems: 'center', padding: '14px 22px 8px', gap: 12 }}>
        <div style={{ fontFamily: T.ui, fontSize: 11, fontWeight: 500, color: T.t3, letterSpacing: '0.16em', textTransform: 'uppercase' }}>{title}</div>
        {right}
      </div>
    )}
    {children}
  </div>
);

Object.assign(window, { T, NUM, MI, ICON, health, toneColor, toneBg, StatusPill, TelemTape, Section });
