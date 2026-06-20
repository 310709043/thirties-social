import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import { DIRECTIONS } from '../lib/theme';
import { t } from '../lib/copy';
import {
  VaporBackground, SoftButton, BreathDot, WickGlyph, AnimatedNumber,
} from '../components/ui';
import { hapticSuccess, hapticMedium } from '../lib/haptics';
import { Identity } from '../components/identity/Identity';
import { ColorAdjLabel } from '../components/identity/Identity';
import { useAppStore, checkAndClaimDailyReward, setLang, canMatch, getTier, matchCostsWick, MATCH_WICK_COST } from '../hooks/useAppStore';
import { subscribeToActiveRooms, DbRoom, joinMatchQueue, leaveMatchQueue, subscribeToMyMatch, tryFindMatch } from '../lib/db';
import { analytics } from '../lib/analytics';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Props = NativeStackScreenProps<RootStackParamList, 'Mood'>;

export default function MoodScreen({ navigation }: Props) {
  const { seed, direction, lang, identityKind, wicks, gender, ageBracket } = useAppStore();
  const p = DIRECTIONS[direction];
  const [text, setText] = useState('');
  const [timeStr, setTimeStr] = useState('');
  const [rooms, setRooms] = useState<DbRoom[]>([]);
  const [waiting, setWaiting] = useState(false);
  const [waitingDots, setWaitingDots] = useState('');
  const matchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // First-time guide so new users know what the three spaces are.
  const [showGuide, setShowGuide] = useState(false);
  useEffect(() => { AsyncStorage.getItem('mainGuideSeen').then(v => { if (v !== '1') setShowGuide(true); }); }, []);
  const dismissGuide = () => { setShowGuide(false); AsyncStorage.setItem('mainGuideSeen', '1'); };

  // Show rooms that have any activity, OR were opened recently (so a freshly
  // created room stays visible even before the first message is sent).
  const ROOM_FRESH_MS = 60 * 60 * 1000; // 1h grace for empty new rooms
  const roomAgeMs = (r: DbRoom): number => {
    const c: any = r.createdAt;
    const ms = c?.toMillis ? c.toMillis() : (typeof c?.seconds === 'number' ? c.seconds * 1000 : null);
    return ms == null ? 0 : Date.now() - ms;
  };
  const activeRooms = rooms.filter(
    r => (r.messageCount ?? 0) > 0 || roomAgeMs(r) < ROOM_FRESH_MS,
  );

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

  useEffect(() => {
    if (!waiting) return;
    const id = setInterval(() => {
      setWaitingDots(d => d.length >= 3 ? '' : d + '.');
    }, 600);
    return () => clearInterval(id);
  }, [waiting]);

  useEffect(() => {
    if (!waiting) return;
    let matched = false;

    // Keep actively looking for a partner while waiting.
    const retryId = setInterval(() => { if (!matched) tryFindMatch(); }, 5000);

    // Give up after 60s if still unmatched.
    matchTimeoutRef.current = setTimeout(() => {
      if (matched) return;
      setWaiting(false);
      leaveMatchQueue();
      Alert.alert(
        lang === 'en' ? 'No one waiting right now' : '現在沒有人在等配對',
        lang === 'en'
          ? 'No wick was used. Sit by a brazier below — there are usually people there.'
          : '沒有扣任何燭芯。先去下面的火盆待著吧 —— 那裡通常有人。',
        [{ text: lang === 'en' ? 'OK' : '好', style: 'cancel' }],
      );
    }, 60000);

    const unsub = subscribeToMyMatch(entry => {
      // onSnapshot fires immediately with the current (waiting) doc — only act
      // on an actual match, otherwise the timeout would be cleared right away.
      if (entry?.status === 'matched' && entry.matchedSeed && entry.conversationId) {
        matched = true;
        if (matchTimeoutRef.current) clearTimeout(matchTimeoutRef.current);
        clearInterval(retryId);
        hapticMedium();
        analytics.matchFound();
        // Charge moved to the accept step (MatchScreen) — seeing who it is and
        // declining must be free, so women keep control before committing.
        setWaiting(false);
        navigation.push('Match', {
          fromSeed: entry.matchedSeed,
          moodText: entry.matchedMoodText ?? '',
          conversationId: entry.conversationId,
          isOperator: !!(entry as any).isOperator,
          otherGender: (entry as any).matchedGender ?? null,
          otherAge: (entry as any).matchedAge ?? null,
        });
      }
    });
    return () => {
      if (matchTimeoutRef.current) clearTimeout(matchTimeoutRef.current);
      clearInterval(retryId);
      unsub();
      // Leaving the screen while still waiting must remove us from the queue,
      // otherwise others can "ghost-match" with someone no longer waiting.
      if (!matched) leaveMatchQueue();
    };
  }, [waiting]);

  const handleEnter = async () => {
    if (waiting) return;
    // Guests can use rooms but not 1:1 matching.
    if (getTier() === 'guest') {
      Alert.alert(
        lang === 'en' ? 'Create an account to match' : '配對需要先建立帳號',
        lang === 'en'
          ? 'Guests can join rooms. Create an account to start 1-on-1 matching.'
          : '訪客可以參與火盆聊天。建立帳號後即可開始一對一配對。',
        [
          { text: lang === 'en' ? 'Not now' : '稍後', style: 'cancel' },
          { text: lang === 'en' ? 'Create account' : '建立帳號', onPress: () => navigation.push('Auth', { mode: 'register' }) },
        ],
      );
      return;
    }
    // Free user out of free matches and out of wicks.
    if (!canMatch()) {
      Alert.alert(
        lang === 'en' ? 'Out of free matches' : '免費配對已用完',
        lang === 'en'
          ? `You've used your free matches. Each match now costs ${MATCH_WICK_COST} wick — top up, or go Vigil for unlimited.`
          : `免費配對已用完，之後每次配對需 ${MATCH_WICK_COST} 燭芯。可購買燭芯，或升級守夜人享無限配對。`,
        [
          { text: lang === 'en' ? 'OK' : '知道了', style: 'cancel' },
          { text: lang === 'en' ? 'Upgrade' : '升級', onPress: () => navigation.push('Upgrade') },
        ],
      );
      return;
    }
    const costs = matchCostsWick();
    Alert.alert(
      lang === 'en' ? 'Start matching?' : '開始配對？',
      costs
        ? (lang === 'en' ? `This match costs ${MATCH_WICK_COST} wick.` : `這次配對將花 ${MATCH_WICK_COST} 燭芯。`)
        : (lang === 'en' ? 'You can cancel before a match is found.' : '配對成功前可以取消。'),
      [
        { text: lang === 'en' ? 'Cancel' : '取消', style: 'cancel' },
        { text: lang === 'en' ? 'Start' : '開始', onPress: () => startMatching() },
      ],
    );
  };

  const startMatching = async () => {
    setWaiting(true);
    analytics.matchSearch(text.length);
    const joined = await joinMatchQueue({ moodText: text || undefined, seed, gender, ageBracket });
    if (!joined) {
      setWaiting(false);
      Alert.alert(lang === 'en' ? 'Connection issue' : '連線問題', lang === 'en' ? 'Try again.' : '請再試一次。', [{ text: 'OK' }]);
      return;
    }
    // Try once immediately; the waiting effect keeps polling every 5s and
    // listens for being matched by someone else.
    tryFindMatch();
  };

  const handleCancelWait = async () => {
    setWaiting(false);
    await leaveMatchQueue();
  };

  return (
    <VaporBackground p={p} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* ── Top Bar ── */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.identityRow} activeOpacity={0.8}
            onPress={() => navigation.push('Profile')}>
            <Identity kind={identityKind} seed={seed} size={32} palette={p} lang={lang} trust={0.2} />
            <View>
              <Text style={[styles.youLabel, { color: p.muted }]}>
                {lang === 'en' ? 'You, tonight' : '你·今晚'}
              </Text>
              <ColorAdjLabel seed={seed} lang={lang} palette={p} />
            </View>
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity onPress={() => setLang(lang === 'en' ? 'zh' : 'en')}
              style={[styles.langBtn, { backgroundColor: p.surface, borderColor: p.line }]}>
              <Text style={{ fontFamily: 'Inter-Regular', fontSize: 11, color: p.muted }}>{lang === 'en' ? 'EN' : '中'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.push('Upgrade')}
              style={[styles.wicksBtn, { backgroundColor: p.accentSoft, borderColor: p.accent + '40' }]}>
              <WickGlyph size={10} color={p.accent} />
              <AnimatedNumber value={wicks} style={{ fontFamily: 'Inter-Regular', fontSize: 12, color: p.accent }} />
            </TouchableOpacity>
            <Text style={[styles.countdown, { color: p.muted }]}>{timeStr}</Text>
          </View>
        </View>

        {/* ── Main Content ── */}
        <View style={styles.content}>
          {/* Heading + reassuring subline (type hierarchy + grayscale tone) */}
          <Text style={[styles.heading, { color: p.ink }]}>{t('moodHeader', lang)}</Text>
          <Text style={[styles.subheading, { color: p.muted }]}>{t('moodPrompt', lang)}</Text>

          {/* Mood Input */}
          <View style={[styles.inputWrap, { backgroundColor: p.glass, borderColor: p.line }]}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder={t('moodPlaceholder', lang)}
              placeholderTextColor={p.muted}
              multiline
              maxLength={280}
              style={[styles.input, { color: p.ink }]}
            />
            <View style={styles.inputFooter}>
              <Text style={{ fontFamily: 'Inter-Regular', fontSize: 10, color: p.muted }}>
                {lang === 'en' ? 'private' : '只有你看得到'}
              </Text>
              <Text style={{ fontFamily: 'Inter-Regular', fontSize: 10, color: p.muted }}>{text.length}/280</Text>
            </View>
          </View>

          {/* Rooms */}
          <View style={styles.roomsSection}>
            <View style={styles.roomsHeader}>
              <Text style={[styles.roomsLabel, { color: p.muted }]}>
                {lang === 'en' ? 'ROOMS' : '火盆'}
              </Text>
              <TouchableOpacity onPress={() => navigation.push('Room', { roomKey: 'new' })}>
                <Text style={[styles.openRoomLink, { color: p.accent }]}>
                  {lang === 'en' ? '+ open' : '+ 開一個'}
                </Text>
              </TouchableOpacity>
            </View>

            {activeRooms.length > 0 ? (
              <View style={styles.roomsList}>
                {activeRooms.slice(0, 3).map((room) => (
                  <TouchableOpacity
                    key={room.id}
                    onPress={() => navigation.push('Room', { roomKey: room.roomKey ?? 'custom', roomId: room.id })}
                    style={[styles.roomItem, { backgroundColor: p.glass, borderColor: p.line }]}
                    activeOpacity={0.7}
                  >
                    <BreathDot p={p} size={4} />
                    <Text style={[styles.roomTopic, { color: p.ink }]} numberOfLines={1}>
                      {room.customTopicZh || room.customTopicEn
                        || (room.roomKey && !['new', 'custom'].includes(room.roomKey)
                            ? t(room.roomKey as any, lang)
                            : (lang === 'en' ? 'a quiet brazier' : '一個火盆'))}
                    </Text>
                    <Text style={[styles.roomCount, { color: p.muted }]}>
                      {room.messageCount ?? 0}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <Text style={[styles.noRooms, { color: p.muted }]}>
                {lang === 'en' ? 'No rooms yet — start one?' : '還沒有火盆——開一個？'}
              </Text>
            )}
          </View>

          {/* ── The Loft ── */}
          <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.push('Loft')}>
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
          </TouchableOpacity>
        </View>

        {/* ── Bottom: Match Button ── */}
        <View style={styles.bottom}>
          {waiting ? (
            <View style={[styles.waitingBox, { backgroundColor: p.surface, borderColor: p.line }]}>
              <BreathDot p={p} size={6} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 14, color: p.ink }}>
                  {lang === 'en' ? `Finding someone${waitingDots}` : `正在尋找${waitingDots}`}
                </Text>
              </View>
              <TouchableOpacity onPress={handleCancelWait}
                style={[styles.cancelBtn, { backgroundColor: p.danger + '12', borderColor: p.danger + '25' }]}>
                <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 12, color: p.danger }}>
                  {lang === 'en' ? 'cancel' : '取消'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <SoftButton p={p} variant="primary" size="lg" full onPress={handleEnter}>
              <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 16, color: p.dark ? '#1a1530' : '#fff' }}>
                {t('moodEnter', lang)}
              </Text>
            </SoftButton>
          )}
        </View>
      </SafeAreaView>

      {showGuide && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(20,12,8,0.55)', alignItems: 'center', justifyContent: 'center', padding: 28 }}>
          <View style={{ backgroundColor: p.surfaceSolid, borderRadius: 20, padding: 24, width: '100%', maxWidth: 360, borderWidth: 0.5, borderColor: p.line }}>
            <Text style={{ fontFamily: 'NotoSerifTC-Light', fontSize: 22, color: p.ink, textAlign: 'center', marginBottom: 4 }}>
              {lang === 'en' ? 'Three places here' : '這裡有三個地方'}
            </Text>
            <Text style={{ fontFamily: 'EBGaramond-Italic', fontSize: 13, color: p.muted, textAlign: 'center', marginBottom: 18 }}>
              {lang === 'en' ? 'no rush — stay however you like' : '不急，你想怎麼待著都可以'}
            </Text>
            {([
              ['🔥', lang === 'en' ? 'Brazier' : '火盆', lang === 'en' ? 'Sit by a topic, speak softly with others awake' : '圍著一個話題，和也醒著的人輕輕說話'],
              ['💬', lang === 'en' ? 'Match' : '配對', lang === 'en' ? 'Meet one person — just the two of you' : '隨機遇見一個人，只有你們兩個'],
              ['🌙', lang === 'en' ? 'The Loft' : '夜閣', lang === 'en' ? 'Opens late, when you want to come closer' : '深夜開放，想更靠近一點的時候'],
            ] as const).map(([icon, title, desc]) => (
              <View key={title} style={{ flexDirection: 'row', gap: 12, marginBottom: 14, alignItems: 'flex-start' }}>
                <Text style={{ fontSize: 20 }}>{icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 15, color: p.ink, fontWeight: '500' }}>{title}</Text>
                  <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 13, color: p.muted, lineHeight: 20 }}>{desc}</Text>
                </View>
              </View>
            ))}
            <TouchableOpacity onPress={dismissGuide} style={{ marginTop: 8, height: 48, borderRadius: 999, backgroundColor: p.ink, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 15, color: p.dark ? '#1a1530' : '#fff', fontWeight: '500' }}>
                {lang === 'en' ? 'Start' : '開始'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </VaporBackground>
  );
}

const styles = StyleSheet.create({
  topBar:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  identityRow:   { flexDirection: 'row', alignItems: 'center', gap: 10 },
  youLabel:      { fontFamily: 'Inter-Regular', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 1 },
  langBtn:       { width: 28, height: 28, borderRadius: 14, borderWidth: 0.5, alignItems: 'center', justifyContent: 'center' },
  wicksBtn:      { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, borderWidth: 0.5 },
  countdown:     { fontFamily: 'Inter-Regular', fontSize: 11, letterSpacing: 1 },

  content:       { flex: 1, paddingHorizontal: 20, justifyContent: 'center', gap: 20 },
  heading:       { fontFamily: 'NotoSerifTC-Light', fontSize: 28, lineHeight: 36, textAlign: 'center' },
  subheading:    { fontFamily: 'NotoSerifTC-Regular', fontSize: 14, lineHeight: 22, textAlign: 'center', marginTop: -8, opacity: 0.85 },
  loftBanner:    { flexDirection: 'row', alignItems: 'center', padding: 18, borderRadius: 20, gap: 12 },

  inputWrap:     { borderRadius: 20, borderWidth: 0.5, padding: 16 },
  input:         { fontFamily: 'NotoSerifTC-Regular', fontSize: 16, lineHeight: 26, minHeight: 60 },
  inputFooter:   { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },

  roomsSection:  { gap: 8 },
  roomsHeader:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  roomsLabel:    { fontFamily: 'Inter-Regular', fontSize: 10, letterSpacing: 2, fontWeight: '500' },
  openRoomLink:  { fontFamily: 'NotoSerifTC-Regular', fontSize: 12, fontWeight: '500' },
  roomsList:     { gap: 6 },
  roomItem:      { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 0.5 },
  roomTopic:     { flex: 1, fontFamily: 'NotoSerifTC-Regular', fontSize: 13 },
  roomCount:     { fontFamily: 'Inter-Regular', fontSize: 11, fontWeight: '500' },
  noRooms:       { fontFamily: 'NotoSerifTC-Regular', fontSize: 12, textAlign: 'center', paddingVertical: 8 },

  bottom:        { paddingHorizontal: 20, paddingBottom: 16 },
  waitingBox:    { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 16, borderWidth: 0.5 },
  cancelBtn:     { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 0.5 },
});
