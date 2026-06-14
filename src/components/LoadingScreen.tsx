// LoadingScreen.tsx — Animated loading screen
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Logo } from './ui';

interface Props {
  onDone: () => void;
}

export default function LoadingScreen({ onDone }: Props) {
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(20)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const bgOpacity = useRef(new Animated.Value(0)).current;
  const glowOpacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    // Background fade in
    Animated.timing(bgOpacity, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

    // Logo fade in + scale
    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 60,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    // Glow breathing
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowOpacity, {
          toValue: 0.6,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(glowOpacity, {
          toValue: 0.3,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    ).start();

    // Title slide in
    Animated.parallel([
      Animated.timing(titleOpacity, {
        toValue: 1,
        duration: 600,
        delay: 400,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(titleTranslateY, {
        toValue: 0,
        duration: 600,
        delay: 400,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();

    // Subtitle fade in
    Animated.timing(subtitleOpacity, {
      toValue: 1,
      duration: 600,
      delay: 700,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();

    // Navigate after animation
    const timer = setTimeout(() => {
      onDone();
    }, 2200);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: bgOpacity }]}>
      <LinearGradient
        colors={['#0d0d14', '#1a1018', '#0d0d14']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Ambient glow */}
        <Animated.View style={[styles.glow, { opacity: glowOpacity }]} />

        <View style={styles.content}>
          {/* Logo */}
          <Animated.View style={{
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          }}>
            <Logo size={80} showGlow={true} />
          </Animated.View>

          {/* Title */}
          <Animated.View style={{
            opacity: titleOpacity,
            transform: [{ translateY: titleTranslateY }],
            alignItems: 'center',
            marginTop: 24,
          }}>
            <Text style={styles.title}>第卅者</Text>
          </Animated.View>

          {/* Subtitle */}
          <Animated.View style={{ opacity: subtitleOpacity, alignItems: 'center', marginTop: 8 }}>
            <Text style={styles.subtitle}>The Other</Text>
          </Animated.View>

          {/* Tagline */}
          <Animated.View style={{ opacity: subtitleOpacity, alignItems: 'center', marginTop: 16 }}>
            <Text style={styles.tagline}>安靜地說</Text>
          </Animated.View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  glow: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(232, 165, 87, 0.25)',
  },
  content: {
    alignItems: 'center',
    gap: 4,
  },
  title: {
    fontFamily: 'NotoSerifTC-Regular',
    fontSize: 32,
    color: '#f5e2c4',
    letterSpacing: 8,
  },
  subtitle: {
    fontFamily: 'EBGaramond-Italic',
    fontSize: 16,
    color: 'rgba(245, 226, 196, 0.6)',
    letterSpacing: 3,
  },
  tagline: {
    fontFamily: 'NotoSerifTC-Regular',
    fontSize: 13,
    color: 'rgba(245, 226, 196, 0.4)',
    letterSpacing: 4,
  },
});
