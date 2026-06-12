import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, ScrollView,
  StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import { LOFT_PALETTE } from '../lib/theme';
import { t } from '../lib/copy';
import { WickGlyph, PhotoVeil, AnimatedNumber } from '../components/ui';
import { useAppStore } from '../hooks/useAppStore';
import { spendWicks } from '../lib/db';
import { hapticMedium } from '../lib/haptics';

type Props = NativeStackScreenProps<RootStackParamList, 'LoftChat'>;

const L = LOFT_PALETTE;

const MESSAGES = [
  { from: 'other', zh: '你還醒著。', en: 'You\'re still awake.' },
  { from: 'me',    zh: '今天身邊那個人，沒問我一句話。', en: 'The one beside me asked nothing today.' },
  { from: 'other', zh: '我聽得到你的呼吸。', en: 'I can hear you breathing.' },
  { from: 'me',    zh: '我不知道我在等什麼。', en: 'I don\'t know what I\'m waiting for.' },
  { from: 'other', zh: '等一個人，先看你一眼。', en: 'For someone to look at you, before anything else.' },
];

const PULSES = [
  { key: 'loftPulse1', em: '♡' },
  { key: 'loftPulse2', em: '⤳' },
  { key: 'loftPulse3', em: '☾' },
  { key: 'loftPulse4', em: '⊙' },
];

export default function LoftChatScreen({ navigation, route }: Props) {
  const { lang, wicks } = useAppStore();
  const [remaining, setRemaining] = useState(58 * 60 + 14);
  const [message, setMessage] = useState('');
  const [veilLevel, setVeilLevel] = useState(1);
  const [showVeil, setShowVeil] = useState(false);
  const [giftSent, setGiftSent] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setRemaining(r => Math.max(0, r - 1)), 1000);
    return () => clearInterval(id);
  }, []);

  const hh = String(Math.floor(remaining / 3600)).padStart(2, '0');
  const mm = String(Math.floor((remaining % 3600) / 60)).padStart(2, '0');

  const sendPulse = async (_key: string) => {
    const result = await spendWicks(1, 'pulse');
    if (result.ok) { hapticMedium(); }
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
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.topBtn}>
              <Text style={{ color: L.muted, fontSize: 18 }}>‹</Text>
            </TouchableOpacity>
            <View style={{ flex: 1, alignItems: 'center' }}>
              {/* Veiled portrait in header */}
              <PhotoVeil p={L as any} liftLevel={veilLevel} size={44} lang={lang} />
              <Text style={{ fontFamily: 'EBGaramond-Italic', fontSize: 12, color: 'rgba(245,226,196,0.7)', marginTop: 4 }}>
                {lang === 'en' ? 'wine, long-bench' : '酒紅的長椅'}
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
          <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.messages}>
            <Text style={{ fontFamily: 'EBGaramond-Italic', fontSize: 11, color: L.muted, textAlign: 'center', opacity: 0.7, marginBottom: 10 }}>
              {lang === 'en' ? 'opened at 23:47 · ends at 00:17' : '23:47 開啟 · 00:17 結束'}
            </Text>

            {MESSAGES.map((m, i) => {
              const isMe = m.from === 'me';
              return (
                <View key={i} style={[styles.bubbleRow, { justifyContent: isMe ? 'flex-end' : 'flex-start' }]}>
                  <View style={[styles.bubble, {
                    backgroundColor: isMe ? 'rgba(232,165,87,0.25)' : 'rgba(245,226,196,0.06)',
                    borderColor: isMe ? 'rgba(232,165,87,0.4)' : 'rgba(245,226,196,0.1)',
                    borderTopRightRadius: isMe ? 6 : 22,
                    borderTopLeftRadius: isMe ? 22 : 6,
                  }]}>
                    <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 15, lineHeight: 24, color: L.ink, fontStyle: 'italic' }}>
                      {lang === 'en' ? m.en : m.zh}
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
                  {lang === 'en' ? `tap to lift · ${4 - veilLevel} left` : `輕點揭曉 · 還剩 ${4 - veilLevel} 層`}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Typing */}
            <View style={[styles.bubbleRow, { justifyContent: 'flex-start', marginTop: 8 }]}>
              <View style={[styles.bubble, { backgroundColor: 'rgba(245,226,196,0.06)', borderColor: 'rgba(245,226,196,0.1)' }]}>
                <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
                  {[0, 1, 2].map(i => (
                    <View key={i} style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: L.muted, opacity: 0.6 }} />
                  ))}
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Pulse buttons */}
          <View style={styles.pulseRow}>
            <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 11, color: L.muted, marginRight: 8 }}>
              {t('loftWhisper', lang)}
            </Text>
            {PULSES.map(pulse => (
              <TouchableOpacity key={pulse.key} onPress={() => sendPulse(pulse.key)}
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
          <TouchableOpacity
            disabled={giftSent}
            onPress={async () => { const r = await spendWicks(5, 'gift'); if (r.ok) { hapticMedium(); setGiftSent(true); } }}
            style={[styles.giftRow, giftSent && { opacity: 0.6 }]}>
            <WickGlyph size={12} color={L.candle} />
            <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 13, color: 'rgba(245,226,196,0.8)', flex: 1 }}>
              {giftSent ? (lang === 'en' ? '✓ Candle gifted' : '✓ 蠟燭已送出') : t('loftGift', lang)}
            </Text>
            {!giftSent && (
              <Text style={{ fontFamily: 'Inter-Regular', fontSize: 11, color: 'rgba(232,165,87,0.7)' }}>
                {t('loftGiftCost', lang)}
              </Text>
            )}
          </TouchableOpacity>

          {/* Composer */}
          <View style={styles.composer}>
            <View style={[styles.composerInner, { borderColor: 'rgba(232,165,87,0.2)' }]}>
              <TextInput
                value={message}
                onChangeText={setMessage}
                placeholder={t('loftWhisper', lang)}
                placeholderTextColor={L.muted}
                style={{ flex: 1, fontFamily: 'NotoSerifTC-Regular', fontSize: 15, color: L.ink, paddingHorizontal: 14, paddingVertical: 12, fontStyle: 'italic' }}
              />
              <TouchableOpacity
                style={[styles.sendBtn, { backgroundColor: '#e8a557' }]}
                onPress={() => setMessage('')}>
                <Text style={{ color: '#1f1014', fontSize: 16 }}>↑</Text>
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
                <TouchableOpacity onPress={async () => { if (wicks >= 2) { const r = await spendWicks(2, 'veil_lift'); if (r.ok) { hapticMedium(); setVeilLevel(v => v + 1); } } }}
                  disabled={wicks < 2}
                  style={[styles.liftBtn, { backgroundColor: wicks >= 2 ? L.ink : L.line }]}>
                  <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 15, color: wicks >= 2 ? '#f5e2c4' : L.muted }}>
                    {t(`veilLift${veilLevel + 1}` as any, lang)}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <WickGlyph size={12} color={wicks >= 2 ? '#f5e2c4' : L.muted} />
                    <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 12, color: wicks >= 2 ? '#f5e2c4' : L.muted }}>
                      {t('veilCost', lang)}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => setShowVeil(false)}>
                <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 13, color: L.muted, paddingVertical: 8 }}>
                  {lang === 'en' ? 'close' : '關上'}
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
