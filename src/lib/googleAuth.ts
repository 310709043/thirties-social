// googleAuth.ts — Google Sign-In → Firebase, with anonymous-guest linking.
import {
  GoogleSignin,
  isSuccessResponse,
  isErrorWithCode,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import {
  GoogleAuthProvider,
  signInWithCredential,
  linkWithCredential,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';

const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

let _configured = false;
export function configureGoogle(): void {
  if (_configured || !WEB_CLIENT_ID) return;
  GoogleSignin.configure({ webClientId: WEB_CLIENT_ID });
  _configured = true;
}

export function isGoogleAvailable(): boolean {
  return !!WEB_CLIENT_ID;
}

export async function signInWithGoogle(): Promise<{ ok: boolean; linked?: boolean; error?: string }> {
  if (!WEB_CLIENT_ID) return { ok: false, error: 'google_not_configured' };
  configureGoogle();
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();
    if (!isSuccessResponse(response)) return { ok: false, error: 'cancelled' };
    const idToken = response.data.idToken;
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
    if (isErrorWithCode(e) && e.code === statusCodes.SIGN_IN_CANCELLED) {
      return { ok: false, error: 'cancelled' };
    }
    return { ok: false, error: e?.message ?? 'google_signin_failed' };
  }
}
