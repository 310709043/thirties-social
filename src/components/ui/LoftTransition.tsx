// ============================================================
// LoftTransition — immersive entry overlay for the Loft.
// A candle is lit in darkness, the glow expands, then fades
// to reveal the room. Plays for ~2.2s, then calls onDone.
// ============================================================
import React, { useEffect, useRef } from 'react';
import { Animated, View, Text, StyleSheet, Easing, Dimensions } from 'react-native';
import { Candle } from './Flame';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

interface LoftTransitionProps {
  onDone: () => void;
  lang?: string;
}

export function LoftTransition({ onDone, lang = 'zh' }: LoftTransitionProps) {
  const candleOpacity = useRef(new Animated.Value(0)).current;
  const glowScale = useRef(new Animated.Value(0.2)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const overlayOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      // candle fades in from darkness
      Animated.timing(candleOpacity, { toValue: 1, duration: 450, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      // glow blooms outward + line of copy appears
      Animated.parallel([
        Animated.timing(glowOpacity, { toValue: 0.5, duration: 600, useNativeDriver: true }),
        Animated.timing(glowScale, { toValue: 2.6, duration: 1100, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(textOpacity, { toValue: 1, duration: 600, delay: 250, useNativeDriver: true }),
      ]),
      Animated.delay(400),
      // whole overlay dissolves into the loft
      Animated.timing(overlayOpacity, { toValue: 0, duration: 500, easing: Easing.in(Easing.quad), useNativeDriver: true }),
    ]).start(() => onDone());
  }, []);

  return (
    <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]} pointerEvents="none">
      <Animated.View
        style={[
          styles.glow,
          { opacity: glowOpacity, transform: [{ scale: glowScale }] },
        ]}
      />
      <Animated.View style={{ opacity: candleOpacity, alignItems: 'center' }}>
        <Candle size={110} />
      </Animated.View>
      <Animated.Text style={[styles.line, { opacity: textOpacity }]}>
        {lang === 'en' ? 'a candle is lit for you' : '為你點起一根燭'}
      </Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0, left: 0,
    width: SCREEN_W, height: SCREEN_H,
    backgroundColor: '#0b0608',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  glow: {
    position: 'absolute',
    width: 220, height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(232,165,87,0.30)',
  },
  line: {
    marginTop: 28,
    fontFamily: 'NotoSerifTC-Regular',
    fontSize: 15,
    letterSpacing: 3,
    color: 'rgba(245,226,196,0.75)',
  },
});
