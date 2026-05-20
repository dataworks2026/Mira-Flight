# 02 · HUD (in-flight)

The cockpit. Same chassis for every state; what differs is the data + which interrupts are present.

**Source files:** `designs/HUD (in-flight).html`, `designs/hud-*.jsx`

---

## Purpose

Give the pilot, at a glance, the information they need to answer:

1. **Is the mission tracking?** (Mission progress, next WP context, capture count)
2. **Is the drone healthy?** (Battery margin, link, GPS, RTK, wind)
3. **What do I do next?** (Pause, RTH, Land, Abort — color-coded by severity)

The HUD is **read first, control second**. Telemetry occupies 1/3 of the screen; the live feed (video or map) takes the middle 1/3 and a half; flight control sits on the right.

---

## Layout (2304 × 1440)

```
┌──────────────────────── TOP STRIP · 80 px ────────────────────────┐
│ [drone][mission name] [STATE pill][T+ timer][ETA] [pills…] [op]    │
├────────────┬───────────────────────────────────┬─────────────────┤
│            │                                    │                 │
│  TELEM     │     CENTER (video or map)          │  MISSION PANEL │
│  RAIL      │                                    │                 │
│  360 px    │       1584 × 1360                   │     360 px     │
│            │       (with map-PiP bottom-left)    │                 │
│            │                                    │                 │
│            │                                    │                 │
│            │                                    │                 │
└────────────┴───────────────────────────────────┴─────────────────┘
```

### Left telemetry rail (360 px wide)

6 stacked rows, each `<TelemTape>`:

| Field | Hero? | Unit | Source (sample MAVLink ID) |
|---|---|---|---|
| Altitude AGL | ✓ (48 px) | m | `GLOBAL_POSITION_INT.relative_alt` |
| Ground speed | ✓ (48 px) | m/s | `VFR_HUD.groundspeed` |
| Vertical speed | – | m/s | `VFR_HUD.climb` |
| Heading | – | ° | `VFR_HUD.heading` |
| Gimbal | – | ° (pitch · yaw) | gimbal status msg |
| Home distance | – | m + bearing | computed from `HOME_POSITION` |

Below the tape: **battery kill-clock block** (big % readout + voltage + temp + horizontal progress bar with RTH-25% and LAND-15% threshold ticks).

Then **GPS · RTK** + **RC link dBm** as a 2-column footer.

### Center area

**Two modes, swappable with a single button:**

- **VIDEO-PRIMARY (default):** Live feed fills the area. Map shown as PiP (520 × 380) bottom-left. Camera/exposure/REC/zoom chips overlay the video. AR target label on the inspection subject.
- **MAP-PRIMARY:** Satellite tiles fill the area. Video PiP (560 × 340) bottom-right. Map controls bottom-right. Bottom context strip shows next WP, home, geofence clearance, airspace status.

State persists per-mission. Both views are first-class.

### Right mission panel (360 px wide)

Top to bottom:
1. **Mission progress card** — `7 / 24 waypoints · 29%`, photo count, elapsed, remaining ETA
2. **Routine summary chip** — "Orbit · r=12 m · 24 photos"
3. **Waypoint list** — 5 visible, current row highlighted with left border
4. **Pause / Skip row** — pause is single-tap (reversible), skip-prev/next as icon buttons
5. **Flight control cluster** — 2×2 grid:
   - RTH (blue, hold 2s) · LAND (amber, hold 2s)
   - ABORT (red, hold 2s) · E-STOP (red, hold 3s)
   - Each is a `<FlightCtrlBtn>`

---

## State machine

Every region reads from a single `state` object. State drives:

- Top-strip pill color/label
- Pills in the top strip (LINK, RTK, WIND, CLOUD, NOTICES)
- Telemetry tape health (each field can be ok/warn/crit)
- Battery block color + threshold timer
- GPS + RC link footer
- Mission panel content (sometimes replaced with state-specific card e.g. RTH progress)
- Center overlay (paused mask, RTH path, obstacle bracket, attitude indicator, etc.)
- Banner (top of video area)
- Control cluster (some buttons disabled, some marked ACTIVE, sometimes the primary "PAUSE" is replaced by "RESUME" / "TAKE STICK" / "CANCEL RTH")

### State enum

```ts
type HudState =
  | 'FLYING'              // nominal
  | 'PAUSED'              // pilot paused mid-mission
  | 'RTH_ACTIVE'          // smart RTH executing
  | 'LOW_BATTERY'         // 25% threshold tripped, 10s pilot grace
  | 'CRITICAL_BATTERY'    // 15% threshold, auto-LAND, non-cancelable
  | 'LOST_LINK'           // RC link lost ≥ 4s, failsafe RTH imminent
  | 'GPS_DEGRADED'        // < 8 sats OR RTK lost, attitude mode
  | 'GEOFENCE_HOVER'      // drone braked at fence boundary
  | 'OBSTACLE_BRAKE'      // vision detected obstacle, drone braked
  | 'MISSION_COMPLETE';   // all WPs captured, idling at safe alt
```

### State details

| State | Pill | Banner copy | Center overlay | Controls |
|---|---|---|---|---|
| **FLYING** | green "FLYING" | (none) | (none) | Standard cluster |
| **PAUSED** | amber "PAUSED" | "Mission paused at WP 08" | Dim mask + amber pause glyph | RESUME replaces PAUSE |
| **RTH_ACTIVE** | blue "RTH" | "Returning home — Smart RTH · HOME ETA 01:14" | Blue RTH path on video | CANCEL RTH primary; RTH btn shows ACTIVE |
| **LOW_BATTERY** | amber "LOW BATT" | "Battery 25% — Auto-RTH in 7 seconds" with cancel-grace | (no center overlay) | "RTH NOW" available |
| **CRITICAL_BATTERY** | red "AUTO-LAND" | "Critical battery — Auto-LAND in progress" non-cancelable | (no center overlay) | All buttons disabled except E-STOP |
| **LOST_LINK** | red "NO LINK" | "RC link lost — failsafe RTH in 1 s" | Scanline noise + "NO VIDEO · NO RC" overlay | All disabled |
| **GPS_DEGRADED** | amber "ATTI MODE" | "GPS degraded — Attitude mode engaged" | Artificial horizon | "TAKE STICK" purple primary; RTH disabled |
| **GEOFENCE_HOVER** | amber "GEOFENCE" | "Geofence boundary reached — hovering" | Amber striped boundary | "REROUTE / SKIP" available |
| **OBSTACLE_BRAKE** | amber "BRAKING" | "Obstacle detected — drone braked" | Red bracket framing the obstacle | "RETRY / SKIP" available |
| **MISSION_COMPLETE** | green "COMPLETE" | "Mission complete — 24/24 captured" | Green check overlay | RTH primary |

See `hud-altstate-configs.jsx` for the exact config object shape — copy it as the basis for your reducer's case statements.

### State transitions

Most transitions are driven by drone telemetry, not pilot action. Examples:

- `FLYING` → `LOW_BATTERY` when `battery.pct ≤ 25`
- `LOW_BATTERY` → `RTH_ACTIVE` when 10s grace expires OR pilot taps RTH
- `LOW_BATTERY` → `FLYING` if pilot taps "CANCEL · CONTINUE" within grace
- `FLYING` → `CRITICAL_BATTERY` when `battery.pct ≤ 15` (no grace)
- `FLYING` → `LOST_LINK` when telemetry stale > 4s
- `LOST_LINK` → `RTH_ACTIVE` at 5s timeout (drone-side, then re-syncs)
- `FLYING` → `GPS_DEGRADED` when `sats < 8` OR `rtk !== 'FIX'` for > 2s
- `GPS_DEGRADED` → `FLYING` when GPS recovers for > 5s (debounce)
- `FLYING` → `GEOFENCE_HOVER` when predicted breach within 2s
- `FLYING` → `OBSTACLE_BRAKE` when vision distance < 8m
- `FLYING` → `MISSION_COMPLETE` when all waypoints captured (engine.complete())

State is **drone-authoritative** for safety-critical transitions. The UI must subscribe to drone state, not derive it.

---

## Hold-to-confirm gate

Every destructive action (RTH / LAND / ABORT / E-STOP) requires:

1. **2-second hold** (3s for E-STOP)
2. Visible **ring/bar fill** during hold
3. **Haptic vibration** at start and on success
4. **Screen reader announcement** ("Hold to confirm Return to Home — 2 seconds")

If the user lifts before completion, abort cleanly with a "cancelled" haptic blip.

Implementation suggestion: `usePressAndHold(duration, onComplete)` hook.

---

## Banner component

A floating, color-toned banner appears at the top or bottom of the video area for every non-nominal state. Shape:

```tsx
<StateBanner
  tone="cyan | blue | amber | red | green | purple"
  icon={MaterialIconName}
  title="Mission paused at WP 08"
  sub="Drone holds position · gimbal locked · video continues recording."
  countdown={{ label: 'AUTO-RTH', value: '00:07' }}   // optional
  action={{ label: 'RESUME · 1 TAP', icon: 'play_arrow' }}  // optional
/>
```

- `red` and `amber` action buttons are filled with the tone color, text in `#0A0E14` for contrast.
- Other tones use outlined action buttons.

---

## Video chrome (always-on)

Overlaid on the live feed regardless of state:

- **Top-left:** lens chip (ZOOM 12×) · exposure mono (ISO 200 · 1/2000 · ƒ2.8) · REC chip with red dot + timer · SD storage chip
- **Top-right:** photo counter (23 / 24) · upload-queue chip · lens picker (WIDE / ZOOM / IR / LRF)
- **Top-center:** small histogram (200 × 56 px)
- **Right edge:** vertical zoom slider (60 × 440 px) with 1× and 12× endpoints
- **Bottom-right:** gimbal pitch + yaw readout chip
- **Center reticle:** subtle crosshair
- **AR target overlay:** circle + line + label pointing at the current WP target

---

## Map view (used in both center modes)

- **Tile source:** Esri World Imagery in the prototype. Replace with whatever your maps provider is (Mapbox Static, Google, MapTiler).
- **Filter:** `saturate(1.05) brightness(0.92) contrast(1.04)` + radial vignette to harmonize with the dark UI.
- **Overlays (in z-order):** tile → geofence pattern → asset standoff ring → orbit path → waypoint dots → drone marker → compass (top-right) → controls → scale (bottom-left) → attribution.

---

## Telemetry update rate

- **Telemetry rail:** 1 Hz via MAVLink. Show `STALE · last @ Tx:xx` indicator if no update for > 2s.
- **Video feed:** 30 fps (WebRTC) — but the rail update is decoupled.
- **Mission progress:** updated on waypoint reached events, not on a timer.
- **Battery `pct`:** smoothed over a 4-sample rolling avg to prevent jitter.

---

## Backlog (from feature parity sheet)

Tracked but unbuilt:

- Estimated **time-to-empty in minutes** as a hero stat next to battery
- Pitch + roll **artificial horizon** in alt layout (designed but optional)
- Manual photo trigger (single shutter button on the video overlay)
- Video bitrate / quality chip near REC
- ADS-B nearby aircraft (marker designed, integration pending)
- TFR / airspace overlay (LAANC live integration)
- Predicted 5-s flight path (Auterion-style)
- Smart RTH avoiding mapped obstacles (DJI APAS equivalent)
- Operator handover (pass control to another GCS)
- Audio comms button
- Screen recording indicator

---

## Anti-patterns

- **Don't** show two destructive actions side-by-side at equal weight. Visual hierarchy is: PAUSE/RESUME (cyan) → RTH (blue) → LAND (amber) → ABORT (red) → E-STOP (red, smallest).
- **Don't** use a generic "Are you sure?" modal for any action — hold-to-confirm gates everything destructive.
- **Don't** let banners auto-dismiss for any state involving an active failsafe. The pilot must explicitly acknowledge or the state must clear.
- **Don't** allow E-STOP to be remapped to a single tap. It is the last-resort cut-motors action; the 3-second hold is intentional friction.
