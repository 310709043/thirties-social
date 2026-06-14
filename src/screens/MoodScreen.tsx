import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import { DIRECTIONS } from '../lib/theme';
import { t, tAlt } from '../lib/copy';
import {
  VaporBackground, GlassCard, SoftButton, BreathDot, Cap, WickGlyph, AnimatedNumber,
  FadeInUp, PressableScale, Tooltip,
} from '../components/ui';
import { hapticSuccess, hapticMedium } from '../lib/haptics';
import { Identity } from '../components/identity/Identity';
import { ColorAdjLabel } from '../components/identity/Identity';
import { useAppStore, checkAndClaimDailyReward, setLang, canStartConversation } from '../hooks/useAppStore';
import { subscribeToActiveRooms, DbRoom, joinMatchQueue, leaveMatchQueue, subscribeToMyMatch, tryFindMatch } from '../lib/db';
import { analytics } from '../lib/analytics';
import { LinearGradient } from 'expo-linear-gradient';

type Props = NativeStackScreenProps<RootStackParamList, 'Mood'>;

const SUGGESTED_ROOMS = [
  'room_partner', 'room_lonely', 'room_doubt',
  'room_cant_sleep', 'room_quiet', 'room_transition',
] as const;

export default function MoodScreen({ navigation }: Props) {
  const { seed, direction, lang, identityKind, wicks } = useAppStore();
  const p = DIRECTIONS[direction];
  const [text, setText] = useState('');
  const [timeStr, setTimeStr] = useState('');
  const [rooms, setRooms] = useState<DbRoom[]>([]);
  const [waiting, setWaiting] = useState(false);
  const [waitingDots, setWaitingDots] = useState('');

  useEffect(() => { return subscribeToActiveRooms(setRooms); }, []);

  useEffect(() => {
    checkAndClaimDailyReward().then(r => {
      if (r.rewarded && r.amount) {
        hapticSuccess();
        Alert.alert('', `🕯 每日燭芯 +${r.amount}`, [{ text: '收下', style: 'default' }]);
      }
    });
  }, []);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const reset = new Date(now);
      reset.setHours(27, 0, 0, 0);
      let diff = (reset.getTime() - now.getTime()) / 1000;
      if (diff < 0) diff += 86400;
      const h = String(Math.floor(diff / 3600)).padStart(2, '0');
      const m = String(Math.floor((diff % 3600) / 60)).padStart(2, '0');
      const s = String(Math.floor(diff % 60)).padStart(2, '0');
      setTimeStr(`${h}:${m}:${s}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Waiting dots animation
  useEffect(() => {
    if (!waiting) return;
    const id = setInterval(() => {
      setWaitingDots(d => d.length >= 3 ? '' : d + '.');
    }, 600);
    return () => clearInterval(id);
  }, [waiting]);

  // Subscribe to match queue when waiting
  useEffect(() => {
    if (!waiting) return;
    const unsub = subscribeToMyMatch(entry => {
      if (entry?.status === 'matched' && entry.matchedSeed && entry.conversationId) {
        hapticMedium();
        analytics.matchFound();
        setWaiting(false);
        navigation.push('Match', {
          fromSeed: entry.matchedSeed,
          moodText: entry.matchedMoodText ?? '',
          conversationId: entry.conversationId,
        });
      }
    });
    return unsub;
  }, [waiting]);

  const handleEnter = async () => {
    if (waiting) return;
    if (!canStartConversation()) {
      Alert.alert(
        lang === 'en' ? 'Daily limit reached' : '\u4ECA\u65E5\u5C0D\u8A71\u5DF2\u9054\u4E0A\u9650',
        lang === 'en'
          ? 'Free accounts can start 3 conversations per day. Upgrade to Vigil for unlimited.'
          : '\u514D\u8CBB\u5E33\u865F\u6BCF\u65E5\u6700\u591A 3 \u6BB5\u5C0D\u8A71\u3002\u5347\u7D1A\u5B88\u591C\u4EBA\u53EF\u89E3\u9664\u9650\u5236\u3002',
        [
          { text: lang === 'en' ? 'OK' : '\u77E5\u9053\u4E86', style: 'cancel' },
          { text: lang === 'en' ? 'Upgrade' : '\u5347\u7D1A', onPress: () => navigation.push('Upgrade') },
        ],
      );
      return;
    }
    setWaiting(true);
    analytics.matchSearch(text.length);
    const joined = await joinMatchQueue({ moodText: text || undefined, seed });
    if (!joined) { setWaiting(false); return; }
    // Try to find a match immediately
    const found = await tryFindMatch();
    // If not found, we stay waiting and the subscription will handle it
    if (!found) {
      // Retry after a short delay in case someone joins right after
      setTimeout(() => tryFindMatch(), 5000);
    }
  };

  const handleCancelWait = async () => {
    setWaiting(false);
    await leaveMatchQueue();
  };

  return (
    <VaporBackground p={p} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <Tooltip
          id="mood_welcome"
          title={lang === 'en' ? 'Welcome to The Other' : '歡迎來到第卅者'}
          message={lang === 'en'
            ? 'Write how you feel tonight. Tap a room to join a conversation. Every 24 hours, everything resets.'
            : '寫下今晚的心情。點擊房間加入對話。每 24 小時，一切都會重置。'}
          position="top"
          delay={800}
        />
        <ScrollView
          contentContainerStyle={[styles.container]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* TOP ROW */}
          <FadeInUp delay={0} distance={8}>
            <View style={styles.topRow}>
              <TouchableOpacity style={styles.identityRow} activeOpacity={0.8}
                onPress={() => navigation.push('Profile')}>
                <Identity kind={identityKind} seed={seed} size={36} palette={p} lang={lang} trust={0.2} />
                <View>
                  <Text style={[styles.youTonight, { color: p.muted }]}>
                    {lang === 'en' ? 'You, tonight' : '你·今晚'}
                  </Text>
                  <ColorAdjLabel seed={seed} lang={lang} palette={p} />
                </View>
              </TouchableOpacity>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <TouchableOpacity onPress={() => setLang(lang === 'en' ? 'zh' : 'en')}
                  style={[styles.langBtn, { backgroundColor: p.surface, borderColor: p.line }]}>
                  <Text style={{ fontFamily: 'Inter-Regular', fontSize: 11, color: p.muted, fontWeight: '500' }}>
                    {lang === 'en' ? 'EN' : '中'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => navigation.push('Upgrade')}
                  style={[styles.wicksBtn, { backgroundColor: p.accentSoft, borderColor: p.accent + '40' }]}>
                  <WickGlyph size={11} color={p.accent} />
                  <AnimatedNumber value={wicks} style={{ fontFamily: 'Inter-Regular', fontSize: 13, color: p.accent, fontWeight: '500' }} />
                </TouchableOpacity>
                <View style={styles.countdown}>
                  <Text style={[styles.countdownText, { color: p.muted }]}>{timeStr}</Text>
                </View>
              </View>
            </View>
          </FadeInUp>

          {/* HEADING */}
          <FadeInUp delay={80} distance={14}>
            <View style={styles.heading}>
              <Text style={[styles.headingMain, { color: p.ink }]}>{t('moodHeader', lang)}</Text>
              <Text style={[styles.headingAlt, { color: p.ink }]}>{tAlt('moodHeader', lang)}</Text>
            </View>
          </FadeInUp>

          <FadeInUp delay={140} distance={10}>
            <Text style={[styles.prompt, { color: p.muted }]}>{t('moodPrompt', lang)}</Text>
          </FadeInUp>

          {/* TEXT INPUT */}
          <FadeInUp delay={200} distance={12}>
            <GlassCard p={p} padding={20} radius={24} style={styles.inputCard}>
              <TextInput
                value={text}
                onChangeText={setText}
                placeholder={t('moodPlaceholder', lang)}
                placeholderTextColor={p.muted}
                multiline
                numberOfLines={3}
                style={[styles.textInput, { color: p.ink }]}
              />
              <View style={styles.inputFooter}>
                <Text style={[styles.inputHint, { color: p.muted }]}>
                  {lang === 'en' ? 'private to you' : '只有你看得到'}
                </Text>
                <Text style={[styles.inputCount, { color: p.muted }]}>{text.length}/280</Text>
              </View>
            </GlassCard>
          </FadeInUp>

          {/* SUGGESTED ROOMS */}
          <FadeInUp delay={280} distance={10}>
            <Cap p={p} style={styles.cap}>
              {t('moodSuggested', lang)} · {tAlt('moodSuggested', lang).toLowerCase()}
            </Cap>
          </FadeInUp>
          <View style={styles.chips}>
            {SUGGESTED_ROOMS.map((rk, i) => (
              <FadeInUp key={rk} delay={320 + i * 50} distance={8}>
                <PressableScale onPress={() => navigation.push('Room', { roomKey: rk })}>
                  <View style={[styles.chip, { backgroundColor: p.surface, borderColor: p.line }]}>
                    <BreathDot p={p} size={5} />
                    <Text style={[styles.chipText, { color: p.ink }]}>{t(rk, lang)}</Text>
                    <View style={[styles.chipCount, { backgroundColor: p.accentSoft }]}>
                      <Text style={[styles.chipCountText, { color: p.accent }]}>{rooms.find(r => r.roomKey === rk)?.messageCount ?? 0}</Text>
                    </View>
                  </View>
                </PressableScale>
              </FadeInUp>
            ))}
          </View>

          {/* LOFT BANNER */}
          <FadeInUp delay={640} distance={12}>
            <PressableScale onPress={() => navigation.push('Loft')}>
              <LinearGradient
                colors={['#1f1014', '#2d161c', '#3a1e24']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={styles.loftBanner}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 16, color: '#f5e2c4', fontWeight: '500' }}>
                    {lang === 'en' ? 'The Loft' : '夜閣'}
                  </Text>
                  <Text style={{ fontFamily: 'EBGaramond-Italic', fontSize: 12, color: 'rgba(245,226,196,0.6)', marginTop: 2 }}>
                    {lang === 'en' ? 'opens midnight · face to face · veiled' : '午夜開啟 · 面對面 · 帶紗'}
                  </Text>
                </View>
                <View style={{ alignItems: 'center', gap: 4 }}>
                  <WickGlyph size={18} color="#e8a557" />
                  <Text style={{ fontFamily: 'Inter-Regular', fontSize: 9, letterSpacing: 2, color: 'rgba(232,165,87,0.7)', textTransform: 'uppercase' }}>
                    {lang === 'en' ? 'enter' : '進入'}
                  </Text>
                </View>
              </LinearGradient>
            </PressableScale>
          </FadeInUp>

          {/* FOOTER */}
          <FadeInUp delay={720} distance={12}>
            <View style={styles.footer}>
              {waiting ? (
                <>
                  <View style={[styles.waitingBox, { backgroundColor: p.surface, borderColor: p.line }]}>
                    <BreathDot p={p} size={8} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 15, color: p.ink }}>
                        {lang === 'en' ? `Looking for someone${waitingDots}` : `正在尋找對象${waitingDots}`}
                      </Text>
                      <Text style={{ fontFamily: 'EBGaramond-Italic', fontSize: 11, color: p.muted, marginTop: 2 }}>
                        {lang === 'en' ? 'you will be matched shortly' : '配對成功時會自動進入'}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={handleCancelWait} style={styles.skip}>
                    <Text style={[styles.skipText, { color: p.muted }]}>
                      {lang === 'en' ? 'cancel' : '取消等待'}
                    </Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <SoftButton p={p} variant="primary" size="lg" full onPress={handleEnter}>
                    <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 16, color: p.dark ? '#1a1530' : '#fff' }}>
                      {t('moodEnter', lang)}
                      <Text style={{ opacity: 0.55, fontStyle: 'italic', fontSize: 13 }}>
                        {' '}· {tAlt('moodEnter', lang).toLowerCase()}
                      </Text>
                    </Text>
                  </SoftButton>
                  <TouchableOpacity onPress={handleEnter} style={styles.skip}>
                    <Text style={[styles.skipText, { color: p.muted }]}>{t('moodSkip', lang)}</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </FadeInUp>
        </ScrollView>
      </SafeAreaView>
    </VaporBackground>
  );
}

const styles = StyleSheet.create({
  container:     { padding: 24, paddingTop: 12, paddingBottom: 40, gap: 0 },
  topRow:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 36 },
  identityRow:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  youTonight:    { fontFamily: 'Inter-Regular', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2 },
  countdown:     { flexDirection: 'row', alignItems: 'center', gap: 6 },
  countdownText: { fontFamily: 'Inter-Regular', fontSize: 12, letterSpacing: 1 },
  heading:       { gap: 4, marginBottom: 14 },
  headingMain:   { fontFamily: 'NotoSerifTC-Light', fontSize: 34, lineHeight: 44 },
  headingAlt:    { fontFamily: 'EBGaramond-Italic', fontSize: 15, opacity: 0.4 },
  prompt:        { fontFamily: 'NotoSerifTC-Regular', fontSize: 14, lineHeight: 22, maxWidth: 320, marginBottom: 22 },
  inputCard:     { marginBottom: 24 },
  textInput:     { fontFamily: 'NotoSerifTC-Regular', fontSize: 17, lineHeight: 28, minHeight: 80 },
  inputFooter:   { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  inputHint:     { fontFamily: 'Inter-Regular', fontSize: 11, opacity: 0.7 },
  inputCount:    { fontFamily: 'Inter-Regular', fontSize: 11 },
  cap:           { marginBottom: 12 },
  chips:         { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  chip:          { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 999, borderWidth: 0.5 },
  chipText:      { fontFamily: 'NotoSerifTC-Regular', fontSize: 13 },
  chipCount:     { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  chipCountText: { fontFamily: 'Inter-Regular', fontSize: 10 },
  footer:        { gap: 10, marginTop: 8 },
  waitingBox:    { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18, borderRadius: 20, borderWidth: 0.5 },
  skip:          { alignItems: 'center', paddingVertical: 6 },
  skipText:      { fontFamily: 'NotoSerifTC-Regular', fontSize: 13 },
  wicksBtn:      { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, borderWidth: 0.5 },
  langBtn:       { width: 30, height: 30, borderRadius: 15, borderWidth: 0.5, alignItems: 'center', justifyContent: 'center' },
  loftBanner:    { flexDirection: 'row', alignItems: 'center', padding: 18, borderRadius: 20, gap: 12 },
});
