import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { initStore, useAppStore } from './src/hooks/useAppStore';
import Navigation from './src/navigation';
import { WickGlyph } from './src/components/ui';
import { LOFT_PALETTE } from './src/lib/theme';
import { ToastProvider } from './src/components/ui/Toast';

SplashScreen.preventAutoHideAsync();

export default function App() {
  const [storeReady, setStoreReady] = useState(false);

  const [fontsLoaded] = useFonts({
    'NotoSerifTC-Light':
      require('@expo-google-fonts/noto-serif-tc/300Light/NotoSerifTC_300Light.ttf'),
    'NotoSerifTC-Regular':
      require('@expo-google-fonts/noto-serif-tc/400Regular/NotoSerifTC_400Regular.ttf'),
    'NotoSerifTC-Medium':
      require('@expo-google-fonts/noto-serif-tc/500Medium/NotoSerifTC_500Medium.ttf'),
    'NotoSerifTC-Bold':
      require('@expo-google-fonts/noto-serif-tc/700Bold/NotoSerifTC_700Bold.ttf'),
    'EBGaramond-Regular':
      require('@expo-google-fonts/eb-garamond/400Regular/EBGaramond_400Regular.ttf'),
    'EBGaramond-Italic':
      require('@expo-google-fonts/eb-garamond/400Regular_Italic/EBGaramond_400Regular_Italic.ttf'),
    'Inter-Regular':
      require('@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf'),
    'Inter-Medium':
      require('@expo-google-fonts/inter/500Medium/Inter_500Medium.ttf'),
  });

  useEffect(() => {
    initStore().then(() => setStoreReady(true));
  }, []);

  useEffect(() => {
    if (fontsLoaded && storeReady) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, storeReady]);

  if (!fontsLoaded || !storeReady) return null;

  return (
    <ToastProvider>
      <AppGate />
    </ToastProvider>
  );
}

function AppGate() {
  const store = useAppStore();
  const L = LOFT_PALETTE;

  if (store.isBanned) {
    const expiryDate = store.banExpiresAt
      ? new Date(store.banExpiresAt).toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' })
      : null;
    return (
      <View style={[bs.container, { backgroundColor: '#1a0d11' }]}>
        <View style={bs.inner}>
          <WickGlyph size={32} color="#e8a557" />
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
          <Text style={[bs.support, { color: 'rgba(245,226,196,0.3)' }]}>
            {store.lang === 'en' ? 'Questions? Contact support.' : '如有疑問請聯繫客服申訴。'}
          </Text>
        </View>
      </View>
    );
  }

  const initialRoute = !store.welcomeDone ? 'Welcome'
    : !store.onboardingDone ? 'Onboarding'
    : !store.setupDone ? 'Setup'
    : 'Mood';
  // Key forces a navigator remount when the gate changes (e.g. after resetAll)
  return <Navigation key={initialRoute} initialRoute={initialRoute} />;
}

const bs = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  inner:     { alignItems: 'center', gap: 16, padding: 36 },
  title:     { fontFamily: 'NotoSerifTC-Regular', fontSize: 26, letterSpacing: 2 },
  reason:    { fontFamily: 'NotoSerifTC-Regular', fontSize: 14, lineHeight: 22, textAlign: 'center', maxWidth: 280 },
  expiry:    { fontFamily: 'EBGaramond-Italic', fontSize: 14, textAlign: 'center' },
  support:   { fontFamily: 'Inter-Regular', fontSize: 11, letterSpacing: 1, textAlign: 'center', marginTop: 8 },
});
