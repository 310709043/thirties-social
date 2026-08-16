import React, { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import Svg, { Path, Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { MOTION, USE_NATIVE_DRIVER, useReduceMotion } from '../../lib/motion';

interface LogoProps {
  size?: number;
  showGlow?: boolean;
  animate?: boolean;
}

// Brand mark (design handoff §品牌): a DOOR with a lit CANDLE and a KEYHOLE — you
// push a door, and inside there's one flame. Replaces the old nine-shape candle-
// stand that turned to mush at 32px. One viewBox (0 0 512 512), a size ladder
// that drops the detail that can't survive each step but always keeps "a candle
// behind a door", and the dark-on-#170f13 palette (#c99154 ≈ 4.6:1). The flame
// alone is also the wick currency glyph.
const DARK = {
  frame: '#c99154',   // door frame / candle body / keyhole
  ground: '#8f6229',
  flame: '#f58823',
  bodyFill: 'rgba(245,226,196,0.07)',
};

export function Logo({ size = 120, showGlow = true, animate = true }: LogoProps) {
  const scale = useRef(new Animated.Value(animate ? 0.6 : 1)).current;
  const opacity = useRef(new Animated.Value(animate ? 0 : 1)).current;
  const glowPulse = useRef(new Animated.Value(0)).current;
  const reduceMotion = useReduceMotion();

  useEffect(() => {
    if (!animate || reduceMotion) {
      scale.setValue(1);
      opacity.setValue(1);
      glowPulse.setValue(showGlow ? 0.45 : 0);
      return;
    }
    const intro = Animated.parallel([
      Animated.spring(scale, { toValue: 1, tension: 50, friction: 7, useNativeDriver: USE_NATIVE_DRIVER }),
      Animated.timing(opacity, { toValue: 1, duration: MOTION.reveal, easing: MOTION.easeOut, useNativeDriver: USE_NATIVE_DRIVER }),
    ]);
    intro.start();
    let glow: Animated.CompositeAnimation | null = null;
    if (showGlow) {
      glow = Animated.loop(
        Animated.sequence([
          Animated.timing(glowPulse, { toValue: 1, duration: 2000, easing: MOTION.easeInOut, useNativeDriver: USE_NATIVE_DRIVER }),
          Animated.timing(glowPulse, { toValue: 0, duration: 2000, easing: MOTION.easeInOut, useNativeDriver: USE_NATIVE_DRIVER }),
        ])
      );
      glow.start();
    }
    return () => { intro.stop(); glow?.stop(); };
  }, [animate, glowPulse, opacity, reduceMotion, scale, showGlow]);

  // Size ladder — each tier drops what can't survive but keeps the candle+door.
  const tier: 'full' | 'mid' | 'small' | 'tiny' | 'flame' =
    size >= 96 ? 'full' : size >= 56 ? 'mid' : size >= 32 ? 'small' : size >= 24 ? 'tiny' : 'flame';
  const showKeyhole = tier === 'full';
  const showGround = tier === 'full' || tier === 'mid';
  const showGlowCircle = showGlow && (tier === 'full' || tier === 'mid');
  const doorStroke = tier === 'full' ? 11 : tier === 'mid' ? 18 : 30;

  return (
    <Animated.View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', opacity, transform: [{ scale }] }}>
      <Svg width={size} height={size} viewBox="0 0 512 512">
        <Defs>
          <RadialGradient id="logoGlowV2" cx="51%" cy="35%" r="50%">
            <Stop offset="0%" stopColor={DARK.flame} stopOpacity="0.26" />
            <Stop offset="100%" stopColor={DARK.flame} stopOpacity="0" />
          </RadialGradient>
        </Defs>

        {showGlowCircle && (
          <AnimatedGlow glowPulse={glowPulse} />
        )}

        {/* FLAME — present in every tier; also the wick currency glyph */}
        <Path
          d="M266 174 C 252 206, 244 226, 244 246 C 244 268, 255 282, 268 284 C 263 270, 261 258, 266 246 C 272 230, 282 224, 283 238 C 285 254, 279 270, 268 284 C 285 279, 292 258, 290 236 C 287 208, 277 190, 266 174 Z"
          fill={DARK.flame}
          transform={tier === 'tiny' ? 'translate(-10 -70) scale(1.35 1.35)' : undefined}
        />

        {tier !== 'flame' && tier !== 'tiny' && (
          <>
            {/* DOOR FRAME */}
            <Path
              d="M190 442 L193 152 L351 152 L354 442"
              stroke={DARK.frame}
              strokeWidth={doorStroke}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* CANDLE BODY — outline above 32px, solid at 32px */}
            {tier === 'small' ? (
              <Path d="M240 442 L240 300 Q 267 288 294 300 L294 442 Z" fill={DARK.frame} />
            ) : (
              <Path
                d="M232 442 L232 292 Q 267 278 302 292 L302 442"
                stroke={DARK.frame}
                strokeWidth={tier === 'full' ? 10 : 16}
                fill={DARK.bodyFill}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
          </>
        )}

        {/* BOLD DOOR SILHOUETTE at 24px (candle dropped, flame enlarged above) */}
        {tier === 'tiny' && (
          <Path
            d="M186 442 L190 160 L354 160 L358 442"
            stroke={DARK.frame}
            strokeWidth={42}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {showKeyhole && (
          <>
            <Circle cx={267} cy={366} r={11} fill={DARK.frame} />
            <Path d="M262 374 L258 398 L276 398 L272 374 Z" fill={DARK.frame} />
          </>
        )}

        {showGround && (
          <Path d="M126 452 Q 256 440 390 452 Q 256 462 126 452 Z" fill={DARK.ground} />
        )}
      </Svg>
    </Animated.View>
  );
}

const AnimatedSvgCircle = Animated.createAnimatedComponent(Circle);
function AnimatedGlow({ glowPulse }: { glowPulse: Animated.Value }) {
  const opacity = glowPulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });
  return <AnimatedSvgCircle cx={262} cy={180} r={128} fill="url(#logoGlowV2)" opacity={opacity} />;
}

// The wick currency glyph is the flame alone — same shape as the logo's flame,
// filled solid. Kept here so the mark, the app icon and the currency stay one
// shape at different sizes, not three drawings.
export function WickCurrencyGlyph({ size = 16, color = '#f58823' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 512 512">
      <Path
        d="M256 96 C 214 190, 190 250, 190 312 C 190 378, 220 420, 258 424 C 240 380, 234 340, 254 300 C 274 250, 306 232, 310 276 C 316 326, 296 378, 258 424 C 310 408, 334 340, 328 274 C 320 186, 288 130, 256 96 Z"
        fill={color}
      />
    </Svg>
  );
}
