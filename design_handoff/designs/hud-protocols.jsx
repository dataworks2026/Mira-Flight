/* Emergency protocol matrix — full inventory with dev notes */

const PROTOCOLS = [
  // PILOT-INITIATED — manual controls
  { id: 'PAUSE',       group: 'Non-destructive',  tone: 'cyan',  icon: 'pause',
    label: 'Pause',
    trigger: 'Tap',
    confirm: 'none',
    behavior: 'Drone hovers at current position. Mission state → PAUSED. Camera remains active.',
    devNote: 'engine.pause() · state: FLYING→PAUSED · MAVLink: MAV_CMD_DO_PAUSE_CONTINUE param=0',
    modal: false },
  { id: 'RESUME',      group: 'Non-destructive',  tone: 'cyan',  icon: 'play_arrow',
    label: 'Resume',
    trigger: 'Tap',
    confirm: 'modal if paused >5 min',
    behavior: 'Continue mission from current waypoint.',
    devNote: 'engine.resume() · state: PAUSED→FLYING · MAVLink: MAV_CMD_DO_PAUSE_CONTINUE param=1',
    modal: 'sometimes' },
  { id: 'SKIP_WP',     group: 'Non-destructive',  tone: 'cyan',  icon: 'skip_next',
    label: 'Skip waypoint',
    trigger: 'Tap arrow',
    confirm: 'tap (1 click)',
    behavior: 'Move to next WP without capturing current. Mark WP as skipped in log.',
    devNote: 'engine.skipCurrentWaypoint() · increments waypointCurrent · sets reached_at=null, skipped=true on prev',
    modal: false },
  { id: 'RETRY_WP',    group: 'Non-destructive',  tone: 'cyan',  icon: 'refresh',
    label: 'Retry waypoint',
    trigger: 'Tap (on failure toast)',
    confirm: 'tap',
    behavior: 'Re-fly to current WP and retake photo.',
    devNote: 'engine.retryCurrentWaypoint() · resets photo_taken=false · re-issues waypoint goto',
    modal: false },
  { id: 'MANUAL',      group: 'Override',  tone: 'purple',  icon: 'pan_tool',
    label: 'Manual override',
    trigger: 'Hold 1 s',
    confirm: 'hold-to-confirm',
    behavior: 'Pause mission, hand stick control to pilot. State → MANUAL_OVERRIDE. Photo capture disabled.',
    devNote: 'engine.takeManualControl() · adapter.setMode("LOITER") · disables routine ticker',
    modal: true },
  { id: 'ALTITUDE',    group: 'Override',  tone: 'purple',  icon: 'height',
    label: 'Change altitude',
    trigger: 'Slider in modal',
    confirm: 'hold 1 s',
    behavior: 'Pause routine, climb/descend to new altitude, resume routine at new altitude.',
    devNote: 'engine.changeAltitude(m) · validates against geofence ceiling · respects climb rate limit',
    modal: true },

  // DESTRUCTIVE / TERMINATING
  { id: 'RTH',         group: 'Terminating',  tone: 'blue',  icon: 'home_pin',
    label: 'Return to home (Smart)',
    trigger: 'Hold 2 s',
    confirm: 'hold-to-confirm',
    behavior: 'Climb to RTH altitude (default 60 m) → straight-line home → auto-land at takeoff point.',
    devNote: 'engine.returnToHome() · MAV_CMD_NAV_RETURN_TO_LAUNCH · uses settings.rth_alt_m · also auto-triggered at 25% bat',
    modal: true },
  { id: 'RTH_DIRECT',  group: 'Terminating',  tone: 'blue',  icon: 'turn_left',
    label: 'RTH · direct path',
    trigger: 'Long-press RTH → Direct',
    confirm: 'hold-to-confirm',
    behavior: 'Straight-line home at CURRENT altitude (no climb). Use only if no obstacles between drone and home.',
    devNote: 'engine.returnToHome({direct: true}) · skips alt-climb step · operator-acknowledged risk',
    modal: true },
  { id: 'LAND',        group: 'Terminating',  tone: 'amber',  icon: 'flight_land',
    label: 'Land here',
    trigger: 'Hold 2 s',
    confirm: 'hold-to-confirm',
    behavior: 'Descend vertically at current X/Y to ground. Mission marked LANDED_AWAY_FROM_HOME.',
    devNote: 'engine.landHere() · MAV_CMD_NAV_LAND · disables auto-RTH for the descent · also auto at 15% bat',
    modal: true },
  { id: 'ABORT',       group: 'Terminating',  tone: 'red',  icon: 'cancel',
    label: 'Abort mission',
    trigger: 'Hold 2 s',
    confirm: 'hold-to-confirm',
    behavior: 'Cancel routine, hover, await operator (no auto-land, no auto-RTH).',
    devNote: 'engine.abort() · state: FLYING→ABORTED · adapter.setMode("LOITER") · uploaded photos still flush',
    modal: true },
  { id: 'ESTOP',       group: 'Last resort',  tone: 'red',  icon: 'power_settings_new',
    label: 'Emergency stop',
    trigger: 'Hold 3 s + double confirm',
    confirm: 'hold + secondary confirm',
    behavior: 'CUT MOTORS. Drone falls. Use only to prevent contact with people/equipment.',
    devNote: 'engine.emergencyStop() · MAV_CMD_COMPONENT_ARM_DISARM force=true · IRREVERSIBLE · audit log entry',
    modal: true },

  // SYSTEM-INITIATED FAILSAFES — modals appear automatically
  { id: 'AUTO_RTH',    group: 'Auto failsafe',  tone: 'amber',  icon: 'battery_alert',
    label: 'Auto-RTH · low battery',
    trigger: 'System (battery ≤ 25%)',
    confirm: 'pilot can cancel (10 s grace)',
    behavior: 'System initiates RTH. Pilot has 10 s to cancel (held button) before commit.',
    devNote: 'failsafe.lowBattery → engine.returnToHome() · countdown modal with cancel button',
    modal: 'auto' },
  { id: 'AUTO_LAND',   group: 'Auto failsafe',  tone: 'red',  icon: 'battery_alert',
    label: 'Auto-LAND · critical battery',
    trigger: 'System (battery ≤ 15%)',
    confirm: 'cannot cancel',
    behavior: 'Land in place immediately. No pilot override.',
    devNote: 'failsafe.criticalBattery → engine.landHere() · modal informational only',
    modal: 'auto' },
  { id: 'LINK_LOST',   group: 'Auto failsafe',  tone: 'red',  icon: 'signal_disconnected',
    label: 'RC link lost',
    trigger: 'System (link timeout 5 s)',
    confirm: 'modal — pilot must acknowledge on return',
    behavior: 'Drone autonomously hovers 5 s, then RTH. Reconnect window allows pilot resume.',
    devNote: 'failsafe.linkLost · countdown banner · engine.returnToHome() if no reconnect',
    modal: 'auto' },
  { id: 'GPS_LOST',    group: 'Auto failsafe',  tone: 'amber',  icon: 'gps_off',
    label: 'GPS degraded / lost',
    trigger: 'System (sat < 6 or fix lost)',
    confirm: 'banner persists',
    behavior: 'Drone hovers in attitude mode. Pilot must take manual control or wait for GPS.',
    devNote: 'failsafe.gpsLost · adapter.setMode("ALTITUDE") · ATTI mode banner',
    modal: 'auto' },
  { id: 'GEOFENCE',    group: 'Auto failsafe',  tone: 'amber',  icon: 'fence',
    label: 'Geofence breach',
    trigger: 'System (boundary intersect predicted)',
    confirm: 'pilot acknowledges',
    behavior: 'Hover at boundary. Mission paused. Pilot must choose Resume (reroute) or Abort.',
    devNote: 'failsafe.geofence · blocks waypoint advance · MAV_CMD_DO_FENCE_ENABLE',
    modal: 'auto' },
  { id: 'OBSTACLE',    group: 'Auto failsafe',  tone: 'amber',  icon: 'shield',
    label: 'Obstacle detected',
    trigger: 'System (ToF / vision)',
    confirm: 'pilot acknowledges',
    behavior: 'Drone brakes, hovers. Pilot may re-route, manual override, or abort.',
    devNote: 'failsafe.obstacle · DJI APAS event · routine paused',
    modal: 'auto' },
  { id: 'PHOTO_FAIL',  group: 'Soft failure',  tone: 'amber',  icon: 'broken_image',
    label: 'Photo capture failed',
    trigger: 'System (camera error)',
    confirm: 'toast w/ retry/skip',
    behavior: 'Drone hovers. Toast offers RETRY (re-photo) or SKIP (advance).',
    devNote: 'PhotoCaptureManager.onError · non-blocking toast · logs to TelemetryUploader',
    modal: 'toast' },
];

const ProtocolRow = ({ p }) => {
  const toneFg = p.tone === 'red' ? T.red : p.tone === 'amber' ? T.amber : p.tone === 'blue' ? T.blue : p.tone === 'purple' ? T.purple : T.cyan;
  const toneBg = p.tone === 'red' ? 'rgba(239,68,68,0.06)' : p.tone === 'amber' ? 'rgba(245,158,11,0.06)' : p.tone === 'blue' ? 'rgba(59,130,246,0.06)' : p.tone === 'purple' ? 'rgba(167,139,250,0.06)' : 'rgba(0,212,255,0.06)';
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '44px 220px 1fr 180px 1.4fr',
      gap: 16, padding: '14px 18px',
      borderBottom: `1px solid ${T.hairline2}`,
      background: toneBg,
    }}>
      <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(255,255,255,0.02)', border: `1px solid ${toneFg}44`, display: 'grid', placeItems: 'center' }}>
        <MI name={p.icon} size={20} color={toneFg} fill={p.tone === 'red' ? 1 : 0}/>
      </div>
      <div>
        <div style={{ fontFamily: T.ui, fontSize: 15, fontWeight: 600, color: T.t1 }}>{p.label}</div>
        <div style={{ fontFamily: T.ui, fontSize: 11, color: T.t3, marginTop: 2, letterSpacing: '0.1em' }}>{p.id}</div>
      </div>
      <div>
        <div style={{ fontFamily: T.ui, fontSize: 11, color: T.t3, letterSpacing: '0.12em', fontWeight: 500 }}>TRIGGER · CONFIRM</div>
        <div style={{ fontFamily: T.ui, fontSize: 13, color: T.t2, marginTop: 2 }}>{p.trigger} <span style={{ color: T.t3 }}>·</span> <span style={{ color: toneFg, fontWeight: 600 }}>{p.confirm}</span></div>
        <div style={{ fontFamily: T.ui, fontSize: 12, color: T.t2, marginTop: 4 }}>{p.behavior}</div>
      </div>
      <div>
        <div style={{ fontFamily: T.ui, fontSize: 11, color: T.t3, letterSpacing: '0.12em', fontWeight: 500 }}>MODAL</div>
        <div style={{ fontFamily: T.ui, fontSize: 13, color: T.t1, marginTop: 2 }}>{p.modal === true ? 'yes' : p.modal === false ? 'no' : p.modal}</div>
      </div>
      <div>
        <div style={{ fontFamily: T.ui, fontSize: 11, color: T.t3, letterSpacing: '0.12em', fontWeight: 500 }}>ENGINE · DEV NOTE</div>
        <div style={{ fontFamily: T.mono, fontSize: 12, color: T.t2, marginTop: 4, lineHeight: 1.45 }}>{p.devNote}</div>
      </div>
    </div>
  );
};

const Protocols = () => {
  const groups = ['Non-destructive', 'Override', 'Terminating', 'Last resort', 'Auto failsafe', 'Soft failure'];
  return (
    <div style={{ width: 2304, minHeight: 1440, background: T.bg, padding: '60px 80px', fontFamily: T.ui, color: T.t1 }}>
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 13, color: T.cyan, letterSpacing: '0.22em', fontWeight: 600, marginBottom: 12 }}>EMERGENCY · FLIGHT-CONTROL PROTOCOLS</div>
        <div style={{ fontSize: 48, fontWeight: 500, letterSpacing: '-0.02em', marginBottom: 10 }}>Every action a pilot or the system can take during flight</div>
        <div style={{ fontSize: 18, color: T.t2, maxWidth: 1500 }}>
          Each row maps to an engine method on <span style={{ ...NUM, color: T.cyan }}>MissionEngine</span> + an underlying MAVLink/SDK call. Use this as the spec for what to wire — drop a row only if the platform genuinely can't do it on M350 RTK.
        </div>
      </div>

      <div style={{ background: T.panel, border: `1px solid ${T.hairline}`, borderRadius: 14, overflow: 'hidden' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '44px 220px 1fr 180px 1.4fr',
          gap: 16, padding: '14px 18px',
          borderBottom: `1px solid ${T.hairline}`, background: T.panelHi,
          fontFamily: T.ui, fontSize: 11, color: T.t3, letterSpacing: '0.16em', fontWeight: 600,
        }}>
          <div/>
          <div>ACTION</div>
          <div>TRIGGER · CONFIRMATION · BEHAVIOR</div>
          <div>MODAL?</div>
          <div>ENGINE · DEV NOTE</div>
        </div>
        {groups.map(g => (
          <React.Fragment key={g}>
            <div style={{ padding: '12px 18px', background: '#0F141F', fontFamily: T.ui, fontSize: 11, fontWeight: 700, color: T.t2, letterSpacing: '0.2em', borderTop: `1px solid ${T.hairline}` }}>
              {g.toUpperCase()} <span style={{ color: T.t3, fontWeight: 400, marginLeft: 8 }}>· {PROTOCOLS.filter(p => p.group === g).length} action{PROTOCOLS.filter(p => p.group === g).length === 1 ? '' : 's'}</span>
            </div>
            {PROTOCOLS.filter(p => p.group === g).map(p => <ProtocolRow key={p.id} p={p}/>)}
          </React.Fragment>
        ))}
      </div>

      <div style={{ marginTop: 32, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div style={{ background: T.panel, border: `1px solid ${T.hairline}`, borderRadius: 12, padding: 24 }}>
          <div style={{ fontSize: 13, color: T.amber, letterSpacing: '0.16em', fontWeight: 600 }}>HOLD-TO-CONFIRM SPEC</div>
          <ul style={{ fontFamily: T.ui, fontSize: 15, color: T.t2, lineHeight: 1.7, marginTop: 12, paddingLeft: 20 }}>
            <li>Visible circular fill ring around the button as it charges (2 s default, 3 s for E-STOP).</li>
            <li>Release before fill completes = cancel, no event fires.</li>
            <li>Haptic tick at 50% and full-fill (Android `Vibrate.HEAVY_CLICK`).</li>
            <li>Sound cue at completion (configurable, silent during stealth flight).</li>
            <li>Disabled during animation per principle #5 — no flashing chrome around the button itself.</li>
          </ul>
        </div>
        <div style={{ background: T.panel, border: `1px solid ${T.hairline}`, borderRadius: 12, padding: 24 }}>
          <div style={{ fontSize: 13, color: T.amber, letterSpacing: '0.16em', fontWeight: 600 }}>AUTO-FAILSAFE PRIORITY</div>
          <ol style={{ fontFamily: T.ui, fontSize: 15, color: T.t2, lineHeight: 1.7, marginTop: 12, paddingLeft: 22 }}>
            <li>Critical battery (15%) → Auto-LAND <span style={{color:T.t3}}>· non-overridable</span></li>
            <li>Low battery (25%) → Auto-RTH <span style={{color:T.t3}}>· 10 s pilot grace</span></li>
            <li>RC link lost → Auto-RTH after 5 s timeout</li>
            <li>Geofence breach → Hover at boundary, await pilot</li>
            <li>GPS lost → Hover (ATTI mode), await pilot</li>
            <li>Obstacle detected → Brake, hover, prompt</li>
            <li>Motor failure → Emergency LAND <span style={{color:T.t3}}>· non-overridable</span></li>
          </ol>
        </div>
      </div>
    </div>
  );
};

window.PROTOCOLS = PROTOCOLS;
window.Protocols = Protocols;
