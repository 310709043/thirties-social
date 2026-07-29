import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Alert,
  ScrollView, StyleSheet, KeyboardAvoidingView, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import { DIRECTIONS } from '../lib/theme';
import { t } from '../lib/copy';
import { VaporBackground, GlassCard, CountdownBar, Cap, WickGlyph, PhotoVeil, FadeInUp, TypingIndicator, ExtendGlyph, RekindleGlyph, BondGlyph } from '../components/ui';
import { hapticMedium } from '../lib/haptics';
import { Identity } from '../components/identity/Identity';
import { ColorAdjLabel } from '../components/identity/Identity';
import { useAppStore, setWicks as saveWicks, trackConversation, recordMatch } from '../hooks/useAppStore';
import { subscribeToConversationMessages, sendConversationMessage, spendWicks, getCurrentUid, endConversation, DbConvMessage, setTyping, subscribeToTyping, subscribeToConversationDoc, voteExtendConversation, voteRekindle, voteBond, stampConversationSeed } from '../lib/db';
import { scheduleRekindleReminder } from '../lib/notifications';
import { filterMessage } from '../lib/filter';
import { analytics } from '../lib/analytics';
import { pickImage, uploadVeiledPhoto, getVeiledPhoto } from '../lib/photos';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ScreenCapture from 'expo-screen-capture';

type Props = NativeStackScreenProps<RootStackParamList, 'Chat'>;

const TOTAL_SECONDS = 30 * 60;
const CHAT_MAX_LENGTH = 280;
/** Minimum messages exchanged before a veiled photo can be lifted (anti photo-grab). */
const VEIL_MIN_MESSAGES = 10;
/** 續燭 — each side pays this to vote for a one-time +30 min extension. */
const EXTEND_WICK_COST = 2;
/** 重逢 — each side pays this to vote for meeting again tomorrow night. */
const REKINDLE_WICK_COST = 3;

export default function ChatScreen({ navigation, route }: Props) {
  const { seed, direction, lang, identityKind, wicks, autoFilter, slowMode, vigil } = useAppStore();
  const p = DIRECTIONS[direction];
  const otherSeed = route.params?.otherSeed;
  const conversationId = (route.params as any)?.conversationId as string | undefined;
  const matchCharge = (route.params as any)?.matchCharge as boolean | undefined;
  const chargedRef = useRef(false);

  ScreenCapture.usePreventScreenCapture();

  // The countdown runs off the conversation's OWN expiresAt (shared by both
  // sides), not a private 30-minute timer from when this screen mounted — the
  // old version let the two sides run different clocks, so one person's chat
  // died while the other thought they'd been ghosted.
  const closeAtRef = useRef(Date.now() + TOTAL_SECONDS * 1000);
  const [remaining, setRemaining] = useState(TOTAL_SECONDS);
  const [extendVotes, setExtendVotes] = useState<Record<string, boolean>>({});
  const [extended, setExtended] = useState(false);
  const [extendBusy, setExtendBusy] = useState(false);
  const otherUidRef = useRef<string | null>(null);
  const msgCountRef = useRef(0);
  const [rekindleVotes, setRekindleVotes] = useState<Record<string, boolean>>({});
  const [bondVotes, setBondVotes] = useState<Record<string, boolean>>({});
  const [rekindleBusy, setRekindleBusy] = useState(false);
  const [bondBusy, setBondBusy] = useState(false);
  // Once I've paid for a vote, hold the door until the snapshot confirms it —
  // the votes arrive via subscription with a delay, and a second tap inside
  // that window used to charge the wicks a second time.
  const paidExtendRef = useRef(false);
  const paidRekindleRef = useRef(false);
  const rekindleScheduledRef = useRef(false);
  const [realMessages, setRealMessages] = useState<DbConvMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);
  const [showVeilSheet, setShowVeilSheet] = useState(false);
  const [veilSent, setVeilSent] = useState(false);
  const [veilSending, setVeilSending] = useState(false);
  const [selectedPhotoUri, setSelectedPhotoUri] = useState<string | null>(null);
  const [otherTyping, setOtherTyping] = useState(false);
  const [otherLeft, setOtherLeft] = useState(false);
  const iLeftRef = useRef(false);
  const [pausing, setPausing] = useState(false);
  const pauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pauseReadyRef = useRef(false);
  const scrollRef = useRef<ScrollView>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!conversationId) return;
    trackConversation(conversationId);
    analytics.conversationStart(conversationId);
    // Stamp my display seed on the conversation so the other side's home
    // banner / push deep link can show who is still burning here.
    void stampConversationSeed(conversationId, seed);
    return subscribeToConversationMessages(conversationId, msgs => {
      msgCountRef.current = msgs.length;
      setRealMessages(msgs);
    });
  }, [conversationId]);

  // Leave to the Close screen, carrying what it needs to offer an echo (a last
  // line delivered tomorrow morning) — only when a real exchange happened.
  const goClose = () => {
    navigation.replace('Close', {
      echoToUid: msgCountRef.current >= 2 ? otherUidRef.current : null,
      echoConversationId: conversationId,
      echoOtherSeed: otherSeed,
    } as any);
  };

  // Subscribe to other user's typing state
  useEffect(() => {
    if (!conversationId) return;
    const uid = getCurrentUid();
    if (!uid) return;
    return subscribeToTyping(conversationId, uid, setOtherTyping);
  }, [conversationId]);

  // One doc subscription drives everything conversation-level: the other person
  // leaving, extend votes, and the shared expiresAt (which moves when 續燭 lands).
  useEffect(() => {
    if (!conversationId) return;
    return subscribeToConversationDoc(conversationId, conv => {
      if (!conv || (conv as any).endedAt) {
        if (!iLeftRef.current) setOtherLeft(true);
        return;
      }
      const expMs = (conv as any).expiresAt?.toMillis?.();
      if (expMs) closeAtRef.current = expMs;
      const me = getCurrentUid();
      if (me) otherUidRef.current = conv.userAId === me ? conv.userBId : conv.userAId;
      setExtendVotes(conv.extendVotes ?? {});
      setExtended(!!conv.extended);
      const rv = (conv as any).rekindleVotes ?? {};
      setRekindleVotes(rv);
      setBondVotes((conv as any).bondVotes ?? {});
      // Reunion confirmed (both voted) — schedule tomorrow-21:00 reminder once.
      const uid0 = getCurrentUid();
      if (uid0 && rv[uid0] && Object.keys(rv).some(k => k !== uid0 && rv[k]) && !rekindleScheduledRef.current) {
        rekindleScheduledRef.current = true;
        void scheduleRekindleReminder(lang);
      }
    });
  }, [conversationId]);

  useEffect(() => {
    let warned = false;
    const id = setInterval(() => {
      const left = Math.max(0, Math.floor((closeAtRef.current - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 60 && !warned) { warned = true; hapticMedium(); }
      if (left <= 0) {
        clearInterval(id);
        iLeftRef.current = true;
        (async () => {
          if (conversationId) {
            await endConversation(conversationId, 'timer_expired');
            analytics.conversationEnd(conversationId, 'timer_expired');
          }
          goClose();
        })();
      }
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // 續燭 — I pay my share, then vote; when the other side has voted too, the
  // vote write itself pushes expiresAt out 30 minutes for both of us.
  const myUid = getCurrentUid();
  const iVotedExtend = !!(myUid && extendVotes[myUid]);
  const otherVotedExtend = Object.keys(extendVotes).some(k => k !== myUid && extendVotes[k]);
  const handleExtend = async () => {
    if (extendBusy || extended || iVotedExtend || paidExtendRef.current || !conversationId) return;
    if (wicks < EXTEND_WICK_COST) {
      Alert.alert(
        lang === 'en' ? 'Not enough wicks' : '燭芯不足',
        lang === 'en' ? `Extending costs ${EXTEND_WICK_COST} wicks from each side.` : `續燭需要雙方各 ${EXTEND_WICK_COST} 燭芯。`,
      );
      return;
    }
    setExtendBusy(true);
    const paid = await spendWicks(EXTEND_WICK_COST, 'extend', conversationId);
    if (paid.ok) {
      paidExtendRef.current = true;
      const ok = await voteExtendConversation(conversationId);
      if (!ok) {
        // Vote write failed after payment — extremely rare; tell the user.
        Alert.alert(lang === 'en' ? 'Something went wrong' : '出了點問題',
          lang === 'en' ? 'Please try again.' : '請再試一次。');
      }
    }
    setExtendBusy(false);
  };

  // 重逢 — vote to meet again tomorrow night (3 wicks each, mutual).
  const iVotedRekindle = !!(myUid && rekindleVotes[myUid]);
  const otherVotedRekindle = Object.keys(rekindleVotes).some(k => k !== myUid && rekindleVotes[k]);
  const rekindleConfirmed = iVotedRekindle && otherVotedRekindle;
  const handleRekindle = async () => {
    if (rekindleBusy || iVotedRekindle || paidRekindleRef.current || !conversationId || !otherSeed) return;
    if (wicks < REKINDLE_WICK_COST) {
      Alert.alert(
        lang === 'en' ? 'Not enough wicks' : '燭芯不足',
        lang === 'en' ? `Meeting again costs ${REKINDLE_WICK_COST} wicks from each side.` : `重逢需要雙方各 ${REKINDLE_WICK_COST} 燭芯。`,
      );
      return;
    }
    setRekindleBusy(true);
    const paid = await spendWicks(REKINDLE_WICK_COST, 'rekindle', conversationId);
    if (paid.ok) {
      paidRekindleRef.current = true;
      const r = await voteRekindle({ conversationId, mySeed: seed, otherSeed });
      if (r === 'confirmed') {
        hapticMedium();
        rekindleScheduledRef.current = true;
        void scheduleRekindleReminder(lang);
      }
    }
    setRekindleBusy(false);
  };

  // 熟人 — keep each other (Vigil proposes; either side may accept for free).
  const iVotedBond = !!(myUid && bondVotes[myUid]);
  const otherVotedBond = Object.keys(bondVotes).some(k => k !== myUid && bondVotes[k]);
  const bondConfirmed = iVotedBond && otherVotedBond;
  const handleBond = async () => {
    if (bondBusy || iVotedBond || !conversationId || !otherSeed) return;
    // Proposing is a Vigil perk; accepting someone else's proposal is free for all.
    if (!vigil && !otherVotedBond) {
      Alert.alert(
        lang === 'en' ? 'A Vigil privilege' : '守夜會員特權',
        lang === 'en'
          ? 'Keeping each other is a Vigil privilege. If they propose it, you can accept for free.'
          : '「留下彼此」是守夜會員的特權。若對方先提出，你可以免費答應。',
        [
          { text: lang === 'en' ? 'Not now' : '再想想', style: 'cancel' },
          { text: lang === 'en' ? 'Go Vigil' : '升級守夜', onPress: () => navigation.push('Upgrade') },
        ],
      );
      return;
    }
    setBondBusy(true);
    const r = await voteBond({ conversationId, mySeed: seed, otherSeed });
    if (r === 'confirmed') hapticMedium();
    setBondBusy(false);
  };

  // Always points at this render's sendMessage (fresh inputText for the
  // slow-mode timer); assigned right after sendMessage is defined below.
  const sendMessageRef = useRef<() => void>(() => {});

  // Clear the slow-mode timer if the chat unmounts mid-pause.
  useEffect(() => () => { if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current); }, []);

  const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
  const ss = String(remaining % 60).padStart(2, '0');
  const progress = Math.min(1, remaining / TOTAL_SECONDS);

  // Guard AFTER every hook (a conditional early-return above them is a latent
  // hooks-order violation): if the route somehow lacks its params, offer a
  // clean exit instead of rendering a broken chat.
  if (!otherSeed || !conversationId) {
    return (
      <VaporBackground p={p} style={{ flex: 1 }}>
        <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 16, color: p.muted }}>
            {lang === 'en' ? 'Conversation not found' : '找不到對話'}
          </Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 16 }}>
            <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 14, color: p.accent }}>
              {lang === 'en' ? 'Go back' : '返回'}
            </Text>
          </TouchableOpacity>
        </SafeAreaView>
      </VaporBackground>
    );
  }

  // Debounced typing indicator
  const handleInputChange = (text: string) => {
    setInputText(text);
    if (!conversationId) return;
    if (text.length > 0) {
      setTyping(conversationId, true);
      // Clear previous timeout
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      // Auto-stop typing after 3 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        setTyping(conversationId, false);
      }, 3000);
    } else {
      setTyping(conversationId, false);
    }
  };

  // Slow mode (opt-in): between 22:00-05:00 hold each message a few seconds
  // before it goes out — a small pause to reconsider late-night words.
  const isNightSlow = () => {
    if (!slowMode) return false;
    const h = new Date().getHours();
    return h >= 22 || h < 5;
  };

  const sendMessage = async () => {
    if (pausing || sendingRef.current) return;
    if (!inputText.trim()) return;
    if (isNightSlow() && !pauseReadyRef.current) {
      setPausing(true);
      pauseTimerRef.current = setTimeout(() => {
        pauseReadyRef.current = true;
        setPausing(false);
        // Call through the ref: the closure captured 3s ago holds the OLD
        // inputText — if they edited during the breath, the stale version
        // would have been sent and their edit silently discarded.
        sendMessageRef.current();
      }, 3000);
      return;
    }
    pauseReadyRef.current = false;
    const messageText = inputText.trim();
    const check = autoFilter ? filterMessage(messageText) : { blocked: false };
    if (check.blocked) {
      Alert.alert(
        lang === 'en' ? 'Message blocked' : '\u8A0A\u606F\u5DF2\u88AB\u904E\u6FFE',
        lang === 'en' ? 'This message contains content that may be harmful.' : '\u9019\u5247\u8A0A\u606F\u5305\u542B\u53EF\u80FD\u50B7\u5BB3\u4ED6\u4EBA\u7684\u5167\u5BB9\u3002',
      );
      return;
    }
    if (conversationId) {
      sendingRef.current = true;
      setSending(true);
      try {
        const ok = await sendConversationMessage({ conversationId, content: messageText });
        if (!ok) {
          Alert.alert(
            lang === 'en' ? 'Failed to send' : '\u9001\u51FA\u5931\u6557',
            lang === 'en'
              ? 'Your message is still here. Check your connection and try again.'
              : '訊息還留在輸入框，請確認網路後再試一次。',
          );
          return;
        }
        analytics.messageSend(conversationId);
        // A match "counts" only once you actually speak — charge on the first
        // message you send, never for entering an empty chat.
        if (matchCharge && !chargedRef.current) {
          chargedRef.current = true;
          // Await so a paid match actually settles (and a failed charge doesn't
          // silently let the match go free); only mark charged once it succeeds.
          const charged = await recordMatch();
          if (!charged) chargedRef.current = false;
        }
        setInputText('');
        setTyping(conversationId, false);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
      } finally {
        sendingRef.current = false;
        setSending(false);
      }
    }
  };

  sendMessageRef.current = sendMessage;

  const displayMessages = realMessages.map(msg => ({
    from: msg.senderId === getCurrentUid() ? 'me' : 'other',
    zh: msg.content, en: msg.content, age: 0,
    messageType: msg.messageType ?? 'text',
    photoId: msg.messageType === 'photo' ? msg.content : null,
  }));

  return (
    <VaporBackground p={p} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          style={{ flex: 1, width: '100%', maxWidth: 620, alignSelf: 'center' }}
          // 'padding' on BOTH platforms: when Android's adjustResize works the
          // measured overlap is 0 (no double inset); when edge-to-edge swallows
          // the resize, the padding kicks in — either way the composer stays visible.
          behavior="padding"
          keyboardVerticalOffset={0}
        >
          {/* COUNTDOWN HEADER */}
          <View style={[styles.header, {
            backgroundColor: p.dark ? 'rgba(13,18,36,0.92)' : 'rgba(255,255,255,0.75)',
            borderBottomWidth: 0.5, borderBottomColor: p.line,
          }]}>
            {/* Back */}
            <View style={styles.headerRow}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={lang === 'en' ? 'End conversation and leave' : '結束對話並離開'}
                onPress={() => {
                  iLeftRef.current = true;
                  if (conversationId) {
                    endConversation(conversationId, 'user_ended');
                    analytics.conversationEnd(conversationId, 'user_ended');
                  }
                  goClose();
                }}
                style={styles.backBtn}
              >
                <Text style={{ color: p.muted, fontSize: 20 }}>‹</Text>
              </TouchableOpacity>

              {/* Other person */}
              <View style={styles.otherIdentity}>
                <Identity kind={identityKind} seed={otherSeed} size={28} palette={p} lang={lang} trust={0.25} />
                <ColorAdjLabel seed={otherSeed} lang={lang} palette={p} />
              </View>

              {/* Safety — report/block needs the other person's real uid (from the
                  conversation doc), NOT their display seed: a report filed against
                  a seed can't be traced to any account, so moderation couldn't act. */}
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={lang === 'en' ? 'Safety, report or block' : '安全、檢舉或封鎖'}
                onPress={() => navigation.push('Safety', { reportedUserId: otherUidRef.current ?? undefined, conversationId })}
                style={styles.safetyBtn}
              >
                <Text style={{ color: p.muted, fontSize: 18 }}>ⓘ</Text>
              </TouchableOpacity>
            </View>

            {/* Countdown bar */}
            <View style={styles.countdown}>
              <View style={styles.countdownRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                  <View style={{ width: 5, height: 5, borderRadius: 5, backgroundColor: remaining <= 60 ? p.danger : p.accent }} />
                  <Cap p={p}>{t('chatRemaining', lang)}</Cap>
                </View>
                <Text style={[styles.timer, { color: remaining <= 60 ? p.danger : p.ink }]}>
                  {mm}<Text style={{ opacity: 0.4 }}>:</Text>{ss}
                </Text>
              </View>
              <CountdownBar p={p} progress={progress} />
              <Text style={[styles.dissolveNote, { color: remaining <= 60 ? p.danger : p.muted }]}>
                {remaining <= 60
                  ? (lang === 'en' ? 'conversation dissolves soon' : '對話即將消散')
                  : (lang === 'en'
                    ? 'when this reaches zero, the entire conversation dissolves.'
                    : '歸零之後，整段對話會全部消散。')}
              </Text>
              {/* 續燭 — one mutual +30 min per conversation. Shown once the chat
                  is real (a few messages in) and until it's used. */}
              {!extended && !otherLeft && realMessages.length >= 4 && (
                <TouchableOpacity onPress={handleExtend} disabled={extendBusy || iVotedExtend}
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 6, opacity: iVotedExtend ? 0.7 : 1 }}>
                  <ExtendGlyph size={15} ink={p.accent} />
                  <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 12, color: p.accent }}>
                    {iVotedExtend
                      ? (lang === 'en' ? 'waiting for them to extend too…' : '等待對方一起續燭⋯')
                      : otherVotedExtend
                      ? (lang === 'en' ? `They want 30 more minutes — join in (${EXTEND_WICK_COST} wicks)` : `對方想多聊 30 分鐘 — 一起續燭（${EXTEND_WICK_COST} 芯）`)
                      : (lang === 'en' ? `Extend +30 min · both agree · ${EXTEND_WICK_COST} wicks each` : `續燭 +30 分 · 雙方同意 · 各 ${EXTEND_WICK_COST} 芯`)}
                  </Text>
                </TouchableOpacity>
              )}
              {extended && (
                <Text style={{ fontFamily: 'EBGaramond-Italic', fontSize: 11, color: p.accent, textAlign: 'center', paddingVertical: 4 }}>
                  {lang === 'en' ? '· the candle was relit · +30 min ·' : '· 燭火重新點亮 · +30 分 ·'}
                </Text>
              )}
              {/* 重逢 & 留下彼此 — earned after a real conversation (10+ messages). */}
              {!otherLeft && displayMessages.length >= VEIL_MIN_MESSAGES && (
                <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 18, paddingTop: 2 }}>
                  <TouchableOpacity onPress={handleRekindle} disabled={rekindleBusy || iVotedRekindle}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 5, opacity: iVotedRekindle && !rekindleConfirmed ? 0.7 : 1 }}>
                    <RekindleGlyph size={15} ink={rekindleConfirmed ? p.accent : p.inkSoft} />
                    <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 12, color: rekindleConfirmed ? p.accent : p.inkSoft }}>
                      {rekindleConfirmed
                        ? (lang === 'en' ? 'meeting again tomorrow' : '明晚重逢已約定')
                        : iVotedRekindle
                        ? (lang === 'en' ? 'waiting for them…' : '等待對方⋯')
                        : otherVotedRekindle
                        ? (lang === 'en' ? `they want to meet again (${REKINDLE_WICK_COST})` : `對方想明晚重逢（${REKINDLE_WICK_COST} 芯）`)
                        : (lang === 'en' ? `meet again tomorrow · ${REKINDLE_WICK_COST}` : `明晚重逢 · ${REKINDLE_WICK_COST} 芯`)}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleBond} disabled={bondBusy || iVotedBond}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 5, opacity: iVotedBond && !bondConfirmed ? 0.7 : 1 }}>
                    <BondGlyph size={15} ink={bondConfirmed ? p.accent : p.inkSoft} />
                    <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 12, color: bondConfirmed ? p.accent : p.inkSoft }}>
                      {bondConfirmed
                        ? (lang === 'en' ? 'kept each other' : '已留下彼此')
                        : iVotedBond
                        ? (lang === 'en' ? 'waiting for them…' : '等待對方⋯')
                        : otherVotedBond
                        ? (lang === 'en' ? 'they want to keep you' : '對方想留下你')
                        : (lang === 'en' ? 'keep each other · Vigil' : '留下彼此 · 守夜')}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>

          {/* MESSAGES */}
          <View style={{ flex: 1 }}>
          {/* Anti-screenshot watermark */}
          <View style={styles.watermarkLayer} pointerEvents="none">
            {Array.from({ length: 6 }).map((_, i) => (
              <View key={i} style={styles.watermarkRow}>
                {Array.from({ length: 3 }).map((_, j) => (
                  <Text key={j} style={[styles.watermarkText, { color: p.ink }]}>
                    {seed.slice(0, 6)}
                  </Text>
                ))}
              </View>
            ))}
          </View>
          <ScrollView
            ref={scrollRef}
            style={styles.messages}
            contentContainerStyle={{ padding: 20, gap: 14 }}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
          >
            {displayMessages.length === 0 && (
              <FadeInUp delay={120} distance={10}>
                <View style={styles.emptyState}>
                  {/* two souls just met \u2014 facing rings */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 18 }}>
                    <Identity kind={identityKind} seed={seed} size={34} palette={p} lang={lang} trust={0.3} />
                    <View style={{ width: 26, height: 0.5, backgroundColor: p.line, marginHorizontal: -2 }} />
                    <Identity kind={identityKind} seed={otherSeed} size={34} palette={p} lang={lang} trust={0.2} />
                  </View>
                  <Text style={[styles.emptyTitle, { color: p.ink }]}>
                    {lang === 'en' ? 'You found each other.' : '\u4F60\u5011\u9047\u898B\u4E86\u5F7C\u6B64\u3002'}
                  </Text>
                  <Text style={[styles.emptyBody, { color: p.muted }]}>
                    {lang === 'en'
                      ? 'Say something first \u2014 they can hear you. Nothing here is kept.'
                      : '\u5148\u958B\u53E3\u8AAA\u9EDE\u4EC0\u9EBC\uFF0C\u5C0D\u65B9\u807D\u5F97\u5230\u3002\u9019\u88E1\u7559\u4E0D\u4E0B\u4EFB\u4F55\u6771\u897F\u3002'}
                  </Text>
                  <Text style={[styles.promptLabel, { color: p.muted }]}>
                    {lang === 'en' ? 'Need a first line? Tap to edit one.' : '不知道怎麼開始？點一句再改成你的話。'}
                  </Text>
                  <View style={styles.promptList}>
                    {(lang === 'en'
                      ? [
                          'What do you wish someone understood tonight?',
                          'What made you pause today?',
                          'How are you, without saying “fine”?',
                        ]
                      : [
                          '今晚，你最希望有人懂你什麼？',
                          '今天有哪一刻，讓你想停一下？',
                          '如果不能說「還好」，你現在好嗎？',
                        ]
                    ).map(prompt => (
                      <TouchableOpacity
                        key={prompt}
                        accessibilityRole="button"
                        onPress={() => handleInputChange(prompt)}
                        activeOpacity={0.8}
                        style={[styles.promptChip, { backgroundColor: p.surface, borderColor: p.line }]}
                      >
                        <Text style={[styles.promptText, { color: p.ink }]}>{prompt}</Text>
                        <Text style={{ color: p.accent, fontSize: 14 }}>＋</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </FadeInUp>
            )}

            {displayMessages.map((m, i) => (
              <FadeInUp key={i} distance={10} duration={260} delay={Math.min(i * 25, 150)}>
                <ChatBubble p={p} m={m} lang={lang} wicks={wicks} conversationId={conversationId}
                  canRevealVeil={displayMessages.length >= VEIL_MIN_MESSAGES}
                  onReport={m.from !== 'me' ? () => navigation.push('Safety', { reportedUserId: otherUidRef.current ?? undefined, conversationId }) : undefined} />
              </FadeInUp>
            ))}

          </ScrollView>
          </View>

          {/* Typing indicator */}
          {otherTyping && (
            <View style={styles.typingRow}>
              <Identity kind={identityKind} seed={otherSeed} size={20} palette={p} lang={lang} trust={0.25} />
              <View style={[styles.typingBubble, { backgroundColor: p.surface, borderColor: p.line, borderBottomLeftRadius: 6 }]}>
                <TypingIndicator color={p.muted} size={5} />
              </View>
            </View>
          )}

          {/* COMPOSER */}
          <View style={styles.composer}>
            {otherLeft ? (
              // The other person left — say so, and offer a clean exit instead of
              // letting the user keep typing into a conversation with no one there.
              <View style={[styles.veilBar, { backgroundColor: p.surface, borderColor: p.line, justifyContent: 'space-between' }]}>
                <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 13, color: p.muted, flex: 1 }}>
                  {lang === 'en' ? 'The other person has left this conversation.' : '對方已離開這段對話。'}
                </Text>
                <TouchableOpacity onPress={() => { iLeftRef.current = true; goClose(); }}>
                  <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 13, color: p.accent }}>
                    {lang === 'en' ? 'Leave' : '離開'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
            <>
            {/* Slow-mode buffer note */}
            {pausing && (
              <View style={[styles.veilBar, { backgroundColor: p.surface, borderColor: p.line }]}>
                <Text style={{ fontFamily: 'EBGaramond-Italic', fontSize: 12, color: p.muted, flex: 1, textAlign: 'center' }}>
                  {lang === 'en' ? 'breathe — your message sends in a moment' : '深呼吸⋯訊息稍候送出'}
                </Text>
              </View>
            )}
            <GlassCard p={p} padding={6} radius={28}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TouchableOpacity
                onPress={() => setShowVeilSheet(true)}
                accessibilityRole="button"
                accessibilityLabel={lang === 'en' ? 'Send a veiled photo, 2 wicks' : '傳送帶紗照片，2 燭芯'}
                activeOpacity={0.75}
                style={[styles.photoComposerBtn, { backgroundColor: p.accentSoft, borderColor: p.accent + '30' }]}
              >
                <WickGlyph size={12} color={p.accent} />
                <Text style={[styles.photoCost, { color: p.accent }]}>2</Text>
              </TouchableOpacity>
              <TextInput
                value={inputText}
                onChangeText={handleInputChange}
                placeholder={t('chatPlaceholder', lang)}
                placeholderTextColor={p.muted}
                style={[styles.input, { color: p.ink }]}
                onSubmitEditing={sendMessage}
                returnKeyType="send"
                maxLength={CHAT_MAX_LENGTH}
                editable={!sending}
              />
              <TouchableOpacity
                onPress={sendMessage}
                accessibilityRole="button"
                accessibilityLabel={lang === 'en' ? 'Send message' : '送出訊息'}
                accessibilityState={{ disabled: pausing || sending || !inputText.trim() }}
                disabled={pausing || sending || !inputText.trim()}
                style={[styles.sendBtn, {
                  backgroundColor: p.ink,
                  opacity: pausing || sending || !inputText.trim() ? 0.4 : 1,
                }]}
              >
                <Text style={{ color: p.dark ? '#1a1530' : '#fff', fontSize: 16 }}>
                  {pausing || sending ? '⋯' : '↑'}
                </Text>
              </TouchableOpacity>
            </GlassCard>
            </>
            )}
          </View>

          {/* PHOTO VEIL SHEET */}
          {showVeilSheet && (
            <View style={styles.sheetOverlay}>
              <TouchableOpacity style={{ flex: 1 }} onPress={() => setShowVeilSheet(false)} />
              <View style={[styles.sheetInner, { backgroundColor: p.bgSolid, borderColor: p.line }]}>
                <View style={[styles.handle, { backgroundColor: p.line }]} />
                <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 18, color: p.ink, fontWeight: '500', marginBottom: 4 }}>
                  {lang === 'en' ? 'Send a veiled photo' : '傳送帶紗照片'}
                </Text>
                <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 12, color: p.muted, lineHeight: 20, marginBottom: 14 }}>
                  {lang === 'en'
                    ? 'Your photo stays under a veil. They lift it layer by layer — the first layer is free, the next two cost 1 wick each.'
                    : '照片會藏在紗罩下，對方一層一層揭開——第一層免費，之後每層 1 燭芯。'}
                </Text>
                <View style={{ alignItems: 'center', marginBottom: 16 }}>
                  {selectedPhotoUri ? (
                    <View style={{ width: 160, height: 160, borderRadius: 12, overflow: 'hidden', backgroundColor: p.surface }}>
                      <Text style={{ fontFamily: 'EBGaramond-Italic', fontSize: 11, color: p.muted, textAlign: 'center', marginTop: 70 }}>
                        {lang === 'en' ? 'Photo selected' : '已選擇照片'}
                      </Text>
                    </View>
                  ) : (
                    <>
                      <PhotoVeil p={p} liftLevel={0} size={160} lang={lang} />
                      <Text style={{ fontFamily: 'EBGaramond-Italic', fontSize: 11, color: p.muted, marginTop: 8 }}>
                        {lang === 'en' ? 'preview — 3 layers of veil' : '預覽 — 三層紗罩'}
                      </Text>
                    </>
                  )}
                </View>

                {/* Pick Photo Button */}
                {!selectedPhotoUri && !veilSent && (
                  <TouchableOpacity
                    onPress={async () => {
                      const uri = await pickImage();
                      if (uri) setSelectedPhotoUri(uri);
                    }}
                    style={[styles.sendVeilBtn, { backgroundColor: p.accentSoft, borderColor: p.accent + '40', marginBottom: 8 }]}>
                    <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 14, color: p.accent }}>
                      {lang === 'en' ? 'Choose a photo' : '挑一張照片'}
                    </Text>
                  </TouchableOpacity>
                )}

                {!veilSent ? (
                  <TouchableOpacity
                    onPress={async () => {
                      // Guard against double-taps (each tap would upload + charge again).
                      if (veilSending || !selectedPhotoUri || !conversationId || wicks < 2) return;
                      setVeilSending(true);
                      // Upload FIRST, charge only once it's actually on Cloudinary — so a
                      // failed upload never burns wicks. (A rare charge failure after upload
                      // just orphans the asset, which is purged when the chat ends.)
                      const photo = await uploadVeiledPhoto({ conversationId, uri: selectedPhotoUri });
                      if (!photo) {
                        setVeilSending(false);
                        Alert.alert(lang === 'en' ? 'Upload failed' : '上傳失敗', lang === 'en' ? 'No wick was used. Please try again.' : '沒有扣燭芯，請再試一次。');
                        return;
                      }
                      const result = await spendWicks(2, 'photo_veil', conversationId);
                      if (result.ok) {
                        await sendConversationMessage({
                          conversationId,
                          content: photo.id,
                          messageType: 'photo',
                        });
                        hapticMedium();
                        setVeilSent(true);
                        analytics.photoVeilSend(conversationId);
                      }
                      setVeilSending(false);
                    }}
                    disabled={veilSending || !selectedPhotoUri || wicks < 2}
                    style={[styles.sendVeilBtn, { backgroundColor: (selectedPhotoUri && wicks >= 2) ? p.ink : p.line }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 15, color: (selectedPhotoUri && wicks >= 2) ? (p.dark ? '#1a1530' : '#fff') : p.muted, fontWeight: '500' }}>
                        {veilSending
                          ? (lang === 'en' ? 'Sending…' : '送出中…')
                          : (lang === 'en' ? 'Send veiled photo' : '送出帶紗照片')}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <WickGlyph size={11} color={(selectedPhotoUri && wicks >= 2) ? (p.dark ? '#1a1530' : '#fff') : p.muted} />
                        <Text style={{ fontFamily: 'Inter-Regular', fontSize: 12, color: (selectedPhotoUri && wicks >= 2) ? (p.dark ? '#1a1530' : 'rgba(255,255,255,0.7)') : p.muted }}>2</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ) : (
                  <View style={[styles.sentNote, { backgroundColor: p.accentSoft, borderColor: p.accent + '40' }]}>
                    <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 14, color: p.accent }}>
                      {lang === 'en' ? '✓ Veiled photo sent' : '✓ 帶紗照片已送出'}
                    </Text>
                  </View>
                )}
                <TouchableOpacity onPress={() => { setShowVeilSheet(false); setVeilSent(false); setSelectedPhotoUri(null); }} style={{ alignItems: 'center', paddingVertical: 10 }}>
                  <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 13, color: p.muted }}>
                    {lang === 'en' ? 'close' : '關閉'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </VaporBackground>
  );
}

function ChatBubble({ p, m, lang, onReport, wicks, conversationId, canRevealVeil }: any) {
  const isMe = m.from === 'me';
  const isPhoto = m.messageType === 'photo';
  // Veil lifts in 3 steps: 0 = fully veiled · 1 = first layer (free) · 2 · 3 = full.
  const [veilStep, setVeilStep] = React.useState(0);
  const [photoUrl, setPhotoUrl] = React.useState<string | null>(null);
  const [working, setWorking] = React.useState(false);
  const revealed = veilStep >= 3;

  // Persist how far this photo was lifted (per photo, on this device) so paid
  // layers survive leaving/re-entering the chat and are never charged twice.
  const veilKey = m.photoId ? `veilStep_${m.photoId}` : null;
  React.useEffect(() => {
    if (!veilKey || isMe) return;
    let alive = true;
    AsyncStorage.getItem(veilKey).then(async v => {
      const step = v ? parseInt(v, 10) : 0;
      if (!alive || !step) return;
      const photo = await getVeiledPhoto(m.photoId);
      if (alive && photo?.url) { setPhotoUrl(photo.url); setVeilStep(step); }
    });
    return () => { alive = false; };
  }, [veilKey, isMe]);
  const persistVeil = (step: number) => { if (veilKey) void AsyncStorage.setItem(veilKey, String(step)); };

  // Cloudinary server-side blur, layered over an already-tiny (140px) asset for
  // defence in depth. Note the reveal is soft BY DESIGN — see the native
  // blurRadius tiers below; we never render a sharp face at any step.
  const blurred = (url: string, amount: number) =>
    url.includes('/image/upload/') ? url.replace('/image/upload/', `/image/upload/e_blur:${amount},q_auto/`) : url;
  // Native blur that never fully reaches zero: even the final "revealed" layer
  // keeps a gentle softness, so a screenshot is a mood, not an ID photo.
  const nativeBlurForStep = (step: number) => (step >= 3 ? 4 : step === 2 ? 10 : 18);
  const cloudBlurForStep = (step: number) => (step >= 3 ? 300 : step === 2 ? 1000 : 1600);

  const liftVeil = async () => {
    if (working || isMe || revealed || !m.photoId) return;
    // Anti photo-grab: build some conversation before any layer lifts.
    if (!canRevealVeil) {
      Alert.alert(
        lang === 'en' ? 'Keep talking first' : '再多聊一點',
        lang === 'en'
          ? `Exchange at least ${VEIL_MIN_MESSAGES} messages before lifting the veil.`
          : `聊滿 ${VEIL_MIN_MESSAGES} 則訊息後，才能掀開面紗。`,
      );
      return;
    }
    if (veilStep === 0) {
      // First layer is free — fetch the photo (kept blurred until fully lifted).
      setWorking(true);
      const photo = await getVeiledPhoto(m.photoId);
      setWorking(false);
      if (photo?.url) { setPhotoUrl(photo.url); setVeilStep(1); persistVeil(1); }
      return;
    }
    // Layers 2 and 3 cost 1 wick each.
    if (wicks < 1) {
      Alert.alert(
        lang === 'en' ? 'Not enough wicks' : '燭芯不足',
        lang === 'en' ? 'You need 1 wick to lift the next layer.' : '再揭一層需要 1 燭芯。',
      );
      return;
    }
    setWorking(true);
    const result = await spendWicks(1, 'veil_reveal', conversationId);
    setWorking(false);
    if (result.ok) setVeilStep(s => { const next = s + 1; persistVeil(next); return next; });
  };

  const bubble = isPhoto ? (
    <TouchableOpacity
      onPress={!isMe ? liftVeil : undefined}
      activeOpacity={isMe ? 1 : 0.85}
      disabled={isMe || revealed}
    >
      <View style={[
        styles.bubble,
        { padding: 6, overflow: 'hidden', alignItems: 'center' },
        isMe
          ? { backgroundColor: p.accent, borderWidth: 0 }
          : { backgroundColor: p.surface, borderWidth: 0.5, borderColor: p.line },
      ]}>
        {veilStep === 0 || !photoUrl ? (
          <PhotoVeil p={p} liftLevel={0} size={120} lang={lang} />
        ) : (
          <Image
            source={{ uri: blurred(photoUrl, cloudBlurForStep(veilStep)) }}
            blurRadius={nativeBlurForStep(veilStep)}
            style={{ width: 160, height: 160, borderRadius: 14 }}
            resizeMode="cover"
          />
        )}
        {!isMe && !revealed && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
            {veilStep === 0 ? (
              <Text style={{ fontFamily: 'Inter-Regular', fontSize: 10, color: p.accent }}>
                {working ? '…' : (lang === 'en' ? 'free' : '免費')}
              </Text>
            ) : (
              <>
                <WickGlyph size={10} color={wicks >= 1 ? p.accent : p.muted} />
                <Text style={{ fontFamily: 'Inter-Regular', fontSize: 10, color: wicks >= 1 ? p.accent : p.muted }}>
                  {working ? '…' : '1'}
                </Text>
              </>
            )}
          </View>
        )}
        <Text style={{
          fontFamily: 'EBGaramond-Italic', fontSize: 10,
          color: isMe ? 'rgba(255,255,255,0.7)' : p.muted,
          textAlign: 'center', marginTop: 4,
        }}>
          {revealed
            ? (lang === 'en' ? 'revealed' : '已揭開')
            : isMe
            ? (lang === 'en' ? 'veiled photo sent' : '帶紗照片已送出')
            : veilStep === 0
            ? (lang === 'en' ? 'tap to lift · free' : '點擊揭開第一層 · 免費')
            : (lang === 'en' ? 'lift another layer · 1 wick' : '再揭一層 · 1 芯')}
        </Text>
      </View>
    </TouchableOpacity>
  ) : (
    <View style={[
      styles.bubble,
      isMe
        ? { backgroundColor: p.accent, borderWidth: 0, borderBottomRightRadius: 7 }
        : { backgroundColor: p.surface, borderWidth: 0.5, borderColor: p.line, borderBottomLeftRadius: 7 },
      { shadowColor: '#000', shadowOpacity: p.dark ? 0.18 : 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
    ]}>
      <Text style={[
        styles.bubbleText,
        { color: isMe ? (p.dark ? '#15172e' : '#fbf5e4') : p.ink },
      ]}>
        {lang === 'en' ? m.en : m.zh}
      </Text>
    </View>
  );
  return (
    <View style={[styles.bubbleRow, { justifyContent: isMe ? 'flex-end' : 'flex-start' }]}>
      {!isMe && onReport ? (
        <TouchableOpacity onLongPress={onReport} delayLongPress={500} activeOpacity={1}>
          {bubble}
        </TouchableOpacity>
      ) : bubble}
    </View>
  );
}

const styles = StyleSheet.create({
  header:         { paddingTop: 8, paddingBottom: 14, paddingHorizontal: 18 },
  headerRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn:        { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  otherIdentity:  { alignItems: 'center', gap: 4 },
  safetyBtn:      { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  countdown:      { marginTop: 9, gap: 6, paddingHorizontal: 6 },
  countdownRow:   { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 },
  timer:          { fontFamily: 'Inter-Regular', fontSize: 19, fontWeight: '300', letterSpacing: 1 },
  dissolveNote:   { fontFamily: 'EBGaramond-Italic', fontSize: 11, textAlign: 'center', opacity: 0.7 },
  messages:       { flex: 1 },
  emptyState:     { alignItems: 'center', paddingTop: 36, paddingHorizontal: 12 },
  emptyTitle:     { fontFamily: 'NotoSerifTC-Light', fontSize: 21, letterSpacing: 1, textAlign: 'center' },
  emptyBody:      { fontFamily: 'NotoSerifTC-Regular', fontSize: 13.5, lineHeight: 23, textAlign: 'center', marginTop: 10, maxWidth: 260 },
  promptLabel:    { fontFamily: 'NotoSerifTC-Regular', fontSize: 11.5, textAlign: 'center', marginTop: 24, marginBottom: 10 },
  promptList:     { width: '100%', maxWidth: 360, gap: 8 },
  promptChip:     { minHeight: 44, borderRadius: 16, borderWidth: 0.5, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  promptText:     { flex: 1, fontFamily: 'NotoSerifTC-Regular', fontSize: 13, lineHeight: 20 },
  bubbleRow:      { flexDirection: 'row' },
  bubble:         { maxWidth: '78%', paddingVertical: 10, paddingHorizontal: 15, borderRadius: 22 },
  bubbleText:     { fontFamily: 'NotoSerifTC-Regular', fontSize: 15, lineHeight: 24 },
  typingRow:      { flexDirection: 'row', alignItems: 'flex-end', gap: 6, opacity: 0.7, marginTop: 4, marginHorizontal: 20, marginBottom: 2 },
  typingBubble:   { borderRadius: 16, borderWidth: 0.5, overflow: 'hidden' },
  composer:       { paddingTop: 6, paddingHorizontal: 16, paddingBottom: 14, gap: 8 },
  input:          { flex: 1, fontFamily: 'NotoSerifTC-Regular', fontSize: 15, paddingHorizontal: 14, paddingVertical: 12 },
  sendBtn:        { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  photoComposerBtn:{ width: 38, height: 38, borderRadius: 19, borderWidth: 0.5, alignItems: 'center', justifyContent: 'center' },
  photoCost:      { position: 'absolute', right: 3, bottom: 2, fontFamily: 'Inter-Regular', fontSize: 8, fontWeight: '700' },
  veilBar:        { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, borderWidth: 0.5 },
  watermarkLayer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.04, zIndex: 1, justifyContent: 'space-around', overflow: 'hidden' },
  watermarkRow:   { flexDirection: 'row', justifyContent: 'space-around' },
  watermarkText:  { fontFamily: 'Inter-Regular', fontSize: 11, letterSpacing: 2, transform: [{ rotate: '-30deg' }] },
  sheetOverlay:   { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheetInner:     { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 34, borderTopWidth: 0.5, gap: 6 },
  handle:         { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 8 },
  sendVeilBtn:    { height: 54, borderRadius: 999, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  sentNote:       { height: 54, borderRadius: 999, alignItems: 'center', justifyContent: 'center', marginTop: 8, borderWidth: 0.5 },
});
