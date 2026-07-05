import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, Image, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import { DIRECTIONS } from '../lib/theme';
import { VaporBackground, GlassCard, Cap, WickGlyph, PhotoVeil, FadeInUp, ScreenHeader } from '../components/ui';
import { Identity } from '../components/identity/Identity';
import { ColorAdjLabel } from '../components/identity/Identity';
import { useAppStore, setIdentityKind, getAvailableIdentityKinds, setLoftVisible, getTier } from '../hooks/useAppStore';
import { COLOR_NAMES_ZH, COLOR_NAMES_EN, ADJ_ZH, ADJ_EN, IdentityKind, getLoftName } from '../lib/identity';
import { pickImage, uploadAlbumPhoto } from '../lib/photos';
import { getAlbum, addAlbumPhoto, removeAlbumPhoto, AlbumPhoto, fetchMyBonds, removeBond, DbBond, createConversation, getCurrentUid } from '../lib/db';
import { getDiaryEntries, removeDiaryEntry, DiaryEntry } from '../lib/diary';
import { getColorAdj } from '../lib/identity';

type Props = NativeStackScreenProps<RootStackParamList, 'Profile'>;

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

const SHAPE_MAP: Record<string, { zh: string; en: string }> = {
  sexless:               { zh: '無性了',         en: 'sexless' },
  roommates:             { zh: '喪偶式',         en: 'like roommates' },
  'love-lonely':         { zh: '還有愛但寂寞',   en: 'love remains, lonely' },
  'post-honeymoon':      { zh: '熱戀期過了',     en: 'past the honeymoon' },
  'considering-leaving': { zh: '正在想要不要離開', en: 'thinking of leaving' },
  unclear:               { zh: '說不清',         en: 'hard to say' },
};

const FREETIME_MAP: Record<string, { zh: string; en: string }> = {
  'late-night':   { zh: '深夜',     en: 'late night' },
  afternoon:      { zh: '午後',     en: 'afternoons' },
  'office-hours': { zh: '上班時間', en: 'office hours' },
  'in-between':   { zh: '碎片時間', en: 'in-between' },
};

export default function ProfileScreen({ navigation }: Props) {
  const {
    direction, lang, identityKind, seed, wicks, vigil,
    gender, ageBracket, relationshipStatus, relationshipShape, seeking, boundary, freeTimes, region, quote, loftVisible,
  } = useAppStore();
  const p = DIRECTIONS[direction];
  const [album, setAlbum] = useState<AlbumPhoto[]>([]);
  const [uploading, setUploading] = useState(false);
  const [diary, setDiary] = useState<DiaryEntry[]>([]);
  const [diaryExpanded, setDiaryExpanded] = useState(false);
  const [bonds, setBonds] = useState<DbBond[]>([]);
  const [openingBond, setOpeningBond] = useState<string | null>(null);
  useEffect(() => { getAlbum().then(setAlbum); getDiaryEntries().then(setDiary); fetchMyBonds().then(setBonds); }, []);

  const openBondChat = async (bond: DbBond) => {
    if (openingBond) return;
    const uid = getCurrentUid();
    const otherId = bond.users.find(u => u !== uid);
    if (!otherId) return;
    setOpeningBond(bond.id);
    const conv = await createConversation({ userBId: otherId });
    setOpeningBond(null);
    if (conv) {
      navigation.push('Chat', {
        otherSeed: bond.seeds?.[otherId] ?? otherId,
        conversationId: conv.id,
        matchCharge: true, // a bond chat still counts as a connection (quota/wick rules apply)
      } as any);
    } else {
      Alert.alert(lang === 'en' ? 'Could not open' : '暫時打不開', lang === 'en' ? 'Please try again.' : '請再試一次。');
    }
  };

  const confirmRemoveBond = (bond: DbBond) => {
    Alert.alert(
      lang === 'en' ? 'Let them go?' : '放下這個人？',
      lang === 'en' ? 'They will no longer appear here.' : '之後就不會再出現在這裡了。',
      [
        { text: lang === 'en' ? 'Keep' : '留著', style: 'cancel' },
        { text: lang === 'en' ? 'Let go' : '放下', style: 'destructive', onPress: async () => {
          setBonds(bs => bs.filter(b => b.id !== bond.id));
          await removeBond(bond.id);
        } },
      ],
    );
  };

  const deleteDiaryEntry = (entry: DiaryEntry) => {
    Alert.alert(
      lang === 'en' ? 'Remove this note?' : '刪除這段話？',
      lang === 'en' ? 'It will be gone for good.' : '刪了就找不回來了。',
      [
        { text: lang === 'en' ? 'Keep' : '留著', style: 'cancel' },
        { text: lang === 'en' ? 'Remove' : '刪除', style: 'destructive', onPress: async () => {
          setDiary(d => d.filter(e => e.id !== entry.id));
          await removeDiaryEntry(entry.id);
        } },
      ],
    );
  };

  const diaryDate = (ms: number) => {
    const d = new Date(ms);
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const ALBUM_MAX = 6;
  const addPhoto = async () => {
    if (uploading || album.length >= ALBUM_MAX) return;
    // Guests can browse but not build a profile — nudge them to create an account.
    if (getTier() === 'guest') {
      Alert.alert(
        lang === 'en' ? 'Create an account first' : '先建立帳號',
        lang === 'en' ? 'Sign up to add photos to your profile.' : '建立帳號後才能在個人檔案加入照片。',
        [
          { text: lang === 'en' ? 'Not now' : '再看看', style: 'cancel' },
          { text: lang === 'en' ? 'Create account' : '建立帳號', onPress: () => navigation.push('Auth', { mode: 'register' }) },
        ],
      );
      return;
    }
    const uri = await pickImage();
    if (!uri) return;
    setUploading(true);
    const up = await uploadAlbumPhoto(uri);
    setUploading(false);
    if (up && (await addAlbumPhoto(up))) {
      setAlbum(a => [...a, up]);
    } else {
      Alert.alert(lang === 'en' ? 'Upload failed' : '上傳失敗', lang === 'en' ? 'Please try again.' : '請再試一次。');
    }
  };

  const removePhoto = (photo: AlbumPhoto) => {
    Alert.alert(
      lang === 'en' ? 'Remove this photo?' : '移除這張照片？',
      lang === 'en' ? 'It will be deleted permanently.' : '會永久刪除。',
      [
        { text: lang === 'en' ? 'Cancel' : '取消', style: 'cancel' },
        { text: lang === 'en' ? 'Remove' : '移除', style: 'destructive', onPress: async () => {
          setAlbum(a => a.filter(x => x.publicId !== photo.publicId));
          await removeAlbumPhoto(photo);
        } },
      ],
    );
  };

  const statusLabel = relationshipStatus && STATUS_MAP[relationshipStatus]
    ? (lang === 'en' ? STATUS_MAP[relationshipStatus].en : STATUS_MAP[relationshipStatus].zh)
    : (lang === 'en' ? 'not set' : '未設定');
  const seekingLabels = seeking.map(s =>
    SEEKING_MAP[s] ? (lang === 'en' ? SEEKING_MAP[s].en : SEEKING_MAP[s].zh) : s
  );
  const boundaryLabel = boundary && BOUNDARY_MAP[boundary]
    ? (lang === 'en' ? BOUNDARY_MAP[boundary].en : BOUNDARY_MAP[boundary].zh)
    : null;
  const shapeLabel = relationshipShape && SHAPE_MAP[relationshipShape]
    ? (lang === 'en' ? SHAPE_MAP[relationshipShape].en : SHAPE_MAP[relationshipShape].zh)
    : null;
  const freeTimeLabels = (freeTimes ?? []).map(f =>
    FREETIME_MAP[f] ? (lang === 'en' ? FREETIME_MAP[f].en : FREETIME_MAP[f].zh) : f
  );

  // The Loft now shows an auto-generated poetic name (seed-based, changes nightly);
  // this is the real name others see, so the profile shows it read-only.
  const loftName = getLoftName(seed, lang);

  return (
    <VaporBackground p={p} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Top bar */}
          <FadeInUp delay={0} distance={6}>
            <ScreenHeader p={p} onBack={() => navigation.goBack()}
              title={lang === 'en' ? 'My page' : '我的頁面'}
              right={
                <TouchableOpacity onPress={() => navigation.push('Settings')}
                  style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: p.surface, borderWidth: 0.5, borderColor: p.line, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: p.muted, fontSize: 15 }}>⚙</Text>
                </TouchableOpacity>
              }
            />
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
              seedForPreview={seed}
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
              style={{ width: 40, height: 24, borderRadius: 24, backgroundColor: loftVisible ? '#e8a557' : 'rgba(245,226,196,0.2)', justifyContent: 'center' }}
              activeOpacity={0.8}>
              <View style={{ position: 'absolute', left: loftVisible ? 18 : 2, top: 2, width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff' }} />
            </TouchableOpacity>
          </View>
          </FadeInUp>

          {/* 熟人 — the people you both chose to keep (Vigil bond feature). */}
          {bonds.length > 0 && (
            <FadeInUp delay={300} distance={10}>
              <View style={styles.profileSection}>
                <Cap p={p} style={{ marginBottom: 10 }}>{lang === 'en' ? 'Kept · 熟人' : '熟人 · Kept'}</Cap>
                <GlassCard p={p} padding={12} radius={18}>
                  {bonds.map((bond, i) => {
                    const uid = getCurrentUid();
                    const otherId = bond.users.find(u => u !== uid) ?? '';
                    const otherSeed = bond.seeds?.[otherId] ?? otherId;
                    const label = getColorAdj(otherSeed, lang).label;
                    return (
                      <TouchableOpacity key={bond.id}
                        onPress={() => openBondChat(bond)}
                        onLongPress={() => confirmRemoveBond(bond)}
                        delayLongPress={500}
                        disabled={openingBond === bond.id}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 6,
                                 borderTopWidth: i > 0 ? 0.5 : 0, borderTopColor: p.line, opacity: openingBond === bond.id ? 0.5 : 1 }}>
                        <Identity kind={identityKind} seed={otherSeed} size={36} palette={p} lang={lang} trust={0.35} />
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 14, color: p.ink }}>{label}</Text>
                          <Text style={{ fontFamily: 'EBGaramond-Italic', fontSize: 10.5, color: p.muted, marginTop: 1 }}>
                            {lang === 'en' ? 'kept each other' : '你們互相留下了彼此'}
                          </Text>
                        </View>
                        <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 12, color: p.accent }}>
                          {lang === 'en' ? 'talk →' : '說話 →'}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                  <Text style={{ fontFamily: 'EBGaramond-Italic', fontSize: 10.5, color: p.muted, marginTop: 6, textAlign: 'center' }}>
                    {lang === 'en' ? 'long-press to let go' : '長按可放下'}
                  </Text>
                </GlassCard>
              </View>
            </FadeInUp>
          )}

          {/* Diary */}
          <FadeInUp delay={320} distance={10}>
            <View style={styles.profileSection}>
            <Cap p={p} style={{ marginBottom: 10 }}>{lang === 'en' ? 'Diary · 日記' : '日記 · Diary'}</Cap>
            {diary.length === 0 ? (
              <GlassCard p={p} padding={20} radius={18}>
                <Text style={{ fontFamily: lang === 'en' ? 'EBGaramond-Italic' : 'NotoSerifTC-Regular', fontSize: 13, color: p.muted, textAlign: 'center', lineHeight: 22 }}>
                  {lang === 'en'
                    ? 'What you write before matching is kept here — only on this device, only for you.'
                    : '你配對前寫下的心情會留在這裡。只存在這台裝置上，只有你看得到。'}
                </Text>
              </GlassCard>
            ) : (
              <GlassCard p={p} padding={16} radius={18}>
                {(diaryExpanded ? diary : diary.slice(0, 3)).map((e, i) => (
                  <TouchableOpacity key={e.id} onLongPress={() => deleteDiaryEntry(e)} delayLongPress={500} activeOpacity={0.85}
                    style={{ paddingVertical: 10, borderTopWidth: i > 0 ? 0.5 : 0, borderTopColor: p.line }}>
                    <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 14, color: p.ink, lineHeight: 24 }}>
                      {e.content}
                    </Text>
                    <Text style={{ fontFamily: 'Inter-Regular', fontSize: 10, color: p.muted, marginTop: 4 }}>
                      {diaryDate(e.createdAt)}
                    </Text>
                  </TouchableOpacity>
                ))}
                {diary.length > 3 && (
                  <TouchableOpacity onPress={() => setDiaryExpanded(x => !x)} style={{ alignItems: 'center', paddingTop: 10 }}>
                    <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 12, color: p.accent }}>
                      {diaryExpanded
                        ? (lang === 'en' ? 'collapse' : '收起')
                        : (lang === 'en' ? `${diary.length - 3} more…` : `還有 ${diary.length - 3} 則⋯`)}
                    </Text>
                  </TouchableOpacity>
                )}
                <Text style={{ fontFamily: 'EBGaramond-Italic', fontSize: 10.5, color: p.muted, marginTop: 8, textAlign: 'center' }}>
                  {lang === 'en' ? 'long-press to remove · never leaves this device' : '長按可刪除 · 永遠不會離開這台裝置'}
                </Text>
              </GlassCard>
            )}
          </View>
          </FadeInUp>

          {/* Photos */}
          <FadeInUp delay={400} distance={10}>
            <View style={styles.profileSection}>
            <Cap p={p} style={{ marginBottom: 10 }}>{lang === 'en' ? 'Photos · 相簿' : '相簿 · Photos'}</Cap>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {album.map(photo => (
                <TouchableOpacity key={photo.publicId} onLongPress={() => removePhoto(photo)} activeOpacity={0.85}>
                  <Image source={{ uri: photo.url }} style={{ width: 100, height: 100, borderRadius: 12, backgroundColor: p.glass }} />
                </TouchableOpacity>
              ))}
              {album.length < ALBUM_MAX && (
                <TouchableOpacity onPress={addPhoto} disabled={uploading}
                  style={{ width: 100, height: 100, borderRadius: 12, borderWidth: 1, borderColor: p.line, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', backgroundColor: p.glass }}>
                  {uploading ? <ActivityIndicator color={p.accent} /> : <Text style={{ fontSize: 28, color: p.muted }}>＋</Text>}
                </TouchableOpacity>
              )}
            </View>
            <Text style={{ fontFamily: 'EBGaramond-Italic', fontSize: 11, color: p.muted, marginTop: 8 }}>
              {lang === 'en' ? 'Long-press to remove · veiled in the Loft' : '長按可移除 · 在夜閣裡以紗罩呈現'}
            </Text>
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
              {shapeLabel && (
                <View style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, backgroundColor: p.accentSoft, borderWidth: 0.5, borderColor: p.accent + '40' }}>
                  <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 13, color: p.ink }}>{shapeLabel}</Text>
                </View>
              )}
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
            {freeTimeLabels.length > 0 && (
              <View style={{ marginTop: 12 }}>
                <Text style={{ fontFamily: 'Inter-Regular', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: p.muted, marginBottom: 8 }}>
                  {lang === 'en' ? 'Usually free' : '通常有空'}
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {freeTimeLabels.map(it => (
                    <View key={it} style={{ paddingVertical: 7, paddingHorizontal: 13, borderRadius: 999, backgroundColor: p.surface, borderWidth: 0.5, borderColor: p.line }}>
                      <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 12.5, color: p.ink }}>{it}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
          </FadeInUp>

          <FadeInUp delay={640} distance={8}>
            <Text style={[styles.footer, { color: p.muted }]}>
            {lang === 'en'
              ? 'Your page is invisible in the Park. Only the Loft can see it — and only what you allow.'
              : '火盆裡沒有人看得到你的頁面。只有夜閣看得到——而且只有你允許的部分。'}
          </Text>
          </FadeInUp>
        </ScrollView>
      </SafeAreaView>
    </VaporBackground>
  );
}

const KIND_LABELS: Record<IdentityKind, { zh: string; en: string }> = {
  sigil:         { zh: '符印',   en: 'Sigil' },
  silhouette:    { zh: '剪影',   en: 'Silhouette' },
  'color+adj':   { zh: '色彩名', en: 'Color Name' },
  character:     { zh: '文字',   en: 'Character' },
  text:          { zh: '代號',   en: 'Text Code' },
  flame:         { zh: '燭火',   en: 'Flame' },
  constellation: { zh: '星圖',   en: 'Stars' },
};

const ALL_KINDS: IdentityKind[] = ['sigil', 'silhouette', 'color+adj', 'character', 'text', 'flame', 'constellation'];

function IdentityKindPicker({ current, vigil, lang, p, onSelect, onUpgrade, seedForPreview }: {
  current: IdentityKind; vigil: boolean; lang: string; p: any;
  onSelect: (k: IdentityKind) => void; onUpgrade: () => void; seedForPreview: string;
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
      {/* Each chip carries a live mini-preview of the style, so choosing one is
          a visible act — the old text-only chips made selection feel broken
          (especially when the current style was already selected). */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {ALL_KINDS.map(kind => {
            const unlocked = available.includes(kind);
            const selected = current === kind;
            const label = KIND_LABELS[kind];
            return (
              <TouchableOpacity
                key={kind}
                onPress={() => unlocked ? onSelect(kind) : onUpgrade()}
                style={{
                  alignItems: 'center', gap: 6,
                  paddingVertical: 10, paddingHorizontal: 12, borderRadius: 16,
                  backgroundColor: selected ? p.accentSoft : p.surface,
                  borderWidth: selected ? 1.5 : 0.5,
                  borderColor: selected ? p.accent : p.line,
                  opacity: unlocked ? 1 : 0.45,
                  minWidth: 68,
                }}>
                <Identity kind={kind} seed={seedForPreview} size={34} palette={p} lang={lang as any} trust={0.3} />
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  {!unlocked && <Text style={{ fontSize: 9 }}>🔒</Text>}
                  <Text style={{
                    fontFamily: 'NotoSerifTC-Regular', fontSize: 11,
                    color: selected ? p.accent : p.ink,
                    fontWeight: selected ? '600' : '400',
                  }}>
                    {lang === 'en' ? label.en : label.zh}
                  </Text>
                </View>
                {selected && (
                  <Text style={{ fontFamily: 'Inter-Regular', fontSize: 8, color: p.accent, marginTop: -2 }}>
                    {lang === 'en' ? 'in use' : '使用中'}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll:          { padding: 22, paddingBottom: 48, width: '100%', maxWidth: 560, alignSelf: 'center' },
  topBar:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 20 },
  backBtn:         { width: 36, height: 36, borderRadius: 18, borderWidth: 0.5, alignItems: 'center', justifyContent: 'center' },
  nightNameBox:    { marginTop: 16, padding: 16, borderRadius: 16, borderWidth: 0.5 },
  loftToggle:      { marginTop: 10, padding: 14, borderRadius: 14, borderWidth: 0.5, flexDirection: 'row', alignItems: 'center', gap: 12 },
  profileSection:  { marginTop: 22 },
  diaryRow:        { padding: 13, flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  footer:          { fontFamily: 'EBGaramond-Italic', fontSize: 11, textAlign: 'center', opacity: 0.7, lineHeight: 20, marginTop: 24 },
});
