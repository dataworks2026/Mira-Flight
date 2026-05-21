/**
 * KV — label / value definition row for sidebar metadata.
 *
 * Renders an uppercase tracked label on the left and a value on the right.
 * When `mono` is true the value uses Roboto Mono + tabular-nums.
 * When `inline` is false (default) label and value stack vertically;
 * when `inline` is true they sit in a single row (useful in dense panels).
 *
 * Props:
 *   label   — short descriptor string, rendered uppercase + tracked
 *   value   — value string
 *   mono    — if true, value uses monospaced font + tabular-nums
 *   inline  — if true, label and value share one row (default false)
 *   tone    — optional accent color key for the value; defaults to T.t1
 *   style   — optional ViewStyle for the container
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import {
  T,
  TONE_COLOR,
  ToneKey,
  spacing,
  fontFamily,
  hairline,
} from '../theme/tokens';

export interface KVProps {
  label: string;
  value: string;
  mono?: boolean;
  inline?: boolean;
  tone?: ToneKey;
  style?: ViewStyle;
  /** Hide the hairline divider below the row (useful for last item). */
  noDivider?: boolean;
}

export function KV({
  label,
  value,
  mono = false,
  inline = false,
  tone,
  style,
  noDivider = false,
}: KVProps): React.ReactElement {
  const valueColor = tone ? TONE_COLOR[tone] : T.t1;

  if (inline) {
    return (
      <View
        style={[
          styles.rowInline,
          !noDivider && styles.divider,
          style,
        ]}
        accessibilityRole="text"
        accessibilityLabel={`${label}: ${value}`}
      >
        <Text style={styles.label}>{label}</Text>
        <Text
          style={[
            styles.value,
            mono ? styles.valueMono : styles.valueUi,
            { color: valueColor },
          ]}
          numberOfLines={1}
        >
          {value}
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.rowStacked,
        !noDivider && styles.divider,
        style,
      ]}
      accessibilityRole="text"
      accessibilityLabel={`${label}: ${value}`}
    >
      <Text style={styles.label}>{label}</Text>
      <Text
        style={[
          styles.value,
          mono ? styles.valueMono : styles.valueUi,
          { color: valueColor },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  rowInline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  rowStacked: {
    flexDirection: 'column',
    paddingVertical: spacing.sm,
  },
  divider: {
    borderBottomWidth: hairline,
    borderBottomColor: T.hairline2,
  },
  label: {
    fontFamily: fontFamily.ui,
    fontSize: 10,
    fontWeight: '700',
    color: T.t3,
    textTransform: 'uppercase',
    letterSpacing: 1.6,
    marginBottom: 2,
  },
  value: {
    fontSize: 13,
    fontWeight: '500',
  },
  valueUi: {
    fontFamily: fontFamily.ui,
  },
  valueMono: {
    fontFamily: fontFamily.mono,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.1,
  },
});
