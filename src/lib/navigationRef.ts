// navigationRef.ts — Global navigation ref for deep linking
import { createNavigationContainerRef } from '@react-navigation/native';
import { RootStackParamList } from '../navigation';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export function navigate(name: keyof RootStackParamList, params?: Record<string, any>) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name as any, params as any);
  }
}

// A navigation requested before the container is ready (cold start from a
// notification tap) is queued and flushed from NavigationContainer's onReady —
// silently dropping it made cold-start deep links do nothing.
let _pending: { name: keyof RootStackParamList; params?: Record<string, any> } | null = null;

export function resetAndNavigate(name: keyof RootStackParamList, params?: Record<string, any>) {
  if (navigationRef.isReady()) {
    navigationRef.resetRoot({
      index: 0,
      routes: [{ name: name as any, params }],
    });
  } else {
    _pending = { name, params };
  }
}

/** Called by NavigationContainer onReady — runs any queued deep link. */
export function flushPendingNavigation() {
  if (!_pending || !navigationRef.isReady()) return;
  const { name, params } = _pending;
  _pending = null;
  navigationRef.resetRoot({ index: 0, routes: [{ name: name as any, params }] });
}
