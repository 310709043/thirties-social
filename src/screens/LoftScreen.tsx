import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import { LOFT_PALETTE } from '../lib/theme';
import { t, tAlt } from '../lib/copy';
import { WickGlyph, Cap, Flame, LoftTransition, AnimatedNumber } from '../components/ui';
import { useAppStore, canEnterLoft, recordLoftEntry, loftEntryIsFreeTrial, getTier } from '../hooks/useAppStore';
import { enterLoft, fetchTonightLoftSessions, DbLoftSession, createLoftConversation, isLoftOpen, postRitualResponse, subscribeToTonightRitual, DbRitualResponse } from '../lib/db';
import { getTonightRitual } from '../lib/rituals';
import { TextInput } from 'react-native';
import { getLoftName } from '../lib/identity';
import { hapticMedium, hapticWarning } from '../lib/haptics';
import { hasLoftPin, verifyLoftPin, setLoftPin, clearLoftPin } from '../lib/loftLock';

type Props = NativeStackScreenProps<RootStackParamList, 'Loft'>;

const L = LOFT_PALETTE;

const BROKE_LINES = [
  { zh: '燭芯都沒有，就想進來取暖？', en: 'Not even a wick, and you want the warmth?' },
  { zh: '夜閣的門很重。誠意太輕，推不開。', en: 'This door is heavy. Light intentions won\'t move it.' },
  { zh: '想被想念，先點得起一根燭。', en: 'To be wanted, first afford a candle.' },
  { zh: '這裡不施捨浪漫。', en: 'Romance is not given away here.' },
];

export default function LoftScreen({ navigation }: Props) {
  const { lang, wicks, seed, vigil } = useAppStore();
  const [inside, setInside] = useState(false);
  const [entering, setEntering] = useState(false);
  const [showBroke, setShowBroke] = useState(false);
  const [brokeLine] = useState(() => BROKE_LINES[Math.floor(Math.random() * BROKE_LINES.length)]);
  // Optional Loft PIN lock.
  const [pinMode, setPinMode] = useState<'none' | 'enter' | 'set'>('none');
  const [pinInput, setPinInput] = useState('');
  const [pinErr, setPinErr] = useState(false);
  const [hasPin, setHasPin] = useState(false);
  useEffect(() => { hasLoftPin().then(setHasPin); }, []);

  // The actual entry (free-trial confirm + create the session). Gated by PIN.
  const runEntry = async () => {
    if (loftEntryIsFreeTrial()) {
      const go = await new Promise<boolean>(resolve => {
        Alert.alert(
          lang === 'en' ? 'Use your free entry?' : '使用免費體驗？',
          lang === 'en'
            ? 'This is your one free taste of the Loft. Entering now uses it up.'
            : '這是你唯一的一次夜閣免費體驗，進入後就會用掉。確定現在進入嗎？',
          [
            { text: lang === 'en' ? 'Not yet' : '再想想', style: 'cancel', onPress: () => resolve(false) },
            { text: lang === 'en' ? 'Enter' : '進入', onPress: () => resolve(true) },
          ],
        );
      });
      if (!go) return;
    }
    const nightName = getLoftName(seed, lang);
    const result = await enterLoft(nightName);
    if (result.ok) {
      await recordLoftEntry();
      hapticMedium();
      setEntering(true);
    } else if (result.error === 'already_entered_tonight') {
      setShowBroke(true);
    } else {
      hapticWarning();
      Alert.alert(
        lang === 'en' ? 'Something went wrong' : '出了點問題',
        lang === 'en' ? 'Could not enter the Loft. Please try again.' : '無法進入夜閣。請再試一次。',
        [{ text: 'OK', style: 'cancel' }],
      );
    }
  };

  // The Loft is a Vigil space; a free user gets one lifetime free entry.
  const handleEnter = async () => {
    const tier = getTier();
    // Guests can't enter at all.
    if (tier === 'guest') {
      hapticWarning();
      Alert.alert(
        lang === 'en' ? 'The Loft is for members' : '夜閣需要帳號',
        lang === 'en'
          ? 'Create an account to step into the Loft.'
          : '夜閣是深夜的陪伴空間，註冊帳號即可體驗。',
        [
          { text: lang === 'en' ? 'Not now' : '稍後', style: 'cancel' },
          { text: lang === 'en' ? 'Sign up' : '註冊', onPress: () => navigation.push('Upgrade') },
        ],
      );
      return;
    }
    // Free user who has spent their lifetime free entry → upgrade prompt.
    if (!canEnterLoft()) {
      hapticWarning();
      Alert.alert(
        lang === 'en' ? 'Free entry used' : '免費體驗已用完',
        lang === 'en'
          ? 'You have used your free taste of the Loft. Go Vigil for unlimited late-night entry.'
          : '你的夜閣免費體驗已經用過了。升級守夜人即可無限進入深夜空間。',
        [
          { text: lang === 'en' ? 'Not now' : '稍後', style: 'cancel' },
          { text: lang === 'en' ? 'Upgrade' : '升級守夜人', onPress: () => navigation.push('Upgrade') },
        ],
      );
      return;
    }
    if (!isLoftOpen()) {
      hapticWarning();
      Alert.alert(
        lang === 'en' ? 'The Loft is closed' : '夜閣還沒開',
        lang === 'en'
          ? 'Weekdays: open 13:00–07:00 (next day). Weekends: open all day.'
          : '平日 13:00 開到翌日 07:00；假日全天開放。',
        [{ text: 'OK', style: 'cancel' }],
      );
      return;
    }
    // If a PIN lock is set, ask for it before entering; otherwise enter directly.
    if (await hasLoftPin()) {
      setPinInput(''); setPinErr(false); setPinMode('enter');
    } else {
      runEntry();
    }
  };

  const manageLock = () => {
    if (hasPin) {
      Alert.alert(
        lang === 'en' ? 'Loft lock' : '夜閣密碼鎖',
        lang === 'en' ? 'A PIN is set for the Loft.' : '夜閣已設定密碼。',
        [
          { text: lang === 'en' ? 'Change' : '變更', onPress: () => { setPinInput(''); setPinErr(false); setPinMode('set'); } },
          { text: lang === 'en' ? 'Remove' : '移除', style: 'destructive', onPress: async () => { await clearLoftPin(); setHasPin(false); } },
          { text: lang === 'en' ? 'Cancel' : '取消', style: 'cancel' },
        ],
      );
    } else {
      setPinInput(''); setPinErr(false); setPinMode('set');
    }
  };

  const submitPin = async () => {
    if (pinMode === 'set') {
      if (pinInput.length < 4) { setPinErr(true); return; }
      await setLoftPin(pinInput);
      setHasPin(true); setPinMode('none'); setPinInput('');
      hapticMedium();
      return;
    }
    // enter mode
    if (await verifyLoftPin(pinInput)) {
      setPinMode('none'); setPinInput('');
      runEntry();
    } else {
      setPinErr(true); setPinInput('');
      hapticWarning();
    }
  };

  if (inside) {
    return <LoftInside lang={lang} wicks={wicks} onBack={() => setInside(false)}
      onEnter={(otherSeed: string, loftConversationId: string, otherName: string, enteredAt?: any) => {
        const sessionEnteredAt = enteredAt?.toDate?.()?.getTime?.() ?? Date.now();
        navigation.push('LoftChat', { otherSeed, loftConversationId, otherName, sessionEnteredAt });
      }} />;
  }

  return (
    <LinearGradient colors={L.bg as any} style={{ flex: 1 }}>
      {/* Ambient glow */}
      <View style={{
        position: 'absolute', top: '10%', alignSelf: 'center',
        width: 380, height: 380,
        borderRadius: 190,
        backgroundColor: 'rgba(232,165,87,0.25)',
        opacity: 0.7,
      }} />

      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.container}>
          {/* Back + Loft lock */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={{ paddingVertical: 4 }}>
              <Text style={{ fontFamily: 'EBGaramond-Italic', fontSize: 13, color: L.muted, letterSpacing: 1 }}>
                ← {lang === 'en' ? 'back to the daylight' : '回到白天'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={manageLock} style={{ paddingVertical: 4, paddingHorizontal: 6 }}>
              <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 12, color: hasPin ? L.candle : L.muted }}>
                {hasPin ? (lang === 'en' ? '🔒 locked' : '🔒 已上鎖') : (lang === 'en' ? '🔓 set PIN' : '🔓 設定密碼')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Flame */}
          <View style={{ alignItems: 'center', marginTop: 18 }}>
            <Flame size={56} />
          </View>

          {/* Title */}
          <View style={{ alignItems: 'center', marginTop: 20 }}>
            <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 44, fontWeight: '300', color: L.ink, letterSpacing: 8 }}>
              {t('loftName', lang)}
            </Text>
            <Text style={{ fontFamily: 'EBGaramond-Italic', fontSize: 16, color: L.candle, marginTop: 8, letterSpacing: 3 }}>
              — {tAlt('loftName', lang)} —
            </Text>
          </View>

          {/* Tagline */}
          <View style={{ marginTop: 36, paddingHorizontal: 12, flex: 1 }}>
            <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 22, lineHeight: 38, color: L.ink, fontWeight: '300', letterSpacing: 1, textAlign: 'center' }}>
              {t('loftTagline', lang)}
            </Text>
            <Text style={{ fontFamily: 'EBGaramond-Italic', fontSize: 14, color: L.muted, lineHeight: 24, textAlign: 'center', marginTop: 14 }}>
              {tAlt('loftTagline', lang)}
            </Text>
            <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 14, lineHeight: 26, color: L.inkSoft, marginTop: 26, textAlign: 'center', letterSpacing: 1 }}>
              {t('loftSub', lang)}
            </Text>
          </View>

          {/* Consent box */}
          <View style={[styles.consentBox, { backgroundColor: 'rgba(232,165,87,0.05)', borderColor: 'rgba(232,165,87,0.2)' }]}>
            <Text style={{ fontFamily: 'Inter-Regular', fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', color: L.candle, marginBottom: 8 }}>
              {t('loftConsent', lang)}
            </Text>
            <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 14, color: L.ink, lineHeight: 24 }}>
              {t('loftLine1', lang)}
            </Text>
            <Text style={{ fontFamily: 'EBGaramond-Italic', fontSize: 11.5, color: L.muted, marginTop: 6, lineHeight: 18 }}>
              {t('loftLine2', lang)}
            </Text>
          </View>

          {/* Enter button */}
          <TouchableOpacity onPress={handleEnter} activeOpacity={0.85}
            style={[styles.enterBtn]}>
            <LinearGradient colors={['#e8a557', '#c25a3b']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={[StyleSheet.absoluteFill, { borderRadius: 999 }]} />
            <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 17, fontWeight: '500', letterSpacing: 3, color: '#1f1014', zIndex: 1 }}>
              {t('loftAgree', lang)}
            </Text>
            <View style={{ width: 1, height: 20, backgroundColor: 'rgba(31,16,20,0.3)', zIndex: 1 }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, zIndex: 1 }}>
              <WickGlyph size={11} color="#1f1014" />
              <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 13, color: '#1f1014' }}>
                {vigil
                  ? (lang === 'en' ? 'Unlimited tonight' : '今晚無限')
                  : (lang === 'en' ? 'Free · 1 entry tonight' : '免費 · 今晚 1 次')}
              </Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ alignItems: 'center', paddingTop: 14 }}>
            <Text style={{ fontFamily: 'EBGaramond-Italic', fontSize: 13, color: L.muted }}>
              {t('loftBack', lang)}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Broke sheet — shown when free user already entered tonight */}
      {showBroke && (
        <View style={styles.brokeOverlay}>
          <View style={styles.brokeCard}>
            <View style={{ width: 40, height: 56, alignSelf: 'center', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 18 }}>
              <View style={{ width: 8, height: 32, borderRadius: 2, backgroundColor: 'rgba(245,226,196,0.35)' }} />
              <View style={{ width: 28, height: 3, borderRadius: 2, backgroundColor: 'rgba(232,165,87,0.12)', marginTop: 2 }} />
            </View>
            <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 19, color: '#f5e2c4', lineHeight: 30, letterSpacing: 1, textAlign: 'center' }}>
              {vigil
                ? (lang === 'en' ? 'You have entered tonight.' : '你今晚已經進入過了。')
                : (lang === 'en' ? 'Free entry used. Upgrade for unlimited.' : '免費次數已用完。升級享無限通行。')}
            </Text>
            <Text style={{ fontFamily: 'EBGaramond-Italic', fontSize: 12, color: 'rgba(245,226,196,0.5)', marginTop: 8, textAlign: 'center' }}>
              {vigil
                ? (lang === 'en' ? 'Come back tomorrow.' : '明天再來。')
                : (lang === 'en' ? 'Vigil: unlimited entries + 5 wicks/day' : '守夜：無限通行 + 每日 5 芯')}
            </Text>
            <TouchableOpacity onPress={() => { setShowBroke(false); navigation.navigate('Upgrade'); }}
              style={[styles.buyBtn]}>
              <LinearGradient colors={['#e8a557', '#c25a3b']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={[StyleSheet.absoluteFill, { borderRadius: 999 }]} />
              <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 15, fontWeight: '500', letterSpacing: 2, color: '#1f1014', zIndex: 1 }}>
                {lang === 'en' ? 'Buy wicks' : '去買燭芯'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowBroke(false)} style={{ alignItems: 'center', paddingTop: 14 }}>
              <Text style={{ fontFamily: 'EBGaramond-Italic', fontSize: 13, color: 'rgba(245,226,196,0.5)' }}>
                {lang === 'en' ? 'walk away' : '轉身離開'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {pinMode !== 'none' && (
        <View style={styles.brokeOverlay}>
          <View style={[styles.brokeCard, { gap: 14 }]}>
            <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 18, color: '#f5e2c4', textAlign: 'center' }}>
              {pinMode === 'set'
                ? (lang === 'en' ? 'Set a Loft PIN' : '設定夜閣密碼')
                : (lang === 'en' ? 'Enter your Loft PIN' : '輸入夜閣密碼')}
            </Text>
            <Text style={{ fontFamily: 'EBGaramond-Italic', fontSize: 12, color: 'rgba(245,226,196,0.5)', textAlign: 'center' }}>
              {pinMode === 'set'
                ? (lang === 'en' ? '4–6 digits. Only you can enter the Loft.' : '4–6 位數字。只有你進得了夜閣。')
                : (lang === 'en' ? 'So no one else can wander in.' : '別人拿到手機也進不來。')}
            </Text>
            <TextInput
              value={pinInput}
              onChangeText={(v) => { setPinInput(v.replace(/[^0-9]/g, '').slice(0, 6)); setPinErr(false); }}
              keyboardType="number-pad"
              secureTextEntry
              autoFocus
              placeholder="••••"
              placeholderTextColor="rgba(245,226,196,0.3)"
              style={{ fontFamily: 'Inter-Regular', fontSize: 24, letterSpacing: 8, color: '#f5e2c4', textAlign: 'center', backgroundColor: 'rgba(245,226,196,0.06)', borderRadius: 12, paddingVertical: 12, borderWidth: 1, borderColor: pinErr ? '#c25a3b' : 'rgba(232,165,87,0.2)' }}
            />
            {pinErr && (
              <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 12, color: '#e0a0a0', textAlign: 'center' }}>
                {pinMode === 'set' ? (lang === 'en' ? 'At least 4 digits' : '至少 4 位數') : (lang === 'en' ? 'Wrong PIN' : '密碼錯誤')}
              </Text>
            )}
            <TouchableOpacity onPress={submitPin} style={[styles.buyBtn]}>
              <LinearGradient colors={['#e8a557', '#c25a3b']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[StyleSheet.absoluteFill, { borderRadius: 999 }]} />
              <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 15, fontWeight: '500', letterSpacing: 2, color: '#1f1014', zIndex: 1 }}>
                {pinMode === 'set' ? (lang === 'en' ? 'Save' : '設定') : (lang === 'en' ? 'Unlock' : '解鎖')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setPinMode('none'); setPinInput(''); setPinErr(false); }} style={{ alignItems: 'center', paddingTop: 4 }}>
              <Text style={{ fontFamily: 'EBGaramond-Italic', fontSize: 13, color: 'rgba(245,226,196,0.5)' }}>{lang === 'en' ? 'cancel' : '取消'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {entering && (
        <LoftTransition lang={lang} onDone={() => { setEntering(false); setInside(true); }} />
      )}
    </LinearGradient>
  );
}

function LoftInside({ lang, wicks, onBack, onEnter }: any) {
  const { seed, identityKind } = useAppStore();
  const myName = getLoftName(seed, lang);
  const [sessions, setSessions] = React.useState<DbLoftSession[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [connecting, setConnecting] = React.useState<string | null>(null);
  const [ritual] = React.useState(() => getTonightRitual());
  const [responses, setResponses] = React.useState<DbRitualResponse[]>([]);
  const [ritualText, setRitualText] = React.useState('');
  const [posting, setPosting] = React.useState(false);
  // Viewer's own filter — no forced opposite-gender; everyone chooses who to see.
  const [genderF, setGenderF] = React.useState<'all' | 'female' | 'male' | 'nonbinary'>('all');
  const [ageF, setAgeF] = React.useState<string>('all');

  React.useEffect(() => {
    fetchTonightLoftSessions().then(s => {
      setSessions(s);
      setLoading(false);
    });
  }, []);

  React.useEffect(() => subscribeToTonightRitual(setResponses), []);

  const submitRitual = async () => {
    const c = ritualText.trim();
    if (!c || posting) return;
    setPosting(true);
    const ok = await postRitualResponse({ content: c, seed, name: myName });
    setPosting(false);
    if (ok) setRitualText('');
  };

  const handlePickPerson = async (session: DbLoftSession) => {
    if (connecting) return;
    setConnecting(session.userId);
    const conv = await createLoftConversation({
      otherUserId: session.userId,
      mySeed: seed,
      otherSeed: session.userId,
      myName,
      otherName: session.nightName,
    });
    setConnecting(null);
    if (conv) {
      onEnter(session.userId, conv.id, session.nightName, session.enteredAt);
    }
  };

  const filteredSessions = sessions.filter(s =>
    (genderF === 'all' || (s.gender ?? null) === genderF) &&
    (ageF === 'all' || (s.ageBracket ?? null) === ageF),
  );
  const tonight = filteredSessions.map(s => ({
    session: s,
    seed: s.userId,
    zh: `「${s.nightName}」`,
    en: `"${s.nightName}"`,
    who_zh: s.nightName,
    who_en: s.nightName,
  }));

  return (
    <LinearGradient colors={L.bg as any} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ flex: 1, padding: 22 }}>
          {/* TOP */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <TouchableOpacity onPress={onBack}
              style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(245,226,196,0.05)', borderWidth: 0.5, borderColor: L.line, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: L.muted, fontSize: 18 }}>‹</Text>
            </TouchableOpacity>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 18, color: L.ink, letterSpacing: 4 }}>
                {t('loftName', lang)}
              </Text>
              <Text style={{ fontFamily: 'Inter-Regular', fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', color: L.candle, marginTop: 3 }}>
                {t('loftClose', lang)}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: 'rgba(232,165,87,0.1)', borderRadius: 999 }}>
              <WickGlyph size={10} color={L.candle} />
              <AnimatedNumber value={wicks} style={{ fontFamily: 'Inter-Regular', fontSize: 11, color: L.candle }} />
            </View>
          </View>

          {/* 今夜之題 — nightly ritual */}
          <View style={{ marginTop: 22, padding: 16, borderRadius: 16, backgroundColor: 'rgba(245,226,196,0.04)', borderWidth: 0.5, borderColor: 'rgba(232,165,87,0.18)' }}>
            <Text style={{ fontFamily: 'Inter-Regular', fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: L.candle }}>
              {lang === 'en' ? "Tonight's question" : '今夜之題'}
            </Text>
            <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 16, color: L.ink, lineHeight: 26, marginTop: 8 }}>
              {lang === 'en' ? ritual.en : ritual.zh}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 }}>
              <TextInput
                value={ritualText}
                onChangeText={setRitualText}
                placeholder={lang === 'en' ? 'answer softly…' : '輕輕地回答⋯⋯'}
                placeholderTextColor={L.muted}
                maxLength={280}
                style={{ flex: 1, fontFamily: 'NotoSerifTC-Regular', fontSize: 14, color: L.ink, backgroundColor: 'rgba(245,226,196,0.05)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 }}
              />
              <TouchableOpacity onPress={submitRitual} disabled={!ritualText.trim() || posting}
                style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: ritualText.trim() ? L.candle : 'rgba(245,226,196,0.1)', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: ritualText.trim() ? '#1a1014' : L.muted, fontSize: 16 }}>↑</Text>
              </TouchableOpacity>
            </View>
            {responses.length > 0 && (
              <View style={{ marginTop: 14, gap: 10 }}>
                <Text style={{ fontFamily: 'Inter-Regular', fontSize: 10, color: L.muted }}>
                  {lang === 'en' ? `${responses.length} answered tonight` : `今晚 ${responses.length} 人回應`}
                </Text>
                {responses.slice(-3).reverse().map(r => (
                  <View key={r.id}>
                    <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 13, color: L.ink, lineHeight: 20 }}>{r.content}</Text>
                    <Text style={{ fontFamily: 'EBGaramond-Italic', fontSize: 11, color: L.muted, marginTop: 1 }}>— {r.name}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Heading */}
          <View style={{ marginTop: 24 }}>
            <Text style={{ fontFamily: 'Inter-Regular', fontSize: 10, letterSpacing: 4, textTransform: 'uppercase', color: L.candle }}>
              {t('loftPeople', lang)}
            </Text>
            <Text style={{ fontFamily: 'EBGaramond-Italic', fontSize: 12, color: L.muted, letterSpacing: 1, marginTop: 4 }}>
              {tAlt('loftPeople', lang)}
            </Text>
          </View>

          {/* Filter — you choose who to see (no forced opposite-gender) */}
          <View style={{ marginTop: 14, gap: 8 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {([['all', lang === 'en' ? 'Everyone' : '所有人'], ['female', lang === 'en' ? 'Women' : '女生'], ['male', lang === 'en' ? 'Men' : '男生'], ['nonbinary', lang === 'en' ? 'Non-binary' : '多元']] as const).map(([v, label]) => (
                <TouchableOpacity key={v} onPress={() => setGenderF(v as any)}
                  style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 0.5,
                    backgroundColor: genderF === v ? 'rgba(232,165,87,0.18)' : 'rgba(245,226,196,0.04)',
                    borderColor: genderF === v ? L.candle : L.line }}>
                  <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 13, color: genderF === v ? L.candle : L.muted }}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {['all', '18−24', '25−30', '31−35', '36−40', '41−45', '46+'].map(a => (
                  <TouchableOpacity key={a} onPress={() => setAgeF(a)}
                    style={{ paddingHorizontal: 11, paddingVertical: 5, borderRadius: 999, borderWidth: 0.5,
                      backgroundColor: ageF === a ? 'rgba(232,165,87,0.18)' : 'rgba(245,226,196,0.04)',
                      borderColor: ageF === a ? L.candle : L.line }}>
                    <Text style={{ fontFamily: 'Inter-Regular', fontSize: 12, color: ageF === a ? L.candle : L.muted }}>
                      {a === 'all' ? (lang === 'en' ? 'Any age' : '不限年齡') : a}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Listing */}
          <ScrollView style={{ marginTop: 18 }} showsVerticalScrollIndicator={false}>
            {loading ? (
              <ActivityIndicator color={L.candle} style={{ marginTop: 32 }} />
            ) : tonight.length === 0 ? (
              <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 14, color: L.muted, textAlign: 'center', marginTop: 32 }}>
                {lang === 'en' ? 'No one is in the Loft tonight' : '今晚還沒有人'}
              </Text>
            ) : (
              tonight.map(m => (
                <TouchableOpacity key={m.seed} onPress={() => handlePickPerson(m.session)} activeOpacity={0.85}
                  disabled={connecting === m.seed}
                  style={[styles.loftCard, { backgroundColor: 'rgba(245,226,196,0.04)', borderColor: 'rgba(232,165,87,0.18)' }]}>
                  {/* Veiled portrait */}
                  <View style={{ width: 60, height: 80, borderRadius: 10, backgroundColor: '#3a2028', overflow: 'hidden', flexShrink: 0 }}>
                    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.45, backgroundColor: '#7a3a4a' }} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 14.5, color: L.ink, lineHeight: 24, letterSpacing: 0.5 }}>
                      {lang === 'en' ? m.en : m.zh}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
                      <Text style={{ fontFamily: 'EBGaramond-Italic', fontSize: 11, color: L.muted, letterSpacing: 1 }}>
                        {lang === 'en' ? m.who_en : m.who_zh}
                      </Text>
                      <Text style={{ color: L.muted, opacity: 0.4 }}>·</Text>
                      <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 11, color: L.candle }}>
                        ● {lang === 'en' ? 'open' : '門開'}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>

          <Text style={{ fontFamily: 'EBGaramond-Italic', fontSize: 11, color: L.faint, textAlign: 'center', lineHeight: 18, marginTop: 14 }}>
            {t('loftLine1', lang)} · {t('loftLine2', lang)}
          </Text>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, padding: 28, paddingBottom: 32 },
  consentBox:   { padding: 14, borderRadius: 12, borderWidth: 0.5, marginBottom: 18 },
  enterBtn:     { height: 60, borderRadius: 999, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, overflow: 'hidden' },
  brokeOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(11,6,8,0.8)', alignItems: 'center', justifyContent: 'center', padding: 32 },
  brokeCard:    { width: '100%', backgroundColor: '#1f1014', borderWidth: 0.5, borderColor: 'rgba(232,165,87,0.3)', borderRadius: 24, padding: 26 },
  buyBtn:       { height: 52, borderRadius: 999, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 20, overflow: 'hidden' },
  loftCard:     { flexDirection: 'row', gap: 16, padding: 14, borderWidth: 0.5, borderRadius: 18, marginBottom: 12 },
});
