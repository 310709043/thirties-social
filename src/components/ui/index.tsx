// Shared UI building blocks

import React, { ReactNode } from 'react';
import {
  View, Text, TouchableOpacity, TextInput,
  StyleSheet, ViewStyle, TextStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Palette } from '../../lib/theme';

// ── VaporBackground ──────────────────────────────────────────
export function VaporBackground({ p, children, style }: { p: Palette; children: ReactNode; style?: ViewStyle }) {
  return (
    <LinearGradient
      colors={p.bg as any}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={[{ flex: 1 }, style]}
    >
      {/* accent orbs */}
      <View style={{
        position: 'absolute', top: '8%', left: '-20%',
        width: '90%', aspectRatio: 1,
        backgroundColor: p.accent + '44',
        borderRadius: 999,
        opacity: 0.55,
      }} />
      <View style={{
        position: 'absolute', bottom: '5%', right: '-30%',
        width: '110%', aspectRatio: 1,
        backgroundColor: p.accent + '33',
        borderRadius: 999,
        opacity: 0.4,
      }} />
      {children}
    </LinearGradient>
  );
}

// ── GlassCard ─────────────────────────────────────────────────
export function GlassCard({
  p, children, style, padding = 20, radius = 28, onPress,
}: {
  p: Palette; children: ReactNode; style?: ViewStyle;
  padding?: number; radius?: number; onPress?: () => void;
}) {
  const inner = (
    <View style={[{
      backgroundColor: p.glass,
      borderRadius: radius,
      padding,
      borderWidth: 0.5,
      borderColor: p.line,
      shadowColor: p.dark ? '#000' : 'rgba(50,40,60,1)',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: p.dark ? 0.25 : 0.06,
      shadowRadius: 24,
    }, style]}>
      {children}
    </View>
  );
  if (onPress) return <TouchableOpacity onPress={onPress} activeOpacity={0.85}>{inner}</TouchableOpacity>;
  return inner;
}

// ── SoftButton ────────────────────────────────────────────────
type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'accent' | 'danger';
type BtnSize = 'sm' | 'md' | 'lg';

export function SoftButton({
  p, children, onPress, variant = 'primary', size = 'md', full = false, style,
}: {
  p: Palette; children: ReactNode; onPress?: () => void;
  variant?: BtnVariant; size?: BtnSize; full?: boolean; style?: ViewStyle;
}) {
  const sizes = {
    sm: { height: 36, fontSize: 13, paddingH: 14 },
    md: { height: 48, fontSize: 15, paddingH: 22 },
    lg: { height: 56, fontSize: 16, paddingH: 28 },
  }[size];

  const variants: Record<BtnVariant, ViewStyle & { color: string }> = {
    primary:   { backgroundColor: p.ink, borderWidth: 0, color: p.dark ? '#1a1530' : (p.surfaceSolid || '#fff') },
    secondary: { backgroundColor: p.surface, borderWidth: 0.5, borderColor: p.line, color: p.ink },
    ghost:     { backgroundColor: 'transparent', borderWidth: 0.5, borderColor: p.line, color: p.muted },
    accent:    { backgroundColor: p.accent, borderWidth: 0, color: p.dark ? '#15172e' : '#fbf5e4' },
    danger:    { backgroundColor: 'transparent', borderWidth: 0.5, borderColor: p.danger + '40', color: p.danger },
  };

  const v = variants[variant];
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[{
        height: sizes.height,
        paddingHorizontal: sizes.paddingH,
        borderRadius: 999,
        borderWidth: v.borderWidth,
        borderColor: (v as any).borderColor,
        backgroundColor: v.backgroundColor,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 8,
        width: full ? '100%' : undefined,
      }, style]}
    >
      {typeof children === 'string'
        ? <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: sizes.fontSize, color: v.color, fontWeight: '500' }}>{children}</Text>
        : children}
    </TouchableOpacity>
  );
}

// ── Hairline ──────────────────────────────────────────────────
export function Hairline({ p, style }: { p: Palette; style?: ViewStyle }) {
  return <View style={[{ height: StyleSheet.hairlineWidth, backgroundColor: p.line }, style]} />;
}

// ── Cap (small caps label) ────────────────────────────────────
export function Cap({ children, p, style }: { children: ReactNode; p: Palette; style?: TextStyle }) {
  return (
    <Text style={[{
      fontFamily: 'Inter-Regular',
      fontSize: 10, letterSpacing: 2.2, textTransform: 'uppercase',
      color: p.muted, fontWeight: '500',
    }, style]}>{children}</Text>
  );
}

// ── BreathDot ─────────────────────────────────────────────────
export function BreathDot({ p, size = 8 }: { p: Palette; size?: number }) {
  return (
    <View style={{
      width: size, height: size, borderRadius: size,
      backgroundColor: p.accent,
      shadowColor: p.accent,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.7,
      shadowRadius: size * 1.5,
    }} />
  );
}

// ── CountdownBar ──────────────────────────────────────────────
export function CountdownBar({ p, progress }: { p: Palette; progress: number }) {
  return (
    <View style={{ height: 2, backgroundColor: p.line, borderRadius: 2 }}>
      <View style={{
        position: 'absolute', left: 0, top: 0, bottom: 0,
        width: `${progress * 100}%`,
        backgroundColor: p.accent,
        borderRadius: 2,
      }} />
    </View>
  );
}
