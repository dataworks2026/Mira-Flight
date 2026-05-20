/* Mission Builder data — assets, routine templates, generated waypoint paths.
   Reuses tokens from hud-tokens.jsx (loaded by both files). */

/* Asset library — what an operator at a refinery actually inspects */
const ASSETS = [
  { id: 'TANK-04', name: 'Tank 04',          site: 'Refinery North', type: 'Storage tank',     subtype: 'Floating roof', dims: 'h 22 m · ⌀ 48 m',      lat: '29.7308° N', lng: '95.0832° W', last: '14 days ago',  status: 'due',     priority: 'high', routines: ['ORBIT', 'FACADE'] },
  { id: 'TANK-05', name: 'Tank 05',          site: 'Refinery North', type: 'Storage tank',     subtype: 'Floating roof', dims: 'h 22 m · ⌀ 48 m',      lat: '29.7311° N', lng: '95.0828° W', last: '6 days ago',   status: 'ok',      priority: 'med',  routines: ['ORBIT', 'FACADE'] },
  { id: 'TANK-06', name: 'Tank 06',          site: 'Refinery North', type: 'Storage tank',     subtype: 'Fixed roof',    dims: 'h 18 m · ⌀ 36 m',      lat: '29.7314° N', lng: '95.0824° W', last: '6 days ago',   status: 'ok',      priority: 'med',  routines: ['ORBIT', 'FACADE'] },
  { id: 'TANK-07', name: 'Tank 07',          site: 'Refinery North', type: 'Storage tank',     subtype: 'Fixed roof',    dims: 'h 18 m · ⌀ 36 m',      lat: '29.7318° N', lng: '95.0820° W', last: '32 days ago',  status: 'overdue', priority: 'high', routines: ['ORBIT', 'FACADE'] },
  { id: 'FLARE-01', name: 'Flare stack 01',  site: 'Refinery North', type: 'Flare stack',      subtype: 'Elevated',      dims: 'h 84 m · ⌀ 2.4 m',     lat: '29.7305° N', lng: '95.0836° W', last: '3 days ago',   status: 'ok',      priority: 'med',  routines: ['FACADE', 'ORBIT'] },
  { id: 'PIPE-12', name: 'Pipe rack 12',     site: 'Refinery North', type: 'Pipe corridor',    subtype: '12" insulated', dims: 'len 840 m',            lat: '29.7301° N', lng: '95.0814° W', last: '21 days ago',  status: 'due',     priority: 'med',  routines: ['CORRIDOR'] },
  { id: 'HEAT-EX-03',name:'Heat exchanger 03',site:'Refinery North',  type: 'Heat exchanger',   subtype: 'Shell-and-tube',dims: 'l 14 m · ⌀ 1.8 m',     lat: '29.7302° N', lng: '95.0830° W', last: '5 days ago',   status: 'ok',      priority: 'low',  routines: ['ORBIT', 'FACADE'] },
  { id: 'COOL-T-02', name:'Cooling tower 02',site: 'Refinery North',  type: 'Cooling tower',    subtype: 'Cross-flow',    dims: 'h 28 m · w 36 m',      lat: '29.7295° N', lng: '95.0822° W', last: '11 days ago',  status: 'ok',      priority: 'med',  routines: ['FACADE'] },
  { id: 'SUB-A',    name: 'Substation A',    site: 'Refinery North', type: 'Electrical yard',  subtype: 'Open switchyard',dims: 'area 0.42 ha',         lat: '29.7320° N', lng: '95.0810° W', last: '28 days ago',  status: 'due',     priority: 'high', routines: ['PERIMETER', 'GRID'] },
  { id: 'PIPE-08',  name: 'Pipe rack 08',    site: 'Refinery South', type: 'Pipe corridor',    subtype: '8" steam',      dims: 'len 612 m',            lat: '29.7265° N', lng: '95.0840° W', last: '17 days ago',  status: 'due',     priority: 'low',  routines: ['CORRIDOR'] },
  { id: 'TANK-11',  name: 'Tank 11',         site: 'Refinery South', type: 'Storage tank',     subtype: 'Bullet',        dims: 'h 12 m · ⌀ 6 m',       lat: '29.7268° N', lng: '95.0844° W', last: '9 days ago',   status: 'ok',      priority: 'low',  routines: ['ORBIT'] },
  { id: 'HELIPAD-N',name: 'Helipad North',   site: 'Refinery North', type: 'Landing zone',     subtype: '20×20 m pad',   dims: '20 × 20 m',            lat: '29.7322° N', lng: '95.0816° W', last: '—',            status: 'ok',      priority: 'low',  routines: ['GRID'] },
];

/* Routine templates — what the operator can pick.
   Each one has:
     - a tiny SVG preview drawn as an inline component
     - default params (the right rail edits these)
     - a function that, given asset + params, returns an SVG `<path>` and waypoint array
       expressed in the map's local 520 × 380 coordinate system (matches builder map size).
*/
const ROUTINE_TEMPLATES = {
  ORBIT: {
    id: 'ORBIT',
    name: 'Orbit',
    blurb: 'Circle the asset at fixed radius and altitude. Best for round structures: tanks, towers, exchangers.',
    icon: 'circle',
    defaults: { radius: 12, altitude: 78, photos: 24, gimbalPitch: -45, startHeading: 0, speed: 5 },
    paramFields: [
      { key: 'radius',       label: 'Standoff radius',  unit: 'm',  min: 6,  max: 40, step: 1 },
      { key: 'altitude',     label: 'Altitude AGL',     unit: 'm',  min: 10, max: 120, step: 1 },
      { key: 'photos',       label: 'Photos per orbit', unit: '',   min: 8,  max: 48, step: 1 },
      { key: 'gimbalPitch',  label: 'Gimbal pitch',     unit: '°',  min: -90,max: 0,  step: 5 },
      { key: 'startHeading', label: 'Start heading',    unit: '°',  min: 0,  max: 359,step: 5 },
      { key: 'speed',        label: 'Cruise speed',     unit: 'm/s',min: 1,  max: 8,  step: 0.5 },
    ],
  },
  FACADE: {
    id: 'FACADE',
    name: 'Façade scan',
    blurb: 'Vertical raster of a wall or tower face. Picks up detailed inspection imagery at known overlap.',
    icon: 'view_in_ar',
    defaults: { width: 36, height: 28, spacingH: 4, spacingV: 4, altitudeStart: 6, gimbalPitch: 0, speed: 3 },
    paramFields: [
      { key: 'width',         label: 'Face width',     unit: 'm',  min: 4, max: 80, step: 1 },
      { key: 'height',        label: 'Face height',    unit: 'm',  min: 4, max: 80, step: 1 },
      { key: 'spacingH',      label: 'H spacing',      unit: 'm',  min: 1, max: 12, step: 1 },
      { key: 'spacingV',      label: 'V spacing',      unit: 'm',  min: 1, max: 12, step: 1 },
      { key: 'altitudeStart', label: 'Bottom alt',     unit: 'm',  min: 3, max: 60, step: 1 },
      { key: 'gimbalPitch',   label: 'Gimbal pitch',   unit: '°',  min: -45, max: 45, step: 5 },
      { key: 'speed',         label: 'Cruise speed',   unit: 'm/s',min: 1, max: 6,  step: 0.5 },
    ],
  },
  GRID: {
    id: 'GRID',
    name: 'Top-down grid',
    blurb: 'Boustrophedon raster over a flat polygon. Output is ortho-ready with consistent overlap.',
    icon: 'grid_4x4',
    defaults: { width: 80, height: 60, overlapForward: 75, overlapSide: 65, altitude: 60, speed: 6 },
    paramFields: [
      { key: 'width',          label: 'Area width',      unit: 'm',  min: 20, max: 400, step: 5 },
      { key: 'height',         label: 'Area length',     unit: 'm',  min: 20, max: 400, step: 5 },
      { key: 'overlapForward', label: 'Front overlap',   unit: '%',  min: 50, max: 90, step: 5 },
      { key: 'overlapSide',    label: 'Side overlap',    unit: '%',  min: 40, max: 85, step: 5 },
      { key: 'altitude',       label: 'Altitude AGL',    unit: 'm',  min: 30, max: 120, step: 1 },
      { key: 'speed',          label: 'Cruise speed',    unit: 'm/s',min: 2,  max: 10, step: 0.5 },
    ],
  },
  PERIMETER: {
    id: 'PERIMETER',
    name: 'Perimeter trace',
    blurb: 'Trace the outline of a polygon at fixed altitude with gimbal angled at the boundary.',
    icon: 'pentagon',
    defaults: { altitude: 50, gimbalPitch: -30, standoff: 8, speed: 5 },
    paramFields: [
      { key: 'altitude',    label: 'Altitude AGL', unit: 'm',  min: 20, max: 120, step: 1 },
      { key: 'gimbalPitch', label: 'Gimbal pitch', unit: '°',  min: -60, max: 0, step: 5 },
      { key: 'standoff',    label: 'Standoff',     unit: 'm',  min: 3, max: 20, step: 1 },
      { key: 'speed',       label: 'Cruise speed', unit: 'm/s',min: 2, max: 8, step: 0.5 },
    ],
  },
  CORRIDOR: {
    id: 'CORRIDOR',
    name: 'Linear corridor',
    blurb: 'Follow a polyline (pipe rack, road, river) at fixed offset. Photo on distance trigger.',
    icon: 'route',
    defaults: { altitude: 40, offset: 4, photoEvery: 6, gimbalPitch: -90, speed: 6 },
    paramFields: [
      { key: 'altitude',    label: 'Altitude AGL', unit: 'm',  min: 15, max: 120, step: 1 },
      { key: 'offset',      label: 'Side offset',  unit: 'm',  min: 0, max: 20, step: 1 },
      { key: 'photoEvery',  label: 'Photo every',  unit: 'm',  min: 2, max: 30, step: 1 },
      { key: 'gimbalPitch', label: 'Gimbal pitch', unit: '°',  min: -90, max: 0, step: 5 },
      { key: 'speed',       label: 'Cruise speed', unit: 'm/s',min: 2, max: 10, step: 0.5 },
    ],
  },
  MANUAL: {
    id: 'MANUAL',
    name: 'Manual waypoints',
    blurb: 'Place waypoints by tap. Per-WP altitude, heading, and camera action. No template overlay.',
    icon: 'add_location',
    defaults: {},
    paramFields: [],
  },
};

const ROUTINE_LIST = ['ORBIT', 'FACADE', 'GRID', 'PERIMETER', 'CORRIDOR', 'MANUAL'];

/* Pre-baked orbit waypoint stages used by the timeline view */
const ORBIT_STAGES = [
  { id: 'arm',         label: 'Arm & take off',    icon: 'flight_takeoff', dur: 18,  tone: 'cyan',  detail: 'Spin up · 3 m hover · safety check' },
  { id: 'climb',       label: 'Climb to RTH alt',  icon: 'arrow_upward',   dur: 28,  tone: 'cyan',  detail: '0 → 90 m · 3.2 m/s' },
  { id: 'transit',     label: 'Transit to Tank-04',icon: 'navigation',     dur: 22,  tone: 'cyan',  detail: '124 m · bearing 142° · 6 m/s' },
  { id: 'descend',     label: 'Descend to orbit',  icon: 'arrow_downward', dur: 12,  tone: 'cyan',  detail: '90 → 78 m AGL' },
  { id: 'orbit',       label: 'Orbit · capture 24',icon: 'circle',         dur: 432, tone: 'amber', detail: 'r 12 m · gimbal −45° · 15° per photo', captures: 24 },
  { id: 'climb_out',   label: 'Climb to RTH alt',  icon: 'arrow_upward',   dur: 10,  tone: 'cyan',  detail: '78 → 90 m' },
  { id: 'rth',         label: 'Return to home',    icon: 'home_pin',       dur: 22,  tone: 'blue',  detail: '124 m · bearing 322° · 6 m/s' },
  { id: 'land',        label: 'Descend & land',    icon: 'flight_land',    dur: 34,  tone: 'green', detail: '90 → 0 m · final 0.8 m/s' },
];

window.ASSETS = ASSETS;
window.ROUTINE_TEMPLATES = ROUTINE_TEMPLATES;
window.ROUTINE_LIST = ROUTINE_LIST;
window.ORBIT_STAGES = ORBIT_STAGES;
