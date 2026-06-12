import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: 'AIzaSyARXfWwApk2zkyJmWCpA18VHL8-g5heNA4',
  authDomain: 'thirties-social.firebaseapp.com',
  projectId: 'thirties-social',
  storageBucket: 'thirties-social.firebasestorage.app',
  messagingSenderId: '28210976603',
  appId: '1:28210976603:web:b99fe1239b0f24cf77ec7e',
};

const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

export const db = getFirestore(app);
