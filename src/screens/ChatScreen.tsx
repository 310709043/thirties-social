import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import { DIRECTIONS } from '../lib/theme';
import { t } from '../lib/copy';
import { VaporBackground, GlassCard, CountdownBar, Cap, WickGlyph, PhotoVeil } from '../components/ui';
import { Identity } from '../components/identity/Identity';
import { ColorAdjLabel } from '../components/identity/Identity';
import { useAppStore, setWicks as saveWicks } from '../hooks/useAppStore';
import { subscribeToConversationMessages, sendConversationMessage, spendWicks, getCurrentUid, endConversation, DbConvMessage } from '../lib/db';

type Props = NativeStackScreenProps<RootStackParamList, 'Chat'>;

const INITIAL_MESSAGES = [
  { from: 'other', zh: '謝謝你願意聽。', en: 'Thank you for being here.', age: 0.05 },
  { from: 'me',    zh: '我也是。最近什麼都不太想跟身邊的人說。', en: "Me too. Lately I don't want to tell anyone close to me.", age: 0.1 },
  { from: 'other', zh: '你寫的那句，「睡同一張床卻像隔了一條河」⋯⋯', en: '"Same bed, but feels like a river between us"…', age: 0.18 },
  { from: 'other', zh: '我也是這樣。', en: 'I feel the same.', age: 0.18 },
  { from: 'me',    zh: '不是不愛了。是疲倦。', en: 'Not unlove. Just tired.', age: 0.27 },
];

const TOTAL_SECONDS = 30 * 60;

export default function ChatScreen({ navigation, route }: Props) {
  const { seed, direction, lang, identityKind, wicks } = useAppStore();
  const p = DIRECTIONS[direction];
  const otherSeed = route.params?.otherSeed || 'm0od7';
  const conversationId = (route.params as any)?.conversationId as string | undefined;

  const [remaining, setRemaining] = useState(28 * 60 + 14);
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [realMessages, setRealMessages] = useState<DbConvMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [showVeilSheet, setShowVeilSheet] = useState(false);
  const [veilSent, setVeilSent] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!conversationId) return;
    return subscribeToConversationMessages(conversationId, setRealMessages);
  }, [conversationId]);

  useEffect(() => {
    const id = setInterval(() => {
      setRemaining(r => {
        if (r <= 1) {
          clearInterval(id);
          (async () => {
            if (conversationId) await endConversation(conversationId, 'timer_expired');
            navigation.replace('Close');
          })();
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
  const ss = String(remaining % 60).padStart(2, '0');
  const progress = remaining / TOTAL_SECONDS;

  const sendMessage = async () => {
    if (!inputText.trim()) return;
    if (conversationId) {
      await sendConversationMessage({ conversationId, content: inputText.trim() });
    } else {
      setMessages(prev => [...prev, { from: 'me', zh: inputText, en: inputText, age: 0 }]);
    }
    setInputText('');
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const displayMessages = conversationId && realMessages.length > 0
    ? realMessages.map(msg => ({
        from: msg.senderId === getCurrentUid() ? 'me' : 'other',
        zh: msg.content, en: msg.content, age: 0,
      }))
    : messages;

  return (
    <VaporBackground p={p} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}
        >
          {/* COUNTDOWN HEADER */}
          <View style={[styles.header, {
            backgroundColor: p.dark ? 'rgba(13,18,36,0.92)' : 'rgba(255,255,255,0.75)',
          }]}>
            {/* Back */}
            <View style={styles.headerRow}>
              <TouchableOpacity
                onPress={() => { if (conversationId) endConversation(conversationId, 'user_ended'); navigation.replace('Close'); }}
                style={styles.backBtn}
              >
                <Text style={{ color: p.muted, fontSize: 20 }}>‹</Text>
              </TouchableOpacity>

              {/* Other person */}
              <View style={styles.otherIdentity}>
                <Identity kind={identityKind} seed={otherSeed} size={28} palette={p} lang={lang} trust={0.25} />
                <ColorAdjLabel seed={otherSeed} lang={lang} palette={p} />
              </View>

              {/* Safety */}
              <TouchableOpacity onPress={() => navigation.push('Safety')} style={styles.safetyBtn}>
                <Text style={{ color: p.muted, fontSize: 18 }}>ⓘ</Text>
              </TouchableOpacity>
            </View>

            {/* Countdown bar */}
            <View style={styles.countdown}>
              <View style={styles.countdownRow}>
                <Cap p={p}>{t('chatRemaining', lang)}</Cap>
                <Text style={[styles.timer, { color: p.ink }]}>
                  {mm}<Text style={{ opacity: 0.4 }}>:</Text>{ss}
                </Text>
              </View>
              <CountdownBar p={p} progress={progress} />
              <Text style={[styles.dissolveNote, { color: p.muted }]}>
                {lang === 'en'
                  ? 'when this reaches zero, the entire conversation dissolves.'
                  : '歸零之後，整段對話會全部消散。'}
              </Text>
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
            <Text style={[styles.openNote, { color: p.muted }]}>
              {lang === 'en' ? 'opened at 23:47 · ends at 00:17' : '23:47 開啟 · 00:17 結束'}
            </Text>

            {displayMessages.map((m, i) => (
              <ChatBubble key={i} p={p} m={m} lang={lang} />
            ))}

            {/* Typing indicator */}
            <View style={styles.typingRow}>
              <Identity kind={identityKind} seed={otherSeed} size={20} palette={p} lang={lang} trust={0.25} />
              <View style={[styles.typingBubble, { backgroundColor: p.surface, borderColor: p.line }]}>
                {[0, 1, 2].map(i => (
                  <View key={i} style={[styles.typingDot, { backgroundColor: p.muted }]} />
                ))}
              </View>
            </View>
          </ScrollView>
          </View>

          {/* COMPOSER */}
          <View style={styles.composer}>
            {/* Photo veil bar */}
            <TouchableOpacity onPress={() => setShowVeilSheet(true)}
              style={[styles.veilBar, { backgroundColor: p.accentSoft, borderColor: p.accent + '30' }]}>
              <WickGlyph size={12} color={p.accent} />
              <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 12, color: p.inkSoft, flex: 1 }}>
                {lang === 'en' ? 'send a veiled photo — they reveal it with wicks' : '傳送帶紗照片，對方用燭芯揭開'}
              </Text>
              <Text style={{ fontFamily: 'Inter-Regular', fontSize: 10, color: p.muted }}>
                {lang === 'en' ? '2 wicks' : '2 芯'}
              </Text>
            </TouchableOpacity>
            <GlassCard p={p} padding={6} radius={28}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TextInput
                value={inputText}
                onChangeText={setInputText}
                placeholder={t('chatPlaceholder', lang)}
                placeholderTextColor={p.muted}
                style={[styles.input, { color: p.ink }]}
                onSubmitEditing={sendMessage}
                returnKeyType="send"
              />
              <TouchableOpacity
                onPress={sendMessage}
                style={[styles.sendBtn, { backgroundColor: p.ink }]}
              >
                <Text style={{ color: p.dark ? '#1a1530' : '#fff', fontSize: 16 }}>↑</Text>
              </TouchableOpacity>
            </GlassCard>
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
                    ? 'Your photo will be hidden under a veil. The other person can lift each layer with 2 wicks. They always agree first.'
                    : '照片會藏在紗罩下。對方每揭一層需要 2 燭芯，並且需要先同意。'}
                </Text>
                <View style={{ alignItems: 'center', marginBottom: 16 }}>
                  <PhotoVeil p={p} liftLevel={0} size={160} lang={lang} />
                  <Text style={{ fontFamily: 'EBGaramond-Italic', fontSize: 11, color: p.muted, marginTop: 8 }}>
                    {lang === 'en' ? 'preview — 4 layers of veil' : '預覽 — 四層紗罩'}
                  </Text>
                </View>
                {!veilSent ? (
                  <TouchableOpacity
                    onPress={async () => { if (wicks >= 2) { const result = await spendWicks(2, 'photo_veil', conversationId); if (result.ok) setVeilSent(true); } }}
                    disabled={wicks < 2}
                    style={[styles.sendVeilBtn, { backgroundColor: wicks >= 2 ? p.ink : p.line }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 15, color: wicks >= 2 ? (p.dark ? '#1a1530' : '#fff') : p.muted, fontWeight: '500' }}>
                        {lang === 'en' ? 'Send veiled photo' : '送出帶紗照片'}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <WickGlyph size={11} color={wicks >= 2 ? (p.dark ? '#1a1530' : '#fff') : p.muted} />
                        <Text style={{ fontFamily: 'Inter-Regular', fontSize: 12, color: wicks >= 2 ? (p.dark ? '#1a1530' : 'rgba(255,255,255,0.7)') : p.muted }}>2</Text>
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
                <TouchableOpacity onPress={() => { setShowVeilSheet(false); setVeilSent(false); }} style={{ alignItems: 'center', paddingVertical: 10 }}>
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

function ChatBubble({ p, m, lang }: any) {
  const isMe = m.from === 'me';
  return (
    <View style={[styles.bubbleRow, { justifyContent: isMe ? 'flex-end' : 'flex-start' }]}>
      <View style={[
        styles.bubble,
        isMe
          ? { backgroundColor: p.accent, borderWidth: 0 }
          : { backgroundColor: p.surface, borderWidth: 0.5, borderColor: p.line },
      ]}>
        <Text style={[
          styles.bubbleText,
          { color: isMe ? (p.dark ? '#15172e' : '#fbf5e4') : p.ink },
        ]}>
          {lang === 'en' ? m.en : m.zh}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header:         { paddingTop: 8, paddingBottom: 14, paddingHorizontal: 18 },
  headerRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn:        { padding: 6 },
  otherIdentity:  { alignItems: 'center', gap: 4 },
  safetyBtn:      { padding: 6 },
  countdown:      { marginTop: 14, gap: 8, paddingHorizontal: 6 },
  countdownRow:   { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 },
  timer:          { fontFamily: 'Inter-Regular', fontSize: 22, fontWeight: '300', letterSpacing: 1 },
  dissolveNote:   { fontFamily: 'EBGaramond-Italic', fontSize: 11, textAlign: 'center', opacity: 0.7 },
  messages:       { flex: 1 },
  openNote:       { fontFamily: 'EBGaramond-Italic', fontSize: 11, textAlign: 'center', opacity: 0.7, marginBottom: 6 },
  bubbleRow:      { flexDirection: 'row' },
  bubble:         { maxWidth: '78%', paddingVertical: 10, paddingHorizontal: 15, borderRadius: 22 },
  bubbleText:     { fontFamily: 'NotoSerifTC-Regular', fontSize: 15, lineHeight: 24 },
  typingRow:      { flexDirection: 'row', alignItems: 'flex-end', gap: 6, opacity: 0.7, marginTop: 4 },
  typingBubble:   { flexDirection: 'row', gap: 4, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 16, borderWidth: 0.5 },
  typingDot:      { width: 5, height: 5, borderRadius: 5 },
  composer:       { padding: 4, paddingHorizontal: 18, paddingBottom: 18, gap: 8 },
  input:          { flex: 1, fontFamily: 'NotoSerifTC-Regular', fontSize: 15, paddingHorizontal: 14, paddingVertical: 12 },
  sendBtn:        { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
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
