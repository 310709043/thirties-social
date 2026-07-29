import { initializeApp } from 'firebase/app';
// @ts-expect-error — getReactNativePersistence exists at runtime in the RN build of firebase/auth but is missing from its public type defs
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

// Firebase's React Native persistence adapter is not exported by the browser
// build. Calling it on web crashed before React mounted, leaving a completely
// white page. Browsers already get durable platform-default persistence from
// getAuth(); native builds keep AsyncStorage-backed persistence.
function createAuth() {
  if (Platform.OS === 'web') return getAuth(app);
  try {
    return initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    // Fast refresh can evaluate this module after Auth already exists.
    return getAuth(app);
  }
}

export const auth = createAuth();

export const db = getFirestore(app);
export const storage = getStorage(app);
