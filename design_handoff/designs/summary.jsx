/* Mira Flight — Mission Summary (post-flight).
   One screen: hero stats, full-width telemetry timeline (the bolder element),
   photo gallery grid, flight log + flown path, upload status.

   Mission: MR-2026-0428 · Tank 04 inspection · 24 photos · 14:36 elapsed.
   Telemetry samples are hand-crafted to read like a real Orbit routine. */

const MISSION_META = {
  id: 'MR-2026-0428',
  name: 'Tank 04 inspection',
  asset: 'TANK-04',
  site: 'Refinery North',
  drone: 'M350 RTK · A',
  operator: 'K. Marshall',
  flownAt: 'Tue 28 Apr 2026 · 15:35 → 15:50 local',
  duration: '14:36',
  photoCount: 24,
  dataMb: 96.4,
  battStart: 98,
  battEnd: 62,
  maxAlt: 90,
  routineAlt: 78,
  homeDist: 124,
  totalDistance: 312,
  avgSpeed: 4.8,
  maxSpeed: 6.4,
};

/* ---------------- Telemetry timeline (the bolder feature) ----------------
   The timeline plots 3 traces in a single 2256 × 300 chart:
     - Altitude  (cyan area)
     - Battery   (amber line)
     - Speed     (green line)
   Time runs 0 → 876 s (= 14:36). Event markers are vertical lines with icon chips. */

const TL_DURATION = 876; // seconds (= 14:36)

/* Polyline geometry helpers — given the chart inner box, map (t in seconds, v in unit) → (x, y) */
const tlW = 2256, tlH = 300;
const tlPad = { left: 60, right: 28, top: 24, bottom: 36 };
const innerW = tlW - tlPad.left - tlPad.right;
const innerH = tlH - tlPad.top - tlPad.bottom;

const xAtT = (t) => tlPad.left + (t / TL_DURATION) * innerW;
/* Y for altitude — 0..120m maps to bottom..top of inner box */
const yAtAlt   = (m) => tlPad.top + innerH - (Math.min(120, m) / 120) * innerH;
/* Y for battery — 0..100% maps to bottom..top */
const yAtBatt  = (p) => tlPad.top + innerH - (p / 100) * innerH;
/* Y for speed — 0..10 m/s mapped to bottom..top, but offset to top half so it doesn't overlap */
const yAtSpeed = (v) => tlPad.top + innerH * 0.40 - ((v / 10) * innerH * 0.35);

/* Sample arrays — emit one point every 4 s. Mission stages:
     0–18 s    takeoff
     18–46 s   climb to RTH alt 90
     46–86 s   transit 124 m to asset
     86–102 s  descend to orbit alt 78
     102–814 s orbit (712 s, 30 s per WP × 24)
     814–824 s climb out to 90
     824–854 s RTH home
     854–876 s descent + land
*/
const TIMELINE_SAMPLES = (() => {
  const out = [];
  for (let t = 0; t <= TL_DURATION; t += 4) {
    let alt, batt, spd;
    if (t <= 18) { alt = (t / 18) * 3; spd = (t / 18) * 2.0; batt = 98 - (t * 0.005); }
    else if (t <= 46) { const p = (t - 18) / 28; alt = 3 + p * 87; spd = 3.0; batt = 97.91 - (t - 18) * 0.04; }
    else if (t <= 86) { alt = 90; spd = 6.0; batt = 96.79 - (t - 46) * 0.06; }
    else if (t <= 102) { const p = (t - 86) / 16; alt = 90 - p * 12; spd = 3.0; batt = 94.39 - (t - 86) * 0.05; }
    else if (t <= 814) {
      const p = (t - 102) / 712;
      alt = 78 + Math.sin((t - 102) / 24) * 0.6;
      spd = 4.8 + Math.sin((t - 102) / 38) * 0.6;
      batt = 93.59 - p * 30;
    }
    else if (t <= 824) { const p = (t - 814) / 10; alt = 78 + p * 12; spd = 3.0; batt = 63.59 - (t - 814) * 0.04; }
    else if (t <= 854) { alt = 90; spd = 6.4; batt = 63.19 - (t - 824) * 0.05; }
    else { const p = (t - 854) / 22; alt = 90 - p * 90; spd = 1.5; batt = 61.69 - (t - 854) * 0.03; }
    out.push({ t, alt: Math.max(0, alt), batt, spd: Math.max(0, spd) });
  }
  return out;
})();

/* Photo capture timestamps — 24 evenly spaced within orbit window 102..814 */
const PHOTO_TIMES = Array.from({ length: 24 }).map((_, i) => 102 + (i + 0.5) * (712 / 24));

/* Event markers — vertical lines with icon chips floating above the chart */
const EVENTS = [
  { t: 18,  icon: 'flight_takeoff', label: 'Takeoff',      tone: 'cyan'  },
  { t: 46,  icon: 'arrow_upward',   label: 'RTH alt',      tone: 'cyan'  },
  { t: 102, icon: 'circle',         label: 'Orbit start',  tone: 'cyan'  },
  { t: 458, icon: 'photo_camera',   label: 'WP 12 · halfway · 12 / 24 photos', tone: 'amber' },
  { t: 814, icon: 'check_circle',   label: 'Orbit complete', tone: 'green' },
  { t: 824, icon: 'home_pin',       label: 'RTH start',    tone: 'blue'  },
  { t: 854, icon: 'flight_land',    label: 'Landing',      tone: 'blue'  },
  { t: 876, icon: 'check_circle',   label: 'Touchdown',    tone: 'green' },
];

const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

const ToneColors = {
  cyan:  { fg: T.cyan,  bg: 'rgba(0,212,255,0.14)' },
  amber: { fg: T.amber, bg: 'rgba(245,158,11,0.14)' },
  green: { fg: T.green, bg: 'rgba(16,185,129,0.14)' },
  blue:  { fg: T.blue,  bg: 'rgba(59,130,246,0.14)' },
  red:   { fg: T.red,   bg: 'rgba(239,68,68,0.14)' },
};

const TelemetryTimeline = () => {
  /* Build SVG path strings */
  const altPath = 'M ' + TIMELINE_SAMPLES.map(p => `${xAtT(p.t)} ${yAtAlt(p.alt)}`).join(' L ');
  const altArea = altPath + ` L ${xAtT(TL_DURATION)} ${tlPad.top + innerH} L ${xAtT(0)} ${tlPad.top + innerH} Z`;
  const battPath = 'M ' + TIMELINE_SAMPLES.map(p => `${xAtT(p.t)} ${yAtBatt(p.batt)}`).join(' L ');
  const spdPath  = 'M ' + TIMELINE_SAMPLES.map(p => `${xAtT(p.t)} ${yAtSpeed(p.spd)}`).join(' L ');

  return (
    <div style={{ background: T.panel, border: `1px solid ${T.hairline}`, borderRadius: 12, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '14px 22px', display: 'flex', alignItems: 'center', gap: 18, borderBottom: `1px solid ${T.hairline2}` }}>
        <div>
          <div style={{ fontFamily: T.ui, fontSize: 11, color: T.cyan, letterSpacing: '0.22em', fontWeight: 600 }}>FLIGHT TELEMETRY</div>
          <div style={{ fontFamily: T.ui, fontSize: 22, color: T.t1, fontWeight: 600, letterSpacing: '-0.01em', marginTop: 2 }}>Altitude · battery · speed · {TIMELINE_SAMPLES.length} samples</div>
        </div>
        {/* Trace legend */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 16 }}>
          <LegendChip color={T.cyan}  label="ALTITUDE AGL" detail="max 90 m · routine 78 m" fill/>
          <LegendChip color={T.amber} label="BATTERY %"    detail="98 → 62 · ∆ 36 pts"/>
          <LegendChip color={T.green} label="GROUND SPEED" detail="avg 4.8 · max 6.4 m/s"/>
        </div>
        <button style={timelineCtrlBtn}>
          <MI name="download" size={16} color={T.t2}/> CSV
        </button>
        <button style={timelineCtrlBtn}>
          <MI name="fullscreen" size={16} color={T.t2}/>
        </button>
      </div>

      {/* The chart */}
      <div style={{ position: 'relative', width: '100%', height: tlH, background: '#0c111c' }}>
        <svg width="100%" height={tlH} viewBox={`0 0 ${tlW} ${tlH}`} preserveAspectRatio="none">
          <defs>
            <linearGradient id="altGrad" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor={T.cyan} stopOpacity="0.40"/>
              <stop offset="1" stopColor={T.cyan} stopOpacity="0.02"/>
            </linearGradient>
            <pattern id="tlGrid" width="80" height="40" patternUnits="userSpaceOnUse">
              <path d="M 80 0 L 0 0 0 40" fill="none" stroke="rgba(248,250,252,0.04)" strokeWidth="1"/>
            </pattern>
          </defs>

          {/* Grid */}
          <rect x={tlPad.left} y={tlPad.top} width={innerW} height={innerH} fill="url(#tlGrid)"/>

          {/* Horizontal reference lines + altitude labels */}
          {[0, 30, 60, 90, 120].map(alt => (
            <g key={alt}>
              <line x1={tlPad.left} y1={yAtAlt(alt)} x2={tlPad.left + innerW} y2={yAtAlt(alt)} stroke="rgba(0,212,255,0.10)" strokeWidth="1" strokeDasharray="3 5"/>
              <text x={tlPad.left - 8} y={yAtAlt(alt) + 4} fill={T.t3} fontSize="11" fontFamily="Roboto Mono" textAnchor="end">{alt}m</text>
            </g>
          ))}
          {/* RTH alt ref */}
          <line x1={tlPad.left} y1={yAtAlt(90)} x2={tlPad.left + innerW} y2={yAtAlt(90)} stroke={T.blue} strokeWidth="1" strokeDasharray="5 4" opacity="0.6"/>
          <text x={tlPad.left + innerW - 6} y={yAtAlt(90) - 6} fill={T.blue} fontSize="10" fontFamily="Roboto Mono" textAnchor="end" fontWeight="600" letterSpacing="0.10em">RTH 90 m</text>

          {/* Photo capture pip strip — small camera glyphs along the orbit segment */}
          <g>
            {PHOTO_TIMES.map((t, i) => (
              <g key={i}>
                <line x1={xAtT(t)} y1={tlPad.top + innerH - 14} x2={xAtT(t)} y2={tlPad.top + innerH - 4} stroke={T.amber} strokeWidth="1.5" opacity="0.85"/>
                <circle cx={xAtT(t)} cy={tlPad.top + innerH - 14} r="2.5" fill={T.amber}/>
              </g>
            ))}
            {/* Orbit window background */}
            <rect x={xAtT(102)} y={tlPad.top + innerH - 22} width={xAtT(814) - xAtT(102)} height="22" fill="rgba(245,158,11,0.08)"/>
          </g>

          {/* Altitude area */}
          <path d={altArea} fill="url(#altGrad)"/>
          <path d={altPath} fill="none" stroke={T.cyan} strokeWidth="2.5"/>

          {/* Battery line */}
          <path d={battPath} fill="none" stroke={T.amber} strokeWidth="2" strokeDasharray="0" opacity="0.95"/>

          {/* Speed line */}
          <path d={spdPath} fill="none" stroke={T.green} strokeWidth="2" opacity="0.9"/>

          {/* Event markers */}
          {EVENTS.map((ev, i) => (
            <g key={i}>
              <line x1={xAtT(ev.t)} y1={tlPad.top} x2={xAtT(ev.t)} y2={tlPad.top + innerH} stroke={ToneColors[ev.tone].fg} strokeWidth="1" strokeDasharray="2 3" opacity="0.65"/>
              {/* dot */}
              <circle cx={xAtT(ev.t)} cy={tlPad.top + innerH} r="4" fill={ToneColors[ev.tone].fg}/>
            </g>
          ))}

          {/* X-axis time labels — every 2 min */}
          {[0, 120, 240, 360, 480, 600, 720, 840].map((tt, i) => (
            <g key={i}>
              <line x1={xAtT(tt)} y1={tlPad.top + innerH} x2={xAtT(tt)} y2={tlPad.top + innerH + 4} stroke={T.hairline} strokeWidth="1"/>
              <text x={xAtT(tt)} y={tlPad.top + innerH + 18} fill={T.t3} fontSize="11" fontFamily="Roboto Mono" textAnchor="middle">{formatTime(tt)}</text>
            </g>
          ))}
          <text x={xAtT(TL_DURATION)} y={tlPad.top + innerH + 18} fill={T.cyan} fontSize="11" fontFamily="Roboto Mono" textAnchor="end" fontWeight="600">{formatTime(TL_DURATION)}</text>
        </svg>

        {/* Event icon chips — positioned absolutely above the chart */}
        {EVENTS.map((ev, i) => {
          const tc = ToneColors[ev.tone];
          const x = (xAtT(ev.t) / tlW) * 100;
          const align = ev.t < 80 ? 'flex-start' : ev.t > TL_DURATION - 80 ? 'flex-end' : 'center';
          const transform = align === 'flex-start' ? 'translateX(0)' : align === 'flex-end' ? 'translateX(-100%)' : 'translateX(-50%)';
          return (
            <div key={i} style={{
              position: 'absolute', left: `${x}%`, top: 6,
              transform,
              padding: '4px 10px 4px 8px', borderRadius: 4,
              background: tc.bg, border: `1px solid ${tc.fg}80`,
              display: 'inline-flex', alignItems: 'center', gap: 6,
              backdropFilter: 'blur(4px)',
            }}>
              <MI name={ev.icon} size={14} color={tc.fg} fill={1}/>
              <span style={{ fontFamily: T.mono, fontSize: 10, color: tc.fg, fontWeight: 700, letterSpacing: '0.10em' }}>{formatTime(ev.t)}</span>
              <span style={{ fontFamily: T.ui, fontSize: 11, color: T.t1, fontWeight: 500 }}>{ev.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const timelineCtrlBtn = {
  height: 34, padding: '0 10px', borderRadius: 6,
  background: T.card, border: `1px solid ${T.hairline}`,
  display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer',
  fontFamily: T.ui, fontSize: 12, color: T.t1, fontWeight: 500,
};

const LegendChip = ({ color, label, detail, fill }) => (
  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 6, background: T.card, border: `1px solid ${T.hairline}` }}>
    <div style={{ width: 22, height: 4, borderRadius: 2, background: fill ? color : 'transparent', border: fill ? 'none' : `2px solid ${color}` }}/>
    <div>
      <div style={{ fontFamily: T.ui, fontSize: 10, color, letterSpacing: '0.16em', fontWeight: 700 }}>{label}</div>
      <div style={{ fontFamily: T.ui, fontSize: 11, color: T.t2, marginTop: 1 }}>{detail}</div>
    </div>
  </div>
);

/* ---------------- Hero summary band ---------------- */
const HeroStats = () => (
  <div style={{ padding: '20px 24px', background: T.panel, border: `1px solid ${T.hairline}`, borderRadius: 12, display: 'flex', alignItems: 'center', gap: 24 }}>
    {/* Status block */}
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ width: 60, height: 60, borderRadius: 12, background: 'rgba(16,185,129,0.14)', border: `1px solid ${T.green}`, display: 'grid', placeItems: 'center' }}>
        <MI name="check_circle" size={32} color={T.green} fill={1}/>
      </div>
      <div>
        <div style={{ fontFamily: T.ui, fontSize: 11, color: T.green, letterSpacing: '0.22em', fontWeight: 700 }}>✓ MISSION COMPLETE</div>
        <div style={{ fontFamily: T.ui, fontSize: 26, color: T.t1, fontWeight: 600, letterSpacing: '-0.01em', marginTop: 2 }}>{MISSION_META.name}</div>
        <div style={{ fontFamily: T.ui, fontSize: 13, color: T.t2, marginTop: 2 }}>{MISSION_META.id} · {MISSION_META.asset} · {MISSION_META.site} · {MISSION_META.flownAt}</div>
      </div>
    </div>

    <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10, marginLeft: 16 }}>
      <BigStat label="DURATION"      value={MISSION_META.duration}              sub="incl. RTH + land" color={T.t1}/>
      <BigStat label="PHOTOS"        value={MISSION_META.photoCount}             sub="24 / 24 captured" color={T.cyan}/>
      <BigStat label="DATA CAPTURED" value={`${MISSION_META.dataMb} MB`}        sub="3 still uploading" color={T.amber}/>
      <BigStat label="DISTANCE"      value={`${MISSION_META.totalDistance} m`}  sub="312 m flight path"/>
      <BigStat label="MAX ALT"       value={`${MISSION_META.maxAlt} m`}         sub="routine 78 m"/>
      <BigStat label="BATTERY USED"  value={`${MISSION_META.battStart - MISSION_META.battEnd}%`} sub={`98 → ${MISSION_META.battEnd}%`} color={T.green}/>
    </div>
  </div>
);

const BigStat = ({ label, value, sub, color }) => (
  <div style={{ padding: '10px 14px', borderRadius: 8, background: T.card, border: `1px solid ${T.hairline}` }}>
    <div style={{ fontFamily: T.ui, fontSize: 10, color: T.t3, letterSpacing: '0.18em', fontWeight: 500 }}>{label}</div>
    <div style={{ ...NUM, fontSize: 26, color: color || T.t1, fontWeight: 500, marginTop: 2, lineHeight: 1 }}>{value}</div>
    <div style={{ fontFamily: T.ui, fontSize: 11, color: T.t3, marginTop: 4 }}>{sub}</div>
  </div>
);

/* ---------------- Photo gallery ---------------- */
const PhotoThumb = ({ idx, uploading }) => (
  <div style={{ position: 'relative', aspectRatio: '4 / 3', borderRadius: 8, background: '#0c111c', overflow: 'hidden', border: `1px solid ${T.hairline}` }}>
    {/* Stylized photo content — fake an aerial tank view */}
    <svg width="100%" height="100%" viewBox="0 0 200 150" preserveAspectRatio="xMidYMid slice">
      <defs>
        <radialGradient id={`pg-${idx}`} cx="0.5" cy="0.4">
          <stop offset="0" stopColor="#3a3a3a"/>
          <stop offset="0.5" stopColor="#2a2a2a"/>
          <stop offset="1" stopColor="#1a1a1a"/>
        </radialGradient>
      </defs>
      <rect width="200" height="150" fill="#1a2030"/>
      <ellipse cx="100" cy="140" rx="100" ry="20" fill="#2a2820"/>
      <ellipse cx="100" cy="78" rx="76" ry="58" fill={`url(#pg-${idx})`}/>
      <ellipse cx="100" cy="78" rx="48" ry="34" fill="none" stroke="#2c2c2c" strokeWidth="1"/>
      <ellipse cx="100" cy="78" rx="22" ry="14" fill="none" stroke="#2c2c2c" strokeWidth="1"/>
      <circle cx="100" cy="78" r="5" fill="#0e0e0e" stroke="#4a4a4a" strokeWidth="1"/>
      {/* asset hint based on WP angle */}
      <g transform={`rotate(${(idx / 24) * 360} 100 78)`}>
        <line x1="100" y1="20" x2="100" y2="36" stroke={T.cyan} strokeWidth="1" opacity="0.5"/>
      </g>
    </svg>
    {/* WP badge */}
    <div style={{ position: 'absolute', top: 4, left: 4, padding: '2px 6px', borderRadius: 3, background: 'rgba(10,14,20,0.78)', border: `1px solid ${T.hairline}`, color: T.cyan, fontFamily: T.mono, fontSize: 10, fontWeight: 700, letterSpacing: '0.10em' }}>
      {String(idx + 1).padStart(2, '0')}
    </div>
    {/* lens chip */}
    <div style={{ position: 'absolute', top: 4, right: 4, padding: '2px 5px', borderRadius: 3, background: 'rgba(10,14,20,0.78)', color: T.t2, fontFamily: T.mono, fontSize: 9, fontWeight: 600, letterSpacing: '0.10em' }}>
      ZOOM 5×
    </div>
    {/* upload state */}
    {uploading && (
      <div style={{ position: 'absolute', bottom: 4, left: 4, right: 4, padding: '3px 6px', borderRadius: 4, background: 'rgba(245,158,11,0.18)', border: `1px solid ${T.amber}`, color: T.amber, fontFamily: T.mono, fontSize: 9, fontWeight: 700, letterSpacing: '0.10em', display: 'flex', alignItems: 'center', gap: 4 }}>
        <MI name="cloud_upload" size={11} color={T.amber}/> UPLOADING
      </div>
    )}
  </div>
);

const PhotoGallery = () => {
  const uploadingIdx = [21, 22, 23]; // last 3 still uploading
  return (
    <div style={{ background: T.panel, border: `1px solid ${T.hairline}`, borderRadius: 12, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '14px 18px', borderBottom: `1px solid ${T.hairline2}`, display: 'flex', alignItems: 'center', gap: 14 }}>
        <MI name="photo_camera" size={20} color={T.cyan}/>
        <span style={{ fontFamily: T.ui, fontSize: 16, color: T.t1, fontWeight: 600, letterSpacing: '-0.005em' }}>Captures</span>
        <span style={{ ...NUM, fontSize: 13, color: T.t2 }}>24 photos · 96.4 MB</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <FilterBtn label="All"        count={24} active/>
          <FilterBtn label="Uploading"  count={3} tone="amber"/>
          <FilterBtn label="JPG + RAW"  count={24}/>
        </div>
        <button style={timelineCtrlBtn}>
          <MI name="download" size={16} color={T.t2}/> Download
        </button>
        <button style={timelineCtrlBtn}>
          <MI name="ios_share" size={16} color={T.t2}/> Export
        </button>
      </div>
      <div style={{ flex: 1, padding: 14, display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 10, overflow: 'auto' }}>
        {Array.from({ length: 24 }).map((_, i) => (
          <PhotoThumb key={i} idx={i} uploading={uploadingIdx.includes(i)}/>
        ))}
      </div>
    </div>
  );
};

const FilterBtn = ({ label, count, active, tone }) => {
  const fg = tone === 'amber' ? T.amber : (active ? T.cyan : T.t2);
  return (
    <div style={{
      height: 30, padding: '0 10px', borderRadius: 5,
      background: active ? 'rgba(0,212,255,0.10)' : tone === 'amber' ? 'rgba(245,158,11,0.08)' : T.card,
      border: `1px solid ${active ? T.cyan : tone === 'amber' ? 'rgba(245,158,11,0.30)' : T.hairline}`,
      display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer',
      fontFamily: T.ui, fontSize: 12, fontWeight: 600, color: fg, letterSpacing: '0.04em',
    }}>
      {label}
      <span style={{ ...NUM, fontSize: 11, color: T.t3 }}>{count}</span>
    </div>
  );
};

/* ---------------- Flight log + path preview ---------------- */
const LOG_EVENTS = [
  { t: '00:00', tone: 'cyan',  icon: 'power_settings_new', label: 'Motors armed',         detail: 'Pilot K. Marshall · attestations complete' },
  { t: '00:18', tone: 'cyan',  icon: 'flight_takeoff',     label: 'Takeoff',              detail: 'Lift-off · 0.8 m/s climb · GPS FIX · 24 sats' },
  { t: '00:46', tone: 'cyan',  icon: 'arrow_upward',       label: 'Reached RTH altitude', detail: '90 m AGL · transit speed engaged' },
  { t: '01:26', tone: 'cyan',  icon: 'navigation',         label: 'Arrived above asset',  detail: 'Tank-04 · 124 m from home' },
  { t: '01:42', tone: 'cyan',  icon: 'circle',             label: 'Orbit started',        detail: 'r 12 m · alt 78 m · gimbal −45° · 24 photos planned' },
  { t: '07:42', tone: 'amber', icon: 'air',                label: 'Wind gust 7.6 m/s',    detail: 'Brief gust · drift compensated · no skipped frame' },
  { t: '13:34', tone: 'green', icon: 'check_circle',       label: '24 / 24 photos captured', detail: 'Orbit complete · all frames within target' },
  { t: '13:44', tone: 'blue',  icon: 'home_pin',           label: 'RTH commanded',        detail: 'Climbed to 90 m · routed 124 m home · bearing 322°' },
  { t: '14:14', tone: 'blue',  icon: 'flight_land',        label: 'Final descent',        detail: 'Surface check passed · 0.8 m/s touchdown rate' },
  { t: '14:36', tone: 'green', icon: 'check_circle',       label: 'Touchdown · motors stopped', detail: 'Mission complete · battery 62%' },
];

const FlightLog = () => (
  <div style={{ background: T.panel, border: `1px solid ${T.hairline}`, borderRadius: 12, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
    <div style={{ padding: '14px 18px', borderBottom: `1px solid ${T.hairline2}`, display: 'flex', alignItems: 'center', gap: 10 }}>
      <MI name="history" size={20} color={T.cyan}/>
      <span style={{ fontFamily: T.ui, fontSize: 16, color: T.t1, fontWeight: 600 }}>Flight log</span>
      <span style={{ ...NUM, fontSize: 12, color: T.t2 }}>10 events</span>
      <button style={{ marginLeft: 'auto', ...timelineCtrlBtn, height: 30 }}>
        <MI name="ios_share" size={14} color={T.t2}/> .JSON
      </button>
    </div>
    <div style={{ flex: 1, overflow: 'auto', padding: '8px 0' }}>
      {LOG_EVENTS.map((e, i) => {
        const tc = ToneColors[e.tone];
        return (
          <div key={i} style={{ padding: '10px 18px', display: 'flex', gap: 12, position: 'relative' }}>
            {/* connector line */}
            {i < LOG_EVENTS.length - 1 && (
              <div style={{ position: 'absolute', left: 28, top: 36, bottom: 0, width: 1, background: T.hairline2 }}/>
            )}
            <div style={{ width: 32, height: 32, borderRadius: 999, background: tc.bg, border: `1.5px solid ${tc.fg}80`, display: 'grid', placeItems: 'center', flexShrink: 0, position: 'relative', zIndex: 1 }}>
              <MI name={e.icon} size={16} color={tc.fg} fill={1}/>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                <span style={{ ...NUM, fontSize: 12, color: tc.fg, fontWeight: 600, letterSpacing: '0.06em' }}>T+{e.t}</span>
                <span style={{ fontFamily: T.ui, fontSize: 13, color: T.t1, fontWeight: 600 }}>{e.label}</span>
              </div>
              <div style={{ fontFamily: T.ui, fontSize: 12, color: T.t2, marginTop: 3, lineHeight: 1.45 }}>{e.detail}</div>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

/* ---------------- Path preview (mini map) ---------------- */
const PathPreview = () => (
  <div style={{ background: T.panel, border: `1px solid ${T.hairline}`, borderRadius: 12, overflow: 'hidden' }}>
    <div style={{ padding: '14px 18px', borderBottom: `1px solid ${T.hairline2}`, display: 'flex', alignItems: 'center', gap: 10 }}>
      <MI name="map" size={20} color={T.cyan}/>
      <span style={{ fontFamily: T.ui, fontSize: 16, color: T.t1, fontWeight: 600 }}>Flown path</span>
      <span style={{ ...NUM, fontSize: 12, color: T.t2 }}>312 m · matches plan</span>
      <button style={{ marginLeft: 'auto', ...timelineCtrlBtn, height: 30 }}>
        <MI name="open_in_full" size={14} color={T.cyan}/> Open
      </button>
    </div>
    <div style={{ position: 'relative', width: '100%', height: 220, background: '#0c111c', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
        <EsriTileGrid z={17} x={30880} y={54129} cols={5} rows={3} size={256} style={{
          position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
          filter: 'saturate(1.05) brightness(0.85) contrast(1.05)',
        }}/>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(120% 90% at 50% 50%, transparent 55%, rgba(10,14,20,0.55) 100%)' }}/>
      </div>
      <svg style={{ position: 'absolute', inset: 0 }} width="100%" height="100%" viewBox="0 0 520 220" preserveAspectRatio="xMidYMid slice">
        {/* completed orbit — green */}
        <circle cx="290" cy="120" r="64" fill="none" stroke={T.green} strokeWidth="3" opacity="0.95"/>
        {/* asset */}
        <circle cx="290" cy="120" r="20" fill="rgba(148,163,184,0.18)" stroke="rgba(148,163,184,0.5)" strokeWidth="1.5"/>
        <text x="290" y="124" textAnchor="middle" fill={T.t1} fontSize="11" fontWeight="600" letterSpacing="0.10em">TANK 04</text>
        {/* photo dots — green */}
        {Array.from({ length: 24 }).map((_, i) => {
          const a = (i / 24) * Math.PI * 2;
          const x = 290 + Math.cos(a) * 64;
          const y = 120 + Math.sin(a) * 64;
          return <circle key={i} cx={x} cy={y} r="3.5" fill={T.green} stroke="#0A0E14" strokeWidth="1"/>;
        })}
        {/* entry path from home pad (green dashed) */}
        <path d="M 80 170 Q 180 150 226 120" fill="none" stroke={T.green} strokeWidth="2" strokeDasharray="6 4" opacity="0.8"/>
        {/* return path (blue dashed) */}
        <path d="M 354 120 Q 240 90 80 170" fill="none" stroke={T.blue} strokeWidth="2" strokeDasharray="6 4" opacity="0.8"/>
        {/* home pad */}
        <g transform="translate(80, 170)">
          <rect x="-14" y="-14" width="28" height="28" rx="4" fill="rgba(16,185,129,0.30)" stroke={T.green} strokeWidth="1.5"/>
          <text x="0" y="4" textAnchor="middle" fill={T.green} fontSize="14" fontWeight="700">H</text>
        </g>
      </svg>
      <div style={{ position: 'absolute', top: 10, left: 10, padding: '4px 10px', borderRadius: 4, background: 'rgba(10,14,20,0.78)', border: `1px solid ${T.green}`, color: T.green, fontFamily: T.mono, fontSize: 10, fontWeight: 700, letterSpacing: '0.14em' }}>PLAN ↔ ACTUAL · 0.4 m max ∆</div>
    </div>
  </div>
);

/* ---------------- Upload status (compact card) ---------------- */
const UploadStatus = () => (
  <div style={{ background: T.panel, border: `1px solid ${T.hairline}`, borderRadius: 12, padding: '14px 18px' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
      <MI name="cloud_upload" size={20} color={T.amber}/>
      <span style={{ fontFamily: T.ui, fontSize: 14, color: T.t1, fontWeight: 600 }}>Cloud sync</span>
      <span style={{ marginLeft: 'auto', ...NUM, fontSize: 13, color: T.amber, fontWeight: 600 }}>3 of 24 uploading</span>
    </div>
    <div style={{ position: 'relative', height: 6, borderRadius: 3, background: '#0F1420', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, width: '87%', background: T.amber, borderRadius: 3 }}/>
    </div>
    <div style={{ display: 'flex', gap: 14, marginTop: 12, fontFamily: T.ui, fontSize: 11, color: T.t2 }}>
      <span><span style={{ color: T.green, fontWeight: 600 }}>21</span> uploaded</span>
      <span><span style={{ color: T.amber, fontWeight: 600 }}>3</span> in progress</span>
      <span><span style={{ color: T.t3, fontWeight: 600 }}>0</span> failed</span>
      <span style={{ marginLeft: 'auto', ...NUM, color: T.t1 }}>ETA 00:42</span>
    </div>
  </div>
);

/* ---------------- Top strip ---------------- */
const SummaryTopStrip = () => (
  <div style={{ height: 80, display: 'flex', alignItems: 'stretch', background: T.panel, borderBottom: `1px solid ${T.hairline}` }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '0 22px', borderRight: `1px solid ${T.hairline}` }}>
      <button style={{ width: 44, height: 44, borderRadius: 8, background: T.card, border: `1px solid ${T.hairline}`, display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
        <MI name={ICON.back} size={22} color={T.t1}/>
      </button>
      <div style={{ width: 40, height: 40, borderRadius: 8, background: 'rgba(16,185,129,0.20)', border: `1px solid ${T.green}`, display: 'grid', placeItems: 'center' }}>
        <MI name="check_circle" size={22} color={T.green} fill={1}/>
      </div>
      <div>
        <div style={{ fontFamily: T.ui, fontSize: 11, color: T.green, letterSpacing: '0.18em', fontWeight: 600 }}>MISSION COMPLETE · POST-FLIGHT</div>
        <div style={{ fontFamily: T.ui, fontSize: 17, color: T.t1, fontWeight: 500, marginTop: 1 }}>MR-2026-0428 · Tank 04 inspection</div>
      </div>
    </div>

    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, padding: '0 24px' }}>
      <SumTab label="Summary" icon="speed" active/>
      <SumTab label="Captures" icon="photo_library"/>
      <SumTab label="Telemetry" icon="show_chart"/>
      <SumTab label="Log" icon="history"/>
      <SumTab label="Compare to plan" icon="difference"/>

      <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
        <StatusPill tone="green" icon={<MI name="check_circle" size={14} color={T.green} fill={1}/>} label="ALL CAPTURED"/>
        <StatusPill tone="amber" icon={<MI name="cloud_upload" size={14} color={T.amber}/>} label="3 UPLOADING"/>
        <StatusPill tone="green" icon={<MI name="route" size={14} color={T.green}/>} label="0.4 m PLAN ∆"/>
      </div>
    </div>

    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 22px', borderLeft: `1px solid ${T.hairline}` }}>
      <button style={{ height: 44, padding: '0 14px', borderRadius: 8, background: T.card, border: `1px solid ${T.hairline}`, display: 'inline-flex', alignItems: 'center', gap: 8, color: T.t1, fontFamily: T.ui, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
        <MI name="picture_as_pdf" size={18} color={T.t1}/> Report
      </button>
      <button style={{ height: 44, padding: '0 14px', borderRadius: 8, background: T.card, border: `1px solid ${T.hairline}`, display: 'inline-flex', alignItems: 'center', gap: 8, color: T.t1, fontFamily: T.ui, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
        <MI name="ios_share" size={18} color={T.t1}/> Share
      </button>
      <button style={{ height: 44, padding: '0 18px', borderRadius: 8, background: T.cyan, border: 'none', display: 'inline-flex', alignItems: 'center', gap: 8, color: '#0A0E14', fontFamily: T.ui, fontSize: 13, fontWeight: 700, letterSpacing: '0.06em', cursor: 'pointer' }}>
        <MI name="flight_takeoff" size={18} color="#0A0E14"/> Next mission
      </button>
    </div>
  </div>
);

const SumTab = ({ label, icon, active }) => (
  <div style={{
    padding: '8px 14px', borderRadius: 8,
    background: active ? 'rgba(0,212,255,0.10)' : 'transparent',
    border: `1px solid ${active ? T.cyan : 'transparent'}`,
    display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
    color: active ? T.cyan : T.t2, fontFamily: T.ui, fontSize: 13, fontWeight: 600, letterSpacing: '0.02em',
  }}>
    <MI name={icon} size={18} color={active ? T.cyan : T.t2}/>
    {label}
  </div>
);

/* ---------------- The composed screen ---------------- */
const SummaryScreen = () => (
  <div style={{ width: 2304, height: 1440, background: T.bg, color: T.t1, fontFamily: T.ui, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
    <SummaryTopStrip/>
    <div style={{ flex: 1, padding: 24, display: 'flex', flexDirection: 'column', gap: 18, overflow: 'hidden' }}>
      <HeroStats/>
      <TelemetryTimeline/>
      {/* Bottom: gallery (left) + log + path + upload (right) */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1.55fr 1fr', gap: 18, minHeight: 0 }}>
        <PhotoGallery/>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, minHeight: 0 }}>
          <PathPreview/>
          <UploadStatus/>
          <div style={{ flex: 1, minHeight: 0 }}>
            <FlightLog/>
          </div>
        </div>
      </div>
    </div>
  </div>
);

window.SummaryScreen = SummaryScreen;
