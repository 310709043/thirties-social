import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Animated, Easing,
} from 'react-native';
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
    } else {
      setOnboardingDone();
      navigation.replace('Setup');
    }
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
                <View style={styles.mark}>
                  {step === 0 && <IntroMark1 color={p.ink} accent={p.accent} />}
                  {step === 1 && <IntroMark2 color={p.ink} />}
                  {step === 2 && <IntroMark3 color={p.ink} accent={p.accent} />}
                </View>
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
                    {lang === 'en' ? 'Back' : '上一步'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </FadeInUp>
        </View>
      </SafeAreaView>
    </VaporBackground>
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

function IntroMark1({ color, accent }: { color: string; accent: string }) {
  return (
    <View style={{ width: 80, height: 80, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 80, height: 80, borderRadius: 40, borderWidth: 1, borderColor: color, opacity: 0.15, position: 'absolute' }} />
      <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: accent, opacity: 0.6, position: 'absolute' }} />
      <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: color, opacity: 0.85 }} />
    </View>
  );
}
function IntroMark2({ color }: { color: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
      {[0.55, 0.43, 0.31, 0.19, 0.07].map((op, i) => (
        <View key={i} style={{ width: 18, height: 22, borderRadius: 3, backgroundColor: color, opacity: op }} />
      ))}
    </View>
  );
}
function IntroMark3({ color, accent }: { color: string; accent: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 24, alignItems: 'center' }}>
      <View style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: color, opacity: 0.4, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: color, opacity: 0.7 }} />
      </View>
      <View style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: color, opacity: 0.4, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: accent, opacity: 0.85 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 28, paddingBottom: 38 },
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
});
