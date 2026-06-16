import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View, Image } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import {
  useFonts,
  PublicSans_400Regular,
  PublicSans_600SemiBold,
  PublicSans_700Bold,
} from '@expo-google-fonts/public-sans';

import { AppNavigator } from './src/navigation/AppNavigator';
import { theme } from './src/theme';
import { seedInitialData } from './src/utils/storage';
import { AuthProvider } from './src/utils/AuthContext';

export default function App() {
  const [dataReady, setDataReady] = useState(false);
  const [fontsLoaded] = useFonts({
    'PublicSans-Regular': PublicSans_400Regular,
    'PublicSans-SemiBold': PublicSans_600SemiBold,
    'PublicSans-Bold': PublicSans_700Bold,
  });

  // Seed data on launch
  useEffect(() => {
    const initApp = async () => {
      try {
        await seedInitialData();
      } catch (err) {
        console.error('Failed to seed initial data', err);
      } finally {
        setDataReady(true);
      }
    };
    initApp();
  }, []);

  // Show customized launch splash state while loading fonts or seeding data
  if (!fontsLoaded || !dataReady) {
    return (
      <View style={styles.loadingContainer}>
        <Image 
          source={require('./assets/logo.png')} 
          style={styles.loadingLogo} 
          resizeMode="contain"
        />
        <ActivityIndicator size="large" color="#ffffff" style={{ marginTop: 24 }} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
          <StatusBar style="light" backgroundColor={theme.colors.primary} />
          <AppNavigator />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#012d1d', // Matches app.json splash screen background
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingLogo: {
    width: 140,
    height: 140,
  },
});
