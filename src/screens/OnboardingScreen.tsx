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
import { VaporBackground, GlassCard, SoftButton, Logo, FadeInUp } from '../components/ui';
import { Identity } from '../components/identity/Identity';
import { ColorAdjLabel } from '../components/identity/Identity';
import { setOnboardingDone, useAppStore } from '../hooks/useAppStore';

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;

const STEPS = [
  { title: 'ob1Title', body: 'ob1Body' },
  { title: 'ob2Title', body: 'ob2Body' },
  { title: 'ob3Title', body: 'ob3Body' },
];

export default function OnboardingScreen({ navigation }: Props) {
  const { seed, direction, lang, identityKind } = useAppStore();
  const p = DIRECTIONS[direction];
  const [step, setStep] = useState(0);
  const [showAgeGate, setShowAgeGate] = useState(false);
  const isPreview = step === STEPS.length;

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
    Animated.parallel([
      Animated.timing(contentOpacity, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(contentTranslate, { toValue: -20, duration: 150, useNativeDriver: true }),
    ]).start(() => {
      setStep(next);
      contentTranslate.setValue(20);
      Animated.parallel([
        Animated.timing(contentOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(contentTranslate, { toValue: 0, tension: 80, friction: 12, useNativeDriver: true }),
      ]).start();
    });
  };

  const handleContinue = () => {
    if (!isPreview) {
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
              {[0, 1, 2, 3].map(i => (
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
          }]}>
            {!isPreview ? (
              <>
                <BreathingMark style={styles.mark}>
                  {step === 0 && <IntroMark1 color={p.ink} accent={p.accent} />}
                  {step === 1 && <IntroMark2 color={p.ink} accent={p.accent} />}
                  {step === 2 && <IntroMark3 color={p.ink} accent={p.accent} />}
                </BreathingMark>
                <Text style={[styles.title, { color: p.ink }]}>{t(STEPS[step].title, lang)}</Text>
                <Text style={[styles.titleAlt, { color: p.ink }]}>{tAlt(STEPS[step].title, lang)}</Text>
                <Text style={[styles.body, { color: p.inkSoft }]}>{t(STEPS[step].body, lang)}</Text>
                <Text style={[styles.bodyAlt, { color: p.muted }]}>{tAlt(STEPS[step].body, lang)}</Text>
              </>
            ) : (
              <IdentityPreview p={p} lang={lang} identityKind={identityKind} seed={seed} />
            )}
          </Animated.View>

          {/* Footer */}
          <FadeInUp delay={200} distance={10}>
            <View style={styles.footer}>
              <SoftButton p={p} variant="primary" size="lg" full onPress={handleContinue}>
                <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 16, color: p.dark ? '#1a1530' : '#fff' }}>
                  {isPreview ? t('obContinue', lang) : (lang === 'en' ? 'Continue →' : '繼續 →')}
                </Text>
              </SoftButton>
              {!isPreview && step > 0 && (
                <TouchableOpacity onPress={handleBack} style={styles.back}>
                  <Text style={{ color: p.muted, fontFamily: 'NotoSerifTC-Regular', fontSize: 13 }}>
                    {lang === 'en' ? 'Back' : '\u4E0A\u4E00\u6B65'}
                  </Text>
                </TouchableOpacity>
              )}
              {step === 0 && (
                <TouchableOpacity
                  onPress={() => Linking.openURL('https://thirties-landing.vercel.app/privacy')}
                  style={styles.back}>
                  <Text style={{ color: p.muted, fontFamily: 'EBGaramond-Italic', fontSize: 12, opacity: 0.6 }}>
                    {lang === 'en' ? 'Privacy Policy' : '\u96B1\u79C1\u6B0A\u653F\u7B56'}
                  </Text>
                </TouchableOpacity>
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
              onPress={() => {
                setShowAgeGate(false);
                setOnboardingDone();
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

function IdentityPreview({ p, lang, identityKind, seed }: any) {
  return (
    <View style={{ gap: 22 }}>
      <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 28, color: p.ink }}>
        {t('obSigil', lang)}
      </Text>
      <GlassCard p={p} padding={32} radius={32}>
        <View style={{ alignItems: 'center', gap: 18 }}>
          <Identity kind={identityKind} seed={seed} size={132} palette={p} lang={lang} trust={0.35} />
          <ColorAdjLabel seed={seed} lang={lang} palette={p} />
        </View>
      </GlassCard>
      <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 13, color: p.muted, textAlign: 'center', lineHeight: 20 }}>
        {t('obSigilHint', lang)}
      </Text>
    </View>
  );
}

// A slow, organic breath behind each step's mark — gives the intro stillness
// and life instead of a static icon.
function BreathingMark({ children, style }: { children: React.ReactNode; style?: any }) {
  const breath = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(breath, { toValue: 1, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(breath, { toValue: 0, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    ).start();
  }, []);
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

// Step 3 — everyone is the same: three equal presences side by side.
function IntroMark3({ color, accent }: { color: string; accent: string }) {
  return (
    <Svg width={96} height={84} viewBox="0 0 96 84">
      {[20, 48, 76].map((cx, i) => (
        <Circle key={cx} cx={cx} cy={42} r={13} stroke={color} strokeOpacity={0.35} strokeWidth={1} fill="none" />
      ))}
      {[20, 48, 76].map((cx, i) => (
        <Circle key={`d${cx}`} cx={cx} cy={42} r={5} fill={i === 1 ? accent : color} fillOpacity={i === 1 ? 0.9 : 0.6} />
      ))}
      <Line x1={33} y1={42} x2={35} y2={42} stroke={color} strokeOpacity={0.2} strokeWidth={1} />
      <Line x1={61} y1={42} x2={63} y2={42} stroke={color} strokeOpacity={0.2} strokeWidth={1} />
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
  content:   { flex: 1, justifyContent: 'center', gap: 16, marginTop: 24 },
  mark:      { alignItems: 'center', marginBottom: 8 },
  title:     { fontFamily: 'NotoSerifTC-Regular', fontSize: 32, lineHeight: 44 },
  titleAlt:  { fontFamily: 'EBGaramond-Italic', fontSize: 15, marginTop: -8, opacity: 0.45 },
  body:      { fontFamily: 'NotoSerifTC-Regular', fontSize: 16, lineHeight: 26, maxWidth: 320 },
  bodyAlt:   { fontFamily: 'EBGaramond-Italic', fontSize: 13, opacity: 0.7, maxWidth: 320, lineHeight: 20 },
  footer:    { gap: 12 },
  back:      { alignItems: 'center', height: 22, justifyContent: 'center' },
  ageScrim:  { flex: 1, backgroundColor: 'rgba(20,12,8,0.64)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  ageCard:   { width: '100%', maxWidth: 420, borderRadius: 28, borderWidth: 0.7, padding: 24, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.22, shadowRadius: 30, shadowOffset: { width: 0, height: 14 }, elevation: 12 },
  ageMark:   { width: 58, height: 58, borderRadius: 29, borderWidth: 0.7, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  ageTitle:  { fontFamily: 'NotoSerifTC-Regular', fontSize: 22, lineHeight: 31, textAlign: 'center' },
  ageBody:   { fontFamily: 'NotoSerifTC-Regular', fontSize: 13.5, lineHeight: 23, textAlign: 'center', marginTop: 8, marginBottom: 22 },
  underageButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, marginTop: 8 },
  underageText: { fontFamily: 'NotoSerifTC-Regular', fontSize: 12.5, textAlign: 'center' },
});
