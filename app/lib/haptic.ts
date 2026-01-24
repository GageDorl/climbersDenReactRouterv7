/**
 * Haptic Feedback Utility
 * Uses the Vibration API (navigator.vibrate) to provide haptic feedback
 * Gracefully degrades on devices that don't support vibration
 */

export interface HapticPattern {
  duration: number | number[];
  delay?: number;
}

/**
 * Common haptic patterns
 */
export const HAPTIC_PATTERNS = {
  // Light tap - short, quick vibration
  tap: { duration: 50 },
  
  // Double tap - two quick pulses
  doubleTap: { duration: [50, 100, 50] },
  
  // Success - ascending pattern
  success: { duration: [30, 50, 30] },
  
  // Error - strong pulse
  error: { duration: 200 },
  
  // Light feedback - very subtle
  light: { duration: 30 },
} as const;

/**
 * Check if the device supports vibration
 */
export function supportsVibration(): boolean {
  if (typeof navigator === 'undefined') return false;
  return 'vibrate' in navigator || 'webkitVibrate' in navigator;
}

/**
 * Trigger haptic feedback if available
 */
export function triggerHaptic(pattern: HapticPattern | keyof typeof HAPTIC_PATTERNS = 'tap'): boolean {
  if (!supportsVibration()) {
    return false;
  }

  try {
    const vibrator = navigator.vibrate || (navigator as any).webkitVibrate;
    const patternConfig = typeof pattern === 'string' ? HAPTIC_PATTERNS[pattern] : pattern;
    
    if (patternConfig.duration) {
      // Use any cast to avoid DOM Vibrate typing mismatches across environments
      (navigator as any).vibrate(patternConfig.duration);
      return true;
    }
  } catch (error) {
    // Silently fail - some browsers may restrict vibration
    console.debug('[Haptic] Vibration failed:', error);
  }

  return false;
}

/**
 * Stop any ongoing vibration
 */
export function stopVibration(): void {
  if (supportsVibration()) {
    try {
      // Stop vibration
      (navigator as any).vibrate(0);
    } catch (error) {
      console.debug('[Haptic] Failed to stop vibration:', error);
    }
  }
}
