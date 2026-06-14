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
  loftRole: 'listener' | 'speaker' | 'undecided' | null;
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
      loftRole: null,
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
    orderBy('createdAt', 'desc'),
    limit(30),
  );
  const snap = await getDocs(q);
  return snap.docs
    .map(d => ({ id: d.id, roomId, ...d.data() }) as DbRoomMessage)
    .reverse();
}

export async function fetchOlderRoomMessages(
  roomId: string,
  beforeTimestamp: any,
): Promise<DbRoomMessage[]> {
  const q = query(
    collection(db, 'rooms', roomId, 'messages'),
    orderBy('createdAt', 'desc'),
    limit(30),
  );
  const snap = await getDocs(q);
  const older = snap.docs
    .map(d => ({ id: d.id, roomId, ...d.data() }) as DbRoomMessage)
    .filter(m => {
      const t = m.createdAt?.toDate?.()?.getTime?.();
      const before = beforeTimestamp?.toDate?.()?.getTime?.();
      return t && before && t < before;
    });
  return older.reverse();
}

export function subscribeToRoomMessages(
  roomId: string,
  onMessage: (msgs: DbRoomMessage[]) => void,
): () => void {
  const q = query(
    collection(db, 'rooms', roomId, 'messages'),
    orderBy('createdAt', 'asc'),
    limit(100),
  );
  return onSnapshot(q, snap => {
    onMessage(snap.docs.map(d => ({ id: d.id, roomId, ...d.data() }) as DbRoomMessage));
  });
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

// ── Typing Indicator ─────────────────────────────────────
export function setTyping(conversationId: string, isTyping: boolean): Promise<void> {
  const uid = getCurrentUid();
  if (!uid) return Promise.resolve();
  const field = `typing_${uid}`;
  return updateDoc(doc(db, 'conversations', conversationId), {
    [field]: isTyping,
    [`${field}_at`]: serverTimestamp(),
  }).catch(() => {});
}

export function subscribeToTyping(
  conversationId: string,
  otherUserId: string,
  onTyping: (isTyping: boolean) => void,
): () => void {
  const field = `typing_${otherUserId}`;
  return onSnapshot(doc(db, 'conversations', conversationId), snap => {
    if (!snap.exists()) { onTyping(false); return; }
    const data = snap.data();
    const isTyping = data[field] === true;
    const typedAt = data[`${field}_at`]?.toDate?.();
    // Auto-expire after 5 seconds
    if (isTyping && typedAt) {
      const elapsed = Date.now() - typedAt.getTime();
      if (elapsed > 5000) { onTyping(false); return; }
    }
    onTyping(isTyping);
  });
}

// ── Loft ─────────────────────────────────────────────────
export async function enterLoft(nightName: string, cost: number = 5): Promise<{
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

  // Free entry if cost is 0 (women / vigil / listener role)
  if (cost > 0) {
    const result = await spendWicks(cost, 'loft_entry', undefined, '夜閣入場');
    if (!result.ok) return result;
  }

  const ref = await addDoc(collection(db, 'loftSessions'), {
    userId: uid,
    nightName,
    nightDate: tonight,
    enteredAt: serverTimestamp(),
    leftAt: null,
  });

  const userSnap = await getDoc(doc(db, 'users', uid));
  const balance = userSnap.exists() ? (userSnap.data() as any).wicks : 0;
  return { ok: true, sessionId: ref.id, balance };
}

export interface DbLoftSession {
  id: string;
  userId: string;
  nightName: string;
  nightDate: string;
  enteredAt: any;
}

export async function fetchTonightLoftSessions(): Promise<DbLoftSession[]> {
  const uid = getCurrentUid();
  const tonight = new Date().toISOString().slice(0, 10);
  const q = query(
    collection(db, 'loftSessions'),
    where('nightDate', '==', tonight),
    limit(50),
  );
  const snap = await getDocs(q);
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }) as DbLoftSession)
    .filter(s => !(s as any).leftAt && s.userId !== uid);
}

// ── Loft Conversations ───────────────────────────────────
export interface DbLoftConversation {
  id: string;
  userAId: string;
  userBId: string;
  userASeed: string;
  userBSeed: string;
  userAName: string;
  userBName: string;
  messageCount: number;
  createdAt: any;
  expiresAt: any;
  endedAt: any;
}

export interface DbLoftMessage {
  id: string;
  loftConversationId: string;
  senderId: string;
  content: string;
  messageType: 'text' | 'pulse' | 'gift';
  createdAt: any;
}

export async function createLoftConversation(params: {
  otherUserId: string;
  mySeed: string;
  otherSeed: string;
  myName: string;
  otherName: string;
}): Promise<DbLoftConversation | null> {
  const uid = getCurrentUid();
  if (!uid) return null;
  try {
    // Check if conversation already exists tonight
    const tonight = new Date().toISOString().slice(0, 10);
    const existQ = query(
      collection(db, 'loftConversations'),
      where('userAId', 'in', [uid, params.otherUserId]),
      limit(20),
    );
    const existSnap = await getDocs(existQ);
    const existing = existSnap.docs.find(d => {
      const data = d.data();
      const involves = (data.userAId === uid && data.userBId === params.otherUserId)
        || (data.userAId === params.otherUserId && data.userBId === uid);
      const isTonight = data.createdAt?.toDate?.()?.toISOString?.()?.slice(0, 10) === tonight;
      return involves && isTonight && !data.endedAt;
    });
    if (existing) return { id: existing.id, ...existing.data() } as DbLoftConversation;

    const data = {
      userAId: uid,
      userBId: params.otherUserId,
      userASeed: params.mySeed,
      userBSeed: params.otherSeed,
      userAName: params.myName,
      userBName: params.otherName,
      messageCount: 0,
      createdAt: serverTimestamp(),
      expiresAt: Timestamp.fromDate(new Date(Date.now() + 58 * 60 * 1000)),
      endedAt: null,
    };
    const ref = await addDoc(collection(db, 'loftConversations'), data);
    return { id: ref.id, ...data } as DbLoftConversation;
  } catch { return null; }
}

export async function sendLoftMessage(params: {
  loftConversationId: string;
  content: string;
  messageType?: 'text' | 'pulse' | 'gift';
}): Promise<boolean> {
  const uid = getCurrentUid();
  if (!uid) return false;
  try {
    await addDoc(collection(db, 'loftConversations', params.loftConversationId, 'messages'), {
      senderId: uid,
      content: params.content,
      messageType: params.messageType ?? 'text',
      createdAt: serverTimestamp(),
    });
    await updateDoc(doc(db, 'loftConversations', params.loftConversationId), {
      messageCount: increment(1),
    });
    return true;
  } catch { return false; }
}

export function subscribeToLoftMessages(
  loftConversationId: string,
  onUpdate: (msgs: DbLoftMessage[]) => void,
): () => void {
  const q = query(
    collection(db, 'loftConversations', loftConversationId, 'messages'),
    orderBy('createdAt', 'asc'),
  );
  return onSnapshot(q, snap => {
    onUpdate(snap.docs.map(d => ({
      id: d.id, loftConversationId, ...d.data(),
    }) as DbLoftMessage));
  });
}

export async function endLoftConversation(loftConversationId: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'loftConversations', loftConversationId), { endedAt: serverTimestamp() });
  } catch {}
}

// ── Match Queue ───────────────────────────────────────────
export interface MatchQueueEntry {
  userId: string;
  seed: string;
  moodText: string | null;
  roomId: string | null;
  status: 'waiting' | 'matched';
  matchedWith: string | null;
  matchedSeed: string | null;
  matchedMoodText: string | null;
  conversationId: string | null;
  enteredAt: any;
  expiresAt: any;
}

export async function joinMatchQueue(params: {
  moodText?: string;
  seed: string;
  roomId?: string;
}): Promise<boolean> {
  const uid = getCurrentUid();
  if (!uid) return false;
  try {
    await setDoc(doc(db, 'matchQueue', uid), {
      userId: uid,
      seed: params.seed,
      moodText: params.moodText ?? null,
      roomId: params.roomId ?? null,
      status: 'waiting',
      matchedWith: null,
      matchedSeed: null,
      matchedMoodText: null,
      conversationId: null,
      enteredAt: serverTimestamp(),
      expiresAt: Timestamp.fromDate(new Date(Date.now() + 30 * 60 * 1000)),
    });
    return true;
  } catch { return false; }
}

export async function leaveMatchQueue(): Promise<void> {
  const uid = getCurrentUid();
  if (!uid) return;
  try { await deleteDoc(doc(db, 'matchQueue', uid)); } catch {}
}

/** Subscribe to current user's match queue entry for real-time status changes */
export function subscribeToMyMatch(
  onChange: (entry: MatchQueueEntry | null) => void,
): () => void {
  const uid = getCurrentUid();
  if (!uid) return () => {};
  return onSnapshot(doc(db, 'matchQueue', uid), snap => {
    if (!snap.exists()) { onChange(null); return; }
    onChange({ ...snap.data() } as MatchQueueEntry);
  });
}

/** Try to find another waiting user and pair them with the current user */
export async function tryFindMatch(): Promise<boolean> {
  const uid = getCurrentUid();
  if (!uid) return false;

  try {
    const q = query(
      collection(db, 'matchQueue'),
      where('status', '==', 'waiting'),
      limit(10),
    );
    const snap = await getDocs(q);
    const candidates = snap.docs
      .map(d => ({ id: d.id, ...d.data() } as MatchQueueEntry & { id: string }))
      .filter(e => e.userId !== uid);

    if (candidates.length === 0) return false;

    // Pick a random candidate
    const other = candidates[Math.floor(Math.random() * candidates.length)];

    // Get my own entry
    const mySnap = await getDoc(doc(db, 'matchQueue', uid));
    if (!mySnap.exists() || mySnap.data().status !== 'waiting') return false;
    const myEntry = mySnap.data() as MatchQueueEntry;

    // Create conversation
    const conv = await createConversation({ userBId: other.userId });
    if (!conv) return false;

    // Update both entries atomically
    await runTransaction(db, async tx => {
      const myRef = doc(db, 'matchQueue', uid);
      const otherRef = doc(db, 'matchQueue', other.userId);

      const myCheck = await tx.get(myRef);
      const otherCheck = await tx.get(otherRef);

      if (!myCheck.exists() || myCheck.data().status !== 'waiting') throw new Error('already_matched');
      if (!otherCheck.exists() || otherCheck.data().status !== 'waiting') throw new Error('other_already_matched');

      tx.update(myRef, {
        status: 'matched',
        matchedWith: other.userId,
        matchedSeed: other.seed,
        matchedMoodText: other.moodText,
        conversationId: conv.id,
      });
      tx.update(otherRef, {
        status: 'matched',
        matchedWith: uid,
        matchedSeed: myEntry.seed,
        matchedMoodText: myEntry.moodText,
        conversationId: conv.id,
      });
    });

    return true;
  } catch {
    return false;
  }
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

// ── Account Deletion ─────────────────────────────────────
export async function deleteAccount(): Promise<{ ok: boolean; error?: string }> {
  const uid = getCurrentUid();
  if (!uid) return { ok: false, error: 'not_authenticated' };

  try {
    // 1. Delete user document
    await deleteDoc(doc(db, 'users', uid));

    // 2. Delete from match queue
    try { await deleteDoc(doc(db, 'matchQueue', uid)); } catch {}

    // 3. Delete wicks transactions
    const txQ = query(collection(db, 'wicksTransactions'), where('userId', '==', uid));
    const txSnap = await getDocs(txQ);
    await Promise.all(txSnap.docs.map(d => deleteDoc(d.ref)));

    // 4. Delete loft sessions
    const loftQ = query(collection(db, 'loftSessions'), where('userId', '==', uid));
    const loftSnap = await getDocs(loftQ);
    await Promise.all(loftSnap.docs.map(d => deleteDoc(d.ref)));

    // 5. Delete reports filed by this user
    const reportQ = query(collection(db, 'reports'), where('reporterId', '==', uid));
    const reportSnap = await getDocs(reportQ);
    await Promise.all(reportSnap.docs.map(d => deleteDoc(d.ref)));

    // 6. Sign out Firebase anonymous auth
    await auth.signOut();

    return { ok: true };
  } catch (e: any) {
    console.warn('[db] deleteAccount failed:', e);
    return { ok: false, error: e?.message ?? 'delete_failed' };
  }
}
