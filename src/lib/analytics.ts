// analytics.ts — Lightweight event tracking via Firestore
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { getCurrentUid } from './db';

export type AnalyticsEvent =
  | 'app_open'
  | 'onboarding_complete'
  | 'setup_complete'
  | 'match_search'
  | 'match_found'
  | 'match_accept'
  | 'match_decline'
  | 'conversation_start'
  | 'conversation_end'
  | 'message_send'
  | 'room_enter'
  | 'room_message'
  | 'loft_enter'
  | 'loft_message'
  | 'loft_pulse'
  | 'loft_gift'
  | 'loft_veil_lift'
  | 'photo_veil_send'
  | 'wick_purchase'
  | 'vigil_subscribe'
  | 'vigil_restore'
  | 'profile_view'
  | 'settings_view'
  | 'safety_report'
  | 'safety_block'
  | 'account_delete';

interface AnalyticsParams {
  [key: string]: string | number | boolean | undefined;
}

let _enabled = true;

export function setAnalyticsEnabled(enabled: boolean) {
  _enabled = enabled;
}

export async function trackEvent(
  event: AnalyticsEvent,
  params?: AnalyticsParams,
): Promise<void> {
  if (!_enabled) return;

  try {
    // The rules require userId == auth.uid, so an event fired before auth has
    // restored can only be rejected — skip it instead of burning a write.
    const uid = getCurrentUid();
    if (!uid) return;
    await addDoc(collection(db, 'analytics'), {
      event,
      userId: uid,
      params: params ?? {},
      createdAt: serverTimestamp(),
    });
  } catch {
    // Silently fail — analytics should never break the app
  }
}

// Convenience functions for common events
export const analytics = {
  appOpen: () => trackEvent('app_open'),
  onboardingComplete: () => trackEvent('onboarding_complete'),
  setupComplete: (gender: string) => trackEvent('setup_complete', { gender }),
  matchSearch: (moodLength: number) => trackEvent('match_search', { moodLength }),
  matchFound: () => trackEvent('match_found'),
  matchAccept: () => trackEvent('match_accept'),
  matchDecline: () => trackEvent('match_decline'),
  conversationStart: (conversationId: string) => trackEvent('conversation_start', { conversationId }),
  conversationEnd: (conversationId: string, reason: string) => trackEvent('conversation_end', { conversationId, reason }),
  messageSend: (conversationId: string) => trackEvent('message_send', { conversationId }),
  roomEnter: (roomKey: string) => trackEvent('room_enter', { roomKey }),
  roomMessage: (roomKey: string) => trackEvent('room_message', { roomKey }),
  loftEnter: () => trackEvent('loft_enter'),
  loftMessage: () => trackEvent('loft_message'),
  loftPulse: () => trackEvent('loft_pulse'),
  loftGift: () => trackEvent('loft_gift'),
  loftVeilLift: (level: number) => trackEvent('loft_veil_lift', { level }),
  photoVeilSend: (conversationId: string) => trackEvent('photo_veil_send', { conversationId }),
  wickPurchase: (amount: number) => trackEvent('wick_purchase', { amount }),
  vigilSubscribe: () => trackEvent('vigil_subscribe'),
  vigilRestore: () => trackEvent('vigil_restore'),
  profileView: () => trackEvent('profile_view'),
  settingsView: () => trackEvent('settings_view'),
  safetyReport: (conversationId: string) => trackEvent('safety_report', { conversationId }),
  safetyBlock: (conversationId: string) => trackEvent('safety_block', { conversationId }),
  accountDelete: () => trackEvent('account_delete'),
};
