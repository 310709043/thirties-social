// HonestWaiting — the 0-online empty state (design handoff W1-2).
//
// Replaces the old infinite spinner. The product promise is "沒有人就是沒有人":
// so every number here is REAL (awakeCount, queueCount) and the bar chart is
// explicitly the *typical* nightly rhythm, never dressed up as live "tonight"
// data. The primary way out is a firepit — W1-1 keeps 3 days of words readable,
// so an empty night still has something to sit with. No fake accounts, ever.

import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Palette } from '../../lib/theme';
import { Lang, t } from '../../lib/copy';
import { PressableScale } from './Pressable';

// Typical nightly rhythm (share of people awake per hour) — a known pattern, NOT
// a live count. Peak sits at 00:00–01:00. Kept as fixed shape so it never
// implies a fake real-time number.
const HOURS = ['21', '22', '23', '00', '01', '02', '03', '04'];
const RHYTHM = [9, 20, 48, 88, 100, 62, 30, 14];
const PEAK = new Set([3, 4]); // 00, 01

function TwoLineButton({
  p, title, sub, onPress, primary,
}: { p: Palette; title: string; sub: string; onPress: () => void; primary?: boolean }) {
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.98}
      accessibilityRole="button"
      style={{
        minHeight: 54,
        borderRadius: 16,
        paddingVertical: 10,
        paddingHorizontal: 16,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: primary ? p.ink : p.surface,
        borderWidth: primary ? 0 : 0.5,
        borderColor: p.line,
      }}
    >
      <Text style={{
        fontFamily: 'NotoSerifTC-Regular', fontSize: 14.5,
        color: primary ? (p.dark ? '#1f1014' : (p.surfaceSolid || '#fff')) : p.ink,
      }}>{title}</Text>
      <Text style={{
        fontFamily: 'NotoSerifTC-Regular', fontSize: 11,
        color: primary ? (p.dark ? 'rgba(31,16,20,0.66)' : 'rgba(255,255,255,0.72)') : p.muted,
        marginTop: 2,
      }}>{sub}</Text>
    </PressableScale>
  );
}

export function HonestWaiting({
  p, lang, awakeCount, queueCount, onGoFirepit, onWrite, onCancel,
}: {
  p: Palette;
  lang: Lang;
  awakeCount: number | null;
  queueCount: number;
  onGoFirepit: () => void;
  onWrite: () => void;
  onCancel: () => void;
}) {
  const cool = p.dark ? 'rgba(168,176,220,0.45)' : 'rgba(120,130,180,0.40)';
  const coolSoft = p.dark ? 'rgba(168,176,220,0.28)' : 'rgba(120,130,180,0.20)';
  const someoneAwake = (awakeCount ?? 0) > 0;

  // Honest count line — only states what's actually true right now.
  const countLine = queueCount > 0
    ? (lang === 'en'
        ? `${queueCount} other ${queueCount === 1 ? 'person is' : 'people are'} also waiting tonight.`
        : `今晚還有 ${queueCount} 個人也在等。`)
    : someoneAwake
      ? (lang === 'en'
          ? `${awakeCount} awake right now, but no one waiting to talk yet.`
          : `現在有 ${awakeCount} 個人醒著，但還沒有人在等著說話。`)
      : (lang === 'en' ? 'Right now, this place is empty.' : '現在，這裡是空的。');

  return (
    <View style={{
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: p.bgSolid,
    }}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 28, gap: 22 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ gap: 10 }}>
          <Text style={{
            fontFamily: 'NotoSerifTC-Light', fontSize: 28, lineHeight: 40, color: p.ink, textAlign: 'center',
          }}>
            {someoneAwake ? t('honestSearching', lang) : t('honestTitle0', lang)}
          </Text>
          <Text style={{
            fontFamily: 'NotoSerifTC-Regular', fontSize: 14.5, lineHeight: 26, color: p.muted,
            textAlign: 'center', alignSelf: 'center', maxWidth: 300,
          }}>
            {t('honestSub', lang)}
          </Text>
        </View>

        {/* Typical nightly rhythm — a known pattern, clearly not live "tonight" data. */}
        <View style={{
          padding: 20, borderRadius: 22, borderWidth: 1, borderColor: coolSoft,
          backgroundColor: p.dark ? 'rgba(168,176,220,0.09)' : 'rgba(120,130,180,0.06)', gap: 14,
        }}>
          <Text style={{
            fontFamily: 'Inter-Regular', fontSize: 9.5, letterSpacing: 1.7, textTransform: 'uppercase',
            color: p.muted, fontWeight: '600',
          }}>{t('honestChartTitle', lang)}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 72, gap: 8 }}>
            {RHYTHM.map((h, i) => (
              <View key={i} style={{ flex: 1, alignItems: 'center', gap: 5 }}>
                <View style={{
                  width: '100%',
                  height: Math.max(4, (h / 100) * 56) + 4,
                  borderRadius: 3,
                  backgroundColor: PEAK.has(i) ? p.accent : cool,
                }} />
                <Text style={{
                  fontFamily: 'Inter-Regular', fontSize: 9,
                  color: PEAK.has(i) ? p.accent : p.muted,
                  fontWeight: PEAK.has(i) ? '600' : '400',
                }}>{HOURS[i]}</Text>
              </View>
            ))}
          </View>
          <Text style={{
            fontFamily: 'NotoSerifTC-Regular', fontSize: 12.5, lineHeight: 21, color: p.inkSoft,
          }}>
            {t('honestPeak', lang)}{countLine}
          </Text>
        </View>

        <View style={{ gap: 9 }}>
          <TwoLineButton p={p} primary
            title={t('honestGoFirepit', lang)} sub={t('honestGoFirepitSub', lang)}
            onPress={onGoFirepit} />
          <TwoLineButton p={p}
            title={t('honestWrite', lang)} sub={t('honestWriteSub', lang)}
            onPress={onWrite} />
        </View>

        <View style={{
          padding: 14, borderRadius: 16, borderWidth: 0.5, borderColor: p.line,
          backgroundColor: p.glass,
        }}>
          <Text style={{
            fontFamily: 'NotoSerifTC-Regular', fontSize: 12, lineHeight: 19, color: p.muted, textAlign: 'center',
          }}>{t('honestFooter', lang)}</Text>
        </View>

        <TouchableOpacity onPress={onCancel} accessibilityRole="button" style={{ alignSelf: 'center', padding: 8 }}>
          <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 13.5, color: p.muted }}>
            {t('honestCancel', lang)}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
