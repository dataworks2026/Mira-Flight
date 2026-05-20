# 06 · Mission Summary (post-flight)

One screen, three jobs: prove the mission worked, surface anything that went sideways, and get the captures into the cloud.

**Source files:** `designs/Mission Summary.html`, `designs/summary.jsx`

---

## Purpose

Closes the loop on every flight. From this screen the operator should be able to:

- Confirm the mission completed as planned (or understand what didn't)
- Review every capture and flag bad frames
- See the telemetry as it actually unfolded vs. the plan
- Track upload progress to cloud
- Hand off to QA / analysis
- Start the next mission

---

## Layout (2304 × 1440)

```
┌──────────────── TOP STRIP · 80 px ──────────────────────────────┐
│ [back][✓] MR-2026-0428 · Tank 04   [tabs]   [pills]   [Report][Share][Next]
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   HERO STATS · 180 px                                            │
│   ✓ MISSION COMPLETE · Tank 04 inspection                        │
│   6 big stats: DURATION · PHOTOS · DATA · DISTANCE · MAX ALT · BATTERY USED
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   TELEMETRY TIMELINE · 360 px (the bolder element)               │
│   header + legend                                                │
│   ┌──── full-width chart ────┐                                  │
│   │ event chips along top    │                                  │
│   │ altitude area (cyan)     │                                  │
│   │ battery line (amber)     │                                  │
│   │ speed line (green)       │                                  │
│   │ 24 photo pips along      │                                  │
│   │ orbit segment (amber)    │                                  │
│   │ RTH 90m reference line   │                                  │
│   │ time axis (0..14:36)     │                                  │
│   └──────────────────────────┘                                  │
│                                                                  │
├──────────────────────────────────────┬──────────────────────────┤
│                                       │                          │
│   PHOTO GALLERY                       │   PATH PREVIEW (map)    │
│   24 thumbnails · 8-col grid          │   plan vs. actual delta │
│                                       ├──────────────────────────┤
│                                       │   UPLOAD STATUS         │
│                                       │   progress bar + counts │
│                                       ├──────────────────────────┤
│                                       │   FLIGHT LOG            │
│                                       │   10 events · vertical  │
│                                       │   timeline w/ icons     │
└──────────────────────────────────────┴──────────────────────────┘
```

---

## Top strip

- Back arrow + green-tinted check icon + "MISSION COMPLETE · POST-FLIGHT" label + mission name
- Tabs (segmented): **Summary** (active) · Captures · Telemetry · Log · Compare to plan
- Status pills:
  - "ALL CAPTURED" (green) — confirms expected vs. actual photo count
  - "3 UPLOADING" (amber) — cloud queue
  - "0.4 m PLAN ∆" (green) — max plan-vs-actual deviation
- CTAs: Report (PDF) · Share · **Next mission** (cyan primary)

---

## Hero stats band

Big colored badge "✓ MISSION COMPLETE" + mission title + meta line (`MR-id · ASSET-id · site · timestamp`).

6 KPI tiles in a row:

| Tile | Value | Sub |
|---|---|---|
| DURATION | `14:36` | incl. RTH + land |
| PHOTOS | `24` | 24 / 24 captured |
| DATA CAPTURED | `96.4 MB` | 3 still uploading |
| DISTANCE | `312 m` | flight path total |
| MAX ALT | `90 m` | routine 78 m |
| BATTERY USED | `36%` | 98 → 62% |

KPIs are tinted by their result: green when good, amber when at-risk, red when something failed. In the prototype: PHOTOS is cyan (informational), DATA CAPTURED is amber (still uploading), BATTERY USED is green (acceptable).

---

## Telemetry timeline (the bolder element)

A single SVG chart, 2256 × 300 px, plotting 3 traces over the mission duration (876s = 14:36):

| Trace | Color | Shape | Range |
|---|---|---|---|
| Altitude AGL | cyan | area (filled) | 0–120 m |
| Battery % | amber | line | 0–100 |
| Ground speed | green | line | 0–10 m/s (shrunk to upper 40% of chart so it doesn't overlap altitude) |

### Annotations on the chart

- Horizontal dashed altitude reference lines (0, 30, 60, 90, 120 m)
- Blue dashed line at 90 m labeled "RTH 90 m"
- **Photo capture pips** — 24 vertical amber ticks along the orbit segment (102–814 s) with a faint amber background rectangle
- **Event markers** — vertical dashed lines at key moments, with floating chips above the chart (icon + time + label)

### Event markers (the floating chips above)

```ts
{ t: 18,  icon: 'flight_takeoff', label: 'Takeoff',         tone: 'cyan'  }
{ t: 46,  icon: 'arrow_upward',   label: 'RTH alt',         tone: 'cyan'  }
{ t: 102, icon: 'circle',         label: 'Orbit start',     tone: 'cyan'  }
{ t: 458, icon: 'photo_camera',   label: 'WP 12 · halfway · 12 / 24 photos', tone: 'amber' }
{ t: 814, icon: 'check_circle',   label: 'Orbit complete',  tone: 'green' }
{ t: 824, icon: 'home_pin',       label: 'RTH start',       tone: 'blue'  }
{ t: 854, icon: 'flight_land',    label: 'Landing',         tone: 'blue'  }
{ t: 876, icon: 'check_circle',   label: 'Touchdown',       tone: 'green' }
```

### Data sourcing

```ts
type TelemetrySample = {
  t: number;        // seconds since takeoff
  alt: number;      // m AGL
  batt: number;     // 0–100 percent
  spd: number;      // m/s ground speed
  // extras for hover tooltip:
  vspd?: number;
  heading?: number;
  lat?: number; lng?: number;
};
```

In production: stream samples at 1 Hz during flight (or higher), persist to your time-series store, fetch on Summary open. ~880 samples for a 15-min mission is trivial.

The 24 photo-capture events come from the **capture log** (separate from telemetry):

```ts
type CaptureEvent = {
  id: string;
  t: number;           // seconds since takeoff
  wp: number;          // waypoint number
  lensId: string;      // "ZOOM"
  format: string;      // "JPG+DNG"
  bytes: number;
  uploadState: 'uploaded' | 'uploading' | 'queued' | 'failed';
};
```

### Controls

- **CSV** button → export telemetry as CSV
- **Fullscreen** button → open chart at full viewport (out of scope for v1)
- Hover (out of scope for v1) → tooltip with `(t, alt, batt, spd)` at cursor

---

## Photo gallery

8-column grid of 24 thumbnails. Each thumb:

- Stylized aerial preview (in prototype this is a top-down tank SVG; in production it's the actual photo thumbnail)
- WP badge (top-left): `01`, `02`, ... `24` in cyan mono
- Lens chip (top-right): `ZOOM 5×`
- Upload state chip (bottom, only if not uploaded): amber `UPLOADING` chip with cloud icon

Header bar:
- Title + count
- Filter chips: All (24) · Uploading (3) · JPG + RAW (24)
- Download · Export buttons

Clicking a thumbnail opens a full-screen viewer (out of scope for this doc — design TBD).

---

## Path preview (right column, top)

Small map (mini version of HUD map) showing:

- Esri tile background
- Green completed orbit ring around Tank-04
- 24 green photo dots evenly spaced on the orbit
- Green dashed line from home pad to orbit (entry path)
- Blue dashed line from orbit back to home pad (return path)
- Home pad marker

Chip top-left: "PLAN ↔ ACTUAL · 0.4 m max ∆" (green) — confirms drone flew the planned path within tolerance.

Click "Open" → full Compare-to-plan view (out of scope).

---

## Upload status card

Compact card. Shows:

- Header: "Cloud sync · 3 of 24 uploading"
- Amber progress bar (87% complete based on byte count, not photo count)
- Status row: "21 uploaded · 3 in progress · 0 failed · ETA 00:42"

If any failed: amber → red, "Retry failed (N)" button appears.

---

## Flight log

Vertical timeline. Each event:

- Tone-colored 32 px circle with icon
- Mono timestamp `T+04:21`
- Event label (bold)
- One-line detail
- Vertical connector line to next event

Example events (`summary.jsx · LOG_EVENTS`):

| t | tone | label | detail |
|---|---|---|---|
| 00:00 | cyan | Motors armed | Pilot K. Marshall · attestations complete |
| 00:18 | cyan | Takeoff | Lift-off · 0.8 m/s climb · GPS FIX · 24 sats |
| 00:46 | cyan | Reached RTH altitude | 90 m AGL · transit speed engaged |
| 01:26 | cyan | Arrived above asset | Tank-04 · 124 m from home |
| 01:42 | cyan | Orbit started | r 12 m · alt 78 m · gimbal −45° · 24 photos planned |
| 07:42 | **amber** | Wind gust 7.6 m/s | Brief gust · drift compensated · no skipped frame |
| 13:34 | green | 24 / 24 photos captured | Orbit complete · all frames within target |
| 13:44 | blue | RTH commanded | Climbed to 90 m · routed 124 m home · bearing 322° |
| 14:14 | blue | Final descent | Surface check passed · 0.8 m/s touchdown rate |
| 14:36 | green | Touchdown · motors stopped | Mission complete · battery 62% |

Events come from the flight controller's event stream, the mission engine, and the cloud sync queue. Persist server-side.

Export as `.JSON` button in the header.

---

## Interactions

- **Tabs in top strip** swap content. Only "Summary" is designed; the others are deeper drills (Captures grid only, full telemetry trace with all 12+ channels, full event log with filter, plan-vs-actual diff).
- **Photo thumbnail click** → fullscreen viewer (out of scope here)
- **Report** button → PDF export (template TBD — see Backlog)
- **Share** button → generate shareable link / send to QA team
- **Next mission** button → returns to Fleet

---

## State management

```ts
type SummaryState = {
  mission: MissionRecord;            // immutable post-flight
  telemetry: TelemetrySample[];      // 880-ish samples
  captures: CaptureEvent[];          // 24
  events: LogEvent[];                // 10
  uploadStatus: {
    total: number;
    uploaded: number;
    uploading: number;
    failed: number;
    bytesPercent: number;
    etaSeconds: number;
  };
};
```

Subscribe to `uploadStatus` changes via WebSocket / SSE since uploads can take minutes after the flight.

---

## Backlog

- Anomaly tagging on captures (skipped this round — inspection AI is out of scope)
- Compare-to-plan view (per-WP plan vs. actual stats)
- Printable PDF mission report (template + per-customer branding)
- Re-fly assistant (clone this mission with corrections)
- QA handoff workflow (assign reviewer, track sign-off)
