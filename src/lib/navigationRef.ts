// navigationRef.ts — Global navigation ref for deep linking
import { createNavigationContainerRef } from '@react-navigation/native';
import { RootStackParamList } from '../navigation';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export function navigate(name: keyof RootStackParamList, params?: Record<string, any>) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name as any, params as any);
  }
}

export function resetAndNavigate(name: keyof RootStackParamList, params?: Record<string, any>) {
  if (navigationRef.isReady()) {
    navigationRef.resetRoot({
      index: 0,
      routes: [{ name: name as any, params }],
    });
  }
}
