// ============================================================
// WelcomeScreen — first screen ever seen. Explains the app and
// the anonymous-account model, then starts the journey.
// No email, no password: identity is bound to this device and
// created silently via Firebase anonymous auth.
// ============================================================
import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, Animated, Easing,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import { DIRECTIONS } from '../lib/theme';
import { t, tAlt } from '../lib/copy';
import { VaporBackground, SoftButton, Candle } from '../components/ui';
import { useAppStore, setWelcomeDone } from '../hooks/useAppStore';

type Props = NativeStackScreenProps<RootStackParamList, 'Welcome'>;

export default function WelcomeScreen({ navigation }: Props) {
  const { direction, lang, dbSynced } = useAppStore();
  const p = DIRECTIONS[direction];
  const zh = lang !== 'en';
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, []);

  const handleStart = () => {
    setWelcomeDone();
    navigation.replace('Onboarding');
  };

  return (
    <VaporBackground p={p} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <Animated.View style={[styles.container, { opacity: fade }]}>
          {/* Brand */}
          <View style={styles.hero}>
            <Candle size={72} />
            <Text style={[styles.appName, { color: p.ink }]}>{t('appName', lang)}</Text>
            <Text style={[styles.appNameAlt, { color: p.muted }]}>{tAlt('appName', lang)}</Text>
            <Text style={[styles.tagline, { color: p.inkSoft }]}>
              {zh ? '一個讓三十歲後的心事\n有地方可以放的夜晚' : 'A night where the weight of your thirties\nhas somewhere to rest'}
            </Text>
          </View>

          {/* How it works */}
          <View style={styles.points}>
            {[
              { icon: '◌', zh: '完全匿名 — 不需要電話、信箱或姓名', en: 'Fully anonymous — no phone, email, or name' },
              { icon: '◍', zh: '你的身分綁定這台裝置，自動建立、自動登入', en: 'Your identity is bound to this device — created and signed in automatically' },
              { icon: '◉', zh: '對話會消散，不留紀錄', en: 'Conversations dissolve. Nothing is kept' },
            ].map((pt, i) => (
              <View key={i} style={[styles.pointRow, { backgroundColor: p.surface, borderColor: p.line }]}>
                <Text style={{ fontSize: 16, color: p.accent }}>{pt.icon}</Text>
                <Text style={[styles.pointText, { color: p.inkSoft }]}>{zh ? pt.zh : pt.en}</Text>
              </View>
            ))}
          </View>

          {/* CTA */}
          <View style={styles.footer}>
            <SoftButton p={p} variant="primary" size="lg" full onPress={handleStart}>
              <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 16, color: p.dark ? '#1a1530' : '#fff' }}>
                {zh ? '以匿名身分開始' : 'Begin anonymously'}
              </Text>
            </SoftButton>
            <Text style={[styles.legal, { color: p.muted }]}>
              {dbSynced
                ? (zh ? '匿名帳號已就緒 · 開始即同意社群守則' : 'Anonymous account ready · starting means you accept the community rules')
                : (zh ? '正在準備你的匿名帳號⋯⋯' : 'Preparing your anonymous account…')}
            </Text>
          </View>
        </Animated.View>
      </SafeAreaView>
    </VaporBackground>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, paddingHorizontal: 28, paddingBottom: 36 },
  hero:       { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
  appName:    { fontFamily: 'NotoSerifTC-Light', fontSize: 42, letterSpacing: 10, marginTop: 18 },
  appNameAlt: { fontFamily: 'EBGaramond-Italic', fontSize: 15, letterSpacing: 2 },
  tagline:    { fontFamily: 'NotoSerifTC-Regular', fontSize: 15, lineHeight: 26, textAlign: 'center', marginTop: 20, letterSpacing: 1 },
  points:     { gap: 10, marginBottom: 28 },
  pointRow:   { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, borderWidth: 0.5 },
  pointText:  { fontFamily: 'NotoSerifTC-Regular', fontSize: 13, lineHeight: 20, flex: 1 },
  footer:     { gap: 12 },
  legal:      { fontFamily: 'NotoSerifTC-Regular', fontSize: 11, textAlign: 'center', opacity: 0.8 },
});
