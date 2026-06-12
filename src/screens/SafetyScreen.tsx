import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import { DIRECTIONS } from '../lib/theme';
import { t } from '../lib/copy';
import { VaporBackground, GlassCard, SoftButton } from '../components/ui';
import { useAppStore } from '../hooks/useAppStore';

type Props = NativeStackScreenProps<RootStackParamList, 'Safety'>;

export default function SafetyScreen({ navigation }: Props) {
  const { direction, lang } = useAppStore();
  const p = DIRECTIONS[direction];

  return (
    <VaporBackground p={p} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.container}>
          {/* Back */}
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={[styles.backText, { color: p.muted }]}>
              {lang === 'en' ? '← back' : '← 返回'}
            </Text>
          </TouchableOpacity>

          {/* Title */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: p.ink }]}>{t('safetyTitle', lang)}</Text>
            <Text style={[styles.blurb, { color: p.muted }]}>{t('safetyBlurb', lang)}</Text>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <SoftButton p={p} variant="danger" size="lg" full
              onPress={() => navigation.replace('Close')}>
              <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 15, color: p.danger }}>
                {t('safetyBlock', lang)}
              </Text>
            </SoftButton>

            <SoftButton p={p} variant="secondary" size="lg" full
              onPress={() => navigation.replace('Close')}>
              <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 15, color: p.ink }}>
                {t('safetyReport', lang)}
              </Text>
            </SoftButton>

            <SoftButton p={p} variant="ghost" size="lg" full
              onPress={() => navigation.replace('Close')}>
              <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 15, color: p.muted }}>
                {t('safetyExit', lang)}
              </Text>
            </SoftButton>
          </View>

          {/* Hotline */}
          <GlassCard p={p} padding={18} radius={20} style={styles.hotline}>
            <Text style={[styles.hotlineTitle, { color: p.ink }]}>
              {lang === 'en' ? '24h Support Line' : '24 小時情緒支援'}
            </Text>
            <Text style={[styles.hotlineNumber, { color: p.accent }]}>1995</Text>
            <Text style={[styles.hotlineNote, { color: p.muted }]}>
              {lang === 'en' ? 'Taiwan Mental Health Line' : '安心專線（台灣）'}
            </Text>
          </GlassCard>

          {/* Footer note */}
          <Text style={[styles.footer, { color: p.muted }]}>{t('safetyFooter', lang)}</Text>
        </View>
      </SafeAreaView>
    </VaporBackground>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, padding: 28, gap: 0 },
  backBtn:      { paddingBottom: 20 },
  backText:     { fontFamily: 'NotoSerifTC-Regular', fontSize: 13 },
  header:       { gap: 12, marginBottom: 32 },
  title:        { fontFamily: 'NotoSerifTC-Regular', fontSize: 34, lineHeight: 44 },
  blurb:        { fontFamily: 'NotoSerifTC-Regular', fontSize: 15, lineHeight: 24 },
  actions:      { gap: 10, marginBottom: 28 },
  hotline:      { alignItems: 'center', gap: 6, marginBottom: 28 },
  hotlineTitle: { fontFamily: 'NotoSerifTC-Regular', fontSize: 13 },
  hotlineNumber:{ fontFamily: 'Inter-Regular', fontSize: 32, fontWeight: '300', letterSpacing: 4 },
  hotlineNote:  { fontFamily: 'NotoSerifTC-Regular', fontSize: 12 },
  footer:       { fontFamily: 'NotoSerifTC-Regular', fontSize: 11, textAlign: 'center', lineHeight: 18, opacity: 0.7 },
});
