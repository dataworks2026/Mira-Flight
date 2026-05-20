/* Mission Builder — 3 composed views */

/* === Hero: full editor with asset card + map + routine rail === */
const BuilderHero = () => (
  <div style={{ width: 2304, height: 1440, background: T.bg, color: T.t1, fontFamily: T.ui, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
    <BuilderTopStrip/>
    <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
      <AssetCard/>
      <div style={{ flex: 1, position: 'relative' }}>
        <BuilderMap routine="ORBIT" params={ROUTINE_TEMPLATES.ORBIT.defaults} mode="editor" w="100%" h="100%"/>
        {/* Floating active-asset chip on map */}
        <div style={{ position: 'absolute', top: 16, left: 16, padding: '8px 14px', borderRadius: 8, background: 'rgba(10,14,20,0.85)', border: `1px solid ${T.cyan}`, backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 8, height: 8, borderRadius: 999, background: T.cyan, boxShadow: `0 0 8px ${T.cyan}` }}/>
          <span style={{ fontFamily: T.mono, fontSize: 12, color: T.cyan, fontWeight: 600, letterSpacing: '0.12em' }}>EDITING · ORBIT · TANK-04</span>
        </div>
      </div>
      <RoutineRail routine="ORBIT" params={ROUTINE_TEMPLATES.ORBIT.defaults}/>
    </div>
  </div>
);

/* === Side state A: Asset library expanded + minimal right rail === */
const BuilderAssetPicker = () => (
  <div style={{ width: 2304, height: 1440, background: T.bg, color: T.t1, fontFamily: T.ui, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
    <BuilderTopStripPicker/>
    <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
      <AssetLibraryPanel/>
      <div style={{ flex: 1, position: 'relative' }}>
        <BuilderMap mode="picker" allAssets w="100%" h="100%"/>
        {/* Map-side hint */}
        <div style={{ position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)', padding: '10px 18px', borderRadius: 999, background: 'rgba(10,14,20,0.85)', border: `1px solid ${T.hairline}`, backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <MI name="touch_app" size={18} color={T.cyan}/>
          <span style={{ fontFamily: T.ui, fontSize: 13, color: T.t1, fontWeight: 500 }}>Tap a pin or row to load that asset's geometry</span>
        </div>
        {/* Selection callout */}
        <div style={{ position: 'absolute', top: 86, left: 240, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ width: 2, height: 60, background: T.cyan }}/>
          <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(0,212,255,0.10)', border: `1px solid ${T.cyan}`, backdropFilter: 'blur(8px)' }}>
            <div style={{ fontFamily: T.mono, fontSize: 11, color: T.cyan, fontWeight: 600, letterSpacing: '0.16em' }}>SELECTED</div>
            <div style={{ fontFamily: T.ui, fontSize: 16, color: T.t1, fontWeight: 600, marginTop: 2 }}>TANK-04 · Refinery North</div>
            <div style={{ ...NUM, fontSize: 11, color: T.t2, marginTop: 2 }}>14 days since last inspection · suggested ORBIT</div>
          </div>
        </div>
      </div>
      <PickerRightPanel/>
    </div>
  </div>
);

/* Top strip variant for picker — bread step 1 is active, not done */
const BuilderTopStripPicker = () => (
  <div style={{ height: 80, display: 'flex', alignItems: 'stretch', background: T.panel, borderBottom: `1px solid ${T.hairline}` }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '0 22px', borderRight: `1px solid ${T.hairline}` }}>
      <button style={{ width: 44, height: 44, borderRadius: 8, background: T.card, border: `1px solid ${T.hairline}`, display: 'grid', placeItems: 'center' }}>
        <MI name={ICON.back} size={22} color={T.t1}/>
      </button>
      <div style={{ width: 40, height: 40, borderRadius: 8, background: 'linear-gradient(135deg, #00D4FF 0%, #0099BD 100%)', display: 'grid', placeItems: 'center' }}>
        <MI name="route" size={22} color="#0A0E14" weight={700} fill={1}/>
      </div>
      <div>
        <div style={{ fontFamily: T.ui, fontSize: 11, color: T.t3, letterSpacing: '0.18em', fontWeight: 500 }}>NEW MISSION · STEP 1</div>
        <div style={{ fontFamily: T.ui, fontSize: 17, color: T.t1, fontWeight: 500, marginTop: 1 }}>Pick an inspection target</div>
      </div>
    </div>
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 16, padding: '0 24px' }}>
      <BreadcrumbStep n={1} label="Asset" state="active"/>
      <BreadcrumbConnector/>
      <BreadcrumbStep n={2} label="Routine" state="next"/>
      <BreadcrumbConnector/>
      <BreadcrumbStep n={3} label="Capture" state="next"/>
      <BreadcrumbConnector/>
      <BreadcrumbStep n={4} label="Preflight" state="next"/>
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
        <StatusPill tone="green" icon={<MI name={ICON.ok} size={14} color={T.green} fill={1}/>} label="GEOFENCE OK"/>
        <StatusPill tone="green" icon={<MI name="airplanemode_active" size={14} color={T.green}/>} label="LAANC OK"/>
        <StatusPill tone="amber" icon={<MI name={ICON.wind} size={14} color={T.amber}/>} label="WIND" value="5.4 m/s"/>
      </div>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 22px', borderLeft: `1px solid ${T.hairline}` }}>
      <button style={builderSecondary}>
        <MI name="close" size={18} color={T.t1}/> Cancel
      </button>
      <button style={builderPrimary}>
        Continue · Routine <MI name={ICON.skip_next} size={20} color="#0A0E14"/>
      </button>
    </div>
  </div>
);

/* Right side of picker — preview the selected asset and its suggested routines */
const PickerRightPanel = () => (
  <div style={{ width: 460, background: T.panel, borderLeft: `1px solid ${T.hairline}`, display: 'flex', flexDirection: 'column' }}>
    <div style={{ padding: '14px 18px', borderBottom: `1px solid ${T.hairline}` }}>
      <span style={{ fontFamily: T.ui, fontSize: 11, color: T.t3, letterSpacing: '0.18em', fontWeight: 600 }}>SELECTED · PREVIEW</span>
    </div>

    {/* Big asset preview */}
    <div style={{ position: 'relative', width: '100%', height: 280, background: '#0c111c', overflow: 'hidden' }}>
      <svg width="100%" height="100%" viewBox="0 0 460 280" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="prev-sky" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#1a2435"/>
            <stop offset="1" stopColor="#0c111c"/>
          </linearGradient>
          <radialGradient id="prev-top" cx="0.45" cy="0.35">
            <stop offset="0" stopColor="#6a6a6a"/><stop offset="0.6" stopColor="#3a3a3a"/><stop offset="1" stopColor="#222"/>
          </radialGradient>
        </defs>
        <rect width="460" height="280" fill="url(#prev-sky)"/>
        <ellipse cx="230" cy="230" rx="180" ry="22" fill="#2a2820"/>
        <rect x="80" y="100" width="300" height="130" fill="#3a3a3a"/>
        <ellipse cx="230" cy="100" rx="150" ry="22" fill="url(#prev-top)"/>
        {[130, 160, 190].map(y => <line key={y} x1="80" y1={y} x2="380" y2={y} stroke="#2c2c2c" strokeWidth="0.6"/>)}
        <line x1="80" y1="100" x2="80" y2="230" stroke="#2a2a2a" strokeWidth="1"/>
        <line x1="380" y1="100" x2="380" y2="230" stroke="#2a2a2a" strokeWidth="1"/>
      </svg>
      <div style={{ position: 'absolute', top: 12, left: 12, padding: '4px 10px', borderRadius: 6, background: 'rgba(0,212,255,0.18)', border: `1px solid ${T.cyan}`, color: T.cyan, fontFamily: T.mono, fontSize: 11, fontWeight: 600, letterSpacing: '0.12em' }}>TANK-04</div>
    </div>

    <div style={{ padding: '14px 18px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, rowGap: 14, borderBottom: `1px solid ${T.hairline2}` }}>
      <KV label="Dimensions"   value="h 22 m · ⌀ 48 m"/>
      <KV label="Type"         value="Floating roof"/>
      <KV label="Last inspect" value="14 days ago" color={T.amber}/>
      <KV label="Status"       value="DUE" color={T.amber}/>
      <KV label="Latitude"     value="29.7308° N" mono/>
      <KV label="Longitude"    value="95.0832° W" mono/>
    </div>

    <div style={{ flex: 1, padding: '14px 18px' }}>
      <div style={{ fontFamily: T.ui, fontSize: 11, color: T.t3, letterSpacing: '0.18em', fontWeight: 600, marginBottom: 10 }}>SUGGESTED ROUTINES</div>
      <SuggestRow id="ORBIT" reason="Roof + side walls in one orbit" rec/>
      <SuggestRow id="FACADE" reason="If you need higher detail on side seams"/>
      <SuggestRow id="MANUAL" reason="Custom path for spot inspections"/>
    </div>

    <div style={{ padding: '12px 18px', background: T.panelHi, borderTop: `1px solid ${T.hairline}`, display: 'flex', gap: 8 }}>
      <button style={{ ...builderSecondary, flex: 1, justifyContent: 'center' }}>
        <MI name="bookmark" size={16} color={T.t2}/> Recent
      </button>
      <button style={{ ...builderPrimary, flex: 1, justifyContent: 'center' }}>
        Use Tank-04 <MI name={ICON.skip_next} size={18} color="#0A0E14"/>
      </button>
    </div>
  </div>
);

const SuggestRow = ({ id, reason, rec }) => {
  const r = ROUTINE_TEMPLATES[id];
  return (
    <div style={{ padding: '12px 14px', borderRadius: 8, background: rec ? 'rgba(0,212,255,0.08)' : T.card, border: `1px solid ${rec ? T.cyan : T.hairline}`, display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
      <div style={{ width: 36, height: 36, borderRadius: 6, background: rec ? 'rgba(0,212,255,0.14)' : T.cardHi, display: 'grid', placeItems: 'center' }}>
        <MI name={r.icon} size={18} color={rec ? T.cyan : T.t2}/>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontFamily: T.ui, fontSize: 14, color: T.t1, fontWeight: 600 }}>{r.name}</span>
          {rec && <span style={{ padding: '1px 6px', borderRadius: 4, background: T.cyan, color: '#0A0E14', fontFamily: T.mono, fontSize: 9, fontWeight: 700, letterSpacing: '0.10em' }}>RECOMMENDED</span>}
        </div>
        <div style={{ fontFamily: T.ui, fontSize: 12, color: T.t2, marginTop: 2 }}>{reason}</div>
      </div>
      <MI name="chevron_right" size={20} color={T.t3}/>
    </div>
  );
};

/* === Side state B: Hero map (smaller) + timeline at the bottom + stage inspector === */
const BuilderTimelineView = () => (
  <div style={{ width: 2304, height: 1440, background: T.bg, color: T.t1, fontFamily: T.ui, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
    <BuilderTopStrip/>
    <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
      <AssetCard/>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
          <BuilderMap routine="ORBIT" params={ROUTINE_TEMPLATES.ORBIT.defaults} mode="editor" w="100%" h="100%"/>
          {/* Routine label */}
          <div style={{ position: 'absolute', top: 16, left: 16, padding: '8px 14px', borderRadius: 8, background: 'rgba(10,14,20,0.85)', border: `1px solid ${T.cyan}`, backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 8, height: 8, borderRadius: 999, background: T.cyan, boxShadow: `0 0 8px ${T.cyan}` }}/>
            <span style={{ fontFamily: T.mono, fontSize: 12, color: T.cyan, fontWeight: 600, letterSpacing: '0.12em' }}>EDITING · STAGE 05 · ORBIT</span>
          </div>
          {/* Tiny note pinned to the orbit on map */}
          <div style={{ position: 'absolute', top: 60, right: 86, padding: '8px 12px', borderRadius: 8, background: 'rgba(245,158,11,0.10)', border: `1px solid ${T.amber}`, backdropFilter: 'blur(8px)', maxWidth: 260 }}>
            <div style={{ fontFamily: T.mono, fontSize: 10, color: T.amber, fontWeight: 700, letterSpacing: '0.16em' }}>TIMELINE VIEW</div>
            <div style={{ fontFamily: T.ui, fontSize: 12, color: T.t1, marginTop: 4, lineHeight: 1.4 }}>Editing the entire flight as a sequence of stages. Add transit waypoints, change camera mode mid-orbit, splice in custom captures.</div>
          </div>
        </div>
        <TimelineTrack activeStageId="orbit"/>
      </div>
      <StageInspector stage={ORBIT_STAGES[4]}/>
    </div>
  </div>
);

window.BuilderHero = BuilderHero;
window.BuilderAssetPicker = BuilderAssetPicker;
window.BuilderTimelineView = BuilderTimelineView;
