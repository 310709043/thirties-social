// ============================================================
// AnimatedNumber — rolls between values, pulses on change
// Used for the wicks counter so spends/gains feel tangible.
// ============================================================
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Text, TextStyle, Easing } from 'react-native';

interface AnimatedNumberProps {
  value: number;
  style?: TextStyle | TextStyle[];
  /** color flash on change: green-ish for gain, ember for spend */
  gainColor?: string;
  spendColor?: string;
}

export function AnimatedNumber({ value, style, gainColor = '#7fb88f', spendColor = '#e07a5f' }: AnimatedNumberProps) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);
  const scale = useRef(new Animated.Value(1)).current;
  const flash = useRef(new Animated.Value(0)).current;
  const [flashColor, setFlashColor] = useState(gainColor);

  useEffect(() => {
    if (value === prev.current) return;
    const gained = value > prev.current;
    setFlashColor(gained ? gainColor : spendColor);

    // Count toward the new value in a few steps
    const from = prev.current;
    const diff = value - from;
    const steps = Math.min(Math.abs(diff), 8);
    let i = 0;
    const id = setInterval(() => {
      i++;
      if (i >= steps) {
        setDisplay(value);
        clearInterval(id);
      } else {
        setDisplay(Math.round(from + (diff * i) / steps));
      }
    }, 40);

    Animated.parallel([
      Animated.sequence([
        Animated.timing(scale, { toValue: gained ? 1.35 : 0.8, duration: 140, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, tension: 160, friction: 8, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.timing(flash, { toValue: 1, duration: 120, useNativeDriver: false }),
        Animated.timing(flash, { toValue: 0, duration: 700, useNativeDriver: false }),
      ]),
    ]).start();

    prev.current = value;
    return () => clearInterval(id);
  }, [value]);

  const baseColor = (Array.isArray(style) ? Object.assign({}, ...style) : style)?.color ?? '#000';
  const color = flash.interpolate({
    inputRange: [0, 1],
    outputRange: [String(baseColor), flashColor],
  });

  return (
    <Animated.Text style={[style as any, { color, transform: [{ scale }] }]}>
      {display}
    </Animated.Text>
  );
}
