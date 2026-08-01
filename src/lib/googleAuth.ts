// googleAuth.ts — Google Sign-In → Firebase, with anonymous-guest linking.
import {
  GoogleAuthProvider,
  signInWithCredential,
  linkWithCredential,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';
import { Platform } from 'react-native';

// The Google Sign-In native module is lazy-required so a build that doesn't
// include it (e.g. an older dev client) won't crash at startup — Google sign-in
// is simply unavailable until the app is rebuilt with the module.
/* eslint-disable @typescript-eslint/no-explicit-any */
let GS: any = null;
let isSuccess: ((r: any) => boolean) | null = null;
let isErrWithCode: ((e: any) => boolean) | null = null;
let codes: any = null;
if (Platform.OS !== 'web') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const m = require('@react-native-google-signin/google-signin');
    GS = m.GoogleSignin;
    isSuccess = m.isSuccessResponse;
    isErrWithCode = m.isErrorWithCode;
    codes = m.statusCodes;
  } catch {
    // native module not present in this binary
  }
}

const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

let _configured = false;
export function configureGoogle(): void {
  if (_configured || !WEB_CLIENT_ID || !GS) return;
  // iOS needs an iosClientId / GoogleService-Info.plist to configure Google
  // Sign-In; without it the native module hard-fails at startup. This app
  // ships Android-only, so skip Google config on iOS entirely (the button
  // hides itself via isGoogleAvailable()).
  if (Platform.OS === 'ios') return;
  try {
    GS.configure({ webClientId: WEB_CLIENT_ID });
    _configured = true;
  } catch {
    // don't let an unconfigurable Google Sign-In crash app startup
  }
}

/** True only when both a web client id and the native module are present. */
export function isGoogleAvailable(): boolean {
  // The native package exposes a web stub that only logs "not implemented".
  // Hiding the unusable button is better than offering a guaranteed failure.
  return Platform.OS !== 'web' && !!WEB_CLIENT_ID && !!GS;
}

export async function signInWithGoogle(): Promise<{ ok: boolean; linked?: boolean; error?: string }> {
  if (!WEB_CLIENT_ID || !GS) return { ok: false, error: 'google_not_configured' };
  configureGoogle();
  try {
    await GS.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GS.signIn();
    if (isSuccess && !isSuccess(response)) return { ok: false, error: 'cancelled' };
    const idToken = response?.data?.idToken;
    if (!idToken) return { ok: false, error: 'no_id_token' };

    const credential = GoogleAuthProvider.credential(idToken);
    const current = auth.currentUser;

    // Upgrade an anonymous guest in place — keep the same uid (and all data).
    if (current && current.isAnonymous) {
      try {
        const { user } = await linkWithCredential(current, credential);
        await setDoc(doc(db, 'users', user.uid), { email: user.email, lastActiveAt: serverTimestamp() }, { merge: true });
        return { ok: true, linked: true };
      } catch (e: any) {
        // This Google account already has its own profile → sign in to it.
        if (e?.code === 'auth/credential-already-in-use') {
          await signInWithCredential(auth, credential);
          return { ok: true, linked: false };
        }
        throw e;
      }
    }

    await signInWithCredential(auth, credential);
    return { ok: true, linked: false };
  } catch (e: any) {
    if (isErrWithCode && codes && isErrWithCode(e) && e.code === codes.SIGN_IN_CANCELLED) {
      return { ok: false, error: 'cancelled' };
    }
    return { ok: false, error: describeGoogleError(e) };
  }
}

// Build a diagnostic string that survives a tester's screenshot: the raw code
// plus what that code actually means. DEVELOPER_ERROR (status 10) in a Play
// build almost always means the GCP project lacks an Android OAuth client for
// com.thirties.social + the Play App Signing SHA-1 — not a client-side bug.
function describeGoogleError(e: any): string {
  const code = e?.code ?? '';
  const msg = e?.message ?? '';
  const hints: Record<string, string> = {
    DEVELOPER_ERROR: 'OAuth Android client/SHA-1 設定不符',
    '10': 'OAuth Android client/SHA-1 設定不符',
    PLAY_SERVICES_NOT_AVAILABLE: '這台裝置缺少 Google Play 服務',
    SIGN_IN_REQUIRED: '需要先登入 Google 帳號',
    IN_PROGRESS: '上一個登入還在進行中',
    NETWORK_ERROR: '網路問題，請重試',
  };
  const hint = hints[String(code)] ?? (msg.includes('DEVELOPER_ERROR') ? hints.DEVELOPER_ERROR : '');
  const parts = [`code=${code || '?'}`, msg && msg !== String(code) ? msg : '', hint].filter(Boolean);
  return parts.join(' · ') || 'google_signin_failed';
}
