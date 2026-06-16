import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { theme } from '../theme';

export const SummaryCard = ({
  label,
  subLabel,
  value,
  icon,
  iconColor,
  variant = 'default',
  fullWidth = false,
  onPress,
}) => {
  const isHighlighted = variant === 'highlighted';
  
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.card,
        isHighlighted ? styles.highlightedCard : styles.defaultCard,
        fullWidth ? styles.fullWidth : styles.halfWidth,
        onPress && pressed && styles.pressed,
      ]}
    >
      {/* Icon Badge */}
      <View style={[
        styles.iconBadge,
        isHighlighted ? styles.iconBadgeHighlighted : styles.iconBadgeDefault,
      ]}>
        <MaterialIcons 
          name={icon} 
          size={22} 
          color={isHighlighted ? theme.colors.onPrimary : (iconColor || theme.colors.primary)} 
        />
      </View>

      {/* Label */}
      <View style={styles.labelContainer}>
        <Text 
          style={[
            styles.label, 
            isHighlighted ? styles.highlightedLabel : styles.defaultLabel
          ]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {label}
        </Text>
        {subLabel ? (
          <Text 
            style={[
              styles.subLabel, 
              isHighlighted ? styles.highlightedSubLabel : styles.defaultSubLabel
            ]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {subLabel}
          </Text>
        ) : null}
      </View>

      {/* Value */}
      <Text 
        style={[
          fullWidth ? styles.valueLarge : styles.valueSmall, 
          isHighlighted ? styles.highlightedValue : styles.defaultValue
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit={true}
        minimumFontScale={0.7}
      >
        {value}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 20,
    borderRadius: theme.rounded.xl,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  defaultCard: {
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderColor: theme.colors.outlineVariant,
  },
  highlightedCard: {
    backgroundColor: theme.colors.primaryContainer,
    borderColor: theme.colors.primary,
  },
  fullWidth: {
    width: '100%',
  },
  halfWidth: {
    flex: 1,
    minWidth: '45%',
  },
  pressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.9,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconBadgeDefault: {
    backgroundColor: theme.colors.secondaryContainer,
  },
  iconBadgeHighlighted: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  labelContainer: {
    marginBottom: 6,
  },
  label: {
    ...theme.typography.labelLg,
    fontSize: 14,
    letterSpacing: 0.5,
  },
  defaultLabel: {
    color: theme.colors.onSurfaceVariant,
  },
  highlightedLabel: {
    color: theme.colors.onPrimaryContainer,
  },
  subLabel: {
    fontFamily: 'PublicSans-Regular',
    fontSize: 11,
    marginTop: 2,
    lineHeight: 14,
  },
  defaultSubLabel: {
    color: theme.colors.onSurfaceVariant,
    opacity: 0.8,
  },
  highlightedSubLabel: {
    color: theme.colors.onPrimaryContainer,
    opacity: 0.8,
  },
  valueLarge: {
    fontFamily: 'PublicSans-Bold',
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 36,
  },
  valueSmall: {
    fontFamily: 'PublicSans-Bold',
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 28,
  },
  defaultValue: {
    color: theme.colors.primary,
  },
  highlightedValue: {
    color: theme.colors.onPrimary,
  },
});

export default SummaryCard;
