import React, { useEffect, useState } from 'react';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import Navigation from './src/navigation';
import { initStore } from './src/hooks/useAppStore';

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

  return <Navigation />;
}
