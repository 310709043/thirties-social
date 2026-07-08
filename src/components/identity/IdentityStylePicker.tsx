// IdentityStylePicker — the premium, categorised chooser for a person's
// anonymous visual mask.
//
// Principles it's built to: (1) every card shows YOUR seed rendered in that
// style, so choosing is a visible act, not a guess; (2) styles are grouped by
// feeling (光影線場字) instead of dumped in one row; (3) locked (Vigil) styles
// are still previewed — you see what you'd get — with a quiet lock, never a
// blur-wall; (4) full a11y + reduced-motion; (5) a "shuffle" for playful
// discovery. Nothing here labels the person.
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Animated, Easing,
  AccessibilityInfo,
} from 'react-native';
import { Identity } from './Identity';
import { PressableScale } from '../ui/Pressable';
import { hapticMedium } from '../../lib/haptics';
import { Palette } from '../../lib/theme';
import { IdentityKind, getColorAdj } from '../../lib/identity';
import {
  IDENTITY_CATEGORIES, stylesByCategory, styleMeta, IdentityStyleMeta,
} from '../../lib/identityStyles';

interface Props {
  current: IdentityKind;
  available: IdentityKind[];        // unlocked for this user
  vigil: boolean;
  lang: 'zh' | 'en';
  p: Palette;
  seed: string;
  onSelect: (k: IdentityKind) => void;
  onUpgrade: () => void;
}

export function IdentityStylePicker({ current, available, vigil, lang, p, seed, onSelect, onUpgrade }: Props) {
  const en = lang === 'en';
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { (sub as any)?.remove?.(); };
  }, []);

  // Hero pulse whenever the chosen style changes — the "selection celebration".
  const heroScale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (reduceMotion) return;
    heroScale.setValue(0.86);
    Animated.spring(heroScale, { toValue: 1, tension: 140, friction: 7, useNativeDriver: true }).start();
  }, [current, reduceMotion]);

  const choose = (k: IdentityKind, unlocked: boolean) => {
    if (!unlocked) { onUpgrade(); return; }
    if (k === current) return;
    hapticMedium();
    onSelect(k);
  };

  // Shuffle: jump to a random UNLOCKED style you're not already on — playful
  // discovery without dead-ends into locked cards.
  const shuffle = () => {
    const pool = available.filter(k => k !== current);
    if (!pool.length) return;
    hapticMedium();
    onSelect(pool[Math.floor(Math.random() * pool.length)]);
  };

  const heroMeta = styleMeta(current);
  const poeticName = getColorAdj(seed, lang).label;

  return (
    <View style={{ marginTop: 12 }}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
          <Text style={[styles.kicker, { color: p.muted }]}>{en ? 'IDENTITY STYLE' : '身份樣式'}</Text>
          <Text style={[styles.kickerAlt, { color: p.muted }]}>{en ? '身份樣式' : 'Identity Style'}</Text>
        </View>
        <PressableScale
          onPress={shuffle}
          accessibilityRole="button"
          accessibilityLabel={en ? 'Shuffle to a random style' : '隨機換一個樣式'}
          style={[styles.shuffleBtn, { backgroundColor: p.accentSoft, borderColor: p.accent + '40' }]}
        >
          <Text style={{ fontSize: 13 }}>🎲</Text>
          <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 12, color: p.accent }}>
            {en ? 'Shuffle' : '隨機'}
          </Text>
        </PressableScale>
      </View>

      {/* Hero — your current mask, large, with its poetic name */}
      <View style={[styles.hero, { backgroundColor: p.glass, borderColor: p.line }]}>
        <Animated.View style={{ transform: [{ scale: heroScale }] }}>
          <Identity kind={current} seed={seed} size={76} palette={p} lang={lang} trust={0.5} />
        </Animated.View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 17, color: p.ink }}>
            {heroMeta ? (en ? heroMeta.en : heroMeta.zh) : ''}
          </Text>
          <Text style={{ fontFamily: en ? 'EBGaramond-Italic' : 'NotoSerifTC-Regular', fontSize: 12.5, color: p.muted, lineHeight: 19, marginTop: 3 }}>
            {heroMeta ? (en ? heroMeta.descEn : heroMeta.descZh) : ''}
          </Text>
          <Text style={{ fontFamily: 'EBGaramond-Italic', fontSize: 11, color: p.accent, marginTop: 6, opacity: 0.85 }}>
            {en ? `seen as “${poeticName}”` : `別人看到的你 · ${poeticName}`}
          </Text>
        </View>
      </View>

      {/* Category sections */}
      {IDENTITY_CATEGORIES.map(cat => {
        const styleList = stylesByCategory(cat.id);
        if (!styleList.length) return null;
        return (
          <View key={cat.id} style={{ marginTop: 18 }}>
            <View style={styles.catHead}>
              <Text style={{ fontSize: 13, color: p.accent }}>{cat.glyph}</Text>
              <Text style={[styles.catTitle, { color: p.ink }]}>{en ? cat.en : cat.zh}</Text>
              <Text style={[styles.catAlt, { color: p.muted }]}>{en ? cat.zh : cat.en}</Text>
            </View>
            <View style={styles.grid}>
              {styleList.map(s => (
                <StyleCard
                  key={s.kind} meta={s} p={p} seed={seed} lang={lang}
                  selected={current === s.kind}
                  unlocked={available.includes(s.kind)}
                  onPress={() => choose(s.kind, available.includes(s.kind))}
                />
              ))}
            </View>
          </View>
        );
      })}

      {!vigil && (
        <Text style={{ fontFamily: 'EBGaramond-Italic', fontSize: 11, color: p.muted, textAlign: 'center', marginTop: 16, opacity: 0.7, lineHeight: 18 }}>
          {en ? '🔒 styles unlock with Vigil' : '🔒 標記的樣式，守夜會員解鎖'}
        </Text>
      )}
    </View>
  );
}

function StyleCard({ meta, p, seed, lang, selected, unlocked, onPress }: {
  meta: IdentityStyleMeta; p: Palette; seed: string; lang: 'zh' | 'en';
  selected: boolean; unlocked: boolean; onPress: () => void;
}) {
  const en = lang === 'en';
  return (
    <PressableScale
      onPress={onPress}
      style={[
        styles.card,
        {
          backgroundColor: selected ? p.accentSoft : p.surface,
          borderColor: selected ? p.accent : p.line,
          borderWidth: selected ? 1.5 : 0.5,
          // soft lift + accent glow on the selected card
          shadowColor: selected ? p.accent : '#000',
          shadowOpacity: selected ? 0.35 : 0.05,
          shadowRadius: selected ? 14 : 6,
          shadowOffset: { width: 0, height: selected ? 6 : 3 },
          opacity: unlocked ? 1 : 0.6,
        },
      ]}
      // Accessibility: announce name, state and lock.
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={
        `${en ? meta.en : meta.zh}${!unlocked ? (en ? ', locked, Vigil only' : '，鎖定，守夜會員') : ''}${selected ? (en ? ', in use' : '，使用中') : ''}`
      }
    >
      <View style={{ alignItems: 'center', gap: 8 }}>
        <View style={{ height: 48, justifyContent: 'center' }}>
          <Identity kind={meta.kind} seed={seed} size={44} palette={p} lang={lang} trust={0.35} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          {!unlocked && <Text style={{ fontSize: 9 }}>🔒</Text>}
          <Text style={{
            fontFamily: 'NotoSerifTC-Regular', fontSize: 12.5,
            color: selected ? p.accent : p.ink, fontWeight: selected ? '600' : '400',
          }}>
            {en ? meta.en : meta.zh}
          </Text>
        </View>
        {selected
          ? <Text style={{ fontFamily: 'Inter-Regular', fontSize: 8, letterSpacing: 1, color: p.accent }}>{en ? 'IN USE' : '使用中'}</Text>
          : <Text numberOfLines={1} style={{ fontFamily: en ? 'EBGaramond-Italic' : 'NotoSerifTC-Regular', fontSize: 10, color: p.muted, opacity: 0.7 }}>{en ? meta.descEn : meta.descZh}</Text>}
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, paddingBottom: 10 },
  kicker:    { fontFamily: 'Inter-Regular', fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', fontWeight: '500' },
  kickerAlt: { fontFamily: 'EBGaramond-Italic', fontSize: 11, opacity: 0.6 },
  shuffleBtn:{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 0.5, minHeight: 32 },
  hero:      { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16, borderRadius: 20, borderWidth: 0.5 },
  catHead:   { flexDirection: 'row', alignItems: 'baseline', gap: 8, paddingHorizontal: 4, paddingBottom: 10 },
  catTitle:  { fontFamily: 'NotoSerifTC-Regular', fontSize: 15, letterSpacing: 2 },
  catAlt:    { fontFamily: 'EBGaramond-Italic', fontSize: 11, opacity: 0.55 },
  grid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  // Two per row on phones, more on wide screens — the wrap + fixed min width
  // keeps it responsive without measuring.
  card:      { width: '47%', flexGrow: 1, minWidth: 150, paddingVertical: 16, paddingHorizontal: 10, borderRadius: 18, alignItems: 'center' },
});
