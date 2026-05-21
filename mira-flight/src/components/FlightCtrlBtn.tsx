/**
 * FlightCtrlBtn — card-style emergency / flight-control action button.
 *
 * Renders icon + label + optional subLabel (e.g. "HOLD 2s").
 * Color is driven by the `severity` prop (maps to design token accent).
 * Destructive actions (severity = 'red') require a 2-second hold via usePressAndHold.
 * Non-destructive actions fire immediately on press.
 *
 * Props:
 *   icon        — ReactNode rendered at the top of the card
 *   label       — primary action label, e.g. "RTH"
 *   subLabel    — secondary hint line, e.g. "HOLD 2s" (optional)
 *   severity    — ToneKey driving color: 'green' | 'amber' | 'red' | 'blue' | 'cyan' | 'slate'
 *   onPress     — callback fired on tap (non-destructive) or after hold completes (destructive)
 *   active      — true while the action is in progress (dims pulse state)
 *   disabled    — prevents all interaction
 *   requireHold — override hold requirement; defaults to true when severity === 'red'
 *   holdDuration— ms for the hold (default 2000)
 *   style       — optional ViewStyle
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ViewStyle,
  StyleProp,
} from 'react-native';
import {
  T,
  TONE_COLOR,
  ToneKey,
  radius,
  spacing,
  fontFamily,
  hairline,
  hitTarget,
} from '../theme/tokens';
import { usePressAndHold } from './usePressAndHold';

export interface FlightCtrlBtnProps {
  icon: React.ReactNode;
  label: string;
  subLabel?: string;
  severity: ToneKey;
  onPress: () => void;
  active?: boolean;
  disabled?: boolean;
  requireHold?: boolean;
  holdDuration?: number;
  style?: StyleProp<ViewStyle>;
}

export function FlightCtrlBtn({
  icon,
  label,
  subLabel,
  severity,
  onPress,
  active = false,
  disabled = false,
  requireHold,
  holdDuration = 2000,
  style,
}: FlightCtrlBtnProps): React.ReactElement {
  const accentColor = TONE_COLOR[severity];
  const isDestructive = requireHold ?? severity === 'red';

  // Hold-to-confirm wiring — always called but only used when isDestructive.
  const { onPressIn, onPressOut, progress, isHolding } = usePressAndHold({
    durationMs: holdDuration,
    onComplete: onPress,
    announceComplete: `${label} confirmed.`,
  });

  // For non-destructive buttons use a simple press.
  const handlePress = useCallback(() => {
    if (!isDestructive) {
      onPress();
    }
  }, [isDestructive, onPress]);

  const fillWidth = `${Math.round(progress * 100)}%` as const;

  // Opacity states
  const opacity = disabled ? 0.38 : active ? 0.75 : 1;

  return (
    <Pressable
      onPress={isDestructive ? undefined : handlePress}
      onPressIn={isDestructive && !disabled ? onPressIn : undefined}
      onPressOut={isDestructive && !disabled ? onPressOut : undefined}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={
        isDestructive
          ? `Hold for ${Math.round(holdDuration / 1000)} seconds to confirm ${label}`
          : label
      }
      accessibilityState={{ disabled, selected: active }}
      style={({ pressed }) => [
        styles.card,
        { borderColor: accentColor, opacity },
        pressed && !isDestructive && styles.cardPressed,
        isHolding && styles.cardHolding,
        style,
      ]}
    >
      {/* Hold-progress fill bar (slides up from bottom) */}
      {isDestructive && progress > 0 && (
        <View
          style={[
            styles.holdFill,
            { backgroundColor: accentColor + '33', height: fillWidth },
          ]}
          pointerEvents="none"
        />
      )}

      {/* Icon */}
      <View style={styles.iconWrap}>
        <Text
          style={[
            styles.iconText,
            { color: active ? accentColor : isHolding ? accentColor : T.t2 },
          ]}
        >
          {icon}
        </Text>
      </View>

      {/* Label */}
      <Text style={[styles.label, { color: accentColor }]}>{label}</Text>

      {/* Sub-label */}
      {subLabel !== undefined && (
        <Text style={styles.subLabel}>{subLabel}</Text>
      )}

      {/* Active dot indicator */}
      {active && (
        <View style={[styles.activeDot, { backgroundColor: accentColor }]} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: hitTarget.btn,
    minWidth: 72,
    borderRadius: radius.card,
    borderWidth: hairline,
    backgroundColor: T.card,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    overflow: 'hidden',
    position: 'relative',
  },
  cardPressed: {
    backgroundColor: T.cardHi,
  },
  cardHolding: {
    backgroundColor: T.cardHi,
  },
  holdFill: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    // height is set inline to progress %
  },
  iconWrap: {
    width: hitTarget.iconBtn,
    height: hitTarget.iconBtn,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 24,
    lineHeight: 28,
  },
  label: {
    fontFamily: fontFamily.ui,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  subLabel: {
    fontFamily: fontFamily.ui,
    fontSize: 10,
    fontWeight: '600',
    color: T.t3,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  activeDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
