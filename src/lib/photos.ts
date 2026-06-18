// photos.ts — Photo upload and management via Firebase Storage
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { doc, setDoc, getDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { storage, db } from './firebase';
import { getCurrentUid } from './db';

export interface VeiledPhoto {
  id: string;
  url: string;
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

  try {
    // Re-encode to strip all metadata (EXIF/GPS) before upload.
    const clean = await manipulateAsync(
      params.uri,
      [{ resize: { width: 1280 } }],
      { compress: 0.7, format: SaveFormat.JPEG },
    );
    const response = await fetch(clean.uri);
    const blob = await response.blob();

    // Upload to Firebase Storage
    const photoId = `${params.conversationId}_${uid}_${Date.now()}`;
    const storageRef = ref(storage, `veiled-photos/${photoId}`);
    await uploadBytes(storageRef, blob);

    // Get download URL
    const url = await getDownloadURL(storageRef);

    // Save metadata to Firestore
    const photoData: VeiledPhoto = {
      id: photoId,
      url,
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

// ── Delete Photo ────────────────────────────────────────
export async function deleteVeiledPhoto(photoId: string): Promise<boolean> {
  try {
    // Delete from Storage
    const storageRef = ref(storage, `veiled-photos/${photoId}`);
    await deleteObject(storageRef).catch(() => {});

    // Delete from Firestore
    await deleteDoc(doc(db, 'veiledPhotos', photoId));

    return true;
  } catch {
    return false;
  }
}

// ── Delete All Photos for Conversation ──────────────────
export async function deleteConversationPhotos(conversationId: string): Promise<void> {
  // This would require querying all photos for the conversation
  // For now, photos are deleted individually when revealed
  // Full cleanup can be done via Cloud Functions
}
