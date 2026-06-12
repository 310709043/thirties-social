import React, { createContext, useContext, useRef, useCallback } from 'react';
import { Animated, Text, View, StyleSheet } from 'react-native';

interface ToastOpts {
  message: string;
  type?: 'default' | 'success' | 'warning' | 'error';
  duration?: number;
}
type ShowToast = (opts: ToastOpts) => void;
const ToastCtx = createContext<ShowToast>(() => {});
export function useToast() { return useContext(ToastCtx); }

interface ToastItem extends ToastOpts { id: number }

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([]);
  const counter = useRef(0);
  const show = useCallback((opts: ToastOpts) => {
    const id = ++counter.current;
    setItems(prev => [...prev, { ...opts, id }]);
    setTimeout(() => { setItems(prev => prev.filter(t => t.id !== id)); }, opts.duration ?? 2800);
  }, []);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      <View style={styles.container} pointerEvents="none">
        {items.map(t => <ToastBubble key={t.id} item={t} />)}
      </View>
    </ToastCtx.Provider>
  );
}

function ToastBubble({ item }: { item: ToastItem }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(16)).current;
  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.spring(ty, { toValue: 0, tension: 120, friction: 10, useNativeDriver: true }),
    ]).start();
    const t = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }).start();
    }, (item.duration ?? 2800) - 250);
    return () => clearTimeout(t);
  }, []);
  const bg = item.type === 'success' ? '#3d7a5c' : item.type === 'error' ? '#8a2d38' : item.type === 'warning' ? '#7a5a1e' : 'rgba(30,32,48,0.93)';
  return (
    <Animated.View style={[styles.bubble, { backgroundColor: bg, opacity, transform: [{ translateY: ty }] }]}>
      <Text style={styles.text}>{item.message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'absolute', bottom: 90, left: 0, right: 0, alignItems: 'center', zIndex: 9999, gap: 8, pointerEvents: 'none' },
  bubble:    { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 100, maxWidth: 320 },
  text:      { fontFamily: 'Inter-Regular', fontSize: 13, color: '#f0ede8', textAlign: 'center' },
});
