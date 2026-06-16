import React, { createContext, useState, useEffect, useContext } from 'react';
import * as authUtil from './auth';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load active session from AsyncStorage when provider mounts
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
    checkActiveSession();
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

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        updateProfile,
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
