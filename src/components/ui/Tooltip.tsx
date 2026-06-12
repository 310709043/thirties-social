import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, Easing } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface TooltipProps {
  id: string;
  title: string;
  message: string;
  position?: 'top' | 'bottom';
  delay?: number;
}

export function Tooltip({ id, title, message, position = 'bottom', delay = 500 }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(position === 'top' ? -10 : 10)).current;

  useEffect(() => {
    const checkShown = async () => {
      try {
        const shown = await AsyncStorage.getItem(`tooltip_${id}`);
        if (!shown) {
          setTimeout(() => {
            setVisible(true);
            Animated.parallel([
              Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
              Animated.spring(translateY, { toValue: 0, tension: 80, friction: 12, useNativeDriver: true }),
            ]).start();
          }, delay);
        }
      } catch {}
    };
    checkShown();
  }, []);

  const dismiss = async () => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: position === 'top' ? -10 : 10, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      setVisible(false);
      AsyncStorage.setItem(`tooltip_${id}`, '1');
    });
  };

  if (!visible) return null;

  return (
    <Animated.View style={{
      position: 'absolute',
      [position]: 0,
      left: 16,
      right: 16,
      zIndex: 1000,
      opacity,
      transform: [{ translateY }],
    }}>
      <View style={{
        backgroundColor: 'rgba(30,20,40,0.95)',
        borderRadius: 16,
        padding: 16,
        borderWidth: 0.5,
        borderColor: 'rgba(232,165,87,0.3)',
      }}>
        <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 15, color: '#f5e2c4', fontWeight: '500', marginBottom: 6 }}>
          {title}
        </Text>
        <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 13, color: 'rgba(245,226,196,0.7)', lineHeight: 20 }}>
          {message}
        </Text>
        <TouchableOpacity onPress={dismiss} style={{ alignSelf: 'flex-end', marginTop: 10 }}>
          <Text style={{ fontFamily: 'Inter-Regular', fontSize: 11, color: '#e8a557', letterSpacing: 1 }}>
            知道了 · GOT IT
          </Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}
