/* Side state B: Timeline routine builder — the bolder layout.
   Instead of a right-rail of sliders, the routine is shown as a horizontal video-editor-style
   timeline at the bottom of the screen. Each stage is a card with duration, params, and a tiny
   parameter strip. The right rail collapses to a slim per-stage inspector. */

const tlToneMap = {
  cyan:  { fg: T.cyan,  bg: 'rgba(0,212,255,0.14)',  bd: T.cyan },
  blue:  { fg: T.blue,  bg: 'rgba(59,130,246,0.14)', bd: T.blue },
  amber: { fg: T.amber, bg: 'rgba(245,158,11,0.14)', bd: T.amber },
  green: { fg: T.green, bg: 'rgba(16,185,129,0.14)', bd: T.green },
  red:   { fg: T.red,   bg: 'rgba(239,68,68,0.14)',  bd: T.red },
};

/* Compute timeline geometry — each stage gets pixel width proportional to its duration */
const computeTimeline = (stages, totalWidth, gap = 8) => {
  const totalDur = stages.reduce((a, s) => a + s.dur, 0);
  const inner = totalWidth - gap * (stages.length - 1);
  let acc = 0;
  return stages.map((s, i) => {
    const w = Math.max(72, (s.dur / totalDur) * inner);
    const startSec = acc;
    acc += s.dur;
    return { ...s, w, startSec, endSec: acc };
  });
};

const TimelineStage = ({ s, active, idx }) => {
  const tm = tlToneMap[s.tone] || tlToneMap.cyan;
  return (
    <div style={{
      width: s.w, height: '100%',
      borderRadius: 10,
      background: active ? tm.bg : T.card,
      border: `1.5px solid ${active ? tm.bd : T.hairline}`,
      boxShadow: active ? `0 0 0 3px rgba(0,212,255,0.10), 0 16px 32px rgba(0,0,0,0.4)` : 'none',
      display: 'flex', flexDirection: 'column',
      position: 'relative', overflow: 'hidden',
      cursor: 'pointer',
    }}>
      {/* Header */}
      <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: `1px solid ${T.hairline2}` }}>
        <div style={{ width: 28, height: 28, borderRadius: 6, background: tm.bg, border: `1px solid ${tm.bd}`, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
          <MI name={s.icon} size={16} color={tm.fg}/>
        </div>
        <span style={{ ...NUM, fontSize: 10, color: T.t3, fontWeight: 600, letterSpacing: '0.10em' }}>{String(idx + 1).padStart(2, '0')}</span>
        <span style={{ marginLeft: 'auto', ...NUM, fontSize: 11, color: tm.fg, fontWeight: 600 }}>
          {Math.floor(s.dur / 60)}:{String(s.dur % 60).padStart(2, '0')}
        </span>
      </div>

      {/* Body */}
      <div style={{ flex: 1, padding: '8px 12px', minWidth: 0 }}>
        <div style={{ fontFamily: T.ui, fontSize: s.w < 120 ? 12 : 13, color: T.t1, fontWeight: 600, lineHeight: 1.15, marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.label}</div>
        {s.w > 110 && (
          <div style={{ fontFamily: T.ui, fontSize: 11, color: T.t2, lineHeight: 1.35 }}>{s.detail}</div>
        )}
      </div>

      {/* Captures pip strip — only on the orbit stage */}
      {s.captures && (
        <div style={{ padding: '6px 12px 10px', display: 'flex', alignItems: 'center', gap: 3, borderTop: `1px solid ${T.hairline2}` }}>
          <MI name="camera" size={14} color={T.amber}/>
          <div style={{ flex: 1, display: 'flex', gap: 2, height: 14, alignItems: 'center' }}>
            {Array.from({ length: Math.min(24, s.captures) }).map((_, i) => (
              <div key={i} style={{ flex: 1, height: 14, background: T.amber, opacity: i === 0 ? 1 : 0.55, borderRadius: 1 }}/>
            ))}
          </div>
          <span style={{ ...NUM, fontSize: 10, color: T.amber, fontWeight: 600 }}>×{s.captures}</span>
        </div>
      )}

      {/* Active indicator */}
      {active && (
        <div style={{ position: 'absolute', top: 8, right: 8, padding: '2px 6px', borderRadius: 4, background: tm.fg, color: '#0A0E14', fontFamily: T.mono, fontSize: 9, fontWeight: 700, letterSpacing: '0.10em' }}>EDIT</div>
      )}
    </div>
  );
};

const TimelineTrack = ({ activeStageId = 'orbit' }) => {
  const trackWidth = 2304 - 320 - 460 - 64; /* viewport minus left rail, right inspector, padding */
  const stages = computeTimeline(ORBIT_STAGES, trackWidth);
  const total = stages.reduce((a, s) => a + s.dur, 0);
  return (
    <div style={{ background: T.panelHi, borderTop: `1px solid ${T.hairline}`, padding: '14px 20px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Track header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <span style={{ fontFamily: T.ui, fontSize: 11, color: T.t3, letterSpacing: '0.18em', fontWeight: 700 }}>FLIGHT TIMELINE</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 4, background: T.card, border: `1px solid ${T.hairline}` }}>
          <MI name="schedule" size={14} color={T.t2}/>
          <span style={{ ...NUM, fontSize: 12, color: T.t1, fontWeight: 600 }}>{Math.floor(total/60)}:{String(total%60).padStart(2,'0')}</span>
          <span style={{ fontFamily: T.ui, fontSize: 11, color: T.t3 }}>est. duration</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 4, background: T.card, border: `1px solid ${T.hairline}` }}>
          <MI name="camera" size={14} color={T.amber}/>
          <span style={{ ...NUM, fontSize: 12, color: T.amber, fontWeight: 600 }}>24</span>
          <span style={{ fontFamily: T.ui, fontSize: 11, color: T.t3 }}>captures</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 4, background: T.card, border: `1px solid ${T.hairline}` }}>
          <MI name="battery_5_bar" size={14} color={T.green}/>
          <span style={{ ...NUM, fontSize: 12, color: T.green, fontWeight: 600 }}>62%</span>
          <span style={{ fontFamily: T.ui, fontSize: 11, color: T.t3 }}>on return</span>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button style={tbtn}>
            <MI name="undo" size={16} color={T.t2}/>
          </button>
          <button style={tbtn}>
            <MI name="add" size={16} color={T.cyan}/> Add stage
          </button>
          <button style={tbtn}>
            <MI name={ICON.play} size={16} color={T.cyan} fill={1}/> Simulate
          </button>
          <button style={tbtn}>
            <MI name="grid_view" size={16} color={T.t2}/> Slider view
          </button>
        </div>
      </div>

      {/* Ruler */}
      <div style={{ position: 'relative', height: 16, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: '0 4px' }}>
        {Array.from({ length: 11 }).map((_, i) => {
          const t = (i / 10) * total;
          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <span style={{ ...NUM, fontSize: 9, color: T.t3 }}>{Math.floor(t / 60)}:{String(Math.floor(t) % 60).padStart(2, '0')}</span>
              <div style={{ width: 1, height: 5, background: T.hairline }}/>
            </div>
          );
        })}
      </div>

      {/* Stage cards */}
      <div style={{ display: 'flex', alignItems: 'stretch', gap: 8, height: 168, position: 'relative' }}>
        {stages.map((s, i) => <TimelineStage key={s.id} s={s} idx={i} active={s.id === activeStageId}/>)}

        {/* Playhead at end of stage 3 (transit) */}
        <div style={{ position: 'absolute', top: -22, bottom: -8, left: stages.slice(0, 4).reduce((a, s) => a + s.w, 0) + 8 * 3, width: 2, background: T.cyan }}>
          <div style={{ position: 'absolute', top: -8, left: -7, width: 16, height: 16, borderRadius: 999, background: T.cyan, border: '2px solid #0A0E14' }}/>
        </div>
      </div>

      {/* Param strip — sliders for the active stage */}
      <div style={{ marginTop: 4, display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12 }}>
        <ParamBox label="Radius"        value="12 m"   pct={20}/>
        <ParamBox label="Altitude AGL"  value="78 m"   pct={64}/>
        <ParamBox label="Photos"        value="24"     pct={50}/>
        <ParamBox label="Gimbal pitch"  value="−45°"   pct={50}/>
        <ParamBox label="Start heading" value="0°"     pct={0}/>
        <ParamBox label="Cruise speed"  value="5.0 m/s"pct={62}/>
      </div>
    </div>
  );
};

const tbtn = {
  height: 32, padding: '0 12px', borderRadius: 6,
  background: T.card, border: `1px solid ${T.hairline}`,
  display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer',
  fontFamily: T.ui, fontSize: 12, color: T.t1, fontWeight: 500, letterSpacing: '0.04em',
};

const ParamBox = ({ label, value, pct }) => (
  <div style={{ padding: '10px 14px', borderRadius: 8, background: T.card, border: `1px solid ${T.hairline}` }}>
    <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 6 }}>
      <span style={{ fontFamily: T.ui, fontSize: 11, color: T.t3, letterSpacing: '0.14em', fontWeight: 500 }}>{label.toUpperCase()}</span>
      <span style={{ marginLeft: 'auto', ...NUM, fontSize: 14, color: T.cyan, fontWeight: 600 }}>{value}</span>
    </div>
    <div style={{ position: 'relative', height: 4, borderRadius: 2, background: '#0F1420' }}>
      <div style={{ position: 'absolute', inset: 0, width: `${pct}%`, background: T.cyan, borderRadius: 2 }}/>
      <div style={{ position: 'absolute', left: `${pct}%`, top: '50%', transform: 'translate(-50%, -50%)', width: 10, height: 10, borderRadius: 999, background: T.cyan }}/>
    </div>
  </div>
);

/* Right inspector — slim panel showing the active stage's details + add/remove */
const StageInspector = ({ stage = ORBIT_STAGES[4] }) => {
  const tm = tlToneMap[stage.tone] || tlToneMap.cyan;
  return (
    <div style={{ width: 460, background: T.panel, borderLeft: `1px solid ${T.hairline}`, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '16px 18px', borderBottom: `1px solid ${T.hairline}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontFamily: T.ui, fontSize: 11, color: T.t3, letterSpacing: '0.18em', fontWeight: 600 }}>STAGE INSPECTOR</span>
          <span style={{ marginLeft: 'auto', ...NUM, fontSize: 11, color: T.t3 }}>5 of 8</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 8, background: tm.bg, border: `1px solid ${tm.bd}`, display: 'grid', placeItems: 'center' }}>
            <MI name={stage.icon} size={22} color={tm.fg}/>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: T.ui, fontSize: 18, color: T.t1, fontWeight: 600, letterSpacing: '-0.01em' }}>{stage.label}</div>
            <div style={{ ...NUM, fontSize: 12, color: T.t2, marginTop: 2 }}>T+04:00 → T+11:12 · {Math.floor(stage.dur/60)}:{String(stage.dur%60).padStart(2,'0')}</div>
          </div>
        </div>
        <div style={{ marginTop: 10, fontFamily: T.ui, fontSize: 13, color: T.t2, lineHeight: 1.5 }}>{stage.detail}</div>
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        <SliderRow label="Standoff radius"  value={12}   unit="m"   pct={20}/>
        <SliderRow label="Altitude AGL"     value={78}   unit="m"   pct={64}/>
        <SliderRow label="Number of photos" value={24}   unit=""    pct={50}/>
        <SliderRow label="Gimbal pitch"     value={-45}  unit="°"   pct={50}/>
        <SliderRow label="Start heading"    value={0}    unit="°"   pct={0}/>
        <SliderRow label="Cruise speed"     value={5.0}  unit="m/s" pct={62}/>

        <div style={{ padding: '14px 18px 6px', borderTop: `1px solid ${T.hairline}`, marginTop: 8, fontFamily: T.ui, fontSize: 11, color: T.t3, letterSpacing: '0.18em', fontWeight: 600 }}>CAPTURE FOR THIS STAGE</div>
        <CapRow label="Lens"     value="ZOOM 5×"/>
        <CapRow label="Exposure" value="AUTO"/>
        <CapRow label="Trigger"  value="ON WP HOVER"/>
      </div>

      <div style={{ padding: '12px 18px', background: T.panelHi, borderTop: `1px solid ${T.hairline}`, display: 'flex', gap: 8 }}>
        <button style={{ ...builderSecondary, height: 40, padding: '0 12px' }}>
          <MI name="delete" size={16} color={T.red}/>
        </button>
        <button style={{ ...builderSecondary, height: 40, padding: '0 12px' }}>
          <MI name="content_copy" size={16} color={T.t2}/> Duplicate
        </button>
        <button style={{ ...builderSecondary, height: 40, flex: 1 }}>
          <MI name="add" size={16} color={T.cyan}/> Insert stage after
        </button>
      </div>
    </div>
  );
};

const SliderRow = ({ label, value, unit, pct }) => (
  <div style={{ padding: '12px 18px', borderBottom: `1px solid ${T.hairline2}` }}>
    <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 8 }}>
      <span style={{ fontFamily: T.ui, fontSize: 13, color: T.t1, fontWeight: 500 }}>{label}</span>
      <span style={{ marginLeft: 'auto', ...NUM, fontSize: 18, color: T.cyan, fontWeight: 500 }}>{value}<span style={{ fontFamily: T.ui, fontSize: 12, color: T.t3, fontWeight: 500, marginLeft: 4 }}>{unit}</span></span>
    </div>
    <div style={{ position: 'relative', height: 6, borderRadius: 3, background: '#0F1420' }}>
      <div style={{ position: 'absolute', inset: 0, width: `${pct}%`, background: T.cyan, borderRadius: 3 }}/>
      <div style={{ position: 'absolute', left: `${pct}%`, top: '50%', transform: 'translate(-50%, -50%)', width: 16, height: 16, borderRadius: 999, background: T.cyan, boxShadow: '0 0 0 4px rgba(0,212,255,0.20)' }}/>
    </div>
  </div>
);

window.TimelineTrack = TimelineTrack;
window.StageInspector = StageInspector;
