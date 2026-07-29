// CandleGlyphs — hand-drawn candle motifs for the three closeness rituals.
// Inspired by reference sticker icons the founder collected, redrawn in the
// app's thin-line half-dark language so they belong to the night. Each glyph
// carries a soft flame flicker (one native-driver opacity loop — negligible
// cost, but the fire feels alive).
import React, { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import Svg, { Path, Circle, Line, Rect } from 'react-native-svg';
import { MOTION, USE_NATIVE_DRIVER, useReduceMotion } from '../../lib/motion';

function useFlicker(duration = 1400): Animated.Value {
  const v = useRef(new Animated.Value(0.75)).current;
  const reduceMotion = useReduceMotion();
  useEffect(() => {
    if (reduceMotion) {
      v.setValue(0.9);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration, easing: MOTION.easeInOut, useNativeDriver: USE_NATIVE_DRIVER }),
        Animated.timing(v, { toValue: 0.75, duration: duration * 0.8, easing: MOTION.easeInOut, useNativeDriver: USE_NATIVE_DRIVER }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [duration, reduceMotion, v]);
  return v;
}

/** A flame that breathes — layered over the static candle body. */
function FlickerFlame({ size, x, y, scale = 1, color = '#e8a557' }: {
  size: number; x: number; y: number; scale?: number; color?: string;
}) {
  const flicker = useFlicker(1200 + Math.random() * 600);
  const s = (size / 32) * scale;
  return (
    <Animated.View style={{ position: 'absolute', left: (x / 32) * size, top: (y / 32) * size, opacity: flicker }}>
      <Svg width={8 * s} height={11 * s} viewBox="0 0 8 11">
        <Path d="M4 0 C 5.8 2.6, 6.6 4.1, 6.6 6 C 6.6 8.2, 5.4 9.6, 4 9.6 C 2.6 9.6, 1.4 8.2, 1.4 6 C 1.4 4.1, 2.2 2.6, 4 0 Z"
          fill={color} />
        <Path d="M4 3.4 C 4.9 4.8, 5.2 5.6, 5.2 6.6 C 5.2 7.8, 4.7 8.5, 4 8.5 C 3.3 8.5, 2.8 7.8, 2.8 6.6 C 2.8 5.6, 3.1 4.8, 4 3.4 Z"
          fill="#fbf0dc" fillOpacity={0.9} />
      </Svg>
    </Animated.View>
  );
}

/**
 * 續燭 ExtendGlyph — a melted-down candle whose flame still holds on:
 * "the wax is low, but we're not done."
 */
export function ExtendGlyph({ size = 16, ink = '#5d4a3a' }: { size?: number; ink?: string }) {
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 32 32">
        {/* squat candle with a drip running down the side */}
        <Rect x={10} y={16} width={12} height={11} rx={2.5} fill="none" stroke={ink} strokeWidth={1.5} />
        <Path d="M10 18 C 11.5 16.2, 13 17.6, 14.5 16.4 C 16.5 15, 18.5 17.2, 20.5 16.2 C 21.2 15.9, 21.8 16.4, 22 17"
          fill="none" stroke={ink} strokeWidth={1.3} strokeLinecap="round" />
        <Path d="M12.5 17 C 12.5 19.5, 12.2 21, 12.2 22.5" fill="none" stroke={ink} strokeWidth={1.1} strokeLinecap="round" />
        {/* wick */}
        <Line x1={16} y1={16} x2={16} y2={13.5} stroke={ink} strokeWidth={1.2} strokeLinecap="round" />
      </Svg>
      <FlickerFlame size={size} x={12.2} y={3.2} scale={1.15} />
    </View>
  );
}

/**
 * 重逢 RekindleGlyph — twin candles: one burning, one with a spark about to
 * catch. "One flame passes the night to another."
 */
export function RekindleGlyph({ size = 16, ink = '#5d4a3a' }: { size?: number; ink?: string }) {
  const spark = useFlicker(900);
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 32 32">
        {/* tall lit candle */}
        <Rect x={7.5} y={12} width={6} height={15} rx={1.8} fill="none" stroke={ink} strokeWidth={1.5} />
        <Line x1={10.5} y1={12} x2={10.5} y2={9.5} stroke={ink} strokeWidth={1.2} strokeLinecap="round" />
        {/* shorter waiting candle */}
        <Rect x={19} y={17} width={6} height={10} rx={1.8} fill="none" stroke={ink} strokeWidth={1.5} />
        <Line x1={22} y1={17} x2={22} y2={14.8} stroke={ink} strokeWidth={1.2} strokeLinecap="round" />
      </Svg>
      <FlickerFlame size={size} x={6.8} y={0.5} scale={1.0} />
      {/* the waiting wick sparks — tomorrow it catches */}
      <Animated.View style={{ position: 'absolute', left: (19.5 / 32) * size, top: (10.5 / 32) * size, opacity: spark }}>
        <Svg width={(6 / 32) * size * 1.6} height={(6 / 32) * size * 1.6} viewBox="0 0 8 8">
          <Line x1={4} y1={0.5} x2={4} y2={2.2} stroke="#e8a557" strokeWidth={1} strokeLinecap="round" />
          <Line x1={0.8} y1={4} x2={2.4} y2={4} stroke="#e8a557" strokeWidth={1} strokeLinecap="round" />
          <Line x1={5.6} y1={4} x2={7.2} y2={4} stroke="#e8a557" strokeWidth={1} strokeLinecap="round" />
          <Line x1={1.7} y1={1.7} x2={2.8} y2={2.8} stroke="#e8a557" strokeWidth={1} strokeLinecap="round" />
          <Line x1={5.2} y1={2.8} x2={6.3} y2={1.7} stroke="#e8a557" strokeWidth={1} strokeLinecap="round" />
        </Svg>
      </Animated.View>
    </View>
  );
}

/**
 * 熟人 BondGlyph — a candle kept inside a glass jar: a flame protected from
 * the wind, the one you chose to keep.
 */
export function BondGlyph({ size = 16, ink = '#5d4a3a' }: { size?: number; ink?: string }) {
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 32 32">
        {/* jar */}
        <Path d="M10 10.5 C 10 9.3, 11 8.5, 12 8.5 L 20 8.5 C 21 8.5, 22 9.3, 22 10.5 L 22 24.5 C 22 26, 21 27, 19.5 27 L 12.5 27 C 11 27, 10 26, 10 24.5 Z"
          fill="none" stroke={ink} strokeWidth={1.5} />
        {/* lid */}
        <Line x1={9} y1={8.5} x2={23} y2={8.5} stroke={ink} strokeWidth={1.6} strokeLinecap="round" />
        <Line x1={11} y1={6.4} x2={21} y2={6.4} stroke={ink} strokeWidth={1.3} strokeLinecap="round" />
        {/* candle inside */}
        <Rect x={13.5} y={19} width={5} height={8} rx={1.2} fill={ink} fillOpacity={0.25} />
        <Line x1={16} y1={19} x2={16} y2={17} stroke={ink} strokeWidth={1.1} strokeLinecap="round" />
      </Svg>
      <FlickerFlame size={size} x={12.4} y={7.6} scale={0.85} />
    </View>
  );
}
