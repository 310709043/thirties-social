import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import { LOFT_PALETTE } from '../lib/theme';
import { t, tAlt } from '../lib/copy';
import { WickGlyph, Cap, Flame, LoftTransition, AnimatedNumber } from '../components/ui';
import { useAppStore } from '../hooks/useAppStore';
import { enterLoft, fetchTonightLoftSessions, DbLoftSession } from '../lib/db';
import { getColorAdj } from '../lib/identity';
import { hapticMedium, hapticWarning } from '../lib/haptics';

type Props = NativeStackScreenProps<RootStackParamList, 'Loft'>;

const L = LOFT_PALETTE;

const BROKE_LINES = [
  { zh: '燭芯都沒有，就想進來取暖？', en: 'Not even a wick, and you want the warmth?' },
  { zh: '夜閣的門很重。誠意太輕，推不開。', en: 'This door is heavy. Light intentions won\'t move it.' },
  { zh: '想被想念，先點得起一根燭。', en: 'To be wanted, first afford a candle.' },
  { zh: '這裡不施捨浪漫。', en: 'Romance is not given away here.' },
];

const TONIGHT = [
  { seed: 'l01', zh: '今天他出差。屋子很安靜。', en: 'He travels tonight. The house is quiet.', who_zh: '酒紅的長椅', who_en: 'wine, long-bench' },
  { seed: 'l02', zh: '婚後第七年，沒有人問過我想被怎麼樣對待。', en: 'Seven years married. No one has asked how I want to be touched.', who_zh: '炭灰的舊書', who_en: 'charcoal, old-book' },
  { seed: 'l03', zh: '不是想出軌。是想被當成一個有慾望的人。', en: 'Not seeking. Just to be wanted as someone with desire.', who_zh: '蜜色的走廊', who_en: 'honey, corridor' },
  { seed: 'l04', zh: '今晚不想當太太。', en: 'Tonight I don\'t want to be a wife.', who_zh: '夜雨的玫', who_en: 'night-rain, rose' },
];

export default function LoftScreen({ navigation }: Props) {
  const { lang, wicks, seed, gender, vigil, loftRole } = useAppStore();
  const [inside, setInside] = useState(false);
  const [entering, setEntering] = useState(false);
  const [showBroke, setShowBroke] = useState(false);
  const [brokeLine] = useState(() => BROKE_LINES[Math.floor(Math.random() * BROKE_LINES.length)]);

  // Gender-based pricing: female=free, male=5, nonbinary depends on loftRole
  const loftCost = vigil ? 0
    : gender === 'female' ? 0
    : gender === 'nonbinary' && loftRole === 'listener' ? 0
    : 5;
  const isFree = loftCost === 0;

  const handleEnter = async () => {
    const nightName = getColorAdj(seed, lang).label;
    const result = await enterLoft(nightName, loftCost);
    if (result.ok) {
      hapticMedium();
      setEntering(true);
    } else if (result.error === 'already_entered_tonight') {
      setInside(true);
    } else {
      hapticWarning();
      setShowBroke(true);
    }
  };

  if (inside) {
    return <LoftInside lang={lang} wicks={wicks} onBack={() => setInside(false)}
      onEnter={(seed: string) => navigation.push('LoftChat', { otherSeed: seed })} />;
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
          {/* Back */}
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ alignSelf: 'flex-start', paddingVertical: 4 }}>
            <Text style={{ fontFamily: 'EBGaramond-Italic', fontSize: 13, color: L.muted, letterSpacing: 1 }}>
              ← {lang === 'en' ? 'back to the daylight' : '回到白天'}
            </Text>
          </TouchableOpacity>

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
            style={[styles.enterBtn, {
              backgroundColor: (isFree || wicks >= loftCost) ? undefined : 'rgba(245,226,196,0.08)',
              borderWidth: (isFree || wicks >= loftCost) ? 0 : 1, borderColor: 'rgba(245,226,196,0.15)',
            }]}>
            {(isFree || wicks >= loftCost) ? (
              <LinearGradient colors={['#e8a557', '#c25a3b']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={[StyleSheet.absoluteFill, { borderRadius: 999 }]} />
            ) : null}
            <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 17, fontWeight: '500', letterSpacing: 3, color: (isFree || wicks >= loftCost) ? '#1f1014' : L.faint, zIndex: 1 }}>
              {t('loftAgree', lang)}
            </Text>
            <View style={{ width: 1, height: 20, backgroundColor: (isFree || wicks >= loftCost) ? 'rgba(31,16,20,0.3)' : 'transparent', zIndex: 1 }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, zIndex: 1 }}>
              <WickGlyph size={11} color={(isFree || wicks >= loftCost) ? '#1f1014' : L.faint} />
              <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 13, color: (isFree || wicks >= loftCost) ? '#1f1014' : L.faint }}>
                {isFree
                  ? (lang === 'en' ? 'Free tonight' : '今晚免費')
                  : (lang === 'en' ? `Tonight · ${loftCost} wicks` : `今晚 ${loftCost} 燭芯`)}
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

      {/* Broke sheet */}
      {showBroke && (
        <View style={styles.brokeOverlay}>
          <View style={styles.brokeCard}>
            <View style={{ width: 40, height: 56, alignSelf: 'center', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 18 }}>
              <View style={{ width: 8, height: 32, borderRadius: 2, backgroundColor: 'rgba(245,226,196,0.35)' }} />
              <View style={{ width: 28, height: 3, borderRadius: 2, backgroundColor: 'rgba(232,165,87,0.12)', marginTop: 2 }} />
            </View>
            <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 19, color: '#f5e2c4', lineHeight: 30, letterSpacing: 1, textAlign: 'center' }}>
              {lang === 'en' ? brokeLine.en : brokeLine.zh}
            </Text>
            <Text style={{ fontFamily: 'EBGaramond-Italic', fontSize: 12, color: 'rgba(245,226,196,0.5)', marginTop: 8, textAlign: 'center' }}>
              {lang === 'en' ? brokeLine.zh : brokeLine.en}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 16 }}>
              <WickGlyph size={10} color="#e8a557" />
              <Text style={{ fontFamily: 'Inter-Regular', fontSize: 11, color: 'rgba(245,226,196,0.55)' }}>
                {lang === 'en' ? `you have ${wicks} · the door asks ${loftCost}` : `你有 ${wicks} 芯 · 這扇門要 ${loftCost} 芯`}
              </Text>
            </View>
            <TouchableOpacity onPress={() => { setShowBroke(false); navigation.push('Upgrade'); }}
              style={styles.buyBtn}>
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

      {entering && (
        <LoftTransition lang={lang} onDone={() => { setEntering(false); setInside(true); }} />
      )}
    </LinearGradient>
  );
}

function LoftInside({ lang, wicks, onBack, onEnter }: any) {
  const [sessions, setSessions] = React.useState<DbLoftSession[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetchTonightLoftSessions().then(s => {
      setSessions(s);
      setLoading(false);
    });
  }, []);

  const tonight = sessions.map(s => ({
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

          {/* Heading */}
          <View style={{ marginTop: 24 }}>
            <Text style={{ fontFamily: 'Inter-Regular', fontSize: 10, letterSpacing: 4, textTransform: 'uppercase', color: L.candle }}>
              {t('loftPeople', lang)}
            </Text>
            <Text style={{ fontFamily: 'EBGaramond-Italic', fontSize: 12, color: L.muted, letterSpacing: 1, marginTop: 4 }}>
              {tAlt('loftPeople', lang)}
            </Text>
          </View>

          {/* Listing */}
          <ScrollView style={{ marginTop: 18 }} showsVerticalScrollIndicator={false}>
            {loading ? (
              <ActivityIndicator color={L.candle} style={{ marginTop: 32 }} />
            ) : tonight.length === 0 ? (
              <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 14, color: L.muted, textAlign: 'center', marginTop: 32 }}>
                今晚還沒有人
              </Text>
            ) : (
              tonight.map(m => (
                <TouchableOpacity key={m.seed} onPress={() => onEnter(m.seed)} activeOpacity={0.85}
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
