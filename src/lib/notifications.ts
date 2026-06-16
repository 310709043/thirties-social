// notifications.ts — Push notification service
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { getCurrentUid } from './db';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  try {
    // Check permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('[Notifications] Permission not granted');
      return null;
    }

    // Get push token
    const tokenData = await Notifications.getExpoPushTokenAsync();
    const pushToken = tokenData.data;

    // Save to Firestore
    const uid = getCurrentUid();
    if (uid) {
      await setDoc(doc(db, 'users', uid), {
        pushToken,
        pushPlatform: Platform.OS,
        pushUpdatedAt: serverTimestamp(),
      }, { merge: true });
    }

    // Android channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    return pushToken;
  } catch (e) {
    console.warn('[Notifications] Registration failed:', e);
    return null;
  }
}

export async function sendPushToUser(userId: string, params: {
  title: string;
  body: string;
  data?: Record<string, any>;
}): Promise<boolean> {
  try {
    const userSnap = await getDoc(doc(db, 'users', userId));
    if (!userSnap.exists()) return false;
    const pushToken = userSnap.data().pushToken;
    if (!pushToken) return false;

    // Send via Expo push notification service
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: pushToken,
        title: params.title,
        body: params.body,
        data: params.data ?? {},
        sound: 'default',
      }),
    });

    return response.ok;
  } catch (e) {
    console.warn('[Notifications] Send failed:', e);
    return false;
  }
}

export async function scheduleLocalNotification(params: {
  title: string;
  body: string;
  data?: Record<string, any>;
}): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: params.title,
      body: params.body,
      data: params.data ?? {},
      sound: true,
    },
    trigger: null, // Immediately
  });
}

export function addNotificationListener(
  onReceive: (notification: Notifications.Notification) => void,
  onInteract: (response: Notifications.NotificationResponse) => void,
): () => void {
  const receiveSub = Notifications.addNotificationReceivedListener(onReceive);
  const responseSub = Notifications.addNotificationResponseReceivedListener(onInteract);
  return () => {
    receiveSub.remove();
    responseSub.remove();
  };
}
