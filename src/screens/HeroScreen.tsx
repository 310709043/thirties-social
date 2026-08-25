// HeroScreen.tsx — Candlelight welcome / hero landing
//
// A fullscreen entry screen, adapted from a "fullscreen video hero" reference
// (Foldcraft) into 燭影私語's own visual language: instead of a looping video we
// use the app's living candlelight background (VaporBackground + NightAtmosphere)
// plus a field of flickering candles, cream serif on warm near-black, and an
// ember accent. The Foldcraft structure is preserved — a quiet top bar, then a
// badge → big heading → sub → CTA that fade up in a staggered sequence. Tone
// follows the grayscale/companion voice: no hype, no binaries, just an invitation
// to a quiet nightly place.
//
// NOTE: video-free by design. Adding a real background video needs a native module
// (expo-video) + a full rebuild (OTA-unsafe) and your own asset. This runs today.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import { DIRECTIONS } from '../lib/theme';
import { useAppStore } from '../hooks/useAppStore';
import { VaporBackground, FadeInUp, SoftButton, Cap, Logo, WickGlyph, Flame } from '../components/ui';
import { hapticMedium } from '../lib/haptics';

type Props = NativeStackScreenProps<RootStackParamList, 'Hero'>;

// A field of distant candles flickering in the dark — the "living background"
// (replacing the reference video). Spread across the middle band and right/lower
// negative space so flames fill the void without sitting behind the left-aligned
// text. Each Flame sways and flickers on its own irregular timing, so the scene
// never looks looped.
const CANDLES: { size: number; top?: number; bottom?: number; right?: number; left?: number; opacity: number }[] = [
  { size: 46, right: 26, bottom: 150, opacity: 0.9 },   // bright anchor, bottom-right
  { size: 30, right: 150, bottom: 112, opacity: 0.6 },
  { size: 26, right: 78, bottom: 250, opacity: 0.68 },
  { size: 22, right: 190, bottom: 300, opacity: 0.5 },  // drifts into the middle band
  { size: 20, left: 58, bottom: 330, opacity: 0.5 },    // fills the empty centre-left void
  { size: 18, right: 120, bottom: 380, opacity: 0.42 },
  { size: 16, left: 150, bottom: 300, opacity: 0.44 },  // near-centre, below the heading
  { size: 14, right: 44, bottom: 420, opacity: 0.34 },  // faint & distant, high up
];

function CandleField() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {CANDLES.map((c, i) => (
        <View key={i} style={{ position: 'absolute', top: c.top, bottom: c.bottom, right: c.right, left: c.left, opacity: c.opacity }}>
          <Flame size={c.size} />
        </View>
      ))}
    </View>
  );
}

const STR = {
  zh: {
    badge: '匿名 · 夜的陪伴',
    line1: '夜還沒睡，',
    line2: '就點一盞燭，',
    line3: '說說今天。',
    sub: '一個不必是誰、每晚想打開的安靜角落。',
    primary: '點一盞燭火',
    haveAccount: '已經有帳號 · 登入',
  },
  en: {
    badge: 'Anonymous · night company',
    line1: "The night's still awake —",
    line2: 'light a candle,',
    line3: 'and tell it your day.',
    sub: "A quiet corner you'll want to open each night — no need to be anyone.",
    primary: 'Light a candle',
    haveAccount: 'Already have an account · Sign in',
  },
} as const;

export default function HeroScreen({ navigation }: Props) {
  const { direction, lang } = useAppStore();
  const p = DIRECTIONS[direction];
  const s = STR[lang === 'en' ? 'en' : 'zh'];

  const enter = () => {
    hapticMedium();
    navigation.navigate('Onboarding');
  };
  const signIn = () => navigation.navigate('Auth', { mode: 'login' });

  return (
    <VaporBackground p={p} style={{ flex: 1 }}>
      <CandleField />
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        {/* ── Top bar: brand mark + wordmark, quiet sign-in link ── */}
        <View style={styles.topbar}>
          <View style={styles.brand}>
            <Logo size={30} showGlow animate />
            <Text style={[styles.wordmark, { color: p.ink }]}>燭影私語</Text>
          </View>
          <Text
            onPress={signIn}
            accessibilityRole="button"
            style={[styles.signin, { color: p.muted }]}
          >
            {s.haveAccount}
          </Text>
        </View>

        {/* ── Hero content: top (badge + heading) / bottom (sub + CTA) ── */}
        <View style={styles.hero}>
          <View style={styles.top}>
            <FadeInUp delay={150}>
              <View style={[styles.badge, { borderColor: p.line, backgroundColor: p.surface }]}>
                <WickGlyph size={11} color={p.accent} />
                <Cap p={p} style={{ color: p.inkSoft }}>{s.badge}</Cap>
              </View>
            </FadeInUp>

            <View style={styles.heading}>
              <FadeInUp delay={300}>
                <Text style={[styles.hLine, { color: p.ink }]}>{s.line1}</Text>
              </FadeInUp>
              <FadeInUp delay={450}>
                <Text style={[styles.hLine, { color: p.ink }]}>{s.line2}</Text>
              </FadeInUp>
              <FadeInUp delay={600}>
                <Text style={[styles.hLine, { color: p.ink }]}>{s.line3}</Text>
              </FadeInUp>
            </View>
          </View>

          <View style={styles.bottom}>
            <FadeInUp delay={800}>
              <Text style={[styles.sub, { color: p.muted }]}>{s.sub}</Text>
            </FadeInUp>
            <FadeInUp delay={950}>
              <SoftButton p={p} variant="accent" size="lg" onPress={enter} style={{ alignSelf: 'flex-start' }}>
                {s.primary}
              </SoftButton>
            </FadeInUp>
          </View>
        </View>
      </SafeAreaView>
    </VaporBackground>
  );
}

const styles = StyleSheet.create({
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 4,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  wordmark: { fontFamily: 'NotoSerifTC-Regular', fontSize: 17, letterSpacing: 2 },
  signin: { fontFamily: 'NotoSerifTC-Regular', fontSize: 12, letterSpacing: 0.5, paddingVertical: 6, paddingLeft: 10 },

  hero: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 20,
  },
  top: { gap: 22 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    alignSelf: 'flex-start',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  heading: { gap: 2 },
  hLine: { fontFamily: 'NotoSerifTC-Light', fontSize: 36, lineHeight: 48, letterSpacing: 0.5 },

  bottom: { gap: 20 },
  sub: { fontFamily: 'NotoSerifTC-Regular', fontSize: 15, lineHeight: 25, maxWidth: 320 },
});
