import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import { DIRECTIONS } from '../lib/theme';
import { t } from '../lib/copy';
import { VaporBackground, SoftButton } from '../components/ui';
import { useAppStore } from '../hooks/useAppStore';

type Props = NativeStackScreenProps<RootStackParamList, 'Close'>;

export default function CloseScreen({ navigation }: Props) {
  const { direction, lang } = useAppStore();
  const p = DIRECTIONS[direction];
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

  return (
    <VaporBackground p={p} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.container}>
          {/* Fading orb */}
          <View style={[styles.orb, { backgroundColor: p.accent + '33' }]} />

          <View style={styles.content}>
            <Text style={[styles.title, { color: p.ink }]}>{t('closeHeader', lang)}</Text>
            <Text style={[styles.titleAlt, { color: p.ink }]}>
              {lang === 'en' ? '今天的窗口關了' : "Today's window is closed"}
            </Text>
            <Text style={[styles.body, { color: p.inkSoft }]}>{t('closeBody', lang)}</Text>

            {/* Session stats */}
            <View style={[styles.statsRow, { borderColor: p.line }]}>
              <View style={styles.statCell}>
                <Text style={[styles.statNum, { color: p.ink }]}>1</Text>
                <Text style={[styles.statLabel, { color: p.muted }]}>
                  {lang === 'en' ? 'person spoken with' : '說話的人'}
                </Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: p.line }]} />
              <View style={styles.statCell}>
                <Text style={[styles.statNum, { color: p.ink }]}>1</Text>
                <Text style={[styles.statLabel, { color: p.muted }]}>
                  {lang === 'en' ? 'conversation' : '對話'}
                </Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: p.line }]} />
              <View style={styles.statCell}>
                <Text style={[styles.statNum, { color: p.ink }]}>0</Text>
                <Text style={[styles.statLabel, { color: p.muted }]}>
                  {lang === 'en' ? 'stored' : '儲存'}
                </Text>
              </View>
            </View>

            {/* Timer to next reset */}
            <View style={[styles.timerCard, { backgroundColor: p.surface, borderColor: p.line }]}>
              <Text style={[styles.timerLabel, { color: p.muted }]}>{t('closeReturn', lang)}</Text>
              <Text style={[styles.timerValue, { color: p.ink }]}>{timeStr}</Text>
            </View>

            {/* No trace note */}
            <View style={styles.noTrace}>
              <Text style={[styles.noTraceText, { color: p.muted }]}>
                {lang === 'en' ? '· No traces remain ·' : '· 不留下任何痕跡 ·'}
              </Text>
            </View>
          </View>

          <SoftButton p={p} variant="ghost" size="lg" full
            onPress={() => navigation.replace('Mood')}>
            <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 15, color: p.muted }}>
              {t('closeRest', lang)}
            </Text>
          </SoftButton>
        </View>
      </SafeAreaView>
    </VaporBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 32, justifyContent: 'space-between' },
  orb:       { position: 'absolute', width: 300, height: 300, borderRadius: 150, top: '15%', alignSelf: 'center', opacity: 0.5 },
  content:   { flex: 1, justifyContent: 'center', gap: 16 },
  title:     { fontFamily: 'NotoSerifTC-Light', fontSize: 36, lineHeight: 46 },
  titleAlt:  { fontFamily: 'EBGaramond-Italic', fontSize: 15, opacity: 0.4, marginTop: -10 },
  body:      { fontFamily: 'NotoSerifTC-Regular', fontSize: 15, lineHeight: 26, marginTop: 8 },
  timerCard: { borderWidth: 0.5, borderRadius: 20, padding: 20, alignItems: 'center', gap: 8, marginTop: 24 },
  timerLabel:{ fontFamily: 'NotoSerifTC-Regular', fontSize: 13 },
  timerValue:{ fontFamily: 'Inter-Regular', fontSize: 32, fontWeight: '300', letterSpacing: 3 },
  noTrace:     { alignItems: 'center', marginTop: 16 },
  noTraceText: { fontFamily: 'EBGaramond-Italic', fontSize: 13, opacity: 0.5 },
  statsRow:    { flexDirection: 'row', borderWidth: 0.5, borderRadius: 16, overflow: 'hidden', marginTop: 16 },
  statCell:    { flex: 1, alignItems: 'center', paddingVertical: 14, gap: 4 },
  statNum:     { fontFamily: 'Inter-Regular', fontSize: 22, fontWeight: '300' },
  statLabel:   { fontFamily: 'NotoSerifTC-Regular', fontSize: 11, textAlign: 'center' },
  statDivider: { width: 0.5 },
});
