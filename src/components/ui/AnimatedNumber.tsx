// ============================================================
// AnimatedNumber — rolls between values, pulses on change
// Used for the wicks counter so spends/gains feel tangible.
// ============================================================
import React, { useEffect, useRef, useState } from 'react';
import { Animated, TextStyle, Easing } from 'react-native';

interface AnimatedNumberProps {
  value: number;
  style?: TextStyle | TextStyle[];
  gainColor?: string;
  spendColor?: string;
}

export function AnimatedNumber({ value, style, gainColor = '#7fb88f', spendColor = '#e07a5f' }: AnimatedNumberProps) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);
  const flash = useRef(new Animated.Value(0)).current;
  const [flashColor, setFlashColor] = useState(gainColor);

  useEffect(() => {
    if (value === prev.current) return;
    const gained = value > prev.current;
    setFlashColor(gained ? gainColor : spendColor);

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

    Animated.sequence([
      Animated.timing(flash, { toValue: 1, duration: 120, easing: Easing.out(Easing.quad), useNativeDriver: false }),
      Animated.timing(flash, { toValue: 0, duration: 700, useNativeDriver: false }),
    ]).start();

    prev.current = value;
    return () => clearInterval(id);
  }, [value]);

  const baseColor = (Array.isArray(style) ? Object.assign({}, ...style) : style)?.color ?? '#000';
  const color = flash.interpolate({
    inputRange: [0, 1],
    outputRange: [String(baseColor), flashColor],
  });
  const scale = flash.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1.25, 1],
  });

  return (
    <Animated.Text style={[style as any, { color, transform: [{ scale }] }]}>
      {display}
    </Animated.Text>
  );
}
