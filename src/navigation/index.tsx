import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import OnboardingScreen from '../screens/OnboardingScreen';
import MoodScreen from '../screens/MoodScreen';
import RoomScreen from '../screens/RoomScreen';
import MatchScreen from '../screens/MatchScreen';
import ChatScreen from '../screens/ChatScreen';
import SafetyScreen from '../screens/SafetyScreen';
import CloseScreen from '../screens/CloseScreen';

export type RootStackParamList = {
  Onboarding: undefined;
  Mood: undefined;
  Room: { roomKey: string };
  Match: { fromSeed: string; moodText: string };
  Chat: { otherSeed: string };
  Safety: undefined;
  Close: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function Navigation() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Onboarding"
        screenOptions={{ headerShown: false, animation: 'fade' }}
      >
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="Mood" component={MoodScreen} />
        <Stack.Screen name="Room" component={RoomScreen} />
        <Stack.Screen name="Match" component={MatchScreen} />
        <Stack.Screen name="Chat" component={ChatScreen} />
        <Stack.Screen name="Safety" component={SafetyScreen} />
        <Stack.Screen name="Close" component={CloseScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
