/**
 * TelemTape — single telemetry row for the HUD left rail.
 *
 * Displays an icon, a label, a value+unit, and an optional sub-label.
 * The `health` prop drives the icon/value color (ok=green, warn=amber, crit=red).
 * The `big` prop bumps font size to the hero 48 dp for altitude / ground-speed.
 *
 * Props:
 *   iconColor  — override icon color (defaults to healthColor)
 *   label      — uppercase string, e.g. "ALT"
 *   value      — numeric string without unit, e.g. "42.3"
 *   unit       — unit string, e.g. "m"
 *   subLabel   — optional line below value, e.g. "AGL"
 *   health     — 'ok' | 'warn' | 'crit' (drives color; default 'ok')
 *   big        — if true, value is rendered at 48 dp hero size
 *   style      — optional ViewStyle override for the container
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import {
  T,
  HEALTH_COLOR,
  HealthLevel,
  spacing,
  fontFamily,
  hairline,
} from '../theme/tokens';

export interface TelemTapeProps {
  icon: React.ReactNode;
  iconColor?: string;
  label: string;
  value: string;
  unit: string;
  subLabel?: string;
  health?: HealthLevel;
  big?: boolean;
  style?: ViewStyle;
}

export function TelemTape({
  icon,
  iconColor,
  label,
  value,
  unit,
  subLabel,
  health = 'ok',
  big = false,
  style,
}: TelemTapeProps): React.ReactElement {
  const accentColor = iconColor ?? HEALTH_COLOR[health];

  return (
    <View
      style={[styles.row, big && styles.rowBig, style]}
      accessibilityRole="text"
      accessibilityLabel={`${label} ${value} ${unit}${subLabel ? ' ' + subLabel : ''}`}
    >
      {/* Icon column */}
      <View style={styles.iconCol}>
        <Text style={[styles.iconText, { color: accentColor }, big && styles.iconTextBig]}>
          {icon}
        </Text>
      </View>

      {/* Text block */}
      <View style={styles.textBlock}>
        {/* Label row */}
        <Text style={styles.label}>{label}</Text>

        {/* Value + unit */}
        <View style={styles.valueRow}>
          <Text
            style={[
              styles.value,
              big ? styles.valueBig : styles.valueMd,
              { color: accentColor },
            ]}
            numberOfLines={1}
          >
            {value}
          </Text>
          <Text style={[styles.unit, big && styles.unitBig]}>{unit}</Text>
        </View>

        {/* Sub-label */}
        {subLabel !== undefined && (
          <Text style={styles.subLabel}>{subLabel}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: hairline,
    borderBottomColor: T.hairline,
  },
  rowBig: {
    minHeight: 80,
    paddingVertical: spacing.md,
  },
  iconCol: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  iconText: {
    fontSize: 18,
    lineHeight: 20,
  },
  iconTextBig: {
    fontSize: 22,
    lineHeight: 24,
  },
  textBlock: {
    flex: 1,
  },
  label: {
    fontFamily: fontFamily.ui,
    fontSize: 10,
    fontWeight: '700',
    color: T.t3,
    textTransform: 'uppercase',
    letterSpacing: 1.6,
    marginBottom: 1,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  value: {
    fontFamily: fontFamily.mono,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.1,
    fontWeight: '700',
  },
  valueMd: {
    fontSize: 22,
    lineHeight: 26,
  },
  valueBig: {
    fontSize: 48,
    lineHeight: 52,
  },
  unit: {
    fontFamily: fontFamily.ui,
    fontSize: 13,
    fontWeight: '500',
    color: T.t2,
    marginLeft: 3,
  },
  unitBig: {
    fontSize: 18,
    marginLeft: 5,
  },
  subLabel: {
    fontFamily: fontFamily.ui,
    fontSize: 10,
    color: T.t3,
    textTransform: 'uppercase',
    letterSpacing: 1.4,
    marginTop: 1,
  },
});
