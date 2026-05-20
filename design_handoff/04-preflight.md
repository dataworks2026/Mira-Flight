# 04 · Preflight checklist + arming gate

The bridge from "mission planned" to "motors hot". 23 checks across 6 groups, with a hold-to-arm gate.

**Source files:** `designs/Preflight.html`, `designs/preflight.jsx`

---

## Purpose

Gate the transition into flight. A drone takes off **only** when:

- All RED items are resolved (zero blocking)
- All AMBER items have been explicitly acknowledged by the pilot
- The pilot has attested visual line of sight + airspace authorization
- Pilot holds the ARM button for 2s

If anything is RED, the ARM button is visually disabled and clickable only to surface the blocker.

---

## Layout (2304 × 1440)

```
┌──────────────── TOP STRIP · 80 px ────────────────┐
│ [back][icon] mission name   [breadcrumb step 4]  [time][operator]
├────────────┬──────────────────────────────────┬────────────────┤
│            │                                   │                │
│  DRONE     │   CHECKLIST                       │   ARM GATE    │
│  HARDWARE  │   "23 of 23 complete · 2 warns"   │   500 px      │
│  CARD      │                                   │                │
│  480 px    │   3 × 2 grid of section cards     │   mission     │
│            │                                   │   summary,    │
│  illustr., │   HARDWARE  · SENSORS · CONNECT.  │   pilot,      │
│  battery,  │   ENVIRON.  · AIRSPACE · OPERATOR │   attestations│
│  subsys,   │                                   │   warnings,   │
│  bay       │   each card: header w/ status     │   HOLD TO ARM │
│            │   chip + list of CheckItem rows   │   button      │
│            │                                   │                │
└────────────┴──────────────────────────────────┴────────────────┘
```

---

## The checklist

6 groups, 23 items. Source of truth: `CHECKLIST` array in `preflight.jsx`.

### 1. Hardware (4 items)
- Propellers — 4 of 4 secured, no chips, CW/CCW correct
- IMU & compass — calibrated, drift < 1°
- Battery pack — TB65 cycles + temp + voltage
- SD storage — free space + error count

### 2. Sensors (4 items)
- GPS lock — multi-constellation, HDOP, sat count
- RTK fix — base connection status + baseline distance
- Vision system — N/N obstacle sensors clean
- IMU temp — within operating range

### 3. Connectivity (3 items)
- RC link — bind status + last RTT + signal
- Cloud sync — latency + outbound queue
- 4G failover — carrier + bars

### 4. Environment (4 items)
- Wind — steady + gust speed (WARN at 5+ steady or 7+ gust)
- Weather — precipitation forecast next 30 min
- Visibility — VFR / IFR + km
- Daylight — minutes to civil sunset (WARN if mission ends inside twilight buffer)

### 5. Airspace & mission (4 items)
- Geofence — inside / clearance distance
- Airspace — class + LAANC authorization #
- RTH altitude — set value + obstacle-clear status
- Mission plan — WP count + duration + battery-on-return estimate

### 6. Operator readiness (4 items)
- Pilot license — Part 107 status + expiry
- Insurance — policy + liability + active flag
- Flight log — auto-entry created + mission ID
- VLOS spotter — required by ops policy for orbit > 50 m AGL (WARN if unassigned)

### CheckItem shape

```ts
type CheckItem = {
  label: string;
  detail: string;
  status: 'ok' | 'warn' | 'block';
  value: string;          // e.g. "98%", "FIX", "VALID", "5.4 m/s"
  warning?: string;       // expanded warning copy if status === 'warn'
  blocker?: string;       // expanded blocker copy + remediation if status === 'block'
};
```

---

## Blocking rules

| Status | Visual | Behavior |
|---|---|---|
| `ok` | green check icon · green badge | Pass-through |
| `warn` | amber warning icon · amber badge · row tinted amber 4% · expanded warning copy | Doesn't block. Surfaced in arm-gate warning summary. Requires "I accept the N warnings above" toggle. |
| `block` | red error icon · red badge · row tinted red 4% · expanded blocker copy w/ remediation | Disables the ARM button. Shown as "N blocking issues" in the arm gate. |

Section-card header shows the worst-case status across its items.

---

## Arm Gate (right rail · 500 px wide)

### Top — mission summary

- Mission name + asset + ID
- 4-up stats: Duration · Photos · Distance from pad · Battery on return

### Mid — pilot in command

- Avatar + name + license # + "Hand off" link (multi-pilot ops, phase 2)

### Mid — attestations (toggles)

Three explicit checkboxes (toggle UI, default off):

1. **I maintain visual line of sight** — Required when no spotter assigned
2. **Airspace authorization confirmed** — LAANC ack
3. **I accept the N warnings above** — Only required if `warn > 0`; toggle is amber, others are green

ARM button enables only when all required toggles are ON **and** there are 0 blockers.

### Bottom — ARM button

- Big green button, full width, label "HOLD TO ARM · 2 s"
- 2-second visual fill (ring or progress bar)
- On completion → navigates to HUD with state `FLYING`
- Below: "Back to plan" + "Simulate" secondary buttons

### Block state

- ARM button gray, label "RESOLVE 1 BLOCKING ISSUE TO ARM" (or similar)
- Cursor `not-allowed`, no hover state
- Banner above: red, count of blocking issues, "Resolve red items before arming"

---

## Drone hardware card (left rail · 480 px)

Single visual block. Sub-sections from top to bottom:

1. **Header chip** — Drone ID + Bay
2. **Drone illustration** — top-down quadcopter SVG with motor labels (M1·CW etc.) and the front-arrow facing up. "● POWER ON · BAY ARMED" ribbon at the bottom.
3. **Battery block** — 52 px green percentage, voltage + temp, threshold bar (matches HUD style)
4. **Subsystems grid** — 2 × 3 cards: Motors, Gimbal, Vision, Telemetry, Storage, Flight ctrl. Each shows icon + label + value.
5. **Bay status footer** — Pad name + lat/lng + READY pill

In production the drone illustration could be a real photo / 3D rendering. The labels are the important part.

---

## Interactions

- **Re-run checks** button → kicks off a fresh health probe (telemetry + airspace API + weather API)
- **Save log** button → exports the current checklist state to PDF / JSON
- **Toggle attestation** → click anywhere on the row
- **Hold ARM** → press-and-hold gesture only (no double-tap fallback for safety)
- **Section card header tap** → expand-collapse (optional, low priority)

---

## State management

```ts
type PreflightState = {
  missionId: string;
  checks: Record<string, CheckItem>;   // keyed by check ID
  attestations: { vlos: boolean; airspace: boolean; warningsAccepted: boolean };
  pilotId: string;
  blockingCount: number;     // derived
  warningCount: number;      // derived
  armReady: boolean;         // derived: blocking === 0 && attestations all true
  lastCheckRun: ISODateTime;
};
```

The checks are mostly fed by the drone + APIs. The attestations are pilot UI state. The `armReady` flag is purely derived.

---

## Backlog

- "Why is this blocking?" expandable help text with remediation steps
- Spotter assignment flow (currently just a warning)
- Pre-flight simulator (3D path replay against terrain mesh before motors-hot)
- Multi-drone preflight (chained / fleet missions)
- Auto-resolve some warnings (e.g. wait for sunset buffer to clear)
