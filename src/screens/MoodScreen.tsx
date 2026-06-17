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
import { useAppStore, checkAndClaimDailyReward, setLang, canMatch, getTier } from '../hooks/useAppStore';
import { subscribeToActiveRooms, DbRoom, joinMatchQueue, leaveMatchQueue, subscribeToMyMatch, tryFindMatch } from '../lib/db';
import { analytics } from '../lib/analytics';

type Props = NativeStackScreenProps<RootStackParamList, 'Mood'>;

export default function MoodScreen({ navigation }: Props) {
  const { seed, direction, lang, identityKind, wicks } = useAppStore();
  const p = DIRECTIONS[direction];
  const [text, setText] = useState('');
  const [timeStr, setTimeStr] = useState('');
  const [rooms, setRooms] = useState<DbRoom[]>([]);
  const [waiting, setWaiting] = useState(false);
  const [waitingDots, setWaitingDots] = useState('');
  const matchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeRooms = rooms.filter(r => (r.messageCount ?? 0) > 0);

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
        lang === 'en' ? 'No one around right now' : '目前沒有人在線',
        lang === 'en' ? 'Try again later.' : '稍後再試。',
        [{ text: 'OK', style: 'cancel' }],
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
        setWaiting(false);
        navigation.push('Match', {
          fromSeed: entry.matchedSeed,
          moodText: entry.matchedMoodText ?? '',
          conversationId: entry.conversationId,
        });
      }
    });
    return () => {
      if (matchTimeoutRef.current) clearTimeout(matchTimeoutRef.current);
      clearInterval(retryId);
      unsub();
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
          : '訪客可以參與房間聊天。建立帳號後即可開始一對一配對。',
        [
          { text: lang === 'en' ? 'Not now' : '稍後', style: 'cancel' },
          { text: lang === 'en' ? 'Create account' : '建立帳號', onPress: () => navigation.push('Auth', { mode: 'register' }) },
        ],
      );
      return;
    }
    if (!canMatch()) {
      Alert.alert(
        lang === 'en' ? 'Daily limit reached' : '今日對話已達上限',
        lang === 'en' ? 'Upgrade to Vigil for unlimited.' : '升級守夜人可解除限制。',
        [
          { text: lang === 'en' ? 'OK' : '知道了', style: 'cancel' },
          { text: lang === 'en' ? 'Upgrade' : '升級', onPress: () => navigation.push('Upgrade') },
        ],
      );
      return;
    }
    Alert.alert(
      lang === 'en' ? 'Start matching?' : '開始配對？',
      lang === 'en' ? 'You can cancel before a match is found.' : '配對成功前可以取消。',
      [
        { text: lang === 'en' ? 'Cancel' : '取消', style: 'cancel' },
        { text: lang === 'en' ? 'Start' : '開始', onPress: () => startMatching() },
      ],
    );
  };

  const startMatching = async () => {
    setWaiting(true);
    analytics.matchSearch(text.length);
    const joined = await joinMatchQueue({ moodText: text || undefined, seed });
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
          {/* Heading */}
          <Text style={[styles.heading, { color: p.ink }]}>{t('moodHeader', lang)}</Text>

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
                {lang === 'en' ? 'ROOMS' : '房間'}
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
                      {room.customTopicZh || room.customTopicEn || t((room.roomKey ?? 'room_partner') as any, lang)}
                    </Text>
                    <Text style={[styles.roomCount, { color: p.muted }]}>
                      {room.messageCount ?? 0}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <Text style={[styles.noRooms, { color: p.muted }]}>
                {lang === 'en' ? 'No rooms yet — start one?' : '還沒有房間——開一個？'}
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
