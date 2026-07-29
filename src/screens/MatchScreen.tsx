import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing, Alert } from 'react-native';
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

type Props = NativeStackScreenProps<RootStackParamList, 'Match'>;

export default function MatchScreen({ navigation, route }: Props) {
  const { direction, lang, identityKind } = useAppStore();
  const p = DIRECTIONS[direction];
  const { fromSeed: otherSeed, moodText, conversationId, isOperator, otherGender, otherAge, otherTonightMode } = route.params;
  const genderLabel = otherGender === 'female' ? (lang === 'en' ? 'Woman' : '女生')
    : otherGender === 'male' ? (lang === 'en' ? 'Man' : '男生')
    : otherGender === 'nonbinary' ? (lang === 'en' ? 'Non-binary' : '非二元') : null;
  const aboutLine = [genderLabel, otherAge].filter(Boolean).join(' · ');
  const modeLabel = otherTonightMode === 'just_here' ? (lang === 'en' ? '🕯 Just here' : '🕯 只想待著')
    : otherTonightMode === 'want_to_talk' ? (lang === 'en' ? '💬 Wants to talk' : '💬 想說說話')
    : otherTonightMode === 'open_to_more' ? (lang === 'en' ? '🌊 Open to more' : '🌊 願意靠近一點')
    : null;
  const cardScale = useRef(new Animated.Value(0.92)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const acceptPulse = useRef(new Animated.Value(1)).current;
  const haloPulse = useRef(new Animated.Value(0.6)).current;
  const [decisionBusy, setDecisionBusy] = useState(false);
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
    Animated.parallel([
      Animated.spring(cardScale, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
      Animated.timing(cardOpacity, { toValue: 1, duration: 400, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();

    // A slow glow behind the stranger's sigil — presence, warmth, "someone is here".
    Animated.loop(
      Animated.sequence([
        Animated.timing(haloPulse, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(haloPulse, { toValue: 0.6, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();

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
                  <View style={{ marginTop: 6, paddingHorizontal: 14, paddingVertical: 5, borderRadius: 999, backgroundColor: p.surface, borderWidth: 0.5, borderColor: p.line }}>
                    <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 13, color: p.ink }}>{modeLabel}</Text>
                  </View>
                ) : null}
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

          {/* Reassurance — accepting & leaving are free; a match only counts when you speak */}
          <Text style={{ fontFamily: 'EBGaramond-Italic', fontSize: 12.5, color: p.muted, textAlign: 'center', marginBottom: 12 }}>
            {!isOperator && matchCostsWick()
              ? (lang === 'en' ? 'Free to enter · a match counts only when you speak (1 wick)' : '進去免費 · 開口說話才算一次配對（1 燭芯）')
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
        </View>
      </SafeAreaView>
    </VaporBackground>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, padding: 28, justifyContent: 'space-between', width: '100%', maxWidth: 560, alignSelf: 'center' },
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
