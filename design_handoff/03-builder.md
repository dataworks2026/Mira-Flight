# 03 · Mission Builder

The bridge from "I want to inspect Tank-04" to "armed and ready to fly". Three states on a single chassis.

**Source files:** `designs/Mission Builder.html`, `designs/builder-*.jsx`

---

## Purpose

Bind an **asset** (Tank-04, Pipe-12, Substation-A) to a **routine template** (Orbit, Façade, Grid, Perimeter, Corridor, Manual) and parameters. Output: a serialized `MissionPlan` ready for preflight.

The user starts from an asset (not a routine). Each asset has suggested routines based on type. The Builder generates a waypoint path from the asset geometry + selected template + params — the user fine-tunes if needed.

---

## States

| State | What's on screen | When |
|---|---|---|
| **Editor** (hero) | Asset card left · map with routine overlay center · params right rail | Default — asset already selected, refining the plan |
| **Asset picker** (side state A) | Asset library expanded left · all assets on map · selected-asset preview right | Step 1 entry, or when "Swap asset" is tapped |
| **Timeline** (side state B) | Asset card left · smaller map · video-editor-style timeline at the bottom · per-stage inspector right | Power-user mode for fine-grained control over flight stages |

---

## Layout (2304 × 1440)

### Editor (hero)

```
┌──────────────── TOP STRIP · 80 px ────────────────┐
│ [back][icon] mission name        [breadcrumb] [Save] [Sim] [Arm & Fly]
├───────────┬─────────────────────────────┬────────────┤
│           │                              │            │
│  ASSET    │       MAP EDITOR             │  ROUTINE   │
│  CARD     │       (Esri tiles)           │  + PARAMS  │
│  320 px   │                              │  460 px    │
│           │                              │            │
│  thumb,   │       Orbit path drawn       │  routine   │
│  dims,    │       around Tank-04,        │  chips,    │
│  coords,  │       24 waypoints,          │  sliders,  │
│  home pad,│       gimbal rays            │  capture   │
│  drone    │                              │  config,   │
│           │                              │  summary   │
│           │                              │  card      │
└───────────┴─────────────────────────────┴────────────┘
```

### Asset picker

```
┌──── TOP STRIP ────┐
├─────────────────────┬─────────────────────┬──────────────┤
│                     │                       │              │
│  ASSET LIBRARY      │      MAP             │  SELECTED   │
│  760 px             │   (all assets pinned) │  PREVIEW    │
│                     │                       │  460 px     │
│  search · filters · │  selected = cyan      │             │
│  sites grouped ·    │  others = white       │  thumb,     │
│  rows w/ thumb +    │                       │  stats,     │
│  status + routine   │                       │  suggested  │
│  chips              │                       │  routines   │
│                     │                       │             │
└─────────────────────┴─────────────────────┴──────────────┘
```

### Timeline view

```
┌──── TOP STRIP ────┐
├───────────┬──────────────────────────────────┬────────────┤
│           │                                  │            │
│  ASSET    │      MAP (taller upper)          │  STAGE     │
│  CARD     │                                  │  INSPECTOR │
│           │                                  │  460 px    │
│           │                                  │            │
│           ├──────────────────────────────────┤            │
│           │      FLIGHT TIMELINE             │            │
│           │      (8 stage cards, ruler,      │            │
│           │       playhead, 6-up params)     │            │
│           │      280 px tall                 │            │
└───────────┴──────────────────────────────────┴────────────┘
```

---

## Routine templates

Six built-in templates. Each has:

- Display name + 1-line blurb
- Material Symbols icon
- Default params object
- Param field schema (key, label, unit, min, max, step)
- A **waypoint generator function** that takes (asset, params) → `Waypoint[]`

### Orbit

> Circle the asset at fixed radius and altitude. Best for round structures.

Default params:
```ts
{ radius: 12, altitude: 78, photos: 24, gimbalPitch: -45, startHeading: 0, speed: 5 }
```

Generation: `n` waypoints evenly distributed around a circle of `radius` centered on the asset, each pointed at the asset center (gimbal yaw computed). All waypoints share `altitude` and `gimbalPitch`. Entry path from home pad to first WP; return path from last WP to home.

### Façade scan

> Vertical raster of a wall or tower face. Picks up detailed inspection imagery at known overlap.

Default params:
```ts
{ width: 36, height: 28, spacingH: 4, spacingV: 4, altitudeStart: 6, gimbalPitch: 0, speed: 3 }
```

Generation: boustrophedon raster across the face. Horizontal step `spacingH`, vertical step `spacingV`. Drone offset by configurable standoff distance.

### Top-down grid

> Boustrophedon raster over a flat polygon. Output is ortho-ready with consistent overlap.

Default params:
```ts
{ width: 80, height: 60, overlapForward: 75, overlapSide: 65, altitude: 60, speed: 6 }
```

Photo trigger spacing is computed from sensor FOV + altitude + overlap %.

### Perimeter trace

> Trace the outline of a polygon at fixed altitude with gimbal angled at the boundary.

Default params:
```ts
{ altitude: 50, gimbalPitch: -30, standoff: 8, speed: 5 }
```

Asset must have a polygon geometry. WPs at every vertex + insertions for long edges.

### Linear corridor

> Follow a polyline (pipe rack, road, river) at fixed offset. Photo on distance trigger.

Default params:
```ts
{ altitude: 40, offset: 4, photoEvery: 6, gimbalPitch: -90, speed: 6 }
```

### Manual waypoints

> Place waypoints by tap. Per-WP altitude, heading, and camera action. No template overlay.

No defaults, no auto-generation. Map becomes a tap-to-place canvas. Each WP is editable inline.

---

## Asset library data shape

```ts
type Asset = {
  id: string;                         // "TANK-04"
  name: string;                       // "Tank 04"
  site: string;                       // "Refinery North"
  type: 'Storage tank' | 'Heat exchanger' | 'Pipe corridor' | 'Flare stack' | 'Cooling tower' | 'Electrical yard' | 'Landing zone';
  subtype: string;                    // "Floating roof"
  dims: string;                       // "h 22 m · ⌀ 48 m"
  lat: string; lng: string;           // "29.7308° N"
  last: string;                       // "14 days ago"
  status: 'ok' | 'due' | 'overdue';
  priority: 'low' | 'med' | 'high';
  routines: RoutineId[];              // suggested routines
  geometry?: { kind: 'point' | 'polygon' | 'polyline'; coords: number[][] };
};
```

Asset library entries live in `builder-data.jsx`. In production, fetch from a backend.

---

## Capture configuration

Below the routine params on the right rail. Affects every photo captured during the mission.

- **Lens picker** — WIDE / ZOOM (with optional level e.g. ZOOM 5×) / IR / LRF
- **Exposure mode** — AUTO / M (manual)
- **Trigger** — ON WP HOVER (default for orbit) / EVERY 6m (corridor) / EVERY 2s (grid) / MANUAL
- **Format** — JPG + DNG / JPG / DNG
- **Geotag** — RTK + EXIF (default) / GPS + EXIF

---

## Top strip — breadcrumb

Four steps:

1. **Asset** — picker state
2. **Routine** — editor state (default)
3. **Capture** — currently rolled into Routine in the prototype; could be split if you want progressive disclosure
4. **Preflight** — leads to the Preflight screen

State is `done` (green check) / `active` (cyan ring) / `next` (muted).

Top-strip also surfaces three live status pills (always visible across this app):
- GEOFENCE OK / WARN / BLOCK
- LAANC / NOTAM authorization status
- Wind reading (amber if at or past threshold)

---

## Mission summary footer (right rail, bottom)

Shows live estimates as the user edits params:

- **Duration** — total flight time including transit + RTH + land
- **Photos** — total capture count
- **Distance** — total flown distance in meters
- **Battery on return** — predicted % at landing, green if > 30%, amber 20–30%, red < 20%

Below: a "Ready to arm · 3 of 3 validations pass" affordance leading to the Preflight step.

---

## Timeline view (bolder treatment)

Stages of an Orbit mission:

| # | Stage | Tone | Duration | Detail |
|---|---|---|---|---|
| 01 | Arm & take off | cyan | 18 s | Spin up · 3 m hover · safety check |
| 02 | Climb to RTH alt | cyan | 28 s | 0 → 90 m · 3.2 m/s |
| 03 | Transit to asset | cyan | 22 s | 124 m · bearing 142° · 6 m/s |
| 04 | Descend to orbit | cyan | 12 s | 90 → 78 m AGL |
| 05 | Orbit · capture 24 | amber | 432 s | r 12 m · gimbal −45° · 15° per photo |
| 06 | Climb out | cyan | 10 s | 78 → 90 m |
| 07 | Return to home | blue | 22 s | 124 m · bearing 322° · 6 m/s |
| 08 | Descend & land | green | 34 s | 90 → 0 m · final 0.8 m/s |

Each stage card is duration-proportional in width. Per-stage params editable in the right inspector. Playhead position is for visual reference; in production you might use this same view in playback after the mission.

---

## Behavior / interactions

- **Map tap** on a routine overlay → opens that waypoint for inline editing
- **Drag on slider** → live re-renders the waypoint path
- **Routine swap** → confirmation modal if waypoints have been manually customized
- **Asset swap** → discards current waypoint customizations after a confirm
- **Validate** button → runs geofence + airspace + battery + RTH-clearance checks; returns to user with pass/fail
- **Arm & Fly** button → transitions to Preflight (only enabled if Validate passes)
- **Auto-save** every 30s as draft; visible "AUTO-SAVED 11:42" chip in top strip

---

## Backlog

- Multi-asset chained missions (UI placeholder exists: "+ Chain another asset" button)
- Library import for routines (operator-shared templates)
- Cost estimator (per-flight $$ based on drone + operator + cloud egress)
- Simulator preview (3D pre-flight replay against terrain mesh)
