/* Mission Builder map — the editor canvas.
   Uses the same Esri tile background as the HUD, zoomed slightly out so we can show
   the site context (multiple assets, home pad, geofence). The routine overlay swaps
   based on the active routine. */

const SITE_TILE = { z: 17, x: 30878, y: 54127 };

/* Asset pins for site overview — coords in 0..100 percent of the map area.
   Hand-placed to read nicely on the Esri tile rather than be geographically true;
   in production these come from the asset's lat/lng. */
const ASSET_PINS = [
  { id: 'TANK-04',    x: 52, y: 50, kind: 'tank',     selected: true  },
  { id: 'TANK-05',    x: 58, y: 44, kind: 'tank' },
  { id: 'TANK-06',    x: 63, y: 38, kind: 'tank' },
  { id: 'TANK-07',    x: 68, y: 32, kind: 'tank' },
  { id: 'FLARE-01',   x: 38, y: 56, kind: 'flare' },
  { id: 'PIPE-12',    x: 30, y: 70, kind: 'pipe',  endX: 78, endY: 78 },
  { id: 'HEAT-EX-03', x: 46, y: 60, kind: 'hex' },
  { id: 'COOL-T-02',  x: 24, y: 64, kind: 'cooling' },
  { id: 'SUB-A',      x: 76, y: 22, kind: 'sub'},
  { id: 'HELIPAD-N',  x: 18, y: 30, kind: 'home' },
];

const assetPinColor = (sel) => sel ? T.cyan : 'rgba(248,250,252,0.85)';

const AssetPin = ({ pin, label }) => {
  if (pin.kind === 'home') {
    return (
      <g transform={`translate(${pin.x * 10} ${pin.y * 10})`}>
        <rect x="-16" y="-16" width="32" height="32" rx="5" fill="rgba(16,185,129,0.30)" stroke={T.green} strokeWidth="1.5"/>
        <text x="0" y="6" textAnchor="middle" fill={T.green} fontFamily="Roboto" fontSize="16" fontWeight="700">H</text>
      </g>
    );
  }
  if (pin.kind === 'pipe') {
    return (
      <g>
        <line x1={pin.x * 10} y1={pin.y * 10} x2={pin.endX * 10} y2={pin.endY * 10} stroke={assetPinColor(pin.selected)} strokeWidth="3" opacity="0.6" strokeDasharray="6 4"/>
        <circle cx={pin.x * 10} cy={pin.y * 10} r="6" fill={assetPinColor(pin.selected)}/>
        <circle cx={pin.endX * 10} cy={pin.endY * 10} r="6" fill={assetPinColor(pin.selected)}/>
        {label && <text x={(pin.x + pin.endX) * 5} y={(pin.y + pin.endY) * 5 - 10} textAnchor="middle" fill={T.t1} fontFamily="Roboto" fontSize="12" fontWeight="500">{pin.id}</text>}
      </g>
    );
  }
  const r = pin.selected ? 16 : 10;
  return (
    <g transform={`translate(${pin.x * 10} ${pin.y * 10})`}>
      {pin.selected && <circle r="32" fill="rgba(0,212,255,0.10)" stroke={T.cyan} strokeWidth="1" strokeDasharray="3 3"/>}
      <circle r={r} fill={pin.selected ? 'rgba(0,212,255,0.20)' : 'rgba(20,28,40,0.85)'} stroke={assetPinColor(pin.selected)} strokeWidth={pin.selected ? 2.5 : 1.5}/>
      <circle r={pin.selected ? 5 : 3} fill={assetPinColor(pin.selected)}/>
      {label && <text x="0" y={r + 18} textAnchor="middle" fill={pin.selected ? T.cyan : T.t1} fontFamily="Roboto" fontSize="13" fontWeight={pin.selected ? 600 : 500} letterSpacing="0.08em">{pin.id}</text>}
    </g>
  );
};

/* === Routine overlays — each draws its path + waypoints over the map === */
/* The map SVG uses a 1000 × 800 viewBox so coordinates are easy to think in.
   Tank-04 is at (520, 400). */

const OrbitOverlay = ({ params = ROUTINE_TEMPLATES.ORBIT.defaults }) => {
  const cx = 520, cy = 400;
  const rPx = params.radius * 4; // visual scale: 4 px per meter
  const photos = params.photos;
  const waypoints = Array.from({ length: photos }).map((_, i) => {
    const a = (i / photos) * Math.PI * 2 - Math.PI / 2 + (params.startHeading * Math.PI / 180);
    return { x: cx + Math.cos(a) * rPx, y: cy + Math.sin(a) * rPx, i: i + 1 };
  });
  return (
    <g>
      {/* asset footprint */}
      <circle cx={cx} cy={cy} r="22" fill="rgba(148,163,184,0.18)" stroke="rgba(148,163,184,0.5)" strokeWidth="1.5"/>
      <text x={cx} y={cy + 4} textAnchor="middle" fill={T.t1} fontFamily="Roboto" fontSize="12" fontWeight="600" letterSpacing="0.10em">TANK 04</text>
      {/* standoff ring */}
      <circle cx={cx} cy={cy} r={rPx} fill="rgba(0,212,255,0.06)" stroke={T.cyan} strokeWidth="2.5" strokeDasharray="6 4"/>
      {/* radii lines from asset to each WP — visualizes gimbal target */}
      {waypoints.map((w, i) => (
        <line key={'r'+i} x1={cx} y1={cy} x2={w.x} y2={w.y} stroke="rgba(0,212,255,0.18)" strokeWidth="0.8"/>
      ))}
      {/* solid orbit path */}
      <circle cx={cx} cy={cy} r={rPx} fill="none" stroke={T.cyan} strokeWidth="3"/>
      {/* entry path from home */}
      <path d={`M 200 290 Q 360 320 ${waypoints[0].x - 6} ${waypoints[0].y - 6}`} fill="none" stroke={T.cyan} strokeWidth="2" strokeDasharray="8 4" opacity="0.7"/>
      {/* return path */}
      <path d={`M ${waypoints[waypoints.length - 1].x + 6} ${waypoints[waypoints.length - 1].y + 6} Q 380 380 200 290`} fill="none" stroke={T.blue} strokeWidth="2" strokeDasharray="8 4" opacity="0.7"/>
      {/* waypoint dots */}
      {waypoints.map((w, i) => (
        <g key={'w'+i}>
          <circle cx={w.x} cy={w.y} r={i === 0 ? 7 : 4.5} fill={i === 0 ? T.cyan : '#0A0E14'} stroke={T.cyan} strokeWidth={i === 0 ? 2 : 1.5}/>
          {i % 6 === 0 && (
            <text x={w.x} y={w.y - 12} textAnchor="middle" fill={T.t1} fontFamily="Roboto Mono" fontSize="9" fontWeight="500">{i + 1}</text>
          )}
        </g>
      ))}
      {/* entry chip */}
      <g transform={`translate(${waypoints[0].x - 50}, ${waypoints[0].y - 30})`}>
        <rect width="100" height="20" rx="4" fill="rgba(10,14,20,0.85)" stroke={T.cyan} strokeWidth="1"/>
        <text x="50" y="14" textAnchor="middle" fill={T.cyan} fontFamily="Roboto Mono" fontSize="10" fontWeight="600" letterSpacing="0.08em">ENTRY · WP 01</text>
      </g>
    </g>
  );
};

const FacadeOverlay = () => {
  /* Vertical wall behind Tank-04 — raster sweep up and down across width */
  return (
    <g>
      <rect x="490" y="370" width="60" height="60" fill="rgba(148,163,184,0.15)" stroke="rgba(148,163,184,0.5)" strokeWidth="1.5"/>
      <text x="520" y="404" textAnchor="middle" fill={T.t1} fontFamily="Roboto" fontSize="12" fontWeight="600">FLARE-01</text>
      {/* raster — top-down view shows it as parallel lines next to asset */}
      <g stroke={T.cyan} strokeWidth="2.5">
        <line x1="600" y1="360" x2="600" y2="440"/>
        <line x1="600" y1="440" x2="620" y2="440"/>
        <line x1="620" y1="440" x2="620" y2="360"/>
        <line x1="620" y1="360" x2="640" y2="360"/>
        <line x1="640" y1="360" x2="640" y2="440"/>
        <line x1="640" y1="440" x2="660" y2="440"/>
        <line x1="660" y1="440" x2="660" y2="360"/>
      </g>
      {[600,620,640,660].map((x, i) => (
        <g key={i}>
          <circle cx={x} cy="360" r="4" fill="#0A0E14" stroke={T.cyan} strokeWidth="1.5"/>
          <circle cx={x} cy="440" r="4" fill="#0A0E14" stroke={T.cyan} strokeWidth="1.5"/>
        </g>
      ))}
    </g>
  );
};

const GridOverlay = () => {
  /* Top-down boustrophedon over a rectangle */
  const x = 420, y = 320, w = 200, h = 160;
  const rows = 6;
  const dy = h / (rows - 1);
  const pts = [];
  for (let i = 0; i < rows; i++) {
    const yy = y + i * dy;
    if (i % 2 === 0) { pts.push([x, yy], [x + w, yy]); }
    else { pts.push([x + w, yy], [x, yy]); }
  }
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill="rgba(0,212,255,0.05)" stroke={T.cyan} strokeWidth="1.5" strokeDasharray="6 4"/>
      <polyline points={pts.map(p => p.join(',')).join(' ')} fill="none" stroke={T.cyan} strokeWidth="2.5"/>
      {pts.map((p, i) => i % 2 === 0 && (
        <circle key={i} cx={p[0]} cy={p[1]} r="4" fill="#0A0E14" stroke={T.cyan} strokeWidth="1.5"/>
      ))}
      <text x={x + w/2} y={y - 12} textAnchor="middle" fill={T.t1} fontFamily="Roboto" fontSize="12" fontWeight="600" letterSpacing="0.10em">SUBSTATION A</text>
    </g>
  );
};

const PerimeterOverlay = () => {
  const pts = [[440, 320], [620, 320], [660, 380], [620, 460], [440, 460], [400, 380]];
  return (
    <g>
      <polygon points={pts.map(p => p.join(',')).join(' ')} fill="rgba(148,163,184,0.10)" stroke="rgba(148,163,184,0.4)" strokeWidth="1.5"/>
      <polygon points={pts.map(p => p.join(',')).join(' ')} fill="none" stroke={T.cyan} strokeWidth="2.5"/>
      {pts.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r="6" fill={i === 0 ? T.cyan : '#0A0E14'} stroke={T.cyan} strokeWidth="2"/>
      ))}
    </g>
  );
};

const CorridorOverlay = () => (
  <g>
    <path d="M 240 220 L 360 280 L 540 320 L 700 360 L 820 420" fill="none" stroke="rgba(248,250,252,0.4)" strokeWidth="20" strokeDasharray="2 4" strokeLinecap="butt"/>
    <path d="M 240 220 L 360 280 L 540 320 L 700 360 L 820 420" fill="none" stroke={T.cyan} strokeWidth="3"/>
    {[[240,220],[300,250],[360,280],[450,300],[540,320],[620,340],[700,360],[760,390],[820,420]].map((p, i) => (
      <circle key={i} cx={p[0]} cy={p[1]} r={i === 0 ? 7 : 4} fill={i === 0 ? T.cyan : '#0A0E14'} stroke={T.cyan} strokeWidth={i === 0 ? 2 : 1.5}/>
    ))}
    <text x="540" y="298" textAnchor="middle" fill={T.t1} fontFamily="Roboto" fontSize="12" fontWeight="600" letterSpacing="0.10em">PIPE-12 · 840 m</text>
  </g>
);

const ManualOverlay = () => (
  <g>
    <text x="520" y="380" textAnchor="middle" fill={T.t2} fontFamily="Roboto" fontSize="14" fontWeight="500">Tap anywhere to place a waypoint</text>
    <text x="520" y="402" textAnchor="middle" fill={T.t3} fontFamily="Roboto Mono" fontSize="11">0 waypoints</text>
  </g>
);

const OverlayForRoutine = ({ routine, params }) => {
  if (routine === 'ORBIT')     return <OrbitOverlay params={params}/>;
  if (routine === 'FACADE')    return <FacadeOverlay/>;
  if (routine === 'GRID')      return <GridOverlay/>;
  if (routine === 'PERIMETER') return <PerimeterOverlay/>;
  if (routine === 'CORRIDOR')  return <CorridorOverlay/>;
  return <ManualOverlay/>;
};

/* === The full map editor === */
const BuilderMap = ({ routine = 'ORBIT', params, mode = 'editor', allAssets = false, w = 1504, h = 1280 }) => (
  <div style={{ width: w, height: h, position: 'relative', background: '#0c111c', overflow: 'hidden' }}>
    {/* Tile layer */}
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <EsriTileGrid z={SITE_TILE.z} x={SITE_TILE.x} y={SITE_TILE.y} cols={8} rows={6} size={256} style={{
        position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
        filter: 'saturate(1.05) brightness(0.88) contrast(1.08)',
      }}/>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(120% 90% at 50% 50%, transparent 55%, rgba(10,14,20,0.55) 100%)' }}/>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(10,14,20,0.22), transparent 30%, transparent 70%, rgba(10,14,20,0.22))' }}/>
    </div>

    {/* Geofence */}
    <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      <defs>
        <pattern id={`gf-bld-${mode}`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" stroke={T.amber} strokeWidth="0.55" opacity="0.55"/>
        </pattern>
      </defs>
      <rect x="4" y="4" width="92" height="92" fill={`url(#gf-bld-${mode})`} opacity="0.30"/>
      <rect x="4" y="4" width="92" height="92" fill="none" stroke={T.amber} strokeWidth="0.32" strokeDasharray="1.5 1"/>
    </svg>

    {/* Asset pins (when in picker mode show all + labels; in editor show only selected) */}
    <svg width="100%" height="100%" viewBox="0 0 1000 800" preserveAspectRatio="xMidYMid slice" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {/* Asset pins (faint) */}
      {ASSET_PINS.map(p => <AssetPin key={p.id} pin={p} label={allAssets}/>)}

      {/* Routine path overlay (only in editor mode) */}
      {mode === 'editor' && <OverlayForRoutine routine={routine} params={params}/>}

      {/* Home pad arrow when editor */}
      {mode === 'editor' && (
        <g>
          <path d="M 180 300 L 460 380" stroke={T.green} strokeWidth="1.5" strokeDasharray="3 3" opacity="0.5" fill="none"/>
        </g>
      )}
    </svg>

    {/* Compass */}
    <div style={{ position: 'absolute', top: 16, right: 16, width: 52, height: 52, borderRadius: 999, background: 'rgba(10,14,20,0.78)', border: `1px solid ${T.hairline}`, backdropFilter: 'blur(6px)', display: 'grid', placeItems: 'center', color: T.t1 }}>
      <MI name={ICON.heading} size={22} color={T.cyan} fill={1}/>
    </div>

    {/* Layer toggles */}
    <div style={{ position: 'absolute', top: 80, right: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
      <MapBtn icon="add" label="Zoom in"/>
      <MapBtn icon="remove" label="Zoom out"/>
      <MapBtn icon={ICON.layers} label="Layers"/>
      <MapBtn icon={ICON.geofence} label="Geofence" color={T.amber}/>
      <MapBtn icon="my_location" label="Recenter" color={T.cyan}/>
    </div>

    {/* Scale */}
    <div style={{ position: 'absolute', left: 16, bottom: 16, display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: 'rgba(10,14,20,0.65)', borderRadius: 4, backdropFilter: 'blur(4px)' }}>
      <div style={{ width: 70, height: 3, background: T.t1, borderRadius: 1 }}/>
      <span style={{ ...NUM, color: T.t1, fontSize: 12 }}>50 m</span>
    </div>

    {/* Attribution */}
    <div style={{ position: 'absolute', right: 12, bottom: 8, fontFamily: T.ui, fontSize: 10, color: 'rgba(248,250,252,0.5)', letterSpacing: '0.04em' }}>
      Esri · Maxar · placeholder
    </div>
  </div>
);

const MapBtn = ({ icon, color, label }) => (
  <button style={{
    width: 48, height: 48, borderRadius: 8,
    background: 'rgba(10,14,20,0.85)', border: `1px solid ${T.hairline}`,
    display: 'grid', placeItems: 'center', cursor: 'pointer', backdropFilter: 'blur(8px)',
  }} title={label}>
    <MI name={icon} size={22} color={color || T.t1}/>
  </button>
);

window.BuilderMap = BuilderMap;
window.OverlayForRoutine = OverlayForRoutine;
window.ASSET_PINS = ASSET_PINS;
