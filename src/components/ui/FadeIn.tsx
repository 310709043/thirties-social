// ============================================================
// FadeInUp — entrance animation wrapper for list items/bubbles
// ============================================================
import React, { useEffect, useRef } from 'react';
import { Animated, ViewStyle, StyleProp } from 'react-native';

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

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration, delay, useNativeDriver: true }),
      Animated.spring(ty, { toValue: 0, delay, tension: 90, friction: 12, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[style, { opacity, transform: [{ translateY: ty }] }]}>
      {children}
    </Animated.View>
  );
}
