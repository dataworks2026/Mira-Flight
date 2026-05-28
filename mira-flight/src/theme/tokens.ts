/**
 * Design tokens for Mira Flight GCS.
 * Single source of truth — components must import from here, never hardcode hex.
 * Sourced from design_handoff/01-design-system.md
 */

// ── Color palette ────────────────────────────────────────────────────────────

export const T = {
  // Backgrounds
  bg:       '#0A0E14',
  panel:    '#131822',
  panelHi:  '#1A2030',
  card:     '#1E2530',
  cardHi:   '#252D3B',

  // Hairlines
  hairline:  '#262E3D',
  hairline2: '#1D2433',

  // Accents
  cyan:    '#00D4FF',
  cyanDim: '#0099BD',
  green:   '#10B981',
  amber:   '#F59E0B',
  red:     '#EF4444',
  blue:    '#3B82F6',
  purple:  '#A78BFA',
  slate:   '#475569',

  // Text
  t1: '#F8FAFC',
  t2: '#94A3B8',
  t3: '#475569',
} as const;

export type ToneKey = 'green' | 'amber' | 'red' | 'blue' | 'cyan' | 'slate' | 'purple';

/** Map a tone name to the corresponding accent color in T. */
export const TONE_COLOR: Record<ToneKey, string> = {
  green:  T.green,
  amber:  T.amber,
  red:    T.red,
  blue:   T.blue,
  cyan:   T.cyan,
  slate:  T.slate,
  purple: T.purple,
};

// ── Health thresholds ────────────────────────────────────────────────────────

export type HealthLevel = 'ok' | 'warn' | 'crit';

export const health = {
  battery: (pct: number): HealthLevel =>
    pct >= 30 ? 'ok' : pct >= 20 ? 'warn' : 'crit',
  signal: (dbm: number): HealthLevel =>
    dbm >= -70 ? 'ok' : dbm >= -85 ? 'warn' : 'crit',
  sats: (n: number): HealthLevel =>
    n >= 12 ? 'ok' : n >= 8 ? 'warn' : 'crit',
  rtk: (s: string): HealthLevel =>
    s === 'FIX' ? 'ok' : s === 'FLOAT' ? 'warn' : 'crit',
  wind: (ms: number): HealthLevel =>
    ms <= 8 ? 'ok' : ms <= 12 ? 'warn' : 'crit',
  vspeed: (v: number): HealthLevel =>
    Math.abs(v) <= 3 ? 'ok' : Math.abs(v) <= 5 ? 'warn' : 'crit',
  altitude: (m: number): HealthLevel =>
    m >= 5 && m <= 120 ? 'ok' : m < 5 ? 'warn' : 'crit',
} as const;

/** Map a HealthLevel to its accent color. */
export const HEALTH_COLOR: Record<HealthLevel, string> = {
  ok:   T.green,
  warn: T.amber,
  crit: T.red,
};

// ── Spacing — tightened ~30% to fit the DJI RC Plus screen (480×768 dp landscape,
// vs Tab S10+ 720×1152 dp) without forcing scroll on mission-planning / preflight.
export const spacing = {
  xs:  3,
  sm:  6,
  md:  9,
  lg:  12,
  xl:  15,
  xxl: 18,
  '3xl': 21,
  '4xl': 24,
} as const;

// ── Radii ────────────────────────────────────────────────────────────────────

export const radius = {
  chip:   4,
  btn:    6,
  card:   8,
  btnLg:  10,
  panel:  12,
  pill:   999,
} as const;

// ── Typography sizes (px / dp) ───────────────────────────────────────────────

// Font sizes — tightened ~25% for RC Plus (still large enough to read at arm's length).
export const fontSize = {
  heroNumeric: 36,   // HUD speed / alt
  sectionHero: 40,   // "98%" battery
  pageTitle:   22,
  cardTitle:   15,
  body:        13,
  caption:     11,
  monoMicro:   9,
} as const;

// ── Letter-spacing for labels ────────────────────────────────────────────────

export const letterSpacing = {
  label:    0.16,   // uppercase caption labels (em)
  labelWide: 0.22,
} as const;

// ── Font families ────────────────────────────────────────────────────────────

export const fontFamily = {
  ui:   'Roboto',
  mono: 'RobotoMono-Regular',
} as const;

// ── Hairline width ───────────────────────────────────────────────────────────

export const hairline = 1 as const;

// ── Hit targets ──────────────────────────────────────────────────────────────

// Hit targets — still finger-friendly on RC Plus (Material min is 48dp; we drop to
// 40 for primary buttons since the RC Plus screen is small and most taps land cleanly).
export const hitTarget = {
  btn:      40,
  iconBtn:  36,
  slider:   14,
} as const;
