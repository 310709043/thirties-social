import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView, Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import { DIRECTIONS } from '../lib/theme';
import { t, tAlt } from '../lib/copy';
import { VaporBackground, GlassCard, Cap, Toggle } from '../components/ui';
import { Identity } from '../components/identity/Identity';
import { ColorAdjLabel } from '../components/identity/Identity';
import { useAppStore, setLang, resetAll } from '../hooks/useAppStore';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

export default function SettingsScreen({ navigation }: Props) {
  const { direction, lang, identityKind, seed } = useAppStore();
  const p = DIRECTIONS[direction];
  const zh = lang !== 'en';
  const [autoFilter, setAutoFilter] = useState(true);
  const [slowMode, setSlowMode] = useState(false);

  // Restore persisted preferences
  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem('pref_auto_filter'),
      AsyncStorage.getItem('pref_slow_mode'),
    ]).then(([af, sm]) => {
      if (af !== null) setAutoFilter(af !== '0');
      if (sm !== null) setSlowMode(sm === '1');
    });
  }, []);

  const toggleAutoFilter = () => {
    const next = !autoFilter;
    setAutoFilter(next);
    AsyncStorage.setItem('pref_auto_filter', next ? '1' : '0');
  };
  const toggleSlowMode = () => {
    const next = !slowMode;
    setSlowMode(next);
    AsyncStorage.setItem('pref_slow_mode', next ? '1' : '0');
  };

  const showAbout = () => {
    Alert.alert(
      zh ? '關於 第卅者' : 'About',
      zh
        ? '第卅者 v1.0\n\n一個匿名情緒社交空間。不需要帳號，不留下紀錄，對話會消散。\n\n你的身分綁定這台裝置，解除安裝即等同離開。'
        : '第卅者 v1.0\n\nAn anonymous space for what weighs on you. No accounts, no records, conversations dissolve.\n\nYour identity is bound to this device; uninstalling means leaving.',
    );
  };

  const confirmLeave = () => {
    Alert.alert(
      zh ? '離開這裡' : 'Leave',
      zh
        ? '會清除這台裝置上的所有資料（燭芯、日記、夜名、設定），且無法復原。確定嗎？'
        : 'This wipes everything on this device — wicks, diary, night name, settings. It cannot be undone. Sure?',
      [
        { text: zh ? '留下來' : 'Stay', style: 'cancel' },
        {
          text: zh ? '離開' : 'Leave', style: 'destructive',
          onPress: async () => { await resetAll(); },
        },
      ],
    );
  };

  return (
    <VaporBackground p={p} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Top bar */}
          <View style={styles.topBar}>
            <TouchableOpacity onPress={() => navigation.goBack()}
              style={[styles.backBtn, { backgroundColor: p.surface, borderColor: p.line }]}>
              <Text style={{ color: p.muted, fontSize: 18 }}>‹</Text>
            </TouchableOpacity>
            <Cap p={p}>{t('setTitle', lang)} · {tAlt('setTitle', lang)}</Cap>
          </View>

          {/* Identity card */}
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

          {/* Privacy section */}
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

          {/* Conversation section */}
          <View style={styles.section}>
            <SectionHeader lang={lang} zh="對話" en="Conversation" p={p} />
            <GlassCard p={p} padding={0} radius={20}>
              <SettingRow p={p}
                title={lang === 'en' ? 'Auto-filter abusive language' : '自動過濾辱罵言詞'}
                alt={lang === 'en' ? '自動過濾辱罵言詞' : 'Auto-filter abusive language'}
                sub={lang === 'en' ? 'On-device. We never see your conversation.' : '在裝置上完成。我們不會看到你的對話。'}
                control={<Toggle p={p} on={autoFilter} onToggle={toggleAutoFilter} />}
              />
              <RowDivider p={p} />
              <SettingRow p={p}
                title={lang === 'en' ? 'Slow mode after 22:00' : '夜間 22 點後緩衝模式'}
                alt={lang === 'en' ? '夜間 22 點後緩衝模式' : 'Slow mode after 22:00'}
                sub={lang === 'en' ? 'A pause before each message you send.' : '你按送出之前，給一個暫停。'}
                control={<Toggle p={p} on={slowMode} onToggle={toggleSlowMode} />}
              />
              <RowDivider p={p} />
              <SettingRow p={p}
                title={lang === 'en' ? 'Daily quiet limit' : '每日對話上限'}
                alt={lang === 'en' ? '每日對話上限' : 'Daily quiet limit'}
                sub={lang === 'en' ? '3 conversations per cycle.' : '每個 24 小時最多 3 段對話。'}
                control={<Text style={{ fontFamily: 'Inter-Regular', fontSize: 14, color: p.ink, fontWeight: '500' }}>3</Text>}
              />
            </GlassCard>
          </View>

          {/* Account section */}
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
                title={t('setAbout', lang)}
                alt={tAlt('setAbout', lang)}
                onPress={showAbout}
                control={<Text style={{ color: p.muted, fontSize: 18 }}>›</Text>}
              />
              <RowDivider p={p} />
              <SettingRow p={p}
                title={t('setLeave', lang)}
                alt={tAlt('setLeave', lang)}
                sub={lang === 'en' ? 'No traces remain. We hold no records.' : '不留下任何資料。我們本來就沒有保存。'}
                onPress={confirmLeave}
                danger
              />
            </GlassCard>
          </View>

          <Text style={[styles.footer, { color: p.muted }]}>
            {lang === 'en'
              ? '第卅者 — for those who are the third party to no one, only themselves.'
              : '第卅者 — 不為別人，只為自己當一次傾訴的對象。'}
          </Text>
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

function SettingRow({ p, title, alt, sub, control, danger, onPress }: any) {
  const Wrapper: any = onPress ? TouchableOpacity : View;
  return (
    <Wrapper onPress={onPress} activeOpacity={0.7}
      style={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
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
    </Wrapper>
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
