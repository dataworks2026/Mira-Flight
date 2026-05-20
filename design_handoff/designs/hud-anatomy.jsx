/* Anatomy callouts overlay */

const Callout = ({ x, y, dx, dy, label, sub, anchor = 'start' }) => {
  const lx = x + dx;
  const ly = y + dy;
  const labelLen = Math.max(label.length, (sub || '').length) * 8 + 28;
  const boxW = Math.max(220, labelLen);
  const boxH = sub ? 60 : 38;
  const boxX = anchor === 'end' ? lx - boxW : lx;
  return (
    <g>
      <line x1={x} y1={y} x2={lx} y2={ly} stroke={T.cyan} strokeWidth="1.5" strokeDasharray="4 4"/>
      <circle cx={x} cy={y} r="6" fill="none" stroke={T.cyan} strokeWidth="1.5"/>
      <circle cx={x} cy={y} r="2" fill={T.cyan}/>
      <rect x={boxX} y={ly - boxH/2} width={boxW} height={boxH} rx="6" fill="rgba(10,14,20,0.94)" stroke={T.cyan} strokeWidth="1"/>
      <text x={boxX + 14} y={ly - (sub ? 6 : -4)} fill={T.cyan} fontSize="14" fontFamily="Roboto" fontWeight="600" letterSpacing="0.06em">{label}</text>
      {sub && <text x={boxX + 14} y={ly + 18} fill={T.t2} fontSize="12" fontFamily="Roboto" fontWeight="400">{sub}</text>}
    </g>
  );
};

const HudAnatomy = () => (
  <div style={{ width: 2304, height: 1440, position: 'relative', background: T.bg }}>
    <HudMain />
    <div style={{ position: 'absolute', inset: 0, background: 'rgba(10,14,20,0.55)', pointerEvents: 'none' }}/>
    <svg width="2304" height="1440" viewBox="0 0 2304 1440" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      <Callout x={460} y={40} dx={-20} dy={-30} anchor="end" label="① IDENTITY STRIP · 80 px" sub="Mission name · T+ · ETA · link/RTK/wind/cloud · 1-tap notices"/>
      <Callout x={2204} y={40} dx={-40} dy={120} anchor="end" label="② OPERATOR + MENU" sub="Pilot identity, drawer to settings/disconnect"/>

      <Callout x={180} y={300} dx={400} dy={-160} label="③ TELEMETRY TAPE · 360 px · 9 fields always-on" sub="Roboto Mono tabular · ALT & SPD hero 48 px · others 32 px · health-tinted icons + values"/>
      <Callout x={180} y={1080} dx={400} dy={100} label="④ BATTERY KILL-CLOCK" sub="74% · AUTO-RTH in 06:48 · RTH @25% LAND @15% drawn on bar"/>
      <Callout x={180} y={1370} dx={400} dy={40} label="⑤ GPS/RTK · RC LINK" sub="dBm + sat count + RTK fix state — pinned to rail bottom"/>

      <Callout x={1152} y={120} dx={-220} dy={120} anchor="end" label="⑥ HISTOGRAM" sub="Exposure check at a glance — added to spec"/>
      <Callout x={920} y={140} dx={-280} dy={250} anchor="end" label="⑦ CAMERA HUD" sub="Lens · ISO/SS/EV · REC + mission timer · SD storage"/>
      <Callout x={2150} y={140} dx={-300} dy={420} anchor="end" label="⑧ LENS PICKER + UPLOAD QUEUE" sub="WIDE · ZOOM · IR · LRF (matches CameraLens enum) · upload backlog"/>
      <Callout x={2200} y={720} dx={-340} dy={-100} anchor="end" label="⑨ ZOOM SLIDER · 60 × 440" sub="Right-edge thumb position works for both thumbs · gloved hit zone"/>
      <Callout x={1152} y={720} dx={-60} dy={-260} anchor="end" label="⑩ TARGET RETICLE + AR LABEL" sub="Asset tag pinned to live frame — pilot confirms subject without leaving video"/>
      <Callout x={1840} y={1380} dx={-300} dy={-80} anchor="end" label="⑪ GIMBAL · PITCH + YAW" sub="Bottom-right — composition verification stays on video"/>

      <Callout x={620} y={1190} dx={-160} dy={120} anchor="end" label="⑫ MAP PiP · 520 × 380 · TAP TO SWAP" sub="Real Esri satellite tiles · drone marker w/ heading cone · geofence pattern · standoff ring"/>

      <Callout x={2200} y={140} dx={-580} dy={60} anchor="end" label="⑬ MISSION PROGRESS" sub="7/24 hero · photos · elapsed · remaining ETA"/>
      <Callout x={2200} y={580} dx={-580} dy={-60} anchor="end" label="⑭ WAYPOINT LIST" sub="Current = cyan ring + NOW · ✓ green = reached · scrolls"/>
      <Callout x={2200} y={1020} dx={-580} dy={20} anchor="end" label="⑮ PAUSE · SKIP ± · SINGLE TAP" sub="Non-destructive — manual override of routine progress"/>
      <Callout x={2200} y={1360} dx={-580} dy={20} anchor="end" label="⑯ FLIGHT CONTROL · HOLD-TO-CONFIRM" sub="RTH (blue) · LAND (amber) · ABORT (red) · E-STOP (red, 3 s)"/>

      <Callout x={530} y={40} dx={120} dy={120} label="MISSION STATE PILL · LIVE" sub="Mirrors MissionState enum (FLYING / PAUSED / RTH / LANDING / etc.)"/>
      <Callout x={1480} y={40} dx={-340} dy={220} anchor="end" label="LINK · RTK · WIND · CLOUD" sub="System health pills — color-coded thresholds drive auto-failsafes"/>
    </svg>
  </div>
);

window.HudAnatomy = HudAnatomy;
