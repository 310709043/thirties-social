import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, Animated, Easing, TextInput, TouchableOpacity, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import { DIRECTIONS } from '../lib/theme';
import { t } from '../lib/copy';
import { VaporBackground, SoftButton, Logo, FadeInUp } from '../components/ui';
import { useAppStore } from '../hooks/useAppStore';
import { sendEcho } from '../lib/db';
import { hapticSuccess } from '../lib/haptics';

type Props = NativeStackScreenProps<RootStackParamList, 'Close'>;

export default function CloseScreen({ navigation, route }: Props) {
  const { direction, lang, conversationsToday, peopleTodayCount, wicks, vigil, seed } = useAppStore();
  const convCount = (route.params as any)?.conversationsCount ?? conversationsToday;
  const peopleCount = (route.params as any)?.peopleCount ?? peopleTodayCount;
  // 回聲 — offered when we just left a real conversation.
  const echoToUid = (route.params as any)?.echoToUid as string | null | undefined;
  const echoConversationId = (route.params as any)?.echoConversationId as string | undefined;
  const [echoDraft, setEchoDraft] = useState('');
  const [echoState, setEchoState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const p = DIRECTIONS[direction];
  const [timeStr, setTimeStr] = useState('');
  const orbPulse = useRef(new Animated.Value(0.5)).current;

  const handleSendEcho = async () => {
    if (echoState !== 'idle' || !echoDraft.trim() || !echoToUid || !echoConversationId) return;
    setEchoState('sending');
    const ok = await sendEcho({ toId: echoToUid, conversationId: echoConversationId, content: echoDraft, mySeed: seed });
    if (ok) { hapticSuccess(); setEchoState('sent'); } else { setEchoState('idle'); }
  };

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(orbPulse, { toValue: 0.7, duration: 3000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(orbPulse, { toValue: 0.5, duration: 3000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      // Next 03:00 — today's if we're before it (e.g. 01:00), otherwise tomorrow's.
      const reset = new Date(now);
      reset.setHours(3, 0, 0, 0);
      if (reset.getTime() <= now.getTime()) reset.setDate(reset.getDate() + 1);
      const diff = (reset.getTime() - now.getTime()) / 1000;
      const h = String(Math.floor(diff / 3600)).padStart(2, '0');
      const m = String(Math.floor((diff % 3600) / 60)).padStart(2, '0');
      const s = String(Math.floor(diff % 60)).padStart(2, '0');
      setTimeStr(`${h}:${m}:${s}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <VaporBackground p={p} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
       {/* The echo composer sits mid-screen — keep it above the keyboard. */}
       <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          {/* Fading orb */}
          <Animated.View style={[styles.orb, { backgroundColor: p.accent + '33', opacity: orbPulse }]} />

          <View style={styles.content}>
            <FadeInUp delay={0} distance={16}>
              <Logo size={72} showGlow={true} />
            </FadeInUp>

            <FadeInUp delay={150} distance={14}>
              <Text style={[styles.title, { color: p.ink }]}>{t('closeHeader', lang)}</Text>
            </FadeInUp>

            <FadeInUp delay={250} distance={10}>
              <Text style={[styles.titleAlt, { color: p.ink }]}>
                {lang === 'en' ? '今天的窗口關了' : "Today's window is closed"}
              </Text>
            </FadeInUp>

            <FadeInUp delay={350} distance={10}>
              <Text style={[styles.body, { color: p.inkSoft }]}>{t('closeBody', lang)}</Text>
            </FadeInUp>

            {/* 回聲 — one last line, delivered tomorrow at 09:00 */}
            {echoToUid && echoConversationId && (
              <FadeInUp delay={400} distance={12}>
                <View style={[styles.echoCard, { backgroundColor: p.surface, borderColor: p.accent + '45' }]}>
                  {echoState === 'sent' ? (
                    <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 13, color: p.accent, textAlign: 'center', lineHeight: 22 }}>
                      {lang === 'en'
                        ? '✓ Your echo departs at dawn — it reaches them at 09:00.'
                        : '✓ 你的回聲天亮出發，明早九點送到。'}
                    </Text>
                  ) : (
                    <>
                      <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 13.5, color: p.ink, textAlign: 'center' }}>
                        {lang === 'en' ? 'Leave one last line for them' : '留一句話給剛剛那個人'}
                      </Text>
                      <Text style={{ fontFamily: 'EBGaramond-Italic', fontSize: 11, color: p.muted, textAlign: 'center', marginTop: 2 }}>
                        {lang === 'en' ? 'delivered tomorrow at 09:00 · free' : '明早九點送達 · 免費'}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 }}>
                        <TextInput
                          value={echoDraft}
                          onChangeText={setEchoDraft}
                          placeholder={lang === 'en' ? 'what you didn\'t get to say…' : '沒來得及說的那句⋯⋯'}
                          placeholderTextColor={p.muted}
                          maxLength={200}
                          style={{ flex: 1, fontFamily: 'NotoSerifTC-Regular', fontSize: 14, color: p.ink, backgroundColor: p.glass, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 }}
                        />
                        <TouchableOpacity onPress={handleSendEcho} disabled={echoState !== 'idle' || !echoDraft.trim()}
                          style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: echoDraft.trim() ? p.ink : p.line, alignItems: 'center', justifyContent: 'center' }}>
                          <Text style={{ color: p.dark ? '#1a1530' : '#fff', fontSize: 15 }}>
                            {echoState === 'sending' ? '⋯' : '↑'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                </View>
              </FadeInUp>
            )}

            {/* Session stats */}
            <FadeInUp delay={450} distance={12}>
              <View style={[styles.statsRow, { borderColor: p.line }]}>
                <View style={styles.statCell}>
                  <Text style={[styles.statNum, { color: p.ink }]}>{peopleCount}</Text>
                  <Text style={[styles.statLabel, { color: p.muted }]}>
                    {lang === 'en' ? 'person spoken with' : '說話的人'}
                  </Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: p.line }]} />
                <View style={styles.statCell}>
                  <Text style={[styles.statNum, { color: p.ink }]}>{convCount}</Text>
                  <Text style={[styles.statLabel, { color: p.muted }]}>
                    {lang === 'en' ? 'conversation' : '對話'}
                  </Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: p.line }]} />
                <View style={styles.statCell}>
                  <Text style={[styles.statNum, { color: p.ink }]}>{wicks}</Text>
                  <Text style={[styles.statLabel, { color: p.muted }]}>
                    {lang === 'en' ? 'wicks left' : '剩餘燭芯'}
                  </Text>
                </View>
              </View>
            </FadeInUp>

            {/* Timer to next reset */}
            <FadeInUp delay={550} distance={12}>
              <View style={[styles.timerCard, { backgroundColor: p.surface, borderColor: p.line }]}>
                <Text style={[styles.timerLabel, { color: p.muted }]}>{t('closeReturn', lang)}</Text>
                <Text style={[styles.timerValue, { color: p.ink }]}>{timeStr}</Text>
              </View>
            </FadeInUp>

            {/* No trace note */}
            <FadeInUp delay={650} distance={8}>
              <View style={styles.noTrace}>
                <Text style={[styles.noTraceText, { color: p.muted }]}>
                  {lang === 'en' ? '· No traces remain ·' : '· 不留下任何痕跡 ·'}
                </Text>
              </View>
            </FadeInUp>
          </View>

          <FadeInUp delay={750} distance={10}>
            <SoftButton p={p} variant="ghost" size="lg" full
              onPress={() => navigation.replace('Mood')}>
              <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 15, color: p.muted }}>
                {t('closeRest', lang)}
              </Text>
            </SoftButton>
          </FadeInUp>
        </ScrollView>
       </KeyboardAvoidingView>
      </SafeAreaView>
    </VaporBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 32, justifyContent: 'space-between', width: '100%', maxWidth: 560, alignSelf: 'center' },
  orb:       { position: 'absolute', width: 300, height: 300, borderRadius: 150, top: '15%', alignSelf: 'center' },
  content:   { flex: 1, justifyContent: 'center', gap: 16, alignItems: 'center' },
  title:     { fontFamily: 'NotoSerifTC-Light', fontSize: 36, lineHeight: 46, textAlign: 'center' },
  titleAlt:  { fontFamily: 'EBGaramond-Italic', fontSize: 15, opacity: 0.4, marginTop: -10, textAlign: 'center' },
  body:      { fontFamily: 'NotoSerifTC-Regular', fontSize: 15, lineHeight: 26, marginTop: 8, textAlign: 'center' },
  timerCard: { borderWidth: 0.5, borderRadius: 20, padding: 20, alignItems: 'center', gap: 8, marginTop: 24, width: '100%' },
  timerLabel:{ fontFamily: 'NotoSerifTC-Regular', fontSize: 13 },
  timerValue:{ fontFamily: 'Inter-Regular', fontSize: 32, fontWeight: '300', letterSpacing: 3 },
  noTrace:     { alignItems: 'center', marginTop: 16 },
  noTraceText: { fontFamily: 'EBGaramond-Italic', fontSize: 13, opacity: 0.5 },
  statsRow:    { flexDirection: 'row', borderWidth: 0.5, borderRadius: 16, overflow: 'hidden', marginTop: 16, width: '100%' },
  statCell:    { flex: 1, alignItems: 'center', paddingVertical: 14, gap: 4 },
  statNum:     { fontFamily: 'Inter-Regular', fontSize: 22, fontWeight: '300' },
  statLabel:   { fontFamily: 'NotoSerifTC-Regular', fontSize: 11, textAlign: 'center' },
  statDivider: { width: 0.5 },
  echoCard:    { borderWidth: 0.5, borderRadius: 18, padding: 16, width: '100%', marginTop: 4 },
});
