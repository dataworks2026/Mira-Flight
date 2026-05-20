/* Composes the HUD layout — used by main / anatomy / alt artboards */

const HudMain = ({ alt = false }) => (
  <div style={{
    width: 2304, height: 1440, background: T.bg, color: T.t1,
    fontFamily: T.ui, display: 'flex', flexDirection: 'column', overflow: 'hidden',
  }}>
    <TopStrip />
    <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
      <TelemRail />
      <div style={{ flex: 1, position: 'relative', background: '#000' }}>
        {alt ? <CenterMapPrimary/> : <CenterVideoPrimary/>}
      </div>
      <MissionPanel />
    </div>
  </div>
);

/* Video primary — map PiP bottom-left */
const CenterVideoPrimary = () => (
  <>
    <VideoView w="100%" h="100%" primary />
    <VideoOverlay />
    <div style={{ position: 'absolute', left: 24, bottom: 24, width: 520, height: 380 }}>
      <MapView w="100%" h="100%" label="MAP" tileZ={17} tileX={30880} tileY={54129} cols={3} rows={2}/>
      <button style={{
        position: 'absolute', top: 8, right: 8, width: 40, height: 40, borderRadius: 8,
        background: 'rgba(10,14,20,0.85)', border: `1px solid ${T.hairline}`, color: T.t1,
        display: 'grid', placeItems: 'center', cursor: 'pointer', backdropFilter: 'blur(6px)',
      }}>
        <MI name={ICON.swap} size={18} color={T.cyan}/>
      </button>
    </div>
  </>
);

/* Map primary — video PiP bottom-right */
const CenterMapPrimary = () => (
  <>
    <MapView w="100%" h="100%" primary label="MAP" tileZ={17} tileX={30876} tileY={54126} cols={8} rows={6}/>
    {/* video PiP */}
    <div style={{ position: 'absolute', right: 24, bottom: 24, width: 560, height: 340 }}>
      <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: 12, overflow: 'hidden', border: `1px solid ${T.hairline}`, boxShadow: '0 12px 30px rgba(0,0,0,0.6)' }}>
        <VideoView w="100%" h="100%" primary={false} />
        <div style={{ position: 'absolute', top: 10, left: 12, display: 'flex', gap: 8, alignItems: 'center', padding: '4px 10px', background: 'rgba(10,14,20,0.6)', borderRadius: 4 }}>
          <span style={{ width: 6, height: 6, borderRadius: 999, background: T.red }}/>
          <span style={{ fontFamily: T.ui, fontSize: 11, fontWeight: 600, color: T.t1, letterSpacing: '0.14em' }}>REC · ZOOM 12×</span>
        </div>
        <button style={{
          position: 'absolute', top: 8, right: 8, width: 40, height: 40, borderRadius: 8,
          background: 'rgba(10,14,20,0.85)', border: `1px solid ${T.hairline}`, color: T.t1,
          display: 'grid', placeItems: 'center', cursor: 'pointer', backdropFilter: 'blur(6px)',
        }}>
          <MI name={ICON.swap} size={18} color={T.cyan}/>
        </button>
      </div>
    </div>

    {/* Map controls */}
    <div style={{ position: 'absolute', top: 24, right: 24, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <button style={mapCtrl}>＋</button>
      <button style={mapCtrl}>−</button>
      <button style={mapCtrl}><MI name={ICON.layers} size={20} color={T.t1}/></button>
      <button style={mapCtrl}><MI name={ICON.geofence} size={20} color={T.amber}/></button>
      <button style={mapCtrl}><MI name="my_location" size={20} color={T.cyan}/></button>
    </div>

    {/* Bottom context strip */}
    <div style={{
      position: 'absolute', left: 24, bottom: 24, padding: '14px 20px', borderRadius: 12,
      background: 'rgba(10,14,20,0.85)', border: `1px solid ${T.hairline}`, backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', gap: 22,
    }}>
      <div><div style={{ fontFamily: T.ui, fontSize: 10, color: T.t3, letterSpacing: '0.16em', fontWeight: 500 }}>NEXT WP</div><div style={{ ...NUM, color: T.t1, fontSize: 16, fontWeight: 500, marginTop: 2 }}>08 · 42 m · 225°</div></div>
      <div style={{ width: 1, height: 32, background: T.hairline }}/>
      <div><div style={{ fontFamily: T.ui, fontSize: 10, color: T.t3, letterSpacing: '0.16em', fontWeight: 500 }}>HOME</div><div style={{ ...NUM, color: T.t1, fontSize: 16, fontWeight: 500, marginTop: 2 }}>124 m · 142°</div></div>
      <div style={{ width: 1, height: 32, background: T.hairline }}/>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <MI name={ICON.geofence} size={16} color={T.green}/>
        <div><div style={{ fontFamily: T.ui, fontSize: 10, color: T.t3, letterSpacing: '0.16em', fontWeight: 500 }}>GEOFENCE</div><div style={{ ...NUM, color: T.green, fontSize: 16, fontWeight: 500, marginTop: 2 }}>OK · 312 m clearance</div></div>
      </div>
      <div style={{ width: 1, height: 32, background: T.hairline }}/>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <MI name={ICON.airspace} size={16} color={T.green}/>
        <div><div style={{ fontFamily: T.ui, fontSize: 10, color: T.t3, letterSpacing: '0.16em', fontWeight: 500 }}>AIRSPACE</div><div style={{ ...NUM, color: T.green, fontSize: 16, fontWeight: 500, marginTop: 2 }}>Class G · LAANC OK</div></div>
      </div>
    </div>
  </>
);

const mapCtrl = {
  width: 44, height: 44, borderRadius: 8,
  background: 'rgba(10,14,20,0.85)', border: `1px solid ${T.hairline}`,
  color: T.t1, fontFamily: T.ui, fontSize: 20, fontWeight: 500,
  display: 'grid', placeItems: 'center', cursor: 'pointer',
  backdropFilter: 'blur(8px)',
};

window.HudMain = HudMain;
window.CenterVideoPrimary = CenterVideoPrimary;
window.CenterMapPrimary = CenterMapPrimary;
window.mapCtrl = mapCtrl;
