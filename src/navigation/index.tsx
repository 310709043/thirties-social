import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { navigationRef, flushPendingNavigation } from '../lib/navigationRef';

import AuthScreen from '../screens/AuthScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import SetupScreen from '../screens/SetupScreen';
import MoodScreen from '../screens/MoodScreen';
import RoomScreen from '../screens/RoomScreen';
import MatchScreen from '../screens/MatchScreen';
import ChatScreen from '../screens/ChatScreen';
import SafetyScreen from '../screens/SafetyScreen';
import CloseScreen from '../screens/CloseScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';
import LoftScreen from '../screens/LoftScreen';
import LoftChatScreen from '../screens/LoftChatScreen';
import UpgradeScreen from '../screens/UpgradeScreen';

export type RootStackParamList = {
  Auth: { mode?: 'login' | 'register' } | undefined;
  Onboarding: undefined;
  Setup: { edit?: boolean } | undefined;
  Mood: undefined;
  Room: { roomKey: string; roomId?: string };
  Match: { fromSeed: string; moodText: string; conversationId: string; isOperator?: boolean; otherGender?: string | null; otherAge?: string | null; otherTonightMode?: string | null; myTonightMode?: string | null };
  Chat: { otherSeed: string; conversationId?: string; matchCharge?: boolean };
  Safety: { reportedUserId?: string; conversationId?: string; isLoft?: boolean };
  Close: { conversationsCount?: number; peopleCount?: number } | undefined;
  Profile: undefined;
  Settings: undefined;
  Loft: undefined;
  LoftChat: { otherSeed: string; loftConversationId: string; otherName: string; sessionEnteredAt?: number; expiresAt?: number; otherPhotoUrl?: string | null };
  Upgrade: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

interface NavigationProps {
  initialRoute?: string;
}

export default function Navigation({ initialRoute = 'Onboarding' }: NavigationProps) {
  return (
    <NavigationContainer ref={navigationRef} onReady={flushPendingNavigation}>
      <Stack.Navigator
        initialRouteName={initialRoute as any}
        screenOptions={{ headerShown: false, animation: 'fade' }}
      >
        <Stack.Screen name="Auth" component={AuthScreen} />
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="Setup" component={SetupScreen} />
        <Stack.Screen name="Mood" component={MoodScreen} />
        <Stack.Screen name="Room" component={RoomScreen} />
        <Stack.Screen name="Match" component={MatchScreen} />
        <Stack.Screen name="Chat" component={ChatScreen} />
        <Stack.Screen name="Safety" component={SafetyScreen} />
        <Stack.Screen name="Close" component={CloseScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="Loft" component={LoftScreen} />
        <Stack.Screen name="LoftChat" component={LoftChatScreen} />
        <Stack.Screen name="Upgrade" component={UpgradeScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
