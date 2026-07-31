// Shared UI building blocks

import React, { ReactNode, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, Animated,
  StyleSheet, ViewStyle, TextStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Path as SvgPath, Ellipse, Rect } from 'react-native-svg';
import { Palette } from '../../lib/theme';
import { NightAtmosphere } from './NightAtmosphere';
import { MOTION, USE_NATIVE_DRIVER, useReduceMotion } from '../../lib/motion';
import { PressableScale } from './Pressable';

// ── VaporBackground ──────────────────────────────────────────
export function VaporBackground({ p, children, style }: { p: Palette; children: ReactNode; style?: ViewStyle }) {
  return (
    <LinearGradient
      colors={p.bg as any}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={[{ flex: 1, overflow: 'hidden' }, style]}
    >
      {/* Layered twilight light: a warm focal glow plus a cooler lower echo.
          These use native Views rather than blur filters, so Android gets the
          same visual hierarchy as iOS and web. */}
      <View style={{
        position: 'absolute', top: '-16%', right: '-34%',
        width: '112%', aspectRatio: 1,
        backgroundColor: p.glow,
        borderRadius: 999,
        opacity: p.dark ? 0.32 : 0.42,
      }} />
      <View style={{
        position: 'absolute', top: '24%', left: '-48%',
        width: '98%', aspectRatio: 1,
        backgroundColor: p.dark ? p.accentSoft : 'rgba(255,247,231,0.76)',
        borderRadius: 999,
        opacity: p.dark ? 0.42 : 0.9,
      }} />
      <View style={{
        position: 'absolute', bottom: '-28%', right: '-42%',
        width: '122%', aspectRatio: 1,
        backgroundColor: p.dark ? p.glow : 'rgba(104,74,106,0.10)',
        borderRadius: 999,
        opacity: p.dark ? 0.22 : 1,
      }} />
      <NightAtmosphere p={p} />
      {children}
    </LinearGradient>
  );
}

// ── GlassCard ─────────────────────────────────────────────────
export const GlassCard = React.memo(function GlassCard({
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
      borderWidth: 1,
      borderColor: p.line,
      shadowColor: p.dark ? '#000' : '#6f4054',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: p.dark ? 0.28 : 0.14,
      shadowRadius: 30,
      elevation: p.dark ? 6 : 4,
    }, style]}>
      {children}
    </View>
  );
  if (onPress) return <TouchableOpacity onPress={onPress} activeOpacity={0.85} accessibilityRole="button">{inner}</TouchableOpacity>;
  return inner;
});

// ── SoftButton ────────────────────────────────────────────────
type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'accent' | 'danger';
type BtnSize = 'sm' | 'md' | 'lg';

export const SoftButton = React.memo(function SoftButton({
  p, children, onPress, variant = 'primary', size = 'md', full = false, style, disabled = false,
}: {
  p: Palette; children: ReactNode; onPress?: () => void;
  variant?: BtnVariant; size?: BtnSize; full?: boolean; style?: ViewStyle; disabled?: boolean;
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
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      scaleTo={0.975}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
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
        opacity: disabled ? 0.5 : 1,
        shadowColor: variant === 'primary' || variant === 'accent' ? p.ink : 'transparent',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: disabled || (variant !== 'primary' && variant !== 'accent') ? 0 : (p.dark ? 0.18 : 0.22),
        shadowRadius: 16,
        elevation: disabled || (variant !== 'primary' && variant !== 'accent') ? 0 : 5,
      }, style]}
    >
      {typeof children === 'string'
        ? <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: sizes.fontSize, color: v.color, fontWeight: '500' }}>{children}</Text>
        : children}
    </PressableScale>
  );
});

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
export function BreathDot({ p, size = 8, animate = true }: { p: Palette; size?: number; animate?: boolean }) {
  const breath = useRef(new Animated.Value(1)).current;
  const reduceMotion = useReduceMotion();

  useEffect(() => {
    if (!animate || reduceMotion) {
      breath.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, { toValue: 1.3, duration: MOTION.breathe, easing: MOTION.easeInOut, useNativeDriver: USE_NATIVE_DRIVER }),
        Animated.timing(breath, { toValue: 1, duration: MOTION.breathe, easing: MOTION.easeInOut, useNativeDriver: USE_NATIVE_DRIVER }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [animate, breath, reduceMotion]);

  return (
    <Animated.View style={{
      width: size, height: size, borderRadius: size,
      backgroundColor: p.accent,
      shadowColor: p.accent,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: breath.interpolate({ inputRange: [1, 1.3], outputRange: [0.5, 0.9] }),
      shadowRadius: breath.interpolate({ inputRange: [1, 1.3], outputRange: [size * 1.2, size * 2] }),
      transform: [{ scale: breath }],
    }} />
  );
}

// ── CountdownBar ──────────────────────────────────────────────
export const CountdownBar = React.memo(function CountdownBar({ p, progress }: { p: Palette; progress: number }) {
  return (
    <View style={{ height: 2, backgroundColor: p.line, borderRadius: 2 }}>
      <View style={{
        position: 'absolute', left: 0, top: 0, bottom: 0,
        width: `${progress * 100}%` as any,
        backgroundColor: p.accent,
        borderRadius: 2,
      }} />
    </View>
  );
});

// ── CountdownRing ─────────────────────────────────────────────
export const CountdownRing = React.memo(function CountdownRing({
  p, progress, size = 36, stroke = 2,
}: {
  p: Palette; progress: number; size?: number; stroke?: number;
}) {
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.max(0, Math.min(1, progress)));
  return (
    <Svg width={size} height={size}>
      <Circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={p.line} strokeWidth={stroke} />
      <Circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={p.accent} strokeWidth={stroke}
        strokeDasharray={`${circ} ${circ}`}
        strokeDashoffset={offset}
        strokeLinecap="round"
        rotation={-90}
        origin={`${size / 2}, ${size / 2}`}
      />
    </Svg>
  );
});

// ── Toggle ────────────────────────────────────────────────────
export function Toggle({
  p, on, onToggle, accessibilityLabel,
}: {
  p: Palette; on: boolean; onToggle?: () => void; accessibilityLabel?: string;
}) {
  const knobX = useRef(new Animated.Value(on ? 18 : 2)).current;
  const reduceMotion = useReduceMotion();

  useEffect(() => {
    if (reduceMotion) {
      knobX.setValue(on ? 18 : 2);
      return;
    }
    Animated.spring(knobX, {
      toValue: on ? 18 : 2,
      tension: 120,
      friction: 10,
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start();
  }, [knobX, on, reduceMotion]);

  return (
    <TouchableOpacity
      onPress={onToggle}
      activeOpacity={0.85}
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: on, disabled: !onToggle }}
      style={{
      width: 40, height: 24, borderRadius: 24,
      backgroundColor: on ? p.accent : p.line,
      justifyContent: 'center',
      position: 'relative',
    }}>
      <Animated.View style={{
        position: 'absolute',
        top: 2, left: 0,
        transform: [{ translateX: knobX }],
        width: 20, height: 20, borderRadius: 10,
        backgroundColor: '#fff',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2, shadowRadius: 4,
      }} />
    </TouchableOpacity>
  );
}

// ── WickGlyph ─────────────────────────────────────────────────
export function WickGlyph({ size = 14, color = '#e0c08a' }: { size?: number; color?: string }) {
  const h = Math.round(size * 1.4);
  return (
    <Svg width={size} height={h} viewBox="0 0 14 20">
      <SvgPath
        d="M7 1 C 8.5 4 10 5 10 7.5 C 10 9.5 8.8 11 7 11 C 5.2 11 4 9.5 4 7.5 C 4 5 5.5 4 7 1 Z"
        fill={color} fillOpacity={0.95}
      />
      <Rect x={6} y={11} width={2} height={6} rx={0.5} fill={color} fillOpacity={0.5} />
      <Ellipse cx={7} cy={18} rx={3} ry={0.8} fill={color} fillOpacity={0.2} />
    </Svg>
  );
}

// ── PhotoVeil ─────────────────────────────────────────────────
export function PhotoVeil({
  p, liftLevel = 0, size = 220, lang = 'zh',
}: {
  p: Palette; liftLevel?: number; size?: number; lang?: string;
}) {
  const levels = [
    { blur: 32, dim: 0.70, label_zh: '完全覆蓋', label_en: 'fully veiled' },
    { blur: 22, dim: 0.55, label_zh: '輪廓',     label_en: 'outline' },
    { blur: 12, dim: 0.38, label_zh: '光與影',   label_en: 'light & shadow' },
    { blur: 6,  dim: 0.18, label_zh: '局部',     label_en: 'fragments' },
    { blur: 0,  dim: 0,    label_zh: '完整',     label_en: 'full' },
  ];
  const lv = levels[Math.max(0, Math.min(4, liftLevel))];
  const label = lang === 'en' ? lv.label_en : lv.label_zh;

  return (
    <View style={{
      width: size, height: size, borderRadius: 24,
      overflow: 'hidden', borderWidth: 0.5, borderColor: p.line,
      backgroundColor: p.dark ? '#2a2840' : '#cdb89e',
    }}>
      {/* placeholder portrait gradient */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: p.dark ? '#1a1830' : '#e9dfd2' }} />
      {/* veil overlay */}
      <View style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: p.dark ? '#000' : '#fff',
        opacity: lv.dim,
      }} />
      {/* layer dots */}
      <View style={{ position: 'absolute', left: 10, bottom: 10, flexDirection: 'row', gap: 3 }}>
        {[0, 1, 2, 3].map(i => (
          <View key={i} style={{
            width: 18, height: 3, borderRadius: 2,
            backgroundColor: i < liftLevel ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.2)',
          }} />
        ))}
      </View>
      {/* label pill */}
      <View style={{
        position: 'absolute', right: 10, top: 10,
        backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 999,
        paddingHorizontal: 8, paddingVertical: 4,
      }}>
        <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 10, color: '#fff' }}>
          {label}
        </Text>
      </View>
    </View>
  );
}

// ── ScreenHeader ──────────────────────────────────────────────
// One consistent top bar for every secondary screen: a circular back button,
// an optional centered title (with quiet bilingual subtitle), and a right slot.
// Replaces the ad-hoc mix of "‹ back" text links and bespoke round buttons.
export function ScreenHeader({
  p, onBack, title, subtitle, right, style,
}: {
  p: Palette; onBack: () => void;
  title?: string; subtitle?: string; right?: ReactNode; style?: ViewStyle;
}) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 20, minHeight: 40 }, style]}>
      <TouchableOpacity onPress={onBack} activeOpacity={0.7}
        accessibilityRole="button" accessibilityLabel="返回"
        style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: p.surface, borderWidth: 0.5, borderColor: p.line, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: p.muted, fontSize: 19, marginTop: -2 }}>‹</Text>
      </TouchableOpacity>
      {title ? (
        <View style={{ flex: 1, alignItems: 'center', gap: 1 }}>
          <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 15, color: p.ink, letterSpacing: 1 }}>{title}</Text>
          {subtitle ? (
            <Text style={{ fontFamily: 'EBGaramond-Italic', fontSize: 11, color: p.muted, opacity: 0.65 }}>{subtitle}</Text>
          ) : null}
        </View>
      ) : <View style={{ flex: 1 }} />}
      <View style={{ width: 44, height: 44, alignItems: 'flex-end', justifyContent: 'center' }}>
        {right}
      </View>
    </View>
  );
}

// ── Animation & feedback components ─────────────────────────
export { Flame, Candle } from './Flame';
export { AnimatedNumber } from './AnimatedNumber';
export { PressableScale } from './Pressable';
export { Skeleton, MessageSkeleton } from './Skeleton';
export { FadeInUp } from './FadeIn';
export { LoftTransition } from './LoftTransition';
export { ToastProvider, useToast } from './Toast';
export { Logo } from './Logo';
export { TypingIndicator } from './TypingIndicator';
export { Tooltip } from './Tooltip';
export { ExtendGlyph, RekindleGlyph, BondGlyph } from './CandleGlyphs';
