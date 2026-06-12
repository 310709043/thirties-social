// ============================================================
// TutorialOverlay — first-run walkthrough shown over MoodScreen.
// A short sequence of cards introducing the core loop:
// wicks → rooms → private chat → the Loft. Skippable, shown once.
// ============================================================
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Dimensions } from 'react-native';
import { Palette } from '../../lib/theme';
import { WickGlyph } from './index';

const { width: SCREEN_W } = Dimensions.get('window');

interface Step {
  icon: 'wick' | 'room' | 'chat' | 'loft';
  zh: { title: string; body: string };
  en: { title: string; body: string };
}

const STEPS: Step[] = [
  {
    icon: 'wick',
    zh: { title: '燭芯', body: '燭芯是這裡的貨幣。每天登入送 1 根，右上角隨時看得到餘額。進夜閣、揭照片紗罩都用得到。' },
    en: { title: 'Wicks', body: 'Wicks are the currency here. You get 1 free each day — the balance lives in the top-right corner. Spend them on the Loft and on lifting photo veils.' },
  },
  {
    icon: 'room',
    zh: { title: '房間', body: '下面的房間是匿名樹洞。進去說一句話，或輕點別人的訊息，邀請對方私聊 30 分鐘。' },
    en: { title: 'Rooms', body: 'Rooms below are anonymous spaces. Whisper a line, or tap someone\'s message to invite them to a 30-minute private chat.' },
  },
  {
    icon: 'chat',
    zh: { title: '對話會消散', body: '所有私聊只有 30 分鐘，時間到就整段消散，不留紀錄。長按對方訊息可以檢舉。' },
    en: { title: 'Conversations dissolve', body: 'Private chats last 30 minutes, then dissolve completely. Long-press any message to report it.' },
  },
  {
    icon: 'loft',
    zh: { title: '夜閣', body: '午夜開啟的深夜空間，入場一晚 5 燭芯。在「我的頁面」可以先寫好你的夜名。' },
    en: { title: 'The Loft', body: 'A midnight space — 5 wicks a night. Compose your night-name ahead of time on My Page.' },
  },
];

function StepIcon({ icon, color }: { icon: Step['icon']; color: string }) {
  switch (icon) {
    case 'wick': return <WickGlyph size={22} color={color} />;
    case 'room': return <Text style={{ fontSize: 22 }}>🚪</Text>;
    case 'chat': return <Text style={{ fontSize: 22 }}>🕯</Text>;
    case 'loft': return <Text style={{ fontSize: 22 }}>🌙</Text>;
  }
}

export function TutorialOverlay({ p, lang, onDone }: { p: Palette; lang: string; onDone: () => void }) {
  const [step, setStep] = useState(0);
  const zh = lang !== 'en';
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: 320, useNativeDriver: true }).start();
  }, [step]);

  const s = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <View style={styles.overlay}>
      <Animated.View style={[styles.card, { backgroundColor: p.bgSolid, borderColor: p.line, opacity: fade }]}>
        <View style={[styles.iconWrap, { backgroundColor: p.accentSoft }]}>
          <StepIcon icon={s.icon} color={p.accent} />
        </View>
        <Text style={[styles.title, { color: p.ink }]}>{zh ? s.zh.title : s.en.title}</Text>
        <Text style={[styles.body, { color: p.inkSoft }]}>{zh ? s.zh.body : s.en.body}</Text>

        {/* dots */}
        <View style={styles.dots}>
          {STEPS.map((_, i) => (
            <View key={i} style={[styles.dot, { backgroundColor: i === step ? p.accent : p.line }]} />
          ))}
        </View>

        <TouchableOpacity
          onPress={() => (isLast ? onDone() : setStep(step + 1))}
          style={[styles.nextBtn, { backgroundColor: p.ink }]}>
          <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 15, color: p.dark ? '#1a1530' : '#fff', fontWeight: '500' }}>
            {isLast ? (zh ? '開始吧' : 'Begin') : (zh ? '下一個' : 'Next')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onDone} style={styles.skip}>
          <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 12, color: p.muted }}>
            {zh ? '略過' : 'Skip'}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(10,8,18,0.55)',
    alignItems: 'center', justifyContent: 'center',
    zIndex: 100, padding: 32,
  },
  card: {
    width: Math.min(SCREEN_W - 64, 340),
    borderRadius: 24, borderWidth: 0.5,
    padding: 26, alignItems: 'center',
  },
  iconWrap: {
    width: 52, height: 52, borderRadius: 26,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  title: { fontFamily: 'NotoSerifTC-Regular', fontSize: 20, fontWeight: '500', marginBottom: 8 },
  body:  { fontFamily: 'NotoSerifTC-Regular', fontSize: 13.5, lineHeight: 22, textAlign: 'center' },
  dots:  { flexDirection: 'row', gap: 6, marginTop: 18, marginBottom: 16 },
  dot:   { width: 6, height: 6, borderRadius: 3 },
  nextBtn: { height: 46, borderRadius: 999, alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch' },
  skip:  { paddingVertical: 10 },
});
