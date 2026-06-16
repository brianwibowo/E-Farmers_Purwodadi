import React, { useState, useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../utils/AuthContext';
import { theme } from '../theme';

// Screens
import BottomTabNavigator from './BottomTabNavigator';
import TambahCatatanScreen from '../screens/TambahCatatanScreen';
import EditCatatanScreen from '../screens/EditCatatanScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ProfileScreen from '../screens/ProfileScreen';
import LupaPasswordScreen from '../screens/LupaPasswordScreen';
import OnboardingScreen from '../screens/OnboardingScreen';

const Stack = createNativeStackNavigator();

export const AppNavigator = () => {
  const { user, loading } = useAuth();
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(null);
  const [onboardingLoading, setOnboardingLoading] = useState(true);

  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const value = await AsyncStorage.getItem('HAS_SEEN_ONBOARDING');
        setHasSeenOnboarding(value === 'true');
      } catch (err) {
        console.error('Failed to read onboarding status', err);
      } finally {
        setOnboardingLoading(false);
      }
    };
    checkOnboarding();
  }, []);

  // Show a loading screen while session or onboarding status is being verified
  if (loading || onboardingLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      {user === null ? (
        // Auth Stack
        <>
          {!hasSeenOnboarding && (
            <Stack.Screen 
              name="Onboarding" 
              component={OnboardingScreen} 
              initialParams={{ onFinish: () => setHasSeenOnboarding(true) }}
            />
          )}
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="LupaPassword" component={LupaPasswordScreen} />
        </>
      ) : (
        // App Stack
        <>
          <Stack.Screen name="MainTabs" component={BottomTabNavigator} />
          <Stack.Screen name="TambahCatatan" component={TambahCatatanScreen} />
          <Stack.Screen name="EditCatatan" component={EditCatatanScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
        </>
      )}
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
  },
});

export default AppNavigator;
