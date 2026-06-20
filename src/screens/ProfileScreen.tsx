import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import { DIRECTIONS } from '../lib/theme';
import { VaporBackground, GlassCard, Cap, WickGlyph, PhotoVeil, FadeInUp } from '../components/ui';
import { Identity } from '../components/identity/Identity';
import { ColorAdjLabel } from '../components/identity/Identity';
import { useAppStore, setIdentityKind, getAvailableIdentityKinds } from '../hooks/useAppStore';
import { COLOR_NAMES_ZH, COLOR_NAMES_EN, ADJ_ZH, ADJ_EN, IdentityKind, getLoftName } from '../lib/identity';

type Props = NativeStackScreenProps<RootStackParamList, 'Profile'>;

const DIARY = [
  { d: 'Mon', zh: '今天沒什麼特別的。', en: 'Nothing special today.' },
  { d: 'Tue', zh: '又夢到那個地方了。', en: 'Dreamt of that place again.' },
  { d: 'Wed', zh: '沉默有時候是一種溫柔。', en: 'Silence can be a kind of tenderness.' },
];

// Reverse-map DB slugs to display labels
const STATUS_MAP: Record<string, { zh: string; en: string }> = {
  dating:          { zh: '穩定交往中',     en: 'in a relationship' },
  cohabiting:      { zh: '同居',           en: 'cohabiting' },
  engaged:         { zh: '訂婚',           en: 'engaged' },
  married:         { zh: '已婚',           en: 'married' },
  separated:       { zh: '已婚·分居中',    en: 'married · separated' },
  'single-passing':{ zh: '偽單身',         en: 'single-passing' },
  open:            { zh: '開放關係',       en: 'open' },
  'seeing-married':{ zh: '對象是已婚的',   en: 'seeing someone married' },
  'single-ish':    { zh: '單身但說不清',   en: 'single-ish' },
};

const SEEKING_MAP: Record<string, { zh: string; en: string }> = {
  listener:         { zh: '一個樹洞',     en: 'someone to listen' },
  companion:        { zh: '情感陪伴',     en: 'companionship' },
  flirt:            { zh: '曖昧',         en: 'flirtation' },
  'online-intimacy':{ zh: '線上親密',     en: 'online intimacy' },
  'no-limits':      { zh: '不設限',       en: 'no limits' },
};

const BOUNDARY_MAP: Record<string, { zh: string; en: string }> = {
  'online-only': { zh: '只在線上', en: 'online only' },
  'maybe-meet':  { zh: '或許可以見面', en: 'maybe meet' },
  depends:       { zh: '看感覺', en: 'depends' },
};

export default function ProfileScreen({ navigation }: Props) {
  const {
    direction, lang, identityKind, seed, wicks, vigil,
    gender, ageBracket, relationshipStatus, seeking, boundary, region, quote,
  } = useAppStore();
  const p = DIRECTIONS[direction];
  const [loftVisible, setLoftVisible] = useState(true);
  const [colorIdx, setColorIdx] = useState(0);
  const [adjIdx, setAdjIdx] = useState(0);

  const statusLabel = relationshipStatus && STATUS_MAP[relationshipStatus]
    ? (lang === 'en' ? STATUS_MAP[relationshipStatus].en : STATUS_MAP[relationshipStatus].zh)
    : (lang === 'en' ? 'not set' : '未設定');
  const seekingLabels = seeking.map(s =>
    SEEKING_MAP[s] ? (lang === 'en' ? SEEKING_MAP[s].en : SEEKING_MAP[s].zh) : s
  );
  const boundaryLabel = boundary && BOUNDARY_MAP[boundary]
    ? (lang === 'en' ? BOUNDARY_MAP[boundary].en : BOUNDARY_MAP[boundary].zh)
    : null;

  const colors = lang === 'en' ? COLOR_NAMES_EN : COLOR_NAMES_ZH;
  const adjs = lang === 'en' ? ADJ_EN : ADJ_ZH;
  const nightName = lang === 'en' ? `${colors[colorIdx]} ${adjs[adjIdx]}` : `${colors[colorIdx]}的${adjs[adjIdx]}`;
  // The Loft now shows an auto-generated poetic name (seed-based, changes nightly);
  // this is the real name others see, so the profile shows it read-only.
  const loftName = getLoftName(seed, lang);

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
              <Cap p={p}>{lang === 'en' ? 'My page' : '我的頁面'}</Cap>
              <TouchableOpacity onPress={() => navigation.push('Settings')}
                style={[styles.backBtn, { backgroundColor: p.surface, borderColor: p.line }]}>
                <Text style={{ color: p.muted, fontSize: 14 }}>⚙</Text>
              </TouchableOpacity>
            </View>
          </FadeInUp>

          {/* Identity + wicks card */}
          <FadeInUp delay={80} distance={10}>
            <GlassCard p={p} padding={18} radius={24}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
              <Identity kind={identityKind} seed={seed} size={64} palette={p} lang={lang} trust={0.4} />
              <View style={{ flex: 1 }}>
                <ColorAdjLabel seed={seed} lang={lang} palette={p} />
                <Text style={{ fontFamily: lang === 'en' ? 'NotoSerifTC-Regular' : 'EBGaramond-Italic', fontSize: 11, color: p.muted, marginTop: 4 }}>
                  {lang === 'en' ? 'identity regenerates daily' : '識別每天重新生成'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => navigation.push('Upgrade')}
                style={{ alignItems: 'center', gap: 2, backgroundColor: p.accentSoft, borderWidth: 0.5, borderColor: p.accent + '40', borderRadius: 14, padding: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <WickGlyph size={12} color={p.accent} />
                  <Text style={{ fontFamily: 'Inter-Regular', fontSize: 18, color: p.accent, fontWeight: '500' }}>{wicks}</Text>
                </View>
                <Text style={{ fontFamily: 'Inter-Regular', fontSize: 8, letterSpacing: 1.5, textTransform: 'uppercase', color: p.muted }}>
                  {lang === 'en' ? 'buy more' : '購買'}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={{ marginTop: 14, paddingTop: 12, borderTopWidth: 0.5, borderTopColor: p.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 13, color: p.ink }}>
                {vigil ? (lang === 'en' ? 'Vigil member' : '守夜會員') : (lang === 'en' ? 'One Candle (free)' : '一根蠟燭（免費）')}
              </Text>
              <TouchableOpacity onPress={() => navigation.push('Upgrade')}>
                <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 12, color: p.accent }}>
                  {vigil ? (lang === 'en' ? 'manage' : '管理') : (lang === 'en' ? 'upgrade →' : '升級 →')}
                </Text>
              </TouchableOpacity>
            </View>
          </GlassCard>
          </FadeInUp>

          {/* Identity kind selector */}
          <FadeInUp delay={120} distance={10}>
            <IdentityKindPicker
              current={identityKind}
              vigil={vigil}
              lang={lang}
              p={p}
              onSelect={setIdentityKind}
              onUpgrade={() => navigation.push('Upgrade')}
            />
          </FadeInUp>

          {/* Night name composer (Loft) */}
          <FadeInUp delay={200} distance={10}>
            <View style={[styles.nightNameBox, { backgroundColor: 'rgba(45,22,28,0.9)', borderColor: 'rgba(232,165,87,0.3)' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 14, color: '#f5e2c4' }}>
                {lang === 'en' ? 'Night name · Loft only' : '夜名 · 僅夜閣使用'}
              </Text>
              <Text style={{ fontFamily: 'EBGaramond-Italic', fontSize: 11, color: 'rgba(245,226,196,0.55)' }}>
                {lang === 'en' ? 'changes each night' : '每晚自動換新'}
              </Text>
            </View>
            <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 24, color: '#e8a557', letterSpacing: 2, textAlign: 'center', marginTop: 12, marginBottom: 4 }}>
              {loftName}
            </Text>
            <Text style={{ fontFamily: 'EBGaramond-Italic', fontSize: 11, color: 'rgba(245,226,196,0.4)', textAlign: 'center' }}>
              {lang === 'en' ? 'This is how the Loft sees you tonight.' : '這是今晚夜閣裡別人看到的你。'}
            </Text>
          </View>
          </FadeInUp>

          {/* Loft visibility toggle */}
          <FadeInUp delay={240} distance={10}>
            <View style={[styles.loftToggle, { backgroundColor: 'rgba(45,22,28,0.7)', borderColor: 'rgba(232,165,87,0.3)' }]}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 14, color: '#f5e2c4' }}>
                {lang === 'en' ? 'Show my page in the Loft' : '在夜閣顯示我的頁面'}
              </Text>
              <Text style={{ fontFamily: 'EBGaramond-Italic', fontSize: 11, color: 'rgba(245,226,196,0.55)', marginTop: 2 }}>
                {lang === 'en' ? 'Visitors pay wicks to look' : '訪客看要付燭芯'}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setLoftVisible(!loftVisible)}
              style={{ width: 40, height: 24, borderRadius: 24, backgroundColor: loftVisible ? '#e8a557' : 'rgba(245,226,196,0.2)', justifyContent: 'center' }}>
              <View style={{ position: 'absolute', left: loftVisible ? 18 : 2, top: 2, width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff' }} />
            </TouchableOpacity>
          </View>
          </FadeInUp>

          {/* Diary */}
          <FadeInUp delay={320} distance={10}>
            <View style={styles.profileSection}>
            <Cap p={p} style={{ marginBottom: 10 }}>{lang === 'en' ? 'Diary · 日記' : '日記 · Diary'}</Cap>
            <GlassCard p={p} padding={0} radius={18}>
              {DIARY.map((d, i) => (
                <View key={i} style={[styles.diaryRow, i > 0 && { borderTopWidth: 0.5, borderTopColor: p.line }]}>
                  <Text style={{ fontFamily: 'EBGaramond-Italic', fontSize: 11, color: p.muted, flexShrink: 0 }}>{d.d}</Text>
                  <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 14, color: p.ink, lineHeight: 22, flex: 1 }}>
                    {lang === 'en' ? d.en : d.zh}
                  </Text>
                </View>
              ))}
            </GlassCard>
          </View>
          </FadeInUp>

          {/* Photos */}
          <FadeInUp delay={400} distance={10}>
            <View style={styles.profileSection}>
            <Cap p={p} style={{ marginBottom: 10 }}>{lang === 'en' ? 'Photos · 相簿' : '相簿 · Photos'}</Cap>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {[0, 1, 2].map(i => (
                <PhotoVeil key={i} p={p} liftLevel={4} size={100} lang={lang} />
              ))}
            </View>
          </View>
          </FadeInUp>

          {/* Quote */}
          <FadeInUp delay={480} distance={10}>
            <View style={styles.profileSection}>
            <Cap p={p} style={{ marginBottom: 10 }}>{lang === 'en' ? 'A line · 語錄' : '語錄 · A line'}</Cap>
            <View style={{ paddingLeft: 14, borderLeftWidth: 2, borderLeftColor: p.accent + '60' }}>
              <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 15, color: p.ink, lineHeight: 26 }}>
                {quote
                  ? `「${quote}」`
                  : (lang === 'en' ? 'No quote yet.' : '尚未留下語錄。')}
              </Text>
            </View>
          </View>
          </FadeInUp>

          {/* Status + interests */}
          <FadeInUp delay={560} distance={10}>
            <View style={styles.profileSection}>
            <Cap p={p} style={{ marginBottom: 10 }}>{lang === 'en' ? 'Status · Seeking' : '感情狀態 · 在找'}</Cap>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <View style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, backgroundColor: p.accent }}>
                <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 13, color: p.dark ? '#1f1014' : '#fbf5e4' }}>
                  {statusLabel}
                </Text>
              </View>
              {boundaryLabel && (
                <View style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, backgroundColor: p.accentSoft, borderWidth: 0.5, borderColor: p.accent + '40' }}>
                  <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 13, color: p.ink }}>{boundaryLabel}</Text>
                </View>
              )}
              {seekingLabels.map(it => (
                <View key={it} style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, backgroundColor: p.surface, borderWidth: 0.5, borderColor: p.line }}>
                  <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 13, color: p.ink }}>{it}</Text>
                </View>
              ))}
            </View>
          </View>
          </FadeInUp>

          <FadeInUp delay={640} distance={8}>
            <Text style={[styles.footer, { color: p.muted }]}>
            {lang === 'en'
              ? 'Your page is invisible in the Park. Only the Loft can see it — and only what you allow.'
              : '公園裡沒有人看得到你的頁面。只有夜閣看得到——而且只有你允許的部分。'}
          </Text>
          </FadeInUp>
        </ScrollView>
      </SafeAreaView>
    </VaporBackground>
  );
}

const KIND_LABELS: Record<IdentityKind, { zh: string; en: string }> = {
  sigil:       { zh: '符印',   en: 'Sigil' },
  silhouette:  { zh: '剪影',   en: 'Silhouette' },
  'color+adj': { zh: '色彩名', en: 'Color Name' },
  character:   { zh: '文字',   en: 'Character' },
  text:        { zh: '代號',   en: 'Text Code' },
};

const ALL_KINDS: IdentityKind[] = ['sigil', 'silhouette', 'color+adj', 'character', 'text'];

function IdentityKindPicker({ current, vigil, lang, p, onSelect, onUpgrade }: {
  current: IdentityKind; vigil: boolean; lang: string; p: any;
  onSelect: (k: IdentityKind) => void; onUpgrade: () => void;
}) {
  const available = getAvailableIdentityKinds();
  return (
    <View style={{ marginTop: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, paddingHorizontal: 4, paddingBottom: 8 }}>
        <Text style={{ fontFamily: 'Inter-Regular', fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: p.muted, fontWeight: '500' }}>
          {lang === 'en' ? 'IDENTITY STYLE' : '身份樣式'}
        </Text>
        <Text style={{ fontFamily: 'EBGaramond-Italic', fontSize: 11, color: p.muted, opacity: 0.6 }}>
          {lang === 'en' ? '身份樣式' : 'Identity Style'}
        </Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {ALL_KINDS.map(kind => {
            const unlocked = available.includes(kind);
            const selected = current === kind;
            const label = KIND_LABELS[kind];
            return (
              <TouchableOpacity
                key={kind}
                onPress={() => unlocked ? onSelect(kind) : onUpgrade()}
                style={{
                  paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999,
                  backgroundColor: selected ? p.accent : p.surface,
                  borderWidth: 0.5, borderColor: selected ? p.accent : p.line,
                  opacity: unlocked ? 1 : 0.5,
                  flexDirection: 'row', alignItems: 'center', gap: 4,
                }}>
                {!unlocked && <Text style={{ fontSize: 10 }}>🔒</Text>}
                <Text style={{
                  fontFamily: 'NotoSerifTC-Regular', fontSize: 12,
                  color: selected ? (p.dark ? '#1f1014' : '#fff') : p.ink,
                }}>
                  {lang === 'en' ? label.en : label.zh}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll:          { padding: 22, paddingBottom: 48 },
  topBar:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 20 },
  backBtn:         { width: 36, height: 36, borderRadius: 18, borderWidth: 0.5, alignItems: 'center', justifyContent: 'center' },
  nightNameBox:    { marginTop: 16, padding: 16, borderRadius: 16, borderWidth: 0.5 },
  loftToggle:      { marginTop: 10, padding: 14, borderRadius: 14, borderWidth: 0.5, flexDirection: 'row', alignItems: 'center', gap: 12 },
  profileSection:  { marginTop: 22 },
  diaryRow:        { padding: 13, flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  footer:          { fontFamily: 'EBGaramond-Italic', fontSize: 11, textAlign: 'center', opacity: 0.7, lineHeight: 20, marginTop: 24 },
});
