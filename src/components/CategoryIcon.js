import React from 'react';
import { View, StyleSheet } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { theme } from '../theme';
import { getCategoryById } from '../utils/categories';

export const CategoryIcon = ({ categoryId, size = 48 }) => {
  const category = getCategoryById(categoryId);
  const iconSize = size * 0.5;
  const containerStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: theme.colors.secondaryContainer,
  };

  return (
    <View style={[styles.container, containerStyle]}>
      <MaterialIcons 
        name={category.icon} 
        size={iconSize} 
        color={theme.colors.onSecondaryContainer} 
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
export default CategoryIcon;
