import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import Svg, { Path, Circle, Rect, Defs, RadialGradient, Stop } from 'react-native-svg';

interface LogoProps {
  size?: number;
  showGlow?: boolean;
  animate?: boolean;
}

export function Logo({ size = 120, showGlow = true, animate = true }: LogoProps) {
  const scale = useRef(new Animated.Value(animate ? 0.6 : 1)).current;
  const opacity = useRef(new Animated.Value(animate ? 0 : 1)).current;
  const glowPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animate) return;
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 400, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();

    if (showGlow) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowPulse, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(glowPulse, { toValue: 0, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      ).start();
    }
  }, []);

  const s = size / 120;
  const w = 80 * s;
  const h = 120 * s;

  return (
    <Animated.View style={{ width: w, height: h, alignItems: 'center', justifyContent: 'center', opacity, transform: [{ scale }] }}>
      <Svg width={w} height={h} viewBox="0 0 80 120">
        <Defs>
          <RadialGradient id="logoGlow" cx="50%" cy="35%" r="45%">
            <Stop offset="0%" stopColor="#F5DFC5" stopOpacity="0.6" />
            <Stop offset="100%" stopColor="#F5DFC5" stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="flameGrad" cx="50%" cy="60%" r="50%">
            <Stop offset="0%" stopColor="#FFD699" stopOpacity="1" />
            <Stop offset="60%" stopColor="#E8863A" stopOpacity="0.95" />
            <Stop offset="100%" stopColor="#D4702A" stopOpacity="0.8" />
          </RadialGradient>
        </Defs>

        {showGlow && (
          <AnimatedCircle glowPulse={glowPulse} />
        )}

        <Path
          d="M24 38 L24 110 L56 110 L56 38"
          stroke="#9A7B3C"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M22 38 L58 38"
          stroke="#9A7B3C"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
        />
        <Rect
          x="28"
          y="52"
          width="24"
          height="58"
          rx="1"
          stroke="#9A7B3C"
          strokeWidth="1.8"
          fill="none"
        />
        <Circle cx="40" cy="88" r="3" fill="#9A7B3C" />
        <Rect x="38.8" y="88" width="2.4" height="6" rx="0.5" fill="#9A7B3C" />
        <Rect
          x="35"
          y="44"
          width="10"
          height="12"
          rx="1.5"
          stroke="#9A7B3C"
          strokeWidth="1.5"
          fill="none"
        />
        <Path
          d="M40 44 L40 40"
          stroke="#9A7B3C"
          strokeWidth="1"
          strokeLinecap="round"
        />
        <Path
          d="M40 28 C 44 33, 46 36, 46 40 C 46 43, 43 45, 40 45 C 37 45, 34 43, 34 40 C 34 36, 36 33, 40 28 Z"
          fill="url(#flameGrad)"
        />
        <Path
          d="M18 110 L62 110"
          stroke="#9A7B3C"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </Svg>
    </Animated.View>
  );
}

function AnimatedCircle({ glowPulse }: { glowPulse: Animated.Value }) {
  const opacity = glowPulse.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.6] });
  return (
    <Animated.View style={{ opacity }}>
      <Circle cx="40" cy="42" r="32" fill="url(#logoGlow)" />
    </Animated.View>
  );
}
