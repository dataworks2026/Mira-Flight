import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import {miraLog} from '../store/logStore';
import {useDroneStore} from '../store/droneStore';
import {T, spacing, radius, fontSize, fontFamily, hitTarget} from '../theme/tokens';

// ── Safe numeric formatter ───────────────────────────────────────────────────
// NaN / Infinity / null / undefined all render as "—" instead of crashing.
export function safeFmt(val: number | null | undefined, decimals = 1): string {
  if (val == null || !isFinite(val)) {
    return '—'; // em dash
  }
  return val.toFixed(decimals);
}

// ── Root ErrorBoundary ───────────────────────────────────────────────────────
// Wraps the entire app. On any render throw, shows a minimal fallback with
// last-known telem and RTH / LAND / E-STOP log buttons so the operator can
// act while retrying. One component crash will NOT white-screen the app.

interface RootProps {children: React.ReactNode}
interface RootState {caught: boolean; error: string}

export class RootErrorBoundary extends React.Component<RootProps, RootState> {
  state: RootState = {caught: false, error: ''};

  static getDerivedStateFromError(err: unknown): RootState {
    return {caught: true, error: err instanceof Error ? err.message : String(err)};
  }

  componentDidCatch(err: unknown, info: React.ErrorInfo) {
    const msg = err instanceof Error ? err.message : String(err);
    const stack = info.componentStack?.slice(0, 300) ?? '';
    miraLog('error', 'ROOT_ERR', `${msg} | ${stack}`);
  }

  render() {
    if (this.state.caught) {
      return (
        <RootFallback
          error={this.state.error}
          onRetry={() => this.setState({caught: false, error: ''})}
        />
      );
    }
    return this.props.children;
  }
}

function RootFallback({error, onRetry}: {error: string; onRetry: () => void}) {
  const alt = useDroneStore(s => s.alt);
  const battery = useDroneStore(s => s.battery);
  return (
    <View style={s.root}>
      <Text style={s.header}>⚠  APP ERROR — USE PHYSICAL RC</Text>
      <Text style={s.telem}>
        ALT {safeFmt(alt, 1)} m  ·  BAT {safeFmt(battery, 0)} %
      </Text>
      <View style={s.ctrlRow}>
        <TouchableOpacity
          style={[s.ctrl, {backgroundColor: T.blue}]}
          onPress={() => miraLog('warn', 'EMERGENCY', 'RTH tapped from root error boundary')}>
          <Text style={s.ctrlTxt}>RTH</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.ctrl, {backgroundColor: T.amber}]}
          onPress={() => miraLog('warn', 'EMERGENCY', 'LAND tapped from root error boundary')}>
          <Text style={s.ctrlTxt}>LAND</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.ctrl, {backgroundColor: T.red}]}
          onPress={() => miraLog('warn', 'EMERGENCY', 'E-STOP tapped from root error boundary')}>
          <Text style={s.ctrlTxt}>E-STOP</Text>
        </TouchableOpacity>
      </View>
      <Text style={s.errorMsg} numberOfLines={4}>{error}</Text>
      <TouchableOpacity style={s.retryBtn} onPress={onRetry}>
        <Text style={s.retryTxt}>RETRY</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Per-HUD-region ErrorBoundary ─────────────────────────────────────────────
// Wrap individual HUD panels (telem rail, map, mission info) so that one
// region crashing doesn't take down the flight-control cluster or other panels.

interface RegionProps {tag: string; children: React.ReactNode}
interface RegionState {caught: boolean}

export class HudRegionBoundary extends React.Component<RegionProps, RegionState> {
  state: RegionState = {caught: false};

  static getDerivedStateFromError(): RegionState {
    return {caught: true};
  }

  componentDidCatch(err: unknown, _info: React.ErrorInfo) {
    miraLog('error', `REGION/${this.props.tag}`, err instanceof Error ? err.message : String(err));
  }

  render() {
    if (this.state.caught) {
      return (
        <View style={r.fallback}>
          <Text style={r.text}>{this.props.tag} ERROR</Text>
          <TouchableOpacity onPress={() => this.setState({caught: false})}>
            <Text style={r.retry}>tap to retry</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

// ── Global JS error handler ──────────────────────────────────────────────────
// Call once at app startup. Non-fatal errors are swallowed + logged so they
// don't interrupt a flight. Fatal errors are forwarded to the previous handler
// (which shows the red overlay in dev, or calls the native crash handler).

export function installGlobalErrorHandler(): void {
  const prev = ErrorUtils.getGlobalHandler();
  ErrorUtils.setGlobalHandler((err, isFatal) => {
    miraLog('error', 'JS_GLOBAL', `fatal=${isFatal ?? false} ${err?.message ?? String(err)}`);
    if (isFatal) {
      prev?.(err, isFatal);
    }
    // non-fatal: swallowed — keep flying
  });
}

// ── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: T.bg,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  header: {
    fontSize: fontSize.body,
    fontWeight: '700',
    color: T.red,
    fontFamily: fontFamily.ui,
    marginBottom: spacing.md,
    textAlign: 'center',
    letterSpacing: 0.1,
  },
  telem: {
    fontSize: fontSize.caption,
    color: T.t2,
    fontFamily: fontFamily.mono,
    marginBottom: spacing.lg,
  },
  ctrlRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  ctrl: {
    height: hitTarget.btn,
    paddingHorizontal: 24,
    borderRadius: radius.btn,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ctrlTxt: {
    fontSize: fontSize.body,
    fontWeight: '700',
    color: T.t1,
    fontFamily: fontFamily.ui,
  },
  errorMsg: {
    fontSize: 11,
    color: T.t3,
    fontFamily: fontFamily.ui,
    textAlign: 'center',
    marginBottom: spacing.lg,
    maxWidth: 400,
  },
  retryBtn: {
    height: hitTarget.btn,
    paddingHorizontal: 32,
    backgroundColor: T.panel,
    borderRadius: radius.btn,
    borderWidth: 1,
    borderColor: T.hairline,
    justifyContent: 'center',
    alignItems: 'center',
  },
  retryTxt: {
    fontSize: fontSize.body,
    fontWeight: '700',
    color: T.t1,
    fontFamily: fontFamily.ui,
  },
});

const r = StyleSheet.create({
  fallback: {
    flex: 1,
    backgroundColor: T.panelHi,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  text: {
    fontSize: 11,
    color: T.amber,
    fontFamily: fontFamily.ui,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  retry: {
    fontSize: 10,
    color: T.t3,
    fontFamily: fontFamily.ui,
  },
});
