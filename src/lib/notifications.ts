// notifications.ts — Push notification service
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { getCurrentUid, getCurrentNightSession } from './db';

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

const NIGHTLY_REMINDER_ID = 'nightly-window-reminder';

/**
 * Schedule the nightly "the window is open" reminder at 21:00 local time —
 * the app's one re-engagement hook, matching the Loft's opening hour. Runs
 * entirely on-device (no server), replaces any previous schedule, and is a
 * no-op if the user never granted notification permission.
 */
export async function scheduleNightlyReminder(lang: 'zh' | 'en' = 'zh'): Promise<void> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;
    await Notifications.cancelScheduledNotificationAsync(NIGHTLY_REMINDER_ID).catch(() => {});
    await Notifications.scheduleNotificationAsync({
      identifier: NIGHTLY_REMINDER_ID,
      content: {
        title: lang === 'en' ? 'The window is open' : '今晚的窗口開了',
        body: lang === 'en'
          ? 'The Loft is lit. Someone is also awake tonight.'
          : '夜閣亮燈了。今晚也有人醒著，在等一句真話。',
        data: { screen: 'Mood' },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 21,
        minute: 0,
      },
    });
  } catch (e) {
    console.warn('[Notifications] nightly reminder failed:', e);
  }
}

/**
 * One-shot reminder for a confirmed 重逢 (reunion): fires at 21:00 of the night
 * the reunion is FOR. Because a night session runs 21:00→05:00, a vote cast at
 * 01:00 belongs to a session whose reunion is that same coming evening — so the
 * target is "today 21:00" in that case, not "tomorrow 21:00". Deriving the
 * target date from the shared 05:00 boundary keeps the reminder from firing a
 * day late (the old raw `+1 day` did exactly that after midnight).
 */
export async function scheduleRekindleReminder(lang: 'zh' | 'en' = 'zh'): Promise<void> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;
    // The reunion night = next night session. Anchor to its calendar day at
    // 21:00; if that instant is already past (rare edge), skip scheduling.
    const nightId = getCurrentNightSession(1); // 'YYYY-MM-DD'
    const [y, mo, da] = nightId.split('-').map(Number);
    const when = new Date(y, mo - 1, da, 21, 0, 0, 0);
    if (when.getTime() <= Date.now()) return;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: lang === 'en' ? 'Your reunion is tonight' : '今晚有一場重逢',
        body: lang === 'en'
          ? 'The person from last night is waiting to meet you again.'
          : '昨晚的那個人，約好今晚再見一次。',
        data: { screen: 'Mood' },
        sound: true,
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when },
    });
  } catch (e) {
    console.warn('[Notifications] rekindle reminder failed:', e);
  }
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
