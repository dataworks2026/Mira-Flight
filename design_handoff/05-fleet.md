# 05 · Fleet

The dispatcher's home base. Grid of drone cards + alerts banner + today's missions sidebar.

**Source files:** `designs/Fleet.html`, `designs/fleet.jsx`

---

## Purpose

Answer at a glance:

1. **What's flying right now?** (live missions, drones in flight)
2. **What's broken?** (offline drones, alerts, batteries due for service)
3. **What's next?** (today's mission queue, scheduled drones)

Designed for the dispatcher / chief pilot, not the in-flight operator. Multiple-drones-at-once view.

---

## Layout (2304 × 1440)

```
┌──────────────── TOP STRIP · 80 px ────────────────┐
│ [logo] Fleet · Refinery N+S    [tabs] [search]  [time][bell][user]
├──────────────────────── ALERTS BANNER · 78 px ──────────────┤
│ [3 ACTIVE ALERTS] alert1 · alert2 · alert3      [dismiss]
├──────────────────────────────────────┬──────────────────┤
│                                      │                   │
│   FLEET STATUS                       │  TODAY · MISSIONS │
│   "6 drones · 2 airborne · 2 ready"  │  520 px          │
│                                      │                   │
│   [filter chips] [Grid | Map]        │  9 missions       │
│                                      │  KPI tiles row   │
│   ┌──────┐ ┌──────┐ ┌──────┐         │                   │
│   │ A    │ │ B    │ │ C    │         │  IN FLIGHT NOW   │
│   └──────┘ └──────┘ └──────┘         │  SCHEDULED NEXT  │
│   ┌──────┐ ┌──────┐ ┌──────┐         │  COMPLETE TODAY  │
│   │ D    │ │ E    │ │ F    │         │  CANCELLED       │
│   └──────┘ └──────┘ └──────┘         │                   │
│                                      │  [Tomorrow link] │
└──────────────────────────────────────┴──────────────────┘
```

---

## Drone card (3 × 2 grid)

Each card represents one drone. Status drives colors + which info shows.

### Header strip
- Drone icon (tinted to match status)
- Name + ID + serial + firmware

### Hero zone (180 px)
- Drone illustration (top-down quadcopter SVG, smaller for Mavic)
- Status banner top-left (color-coded)
- Bay/location chip top-right
- In-flight strip (bottom): varies by status:
  - **flying** — ALT · SPD · DIST · T+
  - **returning** — ALT · DIST · ETA
  - **charging** — CHARGE % · DONE time · TEMP
  - **offline** — "NO TELEMETRY · last seen ..."

### Stats row (4-up)
- BATT (color reflects health)
- LINK %
- GPS (sat count)
- RTK (FIX / FLOAT / —)

### Mission strip
- Current mission row (or "No mission assigned" italic)
- Mini icon + name + operator + live counter

### Actions footer
- Primary CTA varies by status:
  - `idle` → "Plan flight"
  - `preflight` → "Open preflight"
  - `flying` / `returning` → "Open HUD"
  - `charging` → "Battery detail"
  - `offline` → "Investigate" (red)
- Secondary icon buttons: history · settings · more

### Drone status enum

```ts
type DroneStatus =
  | 'preflight'       // cyan — about to fly
  | 'flying'          // green pulsing — mid-mission
  | 'returning'       // blue pulsing — RTH active
  | 'idle'            // neutral — ready, no mission assigned
  | 'charging'        // amber — battery topping up
  | 'offline'         // red — no telemetry
  | 'maintenance';    // purple — out of rotation
```

### Drone data shape

```ts
type Drone = {
  id: string;           // "M350-A"
  name: string;         // "M350 RTK · A"
  serial: string;       // "SN 1A2401-0042"
  model: 'M350' | 'M300' | 'M30T' | 'Mavic 3T' | 'Anafi';
  bay: string;          // "Helipad N · Bay 2"
  status: DroneStatus;

  // live telemetry (null when offline)
  batt: number | null;          // 0–100
  battTemp: number | null;      // °C
  link: number | null;          // 0–100
  sigDbm: number | null;        // dBm
  sats: number | null;
  rtk: 'FIX' | 'FLOAT' | 'NONE' | null;

  // mission context
  mission: string | null;       // "MR-2026-0428 · Tank 04"
  operator: string | null;

  // status-specific
  flightTime?: string;          // "08:42" when flying
  eta?: string;                 // "01:14" when returning
  altitude?: number;            // m
  speed?: number;               // m/s
  distFromHome?: number;        // m
  chargingFinish?: string;      // "15:48"
  lastSeen?: string;            // "14:22 · 1h 6m ago" when offline

  fwVersion: string;
  cycles: number;               // battery cycle count
};
```

---

## Alerts banner

Single horizontal strip below the top strip. Up to 3 visible at once; overflow → "+N more" → drawer.

### Alert shape

```ts
type Alert = {
  id: string;
  tone: 'red' | 'amber';
  icon: string;                 // Material icon name
  text: string;                 // short, one line
  action: { label: string; href?: string };  // CTA on the right
  createdAt: ISODateTime;
};
```

Example seeds (in the design):
- `red` — M30T-D offline since 14:22 — 1h 6m no telemetry → "Investigate"
- `amber` — 2 TB65 batteries due for 200-cycle service (Drone A · Drone C) → "View batteries"
- `amber` — Wind forecast 7 m/s gusting 9 m/s at 16:30 — review pending missions → "Forecast"

The "3 ACTIVE ALERTS" chip in the banner is clickable → full alerts list view (out of scope for this design).

---

## Today's missions sidebar (520 px wide)

### Header
- "TODAY · TUE 28 APR" + "+ NEW MISSION" CTA
- Big number: "9 missions scheduled · 2 in flight"
- KPI strip: ELAPSED · PHOTOS · DATA · QA QUEUE

### Sections (collapsible)

In order:

1. **IN FLIGHT NOW** — green left border on each row, progress bar at row bottom showing % complete
2. **SCHEDULED NEXT** — cyan accent on section header, neutral rows
3. **COMPLETE TODAY** — checkmark-toned section header, neutral rows
4. **CANCELLED** — red section header, red-tinted rows (rare)

### Mission row shape

```ts
type Mission = {
  id: string;                              // "MR-2026-0428"
  name: string;                            // "Tank 04 inspection"
  asset: string;                           // "TANK-04"
  drone: string;                           // "M350-A"
  operator: string;
  state: 'scheduled' | 'in_flight' | 'complete' | 'cancelled';
  t: string;                               // "14:46" — start time or scheduled time
  // state-specific:
  progress?: number;                       // 0–100
  photos?: string;                         // "142 / 280"
  eta?: string;                            // "06:18"
  dur?: string;                            // "14:36" (for scheduled or complete)
  reason?: string;                         // for cancelled
};
```

### Footer

"Tomorrow: 6 missions scheduled" + "Open calendar" link.

---

## Top strip

- Logo + product tag + site label
- Tab nav: **Fleet** (active) · Missions · Assets · Calendar · Reports
- Search field (`⌘K` shortcut)
- Clock (local time)
- Notification bell with red dot
- User avatar + name

---

## Filter chips

Above the drone grid:

- **All** (count) — active by default
- **In flight** (count) — green
- **Ready** (count) — neutral
- **Charging** (count) — amber
- **Offline** (count) — red
- A divider, then a view switcher: **Grid** (active) / **Map**

The Map view is a future surface — out of scope.

---

## Interactions

- Click drone card primary CTA → navigate to appropriate next screen (Builder / HUD / etc.)
- Click drone card body (anywhere not on a button) → drone detail (out of scope)
- Click mission row → mission detail (or HUD if in flight)
- Click alert action → action-specific (investigate, drawer, forecast modal)
- Filter chip → re-filter grid in place
- Search → fuzzy-match drones, missions, assets

---

## State management

```ts
type FleetState = {
  drones: Drone[];               // polled at 5s
  missions: Mission[];           // polled at 30s
  alerts: Alert[];               // push via WebSocket
  filter: DroneStatus | 'all';
  view: 'grid' | 'map';
  search: string;
};
```

Recommend a WebSocket connection for drone telemetry + alerts; REST polling for missions list.

---

## Backlog

- **Map view** — drones live on the site map (alternative to grid)
- **Operator presence** — show who's flying what, who's available
- **Asset coverage stats** — % of assets inspected on schedule
- **Drilldown** — clicking a drone card opens a detail drawer
- **Batch ops** — multi-select drones for batch actions (firmware update, recall)
- **Calendar view** — week / month layout of scheduled missions
