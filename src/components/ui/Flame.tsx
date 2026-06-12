// ============================================================
// Flame — animated candle flame with natural sway & flicker
// ============================================================
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import Svg, { Path, Ellipse, Defs, RadialGradient, Stop } from 'react-native-svg';

interface FlameProps {
  size?: number;          // overall height of the flame
  color?: string;         // outer flame color
  coreColor?: string;     // inner core color
  glow?: boolean;         // soft halo behind the flame
  /** When flipped to true the flame plays a blow-out animation then hides. */
  extinguished?: boolean;
}

export function Flame({
  size = 40,
  color = '#e8a557',
  coreColor = '#fbe9c8',
  glow = true,
  extinguished = false,
}: FlameProps) {
  const sway = useRef(new Animated.Value(0)).current;
  const flicker = useRef(new Animated.Value(1)).current;
  const life = useRef(new Animated.Value(1)).current;

  // Continuous sway — irregular timing so it feels organic
  useEffect(() => {
    let mounted = true;
    const loop = () => {
      if (!mounted) return;
      const dur = 700 + Math.random() * 900;
      const target = (Math.random() * 2 - 1);
      Animated.timing(sway, {
        toValue: target,
        duration: dur,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      }).start(() => loop());
    };
    loop();
    return () => { mounted = false; };
  }, []);

  // Brightness flicker
  useEffect(() => {
    let mounted = true;
    const loop = () => {
      if (!mounted) return;
      Animated.timing(flicker, {
        toValue: 0.75 + Math.random() * 0.25,
        duration: 120 + Math.random() * 280,
        easing: Easing.linear,
        useNativeDriver: true,
      }).start(() => loop());
    };
    loop();
    return () => { mounted = false; };
  }, []);

  // Blow-out: violent sway then shrink to nothing
  useEffect(() => {
    if (extinguished) {
      Animated.sequence([
        Animated.timing(sway, { toValue: 1.6, duration: 90, useNativeDriver: true }),
        Animated.timing(sway, { toValue: -1.8, duration: 80, useNativeDriver: true }),
        Animated.timing(life, { toValue: 0, duration: 260, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]).start();
    } else {
      life.setValue(1);
    }
  }, [extinguished]);

  const rotate = sway.interpolate({ inputRange: [-2, 2], outputRange: ['-9deg', '9deg'] });
  const skewX = sway.interpolate({ inputRange: [-2, 2], outputRange: ['-6deg', '6deg'] });

  const w = size * 0.62;

  return (
    <View style={{ width: w, height: size, alignItems: 'center', justifyContent: 'flex-end' }}>
      {glow && (
        <Animated.View
          style={{
            position: 'absolute',
            bottom: -size * 0.15,
            width: size * 1.5,
            height: size * 1.5,
            borderRadius: size,
            backgroundColor: color,
            opacity: Animated.multiply(flicker, life).interpolate({
              inputRange: [0, 1], outputRange: [0, 0.22],
            }),
            transform: [{ scale: life }],
          }}
        />
      )}
      <Animated.View
        style={{
          width: w,
          height: size,
          opacity: Animated.multiply(flicker, life),
          transform: [
            { translateY: size * 0.5 },
            { rotate },
            { skewX },
            { scaleY: life },
            { translateY: -size * 0.5 },
          ],
        }}
      >
        <Svg width={w} height={size} viewBox="0 0 62 100">
          <Defs>
            <RadialGradient id="flameGrad" cx="50%" cy="68%" r="60%">
              <Stop offset="0%" stopColor={coreColor} stopOpacity="1" />
              <Stop offset="55%" stopColor={color} stopOpacity="0.95" />
              <Stop offset="100%" stopColor={color} stopOpacity="0.55" />
            </RadialGradient>
          </Defs>
          {/* Outer flame — teardrop */}
          <Path
            d="M31 2 C 44 26, 58 44, 58 66 C 58 85, 46 98, 31 98 C 16 98, 4 85, 4 66 C 4 44, 18 26, 31 2 Z"
            fill="url(#flameGrad)"
          />
          {/* Inner core */}
          <Ellipse cx="31" cy="74" rx="11" ry="17" fill={coreColor} opacity={0.85} />
        </Svg>
      </Animated.View>
    </View>
  );
}

// ── Candle: flame + wax body, for splash / loft entry scenes ──
export function Candle({
  size = 80,
  flameColor = '#e8a557',
  waxColor = 'rgba(245,226,196,0.35)',
  extinguished = false,
}: {
  size?: number;
  flameColor?: string;
  waxColor?: string;
  extinguished?: boolean;
}) {
  const flameH = size * 0.45;
  const waxW = size * 0.16;
  const waxH = size * 0.5;
  return (
    <View style={{ alignItems: 'center' }}>
      <Flame size={flameH} color={flameColor} extinguished={extinguished} />
      {/* wick */}
      <View style={{ width: 2, height: size * 0.05, backgroundColor: '#3a2a1a', marginTop: -2 }} />
      {/* wax */}
      <View
        style={{
          width: waxW,
          height: waxH,
          borderRadius: waxW * 0.3,
          backgroundColor: waxColor,
        }}
      />
    </View>
  );
}
