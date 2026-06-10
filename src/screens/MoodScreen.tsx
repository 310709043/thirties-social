import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, SafeAreaView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import { DIRECTIONS } from '../lib/theme';
import { t, tAlt } from '../lib/copy';
import {
  VaporBackground, GlassCard, SoftButton, BreathDot, Cap,
} from '../components/ui';
import { Identity } from '../components/identity/Identity';
import { ColorAdjLabel } from '../components/identity/Identity';
import { useAppStore } from '../hooks/useAppStore';

type Props = NativeStackScreenProps<RootStackParamList, 'Mood'>;

const SUGGESTED_ROOMS = [
  'room_partner', 'room_lonely', 'room_doubt',
  'room_cant_sleep', 'room_quiet', 'room_transition',
] as const;

const LIVE_COUNTS: Record<string, number> = {
  room_partner: 12, room_lonely: 8, room_doubt: 5,
  room_cant_sleep: 14, room_quiet: 3, room_transition: 7,
};

export default function MoodScreen({ navigation }: Props) {
  const { seed, direction, lang, identityKind } = useAppStore();
  const p = DIRECTIONS[direction];
  const [text, setText] = useState('');
  const [timeStr, setTimeStr] = useState('');

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

  const handleEnter = () => {
    navigation.push('Room', { roomKey: 'room_partner' });
  };

  return (
    <VaporBackground p={p} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={[styles.container]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* TOP ROW */}
          <View style={styles.topRow}>
            <TouchableOpacity style={styles.identityRow} activeOpacity={0.8}>
              <Identity kind={identityKind} seed={seed} size={36} palette={p} lang={lang} trust={0.2} />
              <View>
                <Text style={[styles.youTonight, { color: p.muted }]}>
                  {lang === 'en' ? 'You, tonight' : '你·今晚'}
                </Text>
                <ColorAdjLabel seed={seed} lang={lang} palette={p} />
              </View>
            </TouchableOpacity>

            {/* Cycle countdown */}
            <View style={styles.countdown}>
              <Text style={[styles.countdownText, { color: p.muted }]}>{timeStr}</Text>
            </View>
          </View>

          {/* HEADING */}
          <View style={styles.heading}>
            <Text style={[styles.headingMain, { color: p.ink }]}>{t('moodHeader', lang)}</Text>
            <Text style={[styles.headingAlt, { color: p.ink }]}>{tAlt('moodHeader', lang)}</Text>
          </View>

          <Text style={[styles.prompt, { color: p.muted }]}>{t('moodPrompt', lang)}</Text>

          {/* TEXT INPUT */}
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

          {/* SUGGESTED ROOMS */}
          <Cap p={p} style={styles.cap}>
            {t('moodSuggested', lang)} · {tAlt('moodSuggested', lang).toLowerCase()}
          </Cap>
          <View style={styles.chips}>
            {SUGGESTED_ROOMS.map(rk => (
              <TouchableOpacity
                key={rk}
                onPress={() => navigation.push('Room', { roomKey: rk })}
                style={[styles.chip, { backgroundColor: p.surface, borderColor: p.line }]}
                activeOpacity={0.75}
              >
                <BreathDot p={p} size={5} />
                <Text style={[styles.chipText, { color: p.ink }]}>{t(rk, lang)}</Text>
                <View style={[styles.chipCount, { backgroundColor: p.accentSoft }]}>
                  <Text style={[styles.chipCountText, { color: p.accent }]}>{LIVE_COUNTS[rk]}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* FOOTER */}
          <View style={styles.footer}>
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
          </View>
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
  skip:          { alignItems: 'center', paddingVertical: 6 },
  skipText:      { fontFamily: 'NotoSerifTC-Regular', fontSize: 13 },
});
