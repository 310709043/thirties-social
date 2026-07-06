import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, ScrollView, Alert,
  StyleSheet, KeyboardAvoidingView, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import { LOFT_PALETTE } from '../lib/theme';
import { t } from '../lib/copy';
import { WickGlyph, PhotoVeil, AnimatedNumber } from '../components/ui';
import { useAppStore } from '../hooks/useAppStore';
import {
  spendWicks, sendLoftMessage, subscribeToLoftMessages,
  endLoftConversation, getCurrentUid, DbLoftMessage,
  subscribeToLoftConversationEnded, fetchLoftVeilLevel, bumpLoftVeilLevel,
} from '../lib/db';
import { hapticMedium } from '../lib/haptics';
import { filterMessage } from '../lib/filter';
import * as ScreenCapture from 'expo-screen-capture';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Props = NativeStackScreenProps<RootStackParamList, 'LoftChat'>;

const L = LOFT_PALETTE;
const SESSION_DURATION = 58 * 60; // 58 minutes in seconds

const PULSES = [
  { key: 'loftPulse1', em: '\u2661' },
  { key: 'loftPulse2', em: '\u2933' },
  { key: 'loftPulse3', em: '\u263E' },
  { key: 'loftPulse4', em: '\u2299' },
];

// Lifting a veil costs wicks for everyone, including Vigil (intimacy is paid).
const VEIL_LIFT_COST = 1;
// Minimum messages exchanged before a veiled photo can be lifted (anti photo-grab).
const VEIL_MIN_MESSAGES = 10;

export default function LoftChatScreen({ navigation, route }: Props) {
  const { lang, wicks, seed, autoFilter } = useAppStore();
  const { otherSeed, loftConversationId, otherName, sessionEnteredAt, expiresAt, otherPhotoUrl } = route.params;
  const uid = getCurrentUid();
  ScreenCapture.usePreventScreenCapture();

  // The chat closes at the conversation's own expiry (expiresAt). Fall back to the
  // legacy session-entry math only if an older caller didn't pass expiresAt.
  const closeAtMs = expiresAt
    ?? (sessionEnteredAt ? sessionEnteredAt + SESSION_DURATION * 1000 : Date.now() + SESSION_DURATION * 1000);
  const [remaining, setRemaining] = useState(() => Math.max(0, Math.floor((closeAtMs - Date.now()) / 1000)));

  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<DbLoftMessage[]>([]);
  const [veilLevel, setVeilLevel] = useState(1);
  const [showVeil, setShowVeil] = useState(false);
  const [lifting, setLifting] = useState(false);
  const [otherLeft, setOtherLeft] = useState(false);
  const iLeftRef = useRef(false);
  const scrollRef = useRef<ScrollView>(null);

  // Subscribe to real-time messages
  useEffect(() => {
    if (!loftConversationId) return;
    return subscribeToLoftMessages(loftConversationId, setMessages);
  }, [loftConversationId]);

  // Everything on screen counts as read — the Loft list uses this stored count
  // to show an unread ember on whispers that moved while I was away.
  useEffect(() => {
    if (!loftConversationId || messages.length === 0) return;
    AsyncStorage.setItem(`loftSeen:${loftConversationId}`, String(messages.length)).catch(() => {});
  }, [loftConversationId, messages.length]);

  // Restore how far I'd already lifted the veil (paid progress survives re-entry).
  useEffect(() => {
    if (!loftConversationId) return;
    fetchLoftVeilLevel(loftConversationId).then(setVeilLevel);
  }, [loftConversationId]);

  // Notice me when the other person leaves (so I'm not whispering to no one).
  useEffect(() => {
    if (!loftConversationId) return;
    return subscribeToLoftConversationEnded(loftConversationId, reason => {
      if (reason && reason !== uid && !iLeftRef.current) setOtherLeft(true);
    });
  }, [loftConversationId, uid]);

  // Leave helper — stamp the conversation ended (marking myself as the leaver).
  const leave = async () => {
    iLeftRef.current = true;
    if (loftConversationId) await endLoftConversation(loftConversationId);
    navigation.goBack();
  };

  // Countdown timer — recomputed from the wall clock so it stays correct even if
  // the JS timer drifts or the app was backgrounded.
  useEffect(() => {
    const id = setInterval(() => {
      const left = Math.max(0, Math.floor((closeAtMs - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0) {
        clearInterval(id);
        iLeftRef.current = true;
        (async () => {
          if (loftConversationId) await endLoftConversation(loftConversationId);
          navigation.goBack();
        })();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [closeAtMs]);

  // The whisper window is under an hour, so show minutes:seconds — an hh:mm
  // display ("00:57") only moved once a minute and read as a frozen clock.
  const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
  const ss = String(remaining % 60).padStart(2, '0');

  // Open/close times derived from the conversation window.
  const closeTime = new Date(closeAtMs);
  const openTime = new Date(closeAtMs - SESSION_DURATION * 1000);
  const fmt = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

  // The blurred real photo they brought tonight (if any). Cloudinary blur eases as
  // the veil lifts; level 4 shows it clear. Double-veiled with a native blur so a
  // face is never legible before it's earned.
  const hasPhoto = !!otherPhotoUrl;
  const cloudBlur = (amt: number) => (otherPhotoUrl && otherPhotoUrl.includes('/image/upload/')
    ? otherPhotoUrl.replace('/image/upload/', `/image/upload/e_blur:${amt},q_auto/`)
    : otherPhotoUrl ?? undefined);
  // Each lift must be FELT. The old ramp (2000→1200→500 with a 40→24→10 native
  // blur stacked on top) looked identical level to level — the native blur
  // dominated and swallowed the Cloudinary steps. New ramp: level 1 is a fog,
  // level 2 a figure, level 3 light-and-shadow you can almost read, level 4 clear.
  const BLUR_BY_LEVEL = [2000, 2000, 600, 150, 0];        // index by veilLevel (1..4)
  const NATIVE_BLUR_BY_LEVEL = [45, 45, 10, 2, 0];
  const photoRevealed = veilLevel >= 4;

  const sendText = async () => {
    if (!message.trim() || !loftConversationId) return;
    // Same rule as the 1:1 chat: the filter only runs if the user turned it on.
    const check = autoFilter ? filterMessage(message.trim()) : { blocked: false };
    if (check.blocked) {
      Alert.alert(
        lang === 'en' ? 'Message blocked' : '\u8A0A\u606F\u5DF2\u88AB\u904E\u6FFE',
        lang === 'en' ? 'This message contains content that may be harmful.' : '\u9019\u5247\u8A0A\u606F\u5305\u542B\u53EF\u80FD\u50B7\u5BB3\u4ED6\u4EBA\u7684\u5167\u5BB9\u3002',
      );
      return;
    }
    const ok = await sendLoftMessage({ loftConversationId, content: message.trim() });
    if (!ok) {
      Alert.alert(
        lang === 'en' ? 'Failed to send' : '\u9001\u51FA\u5931\u6557',
        lang === 'en' ? 'Please try again.' : '\u8ACB\u7A0D\u5F8C\u518D\u8A66\u4E00\u6B21\u3002',
      );
      return;
    }
    setMessage('');
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  // Guard against rapid taps — a tester once fired 8 pulses (8 wicks) by
  // hammering the button before the first write finished.
  const pulseBusyRef = useRef(false);
  const sendPulse = async (emoji: string) => {
    if (pulseBusyRef.current) return;
    pulseBusyRef.current = true;
    try {
      const result = await spendWicks(1, 'pulse', loftConversationId);
      if (result.ok && loftConversationId) {
        hapticMedium();
        await sendLoftMessage({ loftConversationId, content: emoji, messageType: 'pulse' });
      }
    } finally {
      pulseBusyRef.current = false;
    }
  };


  return (
    <LinearGradient colors={L.bg as any} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          // 'padding' on BOTH platforms: when Android's adjustResize works the
          // measured overlap is 0 (no double inset); when edge-to-edge swallows
          // the resize, the padding kicks in — either way the composer stays visible.
          behavior="padding"
          style={{ flex: 1, width: '100%', maxWidth: 620, alignSelf: 'center' }}
        >
          {/* TOP */}
          <View style={styles.topBar}>
            <TouchableOpacity onPress={leave} style={styles.topBtn}>
              <Text style={{ color: L.muted, fontSize: 18 }}>&#x2039;</Text>
            </TouchableOpacity>
            <View style={{ flex: 1, alignItems: 'center' }}>
              {hasPhoto ? (
                <View style={{ width: 44, height: 44, borderRadius: 22, overflow: 'hidden', borderWidth: 0.5, borderColor: 'rgba(232,165,87,0.3)' }}>
                  <Image source={{ uri: cloudBlur(BLUR_BY_LEVEL[veilLevel]) }} blurRadius={NATIVE_BLUR_BY_LEVEL[veilLevel]} style={{ width: '100%', height: '100%' }} />
                </View>
              ) : (
                <PhotoVeil p={L as any} liftLevel={veilLevel} size={44} lang={lang} />
              )}
              <Text style={{ fontFamily: 'EBGaramond-Italic', fontSize: 12, color: 'rgba(245,226,196,0.7)', marginTop: 4 }}>
                {otherName}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              {/* Safety — block / report the person you're whispering with. */}
              <TouchableOpacity onPress={() => navigation.push('Safety', { reportedUserId: otherSeed, conversationId: loftConversationId })}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={{ fontSize: 16, color: L.muted }}>&#x2691;</Text>
              </TouchableOpacity>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <WickGlyph size={10} color={L.candle} />
                <AnimatedNumber value={wicks} style={{ fontFamily: 'Inter-Regular', fontSize: 12, color: L.candle }} />
              </View>
            </View>
          </View>

          {/* Timer */}
          <View style={styles.timer}>
            <Text style={{ fontFamily: 'Inter-Regular', fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', color: L.candle }}>
              {lang === 'en' ? 'this whisper fades in' : '這段夜語剩下'}
            </Text>
            <Text style={{ fontFamily: 'Inter-Regular', fontSize: 22, fontWeight: '300', color: L.ink, letterSpacing: 2, marginTop: 4 }}>
              {mm}:{ss}
            </Text>
          </View>

          {/* Messages */}
          <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={styles.messages}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}>
            <Text style={{ fontFamily: 'EBGaramond-Italic', fontSize: 11, color: L.muted, textAlign: 'center', opacity: 0.7, marginBottom: 10 }}>
              {lang === 'en' ? `opened at ${fmt(openTime)} \u00B7 ends at ${fmt(closeTime)}` : `${fmt(openTime)} \u958B\u555F \u00B7 ${fmt(closeTime)} \u7D50\u675F`}
            </Text>

            {messages.length === 0 && (
              <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 14, color: L.muted, textAlign: 'center', marginTop: 32, lineHeight: 24 }}>
                {lang === 'en' ? 'Say something. The veil is between you.' : '\u8AAA\u9EDE\u4EC0\u9EBC\u3002\u7D17\u7F69\u5728\u4F60\u5011\u4E4B\u9593\u3002'}
              </Text>
            )}

            {messages.map((m, i) => {
              const isMe = m.senderId === uid;
              if (m.messageType === 'pulse') {
                return (
                  <View key={m.id} style={{ alignItems: 'center', marginVertical: 4 }}>
                    <Text style={{ fontSize: 24, opacity: 0.7 }}>{m.content}</Text>
                  </View>
                );
              }
              if (m.messageType === 'gift') {
                return (
                  <View key={m.id} style={{ alignItems: 'center', marginVertical: 8 }}>
                    <Text style={{ fontFamily: 'EBGaramond-Italic', fontSize: 12, color: L.candle }}>
                      {isMe
                        ? (lang === 'en' ? 'you sent a candle' : '\u4F60\u9001\u51FA\u4E86\u4E00\u6839\u71ED')
                        : (lang === 'en' ? 'they sent you a candle' : '\u5C0D\u65B9\u9001\u4E86\u4F60\u4E00\u6839\u71ED')}
                    </Text>
                    <Text style={{ fontSize: 20, marginTop: 2 }}>{m.content}</Text>
                  </View>
                );
              }
              return (
                <View key={m.id} style={[styles.bubbleRow, { justifyContent: isMe ? 'flex-end' : 'flex-start' }]}>
                  <View style={[styles.bubble, {
                    backgroundColor: isMe ? 'rgba(232,165,87,0.25)' : 'rgba(245,226,196,0.06)',
                    borderColor: isMe ? 'rgba(232,165,87,0.4)' : 'rgba(245,226,196,0.1)',
                    borderTopRightRadius: isMe ? 6 : 22,
                    borderTopLeftRadius: isMe ? 22 : 6,
                  }]}>
                    <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 15, lineHeight: 24, color: L.ink, fontStyle: 'italic' }}>
                      {m.content}
                    </Text>
                  </View>
                </View>
              );
            })}

            {/* Veiled photo \u2014 the real (blurred) photo they brought, if any.
                Nothing to lift when they didn't bring one, so we never let a wick
                be spent on an empty veil. */}
            {hasPhoto ? (
              <View style={{ alignItems: 'flex-start', marginTop: 8 }}>
                <TouchableOpacity onPress={() => setShowVeil(true)}>
                  <View style={{ width: 150, height: 150, borderRadius: 16, overflow: 'hidden', borderWidth: 0.5, borderColor: 'rgba(232,165,87,0.25)' }}>
                    <Image source={{ uri: cloudBlur(BLUR_BY_LEVEL[veilLevel]) }} blurRadius={NATIVE_BLUR_BY_LEVEL[veilLevel]} style={{ width: '100%', height: '100%' }} />
                  </View>
                  <Text style={{ fontFamily: 'EBGaramond-Italic', fontSize: 11, color: L.muted, marginTop: 4, paddingLeft: 4 }}>
                    {photoRevealed
                      ? (lang === 'en' ? 'the veil is lifted' : '\u9762\u7D17\u5DF2\u63ED\u958B')
                      : (lang === 'en' ? `tap to lift \u00B7 ${4 - veilLevel} left` : `\u8F15\u9EDE\u63ED\u66C9 \u00B7 \u9084\u5269 ${4 - veilLevel} \u5C64`)}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ alignItems: 'flex-start', marginTop: 8 }}>
                <Text style={{ fontFamily: 'EBGaramond-Italic', fontSize: 11, color: L.muted, opacity: 0.7, paddingLeft: 4 }}>
                  {lang === 'en' ? 'they didn\u2019t bring a photo tonight' : '\u5C0D\u65B9\u4ECA\u665A\u6C92\u6709\u5E36\u7167\u7247'}
                </Text>
              </View>
            )}
          </ScrollView>

          {otherLeft ? (
            // The other person left \u2014 stop the whisper-into-the-void and offer exit.
            <View style={{ padding: 20, paddingBottom: 24, alignItems: 'center', gap: 12 }}>
              <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 14, color: L.muted, textAlign: 'center', lineHeight: 22 }}>
                {lang === 'en' ? 'They stepped away from this whisper.' : '\u5c0d\u65b9\u5df2\u96e2\u958b\u9019\u6bb5\u591c\u8a9e\u3002'}
              </Text>
              <TouchableOpacity onPress={leave}
                style={{ paddingHorizontal: 26, paddingVertical: 11, borderRadius: 999, borderWidth: 0.5, borderColor: 'rgba(232,165,87,0.4)', backgroundColor: 'rgba(232,165,87,0.08)' }}>
                <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 14, color: L.candle, letterSpacing: 1 }}>
                  {lang === 'en' ? 'Leave' : '\u96e2\u958b'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Pulse buttons */}
              <View style={styles.pulseRow}>
                <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 11, color: L.muted, marginRight: 8 }}>
                  {t('loftWhisper', lang)}
                </Text>
                {PULSES.map(pulse => (
                  <TouchableOpacity key={pulse.key} onPress={() => sendPulse(pulse.em)}
                    style={styles.pulseBtn}>
                    <Text style={{ fontSize: 16, color: L.candle }}>{pulse.em}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 2 }}>
                      <WickGlyph size={7} color={L.candle} />
                      <Text style={{ fontFamily: 'Inter-Regular', fontSize: 8, color: 'rgba(232,165,87,0.7)' }}>1</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Composer */}
              <View style={styles.composer}>
                <View style={[styles.composerInner, { borderColor: 'rgba(232,165,87,0.2)' }]}>
                  <TextInput
                    value={message}
                    onChangeText={setMessage}
                    placeholder={t('loftWhisper', lang)}
                    placeholderTextColor={L.muted}
                    style={{ flex: 1, fontFamily: 'NotoSerifTC-Regular', fontSize: 15, color: L.ink, paddingHorizontal: 14, paddingVertical: 12, fontStyle: 'italic' }}
                    onSubmitEditing={sendText}
                    returnKeyType="send"
                  />
                  <TouchableOpacity
                    style={[styles.sendBtn, { backgroundColor: '#e8a557' }]}
                    onPress={sendText}>
                    <Text style={{ color: '#1f1014', fontSize: 16 }}>{'\u2191'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Veil lift sheet */}
      {showVeil && (
        <View style={styles.sheet}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setShowVeil(false)} />
          <View style={[styles.sheetInner, { backgroundColor: L.bgSolid, borderColor: L.line }]}>
            <View style={styles.handle} />
            <View style={{ alignItems: 'center', gap: 14 }}>
              {hasPhoto ? (
                <View style={{ width: 200, height: 200, borderRadius: 18, overflow: 'hidden', borderWidth: 0.5, borderColor: 'rgba(232,165,87,0.25)' }}>
                  <Image source={{ uri: cloudBlur(BLUR_BY_LEVEL[veilLevel]) }} blurRadius={NATIVE_BLUR_BY_LEVEL[veilLevel]} style={{ width: '100%', height: '100%' }} />
                </View>
              ) : (
                <PhotoVeil p={L as any} liftLevel={veilLevel} size={200} lang={lang} />
              )}
              <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 20, color: L.ink, fontWeight: '500' }}>
                {t('veilTitle', lang)}
              </Text>
              <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 12, color: L.muted, textAlign: 'center' }}>
                {t('veilOnlyHere', lang)}
              </Text>
              {!photoRevealed && messages.length < VEIL_MIN_MESSAGES && (
                <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 13, color: L.muted, textAlign: 'center', paddingHorizontal: 12 }}>
                  {lang === 'en'
                    ? `Exchange at least ${VEIL_MIN_MESSAGES} messages before lifting the veil.`
                    : `聊滿 ${VEIL_MIN_MESSAGES} 則訊息後，才能掀開面紗。`}
                </Text>
              )}
              {!photoRevealed && messages.length >= VEIL_MIN_MESSAGES && (
                <TouchableOpacity onPress={async () => {
                  // Lifting a veil always costs wicks — even for Vigil. Membership
                  // buys reach/efficiency; advancing intimacy is paid by everyone.
                  // Persist the new level so it survives re-entry and is never
                  // charged twice. Guard against double-taps while the write is in flight.
                  if (lifting || wicks < VEIL_LIFT_COST) return;
                  setLifting(true);
                  const r = await spendWicks(VEIL_LIFT_COST, 'veil_lift', loftConversationId);
                  if (r.ok) {
                    const next = veilLevel + 1;
                    setVeilLevel(next);
                    if (loftConversationId) await bumpLoftVeilLevel(loftConversationId, next);
                  }
                  setLifting(false);
                }}
                  disabled={wicks < VEIL_LIFT_COST || lifting}
                  style={[styles.liftBtn, { backgroundColor: wicks >= VEIL_LIFT_COST ? L.ink : L.line }]}>
                  <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 15, color: wicks >= VEIL_LIFT_COST ? '#f5e2c4' : L.muted }}>
                    {t(`veilLift${veilLevel + 1}` as any, lang)}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <WickGlyph size={12} color={wicks >= VEIL_LIFT_COST ? '#f5e2c4' : L.muted} />
                    <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 12, color: wicks >= VEIL_LIFT_COST ? '#f5e2c4' : L.muted }}>
                      {VEIL_LIFT_COST}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => setShowVeil(false)}>
                <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 13, color: L.muted, paddingVertical: 8 }}>
                  {lang === 'en' ? 'close' : '\u95DC\u4E0A'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  topBar:       { flexDirection: 'row', alignItems: 'center', padding: 16, paddingTop: 8, gap: 12 },
  topBtn:       { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(245,226,196,0.05)', borderWidth: 0.5, borderColor: 'rgba(245,226,196,0.12)', alignItems: 'center', justifyContent: 'center' },
  timer:        { alignItems: 'center', paddingBottom: 12 },
  messages:     { padding: 20, gap: 10 },
  bubbleRow:    { flexDirection: 'row' },
  bubble:       { maxWidth: '80%', padding: 12, borderRadius: 22, borderWidth: 0.5 },
  pulseRow:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 0.5, borderTopColor: 'rgba(245,226,196,0.08)', gap: 8 },
  pulseBtn:     { alignItems: 'center', paddingHorizontal: 8, paddingVertical: 6, borderRadius: 12, backgroundColor: 'rgba(232,165,87,0.08)', borderWidth: 0.5, borderColor: 'rgba(232,165,87,0.2)' },
  giftRow:      { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: 'rgba(232,165,87,0.05)', borderTopWidth: 0.5, borderTopColor: 'rgba(245,226,196,0.08)' },
  composer:     { padding: 12, paddingBottom: 18 },
  composerInner:{ flexDirection: 'row', alignItems: 'center', borderRadius: 28, borderWidth: 0.5, backgroundColor: 'rgba(245,226,196,0.04)' },
  sendBtn:      { width: 38, height: 38, borderRadius: 19, margin: 4, alignItems: 'center', justifyContent: 'center' },
  sheet:        { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'flex-end' },
  sheetInner:   { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 34, borderTopWidth: 0.5, gap: 14 },
  handle:       { width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(245,226,196,0.2)', alignSelf: 'center', marginBottom: 4 },
  liftBtn:      { height: 52, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, width: '100%' },
});
