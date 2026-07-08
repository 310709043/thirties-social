// ============================================================
// PressableScale — touch feedback: scale-down + optional haptic
// Drop-in replacement for TouchableOpacity across the app.
// ============================================================
import React, { useRef } from 'react';
import { Animated, Pressable, ViewStyle, StyleProp, AccessibilityRole, AccessibilityState } from 'react-native';
import { hapticLight } from '../../lib/haptics';

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

  const pressIn = () => {
    Animated.spring(scale, { toValue: scaleTo, tension: 300, friction: 12, useNativeDriver: true }).start();
  };
  const pressOut = () => {
    Animated.spring(scale, { toValue: 1, tension: 300, friction: 10, useNativeDriver: true }).start();
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
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={accessibilityState}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}
