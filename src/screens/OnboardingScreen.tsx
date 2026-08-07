import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated, Easing, Linking, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Rect, Line } from 'react-native-svg';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import { DIRECTIONS } from '../lib/theme';
import { t, tAlt } from '../lib/copy';
import { VaporBackground, SoftButton, Logo, FadeInUp } from '../components/ui';
import { useAppStore, setOnboardingDone, syncAfterAuth } from '../hooks/useAppStore';
import { MOTION, USE_NATIVE_DRIVER, useReduceMotion } from '../lib/motion';
import { analytics } from '../lib/analytics';
import { ensureAnonAuth } from '../lib/db';
import { hapticSuccess } from '../lib/haptics';

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;

const STEPS = [
  { title: 'ob1Title', body: 'ob1Body' },
  { title: 'ob2Title', body: 'ob2Body' },
];

export default function OnboardingScreen({ navigation }: Props) {
  const { direction, lang } = useAppStore();
  const p = DIRECTIONS[direction];
  const [step, setStep] = useState(0);
  const [showAgeGate, setShowAgeGate] = useState(false);
  const isLastStep = step === STEPS.length - 1;
  const reduceMotion = useReduceMotion();

  const contentOpacity = useRef(new Animated.Value(1)).current;
  const contentTranslate = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: step / STEPS.length,
      duration: 400,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [step]);

  const animateStep = (next: number) => {
    if (reduceMotion) {
      setStep(next);
      contentOpacity.setValue(1);
      contentTranslate.setValue(0);
      return;
    }
    Animated.parallel([
      Animated.timing(contentOpacity, { toValue: 0, duration: MOTION.quick, useNativeDriver: USE_NATIVE_DRIVER }),
      Animated.timing(contentTranslate, { toValue: -20, duration: MOTION.quick, useNativeDriver: USE_NATIVE_DRIVER }),
    ]).start(() => {
      setStep(next);
      contentTranslate.setValue(20);
      Animated.parallel([
        Animated.timing(contentOpacity, { toValue: 1, duration: MOTION.standard, easing: MOTION.easeOut, useNativeDriver: USE_NATIVE_DRIVER }),
        Animated.spring(contentTranslate, { toValue: 0, tension: 80, friction: 12, useNativeDriver: USE_NATIVE_DRIVER }),
      ]).start();
    });
  };

  const handleContinue = () => {
    if (!isLastStep) {
      animateStep(step + 1);
      return;
    }
    // A branded in-app gate works consistently on native and web. The previous
    // Alert implementation had no actionable buttons on React Native Web.
    setShowAgeGate(true);
  };

  const handleBack = () => {
    animateStep(step - 1);
  };

  return (
    <VaporBackground p={p} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.container}>
          {/* Brand */}
          <FadeInUp delay={0} distance={10}>
            <View style={styles.brand}>
              <Logo size={64} showGlow={true} />
              <View style={{ gap: 2 }}>
                <Text style={[styles.brandName, { color: p.ink }]}>{t('appName', lang)}</Text>
                <Text style={[styles.brandEn, { color: p.muted }]}>{tAlt('appName', lang)}</Text>
              </View>
            </View>
          </FadeInUp>

          {/* Progress bar */}
          <FadeInUp delay={100} distance={6}>
            <View style={styles.progress}>
              {STEPS.map((_, i) => (
                <View key={i} style={[
                  styles.progressBar,
                  {
                    flex: i === step ? 2 : 1,
                    backgroundColor: i <= step ? p.ink : p.line,
                    opacity: i <= step ? 0.85 : 1,
                  }
                ]} />
              ))}
            </View>
          </FadeInUp>

          {/* Content with transition */}
          <Animated.View style={[styles.content, {
            opacity: contentOpacity,
            transform: [{ translateY: contentTranslate }],
            backgroundColor: p.surface,
            borderColor: p.line,
            shadowColor: p.dark ? '#000' : '#6f4054',
          }]}>
            <View style={[styles.stepPill, { backgroundColor: p.accentSoft }]}>
              <Text style={[styles.stepPillText, { color: p.accent }]}>
                {String(step + 1).padStart(2, '0')} / {String(STEPS.length).padStart(2, '0')}
              </Text>
            </View>
            <BreathingMark style={styles.mark}>
              {step === 0 && <IntroMark1 color={p.ink} accent={p.accent} />}
              {step === 1 && <IntroMark2 color={p.ink} accent={p.accent} />}
            </BreathingMark>
            <Text style={[styles.title, { color: p.ink }]}>{t(STEPS[step].title, lang)}</Text>
            <Text style={[styles.titleAlt, { color: p.ink }]}>{tAlt(STEPS[step].title, lang)}</Text>
            <Text style={[styles.body, { color: p.inkSoft }]}>{t(STEPS[step].body, lang)}</Text>
            <Text style={[styles.bodyAlt, { color: p.muted }]}>{tAlt(STEPS[step].body, lang)}</Text>
          </Animated.View>

          {/* Footer */}
          <FadeInUp delay={200} distance={10}>
            <View style={styles.footer}>
              <SoftButton p={p} variant="primary" size="lg" full onPress={handleContinue}>
                <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 16, color: p.dark ? '#1a1530' : '#fff' }}>
                  {isLastStep ? (lang === 'en' ? 'Continue safely' : '安心繼續') : (lang === 'en' ? 'Continue →' : '繼續 →')}
                </Text>
              </SoftButton>
              {step > 0 && (
                <TouchableOpacity onPress={handleBack} style={styles.back}>
                  <Text style={{ color: p.muted, fontFamily: 'NotoSerifTC-Regular', fontSize: 13 }}>
                    {lang === 'en' ? 'Back' : '\u4E0A\u4E00\u6B65'}
                  </Text>
                </TouchableOpacity>
              )}
              {step === 0 && (
                <View style={styles.firstStepLinks}>
                  <TouchableOpacity
                    accessibilityRole="button"
                    onPress={() => navigation.push('Auth', { mode: 'login' })}
                    style={styles.back}>
                    <Text style={{ color: p.accent, fontFamily: 'NotoSerifTC-Regular', fontSize: 13 }}>
                      {lang === 'en' ? 'Already have an account? Sign in' : '已有帳號？直接登入'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    accessibilityRole="link"
                    onPress={() => Linking.openURL('https://thirties-landing.vercel.app/privacy')}
                    style={styles.back}>
                    <Text style={{ color: p.muted, fontFamily: 'EBGaramond-Italic', fontSize: 12, opacity: 0.72 }}>
                      {lang === 'en' ? 'Privacy Policy' : '\u96B1\u79C1\u6B0A\u653F\u7B56'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </FadeInUp>
        </View>
      </SafeAreaView>

      <Modal
        visible={showAgeGate}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAgeGate(false)}
      >
        <View style={styles.ageScrim}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={lang === 'en' ? 'Close age confirmation' : '關閉年齡確認'}
            activeOpacity={1}
            style={StyleSheet.absoluteFill}
            onPress={() => setShowAgeGate(false)}
          />
          <View style={[styles.ageCard, { backgroundColor: p.surfaceSolid, borderColor: p.line }]}>
            <View style={[styles.ageMark, { backgroundColor: p.accentSoft, borderColor: p.accent + '45' }]}>
              <WickGlyphMark color={p.accent} />
            </View>
            <Text style={[styles.ageTitle, { color: p.ink }]}>
              {lang === 'en' ? 'A space for adults' : '這是成年人的空間'}
            </Text>
            <Text style={[styles.ageBody, { color: p.muted }]}>
              {lang === 'en'
                ? 'Candle Whisper includes intimate relationship topics and is only available to people aged 18 or older.'
                : '燭影私語包含親密關係與成人情感話題，僅開放給年滿 18 歲的使用者。'}
            </Text>
            <SoftButton
              p={p}
              variant="primary"
              size="lg"
              full
              onPress={async () => {
                setShowAgeGate(false);
                analytics.onboardingComplete();
                // 匿名優先：18+ 確認後直接以訪客身分進場，跳過 email 表單，守住
                // 「不用註冊 · 不用真名」的核心定位。想登入既有帳號的人走上方
                // 「已有帳號？登入」入口；email 綁定是設定裡的可選項，不是入場門檻。
                // 匿名登入若在弱網下失敗，背景重試(_scheduleFirebaseRetry)會補上 uid。
                try { await ensureAnonAuth(); } catch {}
                await syncAfterAuth();
                await setOnboardingDone();
                analytics.authSuccess('guest');
                hapticSuccess();
                navigation.replace('Setup');
              }}
            >
              <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 15, color: p.dark ? '#1a1530' : '#fff' }}>
                {lang === 'en' ? 'I confirm I am 18 or older' : '我確認已年滿 18 歲'}
              </Text>
            </SoftButton>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => setShowAgeGate(false)}
              style={styles.underageButton}
            >
              <Text style={[styles.underageText, { color: p.muted }]}>
                {lang === 'en' ? 'I am under 18 — leave this screen' : '我未滿 18 歲，暫不使用'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </VaporBackground>
  );
}

function WickGlyphMark({ color }: { color: string }) {
  return (
    <Svg width={26} height={34} viewBox="0 0 26 34">
      <Circle cx={13} cy={13} r={10} fill={color} fillOpacity={0.12} />
      <Circle cx={13} cy={13} r={4.5} fill={color} fillOpacity={0.92} />
      <Line x1={13} y1={18} x2={13} y2={30} stroke={color} strokeOpacity={0.55} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

// A slow, organic breath behind each step's mark — gives the intro stillness
// and life instead of a static icon.
function BreathingMark({ children, style }: { children: React.ReactNode; style?: any }) {
  const breath = useRef(new Animated.Value(0)).current;
  const reduceMotion = useReduceMotion();
  useEffect(() => {
    if (reduceMotion) {
      breath.setValue(0.5);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, { toValue: 1, duration: 2600, easing: MOTION.easeInOut, useNativeDriver: USE_NATIVE_DRIVER }),
        Animated.timing(breath, { toValue: 0, duration: 2600, easing: MOTION.easeInOut, useNativeDriver: USE_NATIVE_DRIVER }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [breath, reduceMotion]);
  const scale = breath.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1.03] });
  const opacity = breath.interpolate({ inputRange: [0, 1], outputRange: [0.82, 1] });
  return <Animated.View style={[style, { transform: [{ scale }], opacity }]}>{children}</Animated.View>;
}

// Step 1 — a self emerging from anonymity: a quiet ember inside soft rings.
function IntroMark1({ color, accent }: { color: string; accent: string }) {
  return (
    <Svg width={84} height={84} viewBox="0 0 84 84">
      <Circle cx={42} cy={42} r={38} stroke={color} strokeOpacity={0.1} strokeWidth={1} fill="none" />
      <Circle cx={42} cy={42} r={27} stroke={color} strokeOpacity={0.16} strokeWidth={1} fill="none" />
      <Circle cx={42} cy={42} r={16} fill={accent} fillOpacity={0.18} />
      <Circle cx={42} cy={42} r={7} fill={accent} fillOpacity={0.9} />
    </Svg>
  );
}

// Step 2 — say it, then let it fade: lines of words dissolving downward.
function IntroMark2({ color, accent }: { color: string; accent: string }) {
  const lines = [
    { y: 22, w: 52, op: 0.7,  c: accent },
    { y: 34, w: 60, op: 0.5,  c: color },
    { y: 46, w: 44, op: 0.32, c: color },
    { y: 58, w: 54, op: 0.16, c: color },
    { y: 70, w: 30, op: 0.06, c: color },
  ];
  return (
    <Svg width={84} height={84} viewBox="0 0 84 84">
      {lines.map((l, i) => (
        <Rect key={i} x={(84 - l.w) / 2} y={l.y} width={l.w} height={3.4} rx={1.7}
          fill={l.c} fillOpacity={l.op} />
      ))}
    </Svg>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 28, paddingBottom: 38, width: '100%', maxWidth: 560, alignSelf: 'center' },
  brand:     { alignItems: 'center', gap: 12, marginTop: 8 },
  brandName: { fontFamily: 'NotoSerifTC-Regular', fontSize: 18, letterSpacing: 2, textAlign: 'center' },
  brandEn:   { fontFamily: 'EBGaramond-Italic', fontSize: 13, textAlign: 'center' },
  progress:  { flexDirection: 'row', gap: 6, marginTop: 28, height: 2 },
  progressBar: { height: 2, borderRadius: 2 },
  content:   { flex: 1, justifyContent: 'center', gap: 15, marginTop: 20, marginBottom: 18, paddingHorizontal: 22, paddingVertical: 24, borderRadius: 30, borderWidth: 1, shadowOffset: { width: 0, height: 14 }, shadowOpacity: 0.12, shadowRadius: 28, elevation: 4 },
  stepPill:  { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, marginBottom: 2 },
  stepPillText: { fontFamily: 'Inter-Regular', fontSize: 10, letterSpacing: 1.6, fontWeight: '600' },
  mark:      { alignItems: 'center', marginBottom: 8 },
  title:     { fontFamily: 'NotoSerifTC-Regular', fontSize: 30, lineHeight: 42 },
  titleAlt:  { fontFamily: 'EBGaramond-Italic', fontSize: 15, marginTop: -8, opacity: 0.45 },
  body:      { fontFamily: 'NotoSerifTC-Regular', fontSize: 16, lineHeight: 26, maxWidth: 320 },
  bodyAlt:   { fontFamily: 'EBGaramond-Italic', fontSize: 13, opacity: 0.7, maxWidth: 320, lineHeight: 20 },
  footer:    { gap: 12 },
  firstStepLinks: { alignItems: 'center', gap: 2 },
  back:      { alignItems: 'center', height: 22, justifyContent: 'center' },
  ageScrim:  { flex: 1, backgroundColor: 'rgba(20,12,8,0.64)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  ageCard:   { width: '100%', maxWidth: 420, borderRadius: 28, borderWidth: 0.7, padding: 24, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.22, shadowRadius: 30, shadowOffset: { width: 0, height: 14 }, elevation: 12 },
  ageMark:   { width: 58, height: 58, borderRadius: 29, borderWidth: 0.7, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  ageTitle:  { fontFamily: 'NotoSerifTC-Regular', fontSize: 22, lineHeight: 31, textAlign: 'center' },
  ageBody:   { fontFamily: 'NotoSerifTC-Regular', fontSize: 13.5, lineHeight: 23, textAlign: 'center', marginTop: 8, marginBottom: 22 },
  underageButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, marginTop: 8 },
  underageText: { fontFamily: 'NotoSerifTC-Regular', fontSize: 12.5, textAlign: 'center' },
});
