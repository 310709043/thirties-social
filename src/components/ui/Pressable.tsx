// ============================================================
// PressableScale — touch feedback: scale-down + optional haptic
// Drop-in replacement for TouchableOpacity across the app.
// ============================================================
import React, { useRef } from 'react';
import { Animated, Pressable, ViewStyle, StyleProp, AccessibilityRole, AccessibilityState } from 'react-native';
import { hapticLight } from '../../lib/haptics';
import { USE_NATIVE_DRIVER, useReduceMotion } from '../../lib/motion';

interface PressableScaleProps {
  onPress?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  haptic?: boolean;
  scaleTo?: number;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
  // Accessibility — forwarded to the underlying Pressable so callers can label
  // and announce state (selected / disabled) to screen readers.
  accessibilityRole?: AccessibilityRole;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityState?: AccessibilityState;
}

export function PressableScale({
  onPress,
  onLongPress,
  disabled = false,
  haptic = true,
  scaleTo = 0.96,
  style,
  children,
  accessibilityRole,
  accessibilityLabel,
  accessibilityHint,
  accessibilityState,
}: PressableScaleProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const reduceMotion = useReduceMotion();

  const pressIn = () => {
    if (reduceMotion) return;
    Animated.spring(scale, {
      toValue: scaleTo,
      tension: 300,
      friction: 12,
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start();
  };
  const pressOut = () => {
    if (reduceMotion) return;
    Animated.spring(scale, {
      toValue: 1,
      tension: 300,
      friction: 10,
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start();
  };

  return (
    <Pressable
      onPressIn={pressIn}
      onPressOut={pressOut}
      onPress={() => {
        if (disabled) return;
        if (haptic) hapticLight();
        onPress?.();
      }}
      onLongPress={onLongPress}
      disabled={disabled}
      accessibilityRole={accessibilityRole ?? (onPress ? 'button' : undefined)}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ ...accessibilityState, disabled }}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}
