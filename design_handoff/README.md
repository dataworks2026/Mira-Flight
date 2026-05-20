# Handoff — Mira Flight

> **Status:** High-fidelity design package for the Mira Flight autonomous-drone operator app. Five end-to-end surfaces, ready for implementation.

---

## 1 · About this bundle

The HTML files in `designs/` are **design references**, not production code. They were built as visual prototypes — accurate to the intended look, layout, copy, and behavior — but they should be **recreated in your actual codebase** using its existing patterns (React + your component library, SwiftUI, Flutter, whatever), not lifted verbatim.

- The JSX files use `<script type="text/babel">` in the browser. Don't ship that — use your build system.
- The Esri tile URLs are placeholders for real-life satellite imagery. In production swap to Mapbox, Google, or whatever your maps provider is.
- Material Symbols Outlined is loaded from Google Fonts. Most icon libraries (lucide, heroicons, your own) have equivalent names; substitute freely.

## 2 · Fidelity

**Hi-fi.** Colors, type scale, density, spacing, and component anatomy are final. Exact hex values, font sizes, and px measurements live in `01-design-system.md`. Treat the JSX files as the source of truth when something is ambiguous in the docs.

## 3 · How to read this bundle

Read in order. Each doc is self-contained but they build on each other.

| File | What it covers |
|---|---|
| `01-design-system.md` | Tokens (colors, type, spacing), icon set, base components (StatusPill, TelemTape, etc.) — read this first |
| `02-hud.md` | In-flight HUD + 9 non-nominal states (PAUSED, RTH, LOW_BATTERY, CRITICAL_BATTERY, LOST_LINK, GPS_DEGRADED, GEOFENCE_HOVER, OBSTACLE_BRAKE, MISSION_COMPLETE) |
| `03-builder.md` | Mission Builder (3 states: editor, asset picker, timeline view) |
| `04-preflight.md` | Preflight checklist + arming gate |
| `05-fleet.md` | Fleet dashboard (drone grid + alerts banner + missions queue) |
| `06-summary.md` | Post-flight Mission Summary (telemetry chart + gallery + log + upload) |
| `07-data-models.md` | TypeScript types for the whole system — drone, mission, waypoint, asset, telemetry, etc. Start here when scaffolding the backend |

## 4 · The end-to-end flow

```
Fleet ──► Mission Builder ──► Preflight ──► HUD ──► Mission Summary
  ▲                                          │            │
  └──────────────────────────────────────────┴────────────┘
                  (mission completion returns here)
```

- A **dispatcher** opens **Fleet**, picks a drone or a backlog mission.
- The **Mission Builder** is where they bind an *asset* (Tank-04 etc.) to a *routine template* (Orbit, Façade, Grid, Perimeter, Corridor, Manual). Output: a serialized mission plan.
- **Preflight** runs 23 automated/manual checks. Red items block arming; ambers require an explicit attestation.
- **HUD** is the in-flight cockpit. Same chassis in all 10 states (1 nominal + 9 alt). State machine drives every region.
- **Mission Summary** closes the loop — telemetry timeline, captures, flight log, upload status. From here the operator goes back to Fleet.

## 5 · How to share with Claude Code on your laptop

1. **Download this folder** (the `present_fs_item_for_download` card in chat zips it).
2. **Unzip** into your project workspace, e.g. `~/dev/mira-flight/design_handoff_mira_flight/`.
3. **Open Claude Code** in your project root.
4. **Prime it** with the README and the doc for whatever you're building today:
   ```
   Read design_handoff_mira_flight/README.md and
   design_handoff_mira_flight/02-hud.md. We're going to implement
   the HUD against this design. The codebase uses <your stack>.
   Start by listing what you need to scaffold.
   ```
5. **For each session** focus Claude Code on one doc + one surface. Don't try to do all five at once — pair-program one screen at a time.

Tips:
- The JSX files use `style={{}}` inline styles for prototyping speed. **Don't** copy that pattern into your codebase if you have a styling system (Tailwind, CSS modules, styled-components). Map the design tokens (`01-design-system.md`) into your styling system once, then use those tokens.
- The state machine is the most important thing to get right for the HUD. Read `02-hud.md` end-to-end before writing the HUD code.
- The waypoint generation logic for the routine templates (Orbit, Façade, Grid, Perimeter, Corridor) lives in `builder-map.jsx`. Re-implement the math on the server.

## 6 · What's NOT in this bundle (backlog)

Tracked but unbuilt, in `02-hud.md` and elsewhere:

- ADS-B nearby aircraft overlay
- TFR / no-fly-zone overlay (LAANC integration)
- Predicted 5-second flight path
- Smart RTH avoiding mapped obstacles (DJI APAS equivalent)
- Multi-pilot handover (passing stick control between operators)
- Onboarding / pairing / first-launch flow
- Asset settings (defining new inspection targets, geofences)
- Inspection AI / anomaly tagging on captures
- Printable PDF mission report from Mission Summary
- Account / billing / admin

## 7 · Open questions for the dev team

- **Coordinate system**: the SVG overlays use a local map coord system. Confirm projection (we assume Web Mercator EPSG:3857).
- **MAVLink message map**: `02-hud.md` references MAVLink IDs in the state descriptions but the mapping is sample-grade. Verify against the firmware your fleet runs.
- **RTK provider**: the design assumes a Trimble base station + cellular RTCM. Adapt.
- **Camera enum** (`WIDE / ZOOM / IR / LRF`): matches DJI M350. Generalize per drone model.
- **Color-blind safe palette**: amber + green pair is risky for deuteranopia. Confirm or remap accent tones in the design system.

Reach out to the design owner before changing any of the validation rules in Preflight or the auto-failsafe timings in the HUD alt-states.
