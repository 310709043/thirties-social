import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import { DIRECTIONS } from '../lib/theme';
import { t, tAlt } from '../lib/copy';
import { VaporBackground, GlassCard, SoftButton, FadeInUp } from '../components/ui';
import { Identity } from '../components/identity/Identity';
import { ColorAdjLabel } from '../components/identity/Identity';
import { useAppStore } from '../hooks/useAppStore';
import { trackPerson } from '../hooks/useAppStore';
import { leaveMatchQueue } from '../lib/db';
import { analytics } from '../lib/analytics';

type Props = NativeStackScreenProps<RootStackParamList, 'Match'>;

export default function MatchScreen({ navigation, route }: Props) {
  const { direction, lang, identityKind } = useAppStore();
  const p = DIRECTIONS[direction];
  const { fromSeed: otherSeed, moodText, conversationId } = route.params;
  const cardScale = useRef(new Animated.Value(0.92)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const acceptPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(cardScale, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
      Animated.timing(cardOpacity, { toValue: 1, duration: 400, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(acceptPulse, { toValue: 1.02, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(acceptPulse, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <VaporBackground p={p} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.container}>
          {/* Header */}
          <FadeInUp delay={0} distance={12}>
            <View style={styles.header}>
              <Text style={[styles.title, { color: p.ink }]}>{t('matchHeader', lang)}</Text>
              <Text style={[styles.titleAlt, { color: p.ink }]}>{tAlt('matchHeader', lang)}</Text>
            </View>
          </FadeInUp>

          {/* Their identity card */}
          <Animated.View style={{ transform: [{ scale: cardScale }], opacity: cardOpacity }}>
            <GlassCard p={p} padding={28} radius={32} style={styles.card}>
              <View style={styles.identityBlock}>
                <Identity kind={identityKind === 'character' ? 'sigil' : identityKind}
                  seed={otherSeed} size={88} palette={p} lang={lang} trust={0.2} />
                <ColorAdjLabel seed={otherSeed} lang={lang} palette={p} />
              </View>

              <View style={[styles.moodBox, { borderTopColor: p.line }]}>
                <Text style={[styles.subhead, { color: p.muted }]}>{t('matchSubhead', lang)}</Text>
                <Text style={[styles.moodText, { color: p.ink }]}>
                  {moodText ? `「${moodText}」` : (lang === 'en' ? '(no mood shared)' : '（未分享心情）')}
                </Text>
              </View>
            </GlassCard>
          </Animated.View>

          {/* Time / hint */}
          <FadeInUp delay={300} distance={8}>
            <View style={styles.hints}>
              <Text style={[styles.hint, { color: p.muted }]}>⏱ {t('matchTime', lang)}</Text>
              <Text style={[styles.hint, { color: p.muted }]}>· {t('matchHint', lang)}</Text>
            </View>
          </FadeInUp>

          {/* Actions */}
          <View style={styles.actions}>
            <FadeInUp delay={400} distance={10}>
              <Animated.View style={{ transform: [{ scale: acceptPulse }] }}>
                <SoftButton p={p} variant="primary" size="lg" full
                  onPress={async () => {
                    await trackPerson();
                    analytics.matchAccept();
                    await leaveMatchQueue();
                    navigation.replace('Chat', { otherSeed, conversationId });
                  }}>
                  <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 16, color: p.dark ? '#1a1530' : '#fff' }}>
                    {t('matchAccept', lang)}
                  </Text>
                </SoftButton>
              </Animated.View>
            </FadeInUp>
            <FadeInUp delay={500} distance={8}>
              <TouchableOpacity
                onPress={async () => { analytics.matchDecline(); await leaveMatchQueue(); navigation.goBack(); }}
                style={styles.decline}
              >
                <Text style={[styles.declineText, { color: p.muted }]}>{t('matchDecline', lang)}</Text>
              </TouchableOpacity>
            </FadeInUp>
          </View>
        </View>
      </SafeAreaView>
    </VaporBackground>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, padding: 28, justifyContent: 'space-between' },
  header:       { gap: 4, marginTop: 24 },
  title:        { fontFamily: 'NotoSerifTC-Regular', fontSize: 32, lineHeight: 42 },
  titleAlt:     { fontFamily: 'EBGaramond-Italic', fontSize: 14, opacity: 0.4 },
  card:         { marginTop: 32 },
  identityBlock:{ alignItems: 'center', gap: 16, paddingBottom: 20 },
  moodBox:      { borderTopWidth: 0.5, paddingTop: 20, gap: 10 },
  subhead:      { fontFamily: 'Inter-Regular', fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase' },
  moodText:     { fontFamily: 'NotoSerifTC-Regular', fontSize: 17, lineHeight: 28 },
  hints:        { gap: 6, alignItems: 'center', marginTop: 24 },
  hint:         { fontFamily: 'NotoSerifTC-Regular', fontSize: 13 },
  actions:      { gap: 12 },
  decline:      { alignItems: 'center', paddingVertical: 8 },
  declineText:  { fontFamily: 'NotoSerifTC-Regular', fontSize: 14 },
});
