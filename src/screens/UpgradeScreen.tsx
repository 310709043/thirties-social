import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, Animated, Easing, Alert, Linking, Platform,
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
import { analytics } from '../lib/analytics';

type Props = NativeStackScreenProps<RootStackParamList, 'Upgrade'>;

const WICK_PACKS = [
  { key: 'wick10', amount: 10, price: 'NT$ 60', priceNote: '6.0/芯' },
  { key: 'wick30', amount: 30, price: 'NT$ 150', priceNote: '5.0/芯', highlight: true },
  { key: 'wick100', amount: 100, price: 'NT$ 390', priceNote: '3.9/芯' },
];

export default function UpgradeScreen({ navigation }: Props) {
  const { direction, lang, wicks, vigil, gender } = useAppStore();
  const guest = isGuest();
  const p = DIRECTIONS[direction];
  const wickGlow = useRef(new Animated.Value(0.8)).current;
  // One purchase at a time — a second tap while the store sheet is opening
  // could stack two native purchase dialogs.
  const [buying, setBuying] = useState(false);
  const buyingRef = useRef(false);
  const persona = guest ? 'guest' : (gender ?? 'unknown');

  useEffect(() => { analytics.paywallView(persona, vigil); }, [persona, vigil]);

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

  // Map purchase failures to something the user (and our testers) can act on —
  // the old generic "try again" hid the real cause and made billing bugs
  // impossible to diagnose from a screenshot.
  const purchaseErrorText = (error?: string): string => {
    switch (error) {
      case 'cancelled':
        return ''; // user backed out — say nothing
      case 'not_configured':
        return lang === 'en'
          ? 'Purchases are unavailable in this build. Please install the app from Google Play and try again.'
          : '此安裝版本無法購買。請從 Google Play 商店安裝的正式版本中購買。';
      case 'identity_not_ready':
        return lang === 'en'
          ? 'Your purchase account is still switching. Wait a moment and try again.'
          : '購買帳號仍在切換中，請稍候再試。';
      case 'product_not_found':
        return lang === 'en'
          ? 'This item is not available in the store yet. Please try again later.'
          : '商品尚未在商店生效，請稍後再試。';
      default:
        return (lang === 'en'
          ? 'Could not complete purchase. Please try again.\n\n'
          : '無法完成購買。請再試一次。\n\n') + (error ?? '');
    }
  };

  const handleBuyPack = async (amount: number) => {
    if (buyingRef.current || requireAccount()) return;
    const productMap: Record<number, string> = {
      10: IAP_PRODUCT_IDS.wick10,
      30: IAP_PRODUCT_IDS.wick30,
      100: IAP_PRODUCT_IDS.wick100,
    };
    const productId = productMap[amount];
    if (!productId) return;

    buyingRef.current = true;
    setBuying(true);
    analytics.purchaseStart(productId, persona);
    const result = await buyWickPack(productId);
    analytics.purchaseResult(productId, persona, result.ok, result.error);
    buyingRef.current = false;
    setBuying(false);
    if (result.ok) {
      analytics.wickPurchase(amount);
      hapticSuccess();
      // The wicks are granted by the backend webhook, so the balance updates a
      // beat later — say so, or the quiet pause reads as "nothing happened".
      Alert.alert(
        lang === 'en' ? 'Thank you' : '完成了',
        lang === 'en'
          ? 'Your wicks are on their way — the balance updates in a few seconds.'
          : '燭芯正在送達，餘額幾秒內就會更新。',
        [{ text: 'OK', style: 'default' }],
      );
    } else {
      const msg = purchaseErrorText(result.error);
      if (msg) Alert.alert(lang === 'en' ? 'Purchase failed' : '購買失敗', msg, [{ text: 'OK', style: 'cancel' }]);
    }
  };

  const handleVigil = async () => {
    if (buyingRef.current || requireAccount()) return;
    buyingRef.current = true;
    setBuying(true);
    analytics.purchaseStart(IAP_PRODUCT_IDS.vigil, persona);
    const result = await buyVigilSubscription();
    analytics.purchaseResult(IAP_PRODUCT_IDS.vigil, persona, result.ok, result.error);
    buyingRef.current = false;
    setBuying(false);
    if (result.ok) {
      analytics.vigilSubscribe();
      hapticSuccess();
      navigation.goBack();
    } else {
      const msg = purchaseErrorText(result.error);
      if (msg) Alert.alert(lang === 'en' ? 'Purchase failed' : '購買失敗', msg, [{ text: 'OK', style: 'cancel' }]);
    }
  };

  const handleRestore = async () => {
    if (buyingRef.current || requireAccount()) return;
    buyingRef.current = true;
    setBuying(true);
    analytics.purchaseStart('restore', persona);
    const result = await restorePurchases();
    analytics.purchaseResult('restore', persona, result.ok, result.error);
    buyingRef.current = false;
    setBuying(false);
    if (result.ok && result.restoredVigil) {
      analytics.vigilRestore();
      hapticSuccess();
      Alert.alert(
        lang === 'en' ? 'Purchases restored' : '購買已還原',
        lang === 'en' ? 'Your Vigil access will update in a few seconds.' : '守夜會員狀態會在幾秒內更新。',
      );
    } else {
      const errorText = result.error && result.error !== 'cancelled'
        ? purchaseErrorText(result.error)
        : '';
      Alert.alert(
        errorText
          ? (lang === 'en' ? 'Restore failed' : '還原失敗')
          : (lang === 'en' ? 'Nothing to restore' : '沒有可還原的購買'),
        errorText || (lang === 'en' ? 'No previous purchases found.' : '找不到之前的購買記錄。'),
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
            <View style={[styles.paymentPromise, { backgroundColor: p.accentSoft, borderColor: p.accent + '35' }]}>
              <Text style={[styles.paymentPromiseTitle, { color: p.accent }]}>
                {lang === 'en' ? 'THE SIMPLE RULE' : '只要記得這個規則'}
              </Text>
              <Text style={[styles.paymentPromiseBody, { color: p.inkSoft }]}>
                {guest
                  ? (lang === 'en'
                    ? 'Guest mode is browse-only. Create an account before purchasing so your entitlement can be recovered.'
                    : '訪客模式僅供瀏覽。購買前請先建立帳號，才能安全保存與還原權益。')
                  : (lang === 'en'
                    ? 'Ordinary talking is free. Payment never improves your visibility or puts you ahead of others.'
                    : '一般聊天免費；付費不會提高曝光，也不會讓你排到別人前面。')}
              </Text>
            </View>
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
                {!guest && gender === 'female'
                  ? (lang === 'en'
                    ? 'You already have unlimited 1-on-1 conversations. Vigil adds the Loft every night, 5 wicks/day, free rooms, and the ability to propose keeping each other.'
                    : '你本來就享有不限次一對一。守夜會員另外提供每晚夜閣、每日 5 芯、免費開火盆，以及主動提出「留下彼此」。')
                  : (lang === 'en'
                    ? 'Unlimited 1-on-1 conversations · Loft every night · 5 wicks/day · free rooms · may propose keeping each other'
                    : '不限次一對一 · 每晚夜閣 · 每日 5 芯 · 免費開火盆 · 可提出「留下彼此」')}
              </Text>
              {vigil ? (
                <>
                  <View style={[styles.vigilActive, { backgroundColor: p.accentSoft, borderColor: p.accent + '40' }]}>
                    <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 14, color: p.accent }}>
                      {lang === 'en' ? '✓ Active' : '✓ 已訂閱'}
                    </Text>
                  </View>
                  {/* Manage/cancel lives in the store — a subscription with no
                      visible way out reads as a trap (and violates Play policy). */}
                  <TouchableOpacity
                    onPress={() => Linking.openURL(
                      Platform.OS === 'android'
                        ? `https://play.google.com/store/account/subscriptions?sku=${IAP_PRODUCT_IDS.vigil}&package=com.thirties.social`
                        : 'https://apps.apple.com/account/subscriptions',
                    ).catch(() => {})}
                    style={{ alignItems: 'center', paddingTop: 12 }}>
                    <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 13, color: p.muted }}>
                      {lang === 'en' ? 'Manage or cancel subscription →' : '管理／取消訂閱 →'}
                    </Text>
                  </TouchableOpacity>
                </>
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
            <GlassCard p={p} padding={18} radius={20} style={{ marginTop: 12 }}>
              <View style={{ gap: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 16, color: p.ink }}>
                    {t('tierFree', lang)}
                  </Text>
                  <Text style={{ fontFamily: 'EBGaramond-Italic', fontSize: 11, color: p.muted, marginTop: 2 }}>
                    {lang === 'en' ? 'current plan' : '目前方案'}
                  </Text>
                </View>
                <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 12.5, lineHeight: 20, color: p.muted }}>
                  {lang === 'en'
                    ? '10 free 1-on-1s/day · Loft weekly · 2 wicks/day'
                    : '每日 10 次免費一對一 · 每週夜閣 1 次 · 每日 2 芯'}
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

          {/* Wick rules — the SINGLE source of truth (W1-4, fixes P5). Always
              visible, not buried in a toggle: every other screen must agree with
              this and nothing else may state a different rule. */}
          <FadeInUp delay={700} distance={10}>
            <View style={{ marginTop: 28 }}>
              <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 18, lineHeight: 27, color: p.ink, fontWeight: '500' }}>
                {t('wickRulesTitle', lang)}
              </Text>
              <Text style={[styles.blurb, { color: p.muted, marginTop: 4, marginBottom: 14 }]}>
                {t('wickRulesLead', lang)}
              </Text>

              {([
                { badge: (!guest && gender === 'female') ? (lang === 'en' ? 'free' : '免費') : null,
                  title: 'wickRuleInvite', sub: (!guest && gender === 'female') ? 'wickRuleInviteSubF' : 'wickRuleInviteSubM' },
                { badge: '2', title: 'wickRuleExtend', sub: 'wickRuleExtendSub' },
                { badge: '3', title: 'wickRuleReunion', sub: 'wickRuleReunionSub' },
              ] as const).map((r, i) => (
                <View key={i} style={[styles.wickRuleRow, { backgroundColor: p.accentSoft, borderColor: p.accent + '48' }]}>
                  <View style={styles.wickRuleBadge}>
                    {r.badge === '免費' || r.badge === 'free'
                      ? <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 12, fontWeight: '600', color: '#8fbf8f' }}>{r.badge}</Text>
                      : <>
                          <Text style={{ fontFamily: 'Inter-Regular', fontSize: 19, fontWeight: '600', color: p.accent }}>{r.badge}</Text>
                          <WickGlyph size={12} color={p.accent} />
                        </>}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 15, color: p.ink, fontWeight: '500' }}>{t(r.title, lang)}</Text>
                    <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 11.5, lineHeight: 18, color: p.muted, marginTop: 2 }}>{t(r.sub, lang)}</Text>
                  </View>
                </View>
              ))}

              {/* Always free */}
              <View style={[styles.wickListCard, { borderColor: '#8fbf8f4d', backgroundColor: 'rgba(143,191,143,0.07)' }]}>
                <Text style={{ fontFamily: 'Inter-Regular', fontSize: 9.5, letterSpacing: 1.7, textTransform: 'uppercase', color: '#8fbf8f', fontWeight: '600', marginBottom: 5 }}>
                  {t('wickFreeTitle', lang)}
                </Text>
                <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 12.5, lineHeight: 20, color: p.inkSoft }}>{t('wickFreeList', lang)}</Text>
              </View>

              {/* What wicks can't buy */}
              <View style={[styles.wickListCard, { borderColor: p.danger + '44', backgroundColor: p.danger + '10' }]}>
                <Text style={{ fontFamily: 'Inter-Regular', fontSize: 9.5, letterSpacing: 1.7, textTransform: 'uppercase', color: p.danger, fontWeight: '600', marginBottom: 5 }}>
                  {t('wickCantTitle', lang)}
                </Text>
                <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 12.5, lineHeight: 20, color: p.inkSoft }}>{t('wickCantList', lang)}</Text>
              </View>
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
  paymentPromise:{ marginTop: 16, padding: 14, borderRadius: 16, borderWidth: 0.7 },
  paymentPromiseTitle:{ fontFamily: 'Inter-Regular', fontSize: 9.5, letterSpacing: 1.5, fontWeight: '600' },
  paymentPromiseBody:{ fontFamily: 'NotoSerifTC-Regular', fontSize: 12.5, lineHeight: 20, marginTop: 5 },
  vigilBtn:     { height: 52, borderRadius: 999, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  vigilActive:  { height: 44, borderRadius: 999, alignItems: 'center', justifyContent: 'center', marginTop: 16, borderWidth: 0.5 },
  packRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 18, borderWidth: 0.5, marginBottom: 10 },
  wickRuleRow:  { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 16, borderWidth: 0.7, marginBottom: 8 },
  wickRuleBadge:{ width: 40, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 2 },
  wickListCard: { marginTop: 8, padding: 14, borderRadius: 16, borderWidth: 0.7 },
});
