import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import { DIRECTIONS } from '../lib/theme';
import { t, tAlt } from '../lib/copy';
import { VaporBackground, GlassCard, SoftButton, FadeInUp } from '../components/ui';
import { Identity } from '../components/identity/Identity';
import { ColorAdjLabel } from '../components/identity/Identity';
import { useAppStore, matchCostsWick } from '../hooks/useAppStore';
import { trackPerson } from '../hooks/useAppStore';
import { leaveMatchQueue, endConversation, subscribeToConversationEnded } from '../lib/db';
import { analytics } from '../lib/analytics';
import { MOTION, USE_NATIVE_DRIVER, useReduceMotion } from '../lib/motion';

type Props = NativeStackScreenProps<RootStackParamList, 'Match'>;

export default function MatchScreen({ navigation, route }: Props) {
  const { direction, lang, identityKind } = useAppStore();
  const p = DIRECTIONS[direction];
  const {
    fromSeed: otherSeed,
    moodText,
    conversationId,
    isOperator,
    otherGender,
    otherAge,
    otherTonightMode,
    myTonightMode,
  } = route.params;
  const genderLabel = otherGender === 'female' ? (lang === 'en' ? 'Woman' : '女生')
    : otherGender === 'male' ? (lang === 'en' ? 'Man' : '男生')
    : null;
  const aboutLine = [genderLabel, otherAge].filter(Boolean).join(' · ');
  const modeLabel = otherTonightMode === 'just_here' ? (lang === 'en' ? 'Just here' : '只想待著')
    : otherTonightMode === 'want_to_talk' ? (lang === 'en' ? 'Wants to talk' : '想說說話')
    : otherTonightMode === 'open_to_more' ? (lang === 'en' ? 'Open to more' : '願意靠近一點')
    : null;
  const sharedMode = !!otherTonightMode && otherTonightMode === myTonightMode;
  const cardScale = useRef(new Animated.Value(0.92)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const acceptPulse = useRef(new Animated.Value(1)).current;
  const haloPulse = useRef(new Animated.Value(0.6)).current;
  const [decisionBusy, setDecisionBusy] = useState(false);
  const reduceMotion = useReduceMotion();
  // Set once I've accepted/declined, so the "they left" watcher below doesn't
  // fire off my own action or after I've navigated away.
  const iActedRef = useRef(false);

  // If the other person declines or leaves before I decide, the conversation gets
  // ended — so I'm not left staring at (or entering an empty chat with) a match
  // that's already gone.
  useEffect(() => {
    if (!conversationId) return;
    return subscribeToConversationEnded(conversationId, reason => {
      if (!reason || iActedRef.current) return;
      iActedRef.current = true;
      leaveMatchQueue();
      Alert.alert(
        lang === 'en' ? 'They stepped away' : '對方先離開了',
        lang === 'en' ? 'No wick was used. Try again — someone else may be waiting.' : '沒有扣任何燭芯。再試一次，也許有別人在等。',
        [{ text: lang === 'en' ? 'OK' : '好', onPress: () => navigation.goBack() }],
      );
    });
  }, [conversationId]);

  useEffect(() => {
    if (reduceMotion) {
      cardScale.setValue(1);
      cardOpacity.setValue(1);
      haloPulse.setValue(0.8);
      acceptPulse.setValue(1);
      return;
    }
    const intro = Animated.parallel([
      Animated.spring(cardScale, { toValue: 1, tension: 60, friction: 8, useNativeDriver: USE_NATIVE_DRIVER }),
      Animated.timing(cardOpacity, { toValue: 1, duration: MOTION.reveal, easing: MOTION.easeOut, useNativeDriver: USE_NATIVE_DRIVER }),
    ]);
    intro.start();

    // A slow glow behind the stranger's sigil — presence, warmth, "someone is here".
    const halo = Animated.loop(
      Animated.sequence([
        Animated.timing(haloPulse, { toValue: 1, duration: MOTION.breathe, easing: MOTION.easeInOut, useNativeDriver: USE_NATIVE_DRIVER }),
        Animated.timing(haloPulse, { toValue: 0.6, duration: MOTION.breathe, easing: MOTION.easeInOut, useNativeDriver: USE_NATIVE_DRIVER }),
      ])
    );
    halo.start();

    const cta = Animated.loop(
      Animated.sequence([
        Animated.timing(acceptPulse, { toValue: 1.015, duration: 1400, easing: MOTION.easeInOut, useNativeDriver: USE_NATIVE_DRIVER }),
        Animated.timing(acceptPulse, { toValue: 1, duration: 1400, easing: MOTION.easeInOut, useNativeDriver: USE_NATIVE_DRIVER }),
      ])
    );
    cta.start();
    return () => {
      intro.stop();
      halo.stop();
      cta.stop();
    };
  }, [acceptPulse, cardOpacity, cardScale, haloPulse, reduceMotion]);

  return (
    <VaporBackground p={p} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Header */}
          <FadeInUp delay={0} distance={12}>
            <View style={styles.header}>
              <View style={[styles.encounterPill, { backgroundColor: p.accentSoft, borderColor: p.accent + '30' }]}>
                <View style={[styles.encounterDot, { backgroundColor: p.accent }]} />
                <Text style={[styles.encounterText, { color: p.accent }]}>
                  {lang === 'en' ? 'A PRIVATE ENCOUNTER' : '一場私密的相遇'}
                </Text>
              </View>
              <Text style={[styles.title, { color: p.ink }]}>{t('matchHeader', lang)}</Text>
              <Text style={[styles.titleAlt, { color: p.ink }]}>{tAlt('matchHeader', lang)}</Text>
            </View>
          </FadeInUp>

          {/* Their identity card */}
          <Animated.View style={{ transform: [{ scale: cardScale }], opacity: cardOpacity }}>
            <GlassCard p={p} padding={28} radius={32} style={styles.card}>
              <View style={styles.identityBlock}>
                <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                  <Animated.View style={{
                    position: 'absolute', width: 132, height: 132, borderRadius: 66,
                    backgroundColor: p.accent, opacity: haloPulse.interpolate({ inputRange: [0.6, 1], outputRange: [0.08, 0.2] }),
                    transform: [{ scale: haloPulse }],
                  }} />
                  <Identity kind={identityKind === 'character' ? 'sigil' : identityKind}
                    seed={otherSeed} size={88} palette={p} lang={lang} trust={0.2} />
                </View>
                <ColorAdjLabel seed={otherSeed} lang={lang} palette={p} />
                {aboutLine ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999, backgroundColor: p.accentSoft }}>
                    <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 13, color: p.accent }}>{aboutLine}</Text>
                  </View>
                ) : null}
                {modeLabel ? (
                  <View style={styles.modePill}>
                    <View style={[styles.modeDot, { backgroundColor: p.accent }]} />
                    <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 12.5, color: p.ink }}>{modeLabel}</Text>
                  </View>
                ) : null}
              </View>

              <View style={[styles.moodBox, { borderTopColor: p.line }]}>
                {modeLabel ? (
                  <View style={[styles.matchReason, { backgroundColor: p.accentSoft, borderColor: p.accent + '35' }]}>
                    <Text style={[styles.matchReasonLabel, { color: p.accent }]}>
                      {lang === 'en' ? 'TONIGHT’S SIGNAL' : '這次相遇的線索'}
                    </Text>
                    <Text style={[styles.matchReasonText, { color: p.inkSoft }]}>
                      {sharedMode
                        ? (lang === 'en'
                            ? `You both chose “${modeLabel}” tonight.`
                            : `你們今晚都選擇了「${modeLabel}」。`)
                        : (lang === 'en'
                            ? `They chose “${modeLabel}” tonight. You can still skip freely.`
                            : `對方今晚選擇「${modeLabel}」。不合適可以直接略過。`)}
                    </Text>
                  </View>
                ) : null}
                <Text style={[styles.subhead, { color: p.muted }]}>{t('matchSubhead', lang)}</Text>
                <Text style={[styles.moodText, { color: p.ink }]}>
                  {moodText ? `「${moodText}」` : (lang === 'en' ? 'They came quietly, without leaving a line.' : '對方安靜地來了，沒有留下心情。')}
                </Text>
              </View>
            </GlassCard>
          </Animated.View>

          {/* Time / hint */}
          <FadeInUp delay={300} distance={8}>
            <View style={styles.hints}>
              <View style={[styles.hintPill, { backgroundColor: p.surface, borderColor: p.line }]}>
                <Text style={[styles.hintStrong, { color: p.ink }]}>30</Text>
                <Text style={[styles.hint, { color: p.muted }]}>{lang === 'en' ? 'minutes' : '分鐘'}</Text>
              </View>
              <View style={[styles.hintPill, { backgroundColor: p.surface, borderColor: p.line }]}>
                <Text style={[styles.hintStrong, { color: p.ink }]}>0</Text>
                <Text style={[styles.hint, { color: p.muted }]}>{lang === 'en' ? 'names & photos' : '姓名與照片'}</Text>
              </View>
            </View>
          </FadeInUp>

          {/* Reassurance — accepting & leaving are free; a match only counts when you speak */}
          <Text style={{ fontFamily: 'EBGaramond-Italic', fontSize: 12.5, lineHeight: 18, color: p.muted, textAlign: 'center', marginTop: 16, marginBottom: 12 }}>
            {!isOperator && matchCostsWick()
              ? (lang === 'en' ? 'Free to enter · the 1-on-1 counts only when you speak (1 wick)' : '進去免費 · 開口說話才算一次一對一（1 燭芯）')
              : (lang === 'en' ? "Don't feel it? Just leave — no cost, no pressure." : '沒感覺？直接離開就好 — 不扣任何東西，沒有壓力。')}
          </Text>

          {/* Actions */}
          <View style={styles.actions}>
            <FadeInUp delay={400} distance={10}>
              <Animated.View style={{ transform: [{ scale: acceptPulse }] }}>
                <SoftButton p={p} variant="primary" size="lg" full
                  disabled={decisionBusy}
                  onPress={async () => {
                    if (decisionBusy) return;
                    setDecisionBusy(true);
                    iActedRef.current = true;
                    try {
                      await trackPerson();
                      analytics.matchAccept();
                      // Charge moves to the first message sent (so neither side pays
                      // for an empty chat if the other never shows up).
                      await leaveMatchQueue();
                      navigation.replace('Chat', { otherSeed, conversationId, matchCharge: !isOperator });
                    } catch {
                      iActedRef.current = false;
                      setDecisionBusy(false);
                      Alert.alert(
                        lang === 'en' ? 'Could not enter' : '暫時進不去',
                        lang === 'en' ? 'Check your connection and try again.' : '請確認網路後再試一次。',
                      );
                    }
                  }}>
                  <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 16, color: p.dark ? '#1a1530' : '#fff' }}>
                    {decisionBusy ? (lang === 'en' ? 'Entering…' : '正在進入⋯') : t('matchAccept', lang)}
                  </Text>
                </SoftButton>
              </Animated.View>
            </FadeInUp>
            <FadeInUp delay={500} distance={8}>
              <TouchableOpacity
                disabled={decisionBusy}
                accessibilityRole="button"
                accessibilityLabel={lang === 'en' ? 'Not this conversation' : '略過這次對話'}
                accessibilityState={{ disabled: decisionBusy }}
                onPress={async () => {
                  if (decisionBusy) return;
                  setDecisionBusy(true);
                  iActedRef.current = true;
                  try {
                    analytics.matchDecline();
                    // Tell the other side the match fell through (they may be on this
                    // same screen or already waiting in the chat).
                    if (conversationId) await endConversation(conversationId, 'declined');
                    await leaveMatchQueue();
                    navigation.goBack();
                  } catch {
                    iActedRef.current = false;
                    setDecisionBusy(false);
                    Alert.alert(
                      lang === 'en' ? 'Could not leave' : '暫時無法離開',
                      lang === 'en' ? 'Check your connection and try again.' : '請確認網路後再試一次。',
                    );
                  }
                }}
                style={[styles.decline, { opacity: decisionBusy ? 0.4 : 1 }]}
              >
                <Text style={[styles.declineText, { color: p.muted }]}>{t('matchDecline', lang)}</Text>
              </TouchableOpacity>
            </FadeInUp>
          </View>
        </ScrollView>
      </SafeAreaView>
    </VaporBackground>
  );
}

const styles = StyleSheet.create({
  container:    { flexGrow: 1, paddingHorizontal: 24, paddingTop: 20, paddingBottom: 22, width: '100%', maxWidth: 560, alignSelf: 'center' },
  header:       { gap: 5, alignItems: 'center' },
  encounterPill:{ flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, borderWidth: 0.5, paddingHorizontal: 10, paddingVertical: 5, marginBottom: 8 },
  encounterDot: { width: 4, height: 4, borderRadius: 2 },
  encounterText:{ fontFamily: 'Inter-Regular', fontSize: 9, letterSpacing: 1.7, fontWeight: '500' },
  title:        { fontFamily: 'NotoSerifTC-Light', fontSize: 30, lineHeight: 40, textAlign: 'center' },
  titleAlt:     { fontFamily: 'EBGaramond-Italic', fontSize: 13, opacity: 0.48 },
  card:         { marginTop: 26, shadowOpacity: 0.12 },
  identityBlock:{ alignItems: 'center', gap: 13, paddingBottom: 20 },
  modePill:     { marginTop: 2, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999, flexDirection: 'row', alignItems: 'center', gap: 7 },
  modeDot:      { width: 5, height: 5, borderRadius: 3 },
  moodBox:      { borderTopWidth: 0.5, paddingTop: 20, gap: 10 },
  matchReason:  { borderRadius: 14, borderWidth: 0.7, padding: 12, marginBottom: 2 },
  matchReasonLabel:{ fontFamily: 'Inter-Regular', fontSize: 9, letterSpacing: 1.5, fontWeight: '600' },
  matchReasonText:{ fontFamily: 'NotoSerifTC-Regular', fontSize: 12, lineHeight: 19, marginTop: 4 },
  subhead:      { fontFamily: 'Inter-Regular', fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase' },
  moodText:     { fontFamily: 'NotoSerifTC-Regular', fontSize: 16.5, lineHeight: 28 },
  hints:        { flexDirection: 'row', gap: 8, justifyContent: 'center', marginTop: 18 },
  hintPill:     { minWidth: 118, borderRadius: 16, borderWidth: 0.5, paddingHorizontal: 14, paddingVertical: 10, alignItems: 'center' },
  hintStrong:   { fontFamily: 'EBGaramond-Regular', fontSize: 18, lineHeight: 20 },
  hint:         { fontFamily: 'NotoSerifTC-Regular', fontSize: 10.5, marginTop: 2 },
  actions:      { gap: 10, marginTop: 12 },
  decline:      { alignItems: 'center', paddingVertical: 8 },
  declineText:  { fontFamily: 'NotoSerifTC-Regular', fontSize: 14 },
});
