// ============================================================
// Haptic feedback helpers — silent no-ops on unsupported platforms
// ============================================================
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const supported = Platform.OS === 'ios' || Platform.OS === 'android';

export function hapticLight() {
  if (supported) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

export function hapticMedium() {
  if (supported) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
}

export function hapticSuccess() {
  if (supported) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

export function hapticWarning() {
  if (supported) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
}
