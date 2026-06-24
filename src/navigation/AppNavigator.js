import React from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../utils/AuthContext';
import { theme } from '../theme';

// Screens
import BottomTabNavigator from './BottomTabNavigator';
import TambahCatatanScreen from '../screens/TambahCatatanScreen';
import TambahTanamanScreen from '../screens/TambahTanamanScreen';
import EditCatatanScreen from '../screens/EditCatatanScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ProfileScreen from '../screens/ProfileScreen';
import LupaPasswordScreen from '../screens/LupaPasswordScreen';
import OnboardingScreen from '../screens/OnboardingScreen';

const Stack = createNativeStackNavigator();

export const AppNavigator = () => {
  const { user, loading, hasSeenOnboarding, onboardingLoading } = useAuth();

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
          <Stack.Screen name="TambahTanaman" component={TambahTanamanScreen} />
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
