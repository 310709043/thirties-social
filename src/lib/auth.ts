// auth.ts — Email/password authentication
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  linkWithCredential,
  EmailAuthProvider,
  type User,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';

export interface AuthUser {
  uid: string;
  email: string | null;
}

/** True when the current session is an anonymous guest (no recoverable account). */
export function isGuest(): boolean {
  return auth.currentUser?.isAnonymous ?? false;
}

// ── Register ────────────────────────────────────────────
export async function register(email: string, password: string): Promise<{
  ok: boolean; user?: AuthUser; linked?: boolean; error?: string;
}> {
  try {
    const current = auth.currentUser;

    // Upgrade an anonymous guest in place: link the email credential so the
    // SAME uid (and therefore all wicks, vigil and history) is preserved.
    if (current && current.isAnonymous) {
      const credential = EmailAuthProvider.credential(email, password);
      const { user } = await linkWithCredential(current, credential);
      // Keep the existing guest document — only attach the email.
      await setDoc(doc(db, 'users', user.uid), {
        email: user.email,
        lastActiveAt: serverTimestamp(),
      }, { merge: true });
      return { ok: true, user: { uid: user.uid, email: user.email }, linked: true };
    }

    // Brand-new account.
    const { user } = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, 'users', user.uid), {
      email: user.email,
      deviceId: null,
      seed: null,
      lang: 'zh',
      direction: 'light',
      wicks: 3,
      vigil: false,
      setupDone: false,
      isBanned: false,
      banReason: null,
      blockedUsers: [],
      gender: null,
      ageBracket: null,
      relationshipStatus: null,
      seeking: [],
      boundary: null,
      region: null,
      quote: null,
      loftVisible: true,
      nightColorIdx: 0,
      nightAdjIdx: 0,
      autoFilter: true,
      slowMode: false,
      freeMatchesUsed: 0,
      createdAt: serverTimestamp(),
      lastActiveAt: serverTimestamp(),
    });

    return { ok: true, user: { uid: user.uid, email: user.email }, linked: false };
  } catch (e: any) {
    const code = e?.code ?? '';
    if (code === 'auth/email-already-in-use' || code === 'auth/credential-already-in-use') {
      return { ok: false, error: '此 Email 已被註冊' };
    }
    if (code === 'auth/weak-password') {
      return { ok: false, error: '密碼太弱，至少 6 個字元' };
    }
    if (code === 'auth/invalid-email') {
      return { ok: false, error: 'Email 格式不正確' };
    }
    return { ok: false, error: e?.message ?? '註冊失敗' };
  }
}

// ── Login ───────────────────────────────────────────────
export async function login(email: string, password: string): Promise<{
  ok: boolean; user?: AuthUser; error?: string;
}> {
  try {
    const { user } = await signInWithEmailAndPassword(auth, email, password);

    // Update lastActiveAt
    await setDoc(doc(db, 'users', user.uid), {
      lastActiveAt: serverTimestamp(),
    }, { merge: true });

    return { ok: true, user: { uid: user.uid, email: user.email } };
  } catch (e: any) {
    const code = e?.code ?? '';
    if (code === 'auth/user-not-found') {
      return { ok: false, error: '找不到此帳號' };
    }
    if (code === 'auth/wrong-password') {
      return { ok: false, error: '密碼錯誤' };
    }
    if (code === 'auth/invalid-email') {
      return { ok: false, error: 'Email 格式不正確' };
    }
    if (code === 'auth/too-many-requests') {
      return { ok: false, error: '嘗試次數過多，請稍後再試' };
    }
    return { ok: false, error: e?.message ?? '登入失敗' };
  }
}

// ── Logout ──────────────────────────────────────────────
export async function logout(): Promise<void> {
  await signOut(auth);
}

// ── Reset Password ──────────────────────────────────────
export async function resetPassword(email: string): Promise<{
  ok: boolean; error?: string;
}> {
  try {
    await sendPasswordResetEmail(auth, email);
    return { ok: true };
  } catch (e: any) {
    const code = e?.code ?? '';
    if (code === 'auth/user-not-found') {
      return { ok: false, error: '找不到此帳號' };
    }
    return { ok: false, error: e?.message ?? '重設密碼失敗' };
  }
}

// ── Auth State Listener ─────────────────────────────────
export function onAuthChange(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}

// ── Get Current User ────────────────────────────────────
export function getCurrentUser(): User | null {
  return auth.currentUser;
}
