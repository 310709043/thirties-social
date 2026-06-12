import React, { useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView, Animated, Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import { DIRECTIONS } from '../lib/theme';
import { t, tAlt } from '../lib/copy';
import { VaporBackground, GlassCard, Cap, WickGlyph, AnimatedNumber, FadeInUp, PressableScale } from '../components/ui';
import { useAppStore, setVigil } from '../hooks/useAppStore';
import { addWicks } from '../lib/db';
import { hapticSuccess } from '../lib/haptics';

type Props = NativeStackScreenProps<RootStackParamList, 'Upgrade'>;

const WICK_PACKS = [
  { key: 'wick10', amount: 10, price: 'NT$ 49', priceNote: '4.9/芯' },
  { key: 'wick30', amount: 30, price: 'NT$ 129', priceNote: '4.3/芯', highlight: true },
  { key: 'wick100', amount: 100, price: 'NT$ 349', priceNote: '3.5/芯' },
];

export default function UpgradeScreen({ navigation }: Props) {
  const { direction, lang, wicks, vigil } = useAppStore();
  const p = DIRECTIONS[direction];
  const wickGlow = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(wickGlow, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(wickGlow, { toValue: 0.8, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const handleBuyPack = async (amount: number) => {
    const result = await addWicks(amount, 'purchase', undefined, `購買 ${amount} 燭芯`);
    if (result.ok) {
      hapticSuccess();
    }
  };

  const handleVigil = () => {
    setVigil(true);
    hapticSuccess();
    navigation.goBack();
  };

  return (
    <VaporBackground p={p} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Top bar */}
          <FadeInUp delay={0} distance={6}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Text style={{ color: p.muted, fontFamily: 'NotoSerifTC-Regular', fontSize: 13 }}>
                ‹ {lang === 'en' ? 'back' : '返回'}
              </Text>
            </TouchableOpacity>
          </FadeInUp>

          {/* Current wicks */}
          <FadeInUp delay={80} distance={12}>
            <View style={{ alignItems: 'center', marginBottom: 32 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Animated.View style={{ opacity: wickGlow }}>
                  <WickGlyph size={28} color={p.accent} />
                </Animated.View>
                <AnimatedNumber value={wicks} style={{ fontFamily: 'Inter-Regular', fontSize: 48, color: p.ink, fontWeight: '300' }} />
              </View>
              <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 13, color: p.muted }}>
                {lang === 'en' ? `${wicks} wicks remaining` : `剩餘 ${wicks} 燭芯`}
              </Text>
            </View>
          </FadeInUp>

          <FadeInUp delay={160} distance={10}>
            <Cap p={p}>{t('upgradeTitle', lang)} · {tAlt('upgradeTitle', lang)}</Cap>
            <Text style={[styles.blurb, { color: p.muted }]}>{t('upgradeBlurb', lang)}</Text>
          </FadeInUp>

          {/* Vigil tier */}
          <FadeInUp delay={240} distance={12}>
            <GlassCard p={p} padding={22} radius={24} style={{ marginTop: 20 }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <View>
                  <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 20, color: p.ink, fontWeight: '500' }}>
                    {t('tierVigil', lang)}
                  </Text>
                  <Text style={{ fontFamily: 'EBGaramond-Italic', fontSize: 12, color: p.muted, marginTop: 2 }}>
                    {tAlt('tierVigil', lang)}
                  </Text>
                </View>
                <Text style={{ fontFamily: 'Inter-Regular', fontSize: 18, color: p.accent, fontWeight: '500' }}>
                  {t('tierVigilPrice', lang)}
                </Text>
              </View>
              <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 13, color: p.muted, lineHeight: 22, marginTop: 12 }}>
                {t('tierVigilBlurb', lang)}
              </Text>
              {vigil ? (
                <View style={[styles.vigilActive, { backgroundColor: p.accentSoft, borderColor: p.accent + '40' }]}>
                  <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 14, color: p.accent }}>
                    {lang === 'en' ? '✓ Active' : '✓ 已訂閱'}
                  </Text>
                </View>
              ) : (
                <TouchableOpacity onPress={handleVigil}
                  style={[styles.vigilBtn, { backgroundColor: p.ink }]}>
                  <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 15, color: p.dark ? '#1a1530' : '#fff', fontWeight: '500' }}>
                    {t('vigilCta', lang)}
                  </Text>
                </TouchableOpacity>
              )}
            </GlassCard>
          </FadeInUp>

          {/* Free tier */}
          <FadeInUp delay={320} distance={10}>
            <GlassCard p={p} padding={18} radius={20} style={{ marginTop: 12, opacity: 0.7 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View>
                  <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 16, color: p.ink }}>
                    {t('tierFree', lang)}
                  </Text>
                  <Text style={{ fontFamily: 'EBGaramond-Italic', fontSize: 11, color: p.muted, marginTop: 2 }}>
                    {tAlt('tierFree', lang)}
                  </Text>
                </View>
                <Text style={{ fontFamily: 'Inter-Regular', fontSize: 14, color: p.muted }}>
                  {t('tierFreeSub', lang)}
                </Text>
              </View>
            </GlassCard>
          </FadeInUp>

          {/* Wicks section */}
          <FadeInUp delay={400} distance={10}>
            <View style={{ marginTop: 32 }}>
              <Cap p={p}>{t('wicksTitle', lang)} · {tAlt('wicksTitle', lang)}</Cap>
              <Text style={[styles.blurb, { color: p.muted, marginBottom: 14 }]}>
                {t('wicksBlurb', lang)}
              </Text>
              {WICK_PACKS.map((pack, i) => (
                <FadeInUp key={pack.key} delay={450 + i * 80} distance={8}>
                  <PressableScale onPress={() => handleBuyPack(pack.amount)}>
                    <View style={[styles.packRow, {
                      backgroundColor: pack.highlight ? p.accentSoft : p.surface,
                      borderColor: pack.highlight ? p.accent + '60' : p.line,
                    }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <WickGlyph size={16} color={p.accent} />
                        <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 16, color: p.ink, fontWeight: '500' }}>
                          {t(pack.key, lang)}
                        </Text>
                        {pack.highlight && (
                          <View style={{ backgroundColor: p.accent, borderRadius: 999, paddingHorizontal: 6, paddingVertical: 2 }}>
                            <Text style={{ fontFamily: 'Inter-Regular', fontSize: 9, color: p.dark ? '#1a1530' : '#fff', letterSpacing: 0.5 }}>
                              {lang === 'en' ? 'BEST' : '最超值'}
                            </Text>
                          </View>
                        )}
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ fontFamily: 'Inter-Regular', fontSize: 16, color: p.ink, fontWeight: '500' }}>
                          {pack.price}
                        </Text>
                        <Text style={{ fontFamily: 'Inter-Regular', fontSize: 10, color: p.muted }}>
                          {pack.priceNote}
                        </Text>
                      </View>
                    </View>
                  </PressableScale>
                </FadeInUp>
              ))}
            </View>
          </FadeInUp>

          {/* Wicks explainer */}
          <FadeInUp delay={700} distance={10}>
            <View style={[styles.wickNote, { backgroundColor: p.accentSoft, borderColor: p.accent + '30' }]}>
              <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 12, color: p.inkSoft, lineHeight: 20 }}>
                {lang === 'en'
                  ? 'Wicks are spent on: revealing photo veils (2 wicks each), entering the Loft (5 wicks/night), sending pulse messages (1 wick each), gifting a candle (5 wicks). The other person always consents first.'
                  : '燭芯用於：揭開照片紗罩（每層 2 芯）、進入夜閣（每晚 5 芯）、傳送脈搏訊息（每則 1 芯）、送出蠟燭（5 芯）。對方永遠需要先同意。'}
              </Text>
            </View>
          </FadeInUp>
        </ScrollView>
      </SafeAreaView>
    </VaporBackground>
  );
}

const styles = StyleSheet.create({
  scroll:       { padding: 24, paddingBottom: 48 },
  backBtn:      { paddingBottom: 20 },
  blurb:        { fontFamily: 'NotoSerifTC-Regular', fontSize: 13, lineHeight: 22, marginTop: 8 },
  vigilBtn:     { height: 52, borderRadius: 999, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  vigilActive:  { height: 44, borderRadius: 999, alignItems: 'center', justifyContent: 'center', marginTop: 16, borderWidth: 0.5 },
  packRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 18, borderWidth: 0.5, marginBottom: 10 },
  wickNote:     { marginTop: 20, padding: 14, borderRadius: 14, borderWidth: 0.5 },
});
