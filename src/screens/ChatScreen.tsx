import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import { DIRECTIONS } from '../lib/theme';
import { t } from '../lib/copy';
import { VaporBackground, GlassCard, CountdownBar, Cap } from '../components/ui';
import { Identity } from '../components/identity/Identity';
import { ColorAdjLabel } from '../components/identity/Identity';
import { useAppStore } from '../hooks/useAppStore';

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
  const { seed, direction, lang, identityKind } = useAppStore();
  const p = DIRECTIONS[direction];
  const otherSeed = route.params?.otherSeed || 'm0od7';

  const [remaining, setRemaining] = useState(28 * 60 + 14);
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [inputText, setInputText] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    const id = setInterval(() => {
      setRemaining(r => {
        if (r <= 1) {
          clearInterval(id);
          navigation.replace('Close');
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

  const sendMessage = () => {
    if (!inputText.trim()) return;
    setMessages(prev => [...prev, { from: 'me', zh: inputText, en: inputText, age: 0 }]);
    setInputText('');
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

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
                onPress={() => navigation.replace('Close')}
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
          <ScrollView
            ref={scrollRef}
            style={styles.messages}
            contentContainerStyle={{ padding: 20, gap: 14 }}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
          >
            <Text style={[styles.openNote, { color: p.muted }]}>
              {lang === 'en' ? 'opened at 23:47 · ends at 00:17' : '23:47 開啟 · 00:17 結束'}
            </Text>

            {messages.map((m, i) => (
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

          {/* COMPOSER */}
          <View style={styles.composer}>
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
  composer:       { padding: 4, paddingHorizontal: 18, paddingBottom: 18 },
  input:          { flex: 1, fontFamily: 'NotoSerifTC-Regular', fontSize: 15, paddingHorizontal: 14, paddingVertical: 12 },
  sendBtn:        { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
});
