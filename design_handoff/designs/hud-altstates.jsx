/* HUD alt-state matrix
   Same layout chassis as HudMain, but every region (top pill, telem rail, mission panel,
   banners, map/video overlays, control cluster) reads from a per-state config so the diff
   between states is grep-able. One config object = one artboard.

   States covered:
     PAUSED            — pilot tapped pause, mission held mid-orbit
     RTH_ACTIVE        — smart RTH executing, dog-legged climb to RTH alt
     LOW_BATTERY       — 25% threshold tripped, 10 s grace before auto-RTH
     CRITICAL_BATTERY  — 15% threshold, auto-LAND in progress, uncancelable
     LOST_LINK         — RC link lost 4 s ago, 1 s to failsafe RTH
     GPS_DEGRADED      — RTK lost + sats < 8, dropped to attitude mode
     GEOFENCE_HOVER    — drone braked at geofence boundary, awaiting pilot
     OBSTACLE_BRAKE    — vision system flagged obstacle, drone braked, prompt to retry/skip
     MISSION_COMPLETE  — last WP captured, idling at safe alt, awaiting RTH/LAND
*/

/* ---------------- Banner — the headline interrupt over the video ---------------- */
const StateBanner = ({ tone, icon, title, sub, countdown, action, pinned = 'top' }) => {
  const toneMap = {
    cyan:  { fg: T.cyan,   bd: 'rgba(0,212,255,0.55)',  bg: 'rgba(0,212,255,0.10)'  },
    blue:  { fg: T.blue,   bd: 'rgba(59,130,246,0.55)', bg: 'rgba(59,130,246,0.10)' },
    amber: { fg: T.amber,  bd: 'rgba(245,158,11,0.55)', bg: 'rgba(245,158,11,0.10)' },
    red:   { fg: T.red,    bd: 'rgba(239,68,68,0.60)',  bg: 'rgba(239,68,68,0.10)'  },
    green: { fg: T.green,  bd: 'rgba(16,185,129,0.55)', bg: 'rgba(16,185,129,0.10)' },
    purple:{ fg: T.purple, bd: 'rgba(167,139,250,0.55)',bg: 'rgba(167,139,250,0.10)'},
  }[tone];
  const posStyle = pinned === 'top'
    ? { top: 24, left: 24, right: 24 }
    : { bottom: 24, left: 24, right: 24 };
  return (
    <div style={{
      position: 'absolute', ...posStyle,
      padding: '18px 22px', borderRadius: 12,
      background: `rgba(10,14,20,0.85)`,
      border: `1.5px solid ${toneMap.bd}`,
      backdropFilter: 'blur(10px)',
      display: 'flex', alignItems: 'center', gap: 20,
      boxShadow: `0 0 0 1px ${toneMap.bg}, 0 24px 40px rgba(0,0,0,0.5)`,
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: 12,
        background: toneMap.bg, border: `1px solid ${toneMap.bd}`,
        display: 'grid', placeItems: 'center',
      }}>
        <MI name={icon} size={28} color={toneMap.fg} fill={1} weight={600}/>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: T.ui, fontSize: 11, color: toneMap.fg, letterSpacing: '0.18em', fontWeight: 700 }}>
          {tone === 'red' ? '⚠ CRITICAL' : tone === 'amber' ? '⚠ WARNING' : tone === 'green' ? '✓ STATUS' : '◆ STATE'}
        </div>
        <div style={{ fontFamily: T.ui, fontSize: 22, color: T.t1, fontWeight: 600, letterSpacing: '-0.01em' }}>{title}</div>
        {sub && <div style={{ fontFamily: T.ui, fontSize: 14, color: T.t2 }}>{sub}</div>}
      </div>
      {countdown != null && (
        <div style={{
          padding: '12px 22px', borderRadius: 10,
          background: toneMap.bg, border: `1px solid ${toneMap.bd}`,
          textAlign: 'center', minWidth: 140,
        }}>
          <div style={{ fontFamily: T.ui, fontSize: 10, color: toneMap.fg, letterSpacing: '0.18em', fontWeight: 700 }}>{countdown.label}</div>
          <div style={{ ...NUM, fontSize: 32, color: toneMap.fg, fontWeight: 600, lineHeight: 1, marginTop: 4 }}>{countdown.value}</div>
        </div>
      )}
      {action && (
        <button style={{
          padding: '14px 22px', borderRadius: 10,
          background: tone === 'red' || tone === 'amber' ? toneMap.fg : 'transparent',
          border: `1.5px solid ${toneMap.fg}`,
          color: tone === 'red' || tone === 'amber' ? '#0A0E14' : toneMap.fg,
          fontFamily: T.ui, fontSize: 14, fontWeight: 700, letterSpacing: '0.10em',
          display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
        }}>
          {action.icon && <MI name={action.icon} size={18} color={tone === 'red' || tone === 'amber' ? '#0A0E14' : toneMap.fg}/>}
          {action.label}
        </button>
      )}
    </div>
  );
};

/* ---------------- Stateful TopStrip ---------------- */
const TopStripState = ({ state }) => {
  const p = state.topPill;
  const notices = state.notices || [];
  return (
    <div style={{
      height: 80, display: 'flex', alignItems: 'stretch',
      background: T.panel, borderBottom: `1px solid ${T.hairline}`,
    }}>
      <div style={{ width: 360, display: 'flex', alignItems: 'center', gap: 14, padding: '0 24px', borderRight: `1px solid ${T.hairline}` }}>
        <div style={{ width: 40, height: 40, borderRadius: 8, background: 'linear-gradient(135deg, #00D4FF 0%, #0099BD 100%)', display: 'grid', placeItems: 'center' }}>
          <MI name={ICON.drone} size={22} color="#0A0E14" weight={700} fill={1}/>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div style={{ fontFamily: T.ui, fontSize: 11, color: T.t3, letterSpacing: '0.18em', fontWeight: 500 }}>MISSION</div>
          <div style={{ fontFamily: T.ui, fontSize: 17, color: T.t1, fontWeight: 500 }}>Refinery North · Tank 04</div>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 14, padding: '0 24px' }}>
        <StatusPill tone={p.tone} icon={<MI name={p.icon} size={16} color={toneColor(p.tone === 'amber' ? 'warn' : p.tone === 'red' ? 'crit' : p.tone === 'green' ? 'ok' : 'ok')} fill={1}/>} label={p.label}/>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontFamily: T.ui, fontSize: 11, color: T.t3, letterSpacing: '0.18em', fontWeight: 500 }}>T+</span>
          <span style={{ ...NUM, fontSize: 24, color: T.t1, fontWeight: 500 }}>{state.tplus || '00:04:21'}</span>
        </div>
        <div style={{ width: 1, height: 28, background: T.hairline, margin: '0 2px' }}/>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontFamily: T.ui, fontSize: 11, color: T.t3, letterSpacing: '0.18em', fontWeight: 500 }}>{state.etaLabel || 'ETA'}</span>
          <span style={{ ...NUM, fontSize: 18, color: state.etaColor || T.t2, fontWeight: 500 }}>{state.eta || '03:27'}</span>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <StatusPill tone={state.link.tone} icon={<MI name={ICON.signal} size={14} color={toneColor(state.link.tone === 'red' ? 'crit' : state.link.tone === 'amber' ? 'warn' : 'ok')}/>} label="LINK" value={state.link.value}/>
          <StatusPill tone={state.rtk.tone} icon={<MI name={ICON.rtk} size={14} color={toneColor(state.rtk.tone === 'red' ? 'crit' : state.rtk.tone === 'amber' ? 'warn' : 'ok')} fill={1}/>} label="RTK" value={state.rtk.value}/>
          <StatusPill tone={state.wind?.tone || 'slate'} icon={<MI name={ICON.wind} size={14} color={state.wind?.tone === 'amber' ? T.amber : T.t2}/>} label="WIND" value={state.wind?.value || '4.2 m/s'}/>
          <StatusPill tone={state.cloud?.tone || 'green'} icon={<MI name={ICON.cloud} size={14} color={state.cloud?.tone === 'amber' ? T.amber : T.green}/>} label="CLOUD"/>
          {notices.map((n, i) => (
            <StatusPill key={i} tone={n.tone} icon={<MI name={ICON.warn} size={14} color={n.tone === 'red' ? T.red : T.amber} fill={1}/>} label={n.label}/>
          ))}
        </div>
      </div>

      <div style={{ width: 220, display: 'flex', alignItems: 'center', gap: 12, padding: '0 20px', borderLeft: `1px solid ${T.hairline}`, justifyContent: 'flex-end' }}>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: T.ui, fontSize: 11, color: T.t3, letterSpacing: '0.18em', fontWeight: 500 }}>OPERATOR</div>
          <div style={{ fontFamily: T.ui, fontSize: 14, color: T.t1, fontWeight: 500 }}>K. Marshall</div>
        </div>
        <div style={{ width: 40, height: 40, borderRadius: 999, background: T.card, border: `1px solid ${T.hairline}`, display: 'grid', placeItems: 'center', fontFamily: T.ui, fontWeight: 500, color: T.t1, fontSize: 14 }}>KM</div>
        <button style={iconBtn}>
          <MI name={ICON.menu} size={20} color={T.t2}/>
        </button>
      </div>
    </div>
  );
};

/* ---------------- Stateful Telemetry rail ---------------- */
const TelemRailState = ({ state }) => {
  const b = state.battery;
  const batHealth = b.health;
  const batColor = toneColor(batHealth);
  return (
    <div style={{ width: 360, background: T.panel, borderRight: `1px solid ${T.hairline}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Section title="Flight Telemetry" right={<span style={{ marginLeft: 'auto', ...NUM, fontSize: 11, color: state.telemStale ? T.amber : T.t3 }}>{state.telemStale ? 'STALE · last @ T+04:17' : '1 Hz · MAVLink'}</span>}>
        <TelemTape big iconName={ICON.altitude} label="Altitude AGL" sub={state.altSub || 'MSL 124 m · ceiling 120 m'} value={state.alt || '78.4'} unit="m" health={state.altHealth || 'ok'}/>
        <TelemTape big iconName={ICON.speed} label="Ground Speed" sub={state.spdSub || 'commanded 5.0 m/s'} value={state.spd || '4.8'} unit="m/s" health={state.spdHealth || 'ok'}/>
        <TelemTape iconName={ICON.vspeed} label="Vertical" sub={state.vspdSub || 'climb/descend'} value={state.vspd || '+0.2'} unit="m/s" health="ok"/>
        <TelemTape iconName={ICON.heading} label="Heading" sub={state.hdgSub || 'course 247° true'} value={state.hdg || '247'} unit="°" health="ok"/>
        <TelemTape iconName={ICON.gimbal} label="Gimbal" sub="pitch · yaw +12°" value="−45.0" unit="°" health="ok"/>
        <TelemTape iconName={ICON.home} label="Home Dist." sub={state.homeSub || 'bearing 142°'} value={state.homeDist || '124'} unit="m" health="ok"/>
      </Section>

      {/* Battery — state colors the bar + auto-RTH timer */}
      <div style={{ borderTop: `1px solid ${T.hairline}`, background: batHealth === 'crit' ? 'rgba(239,68,68,0.08)' : batHealth === 'warn' ? 'rgba(245,158,11,0.06)' : T.panelHi, padding: '18px 22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <MI name={batHealth === 'ok' ? ICON.battery : ICON.battery_low} size={20} color={batColor} fill={1}/>
          <span style={{ fontFamily: T.ui, fontSize: 12, color: T.t3, letterSpacing: '0.16em', fontWeight: 500 }}>BATTERY</span>
          <span style={{ marginLeft: 'auto', fontFamily: T.ui, fontSize: 12, color: T.t2 }}>{b.volts || '22.3'} V · {b.temp || '41'} °C</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
          <span style={{ ...NUM, fontSize: 64, color: batColor, fontWeight: 500, lineHeight: 0.9 }}>{b.pct}</span>
          <span style={{ fontFamily: T.ui, fontSize: 22, color: T.t2 }}>%</span>
          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <div style={{ fontFamily: T.ui, fontSize: 11, color: T.t3, letterSpacing: '0.16em', fontWeight: 500 }}>{b.timerLabel || 'AUTO-RTH'}</div>
            <div style={{ ...NUM, fontSize: 18, color: b.timerColor || T.amber, fontWeight: 500 }}>{b.timer || '≈ 06:48'}</div>
          </div>
        </div>
        <div style={{ position: 'relative', height: 10, borderRadius: 6, background: '#0F1420', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, width: `${b.pct}%`, background: batColor, borderRadius: 6 }}/>
          <div style={{ position: 'absolute', left: '25%', top: -3, bottom: -3, width: 2, background: T.amber }}/>
          <div style={{ position: 'absolute', left: '15%', top: -3, bottom: -3, width: 2, background: T.red }}/>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
          <span style={{ ...NUM, fontSize: 11, color: T.t3 }}>0%</span>
          <span style={{ ...NUM, fontSize: 11, color: T.red }}>15 LAND</span>
          <span style={{ ...NUM, fontSize: 11, color: T.amber }}>25 RTH</span>
          <span style={{ ...NUM, fontSize: 11, color: T.t3 }}>100%</span>
        </div>
      </div>

      {/* GPS + Link */}
      <div style={{ borderTop: `1px solid ${T.hairline}`, background: T.panel, padding: '14px 22px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: T.t3, fontSize: 11, fontWeight: 500, letterSpacing: '0.16em' }}>
            <MI name={ICON.satellite} size={14} color={toneColor(state.gps.health)}/> GPS · RTK
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
            <span style={{ ...NUM, fontSize: 22, color: toneColor(state.gps.health), fontWeight: 500 }}>{state.gps.value}</span>
            <span style={{ ...NUM, fontSize: 13, color: T.t2 }}>{state.gps.sub}</span>
          </div>
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: T.t3, fontSize: 11, fontWeight: 500, letterSpacing: '0.16em' }}>
            <MI name={ICON.signal} size={14} color={toneColor(state.rc.health)}/> RC LINK
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
            <span style={{ ...NUM, fontSize: 22, color: toneColor(state.rc.health), fontWeight: 500 }}>{state.rc.value}</span>
            <span style={{ ...NUM, fontSize: 13, color: T.t2 }}>{state.rc.sub}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ---------------- Stateful Mission panel ---------------- */
const MissionPanelState = ({ state }) => {
  const cluster = state.controls;
  return (
    <div style={{ width: 360, background: T.panel, borderLeft: `1px solid ${T.hairline}`, display: 'flex', flexDirection: 'column' }}>
      {/* Replace mission progress when an override card is active (RTH, MISSION_COMPLETE etc) */}
      {state.missionCard ? state.missionCard : (
        <>
          <div style={{ padding: '18px 22px', borderBottom: `1px solid ${T.hairline2}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span style={{ fontFamily: T.ui, fontSize: 12, color: T.t3, letterSpacing: '0.16em', fontWeight: 500 }}>MISSION PROGRESS</span>
              <span style={{ marginLeft: 'auto', ...NUM, fontSize: 13, color: T.cyan, fontWeight: 500 }}>29%</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
              <span style={{ ...NUM, fontSize: 44, color: T.t1, fontWeight: 500, lineHeight: 1 }}>7</span>
              <span style={{ fontFamily: T.ui, fontSize: 20, color: T.t3 }}>/</span>
              <span style={{ ...NUM, fontSize: 26, color: T.t2, fontWeight: 500 }}>24</span>
              <span style={{ fontFamily: T.ui, fontSize: 13, color: T.t3, marginLeft: 6 }}>waypoints</span>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: '#0F1420', overflow: 'hidden', position: 'relative' }}>
              <div style={{ position: 'absolute', inset: 0, width: '29%', background: state.progressColor || T.cyan, borderRadius: 3 }}/>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', marginTop: 12, gap: 8 }}>
              <Mini label="PHOTOS" value={<>23<span style={{ color: T.t3, fontSize: 13 }}> / 24</span></>}/>
              <Mini label="ELAPSED" value="04:21"/>
              <Mini label={state.remainingLabel || 'REMAINING'} value={state.remaining || '~03:27'} color={state.remainingColor}/>
            </div>
          </div>

          <div style={{ padding: '12px 22px', borderBottom: `1px solid ${T.hairline2}`, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(0,212,255,0.10)', border: `1px solid rgba(0,212,255,0.3)`, display: 'grid', placeItems: 'center' }}>
              <MI name={ICON.mission} size={18} color={T.cyan}/>
            </div>
            <div>
              <div style={{ fontFamily: T.ui, fontSize: 11, color: T.t3, letterSpacing: '0.16em', fontWeight: 500 }}>ROUTINE</div>
              <div style={{ fontFamily: T.ui, fontSize: 14, color: T.t1, fontWeight: 500, marginTop: 1 }}>Orbit · r=12 m · 24 photos</div>
            </div>
          </div>
        </>
      )}

      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '12px 22px 4px', display: 'flex', alignItems: 'center' }}>
          <span style={{ fontFamily: T.ui, fontSize: 11, color: T.t3, letterSpacing: '0.16em', fontWeight: 500 }}>WAYPOINTS</span>
          <span style={{ marginLeft: 'auto', ...NUM, fontSize: 11, color: T.t3 }}>{state.wpHeader || 'showing 5–10'}</span>
        </div>
        {(state.waypoints || waypoints).slice(0, 5).map(wp => <WPRow key={wp.i} wp={wp}/>)}
      </div>

      {/* Pause/Resume row */}
      <div style={{ padding: '12px 12px 0', display: 'flex', gap: 8 }}>
        <button style={{ ...iconBtn, width: 56, height: 60, opacity: cluster.disabled ? 0.4 : 1 }}>
          <MI name={ICON.skip_prev} size={22} color={T.t1}/>
        </button>
        <button style={{
          flex: 1, height: 60, borderRadius: 10,
          background: cluster.disabled ? T.card : cluster.primaryBg,
          border: `1.5px solid ${cluster.disabled ? T.hairline : cluster.primaryFg}`,
          color: cluster.disabled ? T.t3 : cluster.primaryFg,
          fontFamily: T.ui, fontSize: 18, fontWeight: 700, letterSpacing: '0.1em',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          opacity: cluster.disabled ? 0.5 : 1, cursor: cluster.disabled ? 'not-allowed' : 'pointer',
        }}>
          <MI name={cluster.primaryIcon} size={22} color={cluster.disabled ? T.t3 : cluster.primaryFg} fill={1}/> {cluster.primaryLabel}
        </button>
        <button style={{ ...iconBtn, width: 56, height: 60, opacity: cluster.disabled ? 0.4 : 1 }}>
          <MI name={ICON.skip_next} size={22} color={T.t1}/>
        </button>
      </div>

      {/* Flight-control cluster */}
      <div style={{ padding: '12px', background: T.panelHi, borderTop: `1px solid ${T.hairline}`, marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <MI name={ICON.emergency} size={16} color={cluster.headerColor || T.red} fill={1}/>
          <span style={{ fontFamily: T.ui, fontSize: 10, color: T.t2, letterSpacing: '0.18em', fontWeight: 600 }}>{cluster.header || 'FLIGHT CONTROL · HOLD 2s'}</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {cluster.row1.map((b, i) => <FlightCtrlBtnState key={i} {...b}/>)}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {cluster.row2.map((b, i) => <FlightCtrlBtnState key={i} {...b}/>)}
        </div>
      </div>
    </div>
  );
};

const Mini = ({ label, value, color }) => (
  <div>
    <div style={{ fontFamily: T.ui, fontSize: 10, color: T.t3, letterSpacing: '0.14em', fontWeight: 500 }}>{label}</div>
    <div style={{ ...NUM, fontSize: 18, color: color || T.t1, fontWeight: 500, marginTop: 2 }}>{value}</div>
  </div>
);

/* FlightCtrlBtn with optional disabled + active state */
const FlightCtrlBtnState = ({ iconName, label, sub, tone = 'red', active = false, disabled = false }) => {
  const map = {
    red:    { fg: T.red,    bd: 'rgba(239,68,68,0.55)',  bg: 'rgba(239,68,68,0.08)' },
    amber:  { fg: T.amber,  bd: 'rgba(245,158,11,0.55)', bg: 'rgba(245,158,11,0.08)' },
    blue:   { fg: T.blue,   bd: 'rgba(59,130,246,0.55)', bg: 'rgba(59,130,246,0.08)' },
    cyan:   { fg: T.cyan,   bd: 'rgba(0,212,255,0.55)',  bg: 'rgba(0,212,255,0.08)'  },
    green:  { fg: T.green,  bd: 'rgba(16,185,129,0.55)', bg: 'rgba(16,185,129,0.08)' },
    purple: { fg: T.purple, bd: 'rgba(167,139,250,0.55)',bg: 'rgba(167,139,250,0.08)' },
    slate:  { fg: T.t1,     bd: T.hairline,              bg: T.card                  },
  }[tone];
  return (
    <div style={{
      flex: 1, height: 76, borderRadius: 10,
      background: active ? map.fg : map.bg,
      border: `1.5px solid ${map.bd}`,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
      position: 'relative', overflow: 'hidden',
      opacity: disabled ? 0.32 : 1,
      cursor: disabled ? 'not-allowed' : 'pointer',
      boxShadow: active ? `0 0 0 3px ${map.bg}, 0 0 24px ${map.bg}` : 'none',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <MI name={iconName} size={20} color={active ? '#0A0E14' : map.fg} fill={tone === 'red' || active ? 1 : 0} weight={600}/>
        <span style={{ fontFamily: T.ui, fontSize: 15, fontWeight: 700, color: active ? '#0A0E14' : map.fg, letterSpacing: '0.08em' }}>{label}</span>
      </div>
      <span style={{ fontFamily: T.ui, fontSize: 10, color: active ? 'rgba(10,14,20,0.7)' : T.t3, letterSpacing: '0.16em', fontWeight: 500 }}>{sub || 'HOLD 2s'}</span>
      {active && (
        <div style={{ position: 'absolute', top: 4, right: 4, padding: '2px 6px', borderRadius: 4, background: '#0A0E14', color: map.fg, fontFamily: T.mono, fontSize: 9, fontWeight: 700, letterSpacing: '0.10em' }}>ACTIVE</div>
      )}
    </div>
  );
};

/* ---------------- Center overlays per state ---------------- */
/* These layer on top of the video to depict the state visually */

const PausedOverlay = () => (
  <>
    {/* Dim the whole video */}
    <div style={{ position: 'absolute', inset: 0, background: 'rgba(10,14,20,0.45)' }}/>
    <div style={{
      position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
      width: 200, height: 200, borderRadius: 999,
      background: 'rgba(245,158,11,0.10)', border: `2px solid ${T.amber}`,
      display: 'grid', placeItems: 'center',
    }}>
      <MI name={ICON.pause} size={96} color={T.amber} fill={1} weight={600}/>
    </div>
  </>
);

const RthPathOverlay = () => (
  <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} width="100%" height="100%" viewBox="0 0 1584 1010" preserveAspectRatio="none">
    <defs>
      <marker id="arr-rth" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto">
        <path d="M0,0 L10,5 L0,10 Z" fill={T.blue}/>
      </marker>
    </defs>
    <path d="M 780 700 L 780 380 L 320 380 L 200 540" fill="none" stroke={T.blue} strokeWidth="4" strokeDasharray="14 8" opacity="0.85" markerEnd="url(#arr-rth)"/>
    <circle cx="780" cy="380" r="9" fill={T.blue} stroke="#0A0E14" strokeWidth="2"/>
    <text x="800" y="376" fill={T.blue} fontSize="18" fontFamily="Roboto" fontWeight="500">RTH ALT 90 m</text>
    <circle cx="200" cy="540" r="14" fill="rgba(16,185,129,0.30)" stroke={T.green} strokeWidth="2"/>
    <text x="230" y="546" fill={T.green} fontSize="18" fontFamily="Roboto" fontWeight="600">HOME · 124 m · 142°</text>
  </svg>
);

const ObstacleOverlay = () => (
  <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} width="100%" height="100%" viewBox="0 0 1584 1010" preserveAspectRatio="none">
    {/* Red bracket framing the obstacle */}
    <g stroke={T.red} strokeWidth="4" fill="none" opacity="0.95">
      <path d="M 600 240 L 600 200 L 720 200"/>
      <path d="M 960 200 L 1080 200 L 1080 240"/>
      <path d="M 1080 620 L 1080 660 L 960 660"/>
      <path d="M 720 660 L 600 660 L 600 620"/>
    </g>
    <rect x="600" y="200" width="480" height="460" fill="rgba(239,68,68,0.06)"/>
    <g transform="translate(840 410)">
      <circle r="44" fill="rgba(239,68,68,0.20)" stroke={T.red} strokeWidth="2"/>
      <text x="0" y="6" textAnchor="middle" fill={T.red} fontFamily="Material Symbols Outlined" fontSize="38">shield</text>
    </g>
    <rect x="700" y="690" width="280" height="50" rx="8" fill="rgba(10,14,20,0.85)" stroke={T.red} strokeWidth="1"/>
    <text x="840" y="722" textAnchor="middle" fill={T.red} fontFamily="Roboto Mono" fontSize="17" fontWeight="600" letterSpacing="0.08em">OBSTACLE · 6.4 m</text>
  </svg>
);

const GeofenceOverlay = () => (
  <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} width="100%" height="100%" viewBox="0 0 1584 1010" preserveAspectRatio="none">
    <defs>
      <pattern id="gfWarn" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2="14" stroke={T.amber} strokeWidth="3"/>
      </pattern>
    </defs>
    <rect x="0" y="0" width="240" height="1010" fill="url(#gfWarn)" opacity="0.25"/>
    <line x1="240" y1="0" x2="240" y2="1010" stroke={T.amber} strokeWidth="4" strokeDasharray="14 6"/>
    <rect x="260" y="440" width="280" height="56" rx="8" fill="rgba(10,14,20,0.85)" stroke={T.amber} strokeWidth="1"/>
    <text x="400" y="474" textAnchor="middle" fill={T.amber} fontFamily="Roboto Mono" fontSize="17" fontWeight="600" letterSpacing="0.08em">GEOFENCE · 0 m</text>
  </svg>
);

const LostLinkOverlay = () => (
  <>
    <div style={{ position: 'absolute', inset: 0, background: 'rgba(10,14,20,0.55)' }}/>
    <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} width="100%" height="100%" viewBox="0 0 1584 1010" preserveAspectRatio="none">
      {/* "noise" lines suggesting lost feed */}
      {Array.from({ length: 16 }).map((_, i) => (
        <rect key={i} x="0" y={40 + i * 65} width="1584" height="1.5" fill="rgba(239,68,68,0.18)"/>
      ))}
    </svg>
    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', color: T.red }}>
      <MI name={ICON.signal} size={120} color={T.red} weight={500}/>
      <div style={{ fontFamily: T.mono, fontSize: 22, fontWeight: 600, marginTop: 12, letterSpacing: '0.20em' }}>NO VIDEO · NO RC</div>
      <div style={{ fontFamily: T.ui, fontSize: 14, color: T.t2, marginTop: 6 }}>last frame · T+04:17 · 4.0 s ago</div>
    </div>
  </>
);

const AttitudeOverlay = () => (
  <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} width="100%" height="100%" viewBox="0 0 1584 1010" preserveAspectRatio="none">
    {/* Artificial horizon */}
    <g transform="translate(792 505)">
      <circle r="180" fill="rgba(10,14,20,0.65)" stroke={T.amber} strokeWidth="2"/>
      <clipPath id="ah-clip"><circle r="180"/></clipPath>
      <g clipPath="url(#ah-clip)">
        <rect x="-200" y="-200" width="400" height="200" fill="rgba(59,130,246,0.18)"/>
        <rect x="-200" y="0" width="400" height="200" fill="rgba(180,140,90,0.18)"/>
        <line x1="-200" y1="0" x2="200" y2="0" stroke={T.amber} strokeWidth="2"/>
        {[-90, -60, -30, 30, 60, 90].map(p => (
          <g key={p}>
            <line x1="-40" y1={p} x2="40" y2={p} stroke={T.t2} strokeWidth="1.2"/>
            <text x="50" y={p + 4} fill={T.t2} fontSize="11" fontFamily="Roboto Mono">{Math.abs(p)}</text>
          </g>
        ))}
      </g>
      {/* Plane symbol */}
      <line x1="-50" y1="0" x2="-20" y2="0" stroke={T.amber} strokeWidth="3"/>
      <line x1="20" y1="0" x2="50" y2="0" stroke={T.amber} strokeWidth="3"/>
      <circle r="4" fill={T.amber}/>
      {/* Roll indicator */}
      <path d="M -160 -90 A 180 180 0 0 1 160 -90" fill="none" stroke={T.t2} strokeWidth="1"/>
      <polygon points="0,-180 -8,-160 8,-160" fill={T.amber}/>
    </g>
  </svg>
);

const MissionCompleteOverlay = () => (
  <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} width="100%" height="100%" viewBox="0 0 1584 1010" preserveAspectRatio="none">
    <circle cx="792" cy="430" r="80" fill="rgba(16,185,129,0.15)" stroke={T.green} strokeWidth="3"/>
    <text x="792" y="448" textAnchor="middle" fill={T.green} fontFamily="Material Symbols Outlined" fontSize="76">check_circle</text>
  </svg>
);

/* ---------------- Per-state center (video primary) ---------------- */
const HudAltCenter = ({ state }) => (
  <>
    <VideoView w="100%" h="100%" primary />
    <VideoOverlay />

    {state.center === 'paused' && <PausedOverlay/>}
    {state.center === 'rth' && <RthPathOverlay/>}
    {state.center === 'obstacle' && <ObstacleOverlay/>}
    {state.center === 'geofence' && <GeofenceOverlay/>}
    {state.center === 'lostlink' && <LostLinkOverlay/>}
    {state.center === 'attitude' && <AttitudeOverlay/>}
    {state.center === 'complete' && <MissionCompleteOverlay/>}

    {/* Map PiP — kept on all states */}
    <div style={{ position: 'absolute', left: 24, bottom: state.banner?.pinned === 'bottom' ? 140 : 24, width: 520, height: 380 }}>
      <MapView w="100%" h="100%" label="MAP" tileZ={17} tileX={30880} tileY={54129} cols={3} rows={2}/>
      <button style={{
        position: 'absolute', top: 8, right: 8, width: 40, height: 40, borderRadius: 8,
        background: 'rgba(10,14,20,0.85)', border: `1px solid ${T.hairline}`, color: T.t1,
        display: 'grid', placeItems: 'center', backdropFilter: 'blur(6px)',
      }}>
        <MI name={ICON.swap} size={18} color={T.cyan}/>
      </button>
    </div>

    {state.banner && <StateBanner {...state.banner}/>}

    {/* Corner label — state name as a chip so the artboard is self-identifying */}
    <div style={{
      position: 'absolute', top: 24, left: 24, padding: '8px 14px', borderRadius: 8,
      background: 'rgba(10,14,20,0.85)', border: `1px solid ${state.chipBorder || T.hairline}`,
      backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <span style={{ width: 8, height: 8, borderRadius: 999, background: state.chipColor || T.cyan, boxShadow: `0 0 8px ${state.chipColor || T.cyan}` }}/>
      <span style={{ fontFamily: T.mono, fontSize: 12, color: T.t1, letterSpacing: '0.16em', fontWeight: 600 }}>{state.code}</span>
    </div>
  </>
);

/* ---------------- The frame ---------------- */
const HudAltState = ({ state }) => (
  <div style={{ width: 2304, height: 1440, background: T.bg, color: T.t1, fontFamily: T.ui, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
    <TopStripState state={state}/>
    <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
      <TelemRailState state={state}/>
      <div style={{ flex: 1, position: 'relative', background: '#000' }}>
        <HudAltCenter state={state}/>
      </div>
      <MissionPanelState state={state}/>
    </div>
  </div>
);

window.HudAltState = HudAltState;
window.StateBanner = StateBanner;
