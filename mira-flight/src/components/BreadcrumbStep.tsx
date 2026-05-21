/**
 * BreadcrumbStep + BreadcrumbConnector
 *
 * Used at the top of Builder and Preflight screens to show workflow progress.
 *
 * BreadcrumbStep states:
 *   'done'   — green filled circle with check icon
 *   'active' — cyan ring with label highlighted
 *   'next'   — muted circle, dimmed label
 *
 * BreadcrumbConnector:
 *   Horizontal line between steps; turns green when the left step is done.
 *
 * Usage:
 *   <View style={{ flexDirection: 'row', alignItems: 'center' }}>
 *     <BreadcrumbStep state="done"   label="Plan"     index={1} />
 *     <BreadcrumbConnector done />
 *     <BreadcrumbStep state="active" label="Preflight" index={2} />
 *     <BreadcrumbConnector />
 *     <BreadcrumbStep state="next"   label="Fly"      index={3} />
 *   </View>
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { T, radius, spacing, fontFamily, hairline } from '../theme/tokens';

// ── Types ────────────────────────────────────────────────────────────────────

export type BreadcrumbState = 'done' | 'active' | 'next';

export interface BreadcrumbStepProps {
  state: BreadcrumbState;
  label: string;
  /** 1-based step number shown inside the circle for 'next' steps. */
  index: number;
  style?: ViewStyle;
}

export interface BreadcrumbConnectorProps {
  /** If true, renders the connector as green (left step is done). */
  done?: boolean;
  style?: ViewStyle;
}

// ── BreadcrumbStep ───────────────────────────────────────────────────────────

export function BreadcrumbStep({
  state,
  label,
  index,
  style,
}: BreadcrumbStepProps): React.ReactElement {
  const isDone   = state === 'done';
  const isActive = state === 'active';

  const circleStyle: ViewStyle[] = [
    styles.circle,
    isDone   ? styles.circleDone   : null,
    isActive ? styles.circleActive : null,
    state === 'next' ? styles.circleNext : null,
  ].filter(Boolean) as ViewStyle[];

  const labelColor = isDone
    ? T.green
    : isActive
    ? T.cyan
    : T.t3;

  return (
    <View
      style={[styles.step, style]}
      accessibilityRole="text"
      accessibilityLabel={`Step ${index}: ${label}, ${state}`}
    >
      <View style={circleStyle}>
        {isDone ? (
          // Check mark character — no icon library needed
          <Text style={styles.checkMark}>✓</Text>
        ) : (
          <Text
            style={[
              styles.indexText,
              isActive ? styles.indexTextActive : styles.indexTextNext,
            ]}
          >
            {index}
          </Text>
        )}
      </View>

      <Text
        style={[styles.label, { color: labelColor }]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

// ── BreadcrumbConnector ──────────────────────────────────────────────────────

export function BreadcrumbConnector({
  done = false,
  style,
}: BreadcrumbConnectorProps): React.ReactElement {
  return (
    <View
      style={[
        styles.connector,
        { backgroundColor: done ? T.green : T.hairline },
        style,
      ]}
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const CIRCLE_SIZE = 28;

const styles = StyleSheet.create({
  step: {
    alignItems: 'center',
    minWidth: 64,
  },
  circle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  circleDone: {
    backgroundColor: T.green,
  },
  circleActive: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: T.cyan,
  },
  circleNext: {
    backgroundColor: 'transparent',
    borderWidth: hairline,
    borderColor: T.hairline,
  },
  checkMark: {
    color: T.bg,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 16,
  },
  indexText: {
    fontFamily: fontFamily.ui,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 14,
  },
  indexTextActive: {
    color: T.cyan,
  },
  indexTextNext: {
    color: T.t3,
  },
  label: {
    fontFamily: fontFamily.ui,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  connector: {
    flex: 1,
    height: hairline,
    marginBottom: 18, // vertically center with circle mid-point
    marginHorizontal: 4,
    minWidth: 16,
  },
});
