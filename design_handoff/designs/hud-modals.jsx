/* All confirmation modals + banners + toasts for the HUD */

/* Reusable modal shell */
const Modal = ({ tone = 'red', icon, title, kicker, children, primary, cancel = 'Cancel', width = 540, fillPct = 35 }) => {
  const fg = tone === 'red' ? T.red : tone === 'amber' ? T.amber : tone === 'blue' ? T.blue : tone === 'purple' ? T.purple : T.cyan;
  const bg = tone === 'red' ? 'rgba(239,68,68,0.08)' : tone === 'amber' ? 'rgba(245,158,11,0.08)' : tone === 'blue' ? 'rgba(59,130,246,0.08)' : tone === 'purple' ? 'rgba(167,139,250,0.08)' : 'rgba(0,212,255,0.08)';
  return (
    <div style={{
      width, background: T.panel, border: `1px solid ${T.hairline}`, borderRadius: 16,
      boxShadow: '0 24px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.02)',
      overflow: 'hidden', display: 'flex', flexDirection: 'column',
    }}>
      {/* severity stripe */}
      <div style={{ height: 4, background: fg }}/>
      {/* header */}
      <div style={{ padding: '22px 26px 16px', display: 'flex', alignItems: 'flex-start', gap: 16 }}>
        <div style={{
          width: 52, height: 52, borderRadius: 12,
          background: bg, border: `1px solid ${fg}55`,
          display: 'grid', placeItems: 'center', flexShrink: 0,
        }}>
          <MI name={icon} size={28} color={fg} fill={tone === 'red' ? 1 : 0} weight={500}/>
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          {kicker && <div style={{ fontFamily: T.ui, fontSize: 11, color: fg, letterSpacing: '0.18em', fontWeight: 600, marginBottom: 4 }}>{kicker}</div>}
          <div style={{ fontFamily: T.ui, fontSize: 22, color: T.t1, fontWeight: 500, lineHeight: 1.2 }}>{title}</div>
        </div>
        <button style={{
          width: 36, height: 36, borderRadius: 8, background: 'transparent', border: `1px solid ${T.hairline}`,
          color: T.t2, display: 'grid', placeItems: 'center', cursor: 'pointer', flexShrink: 0,
        }}>
          <MI name="close" size={18} color={T.t2}/>
        </button>
      </div>
      {/* body */}
      <div style={{ padding: '0 26px 20px', flex: 1 }}>{children}</div>
      {/* actions */}
      <div style={{ padding: 18, borderTop: `1px solid ${T.hairline}`, background: T.panelHi, display: 'flex', gap: 12 }}>
        {cancel && (
          <button style={{
            flex: 1, height: 60, borderRadius: 10,
            background: 'transparent', border: `1px solid ${T.hairline}`,
            color: T.t1, fontFamily: T.ui, fontSize: 15, fontWeight: 600, letterSpacing: '0.04em', cursor: 'pointer',
          }}>{cancel}</button>
        )}
        {primary && <HoldConfirm fillPct={fillPct} tone={tone} {...primary}/>}
      </div>
    </div>
  );
};

const HoldConfirm = ({ icon, label, sub, fillPct = 35, tone = 'red' }) => {
  const fg = tone === 'red' ? T.red : tone === 'amber' ? T.amber : tone === 'blue' ? T.blue : tone === 'purple' ? T.purple : T.cyan;
  return (
    <button style={{
      flex: 1.5, height: 60, borderRadius: 10, position: 'relative', overflow: 'hidden',
      background: tone === 'red' ? 'rgba(239,68,68,0.18)' : tone === 'amber' ? 'rgba(245,158,11,0.18)' : tone === 'blue' ? 'rgba(59,130,246,0.18)' : 'rgba(0,212,255,0.18)',
      border: `1.5px solid ${fg}`, color: fg,
      fontFamily: T.ui, fontSize: 16, fontWeight: 700, letterSpacing: '0.1em', cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
    }}>
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${fillPct}%`, background: fg, opacity: 0.22 }}/>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 10 }}>
        {icon && <MI name={icon} size={22} color={fg} fill={tone === 'red' ? 1 : 0}/>}
        <span>{label}</span>
        {sub && <span style={{ fontSize: 11, color: fg, opacity: 0.7, letterSpacing: '0.16em', fontWeight: 600 }}>{sub}</span>}
      </div>
    </button>
  );
};

/* Helper: mono stat list */
const StatGrid = ({ items }) => (
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 24px', padding: '14px 18px', background: T.bg, border: `1px solid ${T.hairline2}`, borderRadius: 10 }}>
    {items.map((it, i) => (
      <div key={i}>
        <div style={{ fontFamily: T.ui, fontSize: 11, color: T.t3, letterSpacing: '0.14em', fontWeight: 500 }}>{it.label}</div>
        <div style={{ ...NUM, color: it.tone === 'warn' ? T.amber : it.tone === 'crit' ? T.red : T.t1, fontSize: 16, fontWeight: 500, marginTop: 2 }}>{it.value}</div>
      </div>
    ))}
  </div>
);

/* === All modals === */

const ModalRTH = () => (
  <Modal tone="blue" icon="home_pin" kicker="CONFIRM · HOLD 2 s" title="Return to home" fillPct={42}
    primary={{ label: 'HOLD TO RTH', sub: '2 s', icon: 'home_pin' }} cancel="Cancel">
    <div style={{ fontFamily: T.ui, fontSize: 14, color: T.t2, lineHeight: 1.55, marginBottom: 14 }}>
      Drone will climb to <strong style={{ color: T.t1 }}>60 m RTH altitude</strong>, return in a straight line, and auto-land at the takeoff pad. Mission will be marked <span style={{ ...NUM, color: T.t1 }}>ABORTED · RTH</span>.
    </div>
    <StatGrid items={[
      { label: 'HOME DISTANCE', value: '124 m · brg 142°' },
      { label: 'RTH ALTITUDE', value: '60 m AGL' },
      { label: 'ETA TO HOME', value: '~01:08' },
      { label: 'BATTERY ON ARRIVAL', value: '68% (margin OK)', tone: 'ok' },
      { label: 'PATH OBSTACLES', value: 'none on track' },
      { label: 'GEOFENCE', value: 'clear · 312 m', tone: 'ok' },
    ]}/>
  </Modal>
);

const ModalLand = () => (
  <Modal tone="amber" icon="flight_land" kicker="CONFIRM · HOLD 2 s" title="Land here" fillPct={28}
    primary={{ label: 'HOLD TO LAND', sub: '2 s', icon: 'flight_land' }} cancel="Cancel">
    <div style={{ fontFamily: T.ui, fontSize: 14, color: T.t2, lineHeight: 1.55, marginBottom: 14 }}>
      Drone will descend vertically at the current position to ground. <strong style={{ color: T.amber }}>You are 124 m from the takeoff pad</strong> — recovery may require a walk.
    </div>
    <StatGrid items={[
      { label: 'CURRENT ALT', value: '78.4 m AGL' },
      { label: 'DESCENT RATE', value: '1.5 m/s' },
      { label: 'TIME TO LAND', value: '~00:52' },
      { label: 'SURFACE BELOW', value: 'concrete pad', tone: 'ok' },
      { label: 'CHECK', value: 'no obstacles in cone', tone: 'ok' },
      { label: 'BATTERY', value: '74% — sufficient', tone: 'ok' },
    ]}/>
  </Modal>
);

const ModalAbort = () => (
  <Modal tone="red" icon="cancel" kicker="CONFIRM · HOLD 2 s" title="Abort mission" fillPct={62}
    primary={{ label: 'HOLD TO ABORT', sub: '2 s', icon: 'cancel' }} cancel="Cancel">
    <div style={{ fontFamily: T.ui, fontSize: 14, color: T.t2, lineHeight: 1.55, marginBottom: 14 }}>
      End the routine immediately. Drone will hover at the current waypoint and wait for your next command. <span style={{ color: T.t1 }}>Captured photos (23) and queued uploads will be preserved.</span>
    </div>
    <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.08)', border: `1px solid rgba(239,68,68,0.3)`, borderRadius: 10, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <MI name="warning" size={20} color={T.red} fill={1}/>
      <div style={{ fontFamily: T.ui, fontSize: 13, color: T.t1, lineHeight: 1.5 }}>
        This will NOT return to home or land. You must then trigger <strong>RTH</strong> or <strong>LAND</strong> manually.
      </div>
    </div>
  </Modal>
);

const ModalEStop = () => (
  <Modal tone="red" icon="power_settings_new" kicker="LAST RESORT · HOLD 3 s + CONFIRM" title="Emergency stop — cut motors" fillPct={20}
    primary={{ label: 'HOLD TO CUT', sub: '3 s', icon: 'power_settings_new' }} cancel="Cancel" width={620}>
    <div style={{ padding: '14px 18px', background: 'rgba(239,68,68,0.14)', border: `1px solid rgba(239,68,68,0.5)`, borderRadius: 10, marginBottom: 14, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <MI name="emergency" size={22} color={T.red} fill={1}/>
      <div style={{ fontFamily: T.ui, fontSize: 14, color: T.t1, lineHeight: 1.5 }}>
        <strong>This will stop all motors immediately. The drone will fall.</strong> Use only to prevent imminent contact with people, vehicles, or critical infrastructure.
      </div>
    </div>
    <StatGrid items={[
      { label: 'CURRENT ALT', value: '78.4 m AGL', tone: 'warn' },
      { label: 'EST. FREE-FALL', value: '~4.0 s to impact', tone: 'crit' },
      { label: 'BELOW DRONE', value: 'concrete pad' },
      { label: 'DRONE IS RECOVERABLE', value: 'unlikely', tone: 'crit' },
    ]}/>
    <label style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14, padding: '12px 14px', background: T.bg, border: `1px solid ${T.hairline2}`, borderRadius: 10 }}>
      <div style={{ width: 22, height: 22, borderRadius: 6, background: T.red, display: 'grid', placeItems: 'center' }}><MI name="check" size={16} color="#0A0E14" weight={700}/></div>
      <span style={{ fontFamily: T.ui, fontSize: 14, color: T.t1, fontWeight: 500 }}>I acknowledge this is irreversible.</span>
    </label>
  </Modal>
);

const ModalManual = () => (
  <Modal tone="purple" icon="pan_tool" kicker="HOLD 1 s" title="Take manual control" fillPct={48}
    primary={{ label: 'HOLD TO OVERRIDE', sub: '1 s', icon: 'pan_tool' }} cancel="Cancel">
    <div style={{ fontFamily: T.ui, fontSize: 14, color: T.t2, lineHeight: 1.55, marginBottom: 14 }}>
      Routine will pause. Drone enters <span style={{ ...NUM, color: T.t1 }}>LOITER</span> mode and accepts stick input from the RC. <strong style={{ color: T.t1 }}>Photo capture is disabled</strong> during manual control.
    </div>
    <StatGrid items={[
      { label: 'CURRENT MODE', value: 'AUTO · ORBIT' },
      { label: 'NEW MODE', value: 'LOITER · MANUAL' },
      { label: 'CAPTURE', value: 'paused' },
      { label: 'GEOFENCE', value: 'still enforced', tone: 'ok' },
    ]}/>
  </Modal>
);

const ModalAutoRTH = () => (
  <Modal tone="amber" icon="battery_alert" kicker="AUTO-FAILSAFE · LOW BATTERY" title="Auto-RTH starting in 7 s" fillPct={70}
    primary={{ label: 'CANCEL AUTO-RTH', sub: 'hold 1 s', icon: 'close' }} cancel="Allow">
    <div style={{ fontFamily: T.ui, fontSize: 14, color: T.t2, lineHeight: 1.55, marginBottom: 14 }}>
      Battery has reached the <strong style={{ color: T.amber }}>25% RTH threshold</strong>. The system will start Return-to-Home automatically. You can cancel within 10 seconds to keep flying.
    </div>
    <div style={{ position: 'relative', height: 14, borderRadius: 7, background: T.bg, border: `1px solid ${T.hairline2}`, overflow: 'hidden', marginBottom: 14 }}>
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '70%', background: T.amber }}/>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: T.mono, fontSize: 11, color: T.t1, letterSpacing: '0.1em', fontWeight: 600 }}>7 s remaining</div>
    </div>
    <StatGrid items={[
      { label: 'BATTERY', value: '25% (threshold)', tone: 'warn' },
      { label: 'HOME DISTANCE', value: '124 m' },
      { label: 'ETA HOME', value: '~01:08' },
      { label: 'BAT AT HOME', value: '~19%', tone: 'warn' },
    ]}/>
  </Modal>
);

const ModalAutoLand = () => (
  <Modal tone="red" icon="battery_alert" kicker="AUTO-FAILSAFE · CRITICAL BATTERY · CANNOT BE CANCELLED" title="Auto-LAND in progress" cancel={null} primary={null}>
    <div style={{ fontFamily: T.ui, fontSize: 14, color: T.t2, lineHeight: 1.55, marginBottom: 14 }}>
      Battery at <strong style={{ color: T.red }}>15%</strong> — landing immediately at current position. <strong style={{ color: T.t1 }}>Move people and equipment away from the drone's vertical path now.</strong>
    </div>
    <StatGrid items={[
      { label: 'BATTERY', value: '15%', tone: 'crit' },
      { label: 'TIME TO LAND', value: '~00:52', tone: 'warn' },
      { label: 'POSITION', value: '124 m from pad' },
      { label: 'SURFACE', value: 'concrete pad', tone: 'ok' },
    ]}/>
    <div style={{ marginTop: 14, padding: '12px 16px', background: 'rgba(239,68,68,0.10)', border: `1px solid rgba(239,68,68,0.35)`, borderRadius: 10, fontFamily: T.ui, fontSize: 13, color: T.t1 }}>
      Photo uploads will complete in the background after landing. Mission marked <span style={{ ...NUM, color: T.red }}>LANDED_AWAY · CRITICAL_BAT</span>.
    </div>
  </Modal>
);

const ModalLinkLost = () => (
  <Modal tone="red" icon="signal_disconnected" kicker="AUTO-FAILSAFE · RC LINK LOST" title="No telemetry for 5 s" fillPct={48}
    primary={{ label: 'AUTO-RTH IN 5 s', sub: 'auto', icon: 'home_pin' }} cancel="Wait — reconnecting…">
    <div style={{ fontFamily: T.ui, fontSize: 14, color: T.t2, lineHeight: 1.55, marginBottom: 14 }}>
      Drone is hovering autonomously. If the RC link does not reconnect within <strong style={{ color: T.red }}>10 seconds total</strong>, the drone will begin Return-to-Home using its last-known home position.
    </div>
    <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
      <div style={{ flex: 1, padding: 12, borderRadius: 10, background: T.bg, border: `1px solid ${T.hairline2}`, textAlign: 'center' }}>
        <div style={{ fontFamily: T.ui, fontSize: 10, color: T.t3, letterSpacing: '0.16em', fontWeight: 500 }}>LAST SEEN</div>
        <div style={{ ...NUM, color: T.t1, fontSize: 18, fontWeight: 500, marginTop: 4 }}>00:00:05 ago</div>
      </div>
      <div style={{ flex: 1, padding: 12, borderRadius: 10, background: T.bg, border: `1px solid ${T.hairline2}`, textAlign: 'center' }}>
        <div style={{ fontFamily: T.ui, fontSize: 10, color: T.t3, letterSpacing: '0.16em', fontWeight: 500 }}>FAILSAFE IN</div>
        <div style={{ ...NUM, color: T.red, fontSize: 18, fontWeight: 500, marginTop: 4 }}>00:00:05</div>
      </div>
    </div>
  </Modal>
);

const ModalGeofence = () => (
  <Modal tone="amber" icon="fence" kicker="AUTO-FAILSAFE · GEOFENCE BREACH PREDICTED" title="Hovering at boundary" fillPct={0}
    primary={{ label: 'REROUTE & RESUME', sub: 'hold 1 s', icon: 'refresh' }} cancel="Abort mission">
    <div style={{ fontFamily: T.ui, fontSize: 14, color: T.t2, lineHeight: 1.55, marginBottom: 14 }}>
      Next waypoint (<span style={{ ...NUM, color: T.t1 }}>WP 08</span>) would cross the inner geofence at <span style={{ ...NUM, color: T.amber }}>2.4 m horizontal margin</span>. Mission paused at boundary.
    </div>
    <StatGrid items={[
      { label: 'BREACH AT', value: 'WP 08 · in 38 m' },
      { label: 'HORIZ. MARGIN', value: '2.4 m breach', tone: 'crit' },
      { label: 'VERT. MARGIN', value: 'OK · 42 m', tone: 'ok' },
      { label: 'SUGGESTED ACTION', value: 'reroute around', tone: 'warn' },
    ]}/>
  </Modal>
);

/* ============ Banners / toasts ============ */

const Banner = ({ tone = 'amber', icon, title, sub, actions }) => {
  const fg = tone === 'red' ? T.red : tone === 'amber' ? T.amber : tone === 'blue' ? T.blue : T.cyan;
  const bg = tone === 'red' ? 'rgba(239,68,68,0.12)' : tone === 'amber' ? 'rgba(245,158,11,0.12)' : tone === 'blue' ? 'rgba(59,130,246,0.12)' : 'rgba(0,212,255,0.12)';
  return (
    <div style={{
      width: '100%', display: 'flex', alignItems: 'center', gap: 14,
      padding: '14px 22px', borderRadius: 10,
      background: bg, border: `1px solid ${fg}55`, color: T.t1,
    }}>
      <MI name={icon} size={22} color={fg} fill={tone === 'red' ? 1 : 0}/>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: T.ui, fontSize: 14, fontWeight: 600, color: T.t1 }}>{title}</div>
        {sub && <div style={{ fontFamily: T.ui, fontSize: 13, color: T.t2, marginTop: 2 }}>{sub}</div>}
      </div>
      {actions}
    </div>
  );
};

const Toast = ({ tone = 'amber', icon, title, sub, actions }) => {
  const fg = tone === 'red' ? T.red : tone === 'amber' ? T.amber : tone === 'green' ? T.green : T.cyan;
  return (
    <div style={{
      width: 480, padding: '14px 18px', borderRadius: 12,
      background: T.panel, border: `1px solid ${T.hairline}`,
      boxShadow: '0 18px 40px rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', gap: 14, color: T.t1,
    }}>
      <div style={{ width: 40, height: 40, borderRadius: 8, background: `${fg}22`, border: `1px solid ${fg}55`, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
        <MI name={icon} size={22} color={fg}/>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: T.ui, fontSize: 14, fontWeight: 600 }}>{title}</div>
        {sub && <div style={{ fontFamily: T.ui, fontSize: 12, color: T.t2, marginTop: 2 }}>{sub}</div>}
      </div>
      {actions}
    </div>
  );
};

/* ============ Layout: all modals on a single artboard ============ */
const Modals = () => (
  <div style={{ width: 2304, minHeight: 1440, background: T.bg, padding: '60px 80px', fontFamily: T.ui, color: T.t1 }}>
    <div style={{ marginBottom: 32 }}>
      <div style={{ fontSize: 13, color: T.cyan, letterSpacing: '0.22em', fontWeight: 600, marginBottom: 12 }}>CONFIRMATION MODALS · BANNERS · TOASTS</div>
      <div style={{ fontSize: 48, fontWeight: 500, letterSpacing: '-0.02em', marginBottom: 10 }}>Everything that interrupts the HUD</div>
      <div style={{ fontSize: 18, color: T.t2, maxWidth: 1500 }}>
        Modals share a common shell (severity stripe · big icon · stat grid · hold-to-confirm button with visible fill ring). Severity dictates color and required confirmation strength.
      </div>
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24, marginBottom: 32 }}>
      <ModalRTH/>
      <ModalLand/>
      <ModalAbort/>
      <ModalEStop/>
      <ModalManual/>
      <ModalAutoRTH/>
      <ModalAutoLand/>
      <ModalLinkLost/>
      <ModalGeofence/>
    </div>

    <div style={{ marginBottom: 16, fontFamily: T.ui, fontSize: 13, color: T.t3, letterSpacing: '0.22em', fontWeight: 600 }}>NON-MODAL · INLINE BANNERS</div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
      <Banner tone="amber" icon="gps_off" title="GPS degraded — 5 satellites, RTK lost" sub="Switched to attitude hold. Position may drift. Pilot input recommended."
        actions={<button style={{ padding: '8px 14px', borderRadius: 8, background: 'transparent', border: `1px solid ${T.amber}`, color: T.amber, fontFamily: T.ui, fontSize: 13, fontWeight: 600 }}>Take manual</button>}/>
      <Banner tone="blue" icon="sync" title="Reconnecting to drone — last ping 2.4 s ago" sub="Auto-RTH will trigger if reconnection fails within 5 s."/>
      <Banner tone="red" icon="emergency" title="Obstacle detected within 4 m of flight path"
        sub="Routine paused, drone braking. Choose to reroute around, manual override, or abort."
        actions={<div style={{ display: 'flex', gap: 8 }}>
          <button style={{ padding: '8px 14px', borderRadius: 8, background: 'transparent', border: `1px solid ${T.t2}`, color: T.t1, fontFamily: T.ui, fontSize: 13, fontWeight: 600 }}>Reroute</button>
          <button style={{ padding: '8px 14px', borderRadius: 8, background: T.red, border: 'none', color: '#fff', fontFamily: T.ui, fontSize: 13, fontWeight: 600 }}>Abort</button>
        </div>}/>
    </div>

    <div style={{ marginBottom: 16, fontFamily: T.ui, fontSize: 13, color: T.t3, letterSpacing: '0.22em', fontWeight: 600 }}>NON-MODAL · TOASTS</div>
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
      <Toast tone="amber" icon="broken_image" title="Photo capture failed at WP 07"
        sub="Camera reported timeout — drone is hovering."
        actions={<div style={{ display: 'flex', gap: 6 }}>
          <button style={{ padding: '6px 12px', borderRadius: 6, background: 'transparent', border: `1px solid ${T.t2}`, color: T.t1, fontSize: 12, fontWeight: 600 }}>Skip</button>
          <button style={{ padding: '6px 12px', borderRadius: 6, background: T.amber, border: 'none', color: '#0A0E14', fontSize: 12, fontWeight: 700 }}>Retry</button>
        </div>}/>
      <Toast tone="green" icon="check_circle" title="WP 06 captured · uploaded" sub="zoom · 4.2 MB · queued for analysis"/>
      <Toast tone="cyan" icon="cloud_upload" title="3 photos uploading" sub="Background — 11 MB remaining"/>
      <Toast tone="red" icon="error" title="Gimbal pitch limit reached" sub="Cannot exceed −90° · WP 07 will capture at −85°"/>
    </div>
  </div>
);

window.Modals = Modals;
window.Modal = Modal;
window.HoldConfirm = HoldConfirm;
window.Banner = Banner;
window.Toast = Toast;
