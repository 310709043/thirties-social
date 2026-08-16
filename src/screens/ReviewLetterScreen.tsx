// ReviewLetterScreen (W2-8) — a short letter read once in the morning; the one
// light-background screen in the app. Honest by design: it shows only what we
// truly know locally (that you came, how many lines you said, your streak). No
// fabricated "N people remembered you" — we deliberately keep none of the words.
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import { LETTER_PALETTE as L } from '../lib/theme';
import { t } from '../lib/copy';
import { useAppStore } from '../hooks/useAppStore';

type Props = NativeStackScreenProps<RootStackParamList, 'ReviewLetter'>;

export default function ReviewLetterScreen({ navigation }: Props) {
  const { lang, saidLastNight, streakNights } = useAppStore();
  const said = saidLastNight;

  const StatLine = ({ num, label }: { num: string; label: string }) => (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 12 }}>
      <Text style={{ fontFamily: 'EBGaramond-Italic', fontSize: 28, color: L.gold, minWidth: 44 }}>{num}</Text>
      <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 14, lineHeight: 22, color: L.inkSoft, flex: 1 }}>{label}</Text>
    </View>
  );

  return (
    <LinearGradient colors={L.bg as any} start={{ x: 0, y: 0 }} end={{ x: 0.4, y: 1 }} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1, width: '100%', maxWidth: 560, alignSelf: 'center' }}>
        <ScrollView contentContainerStyle={{ padding: 26, gap: 22 }} showsVerticalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontFamily: 'Inter-Regular', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: L.muted, fontWeight: '600' }}>
              {t('letterEyebrow', lang)}
            </Text>
            <TouchableOpacity onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="close" hitSlop={10}>
              <Text style={{ fontSize: 20, color: L.muted }}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={{ fontFamily: 'NotoSerifTC-Light', fontSize: 30, lineHeight: 42, color: L.ink }}>
            {t('letterOpen', lang)}
          </Text>

          {/* Paper card — deliberately squared off (radius 4) like a slip of paper. */}
          <View style={{ backgroundColor: L.paper, borderRadius: 4, padding: 24, borderLeftWidth: 3, borderLeftColor: L.gold, gap: 18, shadowColor: '#4a3f36', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.09, shadowRadius: 14 }}>
            {said > 0 ? (
              <StatLine num={String(said)} label={`${t('letterSaidUnit', lang)} · ${t('letterSaidLabel', lang)}`} />
            ) : (
              <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 15, lineHeight: 25, color: L.ink }}>
                {t('letterQuiet', lang)}
              </Text>
            )}
            {streakNights >= 2 ? (
              <StatLine num={String(streakNights)} label={t('letterStreakLabel', lang)} />
            ) : null}
          </View>

          <View style={{ padding: 16, borderRadius: 14, backgroundColor: 'rgba(201,154,91,0.1)', borderWidth: 0.7, borderColor: 'rgba(201,154,91,0.3)' }}>
            <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 13, lineHeight: 21, color: L.inkSoft }}>
              {t('letterPrivacy', lang)}
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => navigation.replace('Mood')}
            accessibilityRole="button"
            style={{ height: 54, borderRadius: 999, backgroundColor: L.ink, alignItems: 'center', justifyContent: 'center', marginTop: 4 }}>
            <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 16, color: '#faf4ea', fontWeight: '500' }}>
              {t('letterCta', lang)}
            </Text>
          </TouchableOpacity>

          <Text style={{ fontFamily: 'EBGaramond-Italic', fontSize: 12, color: L.muted, textAlign: 'center' }}>
            {t('letterFooter', lang)}
          </Text>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}
