// useIsForeground — true while the app is in the foreground.
//
// Screens with heartbeats or realtime subscriptions gate their `useEffect`
// on this so a backgrounded phone stops pinging Firestore and stops
// broadcasting a false "still here" presence to other users.
import { useEffect, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';

export function useIsForeground(): boolean {
  const [active, setActive] = useState<boolean>(AppState.currentState === 'active');
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s: AppStateStatus) => {
      setActive(s === 'active');
    });
    return () => sub.remove();
  }, []);
  return active;
}
