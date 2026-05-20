/* Feature parity checklist — Mira HUD vs DJI Pilot 2 / Skydio Cloud / Auterion / ATAK */

const F = (have, label, note) => ({ have, label, note });

const FEATURES = [
  { group: 'Flight telemetry · always visible', items: [
    F(true,  'Altitude AGL', 'hero · 48 px mono'),
    F(true,  'Altitude MSL', 'subtitle under AGL'),
    F(true,  'Ground speed', 'hero · 48 px mono'),
    F(true,  'Vertical speed (climb/descent rate)', '+/− m/s'),
    F(true,  'Heading (true)', 'with compass icon'),
    F(true,  'Gimbal pitch + yaw', 'video overlay + rail'),
    F(true,  'Home distance + bearing', 'rail tape'),
    F(true,  'Battery % + voltage + temp', 'kill-clock w/ thresholds'),
    F(true,  'GPS fix + satellite count + RTK state', 'bottom of rail'),
    F(true,  'RC link strength (dBm)', 'bottom of rail + top pill'),
    F(true,  'Wind speed + direction', 'top strip pill · need source from M350 estimator'),
    F(false, 'Estimated time-to-empty (battery)', 'shown as RTH ETA — add explicit minutes'),
    F(false, 'Pitch + roll attitude indicator', 'consider artificial horizon in alt layout'),
  ]},

  { group: 'Camera / payload', items: [
    F(true,  'Lens picker (Wide / Zoom / IR / LRF)', 'matches CameraLens enum'),
    F(true,  'Zoom slider with current x value', '60×440 right edge'),
    F(true,  'Exposure (ISO · shutter · EV · ƒ)', 'mono chip top-left'),
    F(true,  'Recording indicator + REC timer', 'red chip'),
    F(true,  'Photo counter + total expected', '23 / 24'),
    F(true,  'SD storage remaining', 'chip top-left'),
    F(true,  'Histogram', 'top-center mini'),
    F(true,  'Gimbal pitch readout on video', 'bottom-right'),
    F(true,  'Manual photo trigger', 'add to overlay (single shutter button)'),
    F(false, 'Focus area / focus peaking', 'DJI has it · low priority for autonomous routine'),
    F(false, 'Spot meter / scene meter', 'auto-routine doesn’t need'),
    F(false, 'Live AR target label on inspection subject', 'DJI doesn’t have this — Mira specific advantage'),
    F(false, 'Video bitrate / quality indicator', 'add small chip near REC'),
  ]},

  { group: 'Map awareness', items: [
    F(true,  'Real satellite tiles (Esri placeholder)', 'swap to Google/Mapbox in prod'),
    F(true,  'Drone marker with heading cone', '6 options in asset library'),
    F(true,  'Mission path (planned + completed)', 'cyan = planned · green = flown'),
    F(true,  'Waypoint markers (done / current / next)', 'state-based colors'),
    F(true,  'Home pad marker', 'green H badge'),
    F(true,  'Standoff ring around asset', 'cyan dashed'),
    F(true,  'Geofence overlay', '6 pattern options in asset library'),
    F(true,  'Map scale + compass rose', 'corners'),
    F(true,  'PiP swap (map ↔ video)', 'single swap icon'),
    F(true,  'Tap-to-recenter on drone', 'my_location button'),
    F(false, 'ADS-B nearby aircraft', 'add later · marker designed'),
    F(false, 'TFR / airspace overlay', 'LAANC integration · marker designed'),
    F(false, 'No-fly zone overlay', 'pattern in asset library'),
    F(false, 'Predicted flight path (next 5 s)', 'Auterion has this — useful for inspection routines'),
    F(false, 'Weather radar / cloud cover overlay', 'nice-to-have'),
  ]},

  { group: 'Mission state', items: [
    F(true,  'Mission progress (waypoints, %, photos)', 'right panel hero'),
    F(true,  'Routine name + params summary', 'sub-section'),
    F(true,  'Waypoint list with current highlight', 'scrolls · 5 visible'),
    F(true,  'Elapsed + remaining ETA', 'mono'),
    F(true,  'Upload queue indicator', 'amber chip top-right of video'),
    F(true,  'Mission state pill (FLYING / PAUSED / RTH …)', 'top strip'),
    F(true,  'Cloud sync status', 'top-strip pill'),
    F(false, 'Waypoint reach radius indicator', 'optional · low priority'),
    F(false, 'Per-waypoint capture preview thumbs', 'consider for review screen instead'),
  ]},

  { group: 'Emergency / flight control', items: [
    F(true,  'Pause (single tap)', 'engine.pause()'),
    F(true,  'Resume', 'engine.resume()'),
    F(true,  'Skip waypoint', 'arrow button'),
    F(true,  'Retry waypoint', 'toast action'),
    F(true,  'RTH (Smart, hold-to-confirm)', 'with path preview modal'),
    F(true,  'RTH direct path', 'long-press RTH'),
    F(true,  'Land here (hold-to-confirm)', 'modal w/ surface check'),
    F(true,  'Abort mission (hold-to-confirm)', 'modal'),
    F(true,  'Emergency stop · cut motors', 'hold 3 s + acknowledge'),
    F(true,  'Manual override (take stick control)', 'purple · hold 1 s'),
    F(true,  'Change altitude mid-mission', 'modal with slider'),
    F(true,  'Auto-RTH on low battery', '25% · 10 s pilot grace'),
    F(true,  'Auto-LAND on critical battery', '15% · non-cancelable'),
    F(true,  'RC link-loss failsafe', '5 s timeout → RTH'),
    F(true,  'GPS-loss banner', 'attitude mode banner'),
    F(true,  'Geofence breach handler', 'hover at boundary'),
    F(true,  'Obstacle detected banner', 'brake + prompt'),
    F(true,  'Photo capture-failure toast', 'retry / skip'),
    F(false, 'Smart RTH avoiding mapped obstacles', 'DJI APAS — phase 2'),
    F(false, 'Operator handover (pass control to another GCS)', 'multi-pilot ops — phase 2'),
  ]},

  { group: 'Identity / chrome', items: [
    F(true,  'Mission name + asset', 'top-strip left'),
    F(true,  'T+ flight timer', 'top-strip'),
    F(true,  'ETA to mission end', 'top-strip'),
    F(true,  'Operator identity + initials', 'top-strip right'),
    F(true,  'Drone link health pill', 'top-strip'),
    F(true,  'RTK health pill', 'top-strip'),
    F(true,  'Wind pill', 'top-strip'),
    F(true,  'Cloud sync pill', 'top-strip'),
    F(true,  'Notices / warnings badge', 'top-strip · 1 NOTICE'),
    F(false, 'Audio comms button', 'phase 2'),
    F(false, 'Screen recording indicator', 'phase 2'),
  ]},
];

const FeatureRow = ({ f }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 16px', borderBottom: `1px solid ${T.hairline2}`, background: f.have ? 'transparent' : 'rgba(245,158,11,0.04)' }}>
    <div style={{
      width: 24, height: 24, borderRadius: 6,
      background: f.have ? T.green : 'transparent',
      border: f.have ? `1px solid ${T.green}` : `1.5px solid ${T.amber}`,
      display: 'grid', placeItems: 'center', flexShrink: 0,
    }}>
      {f.have && <MI name="check" size={16} color="#0A0E14" weight={700}/>}
      {!f.have && <MI name="add" size={14} color={T.amber}/>}
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontFamily: T.ui, fontSize: 14, color: f.have ? T.t1 : T.amber, fontWeight: f.have ? 400 : 600 }}>{f.label}</div>
      <div style={{ fontFamily: T.mono, fontSize: 11, color: T.t3, marginTop: 1 }}>{f.note}</div>
    </div>
  </div>
);

const Features = () => {
  const totalHave = FEATURES.reduce((a, g) => a + g.items.filter(i => i.have).length, 0);
  const totalAdd  = FEATURES.reduce((a, g) => a + g.items.filter(i => !i.have).length, 0);
  return (
    <div style={{ width: 2304, minHeight: 1440, background: T.bg, padding: '60px 80px', fontFamily: T.ui, color: T.t1 }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 13, color: T.cyan, letterSpacing: '0.22em', fontWeight: 600, marginBottom: 12 }}>FEATURE PARITY · MIRA HUD vs DJI PILOT 2 / SKYDIO / AUTERION</div>
        <div style={{ fontSize: 48, fontWeight: 500, letterSpacing: '-0.02em', marginBottom: 10 }}>What's in this design, what's still on the list</div>
        <div style={{ display: 'flex', gap: 20, marginTop: 14 }}>
          <Stat label="IN DESIGN" value={totalHave} color={T.green}/>
          <Stat label="ON BACKLOG" value={totalAdd} color={T.amber}/>
          <Stat label="GROUPS" value={FEATURES.length} color={T.cyan}/>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {FEATURES.map(g => (
          <div key={g.group} style={{ background: T.panel, border: `1px solid ${T.hairline}`, borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', background: T.panelHi, borderBottom: `1px solid ${T.hairline}`, display: 'flex', alignItems: 'baseline' }}>
              <div style={{ fontFamily: T.ui, fontSize: 14, color: T.t1, fontWeight: 600, letterSpacing: '0.04em' }}>{g.group}</div>
              <div style={{ marginLeft: 'auto', fontFamily: T.mono, fontSize: 11, color: T.t3 }}>
                <span style={{ color: T.green }}>{g.items.filter(i => i.have).length}</span> / {g.items.length}
              </div>
            </div>
            <div>
              {g.items.map((f, i) => <FeatureRow key={i} f={f}/>)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const Stat = ({ label, value, color }) => (
  <div style={{ padding: '10px 18px', background: T.panel, border: `1px solid ${T.hairline}`, borderLeft: `3px solid ${color}`, borderRadius: 8, minWidth: 150 }}>
    <div style={{ fontFamily: T.ui, fontSize: 11, color: T.t3, letterSpacing: '0.16em', fontWeight: 500 }}>{label}</div>
    <div style={{ ...NUM, color: color, fontSize: 28, fontWeight: 500, marginTop: 2 }}>{value}</div>
  </div>
);

window.Features = Features;
window.FEATURES = FEATURES;
