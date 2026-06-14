import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, ScrollView, Alert,
  StyleSheet, KeyboardAvoidingView, Platform,
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
} from '../lib/db';
import { hapticMedium } from '../lib/haptics';
import { filterMessage } from '../lib/filter';
import * as ScreenCapture from 'expo-screen-capture';

type Props = NativeStackScreenProps<RootStackParamList, 'LoftChat'>;

const L = LOFT_PALETTE;
const SESSION_DURATION = 58 * 60; // 58 minutes in seconds

const PULSES = [
  { key: 'loftPulse1', em: '\u2661' },
  { key: 'loftPulse2', em: '\u2933' },
  { key: 'loftPulse3', em: '\u263E' },
  { key: 'loftPulse4', em: '\u2299' },
];

export default function LoftChatScreen({ navigation, route }: Props) {
  const { lang, wicks, seed, vigil } = useAppStore();
  const { otherSeed, loftConversationId, otherName, sessionEnteredAt } = route.params;
  const uid = getCurrentUid();
  ScreenCapture.usePreventScreenCapture();

  // Timer derived from actual session entry time
  const [remaining, setRemaining] = useState(() => {
    if (sessionEnteredAt) {
      const elapsed = Math.floor((Date.now() - sessionEnteredAt) / 1000);
      return Math.max(0, SESSION_DURATION - elapsed);
    }
    return SESSION_DURATION;
  });

  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<DbLoftMessage[]>([]);
  const [veilLevel, setVeilLevel] = useState(1);
  const [showVeil, setShowVeil] = useState(false);
  const [giftSent, setGiftSent] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  // Subscribe to real-time messages
  useEffect(() => {
    if (!loftConversationId) return;
    return subscribeToLoftMessages(loftConversationId, setMessages);
  }, [loftConversationId]);

  // Countdown timer
  useEffect(() => {
    const id = setInterval(() => {
      setRemaining(r => {
        if (r <= 1) {
          clearInterval(id);
          (async () => {
            if (loftConversationId) await endLoftConversation(loftConversationId);
            navigation.goBack();
          })();
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const hh = String(Math.floor(remaining / 3600)).padStart(2, '0');
  const mm = String(Math.floor((remaining % 3600) / 60)).padStart(2, '0');

  // Compute open/close times from session
  const openTime = sessionEnteredAt ? new Date(sessionEnteredAt) : new Date();
  const closeTime = new Date(openTime.getTime() + SESSION_DURATION * 1000);
  const fmt = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

  const sendText = async () => {
    if (!message.trim() || !loftConversationId) return;
    const check = filterMessage(message.trim());
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

  const sendPulse = async (emoji: string) => {
    const result = await spendWicks(1, 'pulse', loftConversationId);
    if (result.ok && loftConversationId) {
      hapticMedium();
      await sendLoftMessage({ loftConversationId, content: emoji, messageType: 'pulse' });
    }
  };

  const sendGift = async () => {
    const r = await spendWicks(5, 'gift', loftConversationId);
    if (r.ok && loftConversationId) {
      hapticMedium();
      setGiftSent(true);
      await sendLoftMessage({ loftConversationId, content: '🕯', messageType: 'gift' });
    }
  };

  return (
    <LinearGradient colors={L.bg as any} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          {/* TOP */}
          <View style={styles.topBar}>
            <TouchableOpacity onPress={async () => {
              if (loftConversationId) await endLoftConversation(loftConversationId);
              navigation.goBack();
            }} style={styles.topBtn}>
              <Text style={{ color: L.muted, fontSize: 18 }}>&#x2039;</Text>
            </TouchableOpacity>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <PhotoVeil p={L as any} liftLevel={veilLevel} size={44} lang={lang} />
              <Text style={{ fontFamily: 'EBGaramond-Italic', fontSize: 12, color: 'rgba(245,226,196,0.7)', marginTop: 4 }}>
                {otherName}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <WickGlyph size={10} color={L.candle} />
              <AnimatedNumber value={wicks} style={{ fontFamily: 'Inter-Regular', fontSize: 12, color: L.candle }} />
            </View>
          </View>

          {/* Timer */}
          <View style={styles.timer}>
            <Text style={{ fontFamily: 'Inter-Regular', fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', color: L.candle }}>
              {t('loftClose', lang)}
            </Text>
            <Text style={{ fontFamily: 'Inter-Regular', fontSize: 22, fontWeight: '300', color: L.ink, letterSpacing: 2, marginTop: 4 }}>
              {hh}:{mm}
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

            {/* Veiled photo */}
            <View style={{ alignItems: 'flex-start', marginTop: 8 }}>
              <TouchableOpacity onPress={() => setShowVeil(true)}>
                <PhotoVeil p={L as any} liftLevel={veilLevel} size={150} lang={lang} />
                <Text style={{ fontFamily: 'EBGaramond-Italic', fontSize: 11, color: L.muted, marginTop: 4, paddingLeft: 4 }}>
                  {lang === 'en' ? `tap to lift \u00B7 ${4 - veilLevel} left` : `\u8F15\u9EDE\u63ED\u66C9 \u00B7 \u9084\u5269 ${4 - veilLevel} \u5C64`}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

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

          {/* Gift row */}
          {!giftSent ? (
            <TouchableOpacity onPress={sendGift} style={styles.giftRow}>
              <WickGlyph size={12} color={L.candle} />
              <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 13, color: 'rgba(245,226,196,0.8)', flex: 1 }}>
                {t('loftGift', lang)}
              </Text>
              <Text style={{ fontFamily: 'Inter-Regular', fontSize: 11, color: 'rgba(232,165,87,0.7)' }}>
                {t('loftGiftCost', lang)}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={[styles.giftRow, { opacity: 0.5 }]}>
              <Text style={{ fontFamily: 'EBGaramond-Italic', fontSize: 12, color: L.candle }}>
                {lang === 'en' ? '\u2713 candle sent' : '\u2713 \u71ED\u5DF2\u9001\u51FA'}
              </Text>
            </View>
          )}

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
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Veil lift sheet */}
      {showVeil && (
        <View style={styles.sheet}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setShowVeil(false)} />
          <View style={[styles.sheetInner, { backgroundColor: L.bgSolid, borderColor: L.line }]}>
            <View style={styles.handle} />
            <View style={{ alignItems: 'center', gap: 14 }}>
              <PhotoVeil p={L as any} liftLevel={veilLevel} size={200} lang={lang} />
              <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 20, color: L.ink, fontWeight: '500' }}>
                {t('veilTitle', lang)}
              </Text>
              <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 12, color: L.muted, textAlign: 'center' }}>
                {t('veilOnlyHere', lang)}
              </Text>
              {veilLevel < 4 && (
                <TouchableOpacity onPress={async () => {
                  if (vigil) { setVeilLevel(v => v + 1); return; }
                  if (wicks >= 2) { const r = await spendWicks(2, 'veil_lift', loftConversationId); if (r.ok) { setVeilLevel(v => v + 1); } }
                }}
                  disabled={!vigil && wicks < 2}
                  style={[styles.liftBtn, { backgroundColor: (vigil || wicks >= 2) ? L.ink : L.line }]}>
                  <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 15, color: (vigil || wicks >= 2) ? '#f5e2c4' : L.muted }}>
                    {t(`veilLift${veilLevel + 1}` as any, lang)}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    {vigil ? (
                      <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 12, color: '#f5e2c4' }}>
                        {lang === 'en' ? 'Vigil · free' : '守夜 · 免費'}
                      </Text>
                    ) : (
                      <>
                        <WickGlyph size={12} color={wicks >= 2 ? '#f5e2c4' : L.muted} />
                        <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 12, color: wicks >= 2 ? '#f5e2c4' : L.muted }}>
                          {t('veilCost', lang)}
                        </Text>
                      </>
                    )}
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
