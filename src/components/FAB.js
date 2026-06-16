import React, { forwardRef } from 'react';
import { StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { theme } from '../theme';

export const FAB = forwardRef(({ onPress, icon = 'add' }, ref) => {
  const insets = useSafeAreaInsets();

  return (
    <Pressable
      ref={ref}
      onPress={onPress}
      style={({ pressed }) => [
        styles.fab,
        { bottom: 92 + insets.bottom },
        pressed && styles.pressed,
      ]}
    >
      <MaterialIcons 
        name={icon} 
        size={32} 
        color={theme.colors.onPrimary} 
      />
    </Pressable>
  );
});

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 20,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    zIndex: 99,
  },
  pressed: {
    transform: [{ scale: 0.95 }],
    backgroundColor: theme.colors.primaryContainer,
  },
});

export default FAB;
