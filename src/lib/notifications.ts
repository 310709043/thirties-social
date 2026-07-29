// notifications.ts — Push notification service
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { getCurrentUid, getCurrentNightSession } from './db';

// Expo push/local notification APIs are native-only in this app. Keeping the
// web bundle as an explicit no-op avoids permission prompts and unsupported
// listener warnings while preserving the same call sites across platforms.
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export async function registerForPushNotifications(): Promise<string | null> {
  if (Platform.OS === 'web') return null;
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

    // Get push token. Pass the EAS projectId explicitly — auto-detection from
    // app config works today, but an explicit id can't silently break in a
    // future SDK and take every message push down with it.
    const projectId = (Constants.expoConfig?.extra as any)?.eas?.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
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

// (sendPushToUser was removed: it read the OTHER user's doc for their pushToken,
// which the Firestore rules forbid — it could only ever fail. Cross-user pushes
// go through the backend /api/notify/message, which holds the Admin SDK.)

export async function scheduleLocalNotification(params: {
  title: string;
  body: string;
  data?: Record<string, any>;
}): Promise<void> {
  if (Platform.OS === 'web') return;
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
  if (Platform.OS === 'web') return;
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
  if (Platform.OS === 'web') return;
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

/** The notification tap that launched the app (cold start), if any. On Android
 *  a cold-start tap often never reaches the response listener — it has to be
 *  picked up here once the app is up. */
export function getInitialNotificationResponse(): Promise<Notifications.NotificationResponse | null> {
  if (Platform.OS === 'web') return Promise.resolve(null);
  return Notifications.getLastNotificationResponseAsync();
}

export function addNotificationListener(
  onReceive: (notification: Notifications.Notification) => void,
  onInteract: (response: Notifications.NotificationResponse) => void,
): () => void {
  if (Platform.OS === 'web') return () => {};
  const receiveSub = Notifications.addNotificationReceivedListener(onReceive);
  const responseSub = Notifications.addNotificationResponseReceivedListener(onInteract);
  return () => {
    receiveSub.remove();
    responseSub.remove();
  };
}
