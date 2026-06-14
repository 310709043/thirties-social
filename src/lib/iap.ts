// ============================================================
// IAP — In-App Purchase service (react-native-iap)
// ============================================================
import { Platform } from 'react-native';
import {
  initConnection,
  endConnection,
  getProducts,
  requestPurchase,
  getAvailablePurchases,
  finishTransaction,
  purchaseUpdatedListener,
  purchaseErrorListener,
  type ProductPurchase,
  type PurchaseError,
  type Product,
} from 'react-native-iap';
import { addWicks } from './db';
import { setVigil } from '../hooks/useAppStore';

// ── Product IDs ──────────────────────────────────────────
const WICK_PRODUCTS = Platform.select({
  ios: [
    'com.thirties.social.wick10',
    'com.thirties.social.wick30',
    'com.thirties.social.wick100',
  ],
  android: [
    'com.thirties.social.wick10',
    'com.thirties.social.wick30',
    'com.thirties.social.wick100',
  ],
  default: [],
});

const VIGIL_SUB = Platform.select({
  ios: 'com.thirties.social.vigil.monthly',
  android: 'com.thirties.social.vigil.monthly',
  default: '',
});

const WICK_AMOUNTS: Record<string, number> = {
  'com.thirties.social.wick10': 10,
  'com.thirties.social.wick30': 30,
  'com.thirties.social.wick100': 100,
};

// ── State ────────────────────────────────────────────────
let _connected = false;
let _products: Product[] = [];
let _purchaseUpdateSub: { remove: () => void } | null = null;
let _purchaseErrorSub: { remove: () => void } | null = null;

// ── Init ─────────────────────────────────────────────────
export async function initIAP(): Promise<boolean> {
  if (_connected) return true;
  try {
    await initConnection();
    _connected = true;

    // Listen for purchase updates
    _purchaseUpdateSub = purchaseUpdatedListener(async (purchase: ProductPurchase) => {
      const productId = purchase.productId;

      if (WICK_AMOUNTS[productId]) {
        // Consumable wick pack
        await addWicks(WICK_AMOUNTS[productId], 'iap_purchase', purchase.transactionId ?? undefined, `IAP ${productId}`);
      } else if (productId === VIGIL_SUB) {
        // Subscription
        await setVigil(true);
      }

      // Acknowledge / finish the transaction
      await finishTransaction({ purchase, isConsumable: !!WICK_AMOUNTS[productId] });
    });

    _purchaseErrorSub = purchaseErrorListener((error: PurchaseError) => {
      console.warn('[IAP] purchase error:', error.code, error.message);
    });

    return true;
  } catch (e) {
    console.warn('[IAP] init failed:', e);
    return false;
  }
}

export function endIAP() {
  _purchaseUpdateSub?.remove();
  _purchaseErrorSub?.remove();
  _purchaseUpdateSub = null;
  _purchaseErrorSub = null;
  if (_connected) {
    endConnection();
    _connected = false;
  }
}

// ── Products ─────────────────────────────────────────────
export async function fetchProducts(): Promise<Product[]> {
  if (!_connected) await initIAP();
  try {
    _products = await getProducts({ skus: WICK_PRODUCTS });
    return _products;
  } catch (e) {
    console.warn('[IAP] fetchProducts failed:', e);
    return [];
  }
}

export function getCachedProducts(): Product[] {
  return _products;
}

// ── Purchase ─────────────────────────────────────────────
export async function buyWickPack(productId: string): Promise<{ ok: boolean; error?: string }> {
  if (!_connected) {
    const init = await initIAP();
    if (!init) return { ok: false, error: 'iap_not_available' };
  }
  try {
    await requestPurchase({ sku: productId });
    return { ok: true };
  } catch (e: any) {
    if (e?.code === 'E_USER_CANCELLED') return { ok: false, error: 'cancelled' };
    return { ok: false, error: e?.message ?? 'purchase_failed' };
  }
}

export async function buyVigilSubscription(): Promise<{ ok: boolean; error?: string }> {
  if (!VIGIL_SUB) return { ok: false, error: 'no_sub_id' };
  if (!_connected) {
    const init = await initIAP();
    if (!init) return { ok: false, error: 'iap_not_available' };
  }
  try {
    await requestPurchase({ sku: VIGIL_SUB });
    return { ok: true };
  } catch (e: any) {
    if (e?.code === 'E_USER_CANCELLED') return { ok: false, error: 'cancelled' };
    return { ok: false, error: e?.message ?? 'purchase_failed' };
  }
}

// ── Restore ──────────────────────────────────────────────
export async function restorePurchases(): Promise<{ ok: boolean; restoredVigil: boolean; error?: string }> {
  if (!_connected) {
    const init = await initIAP();
    if (!init) return { ok: false, restoredVigil: false, error: 'iap_not_available' };
  }
  try {
    const purchases = await getAvailablePurchases();
    let restoredVigil = false;
    for (const p of purchases) {
      if (p.productId === VIGIL_SUB) {
        await setVigil(true);
        restoredVigil = true;
      }
    }
    return { ok: true, restoredVigil };
  } catch (e: any) {
    return { ok: false, restoredVigil: false, error: e?.message ?? 'restore_failed' };
  }
}

// Product ID constants for UpgradeScreen
export const IAP_PRODUCT_IDS = {
  wick10: 'com.thirties.social.wick10',
  wick30: 'com.thirties.social.wick30',
  wick100: 'com.thirties.social.wick100',
  vigil: VIGIL_SUB,
} as const;
