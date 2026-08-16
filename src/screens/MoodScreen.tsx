import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, Animated, KeyboardAvoidingView,
} from 'react-native';
import Svg, { Path, Circle, Line, Defs, RadialGradient as SvgRadialGradient, Stop } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../navigation';
import { DIRECTIONS, Palette } from '../lib/theme';
import { t } from '../lib/copy';
import {
  VaporBackground, SoftButton, BreathDot, WickGlyph, AnimatedNumber, FadeInUp, PressableScale, RekindleGlyph,
} from '../components/ui';
import { HonestWaiting } from '../components/ui/HonestWaiting';
import { hapticSuccess, hapticMedium } from '../lib/haptics';
import { Identity } from '../components/identity/Identity';
import { ColorAdjLabel } from '../components/identity/Identity';
import { useAppStore, checkAndClaimDailyReward, setLang, canMatch, getTier, matchCostsWick, freeConnectionsRemaining, MATCH_WICK_COST, recordNightVisit } from '../hooks/useAppStore';
import { useIsForeground } from '../lib/appState';
import { subscribeToMyInvites, DbInvite, subscribeToActiveRooms, DbRoom, fetchReadableRooms, joinMatchQueue, leaveMatchQueue, subscribeToMyMatch, tryFindMatch, TonightMode, ensureOfficialRooms, heartbeatAwake, fetchAwakeCount, fetchWaitingQueueCount, fetchTonightRekindles, openRekindle, DbRekindle, sendNightLetter, hasSentTonightLetter, claimTonightLetter, replyToLetter, fetchMyLetterReplies, DbLetter, fetchArrivedEchoes, markEchoRead, DbEcho, createConversation, fetchMyLiveConversations, DbLiveConversation } from '../lib/db';
import { getColorAdj } from '../lib/identity';
import { analytics } from '../lib/analytics';
import { looksLikeCrisis } from '../lib/crisis';
import { CrisisSupportCard } from '../components/CrisisSupportCard';
import { addDiaryEntry } from '../lib/diary';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MOTION, USE_NATIVE_DRIVER, useReduceMotion } from '../lib/motion';

type Props = NativeStackScreenProps<RootStackParamList, 'Mood'>;

const TONIGHT_MODES = [
  {
    value: 'just_here',
    titleKey: 'modeJustHere',
    zhDesc: '安靜陪著也可以，不催你開口',
    enDesc: 'Quiet company, with no pressure to speak',
  },
  {
    value: 'want_to_talk',
    titleKey: 'modeWantToTalk',
    zhDesc: '想用文字聊聊，彼此好好回應',
    enDesc: 'A real text conversation, with thoughtful replies',
  },
  {
    value: 'open_to_more',
    titleKey: 'modeOpenToMore',
    zhDesc: '雙方同意下，願意慢慢更靠近',
    enDesc: 'Open to growing closer, only with mutual consent',
  },
] as const;

function ModeGlyph({ mode, color }: { mode: TonightMode; color: string }) {
  if (mode === 'just_here') {
    return (
      <Svg width={24} height={24} viewBox="0 0 24 24">
        <Path d="M12 3 C 15 6.4, 16 8.3, 16 11 C 16 13.7, 14.2 15.7, 12 15.7 C 9.8 15.7, 8 13.7, 8 11 C 8 8.3, 9 6.4, 12 3 Z"
          fill="none" stroke={color} strokeWidth={1.4} />
        <Line x1={12} y1={16} x2={12} y2={21} stroke={color} strokeWidth={1.4} strokeLinecap="round" />
      </Svg>
    );
  }
  if (mode === 'want_to_talk') {
    return (
      <Svg width={24} height={24} viewBox="0 0 24 24">
        <Path d="M5 5.5 H16.5 C18 5.5 19 6.5 19 8 V13 C19 14.5 18 15.5 16.5 15.5 H11 L7 19 V15.5 H5 C3.7 15.5 3 14.5 3 13 V8 C3 6.5 3.7 5.5 5 5.5 Z"
          fill="none" stroke={color} strokeWidth={1.4} strokeLinejoin="round" />
        <Circle cx={8} cy={10.5} r={0.8} fill={color} />
        <Circle cx={12} cy={10.5} r={0.8} fill={color} />
        <Circle cx={16} cy={10.5} r={0.8} fill={color} />
      </Svg>
    );
  }
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24">
      <Circle cx={9} cy={12} r={5.5} fill="none" stroke={color} strokeWidth={1.4} />
      <Circle cx={15} cy={12} r={5.5} fill="none" stroke={color} strokeWidth={1.4} />
      <Circle cx={12} cy={12} r={1.25} fill={color} />
    </Svg>
  );
}

/**
 * Self-ticking 03:00 countdown. Isolated in its own component so the 1-second
 * tick re-renders THIS text only — as top-level state it re-rendered the whole
 * home screen (rooms, banners, letters) sixty times a minute.
 */
function ResetCountdown({ color }: { color: string }) {
  const [timeStr, setTimeStr] = useState('');
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      // Next 03:00 — today's if we're before it (e.g. 01:00), otherwise tomorrow's.
      const reset = new Date(now);
      reset.setHours(3, 0, 0, 0);
      if (reset.getTime() <= now.getTime()) reset.setDate(reset.getDate() + 1);
      const diff = (reset.getTime() - now.getTime()) / 1000;
      const h = String(Math.floor(diff / 3600)).padStart(2, '0');
      const m = String(Math.floor((diff % 3600) / 60)).padStart(2, '0');
      const s = String(Math.floor(diff % 60)).padStart(2, '0');
      setTimeStr(`${h}:${m}:${s}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return <Text style={[styles.countdown, { color }]}>{timeStr}</Text>;
}

export default function MoodScreen({ navigation }: Props) {
  const { seed, direction, lang, identityKind, wicks, gender, ageBracket, userId, vigil, streakNights } = useAppStore();
  // Count tonight's visit toward the "連續第 N 晚" streak (once per night).
  useEffect(() => { void recordNightVisit(); }, []);
  const p = DIRECTIONS[direction];
  const isGuestUser = getTier() === 'guest';
  const openNewRoom = () => {
    if (isGuestUser) navigation.push('Auth', { mode: 'register' });
    else navigation.push('Room', { roomKey: 'new' });
  };
  const [text, setText] = useState('');
  const [moodFocused, setMoodFocused] = useState(false);
  // 自傷念頭 → 溫柔浮現求助資源。每次進場最多一次，不阻擋配對。
  const [showSupport, setShowSupport] = useState(false);
  const supportShownRef = useRef(false);
  const [rooms, setRooms] = useState<DbRoom[]>([]);
  const [waiting, setWaiting] = useState(false);
  const [tonightMode, setTonightMode] = useState<TonightMode | null>(null);
  // Full brazier list (only the top 3 fit on the home screen).
  const [showAllRooms, setShowAllRooms] = useState(false);
  // New users get the space guide; returning testers get a one-time, explicit
  // release card so they can instantly verify that Play delivered build 21.
  const [showGuide, setShowGuide] = useState(false);
  const [showReleaseWelcome, setShowReleaseWelcome] = useState(false);
  const [showExplore, setShowExplore] = useState(false);
  useEffect(() => {
    AsyncStorage.multiGet(['mainGuideSeen', 'v21ReleaseSeen', 'coreExperienceSeen']).then(([
      [, guideSeen],
      [, releaseSeen],
      [, coreExperienceSeen],
    ]) => {
      if (guideSeen !== '1') setShowGuide(true);
      else if (releaseSeen !== '1') setShowReleaseWelcome(true);
      setShowExplore(coreExperienceSeen === '1');
    });
  }, []);
  const dismissGuide = () => { setShowGuide(false); AsyncStorage.setItem('mainGuideSeen', '1'); };
  const dismissReleaseWelcome = () => {
    setShowReleaseWelcome(false);
    AsyncStorage.setItem('v21ReleaseSeen', '1');
  };
  const revealExplore = () => {
    setShowExplore(true);
    AsyncStorage.setItem('coreExperienceSeen', '1');
    analytics.exploreOpen();
  };

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
  // Guests "listen first" (W1-3): they see firepits whose words are still
  // readable — including ones that closed within the last 3 days (W1-1) — so a
  // 0-online night still shows yesterday's lines instead of an empty room.
  const [readableRooms, setReadableRooms] = useState<DbRoom[]>([]);
  useFocusEffect(
    useCallback(() => {
      if (!isGuestUser) return;
      let alive = true;
      const load = () => { fetchReadableRooms().then(r => { if (alive) setReadableRooms(r); }).catch(() => {}); };
      load();
      const id = setInterval(load, 20000);
      return () => { alive = false; clearInterval(id); };
    }, [isGuestUser]),
  );
  const displayRooms = isGuestUser ? readableRooms : activeRooms;
  // The waiting-timeout dialog fires minutes after its effect ran — read the
  // room list through a ref so "sit by a brazier" opens a room that still
  // exists, not a snapshot from when the search began.

  // Poll the lobby only while this screen is focused. In a native stack the Mood
  // screen stays MOUNTED under pushed screens (chat / room / loft), so a plain
  // useEffect kept every user polling the lobby all evening even while inside a
  // chat — the single biggest read source at scale (100 users × 25s × N rooms).
  // useFocusEffect pauses the poll on blur and re-runs (immediate refresh) on
  // return. setRooms is a stable state setter, so the empty dep list is correct.
  useFocusEffect(
    useCallback(() => subscribeToActiveRooms(setRooms), []),
  );

  // Cold-start warmth: make sure tonight's official braziers exist, count who's
  // awake (honest number), and surface any reunion waiting for me tonight.
  const [awakeCount, setAwakeCount] = useState<number | null>(null);
  // Real count of others waiting to be paired — drives the honest-waiting screen
  // (W1-2). Never padded (see HonestWaiting / product promise).
  const [queueCount, setQueueCount] = useState(0);
  // Invite tray (W2-6): people who want to talk to you alone. The core of the
  // woman's home; anyone can receive one.
  const [invites, setInvites] = useState<DbInvite[]>([]);
  useEffect(() => subscribeToMyInvites(setInvites), []);
  const [rekindles, setRekindles] = useState<DbRekindle[]>([]);
  // Conversations of mine still burning — the road back in after leaving the
  // app (a message push routes to this screen; without this banner it was a
  // dead end).
  const [liveConvs, setLiveConvs] = useState<DbLiveConversation[]>([]);
  const foreground = useIsForeground();
  useEffect(() => {
    void ensureOfficialRooms();
    // A backgrounded phone must NOT keep beating "awake" — it inflates the
    // tonight-in-here count and burns Firestore quota. The beat resumes when
    // the user returns to foreground (foreground is in the dep list).
    if (!foreground) return;
    // Reunions and live conversations ride the same beat: something that turns
    // live at 21:00 must surface while the user sits on this screen.
    const beat = () => {
      void heartbeatAwake();
      fetchAwakeCount().then(setAwakeCount);
      fetchTonightRekindles().then(setRekindles);
      fetchMyLiveConversations().then(setLiveConvs);
    };
    beat();
    const id = setInterval(beat, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [foreground]);

  // ── 夜信 & 回聲 state ──
  const [showLetters, setShowLetters] = useState(false);
  const [letterSentTonight, setLetterSentTonight] = useState(false);
  const [receivedLetter, setReceivedLetter] = useState<DbLetter | null>(null);
  const [letterReplies, setLetterReplies] = useState<DbLetter[]>([]);
  const [letterDraft, setLetterDraft] = useState('');
  const [replyDraft, setReplyDraft] = useState('');
  const [letterBusy, setLetterBusy] = useState(false);
  const [echoes, setEchoes] = useState<DbEcho[]>([]);

  useEffect(() => {
    hasSentTonightLetter().then(setLetterSentTonight);
    fetchMyLetterReplies().then(setLetterReplies);
    fetchArrivedEchoes().then(setEchoes);
  }, []);

  // Opening the letters sheet also tries to claim tonight's letter for me.
  const openLetters = async () => {
    // Letters write to a stranger — a doing-action, so guests go to sign-up.
    if (isGuestUser) {
      Alert.alert(
        lang === 'en' ? 'Create an account to write' : '寫信需要帳號',
        lang === 'en'
          ? 'Night letters travel between accounts. Sign up to send and receive.'
          : '夜信是帳號之間的往來。建立帳號就能寄信、收信。',
        [
          { text: lang === 'en' ? 'Not now' : '稍後', style: 'cancel' },
          { text: lang === 'en' ? 'Create account' : '建立帳號', onPress: () => navigation.push('Auth', { mode: 'register' }) },
        ],
      );
      return;
    }
    setShowLetters(true);
    if (!receivedLetter) claimTonightLetter().then(setReceivedLetter);
  };

  const handleSendLetter = async () => {
    if (letterBusy || !letterDraft.trim()) return;
    setLetterBusy(true);
    const ok = await sendNightLetter(letterDraft, seed);
    setLetterBusy(false);
    if (ok) {
      hapticSuccess();
      setLetterSentTonight(true);
      setLetterDraft('');
    }
  };

  const handleReplyLetter = async () => {
    if (letterBusy || !receivedLetter || !replyDraft.trim()) return;
    setLetterBusy(true);
    const ok = await replyToLetter(receivedLetter.id, replyDraft, seed);
    setLetterBusy(false);
    if (ok) {
      hapticSuccess();
      setReceivedLetter({ ...receivedLetter, replyContent: replyDraft.trim(), status: 'replied' });
      setReplyDraft('');
    }
  };

  // A reply came back — the sender may open a conversation with that person.
  const handleTalkFromLetter = async (letter: DbLetter) => {
    if (!letter.toId) return;
    const conv = await createConversation({ userBId: letter.toId });
    if (conv) {
      setShowLetters(false);
      navigation.push('Chat', { otherSeed: letter.toSeed ?? letter.toId, conversationId: conv.id, matchCharge: true });
    }
  };

  const dismissEcho = (echo: DbEcho) => {
    setEchoes(es => es.filter(e => e.id !== echo.id));
    void markEchoRead(echo.id);
  };

  const handleOpenRekindle = async (rek: DbRekindle) => {
    // A reunion is an EVENING appointment (both agreed to "tomorrow night").
    // The banner shows all day as anticipation, but opening it at 14:00 burns
    // the 30-minute room while the other person is almost certainly away —
    // one tap would quietly kill the date. Same 21:00–05:00 window as a night.
    const h = new Date().getHours();
    if (h >= 5 && h < 21) {
      Alert.alert(
        lang === 'en' ? 'Tonight, not yet' : '約的是今晚',
        lang === 'en'
          ? 'Your reunion begins at 21:00 — the room only burns 30 minutes, so wait for the night.'
          : '重逢在今晚 21:00 開始。房間只燒 30 分鐘，等天黑再赴約吧。',
        [{ text: lang === 'en' ? 'I\'ll wait' : '好，我等', style: 'default' }],
      );
      return;
    }
    const opened = await openRekindle(rek);
    if (opened) {
      setRekindles(rs => rs.filter(r => r.id !== rek.id));
      navigation.push('Chat', { otherSeed: opened.otherSeed, conversationId: opened.conversationId, matchCharge: false });
    } else {
      Alert.alert(lang === 'en' ? 'Could not open' : '暫時打不開', lang === 'en' ? 'Please try again.' : '請再試一次。');
    }
  };

  useEffect(() => {
    checkAndClaimDailyReward().then(r => {
      if (r.rewarded && r.amount) {
        hapticSuccess();
        Alert.alert(
          '',
          lang === 'en' ? `🕯 Daily wicks +${r.amount}` : `🕯 每日燭芯 +${r.amount}`,
          [{ text: lang === 'en' ? 'Take them' : '收下', style: 'default' }],
        );
      }
    });
  }, []);

  useEffect(() => {
    if (!waiting) return;
    let matched = false;

    // Keep actively looking for a partner while waiting, and refresh the honest
    // queue count so the waiting screen shows a REAL number of people also waiting.
    const refreshQueue = () => { fetchWaitingQueueCount().then(setQueueCount).catch(() => {}); };
    refreshQueue();
    const retryId = setInterval(() => {
      if (!matched) { tryFindMatch(); refreshQueue(); }
    }, 5000);
    // No 60s "no one waiting" modal any more (W1-2): the HonestWaiting screen
    // shown for the whole `waiting` state already gives the honest picture and
    // immediate, persistent ways out (sit by a brazier — 3 days of words still
    // readable — or write it down). Matching keeps running underneath.

    const unsub = subscribeToMyMatch(entry => {
      // onSnapshot fires immediately with the current (waiting) doc — only act
      // on an actual match, otherwise the timeout would be cleared right away.
      if (entry?.status === 'matched' && entry.matchedSeed && entry.conversationId) {
        matched = true;
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
          otherTonightMode: (entry as any).matchedTonightMode ?? null,
          myTonightMode: tonightMode,
        });
      }
    });
    return () => {
      clearInterval(retryId);
      unsub();
      // Leaving the screen while still waiting must remove us from the queue,
      // otherwise others can "ghost-match" with someone no longer waiting.
      if (!matched) leaveMatchQueue();
    };
  }, [waiting]);

  const handleEnter = async () => {
    if (waiting) return;
    // Guests browse only: rooms stay readable, but every *doing* action routes
    // to sign-up. Checked FIRST — before the mode picker — so a guest never
    // fills in "tonight's mood" only to hit the wall right after.
    // (The old one-free-taste match dropped guests into a chat where every
    // follow-up action hit a wall — confusing, not converting.)
    if (getTier() === 'guest') {
      // The CTA already says "Create an account". Repeating that choice in a
      // confirmation dialog added a dead tap (and React Native Web Alerts are
      // not consistently actionable), so take the user directly to the form.
      navigation.push('Auth', { mode: 'register' });
      return;
    }
    if (!tonightMode) return;
    proceedToMatch(tonightMode);
  };

  // The quota check + confirm + queue-join, shared by the button (mode already
  // chosen) and the mode picker (mode chosen just now).
  const proceedToMatch = (mode: TonightMode) => {
    // Free user out of free matches and out of wicks.
    if (getTier() !== 'guest' && !canMatch()) {
      Alert.alert(
        lang === 'en' ? 'That\'s enough for tonight' : '今晚先到這裡',
        lang === 'en'
          ? `You've used today's free 1-on-1s. Log in tomorrow for 2 more wicks — or top up / go Vigil for unlimited conversations tonight.`
          : `今天的免費一對一已用完。明天登入會再得 2 燭芯；今晚想繼續，可以購買燭芯或升級守夜人。`,
        [
          { text: lang === 'en' ? 'OK' : '知道了', style: 'cancel' },
          { text: lang === 'en' ? 'Upgrade' : '升級', onPress: () => navigation.push('Upgrade') },
        ],
      );
      return;
    }
    const costs = matchCostsWick();
    Alert.alert(
      lang === 'en' ? 'Find someone to talk with?' : '找一個人說說話？',
      costs
        ? (lang === 'en' ? `This 1-on-1 costs ${MATCH_WICK_COST} wick.` : `這次一對一將花 ${MATCH_WICK_COST} 燭芯。`)
        : (lang === 'en' ? 'You can cancel before someone answers.' : '有人回應前都可以取消。'),
      [
        { text: lang === 'en' ? 'Cancel' : '取消', style: 'cancel' },
        { text: lang === 'en' ? 'Start' : '開始', onPress: () => startMatching(mode) },
      ],
    );
  };

  // Mode passed explicitly: when the picker triggers this, the tonightMode
  // state update may not have landed yet.
  const startMatching = async (mode: TonightMode) => {
    setWaiting(true);
    analytics.matchSearch(text.length);
    // 「說出口」是最可能吐露自傷念頭的地方：本機偵測，不阻擋配對，只溫柔浮現資源。
    if (!supportShownRef.current && looksLikeCrisis(text)) {
      supportShownRef.current = true;
      setShowSupport(true);
    }
    // Whatever they wrote tonight is kept for them — it becomes a diary entry
    // (local-only) they can reread on their profile page.
    if (text.trim()) void addDiaryEntry(text);
    const joined = await joinMatchQueue({ moodText: text || undefined, seed, gender, ageBracket, tonightMode: mode });
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
      <SafeAreaView style={{ flex: 1, width: '100%', maxWidth: 560, alignSelf: 'center' }}>
       <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        {/* ── Top Bar ── */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.identityRow} activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={lang === 'en' ? 'Open profile' : '開啟個人頁'}
            onPress={() => navigation.push('Profile')}>
            <Identity kind={identityKind} seed={seed} size={32} palette={p} lang={lang} trust={0.2} />
            <View>
              <Text style={[styles.youLabel, { color: p.muted }]}>
                {lang === 'en' ? 'You, tonight' : '你·今晚'}
              </Text>
              <ColorAdjLabel seed={seed} lang={lang} palette={p} />
              {streakNights >= 2 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                  <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: p.accent }} />
                  <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 10.5, color: p.muted }}>
                    {lang === 'en' ? `${streakNights} nights in a row` : `連續來的第 ${streakNights} 晚`}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity onPress={() => setLang(lang === 'en' ? 'zh' : 'en')}
              accessibilityRole="button"
              accessibilityLabel={lang === 'en' ? 'Switch language to Chinese' : '切換為英文'}
              style={[styles.langBtn, { backgroundColor: p.surface, borderColor: p.line }]}>
              <Text style={{ fontFamily: 'Inter-Regular', fontSize: 11, color: p.muted }}>{lang === 'en' ? 'EN' : '中'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.push('Upgrade')}
              accessibilityRole="button"
              accessibilityLabel={lang === 'en' ? `${wicks} wicks, open plans` : `${wicks} 枚燭芯，開啟方案`}
              style={[styles.wicksBtn, { backgroundColor: p.accentSoft, borderColor: p.accent + '40' }]}>
              <WickGlyph size={10} color={p.accent} />
              <AnimatedNumber value={wicks} style={{ fontFamily: 'Inter-Regular', fontSize: 12, color: p.accent }} />
            </TouchableOpacity>
            <ResetCountdown color={p.muted} />
          </View>
        </View>

        {/* ── Main Content ── */}
        <ScrollView
          style={styles.contentScroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Heading + reassuring subline (type hierarchy + grayscale tone) */}
          <View style={[styles.releasePill, { backgroundColor: p.accentSoft, borderColor: p.accent + '35' }]}>
            <BreathDot p={p} size={4} />
            <Text style={[styles.releasePillText, { color: p.accent }]}>
              {lang === 'en' ? 'NEW · 1.1 · ALPHA 21' : '全新 1.1 · ALPHA 21'}
            </Text>
          </View>
          <Text style={[styles.heading, { color: p.ink }]}>
            {isGuestUser ? t('guestListenTitle', lang) : t('moodHeader', lang)}
          </Text>
          <Text style={[styles.subheading, { color: p.muted }]}>
            {isGuestUser ? t('guestListenSub', lang) : t('moodPrompt', lang)}
          </Text>
          {/* Honest presence — a real count when the room is warm, honest quiet
              when it isn't (never a fake number). */}
          {awakeCount !== null && (
            <Text style={{ fontFamily: 'EBGaramond-Italic', fontSize: 12, color: p.accent, textAlign: 'center', marginTop: -12, opacity: 0.85 }}>
              {awakeCount >= 3
                ? (lang === 'en' ? `· ${awakeCount} people are awake right now ·` : `· 現在有 ${awakeCount} 人醒著 ·`)
                : (lang === 'en' ? '· a quiet hour — a good time to write ·' : '· 現在很靜，適合先寫點什麼 ·')}
            </Text>
          )}

          {/* Echoes that arrived this morning — the one line that crossed the dissolve. */}
          {echoes.slice(0, 1).map(echo => (
            <TouchableOpacity key={echo.id} onPress={() => dismissEcho(echo)} activeOpacity={0.9}
              style={{ padding: 14, borderRadius: 16, backgroundColor: p.surface, borderWidth: 0.5, borderColor: p.accent + '50' }}>
              <Text style={{ fontFamily: 'Inter-Regular', fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: p.accent }}>
                {lang === 'en' ? 'an echo arrived' : '一句回聲抵達了'}
              </Text>
              <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 15, color: p.ink, lineHeight: 25, marginTop: 6 }}>
                「{echo.content}」
              </Text>
              <Text style={{ fontFamily: 'EBGaramond-Italic', fontSize: 11, color: p.muted, marginTop: 6 }}>
                — {getColorAdj(echo.fromSeed, lang).label}
                {lang === 'en' ? ' · left after your chat dissolved · tap to keep it' : ' · 對話消散後留給你的 · 輕點收下'}
              </Text>
            </TouchableOpacity>
          ))}

          {/* Invite tray (W2-6) — someone wants to talk to you alone. The
              woman's primary action; shown above everything else. */}
          {invites.length > 0 && (() => {
            const inv = invites[0];
            return (
              <TouchableOpacity activeOpacity={0.9}
                onPress={() => navigation.push('Invite', {
                  inviteId: inv.id, fromSeed: inv.fromSeed, quote: inv.quote,
                  quoteContext: inv.quoteContext, note: inv.note,
                  fromGender: inv.fromGender, fromAge: inv.fromAge,
                })}
                style={{ padding: 18, borderRadius: 22, borderWidth: 1, borderColor: p.accent + '55', backgroundColor: p.accentSoft, gap: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ fontFamily: 'Inter-Regular', fontSize: 9.5, letterSpacing: 1.7, textTransform: 'uppercase', color: p.accent, fontWeight: '600' }}>
                    {lang === 'en' ? 'someone wants to talk to you' : '有人想跟你說話'}
                  </Text>
                  <View style={{ minWidth: 22, height: 22, borderRadius: 11, backgroundColor: p.accent, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 }}>
                    <Text style={{ fontFamily: 'Inter-Regular', fontSize: 12, fontWeight: '700', color: p.dark ? '#1f1014' : '#fff' }}>{invites.length}</Text>
                  </View>
                </View>
                <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 17, lineHeight: 27, color: p.ink }} numberOfLines={2}>
                  {lang === 'en'
                    ? `Someone in ${inv.quoteContext || 'a firepit'} heard you and wants to talk alone.`
                    : `${inv.quoteContext ? `「${inv.quoteContext}」裡` : '火盆裡'}有人聽到你說的話，想單獨跟你聊。`}
                </Text>
                <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 13, color: p.accent }}>
                  {lang === 'en' ? 'See who →' : '看看是誰 →'}
                </Text>
              </TouchableOpacity>
            );
          })()}

          {/* Reunion banner — someone from last night is waiting. */}
          {rekindles.map(rek => {
            const otherId = rek.userAId === userId ? rek.userBId : rek.userAId;
            const label = getColorAdj(rek.seeds?.[otherId] ?? otherId, lang).label;
            return (
              <TouchableOpacity key={rek.id} onPress={() => handleOpenRekindle(rek)} activeOpacity={0.85}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 16, backgroundColor: p.accentSoft, borderWidth: 1, borderColor: p.accent + '55' }}>
                <RekindleGlyph size={26} ink={p.accent} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 14, color: p.ink, fontWeight: '500' }}>
                    {lang === 'en' ? 'Your reunion is tonight' : '今晚有一場重逢'}
                  </Text>
                  <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 12, color: p.muted, marginTop: 2 }}>
                    {lang === 'en' ? `"${label}" from last night is here` : `昨晚的「${label}」在等你`}
                  </Text>
                </View>
                <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 13, color: p.accent }}>
                  {lang === 'en' ? 'meet →' : '赴約 →'}
                </Text>
              </TouchableOpacity>
            );
          })}

          {/* Conversations still burning — the way back in after leaving the app. */}
          {liveConvs.slice(0, 2).map(conv => {
            const minsLeft = Math.max(1, Math.ceil(((conv.expiresAt?.toMillis?.() ?? 0) - Date.now()) / 60000));
            const label = getColorAdj(conv.otherSeed, lang).label;
            // A silent window someone ELSE opened is an invitation, not "my"
            // conversation — word it as one, so stepping in (or letting it
            // fade) is a real choice. This is where the invite's consent lives.
            const isInvite = !conv.iInitiated && conv.messageCount === 0;
            return (
              <TouchableOpacity key={conv.id} activeOpacity={0.85}
                onPress={() => navigation.push('Chat', { otherSeed: conv.otherSeed, conversationId: conv.id, matchCharge: false })}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 16, backgroundColor: p.surface, borderWidth: 0.5, borderColor: p.accent + '55' }}>
                <BreathDot p={p} size={6} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 14, color: p.ink, fontWeight: '500' }}>
                    {isInvite
                      ? (lang === 'en' ? 'Someone opened a window for you' : '有人為你開了一扇窗')
                      : (lang === 'en' ? 'A conversation is still burning' : '有一段對話還亮著')}
                  </Text>
                  <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 12, color: p.muted, marginTop: 2 }}>
                    {isInvite
                      ? (lang === 'en'
                          ? `"${label}" is waiting · closes in ${minsLeft}m · ignoring it is fine`
                          : `「${label}」在等 · ${minsLeft} 分鐘後自動關上 · 不理會也沒關係`)
                      : (lang === 'en'
                          ? `with "${label}" · fades in ${minsLeft}m`
                          : `和「${label}」· ${minsLeft} 分鐘後消散`)}
                  </Text>
                </View>
                <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 13, color: p.accent }}>
                  {isInvite
                    ? (lang === 'en' ? 'look →' : '看看 →')
                    : (lang === 'en' ? 'return →' : '回去 →')}
                </Text>
              </TouchableOpacity>
            );
          })}

          {/* The primary ritual lives in one visual container: one person,
              one optional line, one clear intent. This keeps secondary spaces
              from competing with the action the screen is actually for.
              Hidden for guests (W1-3): they cannot speak or match, so the mood
              box + mode picker were seven decisions that did nothing for them. */}
          {!isGuestUser && (
          <FadeInUp delay={80} distance={10}>
            <View style={[styles.ritualCard, {
              backgroundColor: p.surface,
              borderColor: moodFocused ? p.accent + '70' : p.line,
              shadowColor: p.dark ? '#000' : p.ink,
            }]}>
              <View style={styles.ritualMeta}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                  <BreathDot p={p} size={5} animate={!waiting} />
                  <Text style={[styles.ritualEyebrow, { color: p.accent }]}>
                    {lang === 'en' ? 'ONE PERSON · 30 MINUTES' : '一個人 · 30 分鐘'}
                  </Text>
                </View>
                <Text style={[styles.ritualPrivacy, { color: p.muted }]}>
                  {lang === 'en' ? 'anonymous' : '匿名'}
                </Text>
              </View>

              <View style={[styles.inputWrap, {
                backgroundColor: p.glass,
                borderColor: moodFocused ? p.accent : p.line,
              }]}>
                <TextInput
                  value={text}
                  onChangeText={setText}
                  onFocus={() => setMoodFocused(true)}
                  onBlur={() => setMoodFocused(false)}
                  placeholder={t('moodPlaceholder', lang)}
                  placeholderTextColor={p.muted}
                  multiline
                  maxLength={280}
                  style={[styles.input, { color: p.ink }]}
                />
                <View style={styles.inputFooter}>
                  <Text style={{ flex: 1, marginRight: 8, fontFamily: 'NotoSerifTC-Regular', fontSize: 10.5, color: p.muted }}>
                    {lang === 'en'
                      ? 'shown once before the conversation · your copy stays in this device diary'
                      : '對話開始前讓對方看一次 · 你的副本只留在本機日記'}
                  </Text>
                  <Text style={{ fontFamily: 'Inter-Regular', fontSize: 10, color: text.length > 240 ? p.accent : p.muted }}>
                    {text.length}/280
                  </Text>
                </View>
              </View>

              <View style={[styles.ritualDivider, { backgroundColor: p.line }]} />

              <View style={styles.modeSection}>
                <View style={styles.modeHeader}>
                  <Text style={[styles.roomsLabel, { color: p.muted }]}>
                    {lang === 'en' ? 'HOW I WANT TO BE HERE' : '今晚想怎麼待著'}
                  </Text>
                  <Text style={[styles.modeHint, { color: p.muted }]}>
                    {lang === 'en' ? 'required' : '必選'}
                  </Text>
                </View>
                <View style={styles.modeRow}>
                  {TONIGHT_MODES.map(mode => {
                    const selected = tonightMode === mode.value;
                    return (
                      <PressableScale
                        key={mode.value}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        onPress={() => setTonightMode(mode.value)}
                        scaleTo={0.97}
                        style={[
                          styles.modeCard,
                          {
                            backgroundColor: selected ? p.accentSoft : p.glass,
                            borderColor: selected ? p.accent : p.line,
                            borderWidth: selected ? 1.2 : 0.6,
                          },
                        ]}
                      >
                        <View style={styles.modeGlyphWrap}>
                          <ModeGlyph mode={mode.value} color={selected ? p.accent : p.muted} />
                          {selected ? (
                            <View style={[styles.modeCheck, { backgroundColor: p.accent }]}>
                              <Text style={{ color: p.dark ? '#15172e' : '#fff', fontSize: 8, fontWeight: '700' }}>✓</Text>
                            </View>
                          ) : null}
                        </View>
                        <Text
                          numberOfLines={2}
                          style={[styles.modeText, { color: selected ? p.accent : p.ink }]}
                        >
                          {t(mode.titleKey, lang)}
                        </Text>
                      </PressableScale>
                    );
                  })}
                </View>
                {tonightMode ? (
                  <Text style={[styles.modeDescription, { color: p.inkSoft }]}>
                    {lang === 'en'
                      ? TONIGHT_MODES.find(mode => mode.value === tonightMode)?.enDesc
                      : TONIGHT_MODES.find(mode => mode.value === tonightMode)?.zhDesc}
                  </Text>
                ) : null}
              </View>

              <View style={[styles.safetyStrip, { backgroundColor: p.accentSoft, borderColor: p.accent + '35' }]}>
                <Text style={[styles.safetyStripTitle, { color: p.accent }]}>
                  {lang === 'en' ? 'PRIVATE BY DESIGN' : '安心開始'}
                </Text>
                <Text style={[styles.safetyStripBody, { color: p.inkSoft }]}>
                  {lang === 'en'
                    ? 'Leave anytime · block or report in one tap · messages are removed when the conversation ends'
                    : '可隨時離開 · 一鍵封鎖或檢舉 · 對話結束時清除訊息內容'}
                </Text>
              </View>

              <View
                accessibilityRole="text"
                style={{ marginTop: 10, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, backgroundColor: p.glass, borderWidth: 0.5, borderColor: p.line }}
              >
                <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 12, lineHeight: 18, color: p.inkSoft, textAlign: 'center' }}>
                  {isGuestUser
                    ? (lang === 'en'
                      ? 'Guest mode · browse braziers first; create an account to speak, start a 1-on-1, or purchase.'
                      : '訪客模式 · 可先瀏覽火盆；建立帳號後才能發言、一對一說話或購買。')
                    : vigil
                      ? (lang === 'en' ? 'Vigil · unlimited connections, no connection charge.' : '守夜會員 · 一對一連結不限次，不扣燭芯。')
                      : gender === 'female'
                        ? (lang === 'en' ? 'Women connect without a daily limit or connection charge.' : '女用戶一對一連結不限次，不扣燭芯。')
                        : (lang === 'en'
                          ? `${freeConnectionsRemaining()} free connections left today; then ${MATCH_WICK_COST} wick each.`
                          : `今天還有 ${freeConnectionsRemaining()} 次免費連結；之後每次 ${MATCH_WICK_COST} 燭芯。`)}
                </Text>
              </View>
            </View>
          </FadeInUp>
          )}

          {(isGuestUser || showExplore) ? (
            <>
          {/* Rooms */}
          <View style={styles.roomsSection}>
            <View style={styles.roomsHeader}>
              <View>
                <Text style={[styles.roomsLabel, { color: p.muted }]}>
                  {lang === 'en' ? 'OTHER WAYS TO STAY' : '今晚還能這樣待著'}
                </Text>
                <Text style={[styles.sectionHint, { color: p.muted }]}>
                  {lang === 'en' ? 'join a group, go deeper, or write slowly' : '加入一群人、靠近一點，或慢慢寫'}
                </Text>
              </View>
              <TouchableOpacity onPress={openNewRoom}
                accessibilityRole="button"
                accessibilityLabel={lang === 'en' ? 'Open a new brazier' : '開一個新火盆'}>
                <Text style={[styles.openRoomLink, { color: p.accent }]}>
                  {lang === 'en' ? '+ open' : '+ 開一個'}
                </Text>
              </TouchableOpacity>
            </View>

            {displayRooms.length > 0 ? (
              <View style={styles.roomsList}>
                {displayRooms.slice(0, isGuestUser ? 3 : 1).map((room) => (
                  <PressableScale
                    key={room.id}
                    onPress={() => navigation.push('Room', { roomKey: room.roomKey ?? 'custom', roomId: room.id })}
                    scaleTo={0.985}
                    accessibilityRole="button"
                    accessibilityLabel={room.customTopicZh || room.customTopicEn || (lang === 'en' ? 'Open brazier' : '進入火盆')}
                  >
                    <View style={[styles.roomItem, { backgroundColor: p.glass, borderColor: p.line }]}>
                      <View style={[styles.roomGlyph, { backgroundColor: p.accentSoft, borderColor: p.accent + '24' }]}>
                        <BrazierGlyph c={p.ink} accent={p.accent} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.roomTopic, { color: p.ink }]} numberOfLines={1}>
                          {room.customTopicZh || room.customTopicEn
                            || (room.roomKey && !['new', 'custom'].includes(room.roomKey)
                                ? t(room.roomKey as any, lang)
                                : (lang === 'en' ? 'a quiet brazier' : '一個火盆'))}
                        </Text>
                        <Text style={[styles.roomMeta, { color: p.muted }]}>
                          {lang === 'en'
                            ? `${room.messageCount ?? 0} messages · join quietly`
                            : `${room.messageCount ?? 0} 則訊息 · 安靜加入`}
                        </Text>
                      </View>
                      <Text style={{ color: p.accent, fontSize: 17 }}>›</Text>
                    </View>
                  </PressableScale>
                ))}
                {displayRooms.length > (isGuestUser ? 3 : 1) && (
                  <TouchableOpacity onPress={() => setShowAllRooms(true)} accessibilityRole="button"
                    accessibilityLabel={lang === 'en' ? `See all ${displayRooms.length} braziers` : `查看全部 ${displayRooms.length} 個火盆`}
                    style={{ alignItems: 'center', paddingVertical: 8 }}>
                    <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 12, color: p.accent }}>
                      {lang === 'en'
                        ? `See all ${displayRooms.length} braziers →`
                        : `查看全部 ${displayRooms.length} 個火盆 →`}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <PressableScale onPress={openNewRoom}
                accessibilityRole="button"
                accessibilityLabel={lang === 'en' ? 'No braziers lit yet, start one' : '還沒有人生火，開一個火盆'}>
                <View style={[styles.noRoomsCta, { borderColor: p.line, backgroundColor: p.glass }]}>
                  <BreathDot p={p} size={5} />
                  <Text style={[styles.noRoomsText, { color: p.muted }]}>
                    {lang === 'en' ? 'No braziers lit yet — start one' : '還沒有人生火 — 開一個火盆'}
                  </Text>
                  <Text style={{ color: p.accent, fontSize: 16, marginTop: -1 }}>＋</Text>
                </View>
              </PressableScale>
            )}
          </View>

          {/* Guest: explain the 3-day firepit window and how to speak up (W1-3). */}
          {isGuestUser && (
            <View style={{ gap: 10 }}>
              <View style={{ padding: 14, borderRadius: 16, borderWidth: 0.6, borderColor: '#8fbf8f47', backgroundColor: 'rgba(143,191,143,0.07)' }}>
                <Text style={{ fontFamily: 'Inter-Regular', fontSize: 9.5, letterSpacing: 1.7, textTransform: 'uppercase', color: '#8fbf8f', fontWeight: '600', marginBottom: 5 }}>
                  {lang === 'en' ? 'why yesterday is still here' : '為什麼看得到昨晚的話'}
                </Text>
                <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 12.5, lineHeight: 20, color: p.inkSoft }}>
                  {t('guestFirepitNote', lang)}
                </Text>
              </View>
              <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 11.5, lineHeight: 18, color: p.muted, textAlign: 'center' }}>
                {t('guestTapToReply', lang)}
              </Text>
            </View>
          )}

          <View style={styles.secondaryRow}>
            <PressableScale onPress={() => navigation.push('Loft')} scaleTo={0.975} style={styles.secondaryCardWrap}
              accessibilityRole="button" accessibilityLabel={lang === 'en' ? 'Open the Loft' : '進入夜閣'}>
              <LinearGradient
                colors={['#1f1014', '#2d161c', '#3a1e24']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={styles.secondaryCard}
              >
                <LoftGlyph c="#f5e2c4" accent="#e8a557" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.loftTitle}>{lang === 'en' ? 'The Loft' : '夜閣'}</Text>
                  <Text numberOfLines={2} style={styles.loftSubtitle}>
                    {lang === 'en' ? 'veiled · face to face' : '帶紗 · 面對面'}
                  </Text>
                </View>
                <Text style={styles.secondaryArrowDark}>›</Text>
              </LinearGradient>
            </PressableScale>

            <PressableScale onPress={openLetters} scaleTo={0.975} style={styles.secondaryCardWrap}
              accessibilityRole="button" accessibilityLabel={lang === 'en' ? 'Open night letters' : '開啟夜信'}>
              <View style={[styles.secondaryCard, { backgroundColor: p.glass, borderColor: p.line }]}>
                <LetterGlyph c={p.ink} accent={p.accent} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.secondaryTitle, { color: p.ink }]}>
                    {letterReplies.length > 0
                      ? (lang === 'en' ? 'A reply' : '有回信')
                      : (lang === 'en' ? 'Night letter' : '夜信')}
                  </Text>
                  <Text numberOfLines={2} style={[styles.secondarySubtitle, { color: p.muted }]}>
                    {letterSentTonight
                      ? (lang === 'en' ? 'departs at dawn' : '天亮後出發')
                      : (lang === 'en' ? 'for tomorrow’s stranger' : '寫給明晚的陌生人')}
                  </Text>
                </View>
                <Text style={{ color: p.accent, fontSize: 17 }}>›</Text>
              </View>
            </PressableScale>
          </View>
            </>
          ) : (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={lang === 'en' ? 'Explore braziers, the Loft and night letters' : '探索火盆、夜閣與夜信'}
              onPress={revealExplore}
              activeOpacity={0.84}
              style={[styles.exploreGate, { backgroundColor: p.glass, borderColor: p.line }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.exploreGateTitle, { color: p.ink }]}>
                  {lang === 'en' ? 'First, just find one person to talk to' : '第一次，先專心找一個人說說話'}
                </Text>
                <Text style={[styles.exploreGateBody, { color: p.muted }]}>
                  {lang === 'en'
                    ? 'Braziers, the Loft and night letters are here when you want another way to stay.'
                    : '想換一種方式時，再打開火盆、夜閣與夜信。'}
                </Text>
              </View>
              <Text style={[styles.exploreGateAction, { color: p.accent }]}>
                {lang === 'en' ? 'Explore +' : '探索 +'}
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        {/* ── Bottom: Match Button ── */}
        <View style={[styles.bottom, {
          backgroundColor: p.dark ? 'rgba(13,18,36,0.88)' : 'rgba(255,250,242,0.82)',
          borderTopColor: p.line,
        }]}>
          {/* The match CTA stays put; while `waiting`, the full-screen
              HonestWaiting overlay (below) covers it with the honest 0-online
              state instead of a dead spinner (W1-2). */}
          <SoftButton
            p={p}
            variant="primary"
            size="lg"
            full
            onPress={handleEnter}
            disabled={waiting || (!tonightMode && !isGuestUser)}
          >
            <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 16, color: p.dark ? '#1f1014' : '#fff' }}>
              {isGuestUser
                ? (lang === 'en' ? 'Create an account to talk' : '建立帳號，找人說說話')
                : tonightMode
                  ? t('moodEnter', lang)
                  : (lang === 'en' ? 'Choose how you feel tonight' : '先選擇今晚的狀態')}
            </Text>
          </SoftButton>
        </View>
       </KeyboardAvoidingView>
      </SafeAreaView>

      {/* ── Honest waiting overlay (W1-2) — replaces the infinite spinner ── */}
      {waiting && (
        <HonestWaiting
          p={p}
          lang={lang}
          awakeCount={awakeCount}
          queueCount={queueCount}
          onGoFirepit={() => {
            // Keep the queue running underneath (a native-stack push does not
            // unmount this screen, so subscribeToMyMatch keeps matching); just
            // go sit somewhere with words in it.
            const hottest = activeRooms[0];
            if (hottest) navigation.push('Room', { roomKey: hottest.roomKey ?? 'custom', roomId: hottest.id });
            else openNewRoom();
          }}
          onWrite={openLetters}
          onCancel={handleCancelWait}
        />
      )}

      {/* 夜信 sheet — read tonight's letter, reply, see replies, write tomorrow's. */}
      {showLetters && (
        <KeyboardAvoidingView behavior="padding"
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(20,12,8,0.62)', justifyContent: 'flex-end' }}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setShowLetters(false)} />
          <View style={{ backgroundColor: p.surfaceSolid, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderTopWidth: 0.5, borderColor: p.line, paddingTop: 12, maxHeight: '82%', width: '100%', maxWidth: 560, alignSelf: 'center' }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: p.line, alignSelf: 'center', marginBottom: 10 }} />
            <ScrollView contentContainerStyle={{ padding: 22, paddingTop: 4, gap: 18 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={{ alignItems: 'center', gap: 4 }}>
                <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 19, color: p.ink }}>
                  {lang === 'en' ? 'Night letters' : '夜信'}
                </Text>
                <Text style={{ fontFamily: 'EBGaramond-Italic', fontSize: 11.5, color: p.muted, textAlign: 'center' }}>
                  {lang === 'en'
                    ? 'written tonight · reaches one stranger tomorrow night'
                    : '今晚寫下 · 明晚寄到一個陌生人手上'}
                </Text>
              </View>

              {/* Tonight's letter for me */}
              {receivedLetter ? (
                <View style={{ padding: 16, borderRadius: 16, backgroundColor: p.glass, borderWidth: 0.5, borderColor: p.accent + '40' }}>
                  <Text style={{ fontFamily: 'Inter-Regular', fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: p.accent }}>
                    {lang === 'en' ? 'a letter reached you tonight' : '今晚寄到你手上的信'}
                  </Text>
                  <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 15, color: p.ink, lineHeight: 26, marginTop: 8 }}>
                    {receivedLetter.content}
                  </Text>
                  <Text style={{ fontFamily: 'EBGaramond-Italic', fontSize: 11, color: p.muted, marginTop: 6 }}>
                    — {getColorAdj(receivedLetter.fromSeed, lang).label}
                  </Text>
                  {receivedLetter.status === 'replied' ? (
                    <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 12, color: p.accent, marginTop: 10 }}>
                      ✓ {lang === 'en' ? 'You replied. It reaches them tonight.' : '你回信了。今晚會送到他們手上。'}
                    </Text>
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 }}>
                      <TextInput
                        value={replyDraft}
                        onChangeText={setReplyDraft}
                        placeholder={lang === 'en' ? 'reply once, softly…' : '輕輕回一句⋯⋯'}
                        placeholderTextColor={p.muted}
                        maxLength={500}
                        style={{ flex: 1, fontFamily: 'NotoSerifTC-Regular', fontSize: 14, color: p.ink, backgroundColor: p.surface, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 }}
                      />
                      <TouchableOpacity onPress={handleReplyLetter} disabled={letterBusy || !replyDraft.trim()}
                        style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: replyDraft.trim() ? p.ink : p.line, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ color: p.dark ? '#1a1530' : '#fff', fontSize: 15 }}>↑</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ) : (
                <View style={{ padding: 16, borderRadius: 16, backgroundColor: p.glass, borderWidth: 0.5, borderColor: p.line }}>
                  <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 13, color: p.muted, textAlign: 'center', lineHeight: 22 }}>
                    {lang === 'en'
                      ? 'No letter has reached you tonight yet. They arrive as the night deepens.'
                      : '今晚還沒有信寄到你手上。夜深一點，信才會到。'}
                  </Text>
                </View>
              )}

              {/* Replies to my letters */}
              {letterReplies.length > 0 && (
                <View style={{ gap: 10 }}>
                  <Text style={{ fontFamily: 'Inter-Regular', fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: p.muted }}>
                    {lang === 'en' ? 'replies to your letters' : '你的信的回音'}
                  </Text>
                  {letterReplies.slice(0, 5).map(l => (
                    <View key={l.id} style={{ padding: 14, borderRadius: 14, backgroundColor: p.glass, borderWidth: 0.5, borderColor: p.line }}>
                      <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 12, color: p.muted }} numberOfLines={1}>
                        {lang === 'en' ? 'you wrote: ' : '你寫的：'}{l.content}
                      </Text>
                      <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 14, color: p.ink, lineHeight: 24, marginTop: 6 }}>
                        「{l.replyContent}」
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                        <Text style={{ fontFamily: 'EBGaramond-Italic', fontSize: 11, color: p.muted }}>
                          — {l.toSeed ? getColorAdj(l.toSeed, lang).label : (lang === 'en' ? 'a stranger' : '一個陌生人')}
                        </Text>
                        <TouchableOpacity onPress={() => handleTalkFromLetter(l)}>
                          <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 12, color: p.accent }}>
                            {lang === 'en' ? 'talk to them →' : '跟這個人說話 →'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Write tonight's letter */}
              {letterSentTonight ? (
                <Text style={{ fontFamily: 'EBGaramond-Italic', fontSize: 12, color: p.muted, textAlign: 'center' }}>
                  {lang === 'en'
                    ? '✓ Tonight\'s letter is written. It departs at dawn.'
                    : '✓ 今晚的信寫好了，天亮後出發。'}
                </Text>
              ) : (
                <View style={{ gap: 8 }}>
                  <Text style={{ fontFamily: 'Inter-Regular', fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: p.muted }}>
                    {lang === 'en' ? 'write tonight\'s letter' : '寫今晚的信'}
                  </Text>
                  <TextInput
                    value={letterDraft}
                    onChangeText={setLetterDraft}
                    placeholder={lang === 'en'
                      ? 'To whoever finds this tomorrow night…'
                      : '給明晚撿到這封信的人⋯⋯'}
                    placeholderTextColor={p.muted}
                    multiline
                    maxLength={500}
                    style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 15, lineHeight: 25, color: p.ink, backgroundColor: p.glass, borderWidth: 0.5, borderColor: p.line, borderRadius: 14, padding: 14, minHeight: 90, textAlignVertical: 'top' }}
                  />
                  <TouchableOpacity onPress={handleSendLetter} disabled={letterBusy || !letterDraft.trim()}
                    style={{ height: 46, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: letterDraft.trim() ? p.ink : p.line }}>
                    <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 14, letterSpacing: 1, color: letterDraft.trim() ? (p.dark ? '#1a1530' : '#fff') : p.muted }}>
                      {letterBusy ? (lang === 'en' ? 'Sealing…' : '封緘中⋯') : (lang === 'en' ? 'Seal the letter · one per night' : '封緘寄出 · 每晚一封')}
                    </Text>
                  </TouchableOpacity>
                  <Text style={{ fontFamily: 'EBGaramond-Italic', fontSize: 10.5, color: p.muted, textAlign: 'center' }}>
                    {lang === 'en'
                      ? 'anonymous · one random stranger · they may reply once'
                      : '匿名 · 隨機一個陌生人收到 · 對方可以回一次信'}
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      )}

      {/* All braziers — a scrollable sheet so any number of rooms stays tidy. */}
      {showAllRooms && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(20,12,8,0.62)', justifyContent: 'flex-end' }}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setShowAllRooms(false)} />
          <View style={{ backgroundColor: p.surfaceSolid, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderTopWidth: 0.5, borderColor: p.line, paddingTop: 12, maxHeight: '70%', width: '100%', maxWidth: 560, alignSelf: 'center' }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: p.line, alignSelf: 'center', marginBottom: 10 }} />
            <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 17, color: p.ink, textAlign: 'center', marginBottom: 2 }}>
              {lang === 'en' ? 'All braziers tonight' : '今晚所有火盆'}
            </Text>
            <Text style={{ fontFamily: 'EBGaramond-Italic', fontSize: 11.5, color: p.muted, textAlign: 'center', marginBottom: 10 }}>
              {lang === 'en' ? 'each brazier burns for 24 hours' : '每個火盆點燃後只留 24 小時'}
            </Text>
            <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 4, gap: 8 }} showsVerticalScrollIndicator={false}>
              {displayRooms.map(room => (
                <TouchableOpacity key={room.id} activeOpacity={0.85}
                  onPress={() => { setShowAllRooms(false); navigation.push('Room', { roomKey: room.roomKey ?? 'custom', roomId: room.id }); }}
                  style={[styles.roomItem, { backgroundColor: p.glass, borderColor: p.line }]}>
                  <BreathDot p={p} size={4} />
                  <Text style={[styles.roomTopic, { color: p.ink }]} numberOfLines={1}>
                    {room.customTopicZh || room.customTopicEn
                      || (room.roomKey && !['new', 'custom'].includes(room.roomKey)
                          ? t(room.roomKey as any, lang)
                          : (lang === 'en' ? 'a quiet brazier' : '一個火盆'))}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <Text style={[styles.roomCount, { color: p.muted }]}>{room.messageCount ?? 0}</Text>
                    <Text style={{ color: p.muted, fontSize: 15, opacity: 0.5, marginTop: -1 }}>›</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      )}

      {showReleaseWelcome && (
        <ReleaseWelcome p={p} lang={lang} onDismiss={dismissReleaseWelcome} />
      )}
      {!showReleaseWelcome && showGuide && <FirstTimeGuide p={p} lang={lang} onDismiss={dismissGuide} />}
      {showSupport && <CrisisSupportCard p={p} lang={lang} onDismiss={() => setShowSupport(false)} />}
    </VaporBackground>
  );
}

// ── First-time guide — a refined welcome that introduces the three spaces ──
// Hand-drawn-feeling glyphs (not emoji), a warm halo, and a staggered entrance
// so the very first thing a new user sees feels considered, not stock.

function BrazierGlyph({ c, accent }: { c: string; accent: string }) {
  // A low bowl cradling a small flame — the "sit by a topic" space.
  return (
    <Svg width={30} height={30} viewBox="0 0 32 32">
      <Path d="M16 7 C 18.4 10.2, 19.6 12, 19.6 14.4 C 19.6 16.7, 18 18.3, 16 18.3 C 14 18.3, 12.4 16.7, 12.4 14.4 C 12.4 12, 13.6 10.2, 16 7 Z"
        fill={accent} fillOpacity={0.9} />
      <Path d="M6 21 L 26 21 L 23.5 26.5 C 23.2 27.2, 22.5 27.6, 21.8 27.6 L 10.2 27.6 C 9.5 27.6, 8.8 27.2, 8.5 26.5 Z"
        fill="none" stroke={c} strokeWidth={1.4} strokeLinejoin="round" />
      <Line x1={9} y1={21} x2={23} y2={21} stroke={c} strokeWidth={1.4} strokeLinecap="round" />
    </Svg>
  );
}

function MatchGlyph({ c, accent }: { c: string; accent: string }) {
  // Two souls drawing close — just the two of you.
  return (
    <Svg width={30} height={30} viewBox="0 0 32 32">
      <Circle cx={12} cy={16} r={6.4} fill="none" stroke={c} strokeWidth={1.4} />
      <Circle cx={20} cy={16} r={6.4} fill="none" stroke={accent} strokeWidth={1.4} />
      <Circle cx={16} cy={16} r={1.6} fill={accent} />
    </Svg>
  );
}

function SafetyGlyph({ c, accent }: { c: string; accent: string }) {
  return (
    <Svg width={30} height={30} viewBox="0 0 32 32">
      <Path d="M16 4 L25 8 V15 C25 21 21.4 25.5 16 28 C10.6 25.5 7 21 7 15 V8 Z"
        fill="none" stroke={c} strokeWidth={1.4} strokeLinejoin="round" />
      <Path d="M11.5 16 L14.5 19 L20.8 12.5"
        fill="none" stroke={accent} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function FreeTalkGlyph({ c, accent }: { c: string; accent: string }) {
  return (
    <Svg width={30} height={30} viewBox="0 0 32 32">
      <Path d="M6 7.5 H26 V21 H16 L10 26 V21 H6 Z"
        fill="none" stroke={c} strokeWidth={1.4} strokeLinejoin="round" />
      <Circle cx={12} cy={14.5} r={1.2} fill={accent} />
      <Circle cx={16} cy={14.5} r={1.2} fill={accent} />
      <Circle cx={20} cy={14.5} r={1.2} fill={accent} />
    </Svg>
  );
}

function LoftGlyph({ c, accent }: { c: string; accent: string }) {
  // A crescent over a single ember — the late-night room.
  return (
    <Svg width={30} height={30} viewBox="0 0 32 32">
      <Path d="M22 6 C 17 6.5, 13 10.8, 13 16 C 13 21.2, 17 25.5, 22 26 C 18 24, 15.4 20.3, 15.4 16 C 15.4 11.7, 18 8 22 6 Z"
        fill={c} fillOpacity={0.85} />
      <Circle cx={23} cy={22} r={2.2} fill={accent} />
      <Circle cx={23} cy={22} r={4.4} fill={accent} fillOpacity={0.18} />
    </Svg>
  );
}

function LetterGlyph({ c, accent }: { c: string; accent: string }) {
  return (
    <Svg width={30} height={30} viewBox="0 0 32 32">
      <Path d="M5.5 9.5 H26.5 V23 H5.5 Z" fill="none" stroke={c} strokeWidth={1.4} strokeLinejoin="round" />
      <Path d="M6 10 L16 18 L26 10" fill="none" stroke={accent} strokeWidth={1.4} strokeLinejoin="round" />
      <Path d="M6 22.5 L13 16.8 M26 22.5 L19 16.8" fill="none" stroke={c} strokeWidth={1.1} strokeLinecap="round" />
    </Svg>
  );
}

function ReleaseWelcome({ p, lang, onDismiss }: { p: Palette; lang: string; onDismiss: () => void }) {
  const scale = useRef(new Animated.Value(0.94)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const reduceMotion = useReduceMotion();

  useEffect(() => {
    if (reduceMotion) {
      scale.setValue(1);
      opacity.setValue(1);
      return;
    }
    const intro = Animated.parallel([
      Animated.spring(scale, { toValue: 1, tension: 64, friction: 9, useNativeDriver: USE_NATIVE_DRIVER }),
      Animated.timing(opacity, { toValue: 1, duration: MOTION.standard, easing: MOTION.easeOut, useNativeDriver: USE_NATIVE_DRIVER }),
    ]);
    intro.start();
    return () => intro.stop();
  }, [opacity, reduceMotion, scale]);

  const updates = lang === 'en'
    ? [
        ['A clearer night', 'Richer contrast, stronger cards and unmistakable selected states.'],
        ['A safer first hello', 'Intent, boundaries and conversation prompts now lead the flow.'],
        ['Nothing charged too early', 'A one-to-one conversation only counts after you actually speak.'],
      ]
    : [
        ['夜晚更清楚', '更有層次的暮光色彩、卡片，以及一眼可辨的選中狀態。'],
        ['第一句更安心', '意圖、界線與破冰提示，現在會一路帶著你。'],
        ['不會提早扣燭芯', '真正開口說話後，才會算一次一對一。'],
      ];

  return (
    <Animated.View style={[styles.guideScrim, { opacity }]}>
      <Animated.View style={{ width: '100%', maxWidth: 360, transform: [{ scale }] }}>
        <LinearGradient
          colors={p.dark ? ['#222541', '#16182d'] : ['#fffaf5', '#f6e8e6', '#ecd9df']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.releaseCard, { borderColor: p.accent + '45' }]}
        >
          <View style={[styles.releaseBadge, { backgroundColor: p.accent }]}>
            <Text style={styles.releaseBadgeText}>1.1 · ALPHA 21</Text>
          </View>
          <View style={[styles.releaseOrb, { backgroundColor: p.accentSoft }]}>
            <WickGlyph size={22} color={p.accent} />
          </View>
          <Text style={[styles.releaseTitle, { color: p.ink }]}>
            {lang === 'en' ? 'The night has changed.' : '今晚，真的不一樣了。'}
          </Text>
          <Text style={[styles.releaseSub, { color: p.muted }]}>
            {lang === 'en'
              ? 'This is the rebuilt testing release. Here is what to notice first.'
              : '這是重新打造的測試版本。請先感受這三個改變。'}
          </Text>
          <View style={styles.releaseList}>
            {updates.map(([title, body], index) => (
              <View
                key={title}
                style={[styles.releaseRow, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: p.line }]}
              >
                <View style={[styles.releaseIndex, { backgroundColor: p.accentSoft }]}>
                  <Text style={[styles.releaseIndexText, { color: p.accent }]}>0{index + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.releaseRowTitle, { color: p.ink }]}>{title}</Text>
                  <Text style={[styles.releaseRowBody, { color: p.muted }]}>{body}</Text>
                </View>
              </View>
            ))}
          </View>
          <PressableScale
            onPress={onDismiss}
            accessibilityRole="button"
            accessibilityLabel={lang === 'en' ? 'Start testing version 1.1' : '開始測試 1.1 版本'}
            style={[styles.releaseButton, { backgroundColor: p.ink }]}
          >
            <Text style={[styles.releaseButtonText, { color: p.dark ? '#15172e' : '#fff' }]}>
              {lang === 'en' ? 'Start testing 1.1' : '開始測試 1.1'}
            </Text>
          </PressableScale>
        </LinearGradient>
      </Animated.View>
    </Animated.View>
  );
}

function FirstTimeGuide({ p, lang, onDismiss }: { p: Palette; lang: string; onDismiss: () => void }) {
  const scale = useRef(new Animated.Value(0.92)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const reduceMotion = useReduceMotion();

  useEffect(() => {
    if (reduceMotion) {
      scale.setValue(1);
      opacity.setValue(1);
      return;
    }
    const intro = Animated.parallel([
      Animated.spring(scale, { toValue: 1, tension: 60, friction: 9, useNativeDriver: USE_NATIVE_DRIVER }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: MOTION.standard,
        easing: MOTION.easeOut,
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
    ]);
    intro.start();
    return () => intro.stop();
  }, [opacity, reduceMotion, scale]);

  const rows = [
    { Glyph: MatchGlyph, title: lang === 'en' ? 'One person, 30 minutes' : '一個人，30 分鐘', alt: '',
      desc: lang === 'en' ? 'Choose how you feel tonight, then talk anonymously' : '選今晚的狀態，再匿名找一個人說說話' },
    { Glyph: SafetyGlyph, title: lang === 'en' ? 'You stay in control' : '主導權一直在你手上', alt: '',
      desc: lang === 'en' ? 'Leave, block or report at any moment' : '任何時候都能離開、封鎖或檢舉' },
    { Glyph: FreeTalkGlyph, title: lang === 'en' ? 'Talking stays free' : '說話本身免費', alt: '',
      desc: lang === 'en' ? 'Wicks are only for optional closer moments and extra use' : '燭芯只用於額外次數與自願靠近的功能' },
  ];

  return (
    <Animated.View style={[styles.guideScrim, { opacity }]}>
      {/* warm radial halo behind the card */}
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          <SvgRadialGradient id="guideHalo" cx="50%" cy="42%" r="55%">
            <Stop offset="0%" stopColor={p.accent} stopOpacity={p.dark ? 0.22 : 0.16} />
            <Stop offset="100%" stopColor={p.accent} stopOpacity={0} />
          </SvgRadialGradient>
        </Defs>
        <Path d="M0 0 H1000 V1000 H0 Z" fill="url(#guideHalo)" />
      </Svg>

      <Animated.View style={{ width: '100%', maxWidth: 360, transform: [{ scale }] }}>
        <View style={[styles.guideCard, { backgroundColor: p.surfaceSolid, borderColor: p.accent + '33' }]}>
          {/* top accent hairline */}
          <View style={[styles.guideTopAccent, { backgroundColor: p.accent }]} />

          <FadeInUp delay={80} distance={8}>
            <View style={{ alignItems: 'center', marginBottom: 4 }}>
              <WickGlyph size={18} color={p.accent} />
            </View>
          </FadeInUp>

          <FadeInUp delay={140} distance={8}>
            <Text style={[styles.guideTitle, { color: p.ink }]}>
              {lang === 'en' ? 'Your first night, simply' : '第一次來，只要三件事'}
            </Text>
          </FadeInUp>
          <FadeInUp delay={200} distance={8}>
            <Text style={[styles.guideSub, { color: p.muted }]}>
              {lang === 'en' ? 'the other spaces can wait' : '其他空間，想探索時再打開'}
            </Text>
          </FadeInUp>

          <View style={{ marginTop: 22 }}>
            {rows.map((r, i) => (
              <FadeInUp key={r.title} delay={280 + i * 90} distance={10}>
                <View style={[styles.guideRow, i > 0 && { borderTopWidth: 0.5, borderTopColor: p.line }]}>
                  <View style={[styles.guideIconWrap, { backgroundColor: p.accentSoft, borderColor: p.accent + '2a' }]}>
                    <r.Glyph c={p.ink} accent={p.accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 7 }}>
                      <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 16, color: p.ink, fontWeight: '500' }}>{r.title}</Text>
                      <Text style={{ fontFamily: 'EBGaramond-Italic', fontSize: 11, color: p.muted, opacity: 0.55 }}>{r.alt}</Text>
                    </View>
                    <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 13, color: p.muted, lineHeight: 20, marginTop: 2 }}>{r.desc}</Text>
                  </View>
                </View>
              </FadeInUp>
            ))}
          </View>

          <FadeInUp delay={570} distance={10}>
            <TouchableOpacity onPress={onDismiss} activeOpacity={0.88}
              style={[styles.guideBtn, { backgroundColor: p.ink }]}>
              <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 15, letterSpacing: 2, color: p.dark ? '#1a1530' : '#fff', fontWeight: '500' }}>
                {lang === 'en' ? 'Step in' : '走進來'}
              </Text>
            </TouchableOpacity>
          </FadeInUp>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  topBar:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  identityRow:   { flexDirection: 'row', alignItems: 'center', gap: 10 },
  youLabel:      { fontFamily: 'Inter-Regular', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 1 },
  langBtn:       { width: 36, height: 36, borderRadius: 18, borderWidth: 0.5, alignItems: 'center', justifyContent: 'center' },
  wicksBtn:      { minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 0.5 },
  countdown:     { fontFamily: 'Inter-Regular', fontSize: 11, letterSpacing: 1 },

  contentScroll: { flex: 1 },
  content:       { flexGrow: 1, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 22, gap: 16 },
  releasePill:   { alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 11, paddingVertical: 6, borderRadius: 999, borderWidth: 0.8 },
  releasePillText:{ fontFamily: 'Inter-Regular', fontSize: 9.5, letterSpacing: 1.5, fontWeight: '600' },
  heading:       { fontFamily: 'NotoSerifTC-Light', fontSize: 28, lineHeight: 36, textAlign: 'center' },
  subheading:    { fontFamily: 'NotoSerifTC-Regular', fontSize: 14, lineHeight: 22, textAlign: 'center', marginTop: -8, opacity: 0.85 },

  ritualCard:    { borderRadius: 26, borderWidth: 0.7, padding: 16, gap: 14, shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.08, shadowRadius: 28, elevation: 3 },
  ritualMeta:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ritualEyebrow: { fontFamily: 'Inter-Regular', fontSize: 9.5, letterSpacing: 1.6, fontWeight: '500' },
  ritualPrivacy: { fontFamily: 'EBGaramond-Italic', fontSize: 11.5 },
  ritualDivider: { height: StyleSheet.hairlineWidth, marginHorizontal: 2 },
  inputWrap:     { borderRadius: 18, borderWidth: 0.7, padding: 14 },
  input:         { fontFamily: 'NotoSerifTC-Regular', fontSize: 16, lineHeight: 26, minHeight: 66, textAlignVertical: 'top' },
  inputFooter:   { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  modeSection:   { gap: 8 },
  modeHeader:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modeHint:      { fontFamily: 'NotoSerifTC-Regular', fontSize: 10.5 },
  modeRow:       { flexDirection: 'row', gap: 7 },
  modeCard:      { flex: 1, minHeight: 78, borderRadius: 17, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6, paddingVertical: 9 },
  modeGlyphWrap: { height: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 3 },
  modeCheck:     { position: 'absolute', right: -8, top: -3, width: 14, height: 14, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  modeText:      { fontFamily: 'NotoSerifTC-Regular', fontSize: 11.5, lineHeight: 16, textAlign: 'center' },
  modeDescription:{ fontFamily: 'NotoSerifTC-Regular', fontSize: 12, lineHeight: 19, textAlign: 'center', paddingHorizontal: 8, marginTop: 3 },
  safetyStrip:   { marginTop: 14, padding: 12, borderRadius: 15, borderWidth: 0.7 },
  safetyStripTitle:{ fontFamily: 'Inter-Regular', fontSize: 9.5, letterSpacing: 1.6, fontWeight: '600' },
  safetyStripBody:{ fontFamily: 'NotoSerifTC-Regular', fontSize: 11.5, lineHeight: 19, marginTop: 4 },
  exploreGate:   { minHeight: 92, borderRadius: 20, borderWidth: 0.7, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  exploreGateTitle:{ fontFamily: 'NotoSerifTC-Regular', fontSize: 14.5, lineHeight: 21 },
  exploreGateBody:{ fontFamily: 'NotoSerifTC-Regular', fontSize: 11.5, lineHeight: 18, marginTop: 4 },
  exploreGateAction:{ fontFamily: 'NotoSerifTC-Regular', fontSize: 12.5, fontWeight: '500' },

  roomsSection:  { gap: 10, marginTop: 2 },
  roomsHeader:   { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  roomsLabel:    { fontFamily: 'Inter-Regular', fontSize: 10, letterSpacing: 2, fontWeight: '500' },
  sectionHint:   { fontFamily: 'NotoSerifTC-Regular', fontSize: 11.5, marginTop: 4 },
  openRoomLink:  { fontFamily: 'NotoSerifTC-Regular', fontSize: 12, fontWeight: '500' },
  roomsList:     { gap: 6 },
  roomItem:      { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 18, borderWidth: 0.5 },
  roomGlyph:     { width: 44, height: 44, borderRadius: 14, borderWidth: 0.5, alignItems: 'center', justifyContent: 'center' },
  roomTopic:     { fontFamily: 'NotoSerifTC-Regular', fontSize: 14, fontWeight: '500' },
  roomMeta:      { fontFamily: 'NotoSerifTC-Regular', fontSize: 10.5, marginTop: 3 },
  roomCount:     { fontFamily: 'Inter-Regular', fontSize: 11, fontWeight: '500' },
  noRooms:       { fontFamily: 'NotoSerifTC-Regular', fontSize: 12, textAlign: 'center', paddingVertical: 8 },
  noRoomsCta:    { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 14, borderRadius: 14, borderWidth: 0.5, borderStyle: 'dashed' },
  noRoomsText:   { flex: 1, fontFamily: 'NotoSerifTC-Regular', fontSize: 13 },

  secondaryRow:  { flexDirection: 'row', gap: 10 },
  secondaryCardWrap: { flex: 1 },
  secondaryCard: { minHeight: 104, borderRadius: 20, borderWidth: 0.5, padding: 14, gap: 10, overflow: 'hidden' },
  secondaryTitle:{ fontFamily: 'NotoSerifTC-Regular', fontSize: 14.5, fontWeight: '500' },
  secondarySubtitle:{ fontFamily: 'NotoSerifTC-Regular', fontSize: 10.5, lineHeight: 15, marginTop: 2 },
  secondaryArrowDark:{ position: 'absolute', right: 14, bottom: 12, color: 'rgba(245,226,196,0.72)', fontSize: 17 },
  loftTitle:     { fontFamily: 'NotoSerifTC-Regular', fontSize: 14.5, color: '#f5e2c4', fontWeight: '500' },
  loftSubtitle:  { fontFamily: 'NotoSerifTC-Regular', fontSize: 10.5, lineHeight: 15, color: 'rgba(245,226,196,0.58)', marginTop: 2 },

  bottom:        { paddingHorizontal: 20, paddingTop: 11, paddingBottom: 16, borderTopWidth: 0.5 },

  guideScrim:    { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(20,12,8,0.62)', alignItems: 'center', justifyContent: 'center', padding: 28 },
  guideCard:     { borderRadius: 26, paddingTop: 30, paddingBottom: 22, paddingHorizontal: 24, width: '100%', borderWidth: 0.5, overflow: 'hidden',
                   shadowColor: '#000', shadowOpacity: 0.28, shadowRadius: 30, shadowOffset: { width: 0, height: 16 }, elevation: 14 },
  guideTopAccent:{ position: 'absolute', top: 0, alignSelf: 'center', width: 44, height: 3, borderRadius: 3, opacity: 0.7 },
  guideTitle:    { fontFamily: 'NotoSerifTC-Light', fontSize: 24, letterSpacing: 1, textAlign: 'center', marginTop: 10 },
  guideSub:      { fontFamily: 'EBGaramond-Italic', fontSize: 13, textAlign: 'center', marginTop: 6 },
  guideRow:      { flexDirection: 'row', gap: 16, alignItems: 'center', paddingVertical: 16 },
  guideIconWrap: { width: 50, height: 50, borderRadius: 16, borderWidth: 0.5, alignItems: 'center', justifyContent: 'center' },
  guideBtn:      { marginTop: 24, height: 52, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  releaseCard:   { borderRadius: 30, padding: 20, width: '100%', borderWidth: 1, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 34, shadowOffset: { width: 0, height: 18 }, elevation: 16 },
  releaseBadge:  { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  releaseBadgeText:{ color: '#fff', fontFamily: 'Inter-Regular', fontSize: 9, letterSpacing: 1.4, fontWeight: '700' },
  releaseOrb:    { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginTop: 15, marginBottom: 10 },
  releaseTitle:  { fontFamily: 'NotoSerifTC-Regular', fontSize: 24, lineHeight: 33 },
  releaseSub:    { fontFamily: 'NotoSerifTC-Regular', fontSize: 13, lineHeight: 21, marginTop: 6 },
  releaseList:   { marginTop: 12 },
  releaseRow:    { flexDirection: 'row', gap: 12, paddingVertical: 10, alignItems: 'flex-start' },
  releaseIndex:  { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  releaseIndexText:{ fontFamily: 'Inter-Regular', fontSize: 9, fontWeight: '700', letterSpacing: 0.8 },
  releaseRowTitle:{ fontFamily: 'NotoSerifTC-Regular', fontSize: 14.5, fontWeight: '600' },
  releaseRowBody:{ fontFamily: 'NotoSerifTC-Regular', fontSize: 11.5, lineHeight: 18, marginTop: 2 },
  releaseButton: { height: 50, borderRadius: 999, alignItems: 'center', justifyContent: 'center', marginTop: 12, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 5 },
  releaseButtonText:{ fontFamily: 'NotoSerifTC-Regular', fontSize: 15, fontWeight: '600', letterSpacing: 0.8 },
});
