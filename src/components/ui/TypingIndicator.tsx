import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, View } from 'react-native';
import { MOTION, USE_NATIVE_DRIVER, useReduceMotion } from '../../lib/motion';

interface TypingIndicatorProps {
  color?: string;
  size?: number;
}

export function TypingIndicator({ color = 'rgba(255,255,255,0.5)', size = 6 }: TypingIndicatorProps) {
  const dotA = useRef(new Animated.Value(0)).current;
  const dotB = useRef(new Animated.Value(0)).current;
  const dotC = useRef(new Animated.Value(0)).current;
  const dots = useMemo(() => [dotA, dotB, dotC], [dotA, dotB, dotC]);
  const reduceMotion = useReduceMotion();

  useEffect(() => {
    if (reduceMotion) {
      dots.forEach((dot, index) => dot.setValue(0.35 + index * 0.2));
      return;
    }
    const animations = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 180),
          Animated.timing(dot, { toValue: 1, duration: 400, easing: MOTION.easeOut, useNativeDriver: USE_NATIVE_DRIVER }),
          Animated.timing(dot, { toValue: 0, duration: 400, easing: MOTION.easeOut, useNativeDriver: USE_NATIVE_DRIVER }),
        ])
      )
    );
    const group = Animated.parallel(animations);
    group.start();
    return () => group.stop();
  }, [dots, reduceMotion]);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 8, paddingHorizontal: 14 }}>
      {dots.map((dot, i) => (
        <Animated.View
          key={i}
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
            opacity: dot.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
            transform: [{ scale: dot.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.2] }) }],
          }}
        />
      ))}
    </View>
  );
}
