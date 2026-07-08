import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Alert, Image,
  Animated, Easing, Dimensions, KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import { LOFT_PALETTE } from '../lib/theme';
import { t, tAlt } from '../lib/copy';
import { WickGlyph, Cap, Flame, LoftTransition, AnimatedNumber, PressableScale } from '../components/ui';
import { useAppStore, canEnterLoft, recordLoftEntry, loftEntryIsFreeTrial, getTier } from '../hooks/useAppStore';
import { enterLoft, fetchTonightLoftSessions, DbLoftSession, createLoftConversation, isLoftOpen, postRitualResponse, subscribeToTonightRitual, DbRitualResponse, fetchMyTonightLoftWhispers, DbLoftWhisper, localNightDate } from '../lib/db';
import { getTonightRitual } from '../lib/rituals';
import { TextInput } from 'react-native';
import { getLoftName } from '../lib/identity';
import { hapticMedium, hapticWarning } from '../lib/haptics';
import { filterMessage } from '../lib/filter';
import { hasLoftPin, verifyLoftPin, setLoftPin, clearLoftPin } from '../lib/loftLock';
import { pickImage, uploadLoftPhoto } from '../lib/photos';
import AsyncStorage from '@react-native-async-storage/async-storage';

// A heavy Cloudinary blur — the Loft only ever shows a fogged hint of a face.
const loftBlur = (url: string) =>
  url.includes('/image/upload/') ? url.replace('/image/upload/', '/image/upload/e_blur:2000,q_auto/') : url;

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
  // Optional photo brought into the Loft for the night (others see it blurred).
  const [loftPhotoUri, setLoftPhotoUri] = useState<string | null>(null);
  const [loftPhoto, setLoftPhoto] = useState<{ url: string; publicId: string } | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  // Optional Loft PIN lock.
  const [pinMode, setPinMode] = useState<'none' | 'enter' | 'set'>('none');
  const [pinInput, setPinInput] = useState('');
  const [pinErr, setPinErr] = useState(false);
  const [hasPin, setHasPin] = useState(false);
  useEffect(() => { hasLoftPin().then(setHasPin); }, []);

  // The actual entry (free-trial confirm + create the session). Gated by PIN.
  const runEntry = async (isReEntry = false) => {
    if (!isReEntry && loftEntryIsFreeTrial()) {
      const go = await new Promise<boolean>(resolve => {
        Alert.alert(
          lang === 'en' ? 'Use your free entry?' : '使用本週免費體驗？',
          lang === 'en'
            ? 'This is your free Loft visit for the week. Entering now uses it up — tonight you can come and go freely.'
            : '這是你本週的一次夜閣免費體驗，進入後這週就用掉了（今晚可自由進出）。確定現在進入嗎？',
          [
            { text: lang === 'en' ? 'Not yet' : '再想想', style: 'cancel', onPress: () => resolve(false) },
            { text: lang === 'en' ? 'Enter' : '進入', onPress: () => resolve(true) },
          ],
        );
      });
      if (!go) return;
    }
    const nightName = getLoftName(seed, lang);
    const result = await enterLoft(nightName, loftPhoto);
    if (result.ok) {
      // Only a FRESH visit consumes the weekly free entry — walking back in
      // tonight (result.reused) is free. Remember tonight locally so the
      // upgrade gate lets re-entries straight through.
      if (!result.reused) await recordLoftEntry();
      AsyncStorage.setItem('loftNightEntered', localNightDate()).catch(() => {});
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

  // Bring a photo into the Loft. It's uploaded now (so entry is instant) and
  // others only ever see a heavily blurred version; it's purged after the night.
  const pickLoftPhoto = async () => {
    if (uploadingPhoto) return;
    const uri = await pickImage();
    if (!uri) return;
    setLoftPhotoUri(uri);
    setUploadingPhoto(true);
    const up = await uploadLoftPhoto(uri);
    setUploadingPhoto(false);
    if (up) {
      setLoftPhoto(up);
      hapticMedium();
    } else {
      setLoftPhotoUri(null);
      hapticWarning();
      Alert.alert(
        lang === 'en' ? 'Upload failed' : '上傳失敗',
        lang === 'en' ? 'Could not upload the photo. You can still enter without one.' : '照片上傳失敗，你仍然可以不帶照片進入。',
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
          // Straight to account creation — Upgrade is a paywall, not a sign-up.
          { text: lang === 'en' ? 'Sign up' : '註冊', onPress: () => navigation.push('Auth', { mode: 'register' }) },
        ],
      );
      return;
    }
    // Already entered TONIGHT? Re-entry is always allowed — backing out of the
    // Loft must never cost a second entry or slam an upgrade wall the same night.
    const reEntry = (await AsyncStorage.getItem('loftNightEntered')) === localNightDate();
    // Free user who has spent this week's free entry → upgrade prompt.
    if (!reEntry && !canEnterLoft()) {
      hapticWarning();
      Alert.alert(
        lang === 'en' ? 'Free entry used' : '本週免費體驗已用過',
        lang === 'en'
          ? 'You have used this week\'s free Loft visit. Go Vigil for unlimited late-night entry.'
          : '你本週的夜閣免費體驗已經用過了。升級守夜人即可每晚無限進入。',
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
          ? 'The Loft opens nightly, 21:00–05:00. Come back after dark.'
          : '夜閣每晚 21:00 開到清晨 05:00。天黑之後再來。',
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
      onEnter={(otherSeed: string, loftConversationId: string, otherName: string, expiresAt?: any, otherPhotoUrl?: string | null) => {
        // Timer runs off the CONVERSATION's own 58-min window (expiresAt), not the
        // other person's Loft entry — otherwise a chat could open near-expired.
        const expiresMs = expiresAt?.toDate?.()?.getTime?.() ?? (Date.now() + 58 * 60 * 1000);
        navigation.push('LoftChat', { otherSeed, loftConversationId, otherName, expiresAt: expiresMs, otherPhotoUrl: otherPhotoUrl ?? null });
      }} />;
  }

  return (
    <LinearGradient colors={L.bg as any} style={{ flex: 1 }}>
      {/* Ambient glow — pulled higher & softer so it no longer sits behind the
          tagline text (the old 380px disc washed out everything it touched). */}
      <View style={{
        position: 'absolute', top: '4%', alignSelf: 'center',
        width: 300, height: 300,
        borderRadius: 150,
        backgroundColor: 'rgba(232,165,87,0.18)',
        opacity: 0.7,
      }} />
      {/* Drifting embers — quiet fire in the dark */}
      <Embers count={9} />

      <SafeAreaView style={{ flex: 1 }}>
        {/* Scrollable so the entry never overlaps on shorter / denser screens
            (a fixed layout let the flex tagline get squeezed and overrun the
            consent box once the optional photo row was added). */}
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
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

          {/* Tagline — natural height (no flex) so its text is never squeezed. */}
          <View style={{ marginTop: 36, paddingHorizontal: 12 }}>
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

          {/* Flexible spacer: pushes the consent box + button toward the bottom
              when there's room, and collapses (never overlaps) when there isn't. */}
          <View style={{ flexGrow: 1, minHeight: 24 }} />

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

          {/* Optional photo for the night — others only see a blurred hint. */}
          <TouchableOpacity onPress={pickLoftPhoto} activeOpacity={0.8} disabled={uploadingPhoto}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16, paddingHorizontal: 4 }}>
            <View style={{ width: 48, height: 48, borderRadius: 10, overflow: 'hidden', borderWidth: 0.5, borderColor: 'rgba(232,165,87,0.35)', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(232,165,87,0.06)' }}>
              {loftPhotoUri ? (
                <>
                  <Image source={{ uri: loftPhotoUri }} blurRadius={18} style={StyleSheet.absoluteFill} />
                  {uploadingPhoto ? <ActivityIndicator color={L.candle} /> : null}
                </>
              ) : (
                <Text style={{ fontSize: 22, color: L.candle }}>＋</Text>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 14, color: L.ink, letterSpacing: 0.5 }}>
                {loftPhoto
                  ? (lang === 'en' ? 'Photo added · tap to change' : '已加入照片 · 點擊更換')
                  : (lang === 'en' ? 'Bring a photo tonight (optional)' : '帶一張照片進來（選填）')}
              </Text>
              <Text style={{ fontFamily: 'EBGaramond-Italic', fontSize: 11.5, color: L.muted, marginTop: 3, lineHeight: 17 }}>
                {lang === 'en' ? 'Others only see a blurred hint · gone by dawn' : '別人只會看到模糊的你 · 天亮後刪除'}
              </Text>
            </View>
          </TouchableOpacity>

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
                  : (lang === 'en' ? 'Free visit · once a week' : '免費體驗 · 每週 1 次')}
              </Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ alignItems: 'center', paddingTop: 14 }}>
            <Text style={{ fontFamily: 'EBGaramond-Italic', fontSize: 13, color: L.muted }}>
              {t('loftBack', lang)}
            </Text>
          </TouchableOpacity>
        </ScrollView>
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

/**
 * Drifting embers — tiny warm sparks that rise and fade on a loop, giving the
 * Loft's dark screens a live fire feel without costing real GPU time (a handful
 * of native-driver opacity/translate loops).
 */
function Embers({ count = 8 }: { count?: number }) {
  const { width: W, height: H } = Dimensions.get('window');
  const embers = useRef(
    Array.from({ length: count }, (_, i) => ({
      x: (i + 0.5) / count * W + (Math.random() - 0.5) * 40,
      size: 2 + Math.random() * 3.5,
      delay: Math.random() * 6000,
      duration: 7000 + Math.random() * 6000,
      drift: (Math.random() - 0.5) * 60,
      progress: new Animated.Value(0),
    })),
  ).current;

  useEffect(() => {
    const loops = embers.map(e =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(e.delay),
          Animated.timing(e.progress, { toValue: 1, duration: e.duration, easing: Easing.linear, useNativeDriver: true }),
          Animated.timing(e.progress, { toValue: 0, duration: 0, useNativeDriver: true }),
        ]),
      ),
    );
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {embers.map((e, i) => (
        <Animated.View key={i} style={{
          position: 'absolute', left: e.x, bottom: -10,
          width: e.size, height: e.size, borderRadius: e.size,
          backgroundColor: '#e8a557',
          opacity: e.progress.interpolate({ inputRange: [0, 0.1, 0.7, 1], outputRange: [0, 0.8, 0.4, 0] }),
          transform: [
            { translateY: e.progress.interpolate({ inputRange: [0, 1], outputRange: [0, -H * 0.75] }) },
            { translateX: e.progress.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, e.drift, e.drift * 0.4] }) },
          ],
        }} />
      ))}
    </View>
  );
}

/** Soft relative time for ritual answers — "剛剛 / N 分鐘前 / N 小時前". */
function ritualAgo(ms: number, lang: string): string {
  const min = Math.floor((Date.now() - ms) / 60000);
  if (min < 1) return lang === 'en' ? 'just now' : '剛剛';
  if (min < 60) return lang === 'en' ? `${min}m ago` : `${min} 分鐘前`;
  const hr = Math.floor(min / 60);
  return lang === 'en' ? `${hr}h ago` : `${hr} 小時前`;
}

function LoftInside({ lang, wicks, onBack, onEnter }: any) {
  const { seed, identityKind } = useAppStore();
  const myName = getLoftName(seed, lang);
  const [sessions, setSessions] = React.useState<DbLoftSession[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [connecting, setConnecting] = React.useState<string | null>(null);
  // Whispers already burning tonight (mine, both directions) + how many
  // messages I'd seen in each — the delta is the unread ember.
  const [whispers, setWhispers] = React.useState<DbLoftWhisper[]>([]);
  const [seenCounts, setSeenCounts] = React.useState<Record<string, number>>({});
  const [ritual] = React.useState(() => getTonightRitual());
  const [responses, setResponses] = React.useState<DbRitualResponse[]>([]);
  const [ritualText, setRitualText] = React.useState('');
  const [posting, setPosting] = React.useState(false);
  // Gender is the only filter — age now shows on each card instead (choosing an
  // exact age range in a small nightly pool mostly produced an empty list, and
  // the old chips compared '18−24' (unicode minus) against '18-24' in the DB,
  // so they never matched anything anyway).
  const [genderF, setGenderF] = React.useState<'all' | 'female' | 'male'>('all');

  // First time inside the Loft: a one-time, quiet guide to the few mechanics the
  // entry/consent screen doesn't teach (the ritual, picking someone, paid closeness).
  const [showLoftGuide, setShowLoftGuide] = React.useState(false);
  React.useEffect(() => { AsyncStorage.getItem('loftGuideSeen').then(v => { if (v !== '1') setShowLoftGuide(true); }); }, []);
  const dismissLoftGuide = () => { setShowLoftGuide(false); AsyncStorage.setItem('loftGuideSeen', '1'); };

  React.useEffect(() => {
    let alive = true;
    const load = () => {
      fetchTonightLoftSessions().then(s => {
        if (!alive) return;
        setSessions(s);
        setLoading(false);
      });
      // Ongoing whispers ride the same poll: this is how the person who was
      // PICKED ever learns a conversation exists (and how anyone re-enters).
      fetchMyTonightLoftWhispers().then(async ws => {
        if (!alive) return;
        setWhispers(ws);
        const entries = await Promise.all(ws.map(async w => {
          const v = await AsyncStorage.getItem(`loftSeen:${w.id}`);
          return [w.id, Number(v ?? 0)] as const;
        }));
        if (alive) setSeenCounts(Object.fromEntries(entries));
      });
    };
    load();
    // Re-poll so people who arrive after you actually show up (a one-shot fetch
    // made the Loft feel empty). 25s keeps reads bounded.
    const id = setInterval(load, 25000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  React.useEffect(() => subscribeToTonightRitual(setResponses), []);

  const submitRitual = async () => {
    const c = ritualText.trim();
    if (!c || posting) return;
    // The ritual answer is broadcast to everyone in the Loft, so it must pass the
    // same content filter as chat messages.
    const check = filterMessage(c);
    if (check.blocked) {
      hapticWarning();
      Alert.alert(
        lang === 'en' ? 'Not tonight' : '這句話留著吧',
        lang === 'en' ? 'This answer contains content that may harm others.' : '這則回答包含可能傷害他人的內容，換個說法吧。',
        [{ text: 'OK', style: 'cancel' }],
      );
      return;
    }
    setPosting(true);
    const ok = await postRitualResponse({ content: c, seed, name: myName });
    setPosting(false);
    if (ok) setRitualText('');
  };

  const handlePickPerson = async (session: DbLoftSession) => {
    if (connecting) return;
    // Already whispering with them tonight (either of us opened it) → walk
    // straight back into the same room instead of creating anything.
    const ongoing = whispers.find(w => w.otherId === session.userId);
    if (ongoing) {
      onEnter(ongoing.otherId, ongoing.id, ongoing.otherName || session.nightName, ongoing.expiresAt, session.photoUrl);
      return;
    }
    setConnecting(session.userId);
    let conv = null;
    try {
      conv = await createLoftConversation({
        otherUserId: session.userId,
        mySeed: seed,
        otherSeed: session.userId,
        myName,
        otherName: session.nightName,
      });
    } catch (e) {
      console.warn('[Loft] handlePickPerson createLoftConversation threw:', e);
    }
    setConnecting(null);
    if (conv) {
      onEnter(session.userId, conv.id, session.nightName, conv.expiresAt, session.photoUrl);
    } else {
      // Don't fail silently — a null means the conversation couldn't be created
      // (permission/network). Surfacing it tells us (and the user) something's wrong
      // instead of a dead tap.
      hapticWarning();
      Alert.alert(
        lang === 'en' ? 'Could not open' : '無法開啟',
        lang === 'en' ? 'Could not start this whisper. Please try again.' : '暫時無法開啟這段對話，請再試一次。',
        [{ text: 'OK', style: 'cancel' }],
      );
    }
  };

  const filteredSessions = sessions.filter(s =>
    (genderF === 'all' || (s.gender ?? null) === genderF),
  );
  // Latest tonight-ritual answer per person, so a card can show their own words
  // (a far stronger invitation to tap than a bare name) — no extra query, both
  // sessions and responses are already subscribed.
  const answerByUser = React.useMemo(() => {
    const m = new Map<string, DbRitualResponse>();
    for (const r of responses) {
      const prev = m.get(r.userId);
      if (!prev || (r.createdAt?.toMillis?.() ?? 0) > (prev.createdAt?.toMillis?.() ?? 0)) m.set(r.userId, r);
    }
    return m;
  }, [responses]);

  const tonight = filteredSessions.map(s => ({
    session: s,
    seed: s.userId,
    zh: `「${s.nightName}」`,
    en: `"${s.nightName}"`,
    who_zh: s.nightName,
    who_en: s.nightName,
    answer: answerByUser.get(s.userId) ?? null,
  }));

  return (
    <LinearGradient colors={L.bg as any} style={{ flex: 1 }}>
      <Embers count={6} />
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView behavior="padding" style={{ flex: 1, padding: 22 }}>
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

          {/* Ongoing whispers — conversations already burning tonight. Without
              this, the picked person had NO way to see a whisper existed. */}
          {whispers.length > 0 && (
            <View style={{ marginTop: 20 }}>
              <Text style={{ fontFamily: 'Inter-Regular', fontSize: 10, letterSpacing: 4, textTransform: 'uppercase', color: L.candle }}>
                {lang === 'en' ? 'Tonight’s whispers' : '今晚的悄悄話'}
              </Text>
              {whispers.map(w => {
                const unread = w.messageCount > (seenCounts[w.id] ?? 0);
                const minsLeft = Math.max(0, Math.ceil(((w.expiresAt?.toMillis?.() ?? 0) - Date.now()) / 60000));
                const photoUrl = sessions.find(s => s.userId === w.otherId)?.photoUrl ?? null;
                return (
                  <PressableScale key={w.id} onPress={() => onEnter(w.otherId, w.id, w.otherName, w.expiresAt, photoUrl)}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, marginTop: 10, borderRadius: 16, borderWidth: 0.5, borderColor: unread ? 'rgba(232,165,87,0.45)' : 'rgba(232,165,87,0.18)', backgroundColor: unread ? 'rgba(232,165,87,0.10)' : 'rgba(245,226,196,0.04)' }}>
                      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: unread ? L.candle : 'rgba(245,226,196,0.18)' }} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 14.5, color: L.ink, letterSpacing: 0.5 }}>
                          「{w.otherName}」
                        </Text>
                        <Text style={{ fontFamily: 'EBGaramond-Italic', fontSize: 11.5, color: unread ? L.candle : L.muted, marginTop: 2 }}>
                          {unread
                            ? (lang === 'en' ? 'new words are waiting' : '有新的話在等你')
                            : (lang === 'en' ? `${w.messageCount} lines tonight` : `今晚說了 ${w.messageCount} 句`)}
                          {' · '}
                          {lang === 'en' ? `fades in ${minsLeft}m` : `${minsLeft} 分鐘後熄滅`}
                        </Text>
                      </View>
                      <Text style={{ color: L.candle, fontSize: 18, opacity: 0.5 }}>›</Text>
                    </View>
                  </PressableScale>
                );
              })}
            </View>
          )}

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
            {/* wrap so the four chips never overflow / get clipped on narrow screens */}
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              {([['all', lang === 'en' ? 'Everyone' : '所有人'], ['female', lang === 'en' ? 'Women' : '女生'], ['male', lang === 'en' ? 'Men' : '男生']] as const).map(([v, label]) => (
                <TouchableOpacity key={v} onPress={() => setGenderF(v as any)} activeOpacity={0.8}
                  style={{ paddingHorizontal: 13, paddingVertical: 6, borderRadius: 999,
                    borderWidth: genderF === v ? 1 : 0.5,
                    backgroundColor: genderF === v ? 'rgba(232,165,87,0.22)' : 'rgba(245,226,196,0.04)',
                    borderColor: genderF === v ? L.candle : L.line,
                    // selected chip lifts forward with a soft candle glow
                    transform: [{ scale: genderF === v ? 1.07 : 1 }],
                    shadowColor: L.candle, shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: genderF === v ? 0.55 : 0, shadowRadius: genderF === v ? 9 : 0,
                    elevation: genderF === v ? 6 : 0 }}>
                  <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 13,
                    fontWeight: genderF === v ? '500' : '400',
                    color: genderF === v ? L.candle : L.muted }}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Listing */}
          <ScrollView style={{ marginTop: 18 }} showsVerticalScrollIndicator={false}>
            {loading ? (
              <ActivityIndicator color={L.candle} style={{ marginTop: 32 }} />
            ) : tonight.length === 0 ? (
              <View style={{ alignItems: 'center', marginTop: 40, gap: 14 }}>
                <Flame size={34} />
                <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 15, color: L.ink, textAlign: 'center', letterSpacing: 1 }}>
                  {lang === 'en' ? 'No one is here yet tonight' : '今晚還沒有人到'}
                </Text>
                <Text style={{ fontFamily: 'EBGaramond-Italic', fontSize: 12.5, color: L.muted, textAlign: 'center', lineHeight: 20, maxWidth: 240 }}>
                  {lang === 'en' ? 'Stay a while — the room fills as the night deepens.' : '再待一會兒 — 夜越深，這裡的人越多。'}
                </Text>
              </View>
            ) : (
              tonight.map(m => (
                <PressableScale key={m.seed} onPress={() => handlePickPerson(m.session)}
                  disabled={connecting === m.seed}>
                  <View style={[styles.loftCard, { backgroundColor: 'rgba(245,226,196,0.04)', borderColor: 'rgba(232,165,87,0.18)' }]}>
                    {/* Veiled portrait — a blurred hint of their photo if they
                        brought one, otherwise warm candlelit gloom + a faint figure. */}
                    <View style={{ width: 60, height: 80, borderRadius: 12, overflow: 'hidden', flexShrink: 0, borderWidth: 0.5, borderColor: 'rgba(232,165,87,0.2)' }}>
                      {m.session.photoUrl ? (
                        <>
                          {/* Double-blurred: Cloudinary transform + native blur so the
                              face is never legible even if the transform is bypassed. */}
                          <Image source={{ uri: loftBlur(m.session.photoUrl) }} blurRadius={22} style={StyleSheet.absoluteFill} />
                          <LinearGradient colors={['rgba(90,47,58,0.35)', 'rgba(36,19,24,0.55)']} start={{ x: 0.3, y: 0 }} end={{ x: 0.7, y: 1 }}
                            style={StyleSheet.absoluteFill} />
                          <View style={{ position: 'absolute', bottom: 6, alignSelf: 'center', width: 18, height: 18, borderRadius: 9, backgroundColor: 'rgba(232,165,87,0.28)' }} />
                        </>
                      ) : (
                        <>
                          <LinearGradient colors={['#5a2f3a', '#3a1f29', '#241318']} start={{ x: 0.3, y: 0 }} end={{ x: 0.7, y: 1 }}
                            style={StyleSheet.absoluteFill} />
                          {/* faint head-and-shoulders silhouette behind the veil */}
                          <View style={{ position: 'absolute', top: 16, alignSelf: 'center', width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(245,226,196,0.10)' }} />
                          <View style={{ position: 'absolute', bottom: -6, alignSelf: 'center', width: 44, height: 34, borderRadius: 22, backgroundColor: 'rgba(245,226,196,0.08)' }} />
                          {/* candle glow at the base */}
                          <View style={{ position: 'absolute', bottom: 6, alignSelf: 'center', width: 18, height: 18, borderRadius: 9, backgroundColor: 'rgba(232,165,87,0.28)' }} />
                        </>
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 14.5, color: L.ink, lineHeight: 24, letterSpacing: 0.5 }}>
                        {lang === 'en' ? m.en : m.zh}
                      </Text>
                      {/* Their own words from tonight's question — a softer, on-brand
                          invitation to tap than a status badge. Only shown if they answered. */}
                      {m.answer?.content ? (
                        <Text numberOfLines={1} style={{ fontFamily: 'EBGaramond-Italic', fontSize: 12, color: L.ink, opacity: 0.78, letterSpacing: 0.3, marginTop: 3 }}>
                          “{m.answer.content}”
                        </Text>
                      ) : null}
                      <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                        {/* Age + gender ride on the card now that the age filter is gone. */}
                        {(m.session.ageBracket || m.session.gender) && (
                          <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: 'rgba(232,165,87,0.12)', borderWidth: 0.5, borderColor: 'rgba(232,165,87,0.25)' }}>
                            <Text style={{ fontFamily: 'Inter-Regular', fontSize: 10.5, color: L.candle }}>
                              {[
                                m.session.gender === 'female' ? (lang === 'en' ? 'F' : '女') : m.session.gender === 'male' ? (lang === 'en' ? 'M' : '男') : null,
                                m.session.ageBracket ?? null,
                              ].filter(Boolean).join(' · ')}
                            </Text>
                          </View>
                        )}
                        {m.answer ? (
                          <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 11, color: L.candle }}>
                            {ritualAgo(m.answer.createdAt?.toMillis?.() ?? Date.now(), lang)}
                            {lang === 'en' ? ' · answered tonight' : ' 回答今夜之題'}
                          </Text>
                        ) : (
                          <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 11, color: L.candle }}>
                            ● {lang === 'en' ? 'open' : '門開'}
                          </Text>
                        )}
                      </View>
                    </View>
                    <Text style={{ color: L.candle, fontSize: 18, opacity: 0.5, alignSelf: 'center' }}>›</Text>
                  </View>
                </PressableScale>
              ))
            )}
          </ScrollView>

          <Text style={{ fontFamily: 'EBGaramond-Italic', fontSize: 11, color: L.faint, textAlign: 'center', lineHeight: 18, marginTop: 14 }}>
            {t('loftLine1', lang)} · {t('loftLine2', lang)}
          </Text>
        </KeyboardAvoidingView>
      </SafeAreaView>
      {showLoftGuide && <LoftGuide lang={lang} onDismiss={dismissLoftGuide} />}
    </LinearGradient>
  );
}

/**
 * One-time first-entry guide for the Loft. The entry screen sets mood + consent;
 * this names the three things a newcomer actually needs to act — kept short and
 * candlelit so it doesn't break the Loft's "no reason needed" stillness.
 */
function LoftGuide({ lang, onDismiss }: { lang: string; onDismiss: () => void }) {
  const G = LOFT_PALETTE;
  const rows = [
    {
      title: lang === 'en' ? "Tonight's question" : '今夜之題',
      desc: lang === 'en'
        ? 'Answer softly. Your words may be how someone sees you tonight.'
        : '輕輕回答一句。你的話，可能成為別人今晚看到的你。',
    },
    {
      title: lang === 'en' ? 'Choose one candle' : '挑一盞燭火',
      desc: lang === 'en'
        ? 'Tap someone to start talking. By morning, the conversation fades on its own.'
        : '點一個人開始說話。天亮前，這段對話會自己熄滅。',
    },
    {
      title: lang === 'en' ? 'Coming closer' : '想更靠近',
      desc: lang === 'en'
        ? 'Veiled photos and lifting a veil cost wicks — and only by mutual consent.'
        : '帶紗照片、掀面紗需要燭芯，而且雙方同意才會發生。',
    },
  ];
  return (
    <View style={styles.guideScrim}>
      <View style={[styles.guideCard, { backgroundColor: G.bgSolid, borderColor: G.candle + '40' }]}>
        <View style={{ alignItems: 'center', marginBottom: 6 }}>
          <WickGlyph size={18} color={G.candle} />
        </View>
        <Text style={{ fontFamily: 'NotoSerifTC-Light', fontSize: 22, letterSpacing: 2, textAlign: 'center', color: G.ink }}>
          {lang === 'en' ? 'Inside the Loft' : '進來之前'}
        </Text>
        <Text style={{ fontFamily: 'EBGaramond-Italic', fontSize: 12, color: G.muted, textAlign: 'center', marginTop: 6 }}>
          {lang === 'en' ? 'three quiet things' : '先知道三件小事'}
        </Text>
        <View style={{ marginTop: 20 }}>
          {rows.map((r, i) => (
            <View key={r.title} style={[styles.guideRow, i > 0 && { borderTopWidth: 0.5, borderTopColor: G.line }]}>
              <View style={[styles.guideDot, { borderColor: G.candle + '55' }]}>
                <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: G.candle, opacity: 0.85 }} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 15, color: G.ink, fontWeight: '500' }}>{r.title}</Text>
                <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 12.5, color: G.muted, lineHeight: 19, marginTop: 3 }}>{r.desc}</Text>
              </View>
            </View>
          ))}
        </View>
        <TouchableOpacity onPress={onDismiss} activeOpacity={0.88} style={[styles.guideEnter, { backgroundColor: G.candle }]}>
          <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 15, letterSpacing: 3, color: '#1a1014', fontWeight: '500' }}>
            {lang === 'en' ? 'Step into the night' : '走進夜色'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  guideScrim:   { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(8,4,6,0.88)', alignItems: 'center', justifyContent: 'center', padding: 30 },
  guideCard:    { width: '100%', maxWidth: 360, borderRadius: 24, borderWidth: 0.5, paddingTop: 26, paddingBottom: 22, paddingHorizontal: 24 },
  guideRow:     { flexDirection: 'row', gap: 13, alignItems: 'flex-start', paddingVertical: 13 },
  guideDot:     { width: 32, height: 32, borderRadius: 16, borderWidth: 0.5, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  guideEnter:   { height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  container:    { flexGrow: 1, padding: 28, paddingBottom: 32, width: '100%', maxWidth: 560, alignSelf: 'center' },
  consentBox:   { padding: 14, borderRadius: 12, borderWidth: 0.5, marginBottom: 18 },
  enterBtn:     { height: 60, borderRadius: 999, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, overflow: 'hidden' },
  brokeOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(11,6,8,0.8)', alignItems: 'center', justifyContent: 'center', padding: 32 },
  brokeCard:    { width: '100%', backgroundColor: '#1f1014', borderWidth: 0.5, borderColor: 'rgba(232,165,87,0.3)', borderRadius: 24, padding: 26 },
  buyBtn:       { height: 52, borderRadius: 999, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 20, overflow: 'hidden' },
  loftCard:     { flexDirection: 'row', gap: 16, padding: 14, borderWidth: 0.5, borderRadius: 18, marginBottom: 12 },
});
