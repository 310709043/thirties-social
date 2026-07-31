import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import { DIRECTIONS } from '../lib/theme';
import { t, tAlt } from '../lib/copy';
import { VaporBackground, GlassCard, Cap, Toggle, Logo, FadeInUp, ScreenHeader } from '../components/ui';
import { Identity } from '../components/identity/Identity';
import { ColorAdjLabel } from '../components/identity/Identity';
import { useAppStore, setLang, setAutoFilter, setSlowMode } from '../hooks/useAppStore';
import { deleteAccount, getUser, getCurrentUid, unblockUser } from '../lib/db';
import { logout, isGuest } from '../lib/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

export default function SettingsScreen({ navigation }: Props) {
  const { direction, lang, identityKind, seed, autoFilter, slowMode, vigil, connectionsToday, gender } = useAppStore();
  const p = DIRECTIONS[direction];
  const guest = isGuest();
  const unlimitedChats = !guest && (vigil || gender === 'female');

  // Blocked list — blocking existed but there was NO way to see or undo it.
  const [blocked, setBlocked] = useState<string[]>([]);
  const [showBlocked, setShowBlocked] = useState(false);
  useEffect(() => {
    const uid = getCurrentUid();
    if (!uid) return;
    getUser(uid).then(u => { if (u) setBlocked(u.blockedUsers ?? []); });
  }, []);
  const handleUnblock = (targetId: string) => {
    Alert.alert(
      lang === 'en' ? 'Unblock this person?' : '解除封鎖？',
      lang === 'en'
        ? 'They may appear in the Loft and 1-on-1 suggestions again.'
        : '之後他們可能再次出現在夜閣與一對一建議裡。',
      [
        { text: lang === 'en' ? 'Keep blocked' : '維持封鎖', style: 'cancel' },
        { text: lang === 'en' ? 'Unblock' : '解除', style: 'destructive', onPress: async () => {
          setBlocked(b => b.filter(id => id !== targetId));
          await unblockUser(targetId);
        }},
      ],
    );
  };

  return (
    <VaporBackground p={p} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Top bar */}
          <FadeInUp delay={0} distance={6}>
            <ScreenHeader p={p} onBack={() => navigation.goBack()}
              title={t('setTitle', lang)} subtitle={tAlt('setTitle', lang)} />
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
                  sub={lang === 'en'
                    ? 'Everyone stays at layer 2 (a blurred outline) by design — a clearer you is only ever revealed inside a chat, veil by veil, with your consent.'
                    : '所有人固定停在第二層（模糊輪廓）——更清楚的你，只會在對話裡經你同意、一層一層揭開。'}
                  control={
                    <Text style={{ fontFamily: 'Inter-Regular', fontSize: 11, color: p.muted }}>
                      {lang === 'en' ? 'Level 2' : '第二層'}
                    </Text>
                  }
                />
                <RowDivider p={p} />
                <SettingRow p={p}
                  title={t('setExpiry', lang)}
                  alt={tAlt('setExpiry', lang)}
                  sub={t('setExpirySub', lang)}
                  control={
                    <Text style={{ fontFamily: 'Inter-Regular', fontSize: 11, color: p.muted }}>
                      {lang === 'en' ? 'Always on' : '永遠開啟'}
                    </Text>
                  }
                />
                <RowDivider p={p} />
                <SettingRow p={p}
                  title={t('setCycle', lang)}
                  alt={tAlt('setCycle', lang)}
                  sub={t('setCycleSub', lang)}
                  control={<Text style={{ fontFamily: 'Inter-Regular', fontSize: 12, color: p.muted }}>03:00</Text>}
                />
                <RowDivider p={p} />
                <SettingRow p={p}
                  title={lang === 'en' ? 'Blocked' : '封鎖名單'}
                  alt={lang === 'en' ? '封鎖名單' : 'Blocked'}
                  sub={blocked.length === 0
                    ? (lang === 'en' ? 'No one is blocked.' : '目前沒有封鎖任何人。')
                    : (lang === 'en'
                        ? `${blocked.length} blocked · they can't reach you anywhere`
                        : `已封鎖 ${blocked.length} 人 · 對方在任何地方都找不到你`)}
                  control={blocked.length > 0 ? (
                    <TouchableOpacity onPress={() => setShowBlocked(s => !s)}>
                      <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 13, color: p.accent }}>
                        {showBlocked ? (lang === 'en' ? 'hide' : '收起') : (lang === 'en' ? 'manage' : '管理')}
                      </Text>
                    </TouchableOpacity>
                  ) : undefined}
                />
                {showBlocked && blocked.map(id => (
                  <View key={id}>
                    <RowDivider p={p} />
                    <View style={{ padding: 14, paddingLeft: 18, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <Identity kind="sigil" seed={id} size={28} palette={p} lang={lang} trust={0.1} />
                      <View style={{ flex: 1 }}>
                        <ColorAdjLabel seed={id} lang={lang} palette={p} />
                        <Text style={{ fontFamily: 'EBGaramond-Italic', fontSize: 10.5, color: p.muted, marginTop: 1 }}>
                          {lang === 'en' ? 'anonymous · blocked' : '匿名 · 已封鎖'}
                        </Text>
                      </View>
                      <TouchableOpacity onPress={() => handleUnblock(id)}
                        style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 0.5, borderColor: p.line }}>
                        <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 12, color: p.muted }}>
                          {lang === 'en' ? 'unblock' : '解除'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
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
                  sub={lang === 'en'
                    ? 'Filtering runs on-device. Active messages still sync so the conversation works.'
                    : '過濾在裝置上執行；進行中的訊息仍會同步，讓雙方能正常對話。'}
                  control={<Toggle p={p} on={autoFilter} onToggle={() => setAutoFilter(!autoFilter)}
                    accessibilityLabel={lang === 'en' ? 'Auto-filter abusive language' : '自動過濾辱罵言詞'} />}

                />
                <RowDivider p={p} />
                <SettingRow p={p}
                  title={lang === 'en' ? 'Slow mode after 22:00' : '夜間 22 點後緩衝模式'}
                  alt={lang === 'en' ? '夜間 22 點後緩衝模式' : 'Slow mode after 22:00'}
                  sub={lang === 'en' ? 'A pause before each message you send.' : '你按送出之前，給一個暫停。'}
                  control={<Toggle p={p} on={slowMode} onToggle={() => setSlowMode(!slowMode)}
                    accessibilityLabel={lang === 'en' ? 'Slow mode after 22:00' : '夜間 22 點後緩衝模式'} />}

                />
                <RowDivider p={p} />
                <SettingRow p={p}
                  title={lang === 'en' ? 'Daily free 1-on-1s' : '每日免費一對一'}
                  alt={lang === 'en' ? '每日免費一對一' : 'Daily free 1-on-1s'}
                  sub={guest
                    ? (lang === 'en' ? 'Guest mode can browse. Create an account to start connecting.' : '訪客模式可瀏覽；建立帳號後才能開始連結。')
                    : gender === 'female'
                      ? (lang === 'en' ? 'Women have unlimited 1-on-1 connections with no connection charge.' : '女用戶一對一連結不限次，不扣燭芯。')
                      : vigil
                        ? (lang === 'en' ? 'Vigil includes unlimited 1-on-1 connections.' : '守夜會員享有不限次一對一連結。')
                        : (lang === 'en'
                          ? 'Up to 10 free 1-on-1 connections a day, then 1 wick each. Resets at 03:00.'
                          : '每天 10 段免費一對一，用完後每段 1 燭芯；03:00 重新計算。')}
                  control={
                    <Text style={{ fontFamily: 'Inter-Regular', fontSize: 14, color: p.ink, fontWeight: '500' }}>
                      {guest ? '—' : unlimitedChats ? '∞' : `${Math.min(connectionsToday, 10)}/10`}
                    </Text>
                  }
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
                      <Text style={{ color: p.muted, fontSize: 18 }}>›</Text>
                    </TouchableOpacity>
                  }
                />
                <RowDivider p={p} />
                <SettingRow p={p}
                  title={t('setAbout', lang)}
                  alt={tAlt('setAbout', lang)}
                  control={
                    <TouchableOpacity onPress={() => Alert.alert(
                      lang === 'en' ? 'About Candle Whisper' : '關於燭影私語',
                      lang === 'en'
                        ? 'Candle Whisper — in the late-night glow, what you whisper is heard.\n\nVersion 1.1.0 · Alpha build 21'
                        : '燭影私語 — 在深夜的微光裡，說出口的都有人懂。\n\n版本 1.1.0 · Alpha 測試版 21'
                    )}>
                      <Text style={{ color: p.muted, fontSize: 18 }}>›</Text>
                    </TouchableOpacity>
                  }
                />
                <RowDivider p={p} />
                <SettingRow p={p}
                  // A guest has no "account" to delete — for them this is
                  // "clear everything and start over", worded honestly.
                  title={guest
                    ? (lang === 'en' ? 'Clear guest data' : '清除訪客資料')
                    : t('setLeave', lang)}
                  alt={guest ? (lang === 'en' ? '清除訪客資料' : 'Clear guest data') : tAlt('setLeave', lang)}
                  sub={guest
                    ? (lang === 'en'
                        ? 'Wipes this guest session — wicks, subscription and history are gone for good. (Chats already vanish on their own.)'
                        : '清除這個訪客身分——燭芯、訂閱與歷史都會永久消失。（對話本來就會自行消散。）')
                    : (lang === 'en'
                        ? 'Your account and all data are permanently erased. Chats already vanish on their own when they end.'
                        : '帳號與所有資料將被永久刪除。對話本來就會在結束後自行消散。')}
                  danger
                  control={
                    <TouchableOpacity onPress={() => Alert.alert(
                      guest
                        ? (lang === 'en' ? 'Clear guest data' : '清除訪客資料')
                        : (lang === 'en' ? 'Delete Account' : '刪除帳號'),
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

          {/* Guests: offer to save their identity before anything is lost. */}
          {guest && (
            <FadeInUp delay={430} distance={10}>
              <TouchableOpacity
                onPress={() => navigation.push('Auth', { mode: 'register' })}
                style={[styles.saveAccountBtn, { backgroundColor: p.accentSoft, borderColor: p.accent + '40' }]}
              >
                <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 14, color: p.accent, textAlign: 'center' }}>
                  {lang === 'en' ? 'Create an account to save your data' : '建立帳號以保存資料'}
                </Text>
                <Text style={{ fontFamily: 'Inter-Regular', fontSize: 11, color: p.muted, textAlign: 'center', marginTop: 4 }}>
                  {lang === 'en'
                    ? 'As a guest, wicks, subscription and history are lost if you log out or reinstall.'
                    : '訪客身分下，登出或重裝會失去燭芯、訂閱與歷史記錄。'}
                </Text>
              </TouchableOpacity>
            </FadeInUp>
          )}

          {/* Logout — accounts only. A guest has nothing to sign out OF: showing
              the button just offered a confusing way to destroy their session.
              Guests get the "create an account" card above instead. */}
          {!guest && (
            <FadeInUp delay={450} distance={10}>
              <TouchableOpacity
                onPress={() => Alert.alert(
                  lang === 'en' ? 'Sign out' : '登出',
                  lang === 'en' ? 'Are you sure you want to sign out?' : '確定要登出嗎？',
                  [
                    { text: lang === 'en' ? 'Cancel' : '取消', style: 'cancel' },
                    { text: lang === 'en' ? 'Sign out' : '登出', style: 'destructive', onPress: async () => {
                      await logout();
                      await AsyncStorage.clear();
                      navigation.reset({ index: 0, routes: [{ name: 'Auth' }] });
                    }},
                  ]
                )}
                style={{ alignItems: 'center', paddingVertical: 14 }}
              >
                <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 15, color: p.accent }}>
                  {lang === 'en' ? 'Sign out' : '登出'}
                </Text>
              </TouchableOpacity>
            </FadeInUp>
          )}

          <FadeInUp delay={500} distance={8}>
            <View style={styles.footerWrap}>
              <View style={[styles.versionPill, { backgroundColor: p.accentSoft, borderColor: p.accent + '35' }]}>
                <Text style={[styles.versionText, { color: p.accent }]}>1.1.0 · ALPHA 21</Text>
              </View>
              <Text style={[styles.footer, { color: p.muted }]}>
                {lang === 'en'
                  ? 'Candle Whisper — in the late-night glow, what you whisper is heard.'
                  : '燭影私語 — 在深夜的微光裡，說出口的都有人懂。'}
              </Text>
            </View>
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
  scroll:  { padding: 22, paddingBottom: 48, width: '100%', maxWidth: 560, alignSelf: 'center' },
  saveAccountBtn: { paddingVertical: 14, paddingHorizontal: 16, borderRadius: 16, borderWidth: 0.5, marginTop: 8 },
  topBar:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 20 },
  backBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 0.5, alignItems: 'center', justifyContent: 'center' },
  section: { marginTop: 18 },
  footerWrap: { alignItems: 'center', marginTop: 20, gap: 9 },
  versionPill: { borderRadius: 999, borderWidth: 0.8, paddingHorizontal: 10, paddingVertical: 6 },
  versionText: { fontFamily: 'Inter-Regular', fontSize: 9, letterSpacing: 1.4, fontWeight: '600' },
  footer:  { fontFamily: 'EBGaramond-Italic', fontSize: 11, textAlign: 'center', opacity: 0.7, lineHeight: 20 },
});
