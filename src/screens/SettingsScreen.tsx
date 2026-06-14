import React from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import { DIRECTIONS } from '../lib/theme';
import { t, tAlt } from '../lib/copy';
import { VaporBackground, GlassCard, Cap, Toggle, Logo, FadeInUp } from '../components/ui';
import { Identity } from '../components/identity/Identity';
import { ColorAdjLabel } from '../components/identity/Identity';
import { useAppStore, setLang, setAutoFilter, setSlowMode } from '../hooks/useAppStore';
import { deleteAccount } from '../lib/db';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

export default function SettingsScreen({ navigation }: Props) {
  const { direction, lang, identityKind, seed, autoFilter, slowMode, vigil } = useAppStore();
  const p = DIRECTIONS[direction];

  return (
    <VaporBackground p={p} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Top bar */}
          <FadeInUp delay={0} distance={6}>
            <View style={styles.topBar}>
              <TouchableOpacity onPress={() => navigation.goBack()}
                style={[styles.backBtn, { backgroundColor: p.surface, borderColor: p.line }]}>
                <Text style={{ color: p.muted, fontSize: 18 }}>‹</Text>
              </TouchableOpacity>
              <Cap p={p}>{t('setTitle', lang)} · {tAlt('setTitle', lang)}</Cap>
            </View>
          </FadeInUp>

          {/* Logo */}
          <FadeInUp delay={60} distance={10}>
            <View style={{ alignItems: 'center', paddingBottom: 16 }}>
              <Logo size={56} showGlow={false} />
            </View>
          </FadeInUp>

          {/* Identity card */}
          <FadeInUp delay={120} distance={10}>
            <View style={{ paddingTop: 8 }}>
              <GlassCard p={p} padding={18} radius={24} style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                <Identity kind={identityKind} seed={seed} size={64} palette={p} lang={lang} trust={0.3} />
                <View style={{ flex: 1 }}>
                  <ColorAdjLabel seed={seed} lang={lang} palette={p} />
                  <Text style={{ fontFamily: lang === 'en' ? 'NotoSerifTC-Regular' : 'EBGaramond-Italic', fontSize: 11, color: p.muted, marginTop: 4 }}>
                    {t('setIdentitySub', lang)} · {tAlt('setIdentitySub', lang)}
                  </Text>
                </View>
              </GlassCard>
            </View>
          </FadeInUp>

          {/* Privacy section */}
          <FadeInUp delay={200} distance={10}>
            <View style={styles.section}>
              <SectionHeader lang={lang} zh="隱私" en="Privacy" p={p} />
              <GlassCard p={p} padding={0} radius={20}>
                <SettingRow p={p}
                  title={t('setVisibility', lang)}
                  alt={tAlt('setVisibility', lang)}
                  sub={t('setVisibilitySub', lang)}
                  control={
                    <View style={{ flexDirection: 'row', gap: 4 }}>
                      {[1, 2, 3, 4].map(i => (
                        <View key={i} style={{ width: 6, height: 18, borderRadius: 3, backgroundColor: i <= 2 ? p.accent : p.line }} />
                      ))}
                    </View>
                  }
                />
                <RowDivider p={p} />
                <SettingRow p={p}
                  title={t('setExpiry', lang)}
                  alt={tAlt('setExpiry', lang)}
                  sub={t('setExpirySub', lang)}
                  control={<Toggle p={p} on={true} />}
                />
                <RowDivider p={p} />
                <SettingRow p={p}
                  title={t('setCycle', lang)}
                  alt={tAlt('setCycle', lang)}
                  sub={t('setCycleSub', lang)}
                  control={<Text style={{ fontFamily: 'Inter-Regular', fontSize: 12, color: p.muted }}>03:00</Text>}
                />
              </GlassCard>
            </View>
          </FadeInUp>

          {/* Conversation section */}
          <FadeInUp delay={300} distance={10}>
            <View style={styles.section}>
              <SectionHeader lang={lang} zh="對話" en="Conversation" p={p} />
              <GlassCard p={p} padding={0} radius={20}>
                <SettingRow p={p}
                  title={lang === 'en' ? 'Auto-filter abusive language' : '自動過濾辱罵言詞'}
                  alt={lang === 'en' ? '自動過濾辱罵言詞' : 'Auto-filter abusive language'}
                  sub={lang === 'en' ? 'On-device. We never see your conversation.' : '在裝置上完成。我們不會看到你的對話。'}
                  control={<Toggle p={p} on={autoFilter} onToggle={() => setAutoFilter(!autoFilter)} />}

                />
                <RowDivider p={p} />
                <SettingRow p={p}
                  title={lang === 'en' ? 'Slow mode after 22:00' : '夜間 22 點後緩衝模式'}
                  alt={lang === 'en' ? '夜間 22 點後緩衝模式' : 'Slow mode after 22:00'}
                  sub={lang === 'en' ? 'A pause before each message you send.' : '你按送出之前，給一個暫停。'}
                  control={<Toggle p={p} on={slowMode} onToggle={() => setSlowMode(!slowMode)} />}

                />
                <RowDivider p={p} />
                <SettingRow p={p}
                  title={lang === 'en' ? 'Daily quiet limit' : '每日對話上限'}
                  alt={lang === 'en' ? '每日對話上限' : 'Daily quiet limit'}
                  sub={lang === 'en' ? '3 conversations per cycle.' : '每個 24 小時最多 3 段對話。'}
                  control={<Text style={{ fontFamily: 'Inter-Regular', fontSize: 14, color: p.ink, fontWeight: '500' }}>{vigil ? '∞' : '3'}</Text>}
                />
              </GlassCard>
            </View>
          </FadeInUp>

          {/* Account section */}
          <FadeInUp delay={400} distance={10}>
            <View style={styles.section}>
              <SectionHeader lang={lang} zh="帳戶" en="Account" p={p} />
              <GlassCard p={p} padding={0} radius={20}>
                <SettingRow p={p}
                  title={t('setLanguage', lang)}
                  alt={tAlt('setLanguage', lang)}
                  control={
                    <TouchableOpacity onPress={() => setLang(lang === 'en' ? 'zh' : 'en')}
                      style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: p.accentSoft }}>
                      <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 13, color: p.accent }}>
                        {lang === 'en' ? 'English → 中文' : '中文 → English'}
                      </Text>
                    </TouchableOpacity>
                  }
                />
                <RowDivider p={p} />
                <SettingRow p={p}
                  title={lang === 'en' ? 'Privacy Policy' : '\u96B1\u79C1\u6B0A\u653F\u7B56'}
                  alt={lang === 'en' ? '\u96B1\u79C1\u6B0A\u653F\u7B56' : 'Privacy Policy'}
                  control={
                    <TouchableOpacity onPress={() => Linking.openURL('https://thirties-landing.vercel.app/privacy')}>
                      <Text style={{ color: p.muted, fontSize: 18 }}>\u203A</Text>
                    </TouchableOpacity>
                  }
                />
                <RowDivider p={p} />
                <SettingRow p={p}
                  title={t('setAbout', lang)}
                  alt={tAlt('setAbout', lang)}
                  control={
                    <TouchableOpacity onPress={() => Alert.alert(
                      lang === 'en' ? 'About The Other' : '關於第卅者',
                      lang === 'en'
                        ? 'The Other — for those who are the third party to no one, only themselves.\n\nVersion 0.1.0'
                        : '第卅者 — 不為別人，只為自己當一次傾訴的對象。\n\n版本 0.1.0'
                    )}>
                      <Text style={{ color: p.muted, fontSize: 18 }}>›</Text>
                    </TouchableOpacity>
                  }
                />
                <RowDivider p={p} />
                <SettingRow p={p}
                  title={t('setLeave', lang)}
                  alt={tAlt('setLeave', lang)}
                  sub={lang === 'en' ? 'No traces remain. We hold no records.' : '不留下任何資料。我們本來就沒有保存。'}
                  danger
                  control={
                    <TouchableOpacity onPress={() => Alert.alert(
                      lang === 'en' ? 'Delete Account' : '刪除帳號',
                      lang === 'en'
                        ? 'This action cannot be undone. All your data will be permanently erased.'
                        : '此操作無法撤銷。您的所有資料將被永久刪除。',
                      [
                        { text: lang === 'en' ? 'Cancel' : '取消', style: 'cancel' },
                        { text: lang === 'en' ? 'Delete' : '刪除', style: 'destructive', onPress: async () => {
                          const result = await deleteAccount();
                          if (result.ok) {
                            await AsyncStorage.clear();
                            navigation.reset({ index: 0, routes: [{ name: 'Onboarding' }] });
                          } else {
                            Alert.alert('Error', result.error ?? 'Unknown error');
                          }
                        }},
                      ]
                    )}>
                      <Text style={{ color: p.danger, fontSize: 18 }}>›</Text>
                    </TouchableOpacity>
                  }
                />
              </GlassCard>
            </View>
          </FadeInUp>

          <FadeInUp delay={500} distance={8}>
            <Text style={[styles.footer, { color: p.muted }]}>
              {lang === 'en'
                ? '第卅者 — for those who are the third party to no one, only themselves.'
                : '第卅者 — 不為別人，只為自己當一次傾訴的對象。'}
            </Text>
          </FadeInUp>
        </ScrollView>
      </SafeAreaView>
    </VaporBackground>
  );
}

function SectionHeader({ lang, zh, en, p }: any) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, paddingBottom: 10, paddingHorizontal: 4 }}>
      <Text style={{ fontFamily: 'Inter-Regular', fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: p.muted, fontWeight: '500' }}>
        {lang === 'en' ? en : zh}
      </Text>
      <Text style={{ fontFamily: 'EBGaramond-Italic', fontSize: 11, color: p.muted, opacity: 0.6 }}>
        {lang === 'en' ? zh : en}
      </Text>
    </View>
  );
}

function SettingRow({ p, title, alt, sub, control, danger }: any) {
  return (
    <View style={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
          <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 15, color: danger ? p.danger : p.ink, fontWeight: '500' }}>
            {title}
          </Text>
          {alt && (
            <Text style={{ fontFamily: 'EBGaramond-Italic', fontSize: 11, color: p.muted, opacity: 0.6 }}>
              {alt}
            </Text>
          )}
        </View>
        {sub && (
          <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 12, color: p.muted, marginTop: 3, lineHeight: 18 }}>
            {sub}
          </Text>
        )}
      </View>
      {control}
    </View>
  );
}

function RowDivider({ p }: { p: any }) {
  return <View style={{ marginLeft: 16, height: 0.5, backgroundColor: p.line }} />;
}

const styles = StyleSheet.create({
  scroll:  { padding: 22, paddingBottom: 48 },
  topBar:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 20 },
  backBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 0.5, alignItems: 'center', justifyContent: 'center' },
  section: { marginTop: 18 },
  footer:  { fontFamily: 'EBGaramond-Italic', fontSize: 11, textAlign: 'center', opacity: 0.7, lineHeight: 20, marginTop: 20 },
});
