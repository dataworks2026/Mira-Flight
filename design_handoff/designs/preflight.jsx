/* Mira Flight — Preflight checklist + arming gate.
   Single screen, vertical scroll if needed. Six checklist sections in a 3×2 grid,
   drone hardware status on the left rail, mission summary + ARM gate on the right.
   Red items block arming. Ambers pass through but require explicit acknowledgement. */

const STATUSES = {
  ok:   { fg: T.green, bd: 'rgba(16,185,129,0.40)', bg: 'rgba(16,185,129,0.08)', label: 'OK',     icon: 'check_circle' },
  warn: { fg: T.amber, bd: 'rgba(245,158,11,0.55)', bg: 'rgba(245,158,11,0.10)', label: 'WARN',   icon: 'warning' },
  block:{ fg: T.red,   bd: 'rgba(239,68,68,0.55)',  bg: 'rgba(239,68,68,0.10)',  label: 'BLOCK',  icon: 'error' },
  info: { fg: T.cyan,  bd: 'rgba(0,212,255,0.40)',  bg: 'rgba(0,212,255,0.08)',  label: 'INFO',   icon: 'info' },
};

const CHECKLIST = [
  {
    group: 'Hardware', icon: 'build', items: [
      { label: 'Propellers',     detail: '4 of 4 secured · no chips · CW/CCW correct',  status: 'ok',   value: 'INSPECTED' },
      { label: 'IMU & compass',  detail: 'Calibrated 6 days ago · drift 0.4°',            status: 'ok',   value: 'CALIBRATED' },
      { label: 'Battery pack',   detail: 'TB65 · 64 cycles · pack temp 18 °C',           status: 'ok',   value: '98%' },
      { label: 'SD storage',     detail: 'SanDisk Extreme 256 GB · 0 errors',            status: 'ok',   value: '128 GB' },
    ],
  },
  {
    group: 'Sensors', icon: 'sensors', items: [
      { label: 'GPS lock',       detail: 'GNSS multi-constellation · HDOP 0.6',            status: 'ok',   value: '24 SAT' },
      { label: 'RTK fix',        detail: 'Trimble base · 142 m baseline',                  status: 'ok',   value: 'FIX' },
      { label: 'Vision system',  detail: '6 / 6 obstacle sensors clean',                   status: 'ok',   value: 'ALL CLEAR' },
      { label: 'IMU temp',       detail: 'Operating range 5 – 50 °C',                       status: 'ok',   value: '18 °C' },
    ],
  },
  {
    group: 'Connectivity', icon: 'wifi', items: [
      { label: 'RC link',        detail: 'O3+ · bound · last RTT 14 ms',                   status: 'ok',   value: '−58 dBm' },
      { label: 'Cloud sync',     detail: 'us-central · queue cleared',                     status: 'ok',   value: '12 ms' },
      { label: '4G failover',    detail: 'T-Mobile · auto-handoff on RC loss',             status: 'ok',   value: '4 BARS' },
    ],
  },
  {
    group: 'Environment', icon: 'thermostat_auto', items: [
      { label: 'Wind',           detail: 'Steady 5.4 m/s · gusting 7.2 m/s SSE',           status: 'warn', value: '5.4 m/s', warning: 'Gust within limits but at threshold — expect drift during photo hover.' },
      { label: 'Weather',        detail: 'Clear · no precip next 30 min',                  status: 'ok',   value: 'CLEAR' },
      { label: 'Visibility',     detail: 'VFR · ceiling unlimited',                        status: 'ok',   value: '8.4 km' },
      { label: 'Daylight',       detail: 'Civil sunset 18:42 local',                       status: 'warn', value: '14 min', warning: 'Mission ends inside civil-twilight buffer. Verify landing in good light.' },
    ],
  },
  {
    group: 'Airspace & mission', icon: 'airplanemode_active', items: [
      { label: 'Geofence',       detail: 'Refinery N polygon · clearance 312 m',           status: 'ok',   value: 'INSIDE' },
      { label: 'Airspace',       detail: 'Class G · LAANC authorization #LA-9821',         status: 'ok',   value: 'AUTHORIZED' },
      { label: 'RTH altitude',   detail: '90 m AGL · obstacle-free corridor home',         status: 'ok',   value: '90 m' },
      { label: 'Mission plan',   detail: 'Orbit · 24 WP · 14:36 est · 62% return',         status: 'ok',   value: 'LOADED' },
    ],
  },
  {
    group: 'Operator readiness', icon: 'person', items: [
      { label: 'Pilot license',  detail: 'Part 107 · K. Marshall · exp 2027-03-14',        status: 'ok',   value: 'VALID' },
      { label: 'Insurance',      detail: 'AIG drone · $5M liability · active',             status: 'ok',   value: 'ACTIVE' },
      { label: 'Flight log',     detail: 'Auto-entry created · mission ID MR-2026-0428',   status: 'ok',   value: 'OPEN' },
      { label: 'VLOS spotter',   detail: 'Required by ops policy for orbit > 50 m',         status: 'warn', value: 'NOT ASSIGNED', warning: 'No spotter logged. Either assign one in the roster or attest VLOS yourself below.' },
    ],
  },
];

/* ---------------- Drone hardware card (left rail) ---------------- */
const DroneHardwareCard = () => (
  <div style={{ width: 480, background: T.panel, borderRight: `1px solid ${T.hairline}`, display: 'flex', flexDirection: 'column' }}>
    <div style={{ padding: '14px 22px', display: 'flex', alignItems: 'baseline', borderBottom: `1px solid ${T.hairline2}` }}>
      <span style={{ fontFamily: T.ui, fontSize: 11, color: T.t3, letterSpacing: '0.18em', fontWeight: 600 }}>DRONE</span>
      <span style={{ marginLeft: 'auto', ...NUM, fontSize: 11, color: T.t3 }}>BAY 2 · HELIPAD NORTH</span>
    </div>

    {/* Drone illustration */}
    <div style={{ position: 'relative', height: 280, background: 'radial-gradient(circle at center, #1a2030 0%, #0c111c 80%)', overflow: 'hidden', borderBottom: `1px solid ${T.hairline2}` }}>
      <svg width="100%" height="100%" viewBox="0 0 480 280">
        {/* faint grid pattern */}
        <defs>
          <pattern id="droneGrid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(0,212,255,0.06)" strokeWidth="1"/>
          </pattern>
        </defs>
        <rect width="480" height="280" fill="url(#droneGrid)"/>
        {/* shadow */}
        <ellipse cx="240" cy="232" rx="120" ry="14" fill="rgba(0,0,0,0.55)"/>
        {/* drone (top-down M350-style quadcopter) */}
        <g transform="translate(240 140)">
          {/* arms */}
          <g stroke="#3a4150" strokeWidth="11" strokeLinecap="round">
            <line x1="-72" y1="-50" x2="-26" y2="-18"/>
            <line x1="72" y1="-50" x2="26" y2="-18"/>
            <line x1="-72" y1="50" x2="-26" y2="18"/>
            <line x1="72" y1="50" x2="26" y2="18"/>
          </g>
          {/* arm highlights */}
          <g stroke="#525a6d" strokeWidth="3" strokeLinecap="round">
            <line x1="-72" y1="-50" x2="-26" y2="-18"/>
            <line x1="72" y1="-50" x2="26" y2="-18"/>
            <line x1="-72" y1="50" x2="-26" y2="18"/>
            <line x1="72" y1="50" x2="26" y2="18"/>
          </g>
          {/* body */}
          <rect x="-36" y="-26" width="72" height="52" rx="10" fill="#2d3445" stroke="#525a6d" strokeWidth="1"/>
          <rect x="-30" y="-20" width="60" height="40" rx="8" fill="#1a2030"/>
          {/* center indicator (cyan) */}
          <circle r="9" fill="rgba(0,212,255,0.20)" stroke={T.cyan} strokeWidth="1.5"/>
          <circle r="3" fill={T.cyan}/>
          {/* front arrow */}
          <polygon points="0,-30 -5,-22 5,-22" fill={T.cyan}/>
          {/* gimbal underneath, hanging below */}
          <rect x="-12" y="20" width="24" height="14" rx="3" fill="#3a4150"/>
          <circle cx="0" cy="32" r="6" fill="#0a0e14" stroke={T.cyan} strokeWidth="1.5"/>
          {/* rotors */}
          {[[-80, -55], [80, -55], [-80, 55], [80, 55]].map((p, i) => (
            <g key={i} transform={`translate(${p[0]} ${p[1]})`}>
              <circle r="20" fill="rgba(0,212,255,0.05)" stroke="rgba(0,212,255,0.20)" strokeWidth="1" strokeDasharray="2 3"/>
              <circle r="6" fill="#1a2030" stroke="#525a6d" strokeWidth="1.5"/>
              <circle r="2.5" fill="#3a4150"/>
            </g>
          ))}
          {/* prop labels */}
          <text x="-80" y="-80" textAnchor="middle" fill={T.t3} fontFamily="Roboto Mono" fontSize="9">M1·CW</text>
          <text x="80"  y="-80" textAnchor="middle" fill={T.t3} fontFamily="Roboto Mono" fontSize="9">M2·CCW</text>
          <text x="-80" y="88"  textAnchor="middle" fill={T.t3} fontFamily="Roboto Mono" fontSize="9">M3·CCW</text>
          <text x="80"  y="88"  textAnchor="middle" fill={T.t3} fontFamily="Roboto Mono" fontSize="9">M4·CW</text>
        </g>
        {/* status dot ribbon */}
        <g transform="translate(240 260)">
          <text x="0" y="0" textAnchor="middle" fill={T.green} fontFamily="Roboto Mono" fontSize="11" fontWeight="600" letterSpacing="0.16em">● POWER ON · BAY ARMED</text>
        </g>
      </svg>

      {/* identity chip */}
      <div style={{ position: 'absolute', top: 14, left: 14, padding: '4px 10px', borderRadius: 6, background: 'rgba(0,212,255,0.18)', border: `1px solid ${T.cyan}`, color: T.cyan, fontFamily: T.mono, fontSize: 11, fontWeight: 600, letterSpacing: '0.12em' }}>
        M350-A
      </div>
      <div style={{ position: 'absolute', top: 14, right: 14, padding: '4px 10px', borderRadius: 6, background: T.card, border: `1px solid ${T.hairline}`, color: T.t2, fontFamily: T.mono, fontSize: 10, fontWeight: 500, letterSpacing: '0.10em' }}>
        FW 1.84.3
      </div>
    </div>

    {/* Battery block — mirrors HUD style */}
    <div style={{ padding: '18px 22px', borderBottom: `1px solid ${T.hairline2}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <MI name={ICON.battery} size={20} color={T.green} fill={1}/>
        <span style={{ fontFamily: T.ui, fontSize: 11, color: T.t3, letterSpacing: '0.18em', fontWeight: 600 }}>BATTERY</span>
        <span style={{ marginLeft: 'auto', fontFamily: T.ui, fontSize: 11, color: T.t2 }}>TB65 · 64 cycles</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
        <span style={{ ...NUM, fontSize: 52, color: T.green, fontWeight: 500, lineHeight: 0.9 }}>98</span>
        <span style={{ fontFamily: T.ui, fontSize: 18, color: T.t2 }}>%</span>
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <div style={{ fontFamily: T.ui, fontSize: 10, color: T.t3, letterSpacing: '0.16em', fontWeight: 500 }}>VOLTS · TEMP</div>
          <div style={{ ...NUM, fontSize: 14, color: T.t1, fontWeight: 500, marginTop: 2 }}>22.6 V · 18 °C</div>
        </div>
      </div>
      <div style={{ position: 'relative', height: 8, borderRadius: 4, background: '#0F1420', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, width: '98%', background: T.green, borderRadius: 4 }}/>
      </div>
    </div>

    {/* Sub-systems matrix */}
    <div style={{ padding: '18px 22px', borderBottom: `1px solid ${T.hairline2}` }}>
      <div style={{ fontFamily: T.ui, fontSize: 11, color: T.t3, letterSpacing: '0.18em', fontWeight: 600, marginBottom: 14 }}>SUBSYSTEMS</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Subsys icon="settings_input_component" label="Motors"      value="4 / 4 nominal"/>
        <Subsys icon="videocam"                 label="Gimbal"      value="H1 · centered"/>
        <Subsys icon="visibility"               label="Vision"      value="6 / 6 clean"/>
        <Subsys icon="rss_feed"                 label="Telemetry"   value="1 Hz · MAVLink"/>
        <Subsys icon="sd_storage"               label="Storage"     value="128 GB free"/>
        <Subsys icon="memory"                   label="Flight ctrl" value="A3 Pro · OK"/>
      </div>
    </div>

    {/* Bay status */}
    <div style={{ padding: '14px 22px', background: T.panelHi, marginTop: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 6, background: 'rgba(16,185,129,0.18)', border: `1px solid ${T.green}`, display: 'grid', placeItems: 'center', color: T.green, fontFamily: T.ui, fontWeight: 700, fontSize: 14 }}>H</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: T.ui, fontSize: 13, color: T.t1, fontWeight: 500 }}>Helipad North · Bay 2</div>
          <div style={{ ...NUM, fontSize: 11, color: T.t2, marginTop: 2 }}>29.7322° N · 95.0816° W · open</div>
        </div>
        <div style={{ padding: '3px 8px', borderRadius: 4, background: 'rgba(16,185,129,0.14)', border: `1px solid ${T.green}`, color: T.green, fontFamily: T.mono, fontSize: 10, fontWeight: 700, letterSpacing: '0.12em' }}>READY</div>
      </div>
    </div>
  </div>
);

const Subsys = ({ icon, label, value }) => (
  <div style={{ padding: '10px 12px', borderRadius: 8, background: T.card, border: `1px solid ${T.hairline}`, display: 'flex', alignItems: 'center', gap: 10 }}>
    <MI name={icon} size={18} color={T.t2}/>
    <div style={{ minWidth: 0 }}>
      <div style={{ fontFamily: T.ui, fontSize: 10, color: T.t3, letterSpacing: '0.14em', fontWeight: 500 }}>{label.toUpperCase()}</div>
      <div style={{ fontFamily: T.ui, fontSize: 12, color: T.t1, fontWeight: 500, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</div>
    </div>
  </div>
);

/* ---------------- Checklist item row ---------------- */
const CheckItem = ({ item }) => {
  const s = STATUSES[item.status];
  return (
    <div style={{
      padding: '14px 16px', borderBottom: `1px solid ${T.hairline2}`,
      background: item.status === 'warn' ? 'rgba(245,158,11,0.04)' : item.status === 'block' ? 'rgba(239,68,68,0.04)' : 'transparent',
      display: 'flex', alignItems: 'flex-start', gap: 12,
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: 6, marginTop: 2,
        background: s.bg, border: `1px solid ${s.bd}`,
        display: 'grid', placeItems: 'center', flexShrink: 0,
      }}>
        <MI name={s.icon} size={18} color={s.fg} fill={1}/>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: T.ui, fontSize: 14, color: T.t1, fontWeight: 500 }}>{item.label}</div>
        <div style={{ fontFamily: T.ui, fontSize: 12, color: T.t2, marginTop: 3, lineHeight: 1.45 }}>{item.detail}</div>
        {item.warning && (
          <div style={{ marginTop: 8, padding: '8px 10px', borderRadius: 6, background: 'rgba(245,158,11,0.06)', border: `1px solid rgba(245,158,11,0.30)`, fontFamily: T.ui, fontSize: 12, color: T.amber, lineHeight: 1.45 }}>
            {item.warning}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
        <span style={{ ...NUM, fontSize: 13, color: s.fg, fontWeight: 600, letterSpacing: '0.04em' }}>{item.value}</span>
        <span style={{ fontFamily: T.mono, fontSize: 9, color: s.fg, fontWeight: 700, letterSpacing: '0.14em' }}>{s.label}</span>
      </div>
    </div>
  );
};

/* ---------------- Section card ---------------- */
const SectionCard = ({ group, icon, items }) => {
  const counts = items.reduce((a, i) => { a[i.status] = (a[i.status] || 0) + 1; return a; }, {});
  const overall = counts.block ? 'block' : counts.warn ? 'warn' : 'ok';
  const s = STATUSES[overall];
  return (
    <div style={{ background: T.panel, border: `1px solid ${T.hairline}`, borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        padding: '14px 16px', borderBottom: `1px solid ${T.hairline}`, background: T.panelHi,
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: s.bg, border: `1px solid ${s.bd}`, display: 'grid', placeItems: 'center' }}>
          <MI name={icon} size={20} color={s.fg}/>
        </div>
        <div>
          <div style={{ fontFamily: T.ui, fontSize: 16, color: T.t1, fontWeight: 600, letterSpacing: '-0.005em' }}>{group}</div>
          <div style={{ ...NUM, fontSize: 11, color: T.t3, marginTop: 1, letterSpacing: '0.04em' }}>
            {items.length} checks
            {counts.warn ? <span style={{ color: T.amber, marginLeft: 8 }}> · {counts.warn} warning{counts.warn > 1 ? 's' : ''}</span> : null}
            {counts.block ? <span style={{ color: T.red, marginLeft: 8 }}> · {counts.block} blocking</span> : null}
          </div>
        </div>
        <div style={{ marginLeft: 'auto', padding: '4px 10px', borderRadius: 4, background: s.bg, border: `1px solid ${s.bd}`, color: s.fg, fontFamily: T.mono, fontSize: 10, fontWeight: 700, letterSpacing: '0.14em' }}>
          {s.label}
        </div>
      </div>
      <div style={{ flex: 1 }}>
        {items.map((it, i) => <CheckItem key={i} item={it}/>)}
      </div>
    </div>
  );
};

/* ---------------- Arm gate (right rail) ---------------- */
const ArmGate = () => {
  const warnCount = CHECKLIST.reduce((a, g) => a + g.items.filter(i => i.status === 'warn').length, 0);
  const blockCount = CHECKLIST.reduce((a, g) => a + g.items.filter(i => i.status === 'block').length, 0);
  return (
    <div style={{ width: 500, background: T.panel, borderLeft: `1px solid ${T.hairline}`, display: 'flex', flexDirection: 'column' }}>
      {/* Mission summary */}
      <div style={{ padding: '18px 22px', borderBottom: `1px solid ${T.hairline2}` }}>
        <div style={{ fontFamily: T.ui, fontSize: 11, color: T.t3, letterSpacing: '0.18em', fontWeight: 600, marginBottom: 10 }}>MISSION</div>
        <div style={{ fontFamily: T.ui, fontSize: 22, color: T.t1, fontWeight: 600, letterSpacing: '-0.01em' }}>Refinery North · Tank 04</div>
        <div style={{ fontFamily: T.ui, fontSize: 13, color: T.t2, marginTop: 4 }}>Orbit · 24 photos · MR-2026-0428</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14 }}>
          <Stat3 label="DURATION"      value="≈14:36" sub="incl. RTH"/>
          <Stat3 label="PHOTOS"        value="24"     sub="≈ 96 MB"/>
          <Stat3 label="DIST FROM PAD" value="124 m"  sub="bearing 142°"/>
          <Stat3 label="BATT RETURN"   value="62%"    sub="comfortable" color={T.green}/>
        </div>
      </div>

      {/* Operator + attestations */}
      <div style={{ padding: '14px 22px', borderBottom: `1px solid ${T.hairline2}` }}>
        <div style={{ fontFamily: T.ui, fontSize: 11, color: T.t3, letterSpacing: '0.18em', fontWeight: 600, marginBottom: 10 }}>PILOT IN COMMAND</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 999, background: T.card, border: `1px solid ${T.hairline}`, display: 'grid', placeItems: 'center', fontFamily: T.ui, fontWeight: 600, color: T.t1, fontSize: 13 }}>KM</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: T.ui, fontSize: 14, color: T.t1, fontWeight: 500 }}>K. Marshall</div>
            <div style={{ fontFamily: T.ui, fontSize: 11, color: T.t2, marginTop: 1 }}>Part 107 · #4452 · valid</div>
          </div>
          <button style={{ padding: '6px 10px', borderRadius: 6, background: 'transparent', border: `1px solid ${T.hairline}`, color: T.cyan, fontFamily: T.ui, fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', cursor: 'pointer' }}>Hand off</button>
        </div>
      </div>

      <div style={{ padding: '14px 22px', borderBottom: `1px solid ${T.hairline2}` }}>
        <div style={{ fontFamily: T.ui, fontSize: 11, color: T.t3, letterSpacing: '0.18em', fontWeight: 600, marginBottom: 10 }}>ATTESTATIONS</div>
        <Toggle label="I maintain visual line of sight" sub="Required when no spotter assigned" on/>
        <Toggle label="Airspace authorization confirmed" sub="LAANC #LA-9821 valid this window" on/>
        <Toggle label="I accept the 2 warnings above" sub="Wind at threshold · daylight margin tight" on warn/>
      </div>

      {/* Warning summary */}
      {(warnCount > 0 || blockCount > 0) && (
        <div style={{ padding: '12px 22px', background: blockCount ? 'rgba(239,68,68,0.06)' : 'rgba(245,158,11,0.06)', borderBottom: `1px solid ${T.hairline2}`, display: 'flex', gap: 10, alignItems: 'center' }}>
          <MI name={blockCount ? 'error' : 'warning'} size={20} color={blockCount ? T.red : T.amber} fill={1}/>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: T.ui, fontSize: 13, color: T.t1, fontWeight: 600 }}>
              {blockCount > 0 ? `${blockCount} blocking issue${blockCount > 1 ? 's' : ''}` : `${warnCount} warning${warnCount > 1 ? 's' : ''} acknowledged`}
            </div>
            <div style={{ fontFamily: T.ui, fontSize: 11, color: T.t2, marginTop: 2 }}>
              {blockCount > 0 ? 'Resolve red items before arming' : 'Ambers pass through · all reds clear'}
            </div>
          </div>
        </div>
      )}

      {/* Arm button */}
      <div style={{ padding: '20px 22px', background: T.panelHi, marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <button style={{
          width: '100%', padding: '20px',
          borderRadius: 12,
          background: blockCount ? T.card : T.green,
          border: `1.5px solid ${blockCount ? T.hairline : T.green}`,
          color: blockCount ? T.t3 : '#0A0E14',
          fontFamily: T.ui, fontSize: 22, fontWeight: 700, letterSpacing: '0.12em',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14,
          cursor: blockCount ? 'not-allowed' : 'pointer',
          boxShadow: blockCount ? 'none' : `0 0 0 4px rgba(16,185,129,0.20), 0 16px 40px rgba(16,185,129,0.25)`,
          opacity: blockCount ? 0.5 : 1, position: 'relative',
        }}>
          <MI name={ICON.takeoff} size={32} color={blockCount ? T.t3 : '#0A0E14'} fill={1}/>
          HOLD TO ARM · 2 s
          {/* faux progress ring */}
          {!blockCount && (
            <svg style={{ position: 'absolute', inset: 4, pointerEvents: 'none' }} width="calc(100% - 8px)" height="calc(100% - 8px)" viewBox="0 0 200 80" preserveAspectRatio="none">
              <rect x="2" y="2" width="196" height="76" rx="10" fill="none" stroke="rgba(10,14,20,0.30)" strokeWidth="2" strokeDasharray="6 4"/>
            </svg>
          )}
        </button>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={{ flex: 1, height: 44, borderRadius: 8, background: T.card, border: `1px solid ${T.hairline}`, color: T.t1, fontFamily: T.ui, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
            <MI name={ICON.back} size={16} color={T.t2} style={{ verticalAlign: -3, marginRight: 6 }}/> Back to plan
          </button>
          <button style={{ flex: 1, height: 44, borderRadius: 8, background: T.card, border: `1px solid ${T.hairline}`, color: T.t1, fontFamily: T.ui, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
            <MI name="play_circle" size={16} color={T.cyan} style={{ verticalAlign: -3, marginRight: 6 }}/> Simulate
          </button>
        </div>
      </div>
    </div>
  );
};

const Stat3 = ({ label, value, sub, color }) => (
  <div style={{ padding: '10px 12px', borderRadius: 8, background: T.card, border: `1px solid ${T.hairline}` }}>
    <div style={{ fontFamily: T.ui, fontSize: 10, color: T.t3, letterSpacing: '0.14em', fontWeight: 500 }}>{label}</div>
    <div style={{ ...NUM, fontSize: 22, color: color || T.t1, fontWeight: 500, marginTop: 2, lineHeight: 1 }}>{value}</div>
    <div style={{ fontFamily: T.ui, fontSize: 11, color: T.t3, marginTop: 3 }}>{sub}</div>
  </div>
);

const Toggle = ({ label, sub, on, warn }) => (
  <div style={{ padding: '10px 0', display: 'flex', alignItems: 'center', gap: 12, borderBottom: `1px solid ${T.hairline2}` }}>
    <div style={{
      width: 36, height: 20, borderRadius: 999, position: 'relative',
      background: on ? (warn ? T.amber : T.green) : T.card,
      border: `1px solid ${on ? (warn ? T.amber : T.green) : T.hairline}`,
      transition: 'background 0.2s',
    }}>
      <div style={{
        position: 'absolute', top: 1, left: on ? 17 : 1, width: 16, height: 16, borderRadius: 999,
        background: '#0A0E14',
      }}/>
    </div>
    <div style={{ flex: 1 }}>
      <div style={{ fontFamily: T.ui, fontSize: 13, color: T.t1, fontWeight: 500 }}>{label}</div>
      <div style={{ fontFamily: T.ui, fontSize: 11, color: T.t2, marginTop: 1 }}>{sub}</div>
    </div>
  </div>
);

/* ---------------- Top strip ---------------- */
const PreflightTopStrip = () => {
  const blockCount = CHECKLIST.reduce((a, g) => a + g.items.filter(i => i.status === 'block').length, 0);
  const warnCount  = CHECKLIST.reduce((a, g) => a + g.items.filter(i => i.status === 'warn').length, 0);
  return (
    <div style={{ height: 80, display: 'flex', alignItems: 'stretch', background: T.panel, borderBottom: `1px solid ${T.hairline}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '0 22px', borderRight: `1px solid ${T.hairline}` }}>
        <button style={{ width: 44, height: 44, borderRadius: 8, background: T.card, border: `1px solid ${T.hairline}`, display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
          <MI name={ICON.back} size={22} color={T.t1}/>
        </button>
        <div style={{ width: 40, height: 40, borderRadius: 8, background: 'linear-gradient(135deg, #00D4FF 0%, #0099BD 100%)', display: 'grid', placeItems: 'center' }}>
          <MI name="checklist" size={22} color="#0A0E14" weight={700} fill={1}/>
        </div>
        <div>
          <div style={{ fontFamily: T.ui, fontSize: 11, color: T.t3, letterSpacing: '0.18em', fontWeight: 500 }}>PREFLIGHT · STEP 4 OF 4</div>
          <div style={{ fontFamily: T.ui, fontSize: 17, color: T.t1, fontWeight: 500, marginTop: 1 }}>MR-2026-0428 · Tank 04 inspection</div>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 16, padding: '0 24px' }}>
        <BreadcrumbStep n={1} label="Asset"     state="done"/>
        <BreadcrumbConnector/>
        <BreadcrumbStep n={2} label="Routine"   state="done"/>
        <BreadcrumbConnector/>
        <BreadcrumbStep n={3} label="Capture"   state="done"/>
        <BreadcrumbConnector/>
        <BreadcrumbStep n={4} label="Preflight" state="active"/>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <StatusPill tone="green" icon={<MI name={ICON.ok} size={14} color={T.green} fill={1}/>} label="0 BLOCKING"/>
          {warnCount > 0 && <StatusPill tone="amber" icon={<MI name="warning" size={14} color={T.amber} fill={1}/>} label={`${warnCount} WARNINGS`}/>}
          <StatusPill tone="green" icon={<MI name="airplanemode_active" size={14} color={T.green}/>} label="LAANC OK"/>
          <StatusPill tone="green" icon={<MI name={ICON.signal} size={14} color={T.green}/>} label="LINK"/>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 22px', borderLeft: `1px solid ${T.hairline}` }}>
        <span style={{ fontFamily: T.mono, fontSize: 11, color: T.t3, letterSpacing: '0.14em' }}>15:28:42 · LOCAL</span>
        <div style={{ width: 1, height: 28, background: T.hairline }}/>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: T.ui, fontSize: 11, color: T.t3, letterSpacing: '0.18em', fontWeight: 500 }}>OPERATOR</div>
          <div style={{ fontFamily: T.ui, fontSize: 14, color: T.t1, fontWeight: 500 }}>K. Marshall</div>
        </div>
        <div style={{ width: 40, height: 40, borderRadius: 999, background: T.card, border: `1px solid ${T.hairline}`, display: 'grid', placeItems: 'center', fontFamily: T.ui, fontWeight: 500, color: T.t1, fontSize: 14 }}>KM</div>
      </div>
    </div>
  );
};

/* ---------------- The composed screen ---------------- */
const PreflightScreen = () => (
  <div style={{ width: 2304, height: 1440, background: T.bg, color: T.t1, fontFamily: T.ui, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
    <PreflightTopStrip/>
    <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
      <DroneHardwareCard/>
      <div style={{ flex: 1, overflow: 'hidden', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* Header band */}
        <div style={{ display: 'flex', alignItems: 'baseline' }}>
          <div>
            <div style={{ fontFamily: T.ui, fontSize: 11, color: T.cyan, letterSpacing: '0.22em', fontWeight: 600 }}>PREFLIGHT CHECKLIST</div>
            <div style={{ fontFamily: T.ui, fontSize: 32, color: T.t1, fontWeight: 600, letterSpacing: '-0.02em', marginTop: 4 }}>23 of 23 checks complete · 2 warnings to acknowledge</div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button style={{ height: 40, padding: '0 14px', borderRadius: 8, background: T.card, border: `1px solid ${T.hairline}`, color: T.t1, display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontFamily: T.ui, fontSize: 13, fontWeight: 500 }}>
              <MI name="refresh" size={16} color={T.t2}/> Re-run checks
            </button>
            <button style={{ height: 40, padding: '0 14px', borderRadius: 8, background: T.card, border: `1px solid ${T.hairline}`, color: T.t1, display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontFamily: T.ui, fontSize: 13, fontWeight: 500 }}>
              <MI name="print" size={16} color={T.t2}/> Save log
            </button>
          </div>
        </div>

        {/* 3×2 grid of section cards */}
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 16, minHeight: 0 }}>
          {CHECKLIST.map(sec => <SectionCard key={sec.group} group={sec.group} icon={sec.icon} items={sec.items}/>)}
        </div>
      </div>
      <ArmGate/>
    </div>
  </div>
);

window.PreflightScreen = PreflightScreen;
