import { useEffect, useState } from 'react';
import { AccessibilityInfo, Easing, Platform } from 'react-native';

/** React Native Web has no native animation module; use the JS driver there. */
export const USE_NATIVE_DRIVER = Platform.OS !== 'web';

/** Shared timing language for calm, consistent motion across the product. */
export const MOTION = {
  quick: 160,
  standard: 280,
  reveal: 420,
  breathe: 1800,
  easeOut: Easing.out(Easing.cubic),
  easeInOut: Easing.inOut(Easing.sin),
} as const;

/** Live system Reduce Motion preference, shared by all motion primitives. */
export function useReduceMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then(value => { if (mounted) setReduceMotion(value); })
      .catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      mounted = false;
      subscription?.remove();
    };
  }, []);

  return reduceMotion;
}
