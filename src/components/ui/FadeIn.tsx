// ============================================================
// FadeInUp — entrance animation wrapper for list items/bubbles
// ============================================================
import React, { useEffect, useRef } from 'react';
import { Animated, ViewStyle, StyleProp } from 'react-native';
import { MOTION, USE_NATIVE_DRIVER, useReduceMotion } from '../../lib/motion';

interface FadeInUpProps {
  delay?: number;
  distance?: number;
  duration?: number;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

export function FadeInUp({ delay = 0, distance = 12, duration = 320, style, children }: FadeInUpProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(distance)).current;
  const reduceMotion = useReduceMotion();

  useEffect(() => {
    if (reduceMotion) {
      opacity.setValue(1);
      ty.setValue(0);
      return;
    }
    const animation = Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration,
        delay,
        easing: MOTION.easeOut,
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
      Animated.spring(ty, {
        toValue: 0,
        delay,
        tension: 90,
        friction: 12,
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [delay, distance, duration, opacity, reduceMotion, ty]);

  return (
    <Animated.View style={[style, { opacity, transform: [{ translateY: ty }] }]}>
      {children}
    </Animated.View>
  );
}
