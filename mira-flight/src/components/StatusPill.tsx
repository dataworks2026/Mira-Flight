/**
 * StatusPill — colored badge with icon + label + optional value.
 *
 * Used in the top strip of every screen and as inline status indicators.
 * Severity is expressed via tone + icon, never color alone (deuteranopia rule).
 *
 * Props:
 *   tone    — 'green' | 'amber' | 'red' | 'blue' | 'cyan' | 'slate'
 *   icon    — ReactNode (Text/Image/SVG wrapping the icon glyph)
 *   label   — short uppercase string, e.g. "LINK"
 *   value   — optional trailing value string, e.g. "98%"
 *   size    — 'sm' | 'md' (default 'md')
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { T, TONE_COLOR, ToneKey, radius, fontFamily } from '../theme/tokens';

export interface StatusPillProps {
  tone: ToneKey;
  icon: React.ReactNode;
  label: string;
  value?: string;
  size?: 'sm' | 'md';
  style?: ViewStyle;
}

export function StatusPill({
  tone,
  icon,
  label,
  value,
  size = 'md',
  style,
}: StatusPillProps): React.ReactElement {
  const accentColor = TONE_COLOR[tone];
  const isSm = size === 'sm';

  return (
    <View
      style={[
        styles.pill,
        isSm ? styles.pillSm : styles.pillMd,
        { borderColor: accentColor },
        style,
      ]}
      accessibilityRole="text"
      accessibilityLabel={value ? `${label} ${value}` : label}
    >
      {/* Icon slot */}
      <View style={[styles.iconWrap, { marginRight: isSm ? 4 : 5 }]}>
        {/* Clone the icon element with the accent color injected via a wrapper */}
        <Text style={{ color: accentColor, fontSize: isSm ? 12 : 14, lineHeight: isSm ? 14 : 16 }}>
          {icon}
        </Text>
      </View>

      {/* Label */}
      <Text
        style={[
          styles.label,
          isSm ? styles.labelSm : styles.labelMd,
          { color: accentColor },
        ]}
      >
        {label}
      </Text>

      {/* Optional value */}
      {value !== undefined && (
        <Text
          style={[
            styles.value,
            isSm ? styles.valueSm : styles.valueMd,
            { color: T.t1 },
          ]}
        >
          {value}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    backgroundColor: T.card,
  },
  pillSm: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    // min-height ~24 dp
  },
  pillMd: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    // min-height ~30 dp
  },
  iconWrap: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontFamily: fontFamily.ui,
    fontWeight: '700',
    letterSpacing: 0.16 * 10, // react-native letterSpacing is in pixels
    textTransform: 'uppercase',
  },
  labelSm: {
    fontSize: 10,
  },
  labelMd: {
    fontSize: 11,
  },
  value: {
    fontFamily: fontFamily.mono,
    fontVariant: ['tabular-nums'],
    marginLeft: 5,
  },
  valueSm: {
    fontSize: 11,
    fontWeight: '600',
  },
  valueMd: {
    fontSize: 12,
    fontWeight: '600',
  },
});
