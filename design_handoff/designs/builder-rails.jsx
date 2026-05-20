/* Mission Builder rails — top strip, left asset card, right routine + params + summary,
   and the asset-library variant of the left rail used in side state A. */

/* ---------------- TOP STRIP ---------------- */
const BuilderTopStrip = () => (
  <div style={{
    height: 80, display: 'flex', alignItems: 'stretch',
    background: T.panel, borderBottom: `1px solid ${T.hairline}`,
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '0 22px', borderRight: `1px solid ${T.hairline}` }}>
      <button style={{ width: 44, height: 44, borderRadius: 8, background: T.card, border: `1px solid ${T.hairline}`, display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
        <MI name={ICON.back} size={22} color={T.t1}/>
      </button>
      <div style={{ width: 40, height: 40, borderRadius: 8, background: 'linear-gradient(135deg, #00D4FF 0%, #0099BD 100%)', display: 'grid', placeItems: 'center' }}>
        <MI name="route" size={22} color="#0A0E14" weight={700} fill={1}/>
      </div>
      <div>
        <div style={{ fontFamily: T.ui, fontSize: 11, color: T.t3, letterSpacing: '0.18em', fontWeight: 500 }}>NEW MISSION · DRAFT</div>
        <div style={{ fontFamily: T.ui, fontSize: 17, color: T.t1, fontWeight: 500, marginTop: 1 }}>Refinery North · Tank 04 inspection</div>
      </div>
    </div>

    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 16, padding: '0 24px' }}>
      <BreadcrumbStep n={1} label="Asset" state="done"/>
      <BreadcrumbConnector/>
      <BreadcrumbStep n={2} label="Routine" state="active"/>
      <BreadcrumbConnector/>
      <BreadcrumbStep n={3} label="Capture" state="next"/>
      <BreadcrumbConnector/>
      <BreadcrumbStep n={4} label="Preflight" state="next"/>

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ padding: '8px 14px', borderRadius: 8, background: T.card, border: `1px solid ${T.hairline}`, color: T.t2, fontFamily: T.ui, fontSize: 12, letterSpacing: '0.14em', fontWeight: 500 }}>
          AUTO-SAVED 11:42
        </div>
        <StatusPill tone="green" icon={<MI name={ICON.ok} size={14} color={T.green} fill={1}/>} label="GEOFENCE OK"/>
        <StatusPill tone="green" icon={<MI name="airplanemode_active" size={14} color={T.green}/>} label="LAANC OK"/>
        <StatusPill tone="amber" icon={<MI name={ICON.wind} size={14} color={T.amber}/>} label="WIND" value="5.4 m/s"/>
      </div>
    </div>

    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 22px', borderLeft: `1px solid ${T.hairline}` }}>
      <button style={builderSecondary}>
        <MI name="save" size={18} color={T.t1}/> Save draft
      </button>
      <button style={builderSecondary}>
        <MI name="play_circle" size={18} color={T.cyan}/> Simulate
      </button>
      <button style={builderPrimary}>
        <MI name={ICON.takeoff} size={20} color="#0A0E14" fill={1}/> Arm & Fly
      </button>
    </div>
  </div>
);

const builderSecondary = {
  height: 44, padding: '0 14px', borderRadius: 8, background: T.card, border: `1px solid ${T.hairline}`,
  display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
  fontFamily: T.ui, fontSize: 14, fontWeight: 500, color: T.t1, letterSpacing: '0.02em',
};
const builderPrimary = {
  height: 44, padding: '0 18px', borderRadius: 8, background: T.cyan, border: 'none',
  display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
  fontFamily: T.ui, fontSize: 14, fontWeight: 700, color: '#0A0E14', letterSpacing: '0.06em',
};

const BreadcrumbStep = ({ n, label, state }) => {
  const isActive = state === 'active';
  const isDone = state === 'done';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{
        width: 28, height: 28, borderRadius: 999,
        background: isDone ? T.green : isActive ? T.cyan : T.card,
        border: isActive ? `2px solid rgba(0,212,255,0.4)` : `1px solid ${T.hairline}`,
        boxShadow: isActive ? `0 0 0 3px rgba(0,212,255,0.15)` : 'none',
        display: 'grid', placeItems: 'center',
        fontFamily: T.mono, fontSize: 12, fontWeight: 700,
        color: isDone || isActive ? '#0A0E14' : T.t3,
      }}>{isDone ? <MI name={ICON.ok} size={16} color="#0A0E14" fill={1}/> : n}</div>
      <span style={{ fontFamily: T.ui, fontSize: 13, color: isActive ? T.t1 : isDone ? T.t2 : T.t3, fontWeight: isActive ? 600 : 500, letterSpacing: '0.04em' }}>{label}</span>
    </div>
  );
};
const BreadcrumbConnector = () => (
  <div style={{ width: 24, height: 1, background: T.hairline }}/>
);

/* ---------------- LEFT — ASSET CARD ---------------- */
const AssetCard = ({ asset, onSwap }) => (
  <div style={{ width: 320, background: T.panel, borderRight: `1px solid ${T.hairline}`, display: 'flex', flexDirection: 'column' }}>
    <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', borderBottom: `1px solid ${T.hairline2}` }}>
      <span style={{ fontFamily: T.ui, fontSize: 11, color: T.t3, letterSpacing: '0.18em', fontWeight: 600 }}>INSPECTION TARGET</span>
      <button style={{ marginLeft: 'auto', padding: '6px 10px', borderRadius: 6, background: 'transparent', border: `1px solid ${T.hairline}`, color: T.cyan, fontFamily: T.ui, fontSize: 12, fontWeight: 600, letterSpacing: '0.04em', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
        <MI name="swap_horiz" size={14} color={T.cyan}/> Swap
      </button>
    </div>

    {/* Asset thumbnail */}
    <div style={{ position: 'relative', width: '100%', height: 200, background: '#0c111c', overflow: 'hidden' }}>
      <svg width="100%" height="100%" viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="tnk-bg" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#1a2030"/>
            <stop offset="1" stopColor="#0c111c"/>
          </linearGradient>
          <radialGradient id="tnk-top" cx="0.4" cy="0.4">
            <stop offset="0" stopColor="#5a5a5a"/>
            <stop offset="0.6" stopColor="#3a3a3a"/>
            <stop offset="1" stopColor="#222"/>
          </radialGradient>
        </defs>
        <rect width="320" height="200" fill="url(#tnk-bg)"/>
        <ellipse cx="160" cy="170" rx="120" ry="22" fill="#2a2820"/>
        <rect x="60" y="80" width="200" height="92" fill="#3a3a3a"/>
        <ellipse cx="160" cy="80" rx="100" ry="20" fill="url(#tnk-top)"/>
        <ellipse cx="160" cy="80" rx="68" ry="14" fill="none" stroke="#2c2c2c" strokeWidth="1"/>
        <line x1="60" y1="80" x2="60" y2="172" stroke="#222" strokeWidth="1"/>
        <line x1="260" y1="80" x2="260" y2="172" stroke="#222" strokeWidth="1"/>
        {/* gridlines suggesting tank seams */}
        {[100, 120, 140].map(y => <line key={y} x1="60" y1={y} x2="260" y2={y} stroke="#2c2c2c" strokeWidth="0.5"/>)}
      </svg>
      <div style={{ position: 'absolute', top: 12, left: 12, padding: '4px 10px', borderRadius: 6, background: 'rgba(0,212,255,0.18)', border: `1px solid ${T.cyan}`, color: T.cyan, fontFamily: T.mono, fontSize: 11, fontWeight: 600, letterSpacing: '0.12em' }}>
        TANK-04
      </div>
      <div style={{ position: 'absolute', bottom: 12, right: 12, padding: '4px 8px', borderRadius: 4, background: 'rgba(245,158,11,0.18)', border: `1px solid ${T.amber}`, color: T.amber, fontFamily: T.ui, fontSize: 11, fontWeight: 600, letterSpacing: '0.1em' }}>
        DUE · 14 d
      </div>
    </div>

    <div style={{ padding: '16px 18px', borderBottom: `1px solid ${T.hairline2}` }}>
      <div style={{ fontFamily: T.ui, fontSize: 19, color: T.t1, fontWeight: 600, letterSpacing: '-0.01em' }}>Tank 04</div>
      <div style={{ fontFamily: T.ui, fontSize: 13, color: T.t2, marginTop: 4 }}>Storage tank · Floating roof</div>
    </div>

    <div style={{ padding: '14px 18px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, rowGap: 14, borderBottom: `1px solid ${T.hairline2}` }}>
      <KV label="Dimensions"   value="h 22 m · ⌀ 48 m"/>
      <KV label="Last inspect" value="14 days ago" color={T.amber}/>
      <KV label="Latitude"     value="29.7308° N"  mono/>
      <KV label="Longitude"    value="95.0832° W"  mono/>
      <KV label="Site"         value="Refinery N"/>
      <KV label="Asset ID"     value="TANK-04" mono/>
    </div>

    <div style={{ padding: '14px 18px', borderBottom: `1px solid ${T.hairline2}` }}>
      <div style={{ fontFamily: T.ui, fontSize: 11, color: T.t3, letterSpacing: '0.18em', fontWeight: 600, marginBottom: 8 }}>HOME PAD</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 6, background: 'rgba(16,185,129,0.18)', border: `1px solid ${T.green}`, display: 'grid', placeItems: 'center', color: T.green, fontFamily: T.ui, fontWeight: 700, fontSize: 14 }}>H</div>
        <div>
          <div style={{ fontFamily: T.ui, fontSize: 14, color: T.t1, fontWeight: 500 }}>Helipad North</div>
          <div style={{ ...NUM, fontSize: 12, color: T.t2, marginTop: 2 }}>124 m · bearing 142°</div>
        </div>
      </div>
    </div>

    <div style={{ padding: '14px 18px', borderBottom: `1px solid ${T.hairline2}` }}>
      <div style={{ fontFamily: T.ui, fontSize: 11, color: T.t3, letterSpacing: '0.18em', fontWeight: 600, marginBottom: 10 }}>DRONE</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: T.card, border: `1px solid ${T.hairline}`, display: 'grid', placeItems: 'center' }}>
          <MI name={ICON.drone} size={20} color={T.cyan} fill={1}/>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: T.ui, fontSize: 14, color: T.t1, fontWeight: 500 }}>M350-A · Bay 2</div>
          <div style={{ fontFamily: T.ui, fontSize: 11, color: T.t2, marginTop: 2 }}>Battery 98% · last preflight clean</div>
        </div>
        <button style={{ width: 32, height: 32, borderRadius: 6, background: 'transparent', border: `1px solid ${T.hairline}`, display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
          <MI name="expand_more" size={18} color={T.t2}/>
        </button>
      </div>
    </div>

    <div style={{ padding: '14px 18px', marginTop: 'auto' }}>
      <button style={{ width: '100%', padding: '12px', borderRadius: 8, background: T.card, border: `1.5px dashed ${T.hairline}`, color: T.t2, fontFamily: T.ui, fontSize: 13, fontWeight: 500, letterSpacing: '0.04em', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <MI name="add" size={18} color={T.t2}/> Chain another asset
      </button>
    </div>
  </div>
);

const KV = ({ label, value, color, mono }) => (
  <div>
    <div style={{ fontFamily: T.ui, fontSize: 10, color: T.t3, letterSpacing: '0.14em', fontWeight: 500 }}>{label.toUpperCase()}</div>
    <div style={{ ...(mono ? NUM : { fontFamily: T.ui }), fontSize: 13, color: color || T.t1, fontWeight: 500, marginTop: 3 }}>{value}</div>
  </div>
);

/* ---------------- RIGHT — ROUTINE + PARAMS + SUMMARY ---------------- */
const RoutineChip = ({ id, active }) => {
  const r = ROUTINE_TEMPLATES[id];
  return (
    <div style={{
      padding: '10px 12px', borderRadius: 8,
      background: active ? 'rgba(0,212,255,0.14)' : T.card,
      border: `1.5px solid ${active ? T.cyan : T.hairline}`,
      display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
      color: active ? T.cyan : T.t2,
    }}>
      <MI name={r.icon} size={18} color={active ? T.cyan : T.t2}/>
      <span style={{ fontFamily: T.ui, fontSize: 13, fontWeight: 600, letterSpacing: '0.04em' }}>{r.name}</span>
    </div>
  );
};

const ParamSlider = ({ field, value }) => {
  const pct = ((value - field.min) / (field.max - field.min)) * 100;
  return (
    <div style={{ padding: '12px 18px', borderBottom: `1px solid ${T.hairline2}` }}>
      <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 8 }}>
        <span style={{ fontFamily: T.ui, fontSize: 13, color: T.t1, fontWeight: 500 }}>{field.label}</span>
        <span style={{ marginLeft: 'auto', ...NUM, fontSize: 18, color: T.cyan, fontWeight: 500 }}>{value}<span style={{ fontFamily: T.ui, fontSize: 12, color: T.t3, fontWeight: 500, marginLeft: 4 }}>{field.unit}</span></span>
      </div>
      <div style={{ position: 'relative', height: 6, borderRadius: 3, background: '#0F1420', overflow: 'visible' }}>
        <div style={{ position: 'absolute', inset: 0, width: `${pct}%`, background: T.cyan, borderRadius: 3 }}/>
        <div style={{ position: 'absolute', left: `${pct}%`, top: '50%', transform: 'translate(-50%, -50%)', width: 16, height: 16, borderRadius: 999, background: T.cyan, boxShadow: '0 0 0 4px rgba(0,212,255,0.20)' }}/>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
        <span style={{ ...NUM, fontSize: 10, color: T.t3 }}>{field.min}</span>
        <span style={{ ...NUM, fontSize: 10, color: T.t3 }}>{field.max}{field.unit}</span>
      </div>
    </div>
  );
};

const RoutineRail = ({ routine = 'ORBIT', params }) => {
  const r = ROUTINE_TEMPLATES[routine];
  return (
    <div style={{ width: 460, background: T.panel, borderLeft: `1px solid ${T.hairline}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '16px 18px', borderBottom: `1px solid ${T.hairline}` }}>
        <div style={{ fontFamily: T.ui, fontSize: 11, color: T.t3, letterSpacing: '0.18em', fontWeight: 600, marginBottom: 10 }}>FLIGHT ROUTINE</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
          {ROUTINE_LIST.map(id => <RoutineChip key={id} id={id} active={id === routine}/>)}
        </div>
        <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 8, background: 'rgba(0,212,255,0.06)', border: `1px solid rgba(0,212,255,0.20)` }}>
          <div style={{ fontFamily: T.ui, fontSize: 12, color: T.t2, lineHeight: 1.45 }}>{r.blurb}</div>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        <div style={{ padding: '12px 18px 4px', fontFamily: T.ui, fontSize: 11, color: T.t3, letterSpacing: '0.18em', fontWeight: 600 }}>PARAMETERS</div>
        {r.paramFields.map(f => <ParamSlider key={f.key} field={f} value={params[f.key]}/>)}
        {r.paramFields.length === 0 && (
          <div style={{ padding: '20px 18px', fontFamily: T.ui, fontSize: 13, color: T.t2 }}>
            Tap the map to add waypoints. Per-waypoint params edit inline.
          </div>
        )}

        {/* Capture params */}
        <div style={{ padding: '14px 18px 6px', borderTop: `1px solid ${T.hairline}`, marginTop: 8, fontFamily: T.ui, fontSize: 11, color: T.t3, letterSpacing: '0.18em', fontWeight: 600 }}>CAPTURE</div>
        <CapRow label="Lens"        value="ZOOM 5×"   options={['WIDE','ZOOM','IR','LRF']}/>
        <CapRow label="Exposure"    value="AUTO"      options={['AUTO','M']}/>
        <CapRow label="Trigger"     value="ON WP HOVER" />
        <CapRow label="Format"      value="JPG + DNG" />
        <CapRow label="Geotag"      value="RTK + EXIF" />
      </div>

      {/* Mission summary footer */}
      <div style={{ background: T.panelHi, borderTop: `1px solid ${T.hairline}`, padding: '14px 18px' }}>
        <div style={{ fontFamily: T.ui, fontSize: 11, color: T.t3, letterSpacing: '0.18em', fontWeight: 600, marginBottom: 10 }}>MISSION SUMMARY</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10 }}>
          <Stat2 label="DURATION" value="≈14:36" sub="incl. RTH" color={T.t1}/>
          <Stat2 label="PHOTOS"   value="24"     sub="≈ 96 MB" color={T.cyan}/>
          <Stat2 label="DISTANCE" value="312 m"  sub="path"     color={T.t1}/>
          <Stat2 label="BATTERY"  value="62%"    sub="on return" color={T.green}/>
        </div>
        <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 8, background: 'rgba(16,185,129,0.08)', border: `1px solid rgba(16,185,129,0.30)`, display: 'flex', alignItems: 'center', gap: 10 }}>
          <MI name={ICON.ok} size={18} color={T.green} fill={1}/>
          <span style={{ fontFamily: T.ui, fontSize: 13, color: T.green, fontWeight: 600 }}>Ready to arm · 3 of 3 validations pass</span>
        </div>
      </div>
    </div>
  );
};

const CapRow = ({ label, value, options }) => (
  <div style={{ padding: '11px 18px', borderBottom: `1px solid ${T.hairline2}`, display: 'flex', alignItems: 'center' }}>
    <span style={{ fontFamily: T.ui, fontSize: 13, color: T.t1, fontWeight: 500 }}>{label}</span>
    <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ ...NUM, fontSize: 14, color: T.cyan, fontWeight: 500 }}>{value}</span>
      <MI name="expand_more" size={18} color={T.t3}/>
    </span>
  </div>
);

const Stat2 = ({ label, value, sub, color }) => (
  <div>
    <div style={{ fontFamily: T.ui, fontSize: 10, color: T.t3, letterSpacing: '0.14em', fontWeight: 500 }}>{label}</div>
    <div style={{ ...NUM, fontSize: 20, color: color || T.t1, fontWeight: 500, marginTop: 2 }}>{value}</div>
    <div style={{ fontFamily: T.ui, fontSize: 11, color: T.t3, marginTop: 1 }}>{sub}</div>
  </div>
);

window.BuilderTopStrip = BuilderTopStrip;
window.AssetCard = AssetCard;
window.RoutineRail = RoutineRail;
window.builderSecondary = builderSecondary;
window.builderPrimary = builderPrimary;
window.BreadcrumbStep = BreadcrumbStep;
window.BreadcrumbConnector = BreadcrumbConnector;
window.KV = KV;
window.CapRow = CapRow;
