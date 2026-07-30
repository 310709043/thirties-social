import React, { useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, TextInput,
  StyleSheet, KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import { DIRECTIONS, Palette } from '../lib/theme';
import { VaporBackground, Cap, WickGlyph, FadeInUp } from '../components/ui';
import { useAppStore, setSetupDone, setProfileFields, Gender } from '../hooks/useAppStore';

type Props = NativeStackScreenProps<RootStackParamList, 'Setup'>;
type ProfileStep = 0 | 1 | 2;

const STEPS = [
  { zh: '關於你', en: 'About you' },
  { zh: '你的關係', en: 'Your relationship' },
  { zh: '今晚想遇見誰', en: 'What you want tonight' },
] as const;

const MARRIAGE_ZH = ['穩定交往中', '同居', '訂婚', '已婚', '已婚·分居中', '偽單身', '開放關係', '對象是已婚的', '單身但說不清'];
const MARRIAGE_EN = ['in a relationship', 'cohabiting', 'engaged', 'married', 'married · separated', 'single-passing', 'open', 'seeing someone married', 'single-ish'];
const MARRIAGE_SLUGS = ['dating', 'cohabiting', 'engaged', 'married', 'separated', 'single-passing', 'open', 'seeing-married', 'single-ish'];
const SHAPE_ZH = ['無性了', '喪偶式', '還有愛但寂寞', '熱戀期過了', '正在想要不要離開', '說不清'];
const SHAPE_EN = ['sexless', 'roommates', 'love remains, lonely', 'past the honeymoon', 'thinking of leaving', 'hard to say'];
const SHAPE_SLUGS = ['sexless', 'roommates', 'love-lonely', 'post-honeymoon', 'considering-leaving', 'unclear'];
const WHEN_ZH = ['深夜', '午後', '上班時間', '碎片時間'];
const WHEN_EN = ['late night', 'afternoons', 'office hours', 'in-between'];
const WHEN_SLUGS = ['late-night', 'afternoon', 'office-hours', 'in-between'];
const SEEKING_ZH = ['一個樹洞', '情感陪伴', '曖昧', '線上親密', '不設限'];
const SEEKING_EN = ['someone to listen', 'companionship', 'flirtation', 'online intimacy', 'no limits'];
const SEEKING_SLUGS = ['listener', 'companion', 'flirt', 'online-intimacy', 'no-limits'];
const BOUNDARY_ZH = ['只在線上', '或許可以見面', '看感覺'];
const BOUNDARY_EN = ['online only', 'maybe meet', 'depends'];
const BOUNDARY_SLUGS = ['online-only', 'maybe-meet', 'depends'];
const REGION_ZH = ['北部', '中部', '南部', '東部', '不透露'];
const REGION_EN = ['north', 'central', 'south', 'east', 'undisclosed'];
const REGION_SLUGS = ['north', 'central', 'south', 'east', 'undisclosed'];

function SectionIntro({
  p, eyebrow, title, body,
}: {
  p: Palette; eyebrow: string; title: string; body: string;
}) {
  return (
    <FadeInUp delay={30} distance={8}>
      <Cap p={p}>{eyebrow}</Cap>
      <Text style={[styles.title, { color: p.ink }]}>{title}</Text>
      <Text style={[styles.sub, { color: p.muted }]}>{body}</Text>
    </FadeInUp>
  );
}

function ChipRow({
  p, label, optional, options, value, onPick, multi = false,
}: {
  p: Palette; label: string; optional?: string; options: string[];
  value: string | string[] | null; onPick: (v: any) => void; multi?: boolean;
}) {
  const isPicked = (v: string) => multi
    ? (value as string[] || []).includes(v)
    : value === v;
  const pick = (v: string) => {
    if (!multi) return onPick(v);
    const current = (value as string[]) || [];
    onPick(isPicked(v) ? current.filter(x => x !== v) : [...current, v]);
  };

  return (
    <View style={styles.fieldGroup}>
      <View style={styles.labelRow}>
        <Text style={[styles.fieldLabel, { color: p.ink }]}>{label}</Text>
        {optional ? <Text style={[styles.optional, { color: p.muted }]}>{optional}</Text> : null}
      </View>
      <View style={styles.chips}>
        {options.map(option => {
          const selected = isPicked(option);
          return (
            <TouchableOpacity
              key={option}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => pick(option)}
              activeOpacity={0.8}
              style={[
                styles.chip,
                {
                  backgroundColor: selected ? p.accent : p.surface,
                  borderColor: selected ? p.accent : p.line,
                  borderWidth: selected ? 1.2 : 0.9,
                },
              ]}
            >
              <Text style={[styles.chipText, { color: selected ? (p.dark ? '#15172e' : '#fff') : p.ink }]}>
                {selected ? '✓ ' : ''}{option}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function toSlug(zhOptions: string[], enOptions: string[], slugs: string[], value: string | null) {
  if (!value) return null;
  const zhIndex = zhOptions.indexOf(value);
  const index = zhIndex >= 0 ? zhIndex : enOptions.indexOf(value);
  return index >= 0 ? slugs[index] : value;
}

function toSlugs(zhOptions: string[], enOptions: string[], slugs: string[], values: string[]) {
  return values.map(value => toSlug(zhOptions, enOptions, slugs, value)).filter(Boolean) as string[];
}

export default function SetupScreen({ navigation }: Props) {
  const { direction, lang } = useAppStore();
  const p = DIRECTIONS[direction];
  const zh = lang !== 'en';
  const scrollRef = useRef<ScrollView>(null);

  const [step, setStep] = useState<ProfileStep>(0);
  const [gender, setGender] = useState<string | null>(null);
  const [age, setAge] = useState<string | null>(null);
  const [marriage, setMarriage] = useState<string | null>(null);
  const [shape, setShape] = useState<string | null>(null);
  const [seeking, setSeeking] = useState<string[]>([]);
  const [boundary, setBoundary] = useState<string | null>(null);
  const [when, setWhen] = useState<string[]>([]);
  const [region, setRegion] = useState<string | null>(null);
  const [line, setLine] = useState('');
  const [lineFocused, setLineFocused] = useState(false);
  const [saving, setSaving] = useState(false);

  const stepReady = step === 0
    ? !!gender && !!age
    : step === 1
      ? !!marriage
      : seeking.length > 0 && !!boundary;

  const goToStep = (next: ProfileStep) => {
    setStep(next);
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: 0, animated: false }));
  };

  const handleDone = async () => {
    if (!stepReady || saving) return;
    setSaving(true);
    const genderMap: Record<string, Gender> = { f: 'female', m: 'male', x: 'nonbinary' };
    await setProfileFields({
      gender: genderMap[gender!] ?? 'nonbinary',
      ageBracket: age!,
      relationshipStatus: toSlug(MARRIAGE_ZH, MARRIAGE_EN, MARRIAGE_SLUGS, marriage) ?? marriage!,
      relationshipShape: toSlug(SHAPE_ZH, SHAPE_EN, SHAPE_SLUGS, shape),
      seeking: toSlugs(SEEKING_ZH, SEEKING_EN, SEEKING_SLUGS, seeking),
      boundary: toSlug(BOUNDARY_ZH, BOUNDARY_EN, BOUNDARY_SLUGS, boundary) ?? boundary!,
      freeTimes: toSlugs(WHEN_ZH, WHEN_EN, WHEN_SLUGS, when),
      region: toSlug(REGION_ZH, REGION_EN, REGION_SLUGS, region),
      quote: line.trim() || null,
    });
    await setSetupDone();
    navigation.replace('Mood');
  };

  const handlePrimary = () => {
    if (!stepReady) return;
    if (step < 2) goToStep((step + 1) as ProfileStep);
    else void handleDone();
  };

  return (
    <VaporBackground p={p} style={{ flex: 1 }}>
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView behavior="padding" style={styles.safe}>
          <View style={styles.shell}>
            <View style={[styles.progressHeader, { backgroundColor: p.surface, borderColor: p.line }]}>
              <View style={styles.progressCopy}>
                <Cap p={p}>{zh ? '建立你的夜間名片' : 'Your night profile'}</Cap>
                <Text style={[styles.stepCount, { color: p.muted }]}>
                  {step + 1} / {STEPS.length}
                </Text>
              </View>
              <View style={styles.progressBars}>
                {STEPS.map((item, index) => (
                  <View
                    key={item.en}
                    style={[
                      styles.progressBar,
                      { backgroundColor: index <= step ? p.accent : p.line },
                    ]}
                  />
                ))}
              </View>
            </View>

            <ScrollView
              ref={scrollRef}
              style={styles.scrollView}
              contentContainerStyle={styles.scroll}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {step === 0 && (
                <>
                  <SectionIntro
                    p={p}
                    eyebrow={zh ? '第一步 · 基本輪廓' : 'Step one · basics'}
                    title={zh ? '先讓對的人認出你' : 'Help the right person find you'}
                    body={zh
                      ? '只顯示必要的輪廓，不使用真名。你可以之後在設定中調整。'
                      : 'Only the essentials, never your real name. You can change these later.'}
                  />

                  <View style={styles.fieldGroup}>
                    <Text style={[styles.fieldLabel, { color: p.ink }]}>{zh ? '我是' : 'I am'}</Text>
                    <View style={styles.genderRow}>
                      {[
                        { value: 'f', zh: '女生', en: 'Woman' },
                        { value: 'm', zh: '男生', en: 'Man' },
                        { value: 'x', zh: '非二元', en: 'Non-binary' },
                      ].map(item => {
                        const selected = gender === item.value;
                        return (
                          <TouchableOpacity
                            key={item.value}
                            accessibilityRole="button"
                            accessibilityState={{ selected }}
                            onPress={() => setGender(item.value)}
                            activeOpacity={0.8}
                            style={[
                              styles.genderCard,
                              {
                                  backgroundColor: selected ? p.accent : p.surface,
                                  borderColor: selected ? p.accent : p.line,
                              },
                            ]}
                          >
                            <Text style={[styles.genderText, { color: selected ? (p.dark ? '#15172e' : '#fff') : p.ink }]}>
                              {selected ? '✓ ' : ''}{zh ? item.zh : item.en}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  <ChipRow
                    p={p}
                    label={zh ? '年齡區間' : 'Age range'}
                    options={['18−24', '25−30', '31−35', '36−40', '41−45', '46+']}
                    value={age}
                    onPick={setAge}
                  />
                </>
              )}

              {step === 1 && (
                <>
                  <SectionIntro
                    p={p}
                    eyebrow={zh ? '第二步 · 關係現況' : 'Step two · relationship'}
                    title={zh ? '說清楚，才不會彼此猜測' : 'Clarity creates safer connections'}
                    body={zh
                      ? '這些資訊會用來改善配對，也能幫助雙方在開始前理解彼此情境。'
                      : 'These answers improve matching and help both people understand the context before talking.'}
                  />
                  <ChipRow
                    p={p}
                    label={zh ? '目前的感情狀態' : 'Relationship status'}
                    options={zh ? MARRIAGE_ZH : MARRIAGE_EN}
                    value={marriage}
                    onPick={setMarriage}
                  />
                  <ChipRow
                    p={p}
                    label={zh ? '它現在的樣子' : 'What it feels like now'}
                    optional={zh ? '選填' : 'optional'}
                    options={zh ? SHAPE_ZH : SHAPE_EN}
                    value={shape}
                    onPick={setShape}
                  />
                  <View style={[styles.trustNote, { backgroundColor: p.accentSoft, borderColor: p.accent + '35' }]}>
                    <Text style={[styles.trustText, { color: p.inkSoft }]}>
                      {zh
                        ? '誠實不等於公開。這些內容只用於配對與你允許顯示的個人頁。'
                        : 'Honest does not mean public. These answers are used for matching and the profile details you choose to show.'}
                    </Text>
                  </View>
                </>
              )}

              {step === 2 && (
                <>
                  <SectionIntro
                    p={p}
                    eyebrow={zh ? '第三步 · 意圖與邊界' : 'Step three · intent & boundaries'}
                    title={zh ? '今晚，你想靠近到哪裡？' : 'How close feels right tonight?'}
                    body={zh
                      ? '先說出期待與邊界，會讓第一句話更自然，也更安全。'
                      : 'Clear expectations make the first message easier and the connection safer.'}
                  />
                  <ChipRow
                    p={p}
                    label={zh ? '我來找' : 'I am here for'}
                    optional={zh ? '可複選' : 'choose any'}
                    multi
                    options={zh ? SEEKING_ZH : SEEKING_EN}
                    value={seeking}
                    onPick={setSeeking}
                  />
                  <ChipRow
                    p={p}
                    label={zh ? '我的邊界' : 'My boundary'}
                    options={zh ? BOUNDARY_ZH : BOUNDARY_EN}
                    value={boundary}
                    onPick={setBoundary}
                  />
                  <ChipRow
                    p={p}
                    label={zh ? '通常有空的時候' : 'Usually free'}
                    optional={zh ? '選填 · 可複選' : 'optional · choose any'}
                    multi
                    options={zh ? WHEN_ZH : WHEN_EN}
                    value={when}
                    onPick={setWhen}
                  />
                  <ChipRow
                    p={p}
                    label={zh ? '大概在哪裡' : 'Rough location'}
                    optional={zh ? '選填 · 只到區域' : 'optional · region only'}
                    options={zh ? REGION_ZH : REGION_EN}
                    value={region}
                    onPick={setRegion}
                  />
                  <View style={styles.fieldGroup}>
                    <View style={styles.labelRow}>
                      <Text style={[styles.fieldLabel, { color: p.ink }]}>
                        {zh ? '留給夜閣的一句話' : 'One line for the Loft'}
                      </Text>
                      <Text style={[styles.optional, { color: p.muted }]}>{zh ? '選填' : 'optional'}</Text>
                    </View>
                    <TextInput
                      value={line}
                      onChangeText={setLine}
                      onFocus={() => setLineFocused(true)}
                      onBlur={() => setLineFocused(false)}
                      placeholder={zh ? '例：「我想遇見一個願意好好說話的人。」' : 'e.g. “I want to meet someone who can really talk.”'}
                      placeholderTextColor={p.muted}
                      maxLength={80}
                      returnKeyType="done"
                      style={[
                        styles.lineInput,
                        {
                          backgroundColor: p.surface,
                          borderColor: lineFocused ? p.accent : p.line,
                          borderWidth: lineFocused ? 1.2 : 0.7,
                          color: p.ink,
                        },
                      ]}
                    />
                    <Text style={[styles.characterCount, { color: p.muted }]}>{line.length}/80</Text>
                  </View>
                  <View style={[styles.trustNote, { backgroundColor: p.accentSoft, borderColor: p.accent + '35' }]}>
                    <Text style={[styles.trustText, { color: p.inkSoft }]}>
                      {zh
                        ? '燭影私語限年滿 18 歲使用。你的年齡區間與配對資料會安全儲存，且不會顯示真實身分。'
                        : 'Candle Whisper is for adults 18+. Your age range and matching profile are stored securely without revealing your real identity.'}
                    </Text>
                  </View>
                </>
              )}
            </ScrollView>

            <View style={[styles.footer, { borderTopColor: p.line, backgroundColor: p.bgSolid + 'F2' }]}>
              {step > 0 ? (
                <TouchableOpacity
                  accessibilityRole="button"
                  onPress={() => goToStep((step - 1) as ProfileStep)}
                  style={[styles.backButton, { borderColor: p.line, backgroundColor: p.surface }]}
                >
                  <Text style={[styles.backText, { color: p.muted }]}>{zh ? '上一步' : 'Back'}</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityState={{ disabled: !stepReady }}
                onPress={handlePrimary}
                disabled={!stepReady || saving}
                activeOpacity={stepReady ? 0.85 : 1}
                style={[
                  styles.primaryButton,
                  {
                    flex: step > 0 ? 1 : undefined,
                    width: step > 0 ? undefined : '100%',
                    backgroundColor: stepReady ? p.ink : p.surface,
                    borderColor: p.line,
                  },
                ]}
              >
                <Text style={[
                  styles.primaryText,
                  { color: stepReady ? (p.dark ? '#1a1530' : '#fff') : p.muted },
                ]}>
                  {saving
                    ? (zh ? '正在準備你的夜晚⋯' : 'Preparing your night…')
                    : step === 2
                      ? (zh ? '完成，開始今晚' : 'Finish and begin')
                      : (zh ? `繼續 · ${STEPS[step + 1].zh}` : `Continue · ${STEPS[step + 1].en}`)}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </VaporBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  shell: { flex: 1, width: '100%', maxWidth: 560, alignSelf: 'center' },
  progressHeader: { marginHorizontal: 16, marginTop: 10, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 14, borderRadius: 18, borderWidth: 1, shadowColor: '#6f4054', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 18, elevation: 2 },
  progressCopy: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepCount: { fontFamily: 'Inter-Regular', fontSize: 11, letterSpacing: 1 },
  progressBars: { flexDirection: 'row', gap: 7, marginTop: 12 },
  progressBar: { flex: 1, height: 3, borderRadius: 3 },
  scrollView: { flex: 1 },
  scroll: { paddingHorizontal: 24, paddingTop: 18, paddingBottom: 30 },
  title: { fontFamily: 'NotoSerifTC-Regular', fontSize: 28, lineHeight: 39, marginTop: 8 },
  sub: { fontFamily: 'NotoSerifTC-Regular', fontSize: 13.5, lineHeight: 22, marginTop: 8 },
  fieldGroup: { marginTop: 28 },
  labelRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  fieldLabel: { fontFamily: 'NotoSerifTC-Regular', fontSize: 15, lineHeight: 22 },
  optional: { fontFamily: 'Inter-Regular', fontSize: 10, letterSpacing: 0.5 },
  chips: { marginTop: 11, flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  chip: { paddingVertical: 11, paddingHorizontal: 16, borderRadius: 999, minHeight: 44, justifyContent: 'center' },
  chipText: { fontFamily: 'NotoSerifTC-Regular', fontSize: 13, lineHeight: 20 },
  genderRow: { flexDirection: 'row', gap: 9, marginTop: 11 },
  genderCard: { flex: 1, minHeight: 58, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6, shadowColor: '#6f4054', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 2 },
  genderText: { fontFamily: 'NotoSerifTC-Regular', fontSize: 13.5, textAlign: 'center' },
  trustNote: { marginTop: 28, padding: 14, borderRadius: 16, borderWidth: 0.7 },
  trustText: { fontFamily: 'NotoSerifTC-Regular', fontSize: 12.5, lineHeight: 21 },
  lineInput: { marginTop: 11, paddingHorizontal: 14, paddingVertical: 13, borderRadius: 14, fontFamily: 'NotoSerifTC-Regular', fontSize: 14 },
  characterCount: { fontFamily: 'Inter-Regular', fontSize: 10, textAlign: 'right', marginTop: 5 },
  footer: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 14, borderTopWidth: StyleSheet.hairlineWidth },
  backButton: { height: 54, minWidth: 94, borderRadius: 999, borderWidth: 0.7, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  backText: { fontFamily: 'NotoSerifTC-Regular', fontSize: 14 },
  primaryButton: { height: 54, borderRadius: 999, borderWidth: 0.7, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  primaryText: { fontFamily: 'NotoSerifTC-Regular', fontSize: 15, fontWeight: '500', letterSpacing: 0.5, textAlign: 'center' },
});
