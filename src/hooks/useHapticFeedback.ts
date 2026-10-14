import { useCallback } from 'react';

/**
 * Custom hook for progressive Web Vibration API (Haptic Feedback)
 * Safe across all browsers, desktops, and mobile devices.
 */
export const useHapticFeedback = () => {
  const triggerHaptic = useCallback((pattern: number | number[]) => {
    try {
      if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
        // Check if user prefers reduced motion
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (!prefersReducedMotion) {
          navigator.vibrate(pattern);
        }
      }
    } catch {
      // Ignore any vibration errors silently
    }
  }, []);

  return {
    light: useCallback(() => triggerHaptic(6), [triggerHaptic]),
    medium: useCallback(() => triggerHaptic(12), [triggerHaptic]),
    success: useCallback(() => triggerHaptic([8, 30, 10]), [triggerHaptic]),
    error: useCallback(() => triggerHaptic([15, 40, 15]), [triggerHaptic]),
  };
};
