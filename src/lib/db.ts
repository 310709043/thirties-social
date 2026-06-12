// ============================================================
// Database helpers — Firestore
// ============================================================
import {
  doc, getDoc, setDoc, updateDoc, addDoc, deleteDoc,
  collection, query, where, orderBy, limit,
  onSnapshot, runTransaction, serverTimestamp,
  Timestamp, getDocs, increment,
} from 'firebase/firestore';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { auth, db } from './firebase';

// ── Auth ──────────────────────────────────────────────────
export function ensureAnonAuth(): Promise<string> {
  return new Promise((resolve, reject) => {
    const unsub = onAuthStateChanged(auth, async user => {
      unsub();
      if (user) { resolve(user.uid); return; }
      try {
        const { user: newUser } = await signInAnonymously(auth);
        resolve(newUser.uid);
      } catch (e) {
        reject(e);
      }
    });
  });
}

export function getCurrentUid(): string | null {
  return auth.currentUser?.uid ?? null;
}

// ── User ──────────────────────────────────────────────────
export interface DbUser {
  id: string;
  deviceId: string;
  seed: string;
  lang: string;
  direction: string;
  wicks: number;
  vigil: boolean;
  setupDone: boolean;
  isBanned: boolean;
  banReason: string | null;
  gender: string | null;
  ageBracket: string | null;
  relationshipStatus: string | null;
  seeking: string[];
  boundary: string | null;
  region: string | null;
  quote: string | null;
  loftVisible: boolean;
  nightColorIdx: number;
  nightAdjIdx: number;
  createdAt: any;
  lastActiveAt: any;
}

export async function upsertUser(params: {
  userId: string;
  deviceId: string;
  seed: string;
  lang: string;
  direction: string;
}): Promise<DbUser | null> {
  const ref = doc(db, 'users', params.userId);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    // First time — create
    const data = {
      deviceId: params.deviceId,
      seed: params.seed,
      lang: params.lang,
      direction: params.direction,
      wicks: 3,
      vigil: false,
      setupDone: false,
      isBanned: false,
      banReason: null,
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
      createdAt: serverTimestamp(),
      lastActiveAt: serverTimestamp(),
    };
    await setDoc(ref, data);
    return { id: params.userId, ...data } as DbUser;
  }

  // Update seed and lastActiveAt daily
  await updateDoc(ref, { seed: params.seed, lastActiveAt: serverTimestamp() });
  return { id: params.userId, ...snap.data() } as DbUser;
}

export async function getUser(userId: string): Promise<DbUser | null> {
  const snap = await getDoc(doc(db, 'users', userId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as DbUser;
}

export async function updateUser(patch: Partial<DbUser>): Promise<void> {
  const uid = getCurrentUid();
  if (!uid) return;
  const { id, ...rest } = patch as any;
  await updateDoc(doc(db, 'users', uid), { ...rest, lastActiveAt: serverTimestamp() });
}

export function subscribeToUser(userId: string, onChange: (u: DbUser) => void) {
  return onSnapshot(doc(db, 'users', userId), snap => {
    if (snap.exists()) onChange({ id: snap.id, ...snap.data() } as DbUser);
  });
}

// ── Wicks (atomic transactions) ───────────────────────────
export async function spendWicks(
  amount: number,
  type: string,
  reference?: string,
  note?: string,
): Promise<{ ok: boolean; balance?: number; error?: string }> {
  const uid = getCurrentUid();
  if (!uid) return { ok: false, error: 'not_authenticated' };

  try {
    let newBalance = 0;
    await runTransaction(db, async tx => {
      const userRef = doc(db, 'users', uid);
      const snap = await tx.get(userRef);
      if (!snap.exists()) throw new Error('user_not_found');
      const current = snap.data().wicks as number;
      if (current < amount) throw new Error('insufficient_wicks');
      newBalance = current - amount;
      tx.update(userRef, { wicks: newBalance, lastActiveAt: serverTimestamp() });
      tx.set(doc(collection(db, 'wicksTransactions')), {
        userId: uid,
        amount: -amount,
        balanceAfter: newBalance,
        type,
        referenceId: reference ?? null,
        note: note ?? null,
        createdAt: serverTimestamp(),
      });
    });
    return { ok: true, balance: newBalance };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

export async function addWicks(
  amount: number,
  type: string,
  reference?: string,
  note?: string,
): Promise<{ ok: boolean; balance?: number; error?: string }> {
  const uid = getCurrentUid();
  if (!uid) return { ok: false, error: 'not_authenticated' };

  try {
    let newBalance = 0;
    await runTransaction(db, async tx => {
      const userRef = doc(db, 'users', uid);
      const snap = await tx.get(userRef);
      if (!snap.exists()) throw new Error('user_not_found');
      newBalance = (snap.data().wicks as number) + amount;
      tx.update(userRef, { wicks: newBalance, lastActiveAt: serverTimestamp() });
      tx.set(doc(collection(db, 'wicksTransactions')), {
        userId: uid,
        amount,
        balanceAfter: newBalance,
        type,
        referenceId: reference ?? null,
        note: note ?? null,
        createdAt: serverTimestamp(),
      });
    });
    return { ok: true, balance: newBalance };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

// ── Rooms ─────────────────────────────────────────────────
export interface DbRoom {
  id: string;
  roomKey: string | null;
  customTopicZh: string | null;
  customTopicEn: string | null;
  isActive: boolean;
  isUserCreated: boolean;
  messageCount: number;
  creatorId: string | null;
  createdAt: any;
  closesAt: any;
}

export async function fetchActiveRooms(): Promise<DbRoom[]> {
  const q = query(
    collection(db, 'rooms'),
    where('isActive', '==', true),
    limit(50),
  );
  const snap = await getDocs(q);
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }) as DbRoom)
    .sort((a, b) => (b.messageCount ?? 0) - (a.messageCount ?? 0))
    .slice(0, 20);
}

export async function createRoom(params: {
  topicZh: string;
  topicEn?: string;
}): Promise<DbRoom | null> {
  const uid = getCurrentUid();
  if (!uid) return null;
  const data = {
    creatorId: uid,
    roomKey: null,
    customTopicZh: params.topicZh,
    customTopicEn: params.topicEn ?? null,
    isActive: true,
    isUserCreated: true,
    messageCount: 0,
    createdAt: serverTimestamp(),
    closesAt: Timestamp.fromDate(new Date(Date.now() + 86400 * 1000)),
  };
  const ref = await addDoc(collection(db, 'rooms'), data);
  return { id: ref.id, ...data } as DbRoom;
}

// ── Room Messages ─────────────────────────────────────────
export interface DbRoomMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderSeed: string;
  content: string;
  createdAt: any;
}

export async function fetchRoomMessages(roomId: string): Promise<DbRoomMessage[]> {
  const q = query(
    collection(db, 'rooms', roomId, 'messages'),
    orderBy('createdAt', 'asc'),
    limit(50),
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, roomId, ...d.data() }) as DbRoomMessage);
}

export async function sendRoomMessage(params: {
  roomId: string;
  content: string;
  senderSeed: string;
}): Promise<boolean> {
  const uid = getCurrentUid();
  if (!uid) return false;
  try {
    await addDoc(collection(db, 'rooms', params.roomId, 'messages'), {
      senderId: uid,
      senderSeed: params.senderSeed,
      content: params.content,
      createdAt: serverTimestamp(),
    });
    // Increment room message count
    await updateDoc(doc(db, 'rooms', params.roomId), {
      messageCount: increment(1),
    });
    return true;
  } catch { return false; }
}

export function subscribeToRoomMessages(
  roomId: string,
  onMessage: (msgs: DbRoomMessage[]) => void,
) {
  const q = query(
    collection(db, 'rooms', roomId, 'messages'),
    orderBy('createdAt', 'asc'),
    limit(50),
  );
  return onSnapshot(q, snap => {
    onMessage(snap.docs.map(d => ({ id: d.id, roomId, ...d.data() }) as DbRoomMessage));
  });
}

// ── Conversation Messages ─────────────────────────────────
export interface DbConvMessage {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  messageType: string;
  createdAt: any;
}

export async function sendConversationMessage(params: {
  conversationId: string;
  content: string;
  messageType?: string;
}): Promise<boolean> {
  const uid = getCurrentUid();
  if (!uid) return false;
  try {
    await addDoc(collection(db, 'conversations', params.conversationId, 'messages'), {
      senderId: uid,
      content: params.content,
      messageType: params.messageType ?? 'text',
      createdAt: serverTimestamp(),
    });
    await updateDoc(doc(db, 'conversations', params.conversationId), {
      messageCount: increment(1),
    });
    return true;
  } catch { return false; }
}

export function subscribeToConversationMessages(
  conversationId: string,
  onUpdate: (msgs: DbConvMessage[]) => void,
) {
  const q = query(
    collection(db, 'conversations', conversationId, 'messages'),
    orderBy('createdAt', 'asc'),
  );
  return onSnapshot(q, snap => {
    onUpdate(snap.docs.map(d => ({
      id: d.id, conversationId, ...d.data(),
    }) as DbConvMessage));
  });
}

// ── Loft ─────────────────────────────────────────────────
export async function enterLoft(nightName: string): Promise<{
  ok: boolean; sessionId?: string; balance?: number; error?: string;
}> {
  const uid = getCurrentUid();
  if (!uid) return { ok: false, error: 'not_authenticated' };

  const tonight = new Date().toISOString().slice(0, 10);

  // Check if already entered tonight
  const q = query(
    collection(db, 'loftSessions'),
    where('userId', '==', uid),
    where('nightDate', '==', tonight),
  );
  const existing = await getDocs(q);
  if (!existing.empty) return { ok: false, error: 'already_entered_tonight' };

  // Spend 5 wicks
  const result = await spendWicks(5, 'loft_entry', undefined, '夜閣入場');
  if (!result.ok) return result;

  const ref = await addDoc(collection(db, 'loftSessions'), {
    userId: uid,
    nightName,
    nightDate: tonight,
    enteredAt: serverTimestamp(),
    leftAt: null,
  });

  return { ok: true, sessionId: ref.id, balance: result.balance };
}

export interface DbLoftSession {
  id: string;
  userId: string;
  nightName: string;
  nightDate: string;
  enteredAt: any;
}

export async function fetchTonightLoftSessions(): Promise<DbLoftSession[]> {
  const tonight = new Date().toISOString().slice(0, 10);
  const q = query(
    collection(db, 'loftSessions'),
    where('nightDate', '==', tonight),
    limit(50),
  );
  const snap = await getDocs(q);
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }) as DbLoftSession)
    .filter(s => !(s as any).leftAt);
}

// ── Match Queue ───────────────────────────────────────────
export async function joinMatchQueue(params: {
  moodText?: string;
  roomId?: string;
}): Promise<boolean> {
  const uid = getCurrentUid();
  if (!uid) return false;
  try {
    await setDoc(doc(db, 'matchQueue', uid), {
      userId: uid,
      moodText: params.moodText ?? null,
      roomId: params.roomId ?? null,
      status: 'waiting',
      enteredAt: serverTimestamp(),
      expiresAt: Timestamp.fromDate(new Date(Date.now() + 30 * 60 * 1000)),
    });
    return true;
  } catch { return false; }
}

export async function leaveMatchQueue(): Promise<void> {
  const uid = getCurrentUid();
  if (!uid) return;
  await deleteDoc(doc(db, 'matchQueue', uid));
}

// ── Reports ───────────────────────────────────────────────
export async function fileReport(params: {
  reportedUserId: string;
  reportType: string;
  description?: string;
  conversationId?: string;
}): Promise<boolean> {
  const uid = getCurrentUid();
  if (!uid) return false;
  try {
    await addDoc(collection(db, 'reports'), {
      reporterId: uid,
      reportedId: params.reportedUserId,
      reportType: params.reportType,
      description: params.description ?? null,
      conversationId: params.conversationId ?? null,
      status: 'pending',
      createdAt: serverTimestamp(),
      reviewedBy: null,
      reviewedAt: null,
      actionTaken: null,
      adminNote: null,
    });
    return true;
  } catch { return false; }
}

// ── Daily Reward ──────────────────────────────────────────
export async function claimDailyReward(): Promise<{
  ok: boolean;
  rewarded: boolean;
  amount?: number;
  balance?: number;
  error?: string;
}> {
  const uid = getCurrentUid();
  if (!uid) return { ok: false, rewarded: false, error: 'not_authenticated' };
  try {
    const today = new Date().toISOString().slice(0, 10);
    let rewarded = false;
    let amount = 0;
    let newBalance = 0;
    await runTransaction(db, async tx => {
      const userRef = doc(db, 'users', uid);
      const snap = await tx.get(userRef);
      if (!snap.exists()) throw new Error('user_not_found');
      const data = snap.data();
      if (data.lastRewardDate === today) { newBalance = data.wicks; return; }
      amount = data.vigil ? 2 : 1;
      newBalance = data.wicks + amount;
      rewarded = true;
      tx.update(userRef, { wicks: newBalance, lastRewardDate: today, lastActiveAt: serverTimestamp() });
      tx.set(doc(collection(db, 'wicksTransactions')), {
        userId: uid, amount, balanceAfter: newBalance, type: 'daily_reward',
        referenceId: today, note: data.vigil ? '守夜每日燭芯 ×2' : '每日登入燭芯',
        createdAt: serverTimestamp(),
      });
    });
    return { ok: true, rewarded, amount: amount || undefined, balance: newBalance };
  } catch (e: any) {
    return { ok: false, rewarded: false, error: e.message };
  }
}

// ── Subscribe to Active Rooms ─────────────────────────────
export function subscribeToActiveRooms(onChange: (rooms: DbRoom[]) => void): () => void {
  const q = query(collection(db, 'rooms'), where('isActive', '==', true), limit(50));
  return onSnapshot(q, snap => {
    const rooms = snap.docs
      .map(d => ({ id: d.id, ...d.data() }) as DbRoom)
      .sort((a, b) => (b.messageCount ?? 0) - (a.messageCount ?? 0))
      .slice(0, 20);
    onChange(rooms);
  });
}

// ── Get or create a preset room ────────────────────────────
export async function getOrCreatePresetRoom(params: {
  roomKey: string; topicZh: string; topicEn: string;
}): Promise<DbRoom | null> {
  try {
    const q = query(collection(db, 'rooms'), where('roomKey', '==', params.roomKey), limit(5));
    const snap = await getDocs(q);
    const active = snap.docs.find(d => d.data().isActive === true);
    if (active) return { id: active.id, ...active.data() } as DbRoom;
    const uid = getCurrentUid();
    const data = {
      creatorId: uid ?? null, roomKey: params.roomKey,
      customTopicZh: params.topicZh, customTopicEn: params.topicEn,
      isActive: true, isUserCreated: false, messageCount: 0,
      createdAt: serverTimestamp(),
      closesAt: Timestamp.fromDate(new Date(Date.now() + 86400 * 1000)),
    };
    const ref = await addDoc(collection(db, 'rooms'), data);
    return { id: ref.id, ...data } as DbRoom;
  } catch { return null; }
}

// ── Conversations ─────────────────────────────────────────
export interface DbConversation {
  id: string; userAId: string; userBId: string; roomId: string | null;
  messageCount: number; createdAt: any; expiresAt: any; endedAt: any; endedReason: string | null;
}

export async function createConversation(params: { userBId: string; roomId?: string }): Promise<DbConversation | null> {
  const uid = getCurrentUid();
  if (!uid) return null;
  try {
    const data = {
      userAId: uid, userBId: params.userBId, roomId: params.roomId ?? null,
      messageCount: 0, createdAt: serverTimestamp(),
      expiresAt: Timestamp.fromDate(new Date(Date.now() + 30 * 60 * 1000)),
      endedAt: null, endedReason: null,
    };
    const ref = await addDoc(collection(db, 'conversations'), data);
    return { id: ref.id, ...data } as DbConversation;
  } catch { return null; }
}

export async function endConversation(conversationId: string, reason: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'conversations', conversationId), { endedAt: serverTimestamp(), endedReason: reason });
  } catch {}
}
