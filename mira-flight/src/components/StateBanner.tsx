/**
 * StateBanner — full-width HUD alt-state overlay banner.
 *
 * Used for RTH, LAND, failsafe, and other mission-state interruptions.
 * Renders tone-colored background strip with icon, title, sub-text,
 * optional countdown timer, and optional action button.
 *
 * Props:
 *   tone       — ToneKey driving background tint and accent
 *   icon       — ReactNode (icon glyph)
 *   title      — primary state label, e.g. "AUTO-RTH ENGAGED"
 *   sub        — secondary descriptor, e.g. "Battery ≤ 25%. Returning home."
 *   countdown  — optional number (seconds remaining); renders "00:07" style
 *   action     — optional { label: string; onPress: () => void } for inline CTA
 *   style      — optional ViewStyle
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  Animated,
} from 'react-native';
import {
  T,
  TONE_COLOR,
  ToneKey,
  spacing,
  radius,
  fontFamily,
  hairline,
} from '../theme/tokens';

export interface StateBannerAction {
  label: string;
  onPress: () => void;
}

export interface StateBannerProps {
  tone: ToneKey;
  icon: React.ReactNode;
  title: string;
  sub?: string;
  /** Seconds remaining for countdown display (counts down in component). */
  countdown?: number;
  action?: StateBannerAction;
  style?: ViewStyle;
}

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function StateBanner({
  tone,
  icon,
  title,
  sub,
  countdown,
  action,
  style,
}: StateBannerProps): React.ReactElement {
  const accentColor = TONE_COLOR[tone];

  // Local countdown tick — starts from the provided value.
  const [remaining, setRemaining] = useState<number>(countdown ?? 0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (countdown === undefined) {
      return;
    }
    setRemaining(countdown);
    timerRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          if (timerRef.current !== null) {
            clearInterval(timerRef.current);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current !== null) {
        clearInterval(timerRef.current);
      }
    };
  }, [countdown]);

  // Pulse animation for the left accent strip.
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.4,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 750,
          useNativeDriver: true,
        }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [pulse]);

  return (
    <View
      style={[styles.banner, { borderColor: accentColor }, style]}
      accessibilityRole="alert"
      accessibilityLabel={
        `${title}${sub ? '. ' + sub : ''}${countdown !== undefined ? '. ' + formatCountdown(remaining) + ' remaining.' : ''}`
      }
    >
      {/* Left accent pulse strip */}
      <Animated.View
        style={[styles.accentStrip, { backgroundColor: accentColor, opacity: pulse }]}
        pointerEvents="none"
      />

      {/* Icon */}
      <View style={styles.iconWrap}>
        <Text style={[styles.iconText, { color: accentColor }]}>{icon}</Text>
      </View>

      {/* Text block */}
      <View style={styles.textBlock}>
        <Text style={[styles.title, { color: accentColor }]} numberOfLines={1}>
          {title}
        </Text>
        {sub !== undefined && (
          <Text style={styles.sub} numberOfLines={2}>
            {sub}
          </Text>
        )}
      </View>

      {/* Countdown */}
      {countdown !== undefined && (
        <Text
          style={[styles.countdown, { color: accentColor }]}
          accessibilityLabel={`${formatCountdown(remaining)} remaining`}
        >
          {formatCountdown(remaining)}
        </Text>
      )}

      {/* Action button */}
      {action !== undefined && (
        <TouchableOpacity
          style={[styles.actionBtn, { borderColor: accentColor }]}
          onPress={action.onPress}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel={action.label}
        >
          <Text style={[styles.actionLabel, { color: accentColor }]}>
            {action.label}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.panelHi,
    borderWidth: hairline,
    borderRadius: radius.card,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
    overflow: 'hidden',
  },
  accentStrip: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  iconWrap: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.xs,
  },
  iconText: {
    fontSize: 22,
    lineHeight: 24,
  },
  textBlock: {
    flex: 1,
  },
  title: {
    fontFamily: fontFamily.ui,
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sub: {
    fontFamily: fontFamily.ui,
    fontSize: 12,
    color: T.t2,
    marginTop: 2,
    lineHeight: 16,
  },
  countdown: {
    fontFamily: fontFamily.mono,
    fontSize: 22,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.2,
    minWidth: 52,
    textAlign: 'right',
  },
  actionBtn: {
    borderWidth: hairline,
    borderRadius: radius.btn,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontFamily: fontFamily.ui,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
});
