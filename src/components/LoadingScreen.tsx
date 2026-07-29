// LoadingScreen.tsx — Candle Whisper intro: a candle glowing in the dark,
// then blown out, before the app opens.
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Circle, Rect, Line } from 'react-native-svg';
import { USE_NATIVE_DRIVER, useReduceMotion } from '../lib/motion';

interface Props {
  onDone: () => void;
}

const GOLD = '#d8a96a';
const FLAME = '#E8843A';

export default function LoadingScreen({ onDone }: Props) {
  const reduceMotion = useReduceMotion();
  const bgOpacity = useRef(new Animated.Value(0)).current;
  const candleOpacity = useRef(new Animated.Value(0)).current;
  const candleScale = useRef(new Animated.Value(0.85)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;

  // Flame
  const flameOpacity = useRef(new Animated.Value(0)).current;
  const flameScale = useRef(new Animated.Value(0.4)).current;
  const flameTX = useRef(new Animated.Value(0)).current;
  const flameTY = useRef(new Animated.Value(0)).current;

  // Smoke wisp after blow-out
  const smokeOpacity = useRef(new Animated.Value(0)).current;
  const smokeTY = useRef(new Animated.Value(0)).current;

  // Text
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTY = useRef(new Animated.Value(16)).current;
  const subOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let flicker: Animated.CompositeAnimation | null = null;

    if (reduceMotion) {
      bgOpacity.setValue(1);
      candleOpacity.setValue(1);
      candleScale.setValue(1);
      glowOpacity.setValue(0.45);
      flameOpacity.setValue(1);
      flameScale.setValue(1);
      titleOpacity.setValue(1);
      titleTY.setValue(0);
      subOpacity.setValue(1);
      const reducedTimer = setTimeout(onDone, 650);
      return () => clearTimeout(reducedTimer);
    }

    Animated.timing(bgOpacity, { toValue: 1, duration: 500, useNativeDriver: USE_NATIVE_DRIVER }).start();

    // Candle rises into view
    Animated.parallel([
      Animated.timing(candleOpacity, { toValue: 1, duration: 700, easing: Easing.out(Easing.quad), useNativeDriver: USE_NATIVE_DRIVER }),
      Animated.spring(candleScale, { toValue: 1, tension: 60, friction: 9, useNativeDriver: USE_NATIVE_DRIVER }),
    ]).start();

    // Flame lights up
    Animated.parallel([
      Animated.timing(flameOpacity, { toValue: 1, duration: 500, delay: 350, useNativeDriver: USE_NATIVE_DRIVER }),
      Animated.spring(flameScale, { toValue: 1, delay: 350, tension: 80, friction: 7, useNativeDriver: USE_NATIVE_DRIVER }),
      Animated.timing(glowOpacity, { toValue: 0.55, duration: 800, delay: 350, useNativeDriver: USE_NATIVE_DRIVER }),
    ]).start(() => {
      // Gentle flicker while alive
      flicker = Animated.loop(
        Animated.sequence([
          Animated.timing(flameScale, { toValue: 0.94, duration: 280, easing: Easing.inOut(Easing.sin), useNativeDriver: USE_NATIVE_DRIVER }),
          Animated.timing(flameScale, { toValue: 1.0, duration: 320, easing: Easing.inOut(Easing.sin), useNativeDriver: USE_NATIVE_DRIVER }),
        ]),
      );
      flicker.start();
    });

    // Glow breathes
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowOpacity, { toValue: 0.6, duration: 1400, delay: 600, easing: Easing.inOut(Easing.sin), useNativeDriver: USE_NATIVE_DRIVER }),
        Animated.timing(glowOpacity, { toValue: 0.4, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: USE_NATIVE_DRIVER }),
      ]),
    ).start();

    // Text
    Animated.parallel([
      Animated.timing(titleOpacity, { toValue: 1, duration: 600, delay: 500, useNativeDriver: USE_NATIVE_DRIVER }),
      Animated.timing(titleTY, { toValue: 0, duration: 600, delay: 500, easing: Easing.out(Easing.quad), useNativeDriver: USE_NATIVE_DRIVER }),
    ]).start();
    Animated.timing(subOpacity, { toValue: 1, duration: 600, delay: 800, useNativeDriver: USE_NATIVE_DRIVER }).start();

    // Blow out the candle
    const blowTimer = setTimeout(() => {
      if (flicker) flicker.stop();
      Animated.parallel([
        // flame snuffs: shrink, drift aside, fade
        Animated.timing(flameScale, { toValue: 0, duration: 260, easing: Easing.in(Easing.quad), useNativeDriver: USE_NATIVE_DRIVER }),
        Animated.timing(flameTX, { toValue: 16, duration: 300, easing: Easing.out(Easing.quad), useNativeDriver: USE_NATIVE_DRIVER }),
        Animated.timing(flameTY, { toValue: -8, duration: 300, useNativeDriver: USE_NATIVE_DRIVER }),
        Animated.timing(flameOpacity, { toValue: 0, duration: 280, useNativeDriver: USE_NATIVE_DRIVER }),
        // glow dies
        Animated.timing(glowOpacity, { toValue: 0, duration: 500, useNativeDriver: USE_NATIVE_DRIVER }),
        // smoke rises
        Animated.sequence([
          Animated.timing(smokeOpacity, { toValue: 0.5, duration: 200, useNativeDriver: USE_NATIVE_DRIVER }),
          Animated.timing(smokeOpacity, { toValue: 0, duration: 700, useNativeDriver: USE_NATIVE_DRIVER }),
        ]),
        Animated.timing(smokeTY, { toValue: -46, duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: USE_NATIVE_DRIVER }),
      ]).start();
    }, 1900);

    const doneTimer = setTimeout(onDone, 2900);
    return () => { clearTimeout(blowTimer); clearTimeout(doneTimer); if (flicker) flicker.stop(); };
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: bgOpacity }]}>
      <LinearGradient colors={['#0d0d14', '#1a1018', '#0d0d14']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradient}>
        <View style={styles.content}>
          <View style={styles.canvas}>
            {/* warm glow */}
            <Animated.View style={[styles.glow, { opacity: glowOpacity }]} />

            {/* candle body + door + keyhole */}
            <Animated.View style={{ opacity: candleOpacity, transform: [{ scale: candleScale }] }}>
              <Svg width={170} height={190} viewBox="0 0 200 220">
                {/* floor */}
                <Path d="M44 198 Q100 204 156 198" stroke={GOLD} strokeWidth={3} strokeLinecap="round" fill="none" opacity={0.7} />
                {/* door frame */}
                <Path d="M66 64 L66 192 M134 64 L134 192 M66 64 L134 64" stroke={GOLD} strokeWidth={3} strokeLinecap="round" fill="none" opacity={0.28} />
                {/* candle body */}
                <Rect x={86} y={120} width={28} height={70} rx={7} stroke={GOLD} strokeWidth={3.5} fill="none" />
                {/* keyhole */}
                <Circle cx={100} cy={150} r={5} fill={GOLD} />
                <Path d="M97 153 L103 153 L101.5 163 L98.5 163 Z" fill={GOLD} />
                {/* wick */}
                <Line x1={100} y1={120} x2={100} y2={113} stroke={GOLD} strokeWidth={3} strokeLinecap="round" />
              </Svg>
            </Animated.View>

            {/* smoke wisp (after blow-out) */}
            <Animated.View style={[styles.smoke, { opacity: smokeOpacity, transform: [{ translateY: smokeTY }] }]}>
              <Svg width={20} height={50} viewBox="0 0 20 50">
                <Path d="M10 50 C 4 40, 16 32, 10 22 C 5 14, 14 8, 9 0" stroke="rgba(220,210,200,0.7)" strokeWidth={2} fill="none" strokeLinecap="round" />
              </Svg>
            </Animated.View>

            {/* flame */}
            <Animated.View style={[styles.flame, {
              opacity: flameOpacity,
              transform: [{ translateX: flameTX }, { translateY: flameTY }, { scale: flameScale }],
            }]}>
              <Svg width={34} height={50} viewBox="0 0 34 50">
                <Path d="M17 49 C 5 40, 7 24, 14 13 C 18 7, 16 3, 17 1 C 21 9, 29 22, 27 35 C 26 44, 23 48, 17 49 Z" fill={FLAME} />
                <Path d="M17 47 C 11 41, 12 30, 16 22 C 18 18, 17 15, 18 13 C 20 19, 23 28, 21 36 C 20 43, 19 46, 17 47 Z" fill="#F7C66B" opacity={0.9} />
              </Svg>
            </Animated.View>
          </View>

          <Animated.View style={{ opacity: titleOpacity, transform: [{ translateY: titleTY }], alignItems: 'center', marginTop: 28 }}>
            <Text style={styles.title}>燭影私語</Text>
          </Animated.View>
          <Animated.View style={{ opacity: subOpacity, alignItems: 'center', marginTop: 8 }}>
            <Text style={styles.subtitle}>Candle Whisper</Text>
          </Animated.View>
          <Animated.View style={{ opacity: subOpacity, alignItems: 'center', marginTop: 16 }}>
            <Text style={styles.tagline}>安靜地說</Text>
          </Animated.View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { alignItems: 'center' },
  canvas: { width: 200, height: 200, alignItems: 'center', justifyContent: 'center' },
  glow: {
    position: 'absolute', top: 6, width: 190, height: 190, borderRadius: 95,
    backgroundColor: 'rgba(232,165,87,0.22)',
  },
  // flame sits over the wick (~y=113 in the 200x220 candle viewBox → ~y=92 of the 190-tall render)
  flame: { position: 'absolute', top: 47, alignItems: 'center', justifyContent: 'flex-end' },
  smoke: { position: 'absolute', top: 40 },
  title: { fontFamily: 'NotoSerifTC-Regular', fontSize: 32, color: '#f5e2c4', letterSpacing: 8 },
  subtitle: { fontFamily: 'EBGaramond-Italic', fontSize: 16, color: 'rgba(245,226,196,0.6)', letterSpacing: 3 },
  tagline: { fontFamily: 'NotoSerifTC-Regular', fontSize: 13, color: 'rgba(245,226,196,0.4)', letterSpacing: 4 },
});
