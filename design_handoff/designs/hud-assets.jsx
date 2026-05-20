/* Asset library — icons, drone markers, geofence patterns
   Every named asset has a download URL so they can be saved to /assets/ for code. */

/* ----- Icon inventory ----- */
const ICON_LIB = [
  // Telemetry / flight
  { name: 'height',                 use: 'altitude (AGL)' },
  { name: 'speed',                  use: 'ground speed' },
  { name: 'swap_vert',              use: 'vertical speed' },
  { name: 'navigation',             use: 'heading / compass' },
  { name: 'videocam',               use: 'gimbal pitch indicator' },
  { name: 'home',                   use: 'home distance' },
  { name: 'battery_full',           use: 'battery healthy' },
  { name: 'battery_alert',          use: 'battery low/critical' },
  { name: 'signal_cellular_alt',    use: 'RC link strength' },
  { name: 'satellite_alt',          use: 'satellite count' },
  { name: 'gps_fixed',              use: 'RTK fix indicator' },
  { name: 'gps_off',                use: 'GPS lost' },
  { name: 'air',                    use: 'wind speed' },
  { name: 'thermostat',             use: 'temperature / IR' },
  // Mission
  { name: 'flight',                 use: 'drone (top-down generic)' },
  { name: 'drone',                  use: 'drone alt (Material Symbols has this)' },
  { name: 'route',                  use: 'mission routine' },
  { name: 'location_on',            use: 'waypoint marker' },
  { name: 'photo_camera',           use: 'capture / photo count' },
  { name: 'thermostat_auto',        use: 'IR / thermal camera mode' },
  { name: 'straighten',             use: 'laser rangefinder' },
  // Controls
  { name: 'play_arrow',             use: 'resume mission' },
  { name: 'pause',                  use: 'pause mission' },
  { name: 'stop',                   use: 'stop' },
  { name: 'skip_next',              use: 'skip waypoint forward' },
  { name: 'skip_previous',          use: 'previous waypoint' },
  { name: 'refresh',                use: 'retry waypoint / reroute' },
  { name: 'zoom_in',                use: 'zoom in camera' },
  { name: 'zoom_out',               use: 'zoom out camera' },
  { name: 'swap_horiz',             use: 'swap map ↔ video' },
  // Emergency / flight control
  { name: 'home_pin',               use: 'RTH primary action' },
  { name: 'flight_land',            use: 'land here' },
  { name: 'flight_takeoff',         use: 'takeoff' },
  { name: 'cancel',                 use: 'abort mission' },
  { name: 'power_settings_new',     use: 'E-STOP' },
  { name: 'emergency',              use: 'emergency banner / cluster header' },
  { name: 'pan_tool',               use: 'manual override' },
  // Status
  { name: 'check_circle',           use: 'OK / completed' },
  { name: 'warning',                use: 'warning amber' },
  { name: 'error',                  use: 'error red' },
  { name: 'info',                   use: 'info blue' },
  // Map
  { name: 'gps_not_fixed',          use: 'target / no fix' },
  { name: 'center_focus_strong',    use: 'reticle' },
  { name: 'fence',                  use: 'geofence' },
  { name: 'block',                  use: 'no-fly zone' },
  { name: 'airplanemode_active',    use: 'airspace / ADS-B aircraft' },
  { name: 'sensors',                use: 'ADS-B / radar' },
  { name: 'shield',                 use: 'obstacle avoidance' },
  { name: 'square_foot',            use: 'measure tool' },
  { name: 'layers',                 use: 'map layer picker' },
  { name: 'my_location',            use: 'recenter on drone' },
  // Chrome / nav
  { name: 'arrow_back',             use: 'back' },
  { name: 'close',                  use: 'dismiss modal' },
  { name: 'more_horiz',             use: 'overflow menu' },
  { name: 'expand_more',            use: 'expand drawer' },
  { name: 'expand_less',            use: 'collapse drawer' },
  { name: 'person',                 use: 'operator' },
  { name: 'cloud',                  use: 'cloud sync status' },
  { name: 'cloud_upload',           use: 'upload queue' },
  { name: 'sync',                   use: 'syncing' },
  { name: 'sd_storage',             use: 'SD card storage' },
  { name: 'broken_image',           use: 'photo capture failure' },
  { name: 'signal_disconnected',    use: 'RC link lost' },
];

const symbolURL = (name) => `https://fonts.gstatic.com/s/i/short-term/release/materialsymbolsoutlined/${name}/default/24px.svg`;
const googleFontsDeepLink = (name) => `https://fonts.google.com/icons?icon.set=Material+Symbols&selected=Material+Symbols+Outlined:${name}`;

const IconChip = ({ ic }) => (
  <div style={{
    display: 'flex', gap: 10, alignItems: 'center', padding: '8px 10px',
    background: T.card, border: `1px solid ${T.hairline2}`, borderRadius: 8,
  }}>
    <div style={{ width: 36, height: 36, borderRadius: 6, background: T.bg, border: `1px solid ${T.hairline2}`, display: 'grid', placeItems: 'center' }}>
      <MI name={ic.name} size={22} color={T.t1}/>
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontFamily: T.mono, fontSize: 12, color: T.cyan, fontWeight: 500 }}>{ic.name}</div>
      <div style={{ fontFamily: T.ui, fontSize: 11, color: T.t3, marginTop: 1 }}>{ic.use}</div>
    </div>
  </div>
);

/* ----- Drone marker options (SVG, embedded so user can copy directly) ----- */
const DroneMarker = ({ kind = 'quad-detailed', size = 56 }) => {
  const c = T.cyan;
  const stroke = '#0A0E14';
  switch (kind) {
    case 'quad-detailed':
      return (
        <svg width={size} height={size} viewBox="-32 -32 64 64">
          <circle r="28" fill="rgba(0,212,255,0.10)" stroke="rgba(0,212,255,0.5)"/>
          <path d="M0 -26 L10 -8 L-10 -8 Z" fill={c} opacity="0.85"/>
          <line x1="-14" y1="-14" x2="-22" y2="-22" stroke={stroke} strokeWidth="3"/>
          <line x1="14"  y1="-14" x2="22"  y2="-22" stroke={stroke} strokeWidth="3"/>
          <line x1="-14" y1="14"  x2="-22" y2="22"  stroke={stroke} strokeWidth="3"/>
          <line x1="14"  y1="14"  x2="22"  y2="22"  stroke={stroke} strokeWidth="3"/>
          <circle cx="-22" cy="-22" r="6" fill="#0A0E14" stroke={c} strokeWidth="1.5"/>
          <circle cx="22"  cy="-22" r="6" fill="#0A0E14" stroke={c} strokeWidth="1.5"/>
          <circle cx="-22" cy="22"  r="6" fill="#0A0E14" stroke={c} strokeWidth="1.5"/>
          <circle cx="22"  cy="22"  r="6" fill="#0A0E14" stroke={c} strokeWidth="1.5"/>
          <circle r="8" fill={c} stroke={stroke} strokeWidth="2"/>
        </svg>
      );
    case 'quad-simple':
      return (
        <svg width={size} height={size} viewBox="-32 -32 64 64">
          <circle r="24" fill="rgba(0,212,255,0.10)" stroke="rgba(0,212,255,0.5)"/>
          <circle cx="-16" cy="-16" r="7" fill={c}/>
          <circle cx="16"  cy="-16" r="7" fill={c}/>
          <circle cx="-16" cy="16"  r="7" fill={c}/>
          <circle cx="16"  cy="16"  r="7" fill={c}/>
          <line x1="-16" y1="-16" x2="16" y2="16" stroke={c} strokeWidth="3"/>
          <line x1="-16" y1="16" x2="16" y2="-16" stroke={c} strokeWidth="3"/>
          <circle r="5" fill={stroke} stroke={c} strokeWidth="2"/>
        </svg>
      );
    case 'arrow-fat':
      return (
        <svg width={size} height={size} viewBox="-32 -32 64 64">
          <circle r="26" fill="rgba(0,212,255,0.12)" stroke="rgba(0,212,255,0.6)"/>
          <path d="M0 -22 L16 14 L0 6 L-16 14 Z" fill={c} stroke={stroke} strokeWidth="2" strokeLinejoin="round"/>
        </svg>
      );
    case 'arrow-thin':
      return (
        <svg width={size} height={size} viewBox="-32 -32 64 64">
          <circle r="22" fill="none" stroke={c} strokeWidth="2" strokeDasharray="3 3"/>
          <path d="M0 -16 L10 12 L0 6 L-10 12 Z" fill={c}/>
        </svg>
      );
    case 'chevron':
      return (
        <svg width={size} height={size} viewBox="-32 -32 64 64">
          <circle r="20" fill="rgba(0,212,255,0.08)"/>
          <path d="M0 -16 L14 8 L0 0 L-14 8 Z" fill={c} stroke={stroke} strokeWidth="1.5"/>
          <circle r="4" fill={stroke}/>
        </svg>
      );
    case 'dji-like':
      return (
        <svg width={size} height={size} viewBox="-32 -32 64 64">
          <circle r="20" fill="rgba(0,212,255,0.10)" stroke={c} strokeWidth="1"/>
          <path d="M-20 -8 L20 -8 L0 24 Z" fill={c} opacity="0.3"/>
          <path d="M0 -22 L8 -6 L-8 -6 Z" fill={c}/>
          <circle r="6" fill={c} stroke={stroke} strokeWidth="2"/>
        </svg>
      );
  }
};

const droneOptions = [
  { kind: 'quad-detailed', label: 'A · Detailed quad', note: 'Reads as drone at large zoom · arms + rotors visible' },
  { kind: 'quad-simple',   label: 'B · Simple quad',   note: 'X-frame · cleaner at small sizes' },
  { kind: 'arrow-fat',     label: 'C · Arrow (fat)',   note: 'Pure heading focus · no airframe metaphor' },
  { kind: 'arrow-thin',    label: 'D · Arrow (thin)',  note: 'Dashed ring radius indicator' },
  { kind: 'chevron',       label: 'E · Chevron',       note: 'Most minimal · best for dense maps' },
  { kind: 'dji-like',      label: 'F · FOV cone',      note: 'Camera FOV cone projected forward' },
];

/* ----- Geofence patterns ----- */
const Geofence = ({ kind, w = 220, h = 130 }) => {
  const id = `gf-${kind}`;
  switch (kind) {
    case 'hatch':
      return (
        <svg width={w} height={h}>
          <defs>
            <pattern id={id} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="8" stroke={T.amber} strokeWidth="1" opacity="0.7"/>
            </pattern>
          </defs>
          <rect x="10" y="10" width={w-20} height={h-20} fill={`url(#${id})`} stroke={T.amber} strokeWidth="1.5" strokeDasharray="3 2"/>
        </svg>
      );
    case 'solid':
      return (
        <svg width={w} height={h}>
          <rect x="10" y="10" width={w-20} height={h-20} fill="rgba(245,158,11,0.18)" stroke={T.amber} strokeWidth="2"/>
        </svg>
      );
    case 'glow':
      return (
        <svg width={w} height={h}>
          <defs>
            <radialGradient id={id} cx="0.5" cy="0.5">
              <stop offset="0" stopColor="rgba(245,158,11,0)"/>
              <stop offset="0.7" stopColor="rgba(245,158,11,0)"/>
              <stop offset="1" stopColor="rgba(245,158,11,0.5)"/>
            </radialGradient>
          </defs>
          <rect x="0" y="0" width={w} height={h} fill={`url(#${id})`}/>
          <rect x="10" y="10" width={w-20} height={h-20} fill="none" stroke={T.amber} strokeWidth="1.5"/>
        </svg>
      );
    case 'wall':
      return (
        <svg width={w} height={h}>
          <rect x="10" y="10" width={w-20} height={h-20} fill="none" stroke={T.red} strokeWidth="3"/>
          <rect x="6" y="6" width={w-12} height={h-12} fill="none" stroke={T.red} strokeWidth="1" opacity="0.5" strokeDasharray="2 4"/>
        </svg>
      );
    case 'noFly':
      return (
        <svg width={w} height={h}>
          <defs>
            <pattern id={id} width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="5" height="10" fill={T.red} opacity="0.35"/>
            </pattern>
          </defs>
          <rect x="10" y="10" width={w-20} height={h-20} fill={`url(#${id})`} stroke={T.red} strokeWidth="2"/>
        </svg>
      );
    case 'cylinder':
      return (
        <svg width={w} height={h}>
          <ellipse cx={w/2} cy="30" rx={(w-40)/2} ry="15" fill="rgba(245,158,11,0.18)" stroke={T.amber} strokeWidth="1.5" strokeDasharray="3 2"/>
          <ellipse cx={w/2} cy={h-30} rx={(w-40)/2} ry="15" fill="rgba(245,158,11,0.10)" stroke={T.amber} strokeWidth="1.5"/>
          <line x1="20" y1="30" x2="20" y2={h-30} stroke={T.amber} strokeWidth="1.5" strokeDasharray="3 2"/>
          <line x1={w-20} y1="30" x2={w-20} y2={h-30} stroke={T.amber} strokeWidth="1.5" strokeDasharray="3 2"/>
        </svg>
      );
  }
};

const geofenceOptions = [
  { kind: 'hatch',    label: 'A · Diagonal hatch',     note: 'Standard aviation chart style · advisory boundary' },
  { kind: 'solid',    label: 'B · Solid translucent',  note: 'Most readable at distance · big-budget feel' },
  { kind: 'glow',     label: 'C · Edge glow',          note: 'Soft awareness, no clutter inside the zone' },
  { kind: 'wall',     label: 'D · Hard wall',          note: 'Indicates strict no-cross fence' },
  { kind: 'noFly',    label: 'E · No-fly hatch (red)', note: 'For FAA TFRs and restricted airspace' },
  { kind: 'cylinder', label: 'F · 3D cylinder',        note: 'Shows altitude floor + ceiling · best for tank inspections' },
];

/* ----- Map markers (waypoints, home, etc.) ----- */
const MarkerSet = () => (
  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
    {[
      { label: 'Home pad', el: <svg width="48" height="48" viewBox="-24 -24 48 48"><rect x="-14" y="-14" width="28" height="28" rx="4" fill="rgba(16,185,129,0.25)" stroke={T.green} strokeWidth="2"/><text x="0" y="5" fill={T.green} fontSize="16" textAnchor="middle" fontWeight="700" fontFamily="Roboto">H</text></svg> },
      { label: 'WP done', el: <svg width="48" height="48" viewBox="-24 -24 48 48"><circle r="9" fill={T.green} stroke="#0A0E14" strokeWidth="2"/></svg> },
      { label: 'WP current', el: <svg width="48" height="48" viewBox="-24 -24 48 48"><circle r="16" fill="none" stroke={T.cyan} strokeWidth="2" opacity="0.5"/><circle r="9" fill={T.cyan} stroke="#0A0E14" strokeWidth="2"/></svg> },
      { label: 'WP next', el: <svg width="48" height="48" viewBox="-24 -24 48 48"><circle r="8" fill="#1A2030" stroke={T.t1} strokeWidth="2"/></svg> },
      { label: 'WP photo', el: <svg width="48" height="48" viewBox="-24 -24 48 48"><circle r="9" fill={T.cyan} stroke="#0A0E14" strokeWidth="2"/><rect x="-4" y="-3" width="8" height="6" rx="1" fill="#0A0E14"/></svg> },
      { label: 'POI', el: <svg width="48" height="48" viewBox="-24 -24 48 48"><circle r="9" fill={T.purple} stroke="#0A0E14" strokeWidth="2"/><text x="0" y="4" fill="#0A0E14" fontSize="11" textAnchor="middle" fontWeight="700" fontFamily="Roboto">P</text></svg> },
      { label: 'Asset', el: <svg width="48" height="48" viewBox="-24 -24 48 48"><circle r="14" fill="rgba(148,163,184,0.12)" stroke={T.t2} strokeWidth="1.5"/><circle r="6" fill={T.t2}/></svg> },
      { label: 'Standoff', el: <svg width="48" height="48" viewBox="-24 -24 48 48"><circle r="18" fill="none" stroke={T.cyan} strokeWidth="1.5" strokeDasharray="3 3"/><circle r="3" fill={T.cyan}/></svg> },
      { label: 'Aircraft (ADS-B)', el: <svg width="48" height="48" viewBox="-24 -24 48 48"><path d="M0 -14 L4 0 L12 4 L4 4 L0 14 L-4 4 L-12 4 L-4 0 Z" fill={T.red} stroke="#0A0E14" strokeWidth="1"/></svg> },
      { label: 'Obstacle', el: <svg width="48" height="48" viewBox="-24 -24 48 48"><path d="M0 -14 L14 12 L-14 12 Z" fill={T.amber} stroke="#0A0E14" strokeWidth="2"/><text x="0" y="9" fill="#0A0E14" fontSize="14" textAnchor="middle" fontWeight="900" fontFamily="Roboto">!</text></svg> },
    ].map((m,i) => (
      <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: 12, background: T.card, border: `1px solid ${T.hairline2}`, borderRadius: 10, minWidth: 110 }}>
        {m.el}
        <span style={{ fontFamily: T.ui, fontSize: 11, color: T.t2, fontWeight: 500 }}>{m.label}</span>
      </div>
    ))}
  </div>
);

/* ----- The artboard ----- */
const Assets = () => (
  <div style={{ width: 2304, minHeight: 1440, background: T.bg, padding: '60px 80px', fontFamily: T.ui, color: T.t1 }}>
    <div style={{ marginBottom: 32 }}>
      <div style={{ fontSize: 13, color: T.cyan, letterSpacing: '0.22em', fontWeight: 600, marginBottom: 12 }}>ASSET LIBRARY · DOWNLOADABLE</div>
      <div style={{ fontSize: 48, fontWeight: 500, letterSpacing: '-0.02em', marginBottom: 10 }}>Everything to drop into <span style={{ ...NUM, color: T.cyan }}>/src/assets/</span></div>
      <div style={{ fontSize: 18, color: T.t2, maxWidth: 1500 }}>
        Icons come from <strong style={{ color: T.t1 }}>Google Material Symbols Outlined</strong> — one font, every glyph, free. Drone markers and geofence patterns are inline SVG you copy directly. Map tiles are Esri World Imagery (swap to Google or Mapbox later).
      </div>
    </div>

    {/* SOURCES */}
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 32 }}>
      <SourceCard
        title="Icons · Material Symbols Outlined"
        primary="fonts.google.com/icons"
        url="https://fonts.google.com/icons?icon.set=Material+Symbols"
        note="Search by name (left). Download individual SVGs. We use 'Outlined' weight 400 unless filled = active state. ~3000 glyphs."
        accent={T.cyan}/>
      <SourceCard
        title="Map · Esri World Imagery (placeholder)"
        primary="server.arcgisonline.com/.../World_Imagery"
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer"
        note="No API key. Swap to Google Maps JS API or Mapbox GL when you wire the real map. URL pattern: /tile/{z}/{y}/{x}"
        accent={T.green}/>
      <SourceCard
        title="Type · Roboto + Roboto Mono"
        primary="fonts.google.com/specimen/Roboto"
        url="https://fonts.google.com/specimen/Roboto"
        note="Roboto 400/500/700 for UI · Roboto Mono 400/500 for telemetry. Both bundled in Android."
        accent={T.purple}/>
    </div>

    {/* ICON INVENTORY */}
    <div style={{ background: T.panel, border: `1px solid ${T.hairline}`, borderRadius: 14, padding: 24, marginBottom: 32 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 16 }}>
        <div style={{ fontSize: 20, fontWeight: 600, color: T.t1 }}>Icon inventory · {ICON_LIB.length} glyphs</div>
        <div style={{ marginLeft: 'auto', fontFamily: T.mono, fontSize: 12, color: T.t3 }}>
          download URL pattern: <span style={{ color: T.cyan }}>fonts.gstatic.com/s/i/short-term/release/materialsymbolsoutlined/{`{name}`}/default/24px.svg</span>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        {ICON_LIB.map(ic => <IconChip key={ic.name} ic={ic}/>)}
      </div>
    </div>

    {/* DRONE MARKERS */}
    <div style={{ background: T.panel, border: `1px solid ${T.hairline}`, borderRadius: 14, padding: 24, marginBottom: 32 }}>
      <div style={{ fontSize: 20, fontWeight: 600, color: T.t1, marginBottom: 6 }}>Drone position markers · pick one</div>
      <div style={{ fontFamily: T.ui, fontSize: 13, color: T.t2, marginBottom: 18 }}>All rotate with heading. All SVG — paste directly into a <code style={{ ...NUM, color: T.cyan }}>{'<DroneMarker/>'}</code> component or save as files.</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 16 }}>
        {droneOptions.map(o => (
          <div key={o.kind} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: 18, background: T.card, border: `1px solid ${T.hairline2}`, borderRadius: 12 }}>
            <DroneMarker kind={o.kind} size={64}/>
            <div style={{ fontFamily: T.ui, fontSize: 13, color: T.t1, fontWeight: 600 }}>{o.label}</div>
            <div style={{ fontFamily: T.ui, fontSize: 11, color: T.t2, textAlign: 'center', lineHeight: 1.4 }}>{o.note}</div>
          </div>
        ))}
      </div>
    </div>

    {/* GEOFENCE PATTERNS */}
    <div style={{ background: T.panel, border: `1px solid ${T.hairline}`, borderRadius: 14, padding: 24, marginBottom: 32 }}>
      <div style={{ fontSize: 20, fontWeight: 600, color: T.t1, marginBottom: 6 }}>Geofence rendering · pick one</div>
      <div style={{ fontFamily: T.ui, fontSize: 13, color: T.t2, marginBottom: 18 }}>For 2D map overlays. For an inspection-around-tank flight, the cylinder (F) shows altitude floor + ceiling — recommended.</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {geofenceOptions.map(o => (
          <div key={o.kind} style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 18, background: T.card, border: `1px solid ${T.hairline2}`, borderRadius: 12 }}>
            <div style={{ width: '100%', height: 130, background: '#0c111c', borderRadius: 8, overflow: 'hidden', display: 'grid', placeItems: 'center' }}>
              <Geofence kind={o.kind}/>
            </div>
            <div style={{ fontFamily: T.ui, fontSize: 14, color: T.t1, fontWeight: 600 }}>{o.label}</div>
            <div style={{ fontFamily: T.ui, fontSize: 12, color: T.t2, lineHeight: 1.4 }}>{o.note}</div>
          </div>
        ))}
      </div>
    </div>

    {/* MAP MARKER SET */}
    <div style={{ background: T.panel, border: `1px solid ${T.hairline}`, borderRadius: 14, padding: 24 }}>
      <div style={{ fontSize: 20, fontWeight: 600, color: T.t1, marginBottom: 16 }}>Map marker set</div>
      <MarkerSet/>
    </div>
  </div>
);

const SourceCard = ({ title, primary, url, note, accent }) => (
  <div style={{ background: T.panel, border: `1px solid ${T.hairline}`, borderLeft: `3px solid ${accent}`, borderRadius: 12, padding: 22, display: 'flex', flexDirection: 'column', gap: 8 }}>
    <div style={{ fontFamily: T.ui, fontSize: 12, color: accent, letterSpacing: '0.14em', fontWeight: 600 }}>{title}</div>
    <div style={{ fontFamily: T.mono, fontSize: 14, color: T.t1, fontWeight: 500, wordBreak: 'break-all' }}>{primary}</div>
    <div style={{ fontFamily: T.ui, fontSize: 12, color: T.t2, lineHeight: 1.5 }}>{note}</div>
    <a href={url} target="_blank" rel="noreferrer" style={{ marginTop: 4, display: 'inline-flex', alignItems: 'center', gap: 6, color: accent, fontFamily: T.ui, fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textDecoration: 'none' }}>OPEN ↗</a>
  </div>
);

window.Assets = Assets;
window.DroneMarker = DroneMarker;
window.Geofence = Geofence;
window.ICON_LIB = ICON_LIB;
