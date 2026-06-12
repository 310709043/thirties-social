// ============================================================
// Skeleton — pulsing placeholder blocks for loading states
// ============================================================
import React, { useEffect, useRef } from 'react';
import { Animated, View, ViewStyle, StyleProp } from 'react-native';

interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
  color?: string;
}

export function Skeleton({ width = '100%', height = 16, radius = 8, style, color = 'rgba(128,128,150,0.16)' }: SkeletonProps) {
  const pulse = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.45, duration: 800, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <Animated.View
      style={[
        { width: width as any, height, borderRadius: radius, backgroundColor: color, opacity: pulse },
        style,
      ]}
    />
  );
}

/** A message-feed shaped skeleton: avatar circle + two text bars */
export function MessageSkeleton({ color }: { color?: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 12, paddingVertical: 6 }}>
      <Skeleton width={32} height={32} radius={16} color={color} />
      <View style={{ flex: 1, gap: 8 }}>
        <Skeleton width={'82%' as const} height={14} color={color} />
        <Skeleton width={'48%' as const} height={14} color={color} />
      </View>
    </View>
  );
}
