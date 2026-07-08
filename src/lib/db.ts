// ============================================================
// Database helpers — Firestore
// ============================================================
import {
  doc, getDoc, setDoc, updateDoc, addDoc, deleteDoc,
  collection, query, where, orderBy, limit,
  onSnapshot, runTransaction, serverTimestamp,
  Timestamp, getDocs, increment, arrayUnion, arrayRemove,
  getCountFromServer,
} from 'firebase/firestore';
import { hash } from './identity';
import { signInAnonymously, onAuthStateChanged, deleteUser } from 'firebase/auth';
import { auth, db } from './firebase';
import { sendPushToUser } from './notifications';

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
  blockedUsers: string[];
  gender: string | null;
  ageBracket: string | null;
  relationshipStatus: string | null;
  relationshipShape: string | null;
  seeking: string[];
  boundary: string | null;
  freeTimes: string[];
  region: string | null;
  quote: string | null;
  loftVisible: boolean;
  nightColorIdx: number;
  nightAdjIdx: number;
  autoFilter: boolean;
  freeMatchesUsed?: number;
  loftFreeUsed?: number;
  slowMode: boolean;
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
      blockedUsers: [],
      gender: null,
      ageBracket: null,
      relationshipStatus: null,
      relationshipShape: null,
      seeking: [],
      boundary: null,
      freeTimes: [],
      region: null,
      quote: null,
      loftVisible: true,
      nightColorIdx: 0,
      nightAdjIdx: 0,
      autoFilter: true,
      slowMode: false,
      freeMatchesUsed: 0,
      loftFreeUsed: 0,
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

// ── Profile album ───────────────────────────────────────
// A small set of personal photos kept on the user doc. Shown to the owner
// directly; in the Loft they appear veiled until a connection lifts them.
export interface AlbumPhoto { url: string; publicId: string; }

export async function getAlbum(): Promise<AlbumPhoto[]> {
  const uid = getCurrentUid();
  if (!uid) return [];
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    return ((snap.data() as any)?.albumPhotos ?? []) as AlbumPhoto[];
  } catch { return []; }
}

export async function addAlbumPhoto(photo: AlbumPhoto): Promise<boolean> {
  const uid = getCurrentUid();
  if (!uid) return false;
  try {
    await updateDoc(doc(db, 'users', uid), { albumPhotos: arrayUnion(photo) });
    return true;
  } catch { return false; }
}

export async function removeAlbumPhoto(photo: AlbumPhoto): Promise<boolean> {
  const uid = getCurrentUid();
  if (!uid) return false;
  try {
    await updateDoc(doc(db, 'users', uid), { albumPhotos: arrayRemove(photo) });
    const idToken = await auth.currentUser?.getIdToken().catch(() => null);
    if (idToken && photo.publicId) {
      fetch(`${BACKEND_BASE}/api/photos/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ publicId: photo.publicId }),
      }).catch(() => {});
    }
    return true;
  } catch { return false; }
}

export function subscribeToUser(userId: string, onChange: (u: DbUser) => void) {
  return onSnapshot(doc(db, 'users', userId), snap => {
    if (snap.exists()) onChange({ id: snap.id, ...snap.data() } as DbUser);
  });
}

// ── Block List ──────────────────────────────────────────
export async function blockUser(targetUserId: string): Promise<boolean> {
  const uid = getCurrentUid();
  if (!uid) return false;
  try {
    const userRef = doc(db, 'users', uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) return false;
    const blocked = snap.data().blockedUsers ?? [];
    if (blocked.includes(targetUserId)) return true;
    await updateDoc(userRef, {
      blockedUsers: [...blocked, targetUserId],
      lastActiveAt: serverTimestamp(),
    });
    return true;
  } catch { return false; }
}

export async function unblockUser(targetUserId: string): Promise<boolean> {
  const uid = getCurrentUid();
  if (!uid) return false;
  try {
    const userRef = doc(db, 'users', uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) return false;
    const blocked = snap.data().blockedUsers ?? [];
    await updateDoc(userRef, {
      blockedUsers: blocked.filter((id: string) => id !== targetUserId),
      lastActiveAt: serverTimestamp(),
    });
    return true;
  } catch { return false; }
}

export async function isUserBlocked(targetUserId: string): Promise<boolean> {
  const uid = getCurrentUid();
  if (!uid) return false;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return false;
    const blocked = snap.data().blockedUsers ?? [];
    return blocked.includes(targetUserId);
  } catch { return false; }
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

export const ROOM_CAPACITY = 20;
/** A presence entry counts as "online" if its heartbeat is within this window. */
export const PRESENCE_STALE_MS = 45 * 1000;
/** Every brazier lives exactly 24 hours from the moment it's lit. */
export const ROOM_LIFETIME_MS = 24 * 60 * 60 * 1000;

/** A room is expired once its closesAt has passed (isActive alone isn't enough —
 *  nothing flips the flag server-side, so the client must honor closesAt). */
function roomExpired(r: DbRoom): boolean {
  const c: any = r.closesAt;
  const ms = c?.toMillis ? c.toMillis() : (typeof c?.seconds === 'number' ? c.seconds * 1000 : null);
  return ms != null && ms < Date.now();
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
    .filter(r => !roomExpired(r))
    .sort((a, b) => (b.messageCount ?? 0) - (a.messageCount ?? 0))
    .slice(0, 20);
}

/** Load a specific room by id (for entering an already-open room directly). */
export async function getRoomById(roomId: string): Promise<DbRoom | null> {
  try {
    const snap = await getDoc(doc(db, 'rooms', roomId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as DbRoom;
  } catch { return null; }
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
    closesAt: Timestamp.fromDate(new Date(Date.now() + ROOM_LIFETIME_MS)),
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
  reactions?: Record<string, number>;
}

/**
 * Toggle the current user's resonance reaction on a Brazier message. One
 * reaction per user per message: tapping the same symbol removes it, a
 * different symbol switches. Counts live on the message doc (read with the
 * message); the per-user choice is tracked in a reactions/{uid} subdoc.
 */
export async function reactToRoomMessage(
  roomId: string,
  msgId: string,
  symbolId: string,
): Promise<boolean> {
  const uid = getCurrentUid();
  if (!uid) return false;
  const msgRef = doc(db, 'rooms', roomId, 'messages', msgId);
  const myRef = doc(db, 'rooms', roomId, 'messages', msgId, 'reactions', uid);
  try {
    await runTransaction(db, async tx => {
      const mine = await tx.get(myRef);
      const prev = mine.exists() ? (mine.data().symbol as string) : null;
      if (prev === symbolId) {
        // Toggle off.
        tx.update(msgRef, { [`reactions.${symbolId}`]: increment(-1) });
        tx.delete(myRef);
      } else {
        if (prev) tx.update(msgRef, { [`reactions.${prev}`]: increment(-1) });
        tx.update(msgRef, { [`reactions.${symbolId}`]: increment(1) });
        tx.set(myRef, { symbol: symbolId, userId: uid, createdAt: serverTimestamp() });
      }
    });
    return true;
  } catch {
    return false;
  }
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
    await updateDoc(doc(db, 'rooms', params.roomId), {
      messageCount: increment(1),
      // Keep the brazier alive while it's active; it fades 12h after the last message.
      closesAt: Timestamp.fromDate(new Date(Date.now() + 43200 * 1000)),
    });
    return true;
  } catch {
    return false;
  }
}

// ── Room Presence ─────────────────────────────────────────
// Capacity and the live "who's here" count are driven by short-lived
// heartbeat docs under rooms/{roomId}/presence/{uid}. Entries naturally
// age out via PRESENCE_STALE_MS, so a crashed client never holds a slot.
export interface RoomPresence {
  userId: string;
  seed: string;
  lastSeen: any;
}

/** Count presence entries whose heartbeat is still fresh. */
export function countActivePresence(entries: RoomPresence[]): number {
  const now = Date.now();
  return entries.filter(e => !e.lastSeen || now - e.lastSeen.toMillis() < PRESENCE_STALE_MS).length;
}

/** One-off read of a room's fresh presence count (used to gate entry). */
export async function fetchActivePresenceCount(roomId: string): Promise<number> {
  try {
    const snap = await getDocs(collection(db, 'rooms', roomId, 'presence'));
    return countActivePresence(snap.docs.map(d => d.data() as RoomPresence));
  } catch { return 0; }
}

export async function joinRoomPresence(roomId: string, seed: string): Promise<void> {
  const uid = getCurrentUid();
  if (!uid) return;
  try {
    await setDoc(doc(db, 'rooms', roomId, 'presence', uid), {
      userId: uid, seed, lastSeen: serverTimestamp(),
    });
  } catch {}
}

export async function heartbeatRoomPresence(roomId: string): Promise<void> {
  const uid = getCurrentUid();
  if (!uid) return;
  try {
    await setDoc(doc(db, 'rooms', roomId, 'presence', uid), { lastSeen: serverTimestamp() }, { merge: true });
  } catch {}
}

export async function leaveRoomPresence(roomId: string): Promise<void> {
  const uid = getCurrentUid();
  if (!uid) return;
  try { await deleteDoc(doc(db, 'rooms', roomId, 'presence', uid)); } catch {}
}

export function subscribeToRoomPresence(
  roomId: string,
  onChange: (entries: RoomPresence[]) => void,
): () => void {
  return onSnapshot(collection(db, 'rooms', roomId, 'presence'), snap => {
    onChange(snap.docs.map(d => d.data() as RoomPresence));
  });
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
/**
 * Local calendar date (YYYY-MM-DD) for "tonight". Using the device's local
 * date — not UTC — so the Loft night rolls over at local midnight rather than
 * at 08:00 for UTC+8 users.
 */
/**
 * The date of the CURRENT NIGHT, rolling over at 05:00 (the Loft's closing
 * hour) instead of midnight. With a plain calendar date, everything keyed by
 * night broke at 00:00 — halfway through the Loft's 21:00–05:00 window:
 * everyone who entered before midnight vanished from the list, the ritual
 * answers reset, and a 重逢/夜信 made at 01:00 computed "tomorrow" as the
 * night after the one the user meant. 03:20 still belongs to "last night".
 */
export function localNightDate(): string {
  const d = new Date(Date.now() - 5 * 3600 * 1000);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// ONE truth for the Loft's hours: open nightly 21:00–05:00, every day. This is
// also a liquidity lever — concentrating the small early user base into the
// same window each night instead of spreading it thin across 24 hours. All
// user-facing copy must match these numbers (copy.ts loftClose, banners).
export const LOFT_OPEN_HOUR = 21;
export const LOFT_CLOSE_HOUR = 5;

/**
 * Whether the Loft is currently open. EXPO_PUBLIC_LOFT_ALWAYS_OPEN=1 is a test
 * bypass so the Loft can be exercised outside its nightly window.
 */
export function isLoftOpen(now: Date = new Date()): boolean {
  if (process.env.EXPO_PUBLIC_LOFT_ALWAYS_OPEN === '1') return true;
  const h = now.getHours();
  return h >= LOFT_OPEN_HOUR || h < LOFT_CLOSE_HOUR;
}

export async function enterLoft(
  nightName: string,
  photo?: { url: string; publicId: string } | null,
): Promise<{
  ok: boolean; sessionId?: string; balance?: number; error?: string;
  /** True when tonight's existing session was reused (re-entry, not a new visit). */
  reused?: boolean;
}> {
  const uid = getCurrentUid();
  if (!uid) return { ok: false, error: 'not_authenticated' };

  const tonight = localNightDate();

  // Check if already entered tonight
  const q = query(
    collection(db, 'loftSessions'),
    where('userId', '==', uid),
    where('nightDate', '==', tonight),
  );
  const existing = await getDocs(q);

  // Get user to check vigil status
  const userSnap = await getDoc(doc(db, 'users', uid));
  const isVigil = userSnap.exists() ? (userSnap.data() as any).vigil : false;

  // Already inside tonight? Walk back into the SAME session. The old code
  // returned an error here, which meant a free user who backed out of the Loft
  // (or restarted the app) was met with an upgrade wall for a night they had
  // already used their entry on.
  if (!existing.empty) {
    const d = existing.docs[0];
    // Un-stamp leftAt so they show in the list again; if they brought a new
    // photo this time, it replaces tonight's old one.
    const patch: any = { leftAt: null };
    if (photo?.url && (d.data() as any).photoUrl !== photo.url) {
      patch.photoUrl = photo.url;
      patch.photoPublicId = photo.publicId;
    }
    try { await updateDoc(d.ref, patch); } catch {}
    const balance0 = userSnap.exists() ? (userSnap.data() as any).wicks : 0;
    return { ok: true, sessionId: d.id, balance: balance0, reused: true };
  }

  const myGender = userSnap.exists() ? ((userSnap.data() as any).gender ?? null) : null;
  const myAge = userSnap.exists() ? ((userSnap.data() as any).ageBracket ?? null) : null;
  // Respect the user's "show me in the Loft" privacy choice (default visible).
  // Stamped at entry; an invisible visitor can still browse but isn't listed.
  const myVisible = userSnap.exists() ? ((userSnap.data() as any).loftVisible !== false) : true;
  const ref = await addDoc(collection(db, 'loftSessions'), {
    userId: uid,
    nightName,
    nightDate: tonight,
    gender: myGender,
    ageBracket: myAge,
    visible: myVisible,
    photoUrl: photo?.url ?? null,
    photoPublicId: photo?.publicId ?? null,
    enteredAt: serverTimestamp(),
    leftAt: null,
  });

  // Purge any Loft photo I left on a previous night — the picture is only meant
  // to live for one night. Fire-and-forget so it never blocks entry.
  void purgeMyOldLoftPhotos(uid, tonight, ref.id);

  const balance = userSnap.exists() ? (userSnap.data() as any).wicks : 0;
  return { ok: true, sessionId: ref.id, balance };
}

// Destroys Cloudinary assets for my Loft sessions from earlier nights (or any
// stray earlier session tonight) and clears the metadata, so a face never
// outlives the night it was brought in. Best-effort; failures are swallowed.
async function purgeMyOldLoftPhotos(uid: string, tonight: string, keepSessionId: string): Promise<void> {
  try {
    const mine = await getDocs(query(
      collection(db, 'loftSessions'),
      where('userId', '==', uid),
      limit(20),
    ));
    const idToken = await auth.currentUser?.getIdToken();
    await Promise.all(mine.docs.map(async d => {
      const data = d.data() as any;
      if (d.id === keepSessionId) return;
      const publicId = data.photoPublicId as string | undefined;
      if (!publicId) return;
      if (idToken) {
        try {
          await fetch(`${BACKEND_BASE}/api/photos/delete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
            body: JSON.stringify({ publicId }),
          });
        } catch { /* best effort */ }
      }
      try { await updateDoc(d.ref, { photoUrl: null, photoPublicId: null }); } catch { /* best effort */ }
    }));
  } catch { /* best effort */ }
}

export interface DbLoftSession {
  id: string;
  userId: string;
  nightName: string;
  nightDate: string;
  gender?: string | null;
  ageBracket?: string | null;
  visible?: boolean;
  // A single photo brought into the Loft for the night. Others only ever see a
  // heavily blurred version; the asset is purged after the night.
  photoUrl?: string | null;
  photoPublicId?: string | null;
  enteredAt: any;
}

// Returns everyone in the Loft tonight (minus me + blocked). Gender/age are
// included so the client can filter by the viewer's own chosen preference —
// no forced opposite-gender restriction.
export async function fetchTonightLoftSessions(): Promise<DbLoftSession[]> {
  const uid = getCurrentUid();
  const tonight = localNightDate();
  const q = query(
    collection(db, 'loftSessions'),
    where('nightDate', '==', tonight),
    limit(200),
  );
  const [snap, myUserSnap] = await Promise.all([
    getDocs(q),
    uid ? getDoc(doc(db, 'users', uid)) : Promise.resolve(null),
  ]);
  const myBlocked: string[] = myUserSnap?.exists() ? (myUserSnap.data().blockedUsers ?? []) : [];
  const list = snap.docs
    .map(d => ({ id: d.id, ...d.data() }) as DbLoftSession)
    .filter(s => !(s as any).leftAt && (s as any).visible !== false && s.userId !== uid && !myBlocked.includes(s.userId))
    // Newest arrivals first — most likely to still be around (sorted in JS to
    // avoid a composite index on nightDate + enteredAt).
    .sort((a, b) => ((b as any).enteredAt?.toMillis?.() ?? 0) - ((a as any).enteredAt?.toMillis?.() ?? 0));
  // One card per person: Vigil users can re-enter and leave several session docs
  // behind, which showed up as the same name repeated — keep only the latest.
  const seen = new Set<string>();
  return list.filter(s => (seen.has(s.userId) ? false : (seen.add(s.userId), true)));
}

// ── Loft Ritual (今夜之題) ────────────────────────────────
export interface DbRitualResponse {
  id: string;
  userId: string;
  seed: string;
  name: string;
  content: string;
  nightDate: string;
  createdAt: any;
}

export async function postRitualResponse(params: {
  content: string;
  seed: string;
  name: string;
}): Promise<boolean> {
  const uid = getCurrentUid();
  if (!uid) return false;
  try {
    await addDoc(collection(db, 'loftRitualResponses'), {
      userId: uid,
      seed: params.seed,
      name: params.name,
      content: params.content,
      nightDate: localNightDate(),
      createdAt: serverTimestamp(),
    });
    return true;
  } catch { return false; }
}

/** Live feed of tonight's ritual responses (the whole Loft answering one prompt). */
export function subscribeToTonightRitual(
  onChange: (responses: DbRitualResponse[]) => void,
): () => void {
  const tonight = localNightDate();
  const q = query(
    collection(db, 'loftRitualResponses'),
    where('nightDate', '==', tonight),
    // The Loft only surfaces the latest few answers + a count, so a small window
    // is plenty — this caps reads per Loft entry (each viewer subscribes to this).
    limit(40),
  );
  return onSnapshot(q, snap => {
    const list = snap.docs
      .map(d => ({ id: d.id, ...d.data() }) as DbRitualResponse)
      .sort((a, b) => (a.createdAt?.toMillis?.() ?? 0) - (b.createdAt?.toMillis?.() ?? 0));
    onChange(list);
  });
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
    // Check if I already opened a conversation with them tonight. Only query my
    // OWN conversations (userAId == me): the rules only let a participant read a
    // loftConversation, so an `in [me, them]` query would try to read docs I'm
    // not part of and fail with permission-denied — which made every tap silently
    // do nothing (returned null). Worst case we create a fresh (ephemeral) doc.
    const tonight = new Date().toISOString().slice(0, 10);
    // BOTH directions: if THEY opened a whisper with me tonight, tapping their
    // card must drop me into that same conversation — the old userAId-only
    // check made B create a silent duplicate, so A and B talked past each
    // other in two different rooms and "couldn't see each other's messages".
    const [mineSnap, theirsSnap] = await Promise.all([
      getDocs(query(collection(db, 'loftConversations'), where('userAId', '==', uid), limit(20))),
      getDocs(query(collection(db, 'loftConversations'), where('userBId', '==', uid), limit(20))),
    ]);
    const existing = [...mineSnap.docs, ...theirsSnap.docs].find(d => {
      const data = d.data();
      const involves = (data.userAId === uid && data.userBId === params.otherUserId)
        || (data.userAId === params.otherUserId && data.userBId === uid);
      const isTonight = data.createdAt?.toDate?.()?.toISOString?.()?.slice(0, 10) === tonight;
      // Must still be live — reusing an already-expired conversation would drop the
      // user into a chat that instantly closes itself (remaining <= 0 → goBack),
      // which looks exactly like "tapping does nothing". Expired → make a fresh one.
      const notExpired = (data.expiresAt?.toMillis?.() ?? 0) > Date.now();
      return involves && isTonight && !data.endedAt && notExpired;
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
    void notifyOtherParty({ loftConversationId: params.loftConversationId });
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
    limit(200),
  );
  return onSnapshot(q, snap => {
    onUpdate(snap.docs.map(d => ({
      id: d.id, loftConversationId, ...d.data(),
    }) as DbLoftMessage));
  });
}

export async function endLoftConversation(loftConversationId: string): Promise<void> {
  try {
    // Stamp who ended it so the other side can show a "they left" notice
    // (endedReason holds the leaver's uid; the survivor sees reason !== their uid).
    await updateDoc(doc(db, 'loftConversations', loftConversationId), {
      endedAt: serverTimestamp(),
      endedReason: getCurrentUid() ?? 'ended',
    });
  } catch {}
}

/** Watch a Loft conversation for the other person leaving (endedAt gets stamped). */
export function subscribeToLoftConversationEnded(
  loftConversationId: string,
  onEnded: (reason: string | null) => void,
): () => void {
  return onSnapshot(doc(db, 'loftConversations', loftConversationId), snap => {
    if (!snap.exists()) { onEnded('gone'); return; }
    const data = snap.data();
    onEnded(data.endedAt ? (data.endedReason ?? 'ended') : null);
  });
}

/** How far I've lifted the veil on this Loft chat (persisted so paid progress
 *  survives leaving/re-entering and is never charged twice). Returns 1 (fully
 *  veiled) if none stored. */
export async function fetchLoftVeilLevel(loftConversationId: string): Promise<number> {
  const uid = getCurrentUid();
  if (!uid) return 1;
  try {
    const snap = await getDoc(doc(db, 'loftConversations', loftConversationId));
    const level = snap.exists() ? (snap.data() as any).veils?.[uid] : undefined;
    return typeof level === 'number' && level >= 1 ? level : 1;
  } catch { return 1; }
}

/** Persist my veil-lift level for this Loft chat (per-viewer). */
export async function bumpLoftVeilLevel(loftConversationId: string, level: number): Promise<void> {
  const uid = getCurrentUid();
  if (!uid) return;
  try {
    await updateDoc(doc(db, 'loftConversations', loftConversationId), { [`veils.${uid}`]: level });
  } catch {}
}

/** A live whisper of mine tonight, shaped for the Loft's "ongoing" list. */
export interface DbLoftWhisper {
  id: string;
  otherId: string;
  otherName: string;
  messageCount: number;
  expiresAt: any;
}

/**
 * All my still-burning Loft conversations (either direction). This is how the
 * person who was *picked* discovers the whisper at all — before this list,
 * only the opener could see the conversation existed. No date filter needed:
 * the 58-minute expiry already bounds "tonight".
 */
export async function fetchMyTonightLoftWhispers(): Promise<DbLoftWhisper[]> {
  const uid = getCurrentUid();
  if (!uid) return [];
  try {
    const [mineSnap, theirsSnap] = await Promise.all([
      getDocs(query(collection(db, 'loftConversations'), where('userAId', '==', uid), limit(20))),
      getDocs(query(collection(db, 'loftConversations'), where('userBId', '==', uid), limit(20))),
    ]);
    const seen = new Set<string>();
    const out: DbLoftWhisper[] = [];
    for (const d of [...mineSnap.docs, ...theirsSnap.docs]) {
      if (seen.has(d.id)) continue;
      seen.add(d.id);
      const c = d.data() as any;
      if (c.endedAt) continue;
      if ((c.expiresAt?.toMillis?.() ?? 0) <= Date.now()) continue;
      const iAmA = c.userAId === uid;
      out.push({
        id: d.id,
        otherId: iAmA ? c.userBId : c.userAId,
        otherName: (iAmA ? c.userBName : c.userAName) ?? '',
        messageCount: c.messageCount ?? 0,
        expiresAt: c.expiresAt,
      });
    }
    // Soonest-to-fade first — those are the ones to answer now.
    return out.sort((a, b) => (a.expiresAt?.toMillis?.() ?? 0) - (b.expiresAt?.toMillis?.() ?? 0));
  } catch { return []; }
}

// ── Official braziers (cold-start warmth) ─────────────────
// Two official topic braziers are lit every night so a newcomer never walks
// into a completely dark app. Topics rotate deterministically by date.
const OFFICIAL_TOPICS: Array<{ zh: string; en: string }> = [
  { zh: '今晚睡不著的人', en: 'awake tonight' },
  { zh: '想說卻沒人聽的話', en: 'words with no listener' },
  { zh: '最近撐得有點累', en: 'holding on, tired' },
  { zh: '一個人吃晚餐的日子', en: 'dinners alone' },
  { zh: '不敢跟朋友說的事', en: 'what friends can\'t hear' },
  { zh: '差一點就說出口', en: 'almost said it' },
  { zh: '假裝沒事的一天', en: 'pretending today' },
  { zh: '很想念一個人', en: 'missing someone' },
  { zh: '關於離開的念頭', en: 'thoughts of leaving' },
  { zh: '今天有個小小的好事', en: 'one small good thing' },
  { zh: '深夜的一句真話', en: 'one true late-night line' },
  { zh: '婚姻裡安靜的部分', en: 'the quiet part of marriage' },
];

export async function ensureOfficialRooms(): Promise<void> {
  const date = localNightDate();
  const base = hash(date);
  const i1 = base % OFFICIAL_TOPICS.length;
  const i2 = (base + 5) % OFFICIAL_TOPICS.length; // offset keeps the pair distinct
  await Promise.all([i1, i2].map((ti, slot) =>
    getOrCreatePresetRoom({
      roomKey: `official-${date}-${slot}`,
      topicZh: OFFICIAL_TOPICS[ti].zh,
      topicEn: OFFICIAL_TOPICS[ti].en,
    }).catch(() => null),
  ));
}

// ── Awake presence（今晚有 N 人醒著）───────────────────────
// A tiny public heartbeat collection — one doc per user, only a timestamp — so
// the home screen can show an HONEST count of who's around right now. (The
// users collection is private per-user by rules, so it can't be counted.)
const AWAKE_WINDOW_MS = 20 * 60 * 1000;

export async function heartbeatAwake(): Promise<void> {
  const uid = getCurrentUid();
  if (!uid) return;
  try {
    await setDoc(doc(db, 'presence', uid), { lastActiveAt: serverTimestamp() }, { merge: true });
  } catch { /* non-critical */ }
}

export async function fetchAwakeCount(): Promise<number> {
  try {
    const cutoff = Timestamp.fromMillis(Date.now() - AWAKE_WINDOW_MS);
    const snap = await getCountFromServer(
      query(collection(db, 'presence'), where('lastActiveAt', '>', cutoff)),
    );
    return snap.data().count;
  } catch { return 0; }
}

// ── 重逢 Rekindle（明晚再見）────────────────────────────────
// During a chat, both sides can pay to meet again TOMORROW night: each votes
// (3 wicks, paid by the caller before voting); when the second vote lands, a
// rekindle doc for tomorrow's nightDate is created. The next night, both see
// a banner on the home screen that opens a fresh conversation.
export interface DbRekindle {
  id: string;
  userAId: string;
  userBId: string;
  nightDate: string;               // the night they meet again (local date)
  seeds: Record<string, string>;   // last night's seeds — so the banner can say who
  conversationId: string | null;   // set when one side opens the reunion
  status: 'pending' | 'opened';
  createdAt: any;
}

/** The night AFTER the current night — derived from the same 05:00 boundary
 *  as localNightDate, so "tomorrow night" voted at 01:00 means the coming
 *  evening, not the day after it. */
function nextNightDate(): string {
  const d = new Date(Date.now() - 5 * 3600 * 1000);
  d.setDate(d.getDate() + 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Vote to meet again tomorrow. Returns 'voted' | 'confirmed' | null on failure. */
export async function voteRekindle(params: {
  conversationId: string; mySeed: string; otherSeed: string;
}): Promise<'voted' | 'confirmed' | null> {
  const uid = getCurrentUid();
  if (!uid) return null;
  try {
    const ref = doc(db, 'conversations', params.conversationId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    const data = snap.data() as any;
    const otherId = data.userAId === uid ? data.userBId : data.userAId;
    const bothVoted = !!(data.rekindleVotes ?? {})[otherId];
    await updateDoc(ref, { [`rekindleVotes.${uid}`]: true });
    if (!bothVoted) return 'voted';
    await addDoc(collection(db, 'rekindles'), {
      userAId: data.userAId,
      userBId: data.userBId,
      nightDate: nextNightDate(),
      seeds: { [uid]: params.mySeed, [otherId]: params.otherSeed },
      conversationId: null,
      status: 'pending',
      createdAt: serverTimestamp(),
    });
    return 'confirmed';
  } catch { return null; }
}

/** Tonight's reunions waiting for me (both == queries; no composite index needed). */
export async function fetchTonightRekindles(): Promise<DbRekindle[]> {
  const uid = getCurrentUid();
  if (!uid) return [];
  const tonight = localNightDate();
  try {
    const [a, b] = await Promise.all([
      getDocs(query(collection(db, 'rekindles'), where('userAId', '==', uid), where('nightDate', '==', tonight))),
      getDocs(query(collection(db, 'rekindles'), where('userBId', '==', uid), where('nightDate', '==', tonight))),
    ]);
    return [...a.docs, ...b.docs].map(d => ({ id: d.id, ...d.data() }) as DbRekindle);
  } catch { return []; }
}

/** Open (or rejoin) a reunion — returns the conversation to enter. */
export async function openRekindle(rek: DbRekindle): Promise<{ conversationId: string; otherSeed: string } | null> {
  const uid = getCurrentUid();
  if (!uid) return null;
  const otherId = rek.userAId === uid ? rek.userBId : rek.userAId;
  const otherSeed = rek.seeds?.[otherId] ?? otherId;
  try {
    // Re-read first — the other side may already have opened it. But only step
    // into that conversation if it's still ALIVE: reunions are opened up to
    // hours apart, and the room only burns 30 minutes — joining a dead one
    // greeted the second person with "they left" the instant it opened.
    const fresh = await getDoc(doc(db, 'rekindles', rek.id));
    const freshData = fresh.exists() ? (fresh.data() as any) : null;
    if (freshData?.conversationId) {
      const conv0 = await getConversation(freshData.conversationId);
      const live = conv0 && !(conv0 as any).endedAt
        && ((conv0 as any).expiresAt?.toMillis?.() ?? 0) > Date.now();
      if (live) return { conversationId: freshData.conversationId, otherSeed };
      // fall through: light a fresh room for the reunion
    }
    const conv = await createConversation({ userBId: otherId });
    if (!conv) return null;
    await updateDoc(doc(db, 'rekindles', rek.id), { conversationId: conv.id, status: 'opened' });
    return { conversationId: conv.id, otherSeed };
  } catch { return null; }
}

// ── 熟人 Bonds（留下彼此・守夜特權）─────────────────────────
// Inside a chat, a Vigil member can propose keeping each other; when both agree
// (bondVotes on the conversation doc), a permanent bond doc is written. Bonds
// appear on the profile page and can start a fresh conversation any time.
export interface DbBond {
  id: string;
  users: string[];
  seeds: Record<string, string>; // seeds at bond time (the names they knew)
  createdAt: any;
}

/** Vote to keep each other. Returns 'voted' | 'confirmed' | null. */
export async function voteBond(params: {
  conversationId: string; mySeed: string; otherSeed: string;
}): Promise<'voted' | 'confirmed' | null> {
  const uid = getCurrentUid();
  if (!uid) return null;
  try {
    const ref = doc(db, 'conversations', params.conversationId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    const data = snap.data() as any;
    const otherId = data.userAId === uid ? data.userBId : data.userAId;
    const bothVoted = !!(data.bondVotes ?? {})[otherId];
    await updateDoc(ref, { [`bondVotes.${uid}`]: true });
    if (!bothVoted) return 'voted';
    // Don't create the same pair twice.
    const mine = await getDocs(query(collection(db, 'bonds'), where('users', 'array-contains', uid)));
    if (mine.docs.some(d => (d.data().users as string[]).includes(otherId))) return 'confirmed';
    await addDoc(collection(db, 'bonds'), {
      users: [data.userAId, data.userBId],
      seeds: { [uid]: params.mySeed, [otherId]: params.otherSeed },
      createdAt: serverTimestamp(),
    });
    return 'confirmed';
  } catch { return null; }
}

export async function fetchMyBonds(): Promise<DbBond[]> {
  const uid = getCurrentUid();
  if (!uid) return [];
  try {
    const snap = await getDocs(query(collection(db, 'bonds'), where('users', 'array-contains', uid)));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }) as DbBond)
      .sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
  } catch { return []; }
}

export async function removeBond(bondId: string): Promise<void> {
  try { await deleteDoc(doc(db, 'bonds', bondId)); } catch {}
}

// ── 夜信 Night Letters（慢通信）────────────────────────────
// Write a letter tonight; it reaches ONE random stranger tomorrow night. Fully
// asynchronous — no two people need to be online at the same time, which makes
// this the one connection path that works no matter how small the user base is.
export interface DbLetter {
  id: string;
  fromId: string;
  fromSeed: string;
  content: string;
  nightDate: string;    // night it was written
  deliverDate: string;  // night it becomes claimable (the next night)
  toId: string | null;  // set when a stranger claims it
  toSeed?: string | null;
  status: 'unsent' | 'delivered' | 'replied';
  replyContent?: string | null;
  repliedAt?: any;
  createdAt: any;
}

/** Send tonight's letter (one per night). Returns false if already sent or failed. */
export async function sendNightLetter(content: string, mySeed: string): Promise<boolean> {
  const uid = getCurrentUid();
  const text = content.trim();
  if (!uid || !text) return false;
  try {
    const tonight = localNightDate();
    const mine = await getDocs(query(
      collection(db, 'letters'),
      where('fromId', '==', uid), where('nightDate', '==', tonight),
    ));
    if (!mine.empty) return false;
    await addDoc(collection(db, 'letters'), {
      fromId: uid, fromSeed: mySeed, content: text,
      nightDate: tonight, deliverDate: nextNightDate(),
      toId: null, status: 'unsent', createdAt: serverTimestamp(),
    });
    return true;
  } catch { return false; }
}

/** True if I already wrote tonight's letter. */
export async function hasSentTonightLetter(): Promise<boolean> {
  const uid = getCurrentUid();
  if (!uid) return false;
  try {
    const mine = await getDocs(query(
      collection(db, 'letters'),
      where('fromId', '==', uid), where('nightDate', '==', localNightDate()),
    ));
    return !mine.empty;
  } catch { return false; }
}

/**
 * Tonight's letter for me: the one I already claimed, or claim a fresh one
 * (transaction guards two people grabbing the same letter). Returns null when
 * nothing is waiting.
 */
export async function claimTonightLetter(): Promise<DbLetter | null> {
  const uid = getCurrentUid();
  if (!uid) return null;
  const today = localNightDate();
  try {
    // Already claimed one tonight? Re-show it (also lets them finish a reply).
    const mine = await getDocs(query(
      collection(db, 'letters'),
      where('toId', '==', uid), where('deliverDate', '==', today),
    ));
    if (!mine.empty) {
      const d = mine.docs[0];
      return { id: d.id, ...d.data() } as DbLetter;
    }
    // Claim an unclaimed letter (not my own).
    const open = await getDocs(query(
      collection(db, 'letters'),
      where('deliverDate', '==', today), where('toId', '==', null), limit(10),
    ));
    const candidates = open.docs.filter(d => (d.data() as any).fromId !== uid);
    if (!candidates.length) return null;
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    const claimed = await runTransaction(db, async txn => {
      const fresh = await txn.get(pick.ref);
      if (!fresh.exists() || (fresh.data() as any).toId !== null) return false;
      txn.update(pick.ref, { toId: uid, status: 'delivered' });
      return true;
    });
    if (!claimed) return null;
    return { id: pick.id, ...(pick.data() as any), toId: uid, status: 'delivered' } as DbLetter;
  } catch { return null; }
}

/** Reply once to a letter I received. */
export async function replyToLetter(letterId: string, content: string, mySeed: string): Promise<boolean> {
  const uid = getCurrentUid();
  const text = content.trim();
  if (!uid || !text) return false;
  try {
    await updateDoc(doc(db, 'letters', letterId), {
      replyContent: text, toSeed: mySeed, repliedAt: serverTimestamp(), status: 'replied',
    });
    return true;
  } catch { return false; }
}

/** My letters that came back with a reply (the echoes of what I sent). */
export async function fetchMyLetterReplies(): Promise<DbLetter[]> {
  const uid = getCurrentUid();
  if (!uid) return [];
  try {
    const snap = await getDocs(query(
      collection(db, 'letters'),
      where('fromId', '==', uid), where('status', '==', 'replied'), limit(20),
    ));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }) as DbLetter)
      .sort((a, b) => (b.repliedAt?.toMillis?.() ?? 0) - (a.repliedAt?.toMillis?.() ?? 0));
  } catch { return []; }
}

// ── 回聲 Echoes（結束後的最後一句話）───────────────────────
// When a chat dissolves, each side may leave ONE line that reaches the other
// person the next morning at 09:00 — the only thing that crosses the dissolve,
// and the softest possible reason to come back tomorrow.
export interface DbEcho {
  id: string;
  fromId: string;
  fromSeed: string;
  toId: string;
  conversationId: string;
  content: string;
  deliverAt: any;   // Timestamp — next 09:00 after sending
  read: boolean;
  createdAt: any;
}

function nextMorningNine(): Date {
  const d = new Date();
  d.setHours(9, 0, 0, 0);
  if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1);
  return d;
}

export async function sendEcho(params: {
  toId: string; conversationId: string; content: string; mySeed: string;
}): Promise<boolean> {
  const uid = getCurrentUid();
  const text = params.content.trim();
  if (!uid || !text) return false;
  try {
    await addDoc(collection(db, 'echoes'), {
      fromId: uid, fromSeed: params.mySeed, toId: params.toId,
      conversationId: params.conversationId, content: text,
      deliverAt: Timestamp.fromDate(nextMorningNine()),
      read: false, createdAt: serverTimestamp(),
    });
    return true;
  } catch { return false; }
}

/** Echoes that have arrived for me and aren't read yet. */
export async function fetchArrivedEchoes(): Promise<DbEcho[]> {
  const uid = getCurrentUid();
  if (!uid) return [];
  try {
    const snap = await getDocs(query(
      collection(db, 'echoes'),
      where('toId', '==', uid), where('read', '==', false), limit(10),
    ));
    const now = Date.now();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }) as DbEcho)
      .filter(e => (e.deliverAt?.toMillis?.() ?? 0) <= now)
      .sort((a, b) => (a.createdAt?.toMillis?.() ?? 0) - (b.createdAt?.toMillis?.() ?? 0));
  } catch { return []; }
}

export async function markEchoRead(echoId: string): Promise<void> {
  try { await updateDoc(doc(db, 'echoes', echoId), { read: true }); } catch {}
}

// ── Match Queue ───────────────────────────────────────────
export type TonightMode = 'just_here' | 'want_to_talk' | 'open_to_more';

export interface MatchQueueEntry {
  userId: string;
  seed: string;
  moodText: string | null;
  roomId: string | null;
  gender: string | null;
  ageBracket: string | null;
  tonightMode: TonightMode | null;
  status: 'waiting' | 'matched';
  matchedWith: string | null;
  matchedSeed: string | null;
  matchedMoodText: string | null;
  matchedGender: string | null;
  matchedAge: string | null;
  matchedTonightMode: TonightMode | null;
  conversationId: string | null;
  enteredAt: any;
  expiresAt: any;
}

export async function joinMatchQueue(params: {
  moodText?: string;
  seed: string;
  roomId?: string;
  gender?: string | null;
  ageBracket?: string | null;
  tonightMode?: TonightMode | null;
}): Promise<boolean> {
  const uid = getCurrentUid();
  if (!uid) return false;
  try {
    await setDoc(doc(db, 'matchQueue', uid), {
      userId: uid,
      seed: params.seed,
      moodText: params.moodText ?? null,
      roomId: params.roomId ?? null,
      gender: params.gender ?? null,
      ageBracket: params.ageBracket ?? null,
      tonightMode: params.tonightMode ?? null,
      status: 'waiting',
      matchedWith: null,
      matchedSeed: null,
      matchedMoodText: null,
      matchedGender: null,
      matchedAge: null,
      matchedTonightMode: null,
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
const BACKEND_BASE = process.env.EXPO_PUBLIC_ADMIN_URL ?? 'https://thirties-admin.vercel.app';

/**
 * Ask the backend to push a (content-free) nudge to the OTHER party of a
 * conversation after we send a message, so they return even when the app is
 * closed. Must go server-side: the rules forbid reading another user's
 * pushToken. Fire-and-forget — never blocks or fails the send.
 */
/**
 * Ask the backend to delete every veiled photo of a conversation (Cloudinary
 * asset + metadata) when the chat ends. Server-side because deletion needs the
 * Cloudinary secret. Fire-and-forget — never blocks ending the chat.
 */
export async function purgeConversationPhotos(conversationId: string): Promise<void> {
  try {
    const idToken = await auth.currentUser?.getIdToken();
    if (!idToken) return;
    await fetch(`${BACKEND_BASE}/api/photos/purge-conversation`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId }),
    });
  } catch { /* best-effort cleanup */ }
}

async function notifyOtherParty(body: { conversationId?: string; loftConversationId?: string }): Promise<void> {
  try {
    const idToken = await auth.currentUser?.getIdToken();
    if (!idToken) return;
    await fetch(`${BACKEND_BASE}/api/notify/message`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch { /* notifications are best-effort */ }
}

/**
 * Ask the server to pair us with a waiting candidate. Cross-user matchQueue
 * reads need the Admin SDK (the rules only allow reading your own entry), so
 * matching runs server-side. The result arrives via subscribeToMyMatch.
 */
export async function tryFindMatch(): Promise<boolean> {
  const user = auth.currentUser;
  if (!user) return false;
  try {
    const idToken = await user.getIdToken();
    const res = await fetch(`${BACKEND_BASE}/api/match/find`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${idToken}` },
    });
    if (!res.ok) return false;
    const data = await res.json();
    return !!data.matched;
  } catch {
    return false;
  }
}

/** Server-issued daily wick reward (so wick grants stay off the client). */
export async function claimDailyRewardServer(): Promise<{ ok: boolean; rewarded: boolean; amount?: number; balance?: number }> {
  const user = auth.currentUser;
  if (!user) return { ok: false, rewarded: false };
  try {
    const idToken = await user.getIdToken();
    const res = await fetch(`${BACKEND_BASE}/api/economy/daily-reward`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${idToken}` },
    });
    if (!res.ok) return { ok: false, rewarded: false };
    return await res.json();
  } catch {
    return { ok: false, rewarded: false };
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
      // Free: +2/day, Vigil: +5/day
      amount = data.vigil ? 5 : 2;
      newBalance = data.wicks + amount;
      rewarded = true;
      tx.update(userRef, { wicks: newBalance, lastRewardDate: today, lastActiveAt: serverTimestamp() });
      tx.set(doc(collection(db, 'wicksTransactions')), {
        userId: uid, amount, balanceAfter: newBalance, type: 'daily_reward',
        referenceId: today, note: data.vigil ? '守夜每日燭芯 ×5' : '每日燭芯 +2',
        createdAt: serverTimestamp(),
      });
    });
    return { ok: true, rewarded, amount: amount || undefined, balance: newBalance };
  } catch (e: any) {
    return { ok: false, rewarded: false, error: e.message };
  }
}

// ── Subscribe to Active Rooms ─────────────────────────────
// Polls instead of holding a live listener. The lobby list doesn't need to be
// instant, and a live subscription re-reads a room doc for EVERY viewer on every
// room message (messageCount churn) — a read fan-out that explodes at scale
// (500 viewers → 500 reads per single room message). Polling makes each viewer's
// cost fixed (~50 reads / 25s) regardless of chat volume. Same signature, so
// callers are unchanged.
export function subscribeToActiveRooms(onChange: (rooms: DbRoom[]) => void): () => void {
  const q = query(collection(db, 'rooms'), where('isActive', '==', true), limit(50));
  let cancelled = false;
  const fetchOnce = async () => {
    try {
      const snap = await getDocs(q);
      if (cancelled) return;
      const rooms = snap.docs
        .map(d => ({ id: d.id, ...d.data() }) as DbRoom)
        .filter(r => !roomExpired(r))
        .sort((a, b) => (b.messageCount ?? 0) - (a.messageCount ?? 0))
        .slice(0, 20);
      onChange(rooms);
    } catch { /* keep the last list on a transient error */ }
  };
  fetchOnce();
  const id = setInterval(fetchOnce, 25000);
  return () => { cancelled = true; clearInterval(id); };
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
      closesAt: Timestamp.fromDate(new Date(Date.now() + ROOM_LIFETIME_MS)),
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

/** Load a conversation (for its authoritative expiresAt — both sides must run
 *  the SAME clock, not a private 30-minute countdown from whenever they opened
 *  the screen). */
export async function getConversation(conversationId: string): Promise<DbConversation | null> {
  try {
    const snap = await getDoc(doc(db, 'conversations', conversationId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as DbConversation;
  } catch { return null; }
}

/**
 * 續燭 — vote to extend this conversation by 30 minutes. Each side pays their
 * own wicks BEFORE calling this. When the second vote lands, the same write
 * pushes expiresAt out by 30 minutes and marks the conversation extended
 * (one extension per conversation). Both clients see the new expiresAt via
 * their conversation-doc subscription.
 */
export async function voteExtendConversation(conversationId: string): Promise<boolean> {
  const uid = getCurrentUid();
  if (!uid) return false;
  try {
    const snap = await getDoc(doc(db, 'conversations', conversationId));
    if (!snap.exists()) return false;
    const data = snap.data() as any;
    if (data.extended) return true; // already extended — nothing to do
    const votes: Record<string, boolean> = { ...(data.extendVotes ?? {}), [uid]: true };
    const otherId = data.userAId === uid ? data.userBId : data.userAId;
    const bothVoted = !!votes[otherId];
    const patch: any = { [`extendVotes.${uid}`]: true };
    if (bothVoted) {
      const baseMs = data.expiresAt?.toMillis?.() ?? Date.now();
      patch.expiresAt = Timestamp.fromMillis(baseMs + 30 * 60 * 1000);
      patch.extended = true;
    }
    await updateDoc(doc(db, 'conversations', conversationId), patch);
    return true;
  } catch { return false; }
}

/** Watch the whole conversation doc — ended state, extend votes and expiresAt. */
export function subscribeToConversationDoc(
  conversationId: string,
  onChange: (conv: (DbConversation & { extendVotes?: Record<string, boolean>; extended?: boolean }) | null) => void,
): () => void {
  return onSnapshot(doc(db, 'conversations', conversationId), snap => {
    onChange(snap.exists() ? ({ id: snap.id, ...snap.data() } as any) : null);
  });
}

export async function endConversation(conversationId: string, reason: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'conversations', conversationId), { endedAt: serverTimestamp(), endedReason: reason });
  } catch {}
  // The chat is over — wipe any veiled photos it held so nothing lingers on our
  // storage (honors "photos vanish after the conversation"). Fire-and-forget.
  void purgeConversationPhotos(conversationId);
}

/**
 * Fires when the conversation is ended (the other party left) or removed, so the
 * screen can tell the user instead of leaving them talking to no one. onEnded
 * gets the reason string once ended, or null while still active.
 */
export function subscribeToConversationEnded(
  conversationId: string,
  onEnded: (reason: string | null) => void,
): () => void {
  return onSnapshot(doc(db, 'conversations', conversationId), snap => {
    if (!snap.exists()) { onEnded('gone'); return; }
    const data = snap.data();
    onEnded(data.endedAt ? (data.endedReason ?? 'ended') : null);
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
    void notifyOtherParty({ conversationId: params.conversationId });
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
    limit(200),
  );
  return onSnapshot(q, snap => {
    onUpdate(snap.docs.map(d => ({
      id: d.id, conversationId, ...d.data(),
    }) as DbConvMessage));
  });
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

    // 4. Delete loft sessions — and destroy any Loft photo left on Cloudinary so a
    //    face doesn't outlive the account (the blurred photo they brought in).
    const loftQ = query(collection(db, 'loftSessions'), where('userId', '==', uid));
    const loftSnap = await getDocs(loftQ);
    const loftToken = await auth.currentUser?.getIdToken().catch(() => null);
    await Promise.all(loftSnap.docs.map(async d => {
      const publicId = (d.data() as any).photoPublicId;
      if (publicId && loftToken) {
        try {
          await fetch(`${BACKEND_BASE}/api/photos/delete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${loftToken}` },
            body: JSON.stringify({ publicId }),
          });
        } catch {}
      }
      await deleteDoc(d.ref);
    }));

    // 5. Delete reports filed by this user
    const reportQ = query(collection(db, 'reports'), where('reporterId', '==', uid));
    const reportSnap = await getDocs(reportQ);
    await Promise.all(reportSnap.docs.map(d => deleteDoc(d.ref)));

    // 6. Delete conversations and their messages
    const convAQ = query(collection(db, 'conversations'), where('userAId', '==', uid));
    const convBQ = query(collection(db, 'conversations'), where('userBId', '==', uid));
    const [convASnap, convBSnap] = await Promise.all([getDocs(convAQ), getDocs(convBQ)]);
    const convIds = new Set<string>();
    convASnap.docs.forEach(d => convIds.add(d.id));
    convBSnap.docs.forEach(d => convIds.add(d.id));
    await Promise.all(Array.from(convIds).map(async cid => {
      const msgs = await getDocs(collection(db, 'conversations', cid, 'messages'));
      await Promise.all(msgs.docs.map(m => deleteDoc(m.ref)));
      await deleteDoc(doc(db, 'conversations', cid));
    }));

    // 7. Delete loft conversations and their messages
    const lconvAQ = query(collection(db, 'loftConversations'), where('userAId', '==', uid));
    const lconvBQ = query(collection(db, 'loftConversations'), where('userBId', '==', uid));
    const [lconvASnap, lconvBSnap] = await Promise.all([getDocs(lconvAQ), getDocs(lconvBQ)]);
    const lconvIds = new Set<string>();
    lconvASnap.docs.forEach(d => lconvIds.add(d.id));
    lconvBSnap.docs.forEach(d => lconvIds.add(d.id));
    await Promise.all(Array.from(lconvIds).map(async cid => {
      const msgs = await getDocs(collection(db, 'loftConversations', cid, 'messages'));
      await Promise.all(msgs.docs.map(m => deleteDoc(m.ref)));
      await deleteDoc(doc(db, 'loftConversations', cid));
    }));

    // 8. Delete veiled photos — Cloudinary asset (via backend) + Firestore doc.
    const vpQ = query(collection(db, 'veiledPhotos'), where('senderId', '==', uid));
    const vpSnap = await getDocs(vpQ);
    const photoToken = await auth.currentUser?.getIdToken().catch(() => null);
    await Promise.all(vpSnap.docs.map(async d => {
      const publicId = (d.data() as any).publicId;
      if (publicId && photoToken) {
        try {
          await fetch(`${BACKEND_BASE}/api/photos/delete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${photoToken}` },
            body: JSON.stringify({ publicId }),
          });
        } catch {}
      }
      await deleteDoc(d.ref);
    }));

    // 8b. Delete 今夜之題 ritual responses.
    const rrQ = query(collection(db, 'loftRitualResponses'), where('userId', '==', uid));
    const rrSnap = await getDocs(rrQ);
    await Promise.all(rrSnap.docs.map(d => deleteDoc(d.ref)));

    // 9. Delete the Firebase Auth account itself (not just the data), so the
    //    email/Google credential is gone and a stale "auth exists but no profile"
    //    state can't happen on re-login. May throw auth/requires-recent-login for
    //    an old session — fall back to signing out so the account is at least
    //    detached locally (the profile data is already gone above).
    const authUser = auth.currentUser;
    try {
      if (authUser) await deleteUser(authUser);
    } catch {
      try { await auth.signOut(); } catch {}
    }

    return { ok: true };
  } catch (e: any) {
    console.warn('[db] deleteAccount failed:', e);
    return { ok: false, error: e?.message ?? 'delete_failed' };
  }
}
