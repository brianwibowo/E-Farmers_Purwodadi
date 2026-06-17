import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as authUtil from './auth';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(null);
  const [onboardingLoading, setOnboardingLoading] = useState(true);

  // Load active session and onboarding status from AsyncStorage when provider mounts
  useEffect(() => {
    const checkActiveSession = async () => {
      try {
        const activeUser = await authUtil.getSession();
        if (activeUser) {
          setUser(activeUser);
        }
      } catch (err) {
        console.error('Failed to load user session', err);
      } finally {
        setLoading(false);
      }
    };

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

    checkActiveSession();
    checkOnboarding();
  }, []);

  const login = async (username, password) => {
    try {
      const loggedInUser = await authUtil.authenticateUser(username, password);
      setUser(loggedInUser);
      return loggedInUser;
    } catch (err) {
      throw err;
    }
  };

  const register = async (username, password, phone) => {
    try {
      const newUser = await authUtil.registerUser(username, password, phone);
      return newUser;
    } catch (err) {
      throw err;
    }
  };

  const logout = async () => {
    try {
      await authUtil.clearSession();
      setUser(null);
    } catch (err) {
      console.error('Logout error', err);
    }
  };

  const updateProfile = async (newUsername, newPassword, photoUri, newPhone) => {
    if (!user) return;
    try {
      const updatedUser = await authUtil.updateUserProfile(
        user.username,
        newUsername,
        newPassword,
        photoUri,
        newPhone
      );
      setUser(updatedUser);
      return updatedUser;
    } catch (err) {
      throw err;
    }
  };

  const completeOnboarding = async () => {
    try {
      await AsyncStorage.setItem('HAS_SEEN_ONBOARDING', 'true');
      setHasSeenOnboarding(true);
    } catch (err) {
      console.error('Failed to save onboarding status', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        updateProfile,
        hasSeenOnboarding,
        onboardingLoading,
        completeOnboarding,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
