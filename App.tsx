import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { initStore, useAppStore, getState } from './src/hooks/useAppStore';
import { initPurchases } from './src/lib/purchases';
import { registerForPushNotifications, addNotificationListener, scheduleNightlyReminder, getInitialNotificationResponse } from './src/lib/notifications';
import { analytics } from './src/lib/analytics';
import { navigationRef, resetAndNavigate } from './src/lib/navigationRef';
import { RootStackParamList } from './src/navigation';
import { onAuthChange, getCurrentUser } from './src/lib/auth';
import Navigation from './src/navigation';
import LoadingScreen from './src/components/LoadingScreen';
import { WickGlyph, Logo } from './src/components/ui';
import { LOFT_PALETTE } from './src/lib/theme';
import { ToastProvider } from './src/components/ui/Toast';
import { ErrorBoundary } from './src/components/ui/ErrorBoundary';
import { configureGoogle } from './src/lib/googleAuth';
import { installCrashHandler, flushCrashQueue } from './src/lib/crash';

// Cap OS font-scaling so an accessibility "huge text" setting can't overflow the
// app's tight fixed-height rows/buttons (same failure mode as text overlap, but
// font-driven). 1.3 still respects a meaningful amount of user scaling.
const TextWithDefaults = Text as unknown as { defaultProps?: { maxFontSizeMultiplier?: number } };
TextWithDefaults.defaultProps = { ...(TextWithDefaults.defaultProps ?? {}), maxFontSizeMultiplier: 1.3 };

SplashScreen.preventAutoHideAsync();

/** The store's language once initStore has resolved — for one-off calls (like
 *  scheduling the nightly reminder) that need lang outside a React component. */
function getStoreLang(): 'zh' | 'en' {
  return getState().lang === 'en' ? 'en' : 'zh';
}

export default function App() {
  const [storeReady, setStoreReady] = useState(false);
  const [showLoading, setShowLoading] = useState(true);
  const [authUser, setAuthUser] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [fontsLoaded, fontError] = useFonts({
    'NotoSerifTC-Light':
      require('@expo-google-fonts/noto-serif-tc/300Light/NotoSerifTC_300Light.ttf'),
    'NotoSerifTC-Regular':
      require('@expo-google-fonts/noto-serif-tc/400Regular/NotoSerifTC_400Regular.ttf'),
    'NotoSerifTC-Bold':
      require('@expo-google-fonts/noto-serif-tc/700Bold/NotoSerifTC_700Bold.ttf'),
    'EBGaramond-Regular':
      require('@expo-google-fonts/eb-garamond/400Regular/EBGaramond_400Regular.ttf'),
    'EBGaramond-Italic':
      require('@expo-google-fonts/eb-garamond/400Regular_Italic/EBGaramond_400Regular_Italic.ttf'),
    'Inter-Regular':
      require('@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf'),
  });

  useEffect(() => {
    installCrashHandler();
    initStore().then(() => {
      setStoreReady(true);
      // Crash reports whose write lost the race with the crash go out now.
      flushCrashQueue();
      registerForPushNotifications().then(() => {
        // Re-engagement: one local reminder a night when the window opens.
        // Pass the user's language so an EN user doesn't get a Chinese reminder.
        scheduleNightlyReminder(getStoreLang());
      });
    });
    configureGoogle();

    // Listen for auth state changes
    let openLogged = false;
    const unsubscribeAuth = onAuthChange(user => {
      setAuthUser(user);
      setAuthChecked(true);
      // RevenueCat appUserID = Firebase uid, so the webhook maps purchases back.
      if (user) initPurchases(user.uid);
      // app_open only counts once auth is up — the analytics rules require a
      // real uid, so an earlier fire could only be rejected.
      if (user && !openLogged) { openLogged = true; analytics.appOpen(); }
    });

    // Handle notification taps. One route for both paths (foreground/background
    // listener AND the cold-start pickup below), deduped by notification id so
    // the cold-start check can't re-fire a tap the listener already handled.
    const handledTaps = new Set<string>();
    const routeTap = (response: { notification: { request: { identifier: string; content: { data?: any } } } }) => {
      const id = response.notification.request.identifier;
      if (handledTaps.has(id)) return;
      handledTaps.add(id);
      // A tap always signals intent to open the app somewhere. Use the
      // explicit screen when present, otherwise fall back to home (Mood).
      const data = response.notification.request.content.data;
      const screen = (data?.screen as keyof RootStackParamList) ?? 'Mood';
      resetAndNavigate(screen, data ?? {});
    };
    const removeListeners = addNotificationListener(() => {}, routeTap);
    // Cold start: the tap that LAUNCHED the app often never reaches the
    // listener (especially on Android) — pick it up explicitly.
    getInitialNotificationResponse().then(r => { if (r) routeTap(r); }).catch(() => {});

    return () => {
      removeListeners();
      unsubscribeAuth();
    };
  }, []);

  // Treat a font-load ERROR the same as "loaded": if a .ttf ever fails to
  // decode on a device, we must NOT hang forever on a blank screen — better to
  // render with system-font fallbacks than to brick the app. (Previously the
  // error slot was ignored, so a font failure = permanent blank.)
  const fontsReady = fontsLoaded || !!fontError;

  useEffect(() => {
    if (fontsReady && storeReady) {
      SplashScreen.hideAsync();
    }
  }, [fontsReady, storeReady]);

  if (!fontsReady || !storeReady) return null;

  if (showLoading) {
    return (
      <ErrorBoundary>
        <LoadingScreen onDone={() => setShowLoading(false)} />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <ToastProvider>
        <AppGate authUser={authUser} authChecked={authChecked} />
      </ToastProvider>
    </ErrorBoundary>
  );
}

function AppGate({ authUser, authChecked }: { authUser: any; authChecked: boolean }) {
  const store = useAppStore();
  const L = LOFT_PALETTE;

  // Only route to Auth when auth has TRULY settled to signed-out. On a cold
  // start the listener fires null once before anonymous sign-in completes; the
  // synchronous auth.currentUser is set the instant that lands, so we fall back
  // to it to avoid flashing the Auth screen at a brand-new (guest) user. We also
  // wait for the store to finish syncing so a returning session isn't misjudged.
  const liveUser = authUser ?? getCurrentUser();
  if (authChecked && !liveUser && store.dbSynced) {
    return <Navigation initialRoute="Auth" />;
  }

  if (store.isBanned) {
    const expiryDate = store.banExpiresAt
      ? new Date(store.banExpiresAt).toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' })
      : null;
    return (
      <View style={[bs.container, { backgroundColor: '#1a0d11' }]}>
        <View style={bs.inner}>
          <Logo size={80} showGlow={true} />
          <Text style={[bs.title, { color: '#f5e2c4' }]}>
            {store.lang === 'en' ? 'Account suspended' : '帳號已暫停'}
          </Text>
          {store.banReason ? (
            <Text style={[bs.reason, { color: 'rgba(245,226,196,0.7)' }]}>{store.banReason}</Text>
          ) : null}
          <Text style={[bs.expiry, { color: 'rgba(245,226,196,0.45)' }]}>
            {expiryDate
              ? (store.lang === 'en' ? `Suspension lifts: ${expiryDate}` : `預計解除：${expiryDate}`)
              : (store.lang === 'en' ? 'This suspension is permanent.' : '此封禁為永久性')}
          </Text>
          {/* An appeal path that actually goes somewhere — "contact support"
              with no contact was a dead end. */}
          <TouchableOpacity onPress={() => Linking.openURL(
            'mailto:privacy@lowbatterytown.com?subject=' + encodeURIComponent('燭影私語 帳號申訴'),
          ).catch(() => {})}>
            <Text style={[bs.support, { color: 'rgba(245,226,196,0.5)', textDecorationLine: 'underline' }]}>
              {store.lang === 'en' ? 'Appeal — contact support' : '申訴 — 聯繫客服'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const initialRoute = !store.onboardingDone ? 'Onboarding' : !store.setupDone ? 'Setup' : 'Mood';
  return <Navigation initialRoute={initialRoute} />;
}

const bs = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  inner:     { alignItems: 'center', gap: 16, padding: 36 },
  title:     { fontFamily: 'NotoSerifTC-Regular', fontSize: 26, letterSpacing: 2 },
  reason:    { fontFamily: 'NotoSerifTC-Regular', fontSize: 14, lineHeight: 22, textAlign: 'center', maxWidth: 280 },
  expiry:    { fontFamily: 'EBGaramond-Italic', fontSize: 14, textAlign: 'center' },
  support:   { fontFamily: 'Inter-Regular', fontSize: 11, letterSpacing: 1, textAlign: 'center', marginTop: 8 },
});
