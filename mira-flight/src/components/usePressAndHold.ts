/**
 * usePressAndHold — powers hold-to-confirm for all destructive flight controls.
 *
 * Usage:
 *   const { onPressIn, onPressOut, progress, isHolding } =
 *     usePressAndHold({ durationMs: 2000, onComplete: () => handleAbort() });
 *
 * progress: 0→1 linear over durationMs, resets on early release.
 * Haptic feedback fires at press-start and on successful completion.
 * Screen-reader announces action start and completion.
 */

import { useRef, useState, useCallback } from 'react';
import {
  AccessibilityInfo,
  Vibration,
} from 'react-native';

export interface PressAndHoldOptions {
  /** How long the user must hold before onComplete fires (default: 2000 ms). */
  durationMs?: number;
  /** Called once when the hold duration is fully elapsed. */
  onComplete: () => void;
  /** Optional label announced to screen readers on completion. */
  announceComplete?: string;
}

export interface PressAndHoldResult {
  /** Attach to the Pressable / TouchableOpacity onPressIn prop. */
  onPressIn: () => void;
  /** Attach to the Pressable / TouchableOpacity onPressOut prop. */
  onPressOut: () => void;
  /** 0–1 fill progress for the ring/bar animation. */
  progress: number;
  /** True while the user is actively holding. */
  isHolding: boolean;
}

const RAF_INTERVAL_MS = 16; // ~60 fps tick via setInterval

export function usePressAndHold({
  durationMs = 2000,
  onComplete,
  announceComplete = 'Action confirmed.',
}: PressAndHoldOptions): PressAndHoldResult {
  const [progress, setProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);

  // We use a ref for the interval so it is stable across renders.
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const completedRef = useRef<boolean>(false);

  const clearTimer = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const onPressIn = useCallback(() => {
    completedRef.current = false;
    startTimeRef.current = Date.now();
    setIsHolding(true);

    // Haptic: short pulse at press start
    Vibration.vibrate(30);

    // Announce to screen reader
    AccessibilityInfo.announceForAccessibility(
      'Hold to confirm. Keep holding.',
    );

    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const next = Math.min(elapsed / durationMs, 1);
      setProgress(next);

      if (next >= 1 && !completedRef.current) {
        completedRef.current = true;
        clearTimer();
        setIsHolding(false);

        // Haptic: success double-pulse
        Vibration.vibrate([0, 60, 40, 60]);

        // Announce completion to screen reader
        AccessibilityInfo.announceForAccessibility(announceComplete);

        onComplete();
      }
    }, RAF_INTERVAL_MS);
  }, [durationMs, onComplete, announceComplete, clearTimer]);

  const onPressOut = useCallback(() => {
    // Abort if released before completion
    if (!completedRef.current) {
      clearTimer();
      setIsHolding(false);
      setProgress(0);
    }
  }, [clearTimer]);

  return { onPressIn, onPressOut, progress, isHolding };
}
