/* Mira Flight — Fleet view.
   Grid of drone cards + right sidebar with today's mission queue + alerts banner.
   This is the dispatcher / chief-pilot's home base. */

const NOW_LOCAL = '15:28 · LOCAL';

const DRONES = [
  {
    id: 'M350-A', name: 'M350 RTK · A', serial: 'SN 1A2401-0042',
    bay: 'Helipad N · Bay 2',
    status: 'preflight', // preflight | flying | idle | charging | offline | returning | maintenance
    batt: 98, battTemp: 18, sigDbm: -58, link: 99, sats: 24, rtk: 'FIX',
    mission: 'MR-2026-0428 · Tank 04', operator: 'K. Marshall',
    lastSeen: 'now',
    fwVersion: '1.84.3',
    cycles: 64,
  },
  {
    id: 'M350-B', name: 'M350 RTK · B', serial: 'SN 1A2401-0049',
    bay: 'Helipad S · Bay 1',
    status: 'flying',
    batt: 46, battTemp: 38, sigDbm: -71, link: 86, sats: 22, rtk: 'FLOAT',
    mission: 'MR-2026-0426 · Pipe-12 corridor', operator: 'D. Okafor',
    flightTime: '08:42',
    distFromHome: 412,
    speed: 6.4,
    altitude: 62,
    fwVersion: '1.84.3',
    cycles: 112,
  },
  {
    id: 'M300-C', name: 'M300 RTK · C', serial: 'SN 1A2207-0188',
    bay: 'Hangar 2 · Bay 4',
    status: 'returning',
    batt: 28, battTemp: 41, sigDbm: -68, link: 91, sats: 21, rtk: 'FIX',
    mission: 'MR-2026-0421 · Substation A', operator: 'J. Reeves',
    eta: '01:14',
    distFromHome: 96,
    altitude: 90,
    fwVersion: '1.81.7',
    cycles: 284,
  },
  {
    id: 'M30T-D', name: 'M30T · D',     serial: 'SN 2A2308-1212',
    bay: 'Hangar 1 · Bay 1',
    status: 'offline',
    batt: 0, battTemp: '—', sigDbm: '—', link: 0, sats: '—', rtk: '—',
    mission: null, operator: '—',
    lastSeen: '14:22 · 1h 6m ago',
    fwVersion: '1.74.0',
    cycles: 408,
  },
  {
    id: 'M3T-E', name: 'Mavic 3T · E',   serial: 'SN 3B2311-0507',
    bay: 'Locker B',
    status: 'charging',
    batt: 64, battTemp: 26, sigDbm: '—', link: 0, sats: '—', rtk: '—',
    mission: null, operator: '—',
    lastSeen: '11:08',
    chargingFinish: '15:48',
    fwVersion: '1.21.0',
    cycles: 196,
  },
  {
    id: 'M350-F', name: 'M350 RTK · F', serial: 'SN 1A2402-0102',
    bay: 'Helipad N · Bay 4',
    status: 'idle',
    batt: 92, battTemp: 17, sigDbm: -56, link: 99, sats: 23, rtk: 'FIX',
    mission: null, operator: '—',
    lastSeen: 'now',
    fwVersion: '1.84.3',
    cycles: 22,
  },
];

const STATUS_META = {
  preflight:  { fg: T.cyan,   bg: 'rgba(0,212,255,0.14)',  label: 'PREFLIGHT',  dotFill: true,  pulse: false },
  flying:     { fg: T.green,  bg: 'rgba(16,185,129,0.14)', label: 'IN FLIGHT',  dotFill: true,  pulse: true  },
  returning:  { fg: T.blue,   bg: 'rgba(59,130,246,0.14)', label: 'RTH',        dotFill: true,  pulse: true  },
  idle:       { fg: T.t1,     bg: 'rgba(148,163,184,0.10)',label: 'IDLE',       dotFill: false, pulse: false },
  charging:   { fg: T.amber,  bg: 'rgba(245,158,11,0.14)', label: 'CHARGING',   dotFill: true,  pulse: false },
  offline:    { fg: T.red,    bg: 'rgba(239,68,68,0.14)',  label: 'OFFLINE',    dotFill: false, pulse: false },
  maintenance:{ fg: T.purple, bg: 'rgba(167,139,250,0.14)',label: 'MAINT',      dotFill: false, pulse: false },
};

const MISSIONS = [
  { id: 'MR-2026-0426', name: 'Pipe-12 corridor',     asset: 'PIPE-12',     drone: 'M350-B', operator: 'D. Okafor', state: 'in_flight', t: '14:46',  progress: 58, photos: '142 / 280', eta: '06:18' },
  { id: 'MR-2026-0428', name: 'Tank 04 inspection',   asset: 'TANK-04',     drone: 'M350-A', operator: 'K. Marshall', state: 'scheduled', t: '15:35', dur: '14:36' },
  { id: 'MR-2026-0421', name: 'Substation A perimeter', asset: 'SUB-A',    drone: 'M300-C', operator: 'J. Reeves',   state: 'in_flight', t: '14:12', progress: 91, photos: '38 / 42', eta: '01:14' },
  { id: 'MR-2026-0429', name: 'Cooling tower 02',     asset: 'COOL-T-02',   drone: 'M350-F', operator: 'K. Marshall', state: 'scheduled', t: '16:10', dur: '11:08' },
  { id: 'MR-2026-0430', name: 'Tank 07 quarterly',    asset: 'TANK-07',     drone: 'M350-A', operator: 'D. Okafor',   state: 'scheduled', t: '16:55', dur: '15:42' },
  { id: 'MR-2026-0418', name: 'Heat-Ex-03 walkaround',asset: 'HEAT-EX-03',  drone: 'M350-B', operator: 'D. Okafor',   state: 'complete',  t: '11:48', dur: '08:14', photos: '32 / 32' },
  { id: 'MR-2026-0419', name: 'Tank 05 + Tank 06',    asset: 'TANK-05',     drone: 'M300-C', operator: 'K. Marshall', state: 'complete',  t: '12:32', dur: '22:36', photos: '48 / 48' },
  { id: 'MR-2026-0420', name: 'Flare stack 01',       asset: 'FLARE-01',    drone: 'M350-F', operator: 'J. Reeves',   state: 'complete',  t: '13:14', dur: '12:08', photos: '36 / 36' },
  { id: 'MR-2026-0422', name: 'Tank 11 (south)',      asset: 'TANK-11',     drone: 'M300-C', operator: 'J. Reeves',   state: 'cancelled', t: '13:50', reason: 'wind exceeded limit' },
];

const ALERTS = [
  { tone: 'red',   icon: 'error',   text: 'M30T · D offline since 14:22 — 1h 6m no telemetry', action: 'Investigate' },
  { tone: 'amber', icon: 'battery_alert', text: '2 TB65 batteries due for 200-cycle service (Drone A · Drone C)', action: 'View batteries' },
  { tone: 'amber', icon: 'air',      text: 'Wind forecast 7 m/s gusting 9 m/s at 16:30 — review pending missions', action: 'Forecast' },
];

/* ---------------- Drone illustration (small, varies by model) ---------------- */
const MiniDrone = ({ kind = 'm350' }) => (
  <svg width="100%" height="100%" viewBox="0 0 200 140">
    <defs>
      <pattern id={`mfg-${kind}`} width="20" height="20" patternUnits="userSpaceOnUse">
        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(0,212,255,0.05)" strokeWidth="1"/>
      </pattern>
    </defs>
    <rect width="200" height="140" fill="url(#mfg-${kind})"/>
    <ellipse cx="100" cy="118" rx="48" ry="6" fill="rgba(0,0,0,0.55)"/>
    <g transform="translate(100 68)">
      <g stroke="#3a4150" strokeWidth={kind === 'mavic' ? 5 : 8} strokeLinecap="round">
        <line x1="-36" y1="-26" x2="-12" y2="-9"/>
        <line x1="36" y1="-26" x2="12" y2="-9"/>
        <line x1="-36" y1="26" x2="-12" y2="9"/>
        <line x1="36" y1="26" x2="12" y2="9"/>
      </g>
      <rect x={kind === 'mavic' ? -16 : -22} y={kind === 'mavic' ? -12 : -14} width={kind === 'mavic' ? 32 : 44} height={kind === 'mavic' ? 24 : 28} rx="7" fill="#2d3445" stroke="#525a6d" strokeWidth="1"/>
      <circle r="5" fill={T.cyan} opacity="0.85"/>
      <polygon points="0,-18 -3.5,-12 3.5,-12" fill={T.cyan}/>
      {[[-40, -28], [40, -28], [-40, 28], [40, 28]].map((p, i) => (
        <g key={i} transform={`translate(${p[0]} ${p[1]})`}>
          <circle r={kind === 'mavic' ? 8 : 12} fill="rgba(0,212,255,0.04)" stroke="rgba(0,212,255,0.20)" strokeWidth="1" strokeDasharray="2 2"/>
          <circle r="4" fill="#1a2030" stroke="#525a6d" strokeWidth="1"/>
        </g>
      ))}
    </g>
  </svg>
);

/* ---------------- Drone card ---------------- */
const DroneCard = ({ d }) => {
  const m = STATUS_META[d.status];
  const battColor = d.batt >= 30 ? T.green : d.batt >= 15 ? T.amber : T.red;
  const offline = d.status === 'offline';

  return (
    <div style={{
      background: T.panel, border: `1px solid ${offline ? 'rgba(239,68,68,0.25)' : T.hairline}`, borderRadius: 12,
      display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative',
      opacity: offline ? 0.78 : 1,
    }}>
      {/* Header */}
      <div style={{ padding: '14px 16px', borderBottom: `1px solid ${T.hairline2}`, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 38, height: 38, borderRadius: 8, background: m.bg, border: `1px solid ${m.fg}40`, display: 'grid', placeItems: 'center' }}>
          <MI name={ICON.drone} size={20} color={m.fg} fill={1}/>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontFamily: T.ui, fontSize: 16, color: T.t1, fontWeight: 600, letterSpacing: '-0.005em' }}>{d.name}</span>
            <span style={{ ...NUM, fontSize: 11, color: T.t3 }}>{d.id}</span>
          </div>
          <div style={{ fontFamily: T.ui, fontSize: 11, color: T.t2, marginTop: 1 }}>{d.serial} · FW {d.fwVersion}</div>
        </div>
        <StatusDot meta={m}/>
      </div>

      {/* Hero zone: illustration + key stat overlay */}
      <div style={{ position: 'relative', height: 180, background: 'radial-gradient(circle at center, #1a2030 0%, #0c111c 80%)', overflow: 'hidden', borderBottom: `1px solid ${T.hairline2}` }}>
        <div style={{ position: 'absolute', inset: 0 }}>
          <MiniDrone kind={d.id.startsWith('M3T') ? 'mavic' : 'm350'}/>
        </div>

        {/* Status banner (top-left of hero zone) */}
        <div style={{ position: 'absolute', top: 10, left: 10, padding: '4px 10px', borderRadius: 4, background: m.bg, border: `1px solid ${m.fg}80`, color: m.fg, fontFamily: T.mono, fontSize: 10, fontWeight: 700, letterSpacing: '0.16em' }}>
          {m.label}
        </div>

        {/* Bay / mission info top-right */}
        <div style={{ position: 'absolute', top: 10, right: 10, padding: '4px 8px', borderRadius: 4, background: 'rgba(10,14,20,0.65)', border: `1px solid ${T.hairline}`, color: T.t2, fontFamily: T.ui, fontSize: 10, fontWeight: 500, letterSpacing: '0.08em' }}>
          {d.bay}
        </div>

        {/* In-flight bottom strip — altitude / dist / speed */}
        {d.status === 'flying' && (
          <div style={{ position: 'absolute', left: 10, right: 10, bottom: 10, padding: '6px 10px', borderRadius: 6, background: 'rgba(10,14,20,0.78)', border: `1px solid ${T.hairline}`, display: 'flex', justifyContent: 'space-between', backdropFilter: 'blur(6px)' }}>
            <Stat4 label="ALT"  value={`${d.altitude} m`} color={T.t1}/>
            <Stat4 label="SPD"  value={`${d.speed} m/s`}/>
            <Stat4 label="DIST" value={`${d.distFromHome} m`}/>
            <Stat4 label="T+"   value={d.flightTime} color={T.green}/>
          </div>
        )}
        {d.status === 'returning' && (
          <div style={{ position: 'absolute', left: 10, right: 10, bottom: 10, padding: '6px 10px', borderRadius: 6, background: 'rgba(59,130,246,0.10)', border: `1px solid ${T.blue}`, display: 'flex', justifyContent: 'space-between', backdropFilter: 'blur(6px)' }}>
            <Stat4 label="ALT"  value={`${d.altitude} m`}/>
            <Stat4 label="DIST" value={`${d.distFromHome} m`} color={T.blue}/>
            <Stat4 label="ETA"  value={d.eta} color={T.blue}/>
          </div>
        )}
        {d.status === 'charging' && (
          <div style={{ position: 'absolute', left: 10, right: 10, bottom: 10, padding: '6px 10px', borderRadius: 6, background: 'rgba(245,158,11,0.10)', border: `1px solid ${T.amber}`, display: 'flex', justifyContent: 'space-between', backdropFilter: 'blur(6px)' }}>
            <Stat4 label="CHARGE" value={`${d.batt}%`} color={T.amber}/>
            <Stat4 label="DONE"   value={d.chargingFinish} color={T.amber}/>
            <Stat4 label="TEMP"   value={`${d.battTemp}°C`}/>
          </div>
        )}
        {d.status === 'offline' && (
          <div style={{ position: 'absolute', left: 10, right: 10, bottom: 10, padding: '6px 10px', borderRadius: 6, background: 'rgba(239,68,68,0.10)', border: `1px solid ${T.red}`, display: 'flex', alignItems: 'center', gap: 8, backdropFilter: 'blur(6px)' }}>
            <MI name="signal_disconnected" size={16} color={T.red}/>
            <span style={{ fontFamily: T.mono, fontSize: 11, color: T.red, fontWeight: 600, letterSpacing: '0.10em' }}>NO TELEMETRY · {d.lastSeen}</span>
          </div>
        )}
      </div>

      {/* Stats footer */}
      <div style={{ padding: '12px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, borderBottom: `1px solid ${T.hairline2}` }}>
        <CardStat icon={ICON.battery_low} label="BATT" value={offline ? '—' : `${d.batt}%`} color={offline ? T.t3 : battColor}/>
        <CardStat icon={ICON.signal}      label="LINK" value={offline ? '—' : `${d.link}%`} color={offline ? T.t3 : T.t1}/>
        <CardStat icon={ICON.satellite}   label="GPS"  value={offline ? '—' : `${d.sats}`} color={offline ? T.t3 : T.t1}/>
        <CardStat icon={ICON.rtk}         label="RTK"  value={offline ? '—' : d.rtk} color={offline ? T.t3 : (d.rtk === 'FIX' ? T.green : d.rtk === 'FLOAT' ? T.amber : T.t1)}/>
      </div>

      {/* Mission strip */}
      <div style={{ padding: '12px 16px', borderBottom: `1px solid ${T.hairline2}`, display: 'flex', alignItems: 'center', gap: 10, minHeight: 56 }}>
        {d.mission ? (
          <>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(0,212,255,0.10)', border: `1px solid rgba(0,212,255,0.30)`, display: 'grid', placeItems: 'center' }}>
              <MI name="route" size={16} color={T.cyan}/>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: T.ui, fontSize: 12, color: T.t1, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.mission}</div>
              <div style={{ fontFamily: T.ui, fontSize: 11, color: T.t2, marginTop: 1 }}>{d.operator}</div>
            </div>
            {d.status === 'flying' && (
              <span style={{ ...NUM, fontSize: 12, color: T.green, fontWeight: 600 }}>{d.flightTime}</span>
            )}
            {d.status === 'returning' && (
              <span style={{ ...NUM, fontSize: 12, color: T.blue, fontWeight: 600 }}>ETA {d.eta}</span>
            )}
          </>
        ) : (
          <span style={{ fontFamily: T.ui, fontSize: 12, color: T.t3, fontStyle: 'italic' }}>No mission assigned</span>
        )}
      </div>

      {/* Actions */}
      <div style={{ padding: '12px 16px', background: T.panelHi, display: 'flex', gap: 8 }}>
        {d.status === 'idle' && (
          <button style={dronePrimaryBtn}>
            <MI name="flight_takeoff" size={16} color="#0A0E14" fill={1}/> Plan flight
          </button>
        )}
        {d.status === 'preflight' && (
          <button style={dronePrimaryBtn}>
            <MI name="flight_takeoff" size={16} color="#0A0E14" fill={1}/> Open preflight
          </button>
        )}
        {(d.status === 'flying' || d.status === 'returning') && (
          <button style={{ ...dronePrimaryBtn, background: T.cyan, color: '#0A0E14' }}>
            <MI name="open_in_full" size={16} color="#0A0E14"/> Open HUD
          </button>
        )}
        {d.status === 'charging' && (
          <button style={dronePrimaryBtn}>
            <MI name={ICON.battery} size={16} color="#0A0E14" fill={1}/> Battery detail
          </button>
        )}
        {d.status === 'offline' && (
          <button style={{ ...dronePrimaryBtn, background: T.red, color: '#0A0E14' }}>
            <MI name="error" size={16} color="#0A0E14" fill={1}/> Investigate
          </button>
        )}
        <button style={droneSecondaryBtn} title="History">
          <MI name="history" size={16} color={T.t2}/>
        </button>
        <button style={droneSecondaryBtn} title="Settings">
          <MI name="settings" size={16} color={T.t2}/>
        </button>
        <button style={droneSecondaryBtn} title="More">
          <MI name="more_horiz" size={16} color={T.t2}/>
        </button>
      </div>
    </div>
  );
};

const dronePrimaryBtn = {
  flex: 1, height: 38, borderRadius: 8, background: T.cyan, border: 'none', color: '#0A0E14',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  fontFamily: T.ui, fontSize: 13, fontWeight: 700, letterSpacing: '0.04em', cursor: 'pointer',
};
const droneSecondaryBtn = {
  width: 38, height: 38, borderRadius: 8, background: T.card, border: `1px solid ${T.hairline}`,
  display: 'grid', placeItems: 'center', cursor: 'pointer',
};

const StatusDot = ({ meta }) => (
  <div style={{ width: 12, height: 12, borderRadius: 999, background: meta.dotFill ? meta.fg : 'transparent', border: `2px solid ${meta.fg}`, boxShadow: meta.pulse ? `0 0 0 3px ${meta.fg}30` : 'none' }}/>
);

const CardStat = ({ icon, label, value, color }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
    <MI name={icon} size={14} color={color || T.t2}/>
    <div>
      <div style={{ fontFamily: T.ui, fontSize: 9, color: T.t3, letterSpacing: '0.16em', fontWeight: 500 }}>{label}</div>
      <div style={{ ...NUM, fontSize: 13, color: color || T.t1, fontWeight: 500, marginTop: 1 }}>{value}</div>
    </div>
  </div>
);

const Stat4 = ({ label, value, color }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
    <span style={{ fontFamily: T.ui, fontSize: 9, color: T.t3, letterSpacing: '0.14em', fontWeight: 500 }}>{label}</span>
    <span style={{ ...NUM, fontSize: 12, color: color || T.t1, fontWeight: 600 }}>{value}</span>
  </div>
);

/* ---------------- Mission queue (right sidebar) ---------------- */
const MissionRow = ({ m }) => {
  const colors = {
    in_flight: { bg: 'rgba(16,185,129,0.06)', bd: T.green,  label: 'IN FLIGHT', icon: 'flight' },
    scheduled: { bg: 'transparent',            bd: T.hairline, label: 'SCHEDULED', icon: 'schedule' },
    complete:  { bg: 'transparent',            bd: T.hairline, label: 'COMPLETE',  icon: 'check_circle' },
    cancelled: { bg: 'rgba(239,68,68,0.04)',  bd: 'rgba(239,68,68,0.3)', label: 'CANCELLED', icon: 'cancel' },
  }[m.state];
  const fg = m.state === 'in_flight' ? T.green : m.state === 'complete' ? T.green : m.state === 'cancelled' ? T.red : T.t2;
  return (
    <div style={{ padding: '11px 14px', borderBottom: `1px solid ${T.hairline2}`, borderLeft: m.state === 'in_flight' ? `3px solid ${T.green}` : '3px solid transparent', background: colors.bg }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <span style={{ ...NUM, fontSize: 11, color: T.t3, fontWeight: 500 }}>{m.t}</span>
        <span style={{ fontFamily: T.ui, fontSize: 14, color: T.t1, fontWeight: 600, flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.name}</span>
        <span style={{ fontFamily: T.mono, fontSize: 9, color: fg, fontWeight: 700, letterSpacing: '0.14em' }}>{colors.label}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6, fontFamily: T.ui, fontSize: 11, color: T.t2 }}>
        <span>{m.asset}</span>
        <span style={{ color: T.t3 }}>·</span>
        <span>{m.drone}</span>
        <span style={{ color: T.t3 }}>·</span>
        <span>{m.operator}</span>
        <span style={{ marginLeft: 'auto', ...NUM, color: T.t2 }}>
          {m.state === 'in_flight' ? `${m.progress}% · ETA ${m.eta}` :
           m.state === 'scheduled' ? m.dur :
           m.state === 'complete'  ? m.dur :
           /* cancelled */            m.reason}
        </span>
      </div>
      {m.state === 'in_flight' && (
        <div style={{ height: 3, borderRadius: 2, background: '#0F1420', marginTop: 8, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${m.progress}%`, background: T.green }}/>
        </div>
      )}
    </div>
  );
};

const MissionQueue = () => {
  const grouped = {
    in_flight: MISSIONS.filter(m => m.state === 'in_flight'),
    scheduled: MISSIONS.filter(m => m.state === 'scheduled'),
    complete:  MISSIONS.filter(m => m.state === 'complete'),
    cancelled: MISSIONS.filter(m => m.state === 'cancelled'),
  };
  const Block = ({ title, items, accent }) => items.length === 0 ? null : (
    <div>
      <div style={{ padding: '10px 14px 4px', background: T.panelHi, borderTop: `1px solid ${T.hairline2}`, display: 'flex', alignItems: 'baseline' }}>
        <span style={{ fontFamily: T.ui, fontSize: 11, color: accent || T.t2, letterSpacing: '0.18em', fontWeight: 700 }}>{title}</span>
        <span style={{ marginLeft: 'auto', ...NUM, fontSize: 11, color: T.t3 }}>{items.length}</span>
      </div>
      {items.map(m => <MissionRow key={m.id} m={m}/>)}
    </div>
  );
  return (
    <div style={{ width: 520, background: T.panel, borderLeft: `1px solid ${T.hairline}`, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '14px 18px', borderBottom: `1px solid ${T.hairline}` }}>
        <div style={{ display: 'flex', alignItems: 'baseline' }}>
          <span style={{ fontFamily: T.ui, fontSize: 11, color: T.t3, letterSpacing: '0.18em', fontWeight: 600 }}>TODAY · TUE 28 APR</span>
          <span style={{ marginLeft: 'auto', ...NUM, fontSize: 11, color: T.cyan, fontWeight: 600 }}>+ NEW MISSION</span>
        </div>
        <div style={{ fontFamily: T.ui, fontSize: 22, color: T.t1, fontWeight: 600, letterSpacing: '-0.01em', marginTop: 4 }}>9 missions scheduled · 2 in flight</div>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <Stat4Pill label="ELAPSED"  value="5h 12m" fg={T.t1}/>
          <Stat4Pill label="PHOTOS"   value="218"    fg={T.cyan}/>
          <Stat4Pill label="DATA"     value="2.4 GB" fg={T.t1}/>
          <Stat4Pill label="QA QUEUE" value="4"      fg={T.amber}/>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        <Block title="IN FLIGHT NOW"    items={grouped.in_flight} accent={T.green}/>
        <Block title="SCHEDULED NEXT"   items={grouped.scheduled} accent={T.cyan}/>
        <Block title="COMPLETE TODAY"   items={grouped.complete}/>
        <Block title="CANCELLED"        items={grouped.cancelled} accent={T.red}/>
      </div>

      <div style={{ padding: '12px 18px', background: T.panelHi, borderTop: `1px solid ${T.hairline}`, display: 'flex', alignItems: 'center', gap: 10 }}>
        <MI name="calendar_today" size={16} color={T.t2}/>
        <span style={{ fontFamily: T.ui, fontSize: 12, color: T.t2 }}>Tomorrow: <span style={{ color: T.t1, fontWeight: 600 }}>6 missions scheduled</span></span>
        <button style={{ marginLeft: 'auto', padding: '6px 10px', borderRadius: 6, background: 'transparent', border: `1px solid ${T.hairline}`, color: T.cyan, fontFamily: T.ui, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Open calendar</button>
      </div>
    </div>
  );
};

const Stat4Pill = ({ label, value, fg }) => (
  <div style={{ flex: 1, padding: '8px 10px', borderRadius: 6, background: T.card, border: `1px solid ${T.hairline}` }}>
    <div style={{ fontFamily: T.ui, fontSize: 9, color: T.t3, letterSpacing: '0.16em', fontWeight: 500 }}>{label}</div>
    <div style={{ ...NUM, fontSize: 16, color: fg || T.t1, fontWeight: 500, marginTop: 2 }}>{value}</div>
  </div>
);

/* ---------------- Alerts banner ---------------- */
const AlertsBanner = () => (
  <div style={{ padding: '14px 24px', background: T.panel, borderBottom: `1px solid ${T.hairline}`, display: 'flex', alignItems: 'center', gap: 14, overflow: 'hidden' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 12px', borderRadius: 6, background: 'rgba(239,68,68,0.12)', border: `1px solid ${T.red}` }}>
      <MI name="emergency" size={18} color={T.red} fill={1}/>
      <span style={{ fontFamily: T.mono, fontSize: 11, color: T.red, fontWeight: 700, letterSpacing: '0.14em' }}>3 ACTIVE ALERTS</span>
    </div>
    <div style={{ flex: 1, display: 'flex', gap: 10, overflow: 'hidden' }}>
      {ALERTS.map((a, i) => (
        <div key={i} style={{
          flex: 1, padding: '8px 12px', borderRadius: 6,
          background: a.tone === 'red' ? 'rgba(239,68,68,0.06)' : 'rgba(245,158,11,0.06)',
          border: `1px solid ${a.tone === 'red' ? 'rgba(239,68,68,0.30)' : 'rgba(245,158,11,0.30)'}`,
          display: 'flex', alignItems: 'center', gap: 10, minWidth: 0,
        }}>
          <MI name={a.icon} size={18} color={a.tone === 'red' ? T.red : T.amber} fill={1}/>
          <span style={{ fontFamily: T.ui, fontSize: 12, color: T.t1, flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.text}</span>
          <button style={{ padding: '3px 8px', borderRadius: 4, background: 'transparent', border: `1px solid ${a.tone === 'red' ? T.red : T.amber}`, color: a.tone === 'red' ? T.red : T.amber, fontFamily: T.ui, fontSize: 11, fontWeight: 600, cursor: 'pointer', flexShrink: 0, letterSpacing: '0.04em' }}>{a.action}</button>
        </div>
      ))}
    </div>
    <button style={{ width: 36, height: 36, borderRadius: 6, background: T.card, border: `1px solid ${T.hairline}`, display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
      <MI name="close" size={18} color={T.t3}/>
    </button>
  </div>
);

/* ---------------- Top strip ---------------- */
const FleetTopStrip = () => (
  <div style={{ height: 80, display: 'flex', alignItems: 'stretch', background: T.panel, borderBottom: `1px solid ${T.hairline}` }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '0 24px', borderRight: `1px solid ${T.hairline}` }}>
      <div style={{ width: 40, height: 40, borderRadius: 8, background: 'linear-gradient(135deg, #00D4FF 0%, #0099BD 100%)', display: 'grid', placeItems: 'center' }}>
        <MI name={ICON.drone} size={22} color="#0A0E14" weight={700} fill={1}/>
      </div>
      <div>
        <div style={{ fontFamily: T.ui, fontSize: 11, color: T.t3, letterSpacing: '0.18em', fontWeight: 500 }}>MIRA FLIGHT</div>
        <div style={{ fontFamily: T.ui, fontSize: 17, color: T.t1, fontWeight: 500, marginTop: 1 }}>Fleet · Refinery North + South</div>
      </div>
    </div>

    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12, padding: '0 24px' }}>
      <NavTab label="Fleet" icon={ICON.drone} active/>
      <NavTab label="Missions" icon="route"/>
      <NavTab label="Assets" icon="domain"/>
      <NavTab label="Calendar" icon="event"/>
      <NavTab label="Reports" icon="description"/>

      <div style={{ marginLeft: 'auto', height: 40, padding: '0 12px', borderRadius: 8, background: T.card, border: `1px solid ${T.hairline}`, display: 'flex', alignItems: 'center', gap: 10, width: 320 }}>
        <MI name="search" size={18} color={T.t3}/>
        <span style={{ fontFamily: T.ui, fontSize: 13, color: T.t2, flex: 1 }}>Search drones, missions, assets…</span>
        <span style={{ padding: '2px 6px', borderRadius: 4, background: T.cardHi, color: T.t3, fontFamily: T.mono, fontSize: 10 }}>⌘K</span>
      </div>
    </div>

    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '0 22px', borderLeft: `1px solid ${T.hairline}` }}>
      <span style={{ fontFamily: T.mono, fontSize: 11, color: T.t3, letterSpacing: '0.14em' }}>{NOW_LOCAL}</span>
      <button style={{ width: 40, height: 40, borderRadius: 8, background: T.card, border: `1px solid ${T.hairline}`, display: 'grid', placeItems: 'center', position: 'relative' }}>
        <MI name="notifications" size={20} color={T.t2}/>
        <span style={{ position: 'absolute', top: 4, right: 4, width: 8, height: 8, borderRadius: 999, background: T.red, border: '1.5px solid #131822' }}/>
      </button>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontFamily: T.ui, fontSize: 11, color: T.t3, letterSpacing: '0.18em', fontWeight: 500 }}>DISPATCHER</div>
        <div style={{ fontFamily: T.ui, fontSize: 14, color: T.t1, fontWeight: 500 }}>K. Marshall</div>
      </div>
      <div style={{ width: 40, height: 40, borderRadius: 999, background: T.card, border: `1px solid ${T.hairline}`, display: 'grid', placeItems: 'center', fontFamily: T.ui, fontWeight: 500, color: T.t1, fontSize: 14 }}>KM</div>
    </div>
  </div>
);

const NavTab = ({ label, icon, active }) => (
  <div style={{
    padding: '10px 14px', borderRadius: 8,
    background: active ? 'rgba(0,212,255,0.10)' : 'transparent',
    border: `1px solid ${active ? T.cyan : 'transparent'}`,
    display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
    color: active ? T.cyan : T.t2, fontFamily: T.ui, fontSize: 13, fontWeight: 600, letterSpacing: '0.02em',
  }}>
    <MI name={icon} size={18} color={active ? T.cyan : T.t2}/>
    {label}
  </div>
);

/* ---------------- The screen ---------------- */
const FleetScreen = () => {
  const counts = DRONES.reduce((a, d) => { a[d.status] = (a[d.status] || 0) + 1; return a; }, {});
  return (
    <div style={{ width: 2304, height: 1440, background: T.bg, color: T.t1, fontFamily: T.ui, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <FleetTopStrip/>
      <AlertsBanner/>
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {/* Left/Center: KPI strip + grid of drone cards */}
        <div style={{ flex: 1, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16, overflow: 'hidden' }}>
          {/* Header band */}
          <div style={{ display: 'flex', alignItems: 'baseline' }}>
            <div>
              <div style={{ fontFamily: T.ui, fontSize: 11, color: T.cyan, letterSpacing: '0.22em', fontWeight: 600 }}>FLEET STATUS</div>
              <div style={{ fontFamily: T.ui, fontSize: 30, color: T.t1, fontWeight: 600, letterSpacing: '-0.02em', marginTop: 4 }}>{DRONES.length} drones · {counts.flying || 0} airborne · {counts.idle || 0} ready</div>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              <FleetFilter label="All"      count={DRONES.length} active/>
              <FleetFilter label="In flight" count={counts.flying || 0} tone="green"/>
              <FleetFilter label="Ready"    count={counts.idle || 0}/>
              <FleetFilter label="Charging" count={counts.charging || 0} tone="amber"/>
              <FleetFilter label="Offline"  count={counts.offline || 0} tone="red"/>
              <div style={{ width: 1, background: T.hairline, margin: '0 2px' }}/>
              <button style={{ height: 36, padding: '0 12px', borderRadius: 6, background: T.card, border: `1px solid ${T.hairline}`, display: 'inline-flex', alignItems: 'center', gap: 6, color: T.t1, fontFamily: T.ui, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
                <MI name="view_module" size={16} color={T.cyan}/> Grid
              </button>
              <button style={{ height: 36, padding: '0 12px', borderRadius: 6, background: 'transparent', border: `1px solid ${T.hairline}`, display: 'inline-flex', alignItems: 'center', gap: 6, color: T.t2, fontFamily: T.ui, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
                <MI name="map" size={16} color={T.t2}/> Map
              </button>
            </div>
          </div>

          {/* Grid */}
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 16, minHeight: 0 }}>
            {DRONES.map(d => <DroneCard key={d.id} d={d}/>)}
          </div>
        </div>
        <MissionQueue/>
      </div>
    </div>
  );
};

const FleetFilter = ({ label, count, active, tone }) => {
  const fg = tone === 'red' ? T.red : tone === 'amber' ? T.amber : tone === 'green' ? T.green : (active ? T.cyan : T.t2);
  return (
    <div style={{
      height: 36, padding: '0 14px', borderRadius: 6,
      background: active ? 'rgba(0,212,255,0.10)' : T.card,
      border: `1px solid ${active ? T.cyan : T.hairline}`,
      display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer',
      fontFamily: T.ui, fontSize: 13, fontWeight: 600, color: fg, letterSpacing: '0.04em',
    }}>
      {label}
      <span style={{ ...NUM, fontSize: 12, color: T.t3, fontWeight: 600 }}>{count}</span>
    </div>
  );
};

window.FleetScreen = FleetScreen;
