import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Pressable,
  StyleSheet,
} from 'react-native';
import {
  T,
  TONE_COLOR,
  ToneKey,
  spacing,
  radius,
  fontSize,
  fontFamily,
  hairline,
  hitTarget,
} from '../theme/tokens';
import {usePressAndHold} from './usePressAndHold';

// ─── StatGrid ─────────────────────────────────────────────────────────────────

interface StatItem {label: string; value: string}

function StatGrid({items}: {items: StatItem[]}) {
  return (
    <View style={s.statGrid}>
      {items.map((item, i) => (
        <View key={i} style={s.statCell}>
          <Text style={s.statLabel}>{item.label}</Text>
          <Text style={s.statValue}>{item.value}</Text>
        </View>
      ))}
    </View>
  );
}

// ─── HoldConfirm ──────────────────────────────────────────────────────────────

interface HoldConfirmProps {
  tone: ToneKey;
  label: string;
  holdDuration: number;
  onComplete: () => void;
  disabled?: boolean;
}

function HoldConfirm({
  tone,
  label,
  holdDuration,
  onComplete,
  disabled = false,
}: HoldConfirmProps) {
  const color = TONE_COLOR[tone];
  const {onPressIn, onPressOut, progress, isHolding} = usePressAndHold({
    durationMs: holdDuration,
    onComplete,
    announceComplete: `${label} confirmed.`,
  });

  return (
    <Pressable
      onPressIn={disabled ? undefined : onPressIn}
      onPressOut={disabled ? undefined : onPressOut}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={`Hold for ${holdDuration / 1000} seconds to confirm`}
      style={[
        s.holdBtn,
        {borderColor: disabled ? T.t3 : color},
        disabled && s.holdBtnDisabled,
      ]}>
      {progress > 0 && (
        <View
          style={[
            s.holdFill,
            {
              width: `${Math.round(progress * 100)}%` as any,
              backgroundColor: color + '33',
            },
          ]}
          pointerEvents="none"
        />
      )}
      <Text style={[s.holdBtnLabel, {color: disabled ? T.t3 : isHolding ? color : T.t1}]}>
        {label}
      </Text>
      <Text style={[s.holdBtnHint, {color: disabled ? T.t3 : T.t3}]}>
        HOLD {holdDuration / 1000}s
      </Text>
    </Pressable>
  );
}

// ─── HudConfirmModal ──────────────────────────────────────────────────────────

interface HudConfirmModalProps {
  visible: boolean;
  tone: ToneKey;
  icon: string;
  title: string;
  kicker: string;
  children?: React.ReactNode;
  holdDuration: number;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmDisabled?: boolean;
}

function HudConfirmModal({
  visible,
  tone,
  icon,
  title,
  kicker,
  children,
  holdDuration,
  confirmLabel,
  onConfirm,
  onCancel,
  confirmDisabled = false,
}: HudConfirmModalProps) {
  const color = TONE_COLOR[tone];
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancel}>
      <View style={s.overlay}>
        <View style={s.sheet}>
          <View style={[s.stripe, {backgroundColor: color}]} />
          <View style={s.modalHeader}>
            <Text style={[s.modalIcon, {color}]}>{icon}</Text>
            <View style={s.modalTitles}>
              <Text style={s.modalTitle}>{title}</Text>
              <Text style={s.modalKicker}>{kicker}</Text>
            </View>
          </View>
          {children && <View style={s.modalBody}>{children}</View>}
          <View style={s.modalActions}>
            <TouchableOpacity
              style={s.cancelBtn}
              onPress={onCancel}
              activeOpacity={0.75}>
              <Text style={s.cancelBtnText}>CANCEL</Text>
            </TouchableOpacity>
            <View style={s.holdWrap}>
              <HoldConfirm
                tone={tone}
                label={confirmLabel}
                holdDuration={holdDuration}
                onComplete={onConfirm}
                disabled={confirmDisabled}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── ModalRTH ─────────────────────────────────────────────────────────────────

export interface ModalRTHProps {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  alt: number;
  battery: number;
  batteryVoltage: number;
  signal: number;
}

export function ModalRTH({
  visible,
  onConfirm,
  onCancel,
  alt,
  battery,
  batteryVoltage,
  signal,
}: ModalRTHProps) {
  return (
    <HudConfirmModal
      visible={visible}
      tone="blue"
      icon="⌂"
      title="Return to Home"
      kicker="Drone climbs to RTH altitude then navigates back to launch point"
      holdDuration={2000}
      confirmLabel="RETURN HOME"
      onConfirm={onConfirm}
      onCancel={onCancel}>
      <StatGrid
        items={[
          {label: 'ALTITUDE', value: `${alt.toFixed(1)} m`},
          {label: 'BATTERY', value: `${battery.toFixed(0)}%`},
          {label: 'VOLTAGE', value: `${batteryVoltage.toFixed(1)} V`},
          {label: 'SIGNAL', value: `${signal.toFixed(0)} dBm`},
        ]}
      />
    </HudConfirmModal>
  );
}

// ─── ModalLand ────────────────────────────────────────────────────────────────

export interface ModalLandProps {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  alt: number;
  vspeed: number;
  satellites: number;
  battery: number;
}

export function ModalLand({
  visible,
  onConfirm,
  onCancel,
  alt,
  vspeed,
  satellites,
  battery,
}: ModalLandProps) {
  return (
    <HudConfirmModal
      visible={visible}
      tone="amber"
      icon="▼"
      title="Land Here"
      kicker="Drone will descend to ground at current GPS position"
      holdDuration={2000}
      confirmLabel="LAND HERE"
      onConfirm={onConfirm}
      onCancel={onCancel}>
      <StatGrid
        items={[
          {label: 'ALTITUDE', value: `${alt.toFixed(1)} m`},
          {label: 'V-SPEED', value: `${vspeed >= 0 ? '+' : ''}${vspeed.toFixed(1)} m/s`},
          {label: 'GPS SAT', value: `${satellites}`},
          {label: 'BATTERY', value: `${battery.toFixed(0)}%`},
        ]}
      />
    </HudConfirmModal>
  );
}

// ─── ModalAbort ───────────────────────────────────────────────────────────────

export interface ModalAbortProps {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  alt: number;
  battery: number;
  waypointCurrent: number;
  waypointTotal: number;
  photosCount: number;
}

export function ModalAbort({
  visible,
  onConfirm,
  onCancel,
  alt,
  battery,
  waypointCurrent,
  waypointTotal,
  photosCount,
}: ModalAbortProps) {
  return (
    <HudConfirmModal
      visible={visible}
      tone="red"
      icon="✕"
      title="Abort Mission"
      kicker="Mission stops. Drone hovers at current position. Manual control required."
      holdDuration={2000}
      confirmLabel="ABORT MISSION"
      onConfirm={onConfirm}
      onCancel={onCancel}>
      <StatGrid
        items={[
          {label: 'ALTITUDE', value: `${alt.toFixed(1)} m`},
          {label: 'BATTERY', value: `${battery.toFixed(0)}%`},
          {label: 'WAYPOINT', value: `${waypointCurrent} / ${waypointTotal}`},
          {label: 'PHOTOS', value: `${photosCount}`},
        ]}
      />
    </HudConfirmModal>
  );
}

// ─── ModalEStop ───────────────────────────────────────────────────────────────

export interface ModalEStopProps {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  alt: number;
}

export function ModalEStop({visible, onConfirm, onCancel, alt}: ModalEStopProps) {
  const [acked, setAcked] = useState(false);

  useEffect(() => {
    if (!visible) {
      setAcked(false);
    }
  }, [visible]);

  return (
    <HudConfirmModal
      visible={visible}
      tone="red"
      icon="⏻"
      title="Emergency Stop"
      kicker="MOTORS CUT IMMEDIATELY — Drone will fall. Use only if drone is about to cause harm."
      holdDuration={3000}
      confirmLabel="CUT MOTORS"
      onConfirm={onConfirm}
      onCancel={onCancel}
      confirmDisabled={!acked}>
      <StatGrid items={[{label: 'ALTITUDE', value: `${alt.toFixed(1)} m`}]} />
      <TouchableOpacity
        style={s.ackRow}
        onPress={() => setAcked(a => !a)}
        activeOpacity={0.75}
        accessibilityRole="checkbox"
        accessibilityState={{checked: acked}}>
        <View style={[s.checkbox, acked && s.checkboxChecked]}>
          {acked && <Text style={s.checkmark}>✓</Text>}
        </View>
        <Text style={s.ackText}>
          I understand this will immediately cut all motors
        </Text>
      </TouchableOpacity>
    </HudConfirmModal>
  );
}

// ─── ModalManual ──────────────────────────────────────────────────────────────

export interface ModalManualProps {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ModalManual({visible, onConfirm, onCancel}: ModalManualProps) {
  return (
    <HudConfirmModal
      visible={visible}
      tone="purple"
      icon="◎"
      title="Take Manual Control"
      kicker="You will take full RC stick control of the aircraft"
      holdDuration={1000}
      confirmLabel="TAKE CONTROL"
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}

// ─── ModalAutoRTH ─────────────────────────────────────────────────────────────

export interface ModalAutoRTHProps {
  visible: boolean;
  countdownSec: number;
  onAllow: () => void;
  onCancel: () => void;
}

export function ModalAutoRTH({
  visible,
  countdownSec,
  onAllow,
  onCancel,
}: ModalAutoRTHProps) {
  const {onPressIn, onPressOut, progress} = usePressAndHold({
    durationMs: 2000,
    onComplete: onCancel,
    announceComplete: 'Auto-RTH cancelled.',
  });

  const elapsed = Math.max(0, 7 - countdownSec);
  const fillPct = `${Math.round((elapsed / 7) * 100)}%`;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onAllow}>
      <View style={s.overlay}>
        <View style={s.sheet}>
          <View style={[s.stripe, {backgroundColor: T.amber}]} />
          <View style={s.modalHeader}>
            <Text style={[s.modalIcon, {color: T.amber}]}>⌂</Text>
            <View style={s.modalTitles}>
              <Text style={s.modalTitle}>Auto-RTH Starting</Text>
              <Text style={s.modalKicker}>
                Battery critical — auto-returning in {countdownSec}s
              </Text>
            </View>
          </View>
          <View style={s.modalBody}>
            <View style={s.countdownTrack}>
              <View
                style={[s.countdownFill, {width: fillPct as any}]}
              />
            </View>
            <Text style={s.countdownLabel}>{countdownSec}s remaining</Text>
          </View>
          <View style={s.modalActions}>
            <Pressable
              onPressIn={onPressIn}
              onPressOut={onPressOut}
              style={[s.holdBtn, s.cancelRthBtn]}>
              {progress > 0 && (
                <View
                  style={[
                    s.holdFill,
                    {
                      width: `${Math.round(progress * 100)}%` as any,
                      backgroundColor: T.t3 + '33',
                    },
                  ]}
                  pointerEvents="none"
                />
              )}
              <Text style={[s.holdBtnLabel, {color: T.t2}]}>CANCEL RTH</Text>
              <Text style={[s.holdBtnHint, {color: T.t3}]}>HOLD 2s</Text>
            </Pressable>
            <TouchableOpacity
              style={s.allowRthBtn}
              onPress={onAllow}
              activeOpacity={0.75}>
              <Text style={[s.cancelBtnText, {color: T.amber}]}>ALLOW RTH</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheet: {
    width: 480,
    maxWidth: '90%',
    backgroundColor: T.panel,
    borderRadius: radius.panel,
    borderWidth: hairline,
    borderColor: T.hairline,
    overflow: 'hidden',
  },
  stripe: {
    height: 4,
    width: '100%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  modalIcon: {
    fontSize: 28,
    lineHeight: 32,
    marginTop: 2,
  },
  modalTitles: {flex: 1},
  modalTitle: {
    fontSize: fontSize.cardTitle,
    fontWeight: '700',
    color: T.t1,
    fontFamily: fontFamily.ui,
  },
  modalKicker: {
    fontSize: fontSize.caption,
    color: T.t2,
    fontFamily: fontFamily.ui,
    marginTop: 4,
    lineHeight: 18,
  },
  modalBody: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    borderTopWidth: hairline,
    borderTopColor: T.hairline,
  },
  cancelBtn: {
    height: hitTarget.btn,
    paddingHorizontal: spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: radius.btn,
    borderWidth: hairline,
    borderColor: T.hairline,
    backgroundColor: T.card,
  },
  cancelBtnText: {
    fontSize: fontSize.caption,
    color: T.t2,
    fontFamily: fontFamily.ui,
    fontWeight: '700',
    letterSpacing: 0.16,
  },
  holdWrap: {flex: 1},
  holdBtn: {
    height: hitTarget.btn,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: radius.btn,
    borderWidth: 1.5,
    backgroundColor: T.card,
    overflow: 'hidden',
    position: 'relative',
  },
  holdBtnDisabled: {opacity: 0.4},
  holdFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
  },
  holdBtnLabel: {
    fontSize: fontSize.caption,
    fontFamily: fontFamily.ui,
    fontWeight: '700',
    letterSpacing: 0.16,
  },
  holdBtnHint: {
    fontSize: 10,
    fontFamily: fontFamily.ui,
    fontWeight: '600',
    letterSpacing: 0.1,
    marginTop: 2,
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statCell: {
    width: '47%',
    backgroundColor: T.bg,
    borderRadius: radius.card,
    borderWidth: hairline,
    borderColor: T.hairline,
    padding: spacing.md,
  },
  statLabel: {
    fontSize: 10,
    color: T.t3,
    fontFamily: fontFamily.ui,
    fontWeight: '600',
    letterSpacing: 0.14,
  },
  statValue: {
    fontSize: fontSize.body,
    color: T.t1,
    fontFamily: fontFamily.mono,
    fontWeight: '700',
    marginTop: 2,
  },
  ackRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: radius.chip,
    borderWidth: 1.5,
    borderColor: T.t3,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: T.bg,
    flexShrink: 0,
  },
  checkboxChecked: {
    borderColor: T.red,
    backgroundColor: T.red + '22',
  },
  checkmark: {
    fontSize: 12,
    color: T.red,
    fontWeight: '700',
  },
  ackText: {
    flex: 1,
    fontSize: fontSize.caption,
    color: T.t2,
    fontFamily: fontFamily.ui,
    lineHeight: 18,
  },
  countdownTrack: {
    height: 8,
    backgroundColor: T.bg,
    borderRadius: radius.chip,
    overflow: 'hidden',
  },
  countdownFill: {
    height: 8,
    backgroundColor: T.amber,
    borderRadius: radius.chip,
  },
  countdownLabel: {
    textAlign: 'right',
    marginTop: spacing.xs,
    fontSize: fontSize.caption,
    color: T.amber,
    fontFamily: fontFamily.mono,
    fontWeight: '700',
  },
  cancelRthBtn: {
    flex: 1,
    borderColor: T.t3,
  },
  allowRthBtn: {
    height: hitTarget.btn,
    paddingHorizontal: spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: radius.btn,
    borderWidth: hairline,
    borderColor: T.amber + '55',
    backgroundColor: T.amber + '22',
  },
});
