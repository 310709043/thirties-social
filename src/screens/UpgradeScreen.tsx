import React, { useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, Animated, Easing, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import { DIRECTIONS } from '../lib/theme';
import { t, tAlt } from '../lib/copy';
import { VaporBackground, GlassCard, Cap, WickGlyph, AnimatedNumber, FadeInUp, PressableScale, ScreenHeader } from '../components/ui';
import { useAppStore } from '../hooks/useAppStore';
import { hapticSuccess } from '../lib/haptics';
import { buyWickPack, buyVigilSubscription, restorePurchases, IAP_PRODUCT_IDS } from '../lib/purchases';
import { isGuest } from '../lib/auth';

type Props = NativeStackScreenProps<RootStackParamList, 'Upgrade'>;

const WICK_PACKS = [
  { key: 'wick10', amount: 10, price: 'NT$ 60', priceNote: '6.0/芯' },
  { key: 'wick30', amount: 30, price: 'NT$ 150', priceNote: '5.0/芯', highlight: true },
  { key: 'wick100', amount: 100, price: 'NT$ 390', priceNote: '3.9/芯' },
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

  // Guests have no recoverable identity, so a purchase made now would be lost
  // on logout / reinstall. Require an account first.
  const requireAccount = (): boolean => {
    if (!isGuest()) return false;
    Alert.alert(
      lang === 'en' ? 'Create an account first' : '請先建立帳號',
      lang === 'en'
        ? 'As a guest your purchases can be lost if you log out or reinstall. Create an account to keep them safe.'
        : '訪客身分下，登出或重裝後購買可能會遺失。請先建立帳號以保住你的購買。',
      [
        { text: lang === 'en' ? 'Not now' : '稍後', style: 'cancel' },
        { text: lang === 'en' ? 'Create account' : '建立帳號', onPress: () => navigation.push('Auth', { mode: 'register' }) },
      ],
    );
    return true;
  };

  const handleBuyPack = async (amount: number) => {
    if (requireAccount()) return;
    const productMap: Record<number, string> = {
      10: IAP_PRODUCT_IDS.wick10,
      30: IAP_PRODUCT_IDS.wick30,
      100: IAP_PRODUCT_IDS.wick100,
    };
    const productId = productMap[amount];
    if (!productId) return;

    const result = await buyWickPack(productId);
    if (result.ok) {
      hapticSuccess();
    } else {
      Alert.alert(
        lang === 'en' ? 'Purchase failed' : '購買失敗',
        lang === 'en'
          ? 'Could not complete purchase. Please try again.'
          : '無法完成購買。請再試一次。',
        [{ text: 'OK', style: 'cancel' }],
      );
    }
  };

  const handleVigil = async () => {
    if (requireAccount()) return;
    const result = await buyVigilSubscription();
    if (result.ok) {
      hapticSuccess();
      navigation.goBack();
    } else {
      Alert.alert(
        lang === 'en' ? 'Purchase failed' : '購買失敗',
        lang === 'en'
          ? 'Could not complete subscription. Please try again.'
          : '無法完成訂閱。請再試一次。',
        [{ text: 'OK', style: 'cancel' }],
      );
    }
  };

  const handleRestore = async () => {
    const result = await restorePurchases();
    if (result.ok && result.restoredVigil) {
      hapticSuccess();
    } else {
      Alert.alert(
        lang === 'en' ? 'Nothing to restore' : '沒有可還原的購買',
        lang === 'en'
          ? 'No previous purchases found.'
          : '找不到之前的購買記錄。',
        [{ text: 'OK', style: 'cancel' }],
      );
    }
  };

  return (
    <VaporBackground p={p} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Top bar */}
          <FadeInUp delay={0} distance={6}>
            <ScreenHeader p={p} onBack={() => navigation.goBack()}
              title={lang === 'en' ? 'Wicks & Vigil' : '燭芯與守夜'} />
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
                  ? 'Wicks are spent on: sending a veiled photo (3 wicks), revealing a veiled photo someone sent you (3 wicks), and each new match once your free matches run out (1 wick). Conversations and rooms are free.'
                  : '燭芯用於：傳送帶紗照片（3 芯）、揭開對方傳來的帶紗照片（3 芯）、免費配對用完後每次新配對（1 芯）。對話與火盆都是免費的。'}
              </Text>
            </View>
          </FadeInUp>

          {/* Restore purchases */}
          <FadeInUp delay={780} distance={8}>
            <TouchableOpacity onPress={handleRestore} style={{ alignItems: 'center', paddingTop: 16 }}>
              <Text style={{ fontFamily: 'EBGaramond-Italic', fontSize: 13, color: p.muted }}>
                {lang === 'en' ? 'Restore purchases' : '恢復購買紀錄'}
              </Text>
            </TouchableOpacity>
          </FadeInUp>
        </ScrollView>
      </SafeAreaView>
    </VaporBackground>
  );
}

const styles = StyleSheet.create({
  scroll:       { padding: 24, paddingBottom: 48, width: '100%', maxWidth: 560, alignSelf: 'center' },
  backBtn:      { paddingBottom: 20 },
  blurb:        { fontFamily: 'NotoSerifTC-Regular', fontSize: 13, lineHeight: 22, marginTop: 8 },
  vigilBtn:     { height: 52, borderRadius: 999, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  vigilActive:  { height: 44, borderRadius: 999, alignItems: 'center', justifyContent: 'center', marginTop: 16, borderWidth: 0.5 },
  packRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 18, borderWidth: 0.5, marginBottom: 10 },
  wickNote:     { marginTop: 20, padding: 14, borderRadius: 14, borderWidth: 0.5 },
});
