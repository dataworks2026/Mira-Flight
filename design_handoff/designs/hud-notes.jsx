/* Departures + trade-offs annotation boards */

const NoteCard = ({ num, title, body, tone = 'cyan', icon }) => {
  const toneFg = tone === 'amber' ? T.amber : tone === 'green' ? T.green : tone === 'red' ? T.red : T.cyan;
  const toneBg = tone === 'amber' ? 'rgba(245,158,11,0.06)' : tone === 'green' ? 'rgba(16,185,129,0.06)' : tone === 'red' ? 'rgba(239,68,68,0.06)' : 'rgba(0,212,255,0.06)';
  return (
    <div style={{
      background: T.panel, border: `1px solid ${T.hairline}`, borderRadius: 12,
      padding: 28, display: 'flex', flexDirection: 'column', gap: 14,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 8, background: toneBg, border: `1px solid ${toneFg}40`,
          display: 'grid', placeItems: 'center', color: toneFg, fontFamily: T.ui, fontSize: 18, fontWeight: 700,
        }}>{num}</div>
        <div style={{ fontFamily: T.ui, fontSize: 24, color: T.t1, fontWeight: 600, letterSpacing: '-0.01em' }}>{title}</div>
        {icon && <div style={{ marginLeft: 'auto', color: toneFg }}>{icon}</div>}
      </div>
      <div style={{ fontFamily: T.ui, fontSize: 18, color: T.t2, lineHeight: 1.55 }}>
        {body}
      </div>
    </div>
  );
};

const Departures = () => (
  <div style={{ width: 2304, height: 1440, background: T.bg, padding: 80, fontFamily: T.ui, color: T.t1, display: 'flex', flexDirection: 'column', gap: 32 }}>
    <div>
      <div style={{ fontSize: 13, color: T.cyan, letterSpacing: '0.22em', fontWeight: 700, marginBottom: 12 }}>HUD · IN-FLIGHT · 2304 × 1440</div>
      <div style={{ fontSize: 52, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 8 }}>Where we depart from DJI Pilot 2</div>
      <div style={{ fontSize: 20, color: T.t2, maxWidth: 1400 }}>
        DJI Pilot 2 is the operator's mental model — but it's built for hand-flown cinematography. Mira flies <em style={{ color: T.t1, fontStyle: 'normal' }}>autonomous infrastructure routines</em>. The HUD has to answer different questions: "is the mission tracking?", not "where do I point the gimbal?".
      </div>
    </div>

    <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28 }}>
      <NoteCard num="01" title="Right rail = mission, not camera menu" body={<>DJI's right edge is a camera shutter stack — shutter, record, gallery, mode toggle. Mira puts the <strong style={{color:T.t1}}>mission state machine</strong> there instead: progress, next-WP context, the live waypoint list, then PAUSE + hold-to-confirm flight control. Camera concerns live <em style={{color:T.t1, fontStyle:'normal'}}>on</em> the video frame (lens chip, zoom, exposure) since they apply to the live shot — not to the mission.</>}/>
      <NoteCard num="02" title="Telemetry is a tape, not a strip" tone="cyan" body={<>DJI scatters telemetry across the top bar. At 2304 px and gloved fingers, that's a row of 12-pt numerics. We move it to a <strong style={{color:T.t1}}>360 px left tape</strong> — six fields at 36-52 px JetBrains-Mono tabular-nums. ALT and SPD get hero treatment because those are the fields a pilot scans every 2 seconds.</>}/>
      <NoteCard num="03" title="Battery is a kill-clock, not a percentage" tone="amber" body={<>DJI shows "64%" with one threshold tick. Mira shows the percentage <strong style={{color:T.t1}}>and</strong> both critical thresholds on the bar (RTH @ 25%, LAND @ 15%), plus voltage and pack temperature. The pilot can <em style={{color:T.t1, fontStyle:'normal'}}>see</em> how much margin remains to forced action — not compute it.</>}/>
      <NoteCard num="04" title="Hold-to-confirm on every destructive action" tone="red" body={<>DJI's RTH and Land are single tap with a modal. Per Mira principle #6, RTH / LAND / ABORT all require a <strong style={{color:T.t1}}>2-second hold</strong> with a visible ring fill. Pause is the only single-tap because it's reversible. The cluster also color-codes severity (blue → amber → red) so a glance reads intent.</>}/>
      <NoteCard num="05" title="Video has live AR, not just a feed" tone="green" body={<>DJI overlays nothing. Because we know the asset geometry (Tank-04, coords, dims), we render an <strong style={{color:T.t1}}>AR target label</strong> on the live frame pointing at what we're currently inspecting. Confirms the routine is hitting the right subject without leaving the video.</>}/>
      <NoteCard num="06" title="One-tap swap, generous PiP" body={<>DJI's PiP is a postage stamp in the corner — useful only for "drone is roughly there". Mira's PiP is <strong style={{color:T.t1}}>520 × 380</strong>: big enough to read waypoint distance, geofence margin, home heading. Tap the swap icon (or anywhere on the PiP) and the two views invert. Either view is a first-class primary.</>}/>
    </div>
  </div>
);

const Tradeoffs = () => (
  <div style={{ width: 2304, height: 1440, background: T.bg, padding: 80, fontFamily: T.ui, color: T.t1, display: 'flex', flexDirection: 'column', gap: 28 }}>
    <div>
      <div style={{ fontSize: 13, color: T.amber, letterSpacing: '0.22em', fontWeight: 700, marginBottom: 12 }}>OPEN QUESTIONS · NEED YOUR INPUT</div>
      <div style={{ fontSize: 52, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 8 }}>Three trade-offs to resolve before alt states</div>
      <div style={{ fontSize: 20, color: T.t2, maxWidth: 1400 }}>
        These are real forks where the right answer depends on how your operators actually fly, not on aesthetics. Pick one in each and I'll lock the layout, then move to alt states (PAUSED, LOW_BATTERY, RTH, LOST_LINK, ABORT confirm, geofence breach).
      </div>
    </div>

    <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24 }}>
      <div style={{ background: T.panel, border: `1px solid ${T.hairline}`, borderRadius: 12, padding: 28, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontSize: 14, color: T.cyan, fontWeight: 700, letterSpacing: '0.16em' }}>A · DEFAULT VIEW</div>
        <div style={{ fontSize: 26, fontWeight: 600, lineHeight: 1.2 }}>Video-primary or map-primary on first frame?</div>
        <div style={{ fontSize: 16, color: T.t2, lineHeight: 1.6, flex: 1 }}>
          Video-primary feels like a DSLR — pilot composes the shot. Map-primary feels like a console — pilot supervises the routine. Autonomous routines lean toward the latter; manual nudges lean toward the former. <strong style={{ color: T.t1 }}>My pick: video-primary default, swap-state persists per mission.</strong>
        </div>
        <div style={{ display: 'flex', gap: 8, paddingTop: 6 }}>
          <span style={{ flex: 1, padding: '10px 12px', borderRadius: 8, background: 'rgba(0,212,255,0.10)', border: `1px solid ${T.cyan}`, color: T.cyan, fontSize: 13, fontWeight: 700, textAlign: 'center', letterSpacing: '0.06em' }}>Video</span>
          <span style={{ flex: 1, padding: '10px 12px', borderRadius: 8, background: T.card, border: `1px solid ${T.hairline}`, color: T.t2, fontSize: 13, fontWeight: 700, textAlign: 'center', letterSpacing: '0.06em' }}>Map</span>
          <span style={{ flex: 1, padding: '10px 12px', borderRadius: 8, background: T.card, border: `1px solid ${T.hairline}`, color: T.t2, fontSize: 13, fontWeight: 700, textAlign: 'center', letterSpacing: '0.06em' }}>50/50 split</span>
        </div>
      </div>

      <div style={{ background: T.panel, border: `1px solid ${T.hairline}`, borderRadius: 12, padding: 28, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontSize: 14, color: T.cyan, fontWeight: 700, letterSpacing: '0.16em' }}>B · TELEMETRY DENSITY</div>
        <div style={{ fontSize: 26, fontWeight: 600, lineHeight: 1.2 }}>5 hero fields, or 8 with progressive disclosure?</div>
        <div style={{ fontSize: 16, color: T.t2, lineHeight: 1.6, flex: 1 }}>
          Current draft: 6 on the tape + battery block + GPS/RC block = 9 fields visible always. Alternative: 5 hero (ALT, SPD, BAT, GPS, HDG) + an expandable drawer for the rest. <strong style={{ color: T.t1 }}>My pick: keep 8–9 always-on.</strong> Pilots don't expand drawers in wind.
        </div>
        <div style={{ display: 'flex', gap: 8, paddingTop: 6 }}>
          <span style={{ flex: 1, padding: '10px 12px', borderRadius: 8, background: T.card, border: `1px solid ${T.hairline}`, color: T.t2, fontSize: 13, fontWeight: 700, textAlign: 'center', letterSpacing: '0.06em' }}>5 hero</span>
          <span style={{ flex: 1, padding: '10px 12px', borderRadius: 8, background: 'rgba(0,212,255,0.10)', border: `1px solid ${T.cyan}`, color: T.cyan, fontSize: 13, fontWeight: 700, textAlign: 'center', letterSpacing: '0.06em' }}>8 always</span>
          <span style={{ flex: 1, padding: '10px 12px', borderRadius: 8, background: T.card, border: `1px solid ${T.hairline}`, color: T.t2, fontSize: 13, fontWeight: 700, textAlign: 'center', letterSpacing: '0.06em' }}>12 dense</span>
        </div>
      </div>

      <div style={{ background: T.panel, border: `1px solid ${T.hairline}`, borderRadius: 12, padding: 28, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontSize: 14, color: T.cyan, fontWeight: 700, letterSpacing: '0.16em' }}>C · DESTRUCTIVE LAYOUT</div>
        <div style={{ fontSize: 26, fontWeight: 600, lineHeight: 1.2 }}>3 hold-buttons inline, or red drawer that opens first?</div>
        <div style={{ fontSize: 16, color: T.t2, lineHeight: 1.6, flex: 1 }}>
          Inline = one motion to abort, but RTH/LAND/ABORT are always exposed. Drawer = two-step to anything destructive, with the trade that a panicked tap on the trigger eats a second before you can act. <strong style={{ color: T.t1 }}>My pick: inline.</strong> Hold-to-confirm is already the gate.
        </div>
        <div style={{ display: 'flex', gap: 8, paddingTop: 6 }}>
          <span style={{ flex: 1, padding: '10px 12px', borderRadius: 8, background: 'rgba(0,212,255,0.10)', border: `1px solid ${T.cyan}`, color: T.cyan, fontSize: 13, fontWeight: 700, textAlign: 'center', letterSpacing: '0.06em' }}>Inline · hold</span>
          <span style={{ flex: 1, padding: '10px 12px', borderRadius: 8, background: T.card, border: `1px solid ${T.hairline}`, color: T.t2, fontSize: 13, fontWeight: 700, textAlign: 'center', letterSpacing: '0.06em' }}>Drawer</span>
          <span style={{ flex: 1, padding: '10px 12px', borderRadius: 8, background: T.card, border: `1px solid ${T.hairline}`, color: T.t2, fontSize: 13, fontWeight: 700, textAlign: 'center', letterSpacing: '0.06em' }}>Kill switch only</span>
        </div>
      </div>
    </div>

    <div style={{ background: T.panelHi, border: `1px solid ${T.hairline}`, borderRadius: 12, padding: '20px 28px', display: 'flex', alignItems: 'center', gap: 18 }}>
      <div style={{ width: 44, height: 44, borderRadius: 999, background: 'rgba(0,212,255,0.12)', border: `1px solid ${T.cyan}`, color: T.cyan, display: 'grid', placeItems: 'center' }}>→</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, color: T.cyan, fontWeight: 700, letterSpacing: '0.16em' }}>NEXT</div>
        <div style={{ fontSize: 19, color: T.t1, marginTop: 4 }}>Pick A/B/C above, then I'll wire alt states: <span style={{ color: T.t2 }}>PAUSED · LOW_BATTERY · RTH active · LOST_LINK (15s ghost) · ABORT confirm · geofence breach · photo failure</span>.</div>
      </div>
    </div>
  </div>
);

window.Departures = Departures;
window.Tradeoffs = Tradeoffs;
