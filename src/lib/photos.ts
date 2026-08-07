// photos.ts — Veiled photo upload via Cloudinary (free tier, no card).
// The image bytes live on Cloudinary; only metadata (URL + public_id) is kept in
// Firestore. Deletion goes through the backend (Cloudinary admin API needs the
// secret), preserving the "photos vanish when the conversation ends" promise.
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { doc, setDoc, getDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from './firebase';
import { getCurrentUid } from './db';

const CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME ?? '';
const UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? '';
const BACKEND_BASE = process.env.EXPO_PUBLIC_ADMIN_URL ?? 'https://thirties-admin.vercel.app';

export interface VeiledPhoto {
  id: string;
  url: string;
  publicId: string;
  conversationId: string;
  senderId: string;
  createdAt: any;
}

// ── Pick Image ──────────────────────────────────────────
export async function pickImage(): Promise<string | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.7,
    exif: false,
  });

  if (result.canceled || !result.assets?.[0]?.uri) return null;
  return result.assets[0].uri;
}

// ── Upload Photo ────────────────────────────────────────
export async function uploadVeiledPhoto(params: {
  conversationId: string;
  uri: string;
}): Promise<VeiledPhoto | null> {
  const uid = getCurrentUid();
  if (!uid) return null;
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    console.warn('[photos] Cloudinary not configured');
    return null;
  }

  try {
    // PRIVACY-CRITICAL: never keep a recoverable clear original. The other
    // participant can read this photo's Firestore doc, so a full-res URL there
    // could be stripped of its blur transform and grabbed as a sharp face — the
    // whole "earn the reveal" ritual would be pure client-side theatre. Instead
    // we bake the anonymity into the pixels: downscale hard at upload so even
    // the raw asset is a low-detail, soft image. The reveal is meant to be
    // "light and shadow of someone", never an ID photo — so 140px, shown with a
    // gentle blur on top, reads as dreamy soft-focus while staying un-doxxable.
    // (Same principle as uploadLoftPhoto's 96px.) Also strips EXIF/GPS.
    const clean = await manipulateAsync(
      params.uri,
      [{ resize: { width: 140 } }],
      { compress: 0.6, format: SaveFormat.JPEG, base64: true },
    );
    if (!clean.base64) {
      console.warn('[photos] No base64 produced from image');
      return null;
    }

    // Unsigned upload to Cloudinary (cloud name + preset are public by design).
    const form = new FormData();
    form.append('file', `data:image/jpeg;base64,${clean.base64}`);
    form.append('upload_preset', UPLOAD_PRESET);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
      method: 'POST',
      body: form,
    });
    if (!res.ok) {
      console.warn('[photos] Cloudinary upload failed:', res.status);
      return null;
    }
    const json = await res.json();
    const url: string = json.secure_url;
    const publicId: string = json.public_id;
    if (!url || !publicId) return null;

    // Save metadata to Firestore.
    const photoId = `${params.conversationId}_${uid}_${Date.now()}`;
    const photoData: VeiledPhoto = {
      id: photoId,
      url,
      publicId,
      conversationId: params.conversationId,
      senderId: uid,
      createdAt: serverTimestamp(),
    };
    await setDoc(doc(db, 'veiledPhotos', photoId), photoData);

    return photoData;
  } catch (e) {
    console.warn('[photos] Upload failed:', e);
    return null;
  }
}

// ── Album Photo (profile) ───────────────────────────────
// Uploads one photo to Cloudinary for the user's profile album. Returns the
// URL + public_id to store on the user doc. Metadata (EXIF/GPS) is stripped.
export async function uploadAlbumPhoto(uri: string): Promise<{ url: string; publicId: string } | null> {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    console.warn('[photos] Cloudinary not configured');
    return null;
  }
  try {
    const clean = await manipulateAsync(uri, [{ resize: { width: 1280 } }], {
      compress: 0.7, format: SaveFormat.JPEG, base64: true,
    });
    if (!clean.base64) return null;
    const form = new FormData();
    form.append('file', `data:image/jpeg;base64,${clean.base64}`);
    form.append('upload_preset', UPLOAD_PRESET);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: 'POST', body: form });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json.secure_url || !json.public_id) return null;
    return { url: json.secure_url, publicId: json.public_id };
  } catch (e) {
    console.warn('[photos] Album upload failed:', e);
    return null;
  }
}

// ── Loft Photo (blurred presence) ───────────────────────
// The Loft photo is only ever meant to be a blurred hint, and its URL sits on a
// loftSession that every signed-in user can read — so we must NOT keep a
// recoverable high-res original on Cloudinary (a determined viewer could strip
// the blur transform off the URL and grab a clear face). We bake the privacy in
// at upload time: downscale to a tiny width so even the raw asset is a low-detail
// smudge. Displayed blurred on top, it reads as fog; grabbed raw, it's unusable.
//
// NOTE: do NOT enable Cloudinary "strict transformations" as a follow-up.
// Evaluated 2026-08-08 and rejected: display blur is applied via dynamic
// `e_blur:<amount>` URL params (see ChatScreen/LoftChat/LoftScreen), so strict
// mode would 401 every photo in production and the amounts can't be pre-allowed.
// It's also pointless now — the raw asset is already downscaled to 96/140px, so
// the attack it guards against (strip transform → grab a sharp face) can't work.
// Privacy here is baked into pixels, not the transform.
export async function uploadLoftPhoto(uri: string): Promise<{ url: string; publicId: string } | null> {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    console.warn('[photos] Cloudinary not configured');
    return null;
  }
  try {
    // ~96px wide: enough to fill the small blurred cards, far too little to
    // identify a face if the raw URL is pulled. EXIF/GPS stripped by re-encode.
    const clean = await manipulateAsync(uri, [{ resize: { width: 96 } }], {
      compress: 0.6, format: SaveFormat.JPEG, base64: true,
    });
    if (!clean.base64) return null;
    const form = new FormData();
    form.append('file', `data:image/jpeg;base64,${clean.base64}`);
    form.append('upload_preset', UPLOAD_PRESET);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: 'POST', body: form });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json.secure_url || !json.public_id) return null;
    return { url: json.secure_url, publicId: json.public_id };
  } catch (e) {
    console.warn('[photos] Loft photo upload failed:', e);
    return null;
  }
}

// ── Get Photo ───────────────────────────────────────────
export async function getVeiledPhoto(photoId: string): Promise<VeiledPhoto | null> {
  try {
    const snap = await getDoc(doc(db, 'veiledPhotos', photoId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as VeiledPhoto;
  } catch {
    return null;
  }
}

// Ask the backend to destroy the Cloudinary asset (the secret lives server-side).
async function requestCloudinaryDelete(publicId: string): Promise<void> {
  try {
    const idToken = await auth.currentUser?.getIdToken();
    if (!idToken) return;
    await fetch(`${BACKEND_BASE}/api/photos/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ publicId }),
    });
  } catch (e) {
    console.warn('[photos] Cloudinary delete request failed:', e);
  }
}

// ── Delete Photo ────────────────────────────────────────
export async function deleteVeiledPhoto(photoId: string): Promise<boolean> {
  try {
    const snap = await getDoc(doc(db, 'veiledPhotos', photoId));
    const publicId = snap.exists() ? (snap.data() as VeiledPhoto).publicId : null;
    if (publicId) await requestCloudinaryDelete(publicId);
    await deleteDoc(doc(db, 'veiledPhotos', photoId));
    return true;
  } catch {
    return false;
  }
}
