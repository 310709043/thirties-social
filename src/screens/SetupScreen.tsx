import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, TextInput,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import { DIRECTIONS } from '../lib/theme';
import { VaporBackground, GlassCard, Cap } from '../components/ui';
import { useAppStore, setSetupDone, setProfileFields, Gender } from '../hooks/useAppStore';

type Props = NativeStackScreenProps<RootStackParamList, 'Setup'>;

function ChipRow({
  p, label, alt, options, value, onPick, multi = false,
}: {
  p: any; label: string; alt?: string; options: string[];
  value: string | string[] | null; onPick: (v: any) => void; multi?: boolean;
}) {
  const isPicked = (v: string) => multi
    ? (value as string[] || []).includes(v)
    : value === v;
  const pick = (v: string) => {
    if (multi) {
      const cur = (value as string[]) || [];
      onPick(isPicked(v) ? cur.filter(x => x !== v) : [...cur, v]);
    } else {
      onPick(v);
    }
  };
  return (
    <View style={{ marginTop: 20 }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
        <Cap p={p}>{label}</Cap>
        {alt && <Text style={{ fontFamily: 'EBGaramond-Italic', fontSize: 11, color: p.muted, opacity: 0.6 }}>{alt}</Text>}
      </View>
      <View style={{ marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {options.map(o => (
          <TouchableOpacity key={o} onPress={() => pick(o)} activeOpacity={0.8}
            style={{
              paddingVertical: 9, paddingHorizontal: 15, borderRadius: 999,
              backgroundColor: isPicked(o) ? (multi ? p.accentSoft : p.ink) : p.surface,
              borderWidth: 0.5,
              borderColor: isPicked(o) ? (multi ? p.accent : p.ink) : p.line,
            }}>
            <Text style={{
              fontFamily: 'NotoSerifTC-Regular', fontSize: 13,
              color: isPicked(o) ? (multi ? p.ink : (p.dark ? '#1a1530' : '#fff')) : p.ink,
            }}>{o}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

export default function SetupScreen({ navigation }: Props) {
  const { direction, lang } = useAppStore();
  const p = DIRECTIONS[direction];
  const zh = lang !== 'en';

  const [gender, setGender] = useState<string | null>(null);
  const [age, setAge] = useState<string | null>(null);
  const [marriage, setMarriage] = useState<string | null>(null);
  const [shape, setShape] = useState<string | null>(null);
  const [seeking, setSeeking] = useState<string[]>([]);
  const [boundary, setBoundary] = useState<string | null>(null);
  const [when, setWhen] = useState<string[]>([]);
  const [region, setRegion] = useState<string | null>(null);
  const [line, setLine] = useState('');

  const ready = !!gender && !!age && !!marriage && seeking.length > 0 && !!boundary;

  // Canonical slug mappings (same index order as the chip options)
  const MARRIAGE_ZH = ['穩定交往中', '同居', '訂婚', '已婚', '已婚·分居中', '偽單身', '開放關係', '對象是已婚的', '單身但說不清'];
  const MARRIAGE_EN = ['in a relationship', 'cohabiting', 'engaged', 'married', 'married · separated', 'single-passing', 'open', 'seeing someone married', 'single-ish'];
  const MARRIAGE_SLUGS = ['dating', 'cohabiting', 'engaged', 'married', 'separated', 'single-passing', 'open', 'seeing-married', 'single-ish'];
  const SEEKING_ZH = ['一個樹洞', '情感陪伴', '曖昧', '線上親密', '不設限'];
  const SEEKING_EN = ['someone to listen', 'companionship', 'flirtation', 'online intimacy', 'no limits'];
  const SEEKING_SLUGS = ['listener', 'companion', 'flirt', 'online-intimacy', 'no-limits'];
  const BOUNDARY_ZH = ['只在線上', '或許可以見面', '看感覺'];
  const BOUNDARY_EN = ['online only', 'maybe meet', 'depends'];
  const BOUNDARY_SLUGS = ['online-only', 'maybe-meet', 'depends'];
  const REGION_ZH = ['北部', '中部', '南部', '東部', '不透露'];
  const REGION_EN = ['north', 'central', 'south', 'east', 'undisclosed'];
  const REGION_SLUGS = ['north', 'central', 'south', 'east', 'undisclosed'];

  const toSlug = (zhOpts: string[], enOpts: string[], slugs: string[], val: string | null) => {
    if (!val) return null;
    const idx = zhOpts.indexOf(val) >= 0 ? zhOpts.indexOf(val) : enOpts.indexOf(val);
    return idx >= 0 ? slugs[idx] : val;
  };
  const toSlugs = (zhOpts: string[], enOpts: string[], slugs: string[], vals: string[]) =>
    vals.map(v => toSlug(zhOpts, enOpts, slugs, v)).filter(Boolean) as string[];

  const handleDone = async () => {
    if (!ready) return;
    const genderMap: Record<string, Gender> = { f: 'female', m: 'male', x: 'nonbinary' };
    const resolvedGender = genderMap[gender!] ?? 'nonbinary';
    const resolvedRelationship = toSlug(MARRIAGE_ZH, MARRIAGE_EN, MARRIAGE_SLUGS, marriage);
    const resolvedSeeking = toSlugs(SEEKING_ZH, SEEKING_EN, SEEKING_SLUGS, seeking);
    const resolvedBoundary = toSlug(BOUNDARY_ZH, BOUNDARY_EN, BOUNDARY_SLUGS, boundary);
    const resolvedRegion = toSlug(REGION_ZH, REGION_EN, REGION_SLUGS, region);
    await setProfileFields({
      gender: resolvedGender,
      ageBracket: age!,
      relationshipStatus: resolvedRelationship ?? marriage!,
      seeking: resolvedSeeking,
      boundary: resolvedBoundary ?? boundary!,
      region: resolvedRegion,
      quote: line.trim() || null,
    });
    await setSetupDone();
    navigation.replace('Mood');
  };

  return (
    <VaporBackground p={p} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Cap p={p}>{zh ? '最後一步' : 'Last step'}</Cap>
          <Text style={[styles.title, { color: p.ink }]}>
            {zh ? '說說你的情況' : 'Tell us where you are'}
          </Text>
          <Text style={[styles.sub, { color: p.muted }]}>
            {zh
              ? '這裡的人多半身邊都有一個人。誠實一點，配對才會準。這些資料不會顯示在公園——只有你允許時，夜閣才看得到部分。'
              : 'Most people here have someone beside them. Be honest — matching depends on it. None of this shows in the Park; only the Loft can see it, and only what you allow.'}
          </Text>

          {/* Gender */}
          <View style={{ marginTop: 24 }}>
            <Cap p={p}>{zh ? '我是' : 'I am'}</Cap>
            <View style={{ marginTop: 10, flexDirection: 'row', gap: 8 }}>
              {[
                { v: 'f', zh: '女生', en: 'Woman' },
                { v: 'm', zh: '男生', en: 'Man' },
                { v: 'x', zh: '非二元', en: 'Non-binary' },
              ].map(g => (
                <TouchableOpacity key={g.v} onPress={() => setGender(g.v)} activeOpacity={0.8}
                  style={[styles.genderCard, {
                    backgroundColor: gender === g.v ? p.accentSoft : p.surface,
                    borderColor: gender === g.v ? p.accent : p.line,
                  }]}>
                  <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 14, color: p.ink, fontWeight: '500' }}>
                    {zh ? g.zh : g.en}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <ChipRow p={p} label={zh ? '年齡' : 'Age'} alt={zh ? 'age' : '年齡'}
            options={['25−30', '31−35', '36−40', '41−45', '46+']}
            value={age} onPick={setAge} />

          <ChipRow p={p} label={zh ? '我的感情狀態' : 'My relationship'} alt={zh ? 'status' : '狀態'}
            options={zh
              ? ['穩定交往中', '同居', '訂婚', '已婚', '已婚·分居中', '偽單身', '開放關係', '對象是已婚的', '單身但說不清']
              : ['in a relationship', 'cohabiting', 'engaged', 'married', 'married · separated', 'single-passing', 'open', 'seeing someone married', 'single-ish']}
            value={marriage} onPick={setMarriage} />

          <ChipRow p={p} label={zh ? '它現在的樣子' : 'What it feels like now'} alt={zh ? '誠實地說' : 'honestly'}
            options={zh
              ? ['無性了', '喪偶式', '還有愛但寂寞', '熱戀期過了', '正在想要不要離開', '說不清']
              : ['sexless', 'roommates', 'love remains, lonely', 'past the honeymoon', 'thinking of leaving', 'hard to say']}
            value={shape} onPick={setShape} />

          <ChipRow p={p} label={zh ? '我來找' : 'I am here for'} alt={zh ? '可複選' : 'multi'} multi
            options={zh
              ? ['一個樹洞', '情感陪伴', '曖昧', '線上親密', '不設限']
              : ['someone to listen', 'companionship', 'flirtation', 'online intimacy', 'no limits']}
            value={seeking} onPick={setSeeking} />

          <ChipRow p={p} label={zh ? '我的邊界' : 'My boundary'} alt={zh ? 'boundary' : '邊界'}
            options={zh ? ['只在線上', '或許可以見面', '看感覺'] : ['online only', 'maybe meet', 'depends']}
            value={boundary} onPick={setBoundary} />

          <ChipRow p={p} label={zh ? '我通常有空的時候' : 'When I am free'} alt={zh ? '可複選' : 'multi'} multi
            options={zh ? ['深夜', '午後', '上班時間', '碎片時間'] : ['late night', 'afternoons', 'office hours', 'in-between']}
            value={when} onPick={setWhen} />

          <ChipRow p={p} label={zh ? '大概在' : 'Roughly in'} alt={zh ? '只到區域' : 'region only'}
            options={zh ? ['北部', '中部', '南部', '東部', '不透露'] : ['north', 'central', 'south', 'east', 'undisclosed']}
            value={region} onPick={setRegion} />

          {/* One line */}
          <View style={{ marginTop: 20 }}>
            <Cap p={p}>{zh ? '留給夜閣的一句話（可不填）' : 'One line, for the Loft (optional)'}</Cap>
            <TextInput
              value={line}
              onChangeText={setLine}
              placeholder={zh ? '例：「婚姻是兩個人輪流孤獨。」' : 'e.g. "Marriage is two people taking turns being lonely."'}
              placeholderTextColor={p.muted}
              style={[styles.lineInput, { backgroundColor: p.surface, borderColor: p.line, color: p.ink }]}
            />
          </View>

          {/* Age confirm */}
          <View style={[styles.ageNote, { backgroundColor: p.accentSoft, borderColor: p.accent + '30' }]}>
            <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 12, color: p.inkSoft, lineHeight: 20 }}>
              {zh
                ? '按下開始即代表你已滿 18 歲。驗證只在裝置上完成，不會儲存。'
                : 'Starting means you are over 18. Verification happens on-device only — never stored.'}
            </Text>
          </View>

          <TouchableOpacity
            onPress={handleDone}
            activeOpacity={ready ? 0.85 : 1}
            style={[styles.doneBtn, {
              backgroundColor: ready ? p.ink : p.line,
              opacity: ready ? 1 : 0.5,
            }]}>
            <Text style={{
              fontFamily: 'NotoSerifTC-Regular', fontSize: 16, fontWeight: '500',
              color: ready ? (p.dark ? '#1a1530' : '#fff') : p.muted,
            }}>
              {zh ? '開始今晚' : 'Begin tonight'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </VaporBackground>
  );
}

const styles = StyleSheet.create({
  scroll:     { padding: 26, paddingBottom: 48 },
  title:      { fontFamily: 'NotoSerifTC-Regular', fontSize: 28, fontWeight: '400', lineHeight: 38, marginTop: 8 },
  sub:        { fontFamily: 'NotoSerifTC-Regular', fontSize: 13, lineHeight: 22, marginTop: 8 },
  genderCard: { flex: 1, padding: 14, borderRadius: 16, borderWidth: 1 },
  lineInput:  { marginTop: 10, padding: 13, borderRadius: 14, borderWidth: 0.5, fontFamily: 'NotoSerifTC-Regular', fontSize: 14 },
  ageNote:    { marginTop: 18, padding: 12, borderRadius: 14, borderWidth: 0.5 },
  doneBtn:    { marginTop: 18, height: 56, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
});
