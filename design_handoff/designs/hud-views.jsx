/* Map + video views — Esri World Imagery tiles as real satellite placeholder */

/* ===== Real satellite tiles =====
   Service: Esri World Imagery (public XYZ tiles, no API key)
   Pattern: https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}
   You can swap this provider with: Mapbox Static API, Google Static Maps, MapTiler, etc.
   The tile coords below are pinned to an industrial-infrastructure area (Houston Ship Channel)
   so the visual reads as a real inspection site with tanks, pipes, and access roads.
*/
const TILE_BASE = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile';

const EsriTileGrid = ({ z, x, y, cols, rows, size = 256, style }) => (
  <div style={{
    width: cols * size, height: rows * size,
    display: 'grid',
    gridTemplateColumns: `repeat(${cols}, ${size}px)`,
    gridTemplateRows: `repeat(${rows}, ${size}px)`,
    background: '#0c111c',
    ...style,
  }}>
    {Array.from({ length: rows * cols }).map((_, i) => {
      const dx = i % cols;
      const dy = Math.floor(i / cols);
      const url = `${TILE_BASE}/${z}/${y + dy}/${x + dx}`;
      return <img key={i} src={url} width={size} height={size} style={{ display: 'block' }} alt="" loading="lazy"/>;
    })}
  </div>
);

/* Map view — fills its container. Tile selection adapts to size. */
const MapView = ({ w, h, primary = false, label = 'MAP', tileZ = 17, tileX = 30880, tileY = 54129, cols = 6, rows = 4 }) => (
  <div style={{
    width: w, height: h, position: 'relative', overflow: 'hidden',
    borderRadius: primary ? 0 : 12,
    border: primary ? 'none' : `1px solid ${T.hairline}`,
    boxShadow: primary ? 'none' : '0 12px 30px rgba(0,0,0,0.5)',
    background: '#0c111c',
  }}>
    {/* Tile layer */}
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <EsriTileGrid z={tileZ} x={tileX} y={tileY} cols={cols} rows={rows} style={{
        position: 'absolute',
        left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
        filter: 'saturate(1.05) brightness(0.92) contrast(1.04)',
      }}/>
      {/* dark vignette to match dark UI */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(120% 90% at 50% 50%, transparent 60%, rgba(10,14,20,0.45) 100%)' }}/>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(10,14,20,0.18), transparent 30%, transparent 70%, rgba(10,14,20,0.18))' }}/>
    </div>

    {/* === Geofence (cylindrical airspace) === */}
    <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      <defs>
        <pattern id={`gf-${label}`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" stroke={T.amber} strokeWidth="0.6" opacity="0.6"/>
        </pattern>
      </defs>
      <rect x="6" y="6" width="88" height="88" fill={`url(#gf-${label})`} opacity="0.35"/>
      <rect x="6" y="6" width="88" height="88" fill="none" stroke={T.amber} strokeWidth="0.4" strokeDasharray="1.5 1"/>
    </svg>

    {/* === Asset footprint, mission path, waypoints, drone === */}
    <svg width="100%" height="100%" viewBox="0 0 520 380" preserveAspectRatio="xMidYMid slice" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {/* asset standoff ring */}
      <circle cx="270" cy="200" r="86" fill="rgba(0,212,255,0.06)" stroke="rgba(0,212,255,0.5)" strokeDasharray="4 4" strokeWidth="1.5"/>
      <circle cx="270" cy="200" r="38" fill="rgba(148,163,184,0.10)" stroke="rgba(148,163,184,0.3)" strokeWidth="1"/>
      <text x="270" y="204" fill={T.t1} fontSize="11" textAnchor="middle" fontFamily="Roboto" fontWeight="500" letterSpacing="0.1em">TANK 04</text>

      {/* orbit path */}
      <ellipse cx="270" cy="200" rx="86" ry="64" fill="none" stroke={T.cyan} strokeWidth="2.5" opacity="0.9"/>
      {/* completed arc */}
      <path d="M 356 200 A 86 64 0 0 1 270 264 A 86 64 0 0 1 184 200" fill="none" stroke={T.green} strokeWidth="3.5" opacity="0.95"/>

      {/* completed waypoints */}
      {[[356,200],[343,232],[311,256],[270,264],[229,256],[197,232]].map(([x,y],i) => (
        <g key={'c'+i}><circle cx={x} cy={y} r="6" fill={T.green} stroke="#0A0E14" strokeWidth="2"/></g>
      ))}
      {/* current WP */}
      <circle cx="184" cy="200" r="13" fill="none" stroke={T.cyan} strokeWidth="2" opacity="0.55"/>
      <circle cx="184" cy="200" r="7" fill={T.cyan} stroke="#0A0E14" strokeWidth="2"/>
      {/* upcoming */}
      {[[197,168],[229,144],[270,136],[311,144],[343,168]].map(([x,y],i) => (
        <circle key={'u'+i} cx={x} cy={y} r="5" fill="#1A2030" stroke={T.t1} strokeWidth="1.5" opacity="0.85"/>
      ))}
      {/* Home pad */}
      <g transform="translate(70, 320)">
        <rect x="-13" y="-13" width="26" height="26" rx="4" fill="rgba(16,185,129,0.25)" stroke={T.green} strokeWidth="1.5"/>
        <text x="0" y="4" fill={T.green} fontSize="13" textAnchor="middle" fontWeight="700" fontFamily="Roboto">H</text>
      </g>

      {/* === Drone marker — top-down quadcopter with heading arrow === */}
      <g transform="translate(184, 200) rotate(-90)">
        <circle r="22" fill="rgba(0,212,255,0.10)" stroke="rgba(0,212,255,0.5)" strokeWidth="1"/>
        {/* heading cone */}
        <path d="M0 -22 L8 -8 L-8 -8 Z" fill={T.cyan} opacity="0.85"/>
        {/* body */}
        <circle r="6" fill={T.cyan} stroke="#0A0E14" strokeWidth="1.5"/>
        {/* arms */}
        <line x1="-9" y1="-9" x2="-14" y2="-14" stroke="#0A0E14" strokeWidth="2.5"/>
        <line x1="9" y1="-9" x2="14" y2="-14" stroke="#0A0E14" strokeWidth="2.5"/>
        <line x1="-9" y1="9" x2="-14" y2="14" stroke="#0A0E14" strokeWidth="2.5"/>
        <line x1="9" y1="9" x2="14" y2="14" stroke="#0A0E14" strokeWidth="2.5"/>
        {/* rotors */}
        <circle cx="-14" cy="-14" r="3.5" fill="#0A0E14" stroke={T.cyan} strokeWidth="1"/>
        <circle cx="14" cy="-14" r="3.5" fill="#0A0E14" stroke={T.cyan} strokeWidth="1"/>
        <circle cx="-14" cy="14" r="3.5" fill="#0A0E14" stroke={T.cyan} strokeWidth="1"/>
        <circle cx="14" cy="14" r="3.5" fill="#0A0E14" stroke={T.cyan} strokeWidth="1"/>
      </g>
    </svg>

    {/* Compass */}
    <div style={{
      position: 'absolute', top: 12, right: 12, width: 44, height: 44, borderRadius: 999,
      background: 'rgba(10,14,20,0.78)', border: `1px solid ${T.hairline}`, backdropFilter: 'blur(6px)',
      display: 'grid', placeItems: 'center', color: T.t1,
      fontFamily: T.ui, fontSize: 14, fontWeight: 700,
    }}>
      <MI name={ICON.heading} size={18} color={T.cyan} fill={1}/>
    </div>

    {/* Scale */}
    <div style={{ position: 'absolute', left: 12, bottom: 12, display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px', background: 'rgba(10,14,20,0.6)', borderRadius: 4, backdropFilter: 'blur(4px)' }}>
      <div style={{ width: 50, height: 3, background: T.t1, borderRadius: 1 }}/>
      <span style={{ ...NUM, color: T.t1, fontSize: 12 }}>20 m</span>
    </div>

    {/* Attribution */}
    <div style={{ position: 'absolute', right: 8, bottom: 6, fontFamily: T.ui, fontSize: 9, color: 'rgba(248,250,252,0.5)', letterSpacing: '0.04em' }}>
      Esri · Maxar · placeholder
    </div>

    {/* corner label */}
    {!primary && (
      <div style={{ position: 'absolute', top: 10, left: 12, display: 'flex', gap: 6, alignItems: 'center', padding: '4px 10px', background: 'rgba(10,14,20,0.6)', borderRadius: 4 }}>
        <span style={{ width: 6, height: 6, borderRadius: 999, background: T.cyan }}/>
        <span style={{ fontFamily: T.ui, fontSize: 11, fontWeight: 600, color: T.t1, letterSpacing: '0.16em' }}>{label}</span>
      </div>
    )}
  </div>
);

/* === Video feed placeholder — kept as SVG; in production this is the WebRTC/RTSP stream === */
const VideoView = ({ w, h, primary = true }) => (
  <div style={{
    width: w, height: h, position: 'relative', overflow: 'hidden',
    borderRadius: primary ? 0 : 12,
    border: primary ? 'none' : `1px solid ${T.hairline}`,
    background: '#070A0F',
  }}>
    <div style={{
      position: 'absolute', inset: 0,
      background:
        'linear-gradient(180deg, #1a2435 0%, #1e2b3f 28%, #2a3245 45%, #3a3a3e 55%, #2a2520 70%, #1a160f 100%)',
    }}/>
    <div style={{
      position: 'absolute', top: '12%', right: '18%', width: 320, height: 220,
      borderRadius: '50%',
      background: 'radial-gradient(closest-side, rgba(255,200,140,0.18), transparent 70%)',
      filter: 'blur(8px)',
    }}/>
    <svg width="100%" height="100%" viewBox="0 0 1584 1010" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0 }}>
      <path d="M0 540 Q300 480 600 510 T1200 490 T1584 500 V560 H0 Z" fill="#1c2230" opacity="0.7"/>
      <path d="M0 560 Q200 540 460 555 T900 545 T1584 558 V580 H0 Z" fill="#161c28" opacity="0.85"/>
      <path d="M 200 1010 L 280 600 L 1300 580 L 1400 1010 Z" fill="#2c2a26"/>
      <defs>
        <linearGradient id="padGrad2" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#363229"/>
          <stop offset="1" stopColor="#1a1810"/>
        </linearGradient>
        <radialGradient id="tankTop2" cx="0.45" cy="0.35">
          <stop offset="0" stopColor="#6a6a6a"/>
          <stop offset="0.7" stopColor="#3a3a3a"/>
          <stop offset="1" stopColor="#2a2a2a"/>
        </radialGradient>
      </defs>
      <path d="M 200 1010 L 280 600 L 1300 580 L 1400 1010 Z" fill="url(#padGrad2)" opacity="0.5"/>
      <ellipse cx="780" cy="780" rx="500" ry="140" fill="#2a2820" stroke="#403c30" strokeWidth="2"/>
      <ellipse cx="780" cy="780" rx="495" ry="135" fill="none" stroke="#1a180f" strokeWidth="1"/>
      <ellipse cx="780" cy="700" rx="380" ry="100" fill="#3a3a3a"/>
      <ellipse cx="780" cy="700" rx="380" ry="100" fill="url(#tankTop2)"/>
      <ellipse cx="780" cy="700" rx="260" ry="68" fill="none" stroke="#2c2c2c" strokeWidth="1"/>
      <ellipse cx="780" cy="700" rx="140" ry="36" fill="none" stroke="#2c2c2c" strokeWidth="1"/>
      <line x1="400" y1="700" x2="1160" y2="700" stroke="#2c2c2c" strokeWidth="1"/>
      <line x1="780" y1="600" x2="780" y2="800" stroke="#2c2c2c" strokeWidth="1"/>
      <circle cx="780" cy="700" r="22" fill="#1c1c1c" stroke="#5a5a5a" strokeWidth="1.5"/>
      <circle cx="780" cy="700" r="10" fill="#0e0e0e"/>
      <rect x="280" y="820" width="1020" height="14" fill="#444"/>
      <rect x="280" y="820" width="1020" height="3" fill="#666"/>
      <rect x="280" y="860" width="1020" height="10" fill="#3a3a3a"/>
      <ellipse cx="380" cy="560" rx="50" ry="14" fill="#2e2e2e"/>
      <ellipse cx="1220" cy="558" rx="46" ry="13" fill="#2e2e2e"/>
    </svg>

    {/* Center reticle (Material crosshair-ish) */}
    <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none' }}>
      <MI name={ICON.reticle} size={64} color="rgba(255,255,255,0.35)" weight={300}/>
    </div>

    {/* AR target label */}
    <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} width="100%" height="100%" viewBox="0 0 1584 1010" preserveAspectRatio="none">
      <circle cx="780" cy="700" r="40" fill="none" stroke={T.cyan} strokeWidth="2" opacity="0.9"/>
      <circle cx="780" cy="700" r="3" fill={T.cyan}/>
      <line x1="816" y1="700" x2="920" y2="630" stroke={T.cyan} strokeWidth="1.5" opacity="0.8"/>
      <rect x="920" y="600" width="240" height="62" rx="8" fill="rgba(10,14,20,0.85)" stroke={T.cyan} strokeWidth="1"/>
      <text x="936" y="624" fill={T.t2} fontSize="13" fontFamily="Roboto" fontWeight="500" letterSpacing="0.14em">TARGET · WP 07</text>
      <text x="936" y="650" fill={T.t1} fontSize="18" fontFamily="Roboto" fontWeight="500">Tank-04 manhole</text>
    </svg>

    <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(120% 90% at 50% 50%, transparent 55%, rgba(0,0,0,0.5) 100%)' }}/>
  </div>
);

/* Video chrome — lens chip, exposure, REC, capture count, lens picker, zoom slider, gimbal */
const VideoOverlay = () => (
  <>
    <div style={{ position: 'absolute', top: 24, left: 24, display: 'flex', gap: 10 }}>
      <Chip><MI name={ICON.video} size={18} color={T.cyan} weight={500}/> ZOOM 12×</Chip>
      <Chip mono>ISO 200 · 1/2000 · ƒ2.8</Chip>
      <Chip tone="red"><span style={{ width: 8, height: 8, borderRadius: 999, background: T.red }}/> REC <span style={{ ...NUM, color: T.t2, fontWeight: 500, marginLeft: 4 }}>00:04:21</span></Chip>
      <Chip><MI name="sd_storage" size={18} color={T.t2} weight={500}/> <span style={{ ...NUM }}>62.4</span><span style={{ color: T.t3 }}>/128 GB</span></Chip>
    </div>

    <div style={{ position: 'absolute', top: 24, right: 24, display: 'flex', gap: 10 }}>
      <Chip><MI name={ICON.photo} size={18} color={T.cyan} weight={500}/> <span style={{ ...NUM, fontWeight: 600 }}>23</span><span style={{ color: T.t3 }}>/ 24</span></Chip>
      <Chip><MI name={ICON.upload} size={18} color={T.amber} weight={500}/> <span style={{ ...NUM }}>3</span><span style={{ color: T.t3 }}> queued</span></Chip>
      <LensPicker active="ZOOM"/>
    </div>

    {/* Zoom slider */}
    <div style={{
      position: 'absolute', top: '50%', right: 28, transform: 'translateY(-50%)',
      width: 60, height: 440, borderRadius: 12,
      background: 'rgba(10,14,20,0.65)', border: `1px solid ${T.hairline}`, backdropFilter: 'blur(8px)',
      padding: '14px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <div style={{ ...NUM, color: T.cyan, fontSize: 18, fontWeight: 600 }}>12×</div>
      <div style={{ flex: 1, width: 4, background: T.hairline, borderRadius: 2, position: 'relative', margin: '12px 0' }}>
        <div style={{ position: 'absolute', left: -2, right: -2, top: '32%', height: 4, background: T.cyan, borderRadius: 2 }}/>
        <div style={{ position: 'absolute', left: -10, right: -10, top: 'calc(32% - 10px)', height: 24, borderRadius: 12, background: T.cyan, boxShadow: `0 0 0 4px rgba(0,212,255,0.2)` }}/>
        {[0, 25, 50, 75, 100].map((p, i) => (
          <div key={i} style={{ position: 'absolute', left: -8, top: `${p}%`, width: 16, height: 1, background: T.t3 }}/>
        ))}
      </div>
      <div style={{ ...NUM, color: T.t3, fontSize: 12 }}>1×</div>
    </div>

    {/* Gimbal pitch readout */}
    <div style={{
      position: 'absolute', bottom: 24, right: 24,
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 18px', borderRadius: 10,
      background: 'rgba(10,14,20,0.78)', border: `1px solid ${T.hairline}`, backdropFilter: 'blur(8px)',
    }}>
      <MI name={ICON.gimbal} size={20} color={T.t2} weight={500}/>
      <span style={{ fontFamily: T.ui, fontSize: 12, color: T.t3, letterSpacing: '0.14em', fontWeight: 500 }}>GIMBAL</span>
      <span style={{ ...NUM, color: T.t1, fontSize: 18, fontWeight: 500 }}>−45.0°</span>
      <span style={{ width: 1, height: 18, background: T.hairline }}/>
      <span style={{ fontFamily: T.ui, fontSize: 12, color: T.t3, letterSpacing: '0.14em', fontWeight: 500 }}>YAW</span>
      <span style={{ ...NUM, color: T.t1, fontSize: 18, fontWeight: 500 }}>+12.0°</span>
    </div>

    {/* Histogram (small, top-center) */}
    <div style={{
      position: 'absolute', top: 24, left: '50%', transform: 'translateX(-50%)',
      width: 200, height: 56, padding: '8px 12px', borderRadius: 10,
      background: 'rgba(10,14,20,0.78)', border: `1px solid ${T.hairline}`, backdropFilter: 'blur(8px)',
      display: 'flex', flexDirection: 'column', gap: 4,
    }}>
      <div style={{ fontFamily: T.ui, fontSize: 10, color: T.t3, letterSpacing: '0.16em', fontWeight: 500 }}>HISTOGRAM</div>
      <svg viewBox="0 0 100 24" preserveAspectRatio="none" width="100%" height="24">
        <path d="M 0 24 L 5 22 L 10 18 L 15 12 L 22 8 L 30 6 L 38 9 L 48 14 L 58 11 L 68 7 L 76 9 L 84 13 L 92 18 L 100 24 Z" fill={T.cyan} opacity="0.7"/>
      </svg>
    </div>
  </>
);

const Chip = ({ children, mono, tone }) => {
  const bgMap = tone === 'red' ? 'rgba(239,68,68,0.12)' : 'rgba(10,14,20,0.78)';
  const bdMap = tone === 'red' ? 'rgba(239,68,68,0.4)' : T.hairline;
  const fgMap = tone === 'red' ? T.red : T.t1;
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 8,
      padding: '10px 14px', borderRadius: 8,
      background: bgMap, border: `1px solid ${bdMap}`,
      backdropFilter: 'blur(8px)',
      color: fgMap, fontFamily: mono ? T.mono : T.ui, fontSize: 14, fontWeight: mono ? 400 : 500,
      letterSpacing: mono ? '0.04em' : '0.04em',
      ...NUM && (mono ? NUM : {}),
    }}>{children}</div>
  );
};

const LensPicker = ({ active }) => (
  <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: `1px solid ${T.hairline}`, backdropFilter: 'blur(8px)', background: 'rgba(10,14,20,0.78)' }}>
    {['WIDE', 'ZOOM', 'IR', 'LRF'].map((l, i) => (
      <div key={l} style={{
        padding: '10px 14px',
        background: l === active ? 'rgba(0,212,255,0.18)' : 'transparent',
        color: l === active ? T.cyan : T.t2,
        fontFamily: T.ui, fontSize: 13, fontWeight: 600, letterSpacing: '0.08em',
        borderRight: i < 3 ? `1px solid ${T.hairline}` : 'none',
      }}>{l}</div>
    ))}
  </div>
);

window.MapView = MapView;
window.VideoView = VideoView;
window.VideoOverlay = VideoOverlay;
window.Chip = Chip;
window.LensPicker = LensPicker;
window.EsriTileGrid = EsriTileGrid;
