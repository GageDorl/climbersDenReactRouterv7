import { useCallback } from 'react';
import { triggerHaptic } from '~/lib/haptic';
import type { HapticPattern } from '~/lib/haptic';

const HAPTIC_ENABLED_KEY = 'user:haptic-enabled';

/**
 * Hook to manage haptic feedback preference
 * Uses localStorage for now, easily swappable with user settings API later
 */
export function useHapticFeedback() {
  const isEnabled = useCallback(() => {
    if (typeof localStorage === 'undefined') return true; // Default to enabled on server
    
    const stored = localStorage.getItem(HAPTIC_ENABLED_KEY);
    // Default to true if not set
    return stored === null ? true : stored === 'true';
  }, []);

  const setEnabled = useCallback((enabled: boolean) => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(HAPTIC_ENABLED_KEY, enabled ? 'true' : 'false');
    }
  }, []);

  const trigger = useCallback((pattern: HapticPattern | keyof typeof import('~/lib/haptic').HAPTIC_PATTERNS = 'tap') => {
    if (!isEnabled()) {
      return false;
    }
    return triggerHaptic(pattern);
  }, [isEnabled]);

  return {
    isEnabled: isEnabled(),
    setEnabled,
    trigger,
  };
}
