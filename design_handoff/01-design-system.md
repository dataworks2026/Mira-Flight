# 01 · Design System

Read this first. Every other doc assumes you've internalized these tokens and base components.

---

## Foundations

### Aspect & target device

- **Primary target:** Galaxy Tab S10+ landscape → **2304 × 1440** (1.6:1)
- **HUD must remain readable at this size with gloved fingers in outdoor light.** All hit targets ≥ 44 px. Critical text ≥ 14 px.
- The Builder, Fleet, Summary, and Preflight surfaces use the same canvas size for consistency. They could responsively reflow to laptop sizes, but the in-flight HUD should not.

### Typography

| Use | Family | Notes |
|---|---|---|
| UI text | **Roboto** | 300 / 400 / 500 / 700 / 900 |
| Numeric / mono | **Roboto Mono** | 400 / 500 / 600 / 700 — `font-variant-numeric: tabular-nums; font-feature-settings: "tnum" 1; letter-spacing: -0.01em;` |
| Icons | **Material Symbols Outlined** | Variable font, all weights/fills available. Substitute lucide / heroicons in your codebase if preferred — the icon names listed below map cleanly. |

Sizes used (px):

- Hero numeric (HUD speed/alt): 48
- Section hero (e.g. "98%" battery): 52–64
- Page title: 30–32
- Card title: 17–22
- Body: 13–14
- Caption / label: 11–13 (uppercase, `letter-spacing: 0.16em–0.22em`)
- Mono micro: 9–11

### Color tokens

All from `hud-tokens.jsx`:

```ts
const T = {
  // backgrounds
  bg:       '#0A0E14',  // app background
  panel:    '#131822',  // raised panels
  panelHi:  '#1A2030',  // emphasized panels (top strip, batteries)
  card:     '#1E2530',  // card backgrounds
  cardHi:   '#252D3B',  // hover/active card

  // hairlines
  hairline:  '#262E3D', // primary divider
  hairline2: '#1d2433', // secondary, lighter divider inside cards

  // accents
  cyan:    '#00D4FF',   // primary accent — interactive, current, mission state
  cyanDim: '#0099BD',
  green:   '#10B981',   // OK / success / battery healthy
  amber:   '#F59E0B',   // warn / threshold crossed
  red:     '#EF4444',   // critical / destructive / failsafe
  blue:    '#3B82F6',   // RTH / informational severity
  purple:  '#A78BFA',   // manual override / pilot stick

  // text
  t1: '#F8FAFC',  // primary
  t2: '#94A3B8',  // secondary
  t3: '#475569',  // tertiary / disabled
};
```

#### Severity mapping (CRITICAL)

| Severity | Color | Used for |
|---|---|---|
| OK / nominal | `green` | Default healthy state |
| Notice (informational) | `cyan` | Active state, current item, primary actions |
| Warning | `amber` | Threshold crossed, attention needed, non-blocking |
| Critical / destructive | `red` | Failsafe engaged, blocks arming, hold-to-confirm destructive actions |
| RTH (informational severity) | `blue` | Return-to-home, "things are fine but flight is no longer per plan" |

**Color is informational, not decorative.** Don't introduce new tones for branding. If a chart needs more colors, derive them via `oklch()` with matching chroma + lightness.

### Health thresholds

Drive all auto-failsafe decisions:

```ts
const health = {
  battery: (pct) => pct >= 30 ? 'ok' : pct >= 20 ? 'warn' : 'crit',
  signal:  (dbm) => dbm >= -70 ? 'ok' : dbm >= -85 ? 'warn' : 'crit',
  sats:    (n)   => n >= 12 ? 'ok' : n >= 8 ? 'warn' : 'crit',
  rtk:     (s)   => s === 'FIX' ? 'ok' : s === 'FLOAT' ? 'warn' : 'crit',
  wind:    (ms)  => ms <= 8 ? 'ok' : ms <= 12 ? 'warn' : 'crit',
  vspeed:  (v)   => Math.abs(v) <= 3 ? 'ok' : Math.abs(v) <= 5 ? 'warn' : 'crit',
  altitude:(m)   => (m >= 5 && m <= 120) ? 'ok' : m < 5 ? 'warn' : 'crit', // FAA 400ft ≈ 120m
};
```

### Auto-failsafe rules

| Trigger | Action | Pilot grace? |
|---|---|---|
| Battery ≤ 25% | Auto-RTH | 10 s |
| Battery ≤ 15% | Auto-LAND (non-cancelable) | none |
| RC link lost ≥ 5 s | Failsafe RTH | n/a (drone-side) |
| GPS < 8 sats OR RTK lost | Attitude mode, auto-RTH disabled | n/a |
| Geofence breach predicted | Hover at boundary | n/a (await pilot) |
| Obstacle detected within 8 m | Brake + prompt | n/a (await pilot) |
| Altitude > 120 m AGL | Warn, soft-cap | n/a |

### Spacing & radii

- Base: 8 px grid (gaps of 8 / 10 / 12 / 14 / 16 / 18 / 22 / 24 / 28)
- Radii: `4` (small chips), `6` (buttons), `8` (cards, controls), `10` (large buttons), `12` (panels, modals), `999` (pills)
- Hairline borders: `1px` solid `T.hairline` or `T.hairline2`

### Hit targets

- Min button height: 44 px (gloved use)
- Min icon button: 40 × 40 px
- Min slider track touch zone: 16 px tall (visual track can be 6 px)

---

## Iconography

Single source of truth — extend in your codebase but match these semantic names:

```ts
const ICON = {
  // identity / chrome
  drone: 'flight',           operator: 'person',         menu: 'more_horiz',
  back: 'arrow_back',        close: 'close',             swap: 'swap_horiz',
  layers: 'layers',          expand: 'expand_more',      collapse: 'expand_less',

  // telemetry
  altitude: 'height',        speed: 'speed',             vspeed: 'swap_vert',
  heading: 'navigation',     gimbal: 'videocam',         home: 'home',
  battery: 'battery_full',   battery_low: 'battery_alert',
  signal: 'signal_cellular_alt', satellite: 'satellite_alt', rtk: 'gps_fixed',
  wind: 'air',               temp: 'thermostat',

  // mission
  waypoint: 'location_on',   mission: 'route',           photo: 'photo_camera',
  video: 'videocam',         ir: 'thermostat_auto',      laser: 'straighten',

  // controls
  play: 'play_arrow',        pause: 'pause',             stop: 'stop',
  skip_next: 'skip_next',    skip_prev: 'skip_previous', retry: 'refresh',
  zoom_in: 'zoom_in',        zoom_out: 'zoom_out',

  // emergency / flight control
  rth: 'home_pin',           land: 'flight_land',        takeoff: 'flight_takeoff',
  abort: 'cancel',           estop: 'power_settings_new', emergency: 'emergency',
  override: 'pan_tool',

  // status
  ok: 'check_circle',        warn: 'warning',            err: 'error',  info: 'info',

  // map
  target: 'gps_not_fixed',   reticle: 'center_focus_strong',
  geofence: 'fence',         no_fly: 'block',
  airspace: 'airplanemode_active', ads_b: 'sensors', obstacle: 'shield',
  ruler: 'square_foot',

  // upload / cloud
  cloud: 'cloud', upload: 'cloud_upload', sync: 'sync',
};
```

---

## Base components

These appear in every surface. Implement them once.

### `<StatusPill>` — colored badge with icon + label + optional value

```tsx
<StatusPill tone="green | amber | red | blue | cyan | slate"
            icon={<Icon />}
            label="LINK"
            value="98%" // optional
            size="sm | md" />
```

Used in the top strip of every screen and as inline status indicators.

### `<TelemTape>` — telemetry row (HUD left rail)

Icon-color, label, value-with-unit, optional sub-label. Health prop drives icon/value color. `big` prop bumps font size for hero fields (altitude, ground speed).

### `<FlightCtrlBtn>` — emergency / destructive action

Card-style button with icon + label + sub-label (e.g. "HOLD 2s"). Color = severity. Variant props: `active`, `disabled`.

### `<BreadcrumbStep>` + `<BreadcrumbConnector>`

Used at the top of Builder and Preflight. Three states: `done` (green check), `active` (cyan ring), `next` (muted).

### `<KV>` — label/value definition row

For sidebar metadata. Uppercase tracked label + value (mono if `mono` prop).

### `<DroneCard>` (Fleet only)

Composes status banner + hero illustration + 4-up stats + mission strip + actions. See `05-fleet.md`.

### `<MapView>` / `<BuilderMap>`

Stack: Esri tile grid → geofence pattern overlay → SVG layer with assets + routine paths + drone marker → controls (compass, zoom, layers) → scale + attribution. In production you'll likely use Mapbox GL or MapLibre instead of a fixed tile grid.

---

## Map projection & overlays

The SVG overlays use a local coordinate system (e.g. `viewBox="0 0 1000 800"` in builder-map) that maps roughly to the visible tile area. **In production, do real lat/lng → screen-px projection.**

Common overlay primitives:

- **Asset standoff ring** — dashed cyan circle around an asset
- **Orbit path** — solid cyan circle (planned), green arc (completed)
- **Waypoint dot** — small filled circle; current is larger w/ pulse ring; done is green check; upcoming is hollow
- **Geofence** — diagonal-stripe pattern fill, amber (active) / red (breach)
- **Home pad** — green square w/ "H"
- **Drone marker** — top-down quadcopter SVG with heading cone (rotates with yaw)
- **RTH route** — dashed blue line with arrow marker

---

## Animation conventions

- Pulse on **current waypoint, in-flight drone marker, active timer**: 1.5s ease-in-out
- Hold-to-confirm fill: 2s linear, ring or progress bar inside button
- State transitions: 200ms cubic-bezier(0.4, 0, 0.2, 1)
- Toast slide-in: 250ms from top, dismiss 200ms

---

## Accessibility (must-haves)

- All flight-control buttons require **hold-to-confirm (2 s)** when destructive — visual ring fill, haptic feedback, and announce via screen reader.
- Severity is reinforced with **icon + label**, not color alone (deuteranopia safety).
- E-STOP is the only single-tap-to-arm action and is the only red button that doesn't require hold-to-confirm. (It requires a hold-3s once tapped.)
- Sufficient contrast: text ≥ 4.5:1 against background. Check secondary text (`t2: #94A3B8`) — at 12–13 px it's borderline; bump to 14 px if in doubt.

## Localization

- All copy is English in the prototype. Set up i18n early — labels like "AUTO-RTH IN 00:07" combine static + dynamic content; structure accordingly.
- Use ISO 8601 timestamps internally; display localized per the operator's locale.
- Units: metric throughout (m, m/s, °C, m/s, %). Don't switch to imperial — confirm with stakeholders before exposing a units toggle.
