// NightAtmosphere — the app's living, breathing background.
//
// Philosophy: the app is a night place, so the world should quietly change with
// the real hour — warm at dusk, deep and still in the small hours, softly golden
// at dawn — and never sit dead-still. It's Headspace-calm, not a screensaver:
// one low-opacity time-of-day veil over the screen's own palette, plus a handful
// of slow drifting light motes. Everything is native-driver (60fps, no JS per
// frame), pointer-transparent, and honours Reduce Motion.
//
// It lives INSIDE VaporBackground, so every main screen inherits it for free —
// change it once, the whole app breathes together.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, Animated, Easing, Dimensions, AccessibilityInfo } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Palette } from '../../lib/theme';

type Phase = 'day' | 'evening' | 'night' | 'deep' | 'dawn';

/** Which part of the night we're in, from the real local hour. */
function currentPhase(d = new Date()): Phase {
  const h = d.getHours();
  if (h >= 5 && h < 6) return 'dawn';
  if (h >= 6 && h < 17) return 'day';
  if (h >= 17 && h < 21) return 'evening';
  if (h >= 21 || h < 2) return 'night';
  return 'deep'; // 2–5
}

// Per-phase veil: [topColor, bottomColor, overallOpacity]. Kept deliberately
// low — this tints the mood, it must never muddy the screen's own palette.
const VEIL: Record<Phase, { colors: [string, string]; opacity: number; moteTint: string }> = {
  day:     { colors: ['#fff6e8', '#fbeede'], opacity: 0.0,  moteTint: '#c8a24a' },
  evening: { colors: ['#f6b26b', '#c9607a'], opacity: 0.14, moteTint: '#e8a557' },
  night:   { colors: ['#2b2f5a', '#141a34'], opacity: 0.20, moteTint: '#8fa0d8' },
  deep:    { colors: ['#171a33', '#0c0e1e'], opacity: 0.28, moteTint: '#9aa6cf' },
  dawn:    { colors: ['#f7c9a0', '#e6a3b4'], opacity: 0.16, moteTint: '#f0b98a' },
};

const MOTE_COUNT = 12;

export function NightAtmosphere({ p }: { p: Palette }) {
  const [phase, setPhase] = useState<Phase>(() => currentPhase());
  const [reduceMotion, setReduceMotion] = useState(false);

  // Re-evaluate the phase every few minutes so a session that spans, say,
  // 20:59→21:00 slides into night without a relaunch.
  useEffect(() => {
    const id = setInterval(() => setPhase(currentPhase()), 3 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { (sub as any)?.remove?.(); };
  }, []);

  const veil = VEIL[phase];

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Time-of-day veil — a soft wash the whole app shares. */}
      {veil.opacity > 0 && (
        <LinearGradient
          colors={veil.colors}
          start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }}
          style={[StyleSheet.absoluteFill, { opacity: veil.opacity }]}
        />
      )}
      {/* Drifting light motes — the world is never quite still. Skipped under
          Reduce Motion (the veil alone still conveys the hour). */}
      {!reduceMotion && <Motes tint={veil.moteTint} dim={phase === 'day'} />}
    </View>
  );
}

function Motes({ tint, dim }: { tint: string; dim: boolean }) {
  const { width: W, height: H } = Dimensions.get('window');
  const motes = useMemo(
    () => Array.from({ length: MOTE_COUNT }, (_, i) => ({
      x: Math.random() * W,
      size: 1.5 + Math.random() * 2.5,
      delay: Math.random() * 8000,
      duration: 12000 + Math.random() * 10000,
      drift: (Math.random() - 0.5) * 50,
      rise: 0.4 + Math.random() * 0.4,       // how far up it travels (fraction of H)
      peak: 0.25 + Math.random() * 0.3,      // brightest opacity
      progress: new Animated.Value(0),
    })),
    [W, H],
  );

  useEffect(() => {
    const loops = motes.map(m =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(m.delay),
          Animated.timing(m.progress, { toValue: 1, duration: m.duration, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.timing(m.progress, { toValue: 0, duration: 0, useNativeDriver: true }),
        ]),
      ),
    );
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, [motes]);

  return (
    <>
      {motes.map((m, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            left: m.x,
            bottom: -8,
            width: m.size,
            height: m.size,
            borderRadius: m.size,
            backgroundColor: tint,
            opacity: m.progress.interpolate({
              inputRange: [0, 0.15, 0.7, 1],
              outputRange: [0, (dim ? 0.12 : m.peak), (dim ? 0.08 : m.peak * 0.6), 0],
            }),
            transform: [
              { translateY: m.progress.interpolate({ inputRange: [0, 1], outputRange: [0, -H * m.rise] }) },
              { translateX: m.progress.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, m.drift, m.drift * 0.5] }) },
            ],
          }}
        />
      ))}
    </>
  );
}
