// purchases.ts — RevenueCat (react-native-purchases) wrapper.
//
// Purchases are verified by RevenueCat server-side; wicks/vigil are granted by
// the RevenueCat webhook on the backend (Admin SDK), never by this client. The
// app sees the result via its Firestore user-doc subscription.
//
// The native module is lazy-required so a binary without it (e.g. an older dev
// client) won't crash — purchases are simply unavailable until rebuilt.
import { Platform } from 'react-native';

/* eslint-disable @typescript-eslint/no-explicit-any */
let Purchases: any = null;
let LOG_LEVEL: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const m = require('react-native-purchases');
  Purchases = m.default ?? m.Purchases ?? m;
  LOG_LEVEL = m.LOG_LEVEL;
} catch {
  // native module not present in this binary
}

const RC_API_KEY = Platform.select({
  ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
  default: undefined,
});

export const IAP_PRODUCT_IDS = {
  wick10: 'com.thirties.social.wick10',
  wick30: 'com.thirties.social.wick30',
  wick100: 'com.thirties.social.wick100',
  vigil: 'com.thirties.social.vigil.monthly',
};

const VIGIL_ENTITLEMENT = 'vigil';

let _configured = false;

/**
 * Configure RevenueCat. appUserID must be the Firebase uid so the webhook's
 * event.app_user_id maps back to the correct user document. Call once auth is
 * ready.
 */
export function initPurchases(appUserId: string): boolean {
  if (_configured || !RC_API_KEY || !Purchases) return _configured;
  try {
    if (__DEV__ && LOG_LEVEL) Purchases.setLogLevel(LOG_LEVEL.WARN);
    Purchases.configure({ apiKey: RC_API_KEY, appUserID: appUserId });
    _configured = true;
    return true;
  } catch (e) {
    console.warn('[purchases] configure failed', e);
    return false;
  }
}

export function isPurchasesAvailable(): boolean {
  return !!RC_API_KEY && !!Purchases;
}

async function purchaseProductId(productId: string): Promise<{ ok: boolean; error?: string }> {
  if (!_configured || !Purchases) return { ok: false, error: 'not_configured' };
  try {
    const products = await Purchases.getProducts([productId]);
    if (!products.length) return { ok: false, error: 'product_not_found' };
    await Purchases.purchaseStoreProduct(products[0]);
    // No client-side crediting: the webhook grants wicks/vigil server-side.
    return { ok: true };
  } catch (e: any) {
    if (e?.userCancelled) return { ok: false, error: 'cancelled' };
    return { ok: false, error: e?.message ?? 'purchase_failed' };
  }
}

export function buyWickPack(productId: string): Promise<{ ok: boolean; error?: string }> {
  return purchaseProductId(productId);
}

export function buyVigilSubscription(): Promise<{ ok: boolean; error?: string }> {
  return purchaseProductId(IAP_PRODUCT_IDS.vigil);
}

export async function restorePurchases(): Promise<{ ok: boolean; restoredVigil: boolean; error?: string }> {
  if (!_configured || !Purchases) return { ok: false, restoredVigil: false, error: 'not_configured' };
  try {
    const info = await Purchases.restorePurchases();
    const restoredVigil = info?.entitlements?.active?.[VIGIL_ENTITLEMENT] != null;
    return { ok: true, restoredVigil };
  } catch (e: any) {
    return { ok: false, restoredVigil: false, error: e?.message ?? 'restore_failed' };
  }
}
