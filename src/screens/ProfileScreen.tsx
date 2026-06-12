import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, TextInput, StyleSheet, SafeAreaView, Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import { DIRECTIONS } from '../lib/theme';
import { VaporBackground, GlassCard, Cap, WickGlyph, PhotoVeil } from '../components/ui';
import { Identity } from '../components/identity/Identity';
import { ColorAdjLabel } from '../components/identity/Identity';
import { useAppStore } from '../hooks/useAppStore';
import { COLOR_NAMES_ZH, COLOR_NAMES_EN, ADJ_ZH, ADJ_EN } from '../lib/identity';
import { getUser, updateUser, getCurrentUid, DbUser } from '../lib/db';

type Props = NativeStackScreenProps<RootStackParamList, 'Profile'>;

const MAX_PHOTOS = 3;

interface DiaryEntry { d: string; text: string }

export default function ProfileScreen({ navigation }: Props) {
  const { direction, lang, identityKind, seed, wicks, vigil } = useAppStore();
  const p = DIRECTIONS[direction];
  const zh = lang !== 'en';

  const [dbUser, setDbUser] = useState<DbUser | null>(null);
  const [loftVisible, setLoftVisible] = useState(true);
  const [colorIdx, setColorIdx] = useState(0);
  const [adjIdx, setAdjIdx] = useState(0);
  const [customAdj, setCustomAdj] = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [diary, setDiary] = useState<DiaryEntry[]>([]);
  const [diaryDraft, setDiaryDraft] = useState('');

  // Load saved state: user doc + local photos/diary
  useEffect(() => {
    const uid = getCurrentUid();
    if (uid) {
      getUser(uid).then(u => {
        if (!u) return;
        setDbUser(u);
        setLoftVisible(u.loftVisible ?? true);
        setColorIdx(u.nightColorIdx ?? 0);
        setAdjIdx(u.nightAdjIdx ?? 0);
        const custom = (u as any).nightCustomAdj;
        if (custom) { setCustomAdj(custom); setUseCustom(true); }
      });
    }
    AsyncStorage.getItem('profile_photos').then(v => { if (v) setPhotos(JSON.parse(v)); });
    AsyncStorage.getItem('diary_entries').then(v => { if (v) setDiary(JSON.parse(v)); });
  }, []);

  const colors = zh ? COLOR_NAMES_ZH : COLOR_NAMES_EN;
  const adjs = zh ? ADJ_ZH : ADJ_EN;
  const adjPart = useCustom && customAdj.trim() ? customAdj.trim() : adjs[adjIdx];
  const nightName = zh ? `${colors[colorIdx]}的${adjPart}` : `${colors[colorIdx]} ${adjPart}`;

  const saveNightName = (ci: number, ai: number, custom: string | null) => {
    updateUser({ nightColorIdx: ci, nightAdjIdx: ai, nightCustomAdj: custom } as any);
  };

  const pickColor = (i: number) => { setColorIdx(i); saveNightName(i, adjIdx, useCustom ? customAdj.trim() || null : null); };
  const pickAdj = (i: number) => { setAdjIdx(i); setUseCustom(false); saveNightName(colorIdx, i, null); };
  const commitCustomAdj = () => {
    const v = customAdj.trim();
    if (v.length < 2) return;
    setUseCustom(true);
    saveNightName(colorIdx, adjIdx, v);
  };

  const toggleLoftVisible = () => {
    const next = !loftVisible;
    setLoftVisible(next);
    updateUser({ loftVisible: next });
  };

  const addPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('', zh ? '需要相簿權限才能加入照片' : 'Photo library permission is needed');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (res.canceled || !res.assets?.[0]) return;
    const next = [...photos, res.assets[0].uri].slice(0, MAX_PHOTOS);
    setPhotos(next);
    AsyncStorage.setItem('profile_photos', JSON.stringify(next));
  };

  const removePhoto = (i: number) => {
    Alert.alert('', zh ? '移除這張照片？' : 'Remove this photo?', [
      { text: zh ? '取消' : 'Cancel', style: 'cancel' },
      {
        text: zh ? '移除' : 'Remove', style: 'destructive',
        onPress: () => {
          const next = photos.filter((_, idx) => idx !== i);
          setPhotos(next);
          AsyncStorage.setItem('profile_photos', JSON.stringify(next));
        },
      },
    ]);
  };

  const addDiary = () => {
    const text = diaryDraft.trim();
    if (!text) return;
    const now = new Date();
    const d = `${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;
    const next = [{ d, text }, ...diary].slice(0, 30);
    setDiary(next);
    setDiaryDraft('');
    AsyncStorage.setItem('diary_entries', JSON.stringify(next));
  };

  // Real status chips from setup data
  const statusChips: string[] = [];
  if (dbUser?.relationshipStatus) statusChips.push(dbUser.relationshipStatus);
  if (dbUser?.region) statusChips.push(zh ? `在${dbUser.region}` : dbUser.region);
  if (dbUser?.boundary) statusChips.push(dbUser.boundary);
  (dbUser?.seeking ?? []).forEach(s => statusChips.push(s));

  return (
    <VaporBackground p={p} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Top bar */}
          <View style={styles.topBar}>
            <TouchableOpacity onPress={() => navigation.goBack()}
              style={[styles.backBtn, { backgroundColor: p.surface, borderColor: p.line }]}>
              <Text style={{ color: p.muted, fontSize: 18 }}>‹</Text>
            </TouchableOpacity>
            <Cap p={p}>{zh ? '我的頁面' : 'My page'}</Cap>
            <TouchableOpacity onPress={() => navigation.push('Settings')}
              style={[styles.backBtn, { backgroundColor: p.surface, borderColor: p.line }]}>
              <Text style={{ color: p.muted, fontSize: 14 }}>⚙</Text>
            </TouchableOpacity>
          </View>

          {/* Identity + wicks card */}
          <GlassCard p={p} padding={18} radius={24}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
              <Identity kind={identityKind} seed={seed} size={64} palette={p} lang={lang} trust={0.4} />
              <View style={{ flex: 1 }}>
                <ColorAdjLabel seed={seed} lang={lang} palette={p} />
                <Text style={{ fontFamily: zh ? 'EBGaramond-Italic' : 'NotoSerifTC-Regular', fontSize: 11, color: p.muted, marginTop: 4 }}>
                  {zh ? '識別每天重新生成' : 'identity regenerates daily'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => navigation.push('Upgrade')}
                style={{ alignItems: 'center', gap: 2, backgroundColor: p.accentSoft, borderWidth: 0.5, borderColor: p.accent + '40', borderRadius: 14, padding: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <WickGlyph size={12} color={p.accent} />
                  <Text style={{ fontFamily: 'Inter-Regular', fontSize: 18, color: p.accent, fontWeight: '500' }}>{wicks}</Text>
                </View>
                <Text style={{ fontFamily: 'Inter-Regular', fontSize: 8, letterSpacing: 1.5, textTransform: 'uppercase', color: p.muted }}>
                  {zh ? '購買' : 'buy more'}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={{ marginTop: 14, paddingTop: 12, borderTopWidth: 0.5, borderTopColor: p.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 13, color: p.ink }}>
                {vigil ? (zh ? '守夜會員' : 'Vigil member') : (zh ? '一根蠟燭（免費）' : 'One Candle (free)')}
              </Text>
              <TouchableOpacity onPress={() => navigation.push('Upgrade')}>
                <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 12, color: p.accent }}>
                  {vigil ? (zh ? '管理' : 'manage') : (zh ? '升級 →' : 'upgrade →')}
                </Text>
              </TouchableOpacity>
            </View>
          </GlassCard>

          {/* Night name composer (Loft) */}
          <View style={[styles.nightNameBox, { backgroundColor: 'rgba(45,22,28,0.9)', borderColor: 'rgba(232,165,87,0.3)' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 14, color: '#f5e2c4' }}>
                {zh ? '夜名 · 僅夜閣使用' : 'Night name · Loft only'}
              </Text>
              <Text style={{ fontFamily: 'EBGaramond-Italic', fontSize: 11, color: 'rgba(245,226,196,0.55)' }}>
                {zh ? '組合或自己寫' : 'compose, or write your own'}
              </Text>
            </View>
            <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 22, color: '#e8a557', letterSpacing: 2, textAlign: 'center', marginTop: 10 }}>
              {nightName}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {colors.map((c, i) => (
                  <TouchableOpacity key={c} onPress={() => pickColor(i)}
                    style={{ paddingVertical: 5, paddingHorizontal: 12, borderRadius: 999, backgroundColor: colorIdx === i ? '#e8a557' : 'rgba(245,226,196,0.06)', borderWidth: 0.5, borderColor: 'rgba(232,165,87,0.25)' }}>
                    <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 12, color: colorIdx === i ? '#1f1014' : 'rgba(245,226,196,0.7)' }}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {adjs.map((a, i) => (
                  <TouchableOpacity key={a} onPress={() => pickAdj(i)}
                    style={{ paddingVertical: 5, paddingHorizontal: 12, borderRadius: 999, backgroundColor: !useCustom && adjIdx === i ? '#e8a557' : 'rgba(245,226,196,0.06)', borderWidth: 0.5, borderColor: 'rgba(232,165,87,0.25)' }}>
                    <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 12, color: !useCustom && adjIdx === i ? '#1f1014' : 'rgba(245,226,196,0.7)' }}>{a}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            {/* Custom adjective input */}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, alignItems: 'center' }}>
              <TextInput
                value={customAdj}
                onChangeText={v => setCustomAdj(v.slice(0, 6))}
                onSubmitEditing={commitCustomAdj}
                placeholder={zh ? '或自己寫 2–6 個字⋯' : 'or write your own (2–12 chars)…'}
                placeholderTextColor="rgba(245,226,196,0.35)"
                maxLength={zh ? 6 : 12}
                style={{
                  flex: 1, fontFamily: 'NotoSerifTC-Regular', fontSize: 13, color: '#f5e2c4',
                  paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10,
                  backgroundColor: 'rgba(245,226,196,0.06)', borderWidth: 0.5,
                  borderColor: useCustom ? '#e8a557' : 'rgba(232,165,87,0.25)',
                }}
              />
              <TouchableOpacity onPress={commitCustomAdj}
                disabled={customAdj.trim().length < 2}
                style={{
                  paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10,
                  backgroundColor: customAdj.trim().length >= 2 ? '#e8a557' : 'rgba(245,226,196,0.08)',
                }}>
                <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 12, color: customAdj.trim().length >= 2 ? '#1f1014' : 'rgba(245,226,196,0.4)' }}>
                  {zh ? '用這個' : 'use'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Loft visibility toggle — persists */}
          <View style={[styles.loftToggle, { backgroundColor: 'rgba(45,22,28,0.7)', borderColor: 'rgba(232,165,87,0.3)' }]}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 14, color: '#f5e2c4' }}>
                {zh ? '在夜閣顯示我的頁面' : 'Show my page in the Loft'}
              </Text>
              <Text style={{ fontFamily: 'EBGaramond-Italic', fontSize: 11, color: 'rgba(245,226,196,0.55)', marginTop: 2 }}>
                {zh ? '訪客看要付燭芯' : 'Visitors pay wicks to look'}
              </Text>
            </View>
            <TouchableOpacity onPress={toggleLoftVisible}
              style={{ width: 40, height: 24, borderRadius: 24, backgroundColor: loftVisible ? '#e8a557' : 'rgba(245,226,196,0.2)', justifyContent: 'center' }}>
              <View style={{ position: 'absolute', left: loftVisible ? 18 : 2, top: 2, width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff' }} />
            </TouchableOpacity>
          </View>

          {/* Diary — local, written by you */}
          <View style={styles.profileSection}>
            <Cap p={p} style={{ marginBottom: 10 }}>{zh ? '日記 · Diary' : 'Diary · 日記'}</Cap>
            <GlassCard p={p} padding={10} radius={18}>
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <TextInput
                  value={diaryDraft}
                  onChangeText={setDiaryDraft}
                  placeholder={zh ? '寫一句今天的心事⋯' : 'A line about today…'}
                  placeholderTextColor={p.muted}
                  style={{ flex: 1, fontFamily: 'NotoSerifTC-Regular', fontSize: 13, color: p.ink, paddingHorizontal: 8, paddingVertical: 8 }}
                />
                <TouchableOpacity onPress={addDiary} disabled={!diaryDraft.trim()}
                  style={{ paddingVertical: 7, paddingHorizontal: 12, borderRadius: 10, backgroundColor: diaryDraft.trim() ? p.ink : p.line }}>
                  <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 12, color: diaryDraft.trim() ? (p.dark ? '#1a1530' : '#fff') : p.muted }}>
                    {zh ? '收進來' : 'keep'}
                  </Text>
                </TouchableOpacity>
              </View>
              {diary.length === 0 ? (
                <Text style={{ fontFamily: 'EBGaramond-Italic', fontSize: 12, color: p.muted, padding: 10, textAlign: 'center' }}>
                  {zh ? '只存在這台裝置上，沒有人看得到。' : 'Lives only on this device. No one can see it.'}
                </Text>
              ) : (
                diary.map((d, i) => (
                  <View key={i} style={[styles.diaryRow, { borderTopWidth: 0.5, borderTopColor: p.line }]}>
                    <Text style={{ fontFamily: 'EBGaramond-Italic', fontSize: 11, color: p.muted, flexShrink: 0 }}>{d.d}</Text>
                    <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 14, color: p.ink, lineHeight: 22, flex: 1 }}>
                      {d.text}
                    </Text>
                  </View>
                ))
              )}
            </GlassCard>
          </View>

          {/* Photos — real picker, veiled by default */}
          <View style={styles.profileSection}>
            <Cap p={p} style={{ marginBottom: 10 }}>{zh ? '相簿 · Photos' : 'Photos · 相簿'}</Cap>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {photos.map((uri, i) => (
                <TouchableOpacity key={uri + i} onLongPress={() => removePhoto(i)} activeOpacity={0.85}>
                  <PhotoVeil p={p} liftLevel={0} size={100} lang={lang} uri={uri} />
                </TouchableOpacity>
              ))}
              {photos.length < MAX_PHOTOS && (
                <TouchableOpacity onPress={addPhoto}
                  style={[styles.addPhoto, { borderColor: p.line, backgroundColor: p.surface }]}>
                  <Text style={{ fontSize: 26, color: p.muted }}>＋</Text>
                  <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 10, color: p.muted }}>
                    {zh ? '加照片' : 'add'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            <Text style={{ fontFamily: 'EBGaramond-Italic', fontSize: 10.5, color: p.muted, marginTop: 8, lineHeight: 16 }}>
              {zh ? '照片永遠帶紗顯示 · 長按可移除 · 只在你允許時，夜閣的人才能揭開' : 'Always shown veiled · long-press to remove · lifted only with your consent in the Loft'}
            </Text>
          </View>

          {/* Quote — from your setup line */}
          <View style={styles.profileSection}>
            <Cap p={p} style={{ marginBottom: 10 }}>{zh ? '語錄 · A line' : 'A line · 語錄'}</Cap>
            <View style={{ paddingLeft: 14, borderLeftWidth: 2, borderLeftColor: p.accent + '60' }}>
              <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 15, color: dbUser?.quote ? p.ink : p.muted, lineHeight: 26 }}>
                {dbUser?.quote
                  ? `「${dbUser.quote}」`
                  : (zh ? '還沒留下你的一句話 — 可在設定中補上。' : 'No line left yet — add one in settings.')}
              </Text>
            </View>
          </View>

          {/* Status — real setup data */}
          {statusChips.length > 0 && (
            <View style={styles.profileSection}>
              <Cap p={p} style={{ marginBottom: 10 }}>{zh ? '感情狀態 · 想找' : 'Status · Seeking'}</Cap>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {statusChips.map((it, i) => (
                  <View key={it + i} style={{
                    paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999,
                    backgroundColor: i === 0 ? p.accent : p.surface,
                    borderWidth: i === 0 ? 0 : 0.5, borderColor: p.line,
                  }}>
                    <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 13, color: i === 0 ? (p.dark ? '#1f1014' : '#fbf5e4') : p.ink }}>{it}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <Text style={[styles.footer, { color: p.muted }]}>
            {zh
              ? '公園裡沒有人看得到你的頁面。只有夜閣看得到——而且只有你允許的部分。'
              : 'Your page is invisible in the Park. Only the Loft can see it — and only what you allow.'}
          </Text>
        </ScrollView>
      </SafeAreaView>
    </VaporBackground>
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
  addPhoto:        { width: 100, height: 100, borderRadius: 24, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 2 },
  footer:          { fontFamily: 'EBGaramond-Italic', fontSize: 11, textAlign: 'center', opacity: 0.7, lineHeight: 20, marginTop: 24 },
});
