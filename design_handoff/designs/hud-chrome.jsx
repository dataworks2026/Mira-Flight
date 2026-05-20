/* HUD chrome — top strip, left telemetry rail, right mission panel + emergency cluster */

/* ---------------- TOP STRIP ---------------- */
const TopStrip = () => (
  <div style={{
    height: 80, display: 'flex', alignItems: 'stretch',
    background: T.panel, borderBottom: `1px solid ${T.hairline}`,
  }}>
    <div style={{ width: 360, display: 'flex', alignItems: 'center', gap: 14, padding: '0 24px', borderRight: `1px solid ${T.hairline}` }}>
      <div style={{ width: 40, height: 40, borderRadius: 8, background: 'linear-gradient(135deg, #00D4FF 0%, #0099BD 100%)', display: 'grid', placeItems: 'center', color: '#0A0E14' }}>
        <MI name={ICON.drone} size={22} color="#0A0E14" weight={700} fill={1}/>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{ fontFamily: T.ui, fontSize: 11, color: T.t3, letterSpacing: '0.18em', fontWeight: 500 }}>MISSION</div>
        <div style={{ fontFamily: T.ui, fontSize: 17, color: T.t1, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Refinery North · Tank 04</div>
      </div>
    </div>

    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 14, padding: '0 24px' }}>
      <StatusPill tone="green" icon={<MI name={ICON.drone} size={16} color={T.green} fill={1}/>} label="FLYING" />
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{ fontFamily: T.ui, fontSize: 11, color: T.t3, letterSpacing: '0.18em', fontWeight: 500 }}>T+</span>
        <span style={{ ...NUM, fontSize: 24, color: T.t1, fontWeight: 500 }}>00:04:21</span>
      </div>
      <div style={{ width: 1, height: 28, background: T.hairline, margin: '0 2px' }}/>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{ fontFamily: T.ui, fontSize: 11, color: T.t3, letterSpacing: '0.18em', fontWeight: 500 }}>ETA</span>
        <span style={{ ...NUM, fontSize: 18, color: T.t2, fontWeight: 500 }}>03:27</span>
      </div>
      <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
        <StatusPill tone="green" icon={<MI name={ICON.signal} size={14} color={T.green}/>} label="LINK" value="98%"/>
        <StatusPill tone="green" icon={<MI name={ICON.rtk} size={14} color={T.green} fill={1}/>} label="RTK" value="FIX"/>
        <StatusPill tone="slate" icon={<MI name={ICON.wind} size={14} color={T.t2}/>} label="WIND" value="4.2 m/s"/>
        <StatusPill tone="green" icon={<MI name={ICON.cloud} size={14} color={T.green}/>} label="CLOUD"/>
        <StatusPill tone="amber" icon={<MI name={ICON.warn} size={14} color={T.amber} fill={1}/>} label="1 NOTICE" />
      </div>
    </div>

    <div style={{ width: 220, display: 'flex', alignItems: 'center', gap: 12, padding: '0 20px', borderLeft: `1px solid ${T.hairline}`, justifyContent: 'flex-end' }}>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontFamily: T.ui, fontSize: 11, color: T.t3, letterSpacing: '0.18em', fontWeight: 500 }}>OPERATOR</div>
        <div style={{ fontFamily: T.ui, fontSize: 14, color: T.t1, fontWeight: 500 }}>K. Marshall</div>
      </div>
      <div style={{ width: 40, height: 40, borderRadius: 999, background: T.card, border: `1px solid ${T.hairline}`, display: 'grid', placeItems: 'center', fontFamily: T.ui, fontWeight: 500, color: T.t1, fontSize: 14 }}>KM</div>
      <button style={iconBtn}>
        <MI name={ICON.menu} size={20} color={T.t2}/>
      </button>
    </div>
  </div>
);

const iconBtn = {
  width: 44, height: 44, borderRadius: 8,
  background: 'transparent', border: `1px solid ${T.hairline}`,
  color: T.t2, display: 'grid', placeItems: 'center', cursor: 'pointer',
};

/* ---------------- LEFT TELEMETRY RAIL — 9 fields always visible ---------------- */
const TelemRail = () => (
  <div style={{ width: 360, background: T.panel, borderRight: `1px solid ${T.hairline}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
    <Section title="Flight Telemetry" right={<span style={{ marginLeft: 'auto', ...NUM, fontSize: 11, color: T.t3 }}>1 Hz · MAVLink</span>}>
      <TelemTape big iconName={ICON.altitude} label="Altitude AGL" sub="MSL 124 m · ceiling 120 m" value="78.4" unit="m" health="ok"/>
      <TelemTape big iconName={ICON.speed} label="Ground Speed" sub="commanded 5.0 m/s" value="4.8" unit="m/s" health="ok"/>
      <TelemTape iconName={ICON.vspeed} label="Vertical" sub="climb/descend" value="+0.2" unit="m/s" health="ok"/>
      <TelemTape iconName={ICON.heading} label="Heading" sub="course 247° true" value="247" unit="°" health="ok"/>
      <TelemTape iconName={ICON.gimbal} label="Gimbal" sub="pitch · yaw +12°" value="−45.0" unit="°" health="ok"/>
      <TelemTape iconName={ICON.home} label="Home Dist." sub="bearing 142°" value="124" unit="m" health="ok"/>
    </Section>

    {/* Battery — kill-clock with thresholds visible on the bar */}
    <div style={{ borderTop: `1px solid ${T.hairline}`, background: T.panelHi, padding: '18px 22px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <MI name={ICON.battery} size={20} color={T.green} fill={1}/>
        <span style={{ fontFamily: T.ui, fontSize: 12, color: T.t3, letterSpacing: '0.16em', fontWeight: 500 }}>BATTERY</span>
        <span style={{ marginLeft: 'auto', fontFamily: T.ui, fontSize: 12, color: T.t2 }}>22.3 V · 41 °C</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
        <span style={{ ...NUM, fontSize: 64, color: T.green, fontWeight: 500, lineHeight: 0.9 }}>74</span>
        <span style={{ fontFamily: T.ui, fontSize: 22, color: T.t2 }}>%</span>
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <div style={{ fontFamily: T.ui, fontSize: 11, color: T.t3, letterSpacing: '0.16em', fontWeight: 500 }}>AUTO-RTH</div>
          <div style={{ ...NUM, fontSize: 18, color: T.amber, fontWeight: 500 }}>≈ 06:48</div>
        </div>
      </div>
      <div style={{ position: 'relative', height: 10, borderRadius: 6, background: '#0F1420', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, width: '74%', background: T.green, borderRadius: 6 }}/>
        <div style={{ position: 'absolute', left: '25%', top: -3, bottom: -3, width: 2, background: T.amber }}/>
        <div style={{ position: 'absolute', left: '15%', top: -3, bottom: -3, width: 2, background: T.red }}/>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
        <span style={{ ...NUM, fontSize: 11, color: T.t3 }}>0%</span>
        <span style={{ ...NUM, fontSize: 11, color: T.red }}>15 LAND</span>
        <span style={{ ...NUM, fontSize: 11, color: T.amber }}>25 RTH</span>
        <span style={{ ...NUM, fontSize: 11, color: T.t3 }}>100%</span>
      </div>
    </div>

    {/* GPS + Link — bottom block */}
    <div style={{ borderTop: `1px solid ${T.hairline}`, background: T.panel, padding: '14px 22px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: T.t3, fontSize: 11, fontWeight: 500, letterSpacing: '0.16em' }}>
          <MI name={ICON.satellite} size={14} color={T.green}/> GPS · RTK
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
          <span style={{ ...NUM, fontSize: 22, color: T.green, fontWeight: 500 }}>FIX</span>
          <span style={{ ...NUM, fontSize: 13, color: T.t2 }}>22 sat</span>
        </div>
      </div>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: T.t3, fontSize: 11, fontWeight: 500, letterSpacing: '0.16em' }}>
          <MI name={ICON.signal} size={14} color={T.green}/> RC LINK
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
          <span style={{ ...NUM, fontSize: 22, color: T.t1, fontWeight: 500 }}>−62</span>
          <span style={{ ...NUM, fontSize: 13, color: T.t2 }}>dBm</span>
        </div>
      </div>
    </div>
  </div>
);

/* ---------------- RIGHT MISSION PANEL ---------------- */

const waypoints = [
  { i: 5, action: 'PHOTO_ZOOM', state: 'done',    alt: 78, hdg: 90 },
  { i: 6, action: 'PHOTO_ZOOM', state: 'done',    alt: 78, hdg: 135 },
  { i: 7, action: 'PHOTO_ZOOM', state: 'current', alt: 78, hdg: 180, dist: 0 },
  { i: 8, action: 'PHOTO_ZOOM', state: 'next',    alt: 78, hdg: 225, dist: 42 },
  { i: 9, action: 'PHOTO_ZOOM', state: 'next',    alt: 78, hdg: 270, dist: 84 },
  { i: 10, action: 'PHOTO_WIDE', state: 'next',   alt: 85, hdg: 315, dist: 128 },
];

const WPRow = ({ wp }) => {
  const isCurrent = wp.state === 'current';
  const isDone = wp.state === 'done';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '11px 20px', borderBottom: `1px solid ${T.hairline2}`,
      background: isCurrent ? 'rgba(0,212,255,0.06)' : 'transparent',
      borderLeft: isCurrent ? `3px solid ${T.cyan}` : '3px solid transparent',
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 999,
        background: isDone ? T.green : isCurrent ? T.cyan : T.card,
        border: isCurrent ? `2px solid rgba(0,212,255,0.4)` : `1px solid ${T.hairline}`,
        boxShadow: isCurrent ? `0 0 0 4px rgba(0,212,255,0.12)` : 'none',
        display: 'grid', placeItems: 'center',
        ...NUM, fontSize: 13, fontWeight: 600,
        color: isDone || isCurrent ? '#0A0E14' : T.t2,
      }}>
        {isDone ? <MI name={ICON.ok} size={18} color="#0A0E14" fill={1}/> : wp.i}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{ fontFamily: T.ui, fontSize: 14, color: isDone ? T.t2 : T.t1, fontWeight: 500 }}>
          WP {wp.i.toString().padStart(2, '0')}
          <span style={{ color: T.t3, marginLeft: 8, fontWeight: 400 }}>{wp.action.toLowerCase().replace('_', ' ')}</span>
        </div>
        <div style={{ ...NUM, fontSize: 11, color: T.t3, marginTop: 2 }}>
          {wp.alt}m · {wp.hdg}°{wp.dist > 0 ? ` · ${wp.dist}m ahead` : isCurrent ? ' · capturing' : isDone ? '' : ''}
        </div>
      </div>
      {isCurrent && (
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, color: T.cyan, fontFamily: T.ui, fontSize: 11, fontWeight: 600, letterSpacing: '0.14em' }}>
          NOW
        </div>
      )}
    </div>
  );
};

/* Emergency / flight-control buttons.
   Each maps to a documented protocol — see hud-protocols artboard.
   Color: severity. Required confirmation: noted via `hold` prop. */
const FlightCtrlBtn = ({ iconName, label, sub, tone = 'red', hold = true, full = false }) => {
  const map = {
    red:    { fg: T.red,    bd: 'rgba(239,68,68,0.55)', bg: 'rgba(239,68,68,0.08)' },
    amber:  { fg: T.amber,  bd: 'rgba(245,158,11,0.55)',bg: 'rgba(245,158,11,0.08)' },
    blue:   { fg: T.blue,   bd: 'rgba(59,130,246,0.55)',bg: 'rgba(59,130,246,0.08)' },
    cyan:   { fg: T.cyan,   bd: 'rgba(0,212,255,0.55)', bg: 'rgba(0,212,255,0.08)'  },
    purple: { fg: T.purple, bd: 'rgba(167,139,250,0.55)',bg:'rgba(167,139,250,0.08)' },
    slate:  { fg: T.t1,     bd: T.hairline,             bg: T.card                  },
  }[tone];
  return (
    <div style={{
      flex: full ? 'none' : 1, width: full ? '100%' : undefined,
      height: 76, borderRadius: 10,
      background: map.bg, border: `1.5px solid ${map.bd}`,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
      position: 'relative', overflow: 'hidden', cursor: 'pointer',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <MI name={iconName} size={20} color={map.fg} fill={tone === 'red' ? 1 : 0} weight={600}/>
        <span style={{ fontFamily: T.ui, fontSize: 15, fontWeight: 700, color: map.fg, letterSpacing: '0.08em' }}>{label}</span>
      </div>
      <span style={{ fontFamily: T.ui, fontSize: 10, color: T.t3, letterSpacing: '0.16em', fontWeight: 500 }}>{sub || (hold ? 'HOLD 2s' : 'TAP')}</span>
    </div>
  );
};

const MissionPanel = () => (
  <div style={{ width: 360, background: T.panel, borderLeft: `1px solid ${T.hairline}`, display: 'flex', flexDirection: 'column' }}>
    {/* Progress card */}
    <div style={{ padding: '18px 22px', borderBottom: `1px solid ${T.hairline2}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <span style={{ fontFamily: T.ui, fontSize: 12, color: T.t3, letterSpacing: '0.16em', fontWeight: 500 }}>MISSION PROGRESS</span>
        <span style={{ marginLeft: 'auto', ...NUM, fontSize: 13, color: T.cyan, fontWeight: 500 }}>29%</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
        <span style={{ ...NUM, fontSize: 44, color: T.t1, fontWeight: 500, lineHeight: 1 }}>7</span>
        <span style={{ fontFamily: T.ui, fontSize: 20, color: T.t3 }}>/</span>
        <span style={{ ...NUM, fontSize: 26, color: T.t2, fontWeight: 500 }}>24</span>
        <span style={{ fontFamily: T.ui, fontSize: 13, color: T.t3, marginLeft: 6 }}>waypoints</span>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: '#0F1420', overflow: 'hidden', position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, width: '29%', background: T.cyan, borderRadius: 3 }}/>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', marginTop: 12, gap: 8 }}>
        <div>
          <div style={{ fontFamily: T.ui, fontSize: 10, color: T.t3, letterSpacing: '0.14em', fontWeight: 500 }}>PHOTOS</div>
          <div style={{ ...NUM, fontSize: 18, color: T.t1, fontWeight: 500, marginTop: 2 }}>23<span style={{ color: T.t3, fontSize: 13 }}> / 24</span></div>
        </div>
        <div>
          <div style={{ fontFamily: T.ui, fontSize: 10, color: T.t3, letterSpacing: '0.14em', fontWeight: 500 }}>ELAPSED</div>
          <div style={{ ...NUM, fontSize: 18, color: T.t1, fontWeight: 500, marginTop: 2 }}>04:21</div>
        </div>
        <div>
          <div style={{ fontFamily: T.ui, fontSize: 10, color: T.t3, letterSpacing: '0.14em', fontWeight: 500 }}>REMAINING</div>
          <div style={{ ...NUM, fontSize: 18, color: T.t2, fontWeight: 500, marginTop: 2 }}>~03:27</div>
        </div>
      </div>
    </div>

    {/* Routine */}
    <div style={{ padding: '12px 22px', borderBottom: `1px solid ${T.hairline2}`, display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(0,212,255,0.10)', border: `1px solid rgba(0,212,255,0.3)`, display: 'grid', placeItems: 'center' }}>
        <MI name={ICON.mission} size={18} color={T.cyan}/>
      </div>
      <div>
        <div style={{ fontFamily: T.ui, fontSize: 11, color: T.t3, letterSpacing: '0.16em', fontWeight: 500 }}>ROUTINE</div>
        <div style={{ fontFamily: T.ui, fontSize: 14, color: T.t1, fontWeight: 500, marginTop: 1 }}>Orbit · r=12 m · 24 photos</div>
      </div>
    </div>

    {/* WP list */}
    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '12px 22px 4px', display: 'flex', alignItems: 'center' }}>
        <span style={{ fontFamily: T.ui, fontSize: 11, color: T.t3, letterSpacing: '0.16em', fontWeight: 500 }}>WAYPOINTS</span>
        <span style={{ marginLeft: 'auto', ...NUM, fontSize: 11, color: T.t3 }}>showing 5–10</span>
      </div>
      {waypoints.map(wp => <WPRow key={wp.i} wp={wp}/>)}
    </div>

    {/* Pause + skip — non-destructive controls */}
    <div style={{ padding: '12px 12px 0', display: 'flex', gap: 8 }}>
      <button style={{ ...iconBtn, width: 56, height: 60 }}>
        <MI name={ICON.skip_prev} size={22} color={T.t1}/>
      </button>
      <button style={{
        flex: 1, height: 60, borderRadius: 10,
        background: 'rgba(0,212,255,0.14)', border: `1.5px solid ${T.cyan}`,
        color: T.cyan, fontFamily: T.ui, fontSize: 18, fontWeight: 700, letterSpacing: '0.1em',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, cursor: 'pointer',
      }}>
        <MI name={ICON.pause} size={22} color={T.cyan} fill={1}/> PAUSE
      </button>
      <button style={{ ...iconBtn, width: 56, height: 60 }}>
        <MI name={ICON.skip_next} size={22} color={T.t1}/>
      </button>
    </div>

    {/* Flight-control cluster */}
    <div style={{ padding: '12px', background: T.panelHi, borderTop: `1px solid ${T.hairline}`, marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <MI name={ICON.emergency} size={16} color={T.red} fill={1}/>
        <span style={{ fontFamily: T.ui, fontSize: 10, color: T.t2, letterSpacing: '0.18em', fontWeight: 600 }}>FLIGHT CONTROL · HOLD 2s</span>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <FlightCtrlBtn iconName={ICON.rth} label="RTH" tone="blue"/>
        <FlightCtrlBtn iconName={ICON.land} label="LAND" sub="here" tone="amber"/>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <FlightCtrlBtn iconName={ICON.abort} label="ABORT" sub="end mission" tone="red"/>
        <FlightCtrlBtn iconName={ICON.estop} label="E-STOP" sub="hold 3s" tone="red"/>
      </div>
    </div>
  </div>
);

window.TopStrip = TopStrip;
window.TelemRail = TelemRail;
window.MissionPanel = MissionPanel;
window.FlightCtrlBtn = FlightCtrlBtn;
window.WPRow = WPRow;
window.iconBtn = iconBtn;
