import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, Pressable } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { theme } from '../theme';

export const InputField = ({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  error,
  isDropdown = false,
  onPress,
  editable = true,
  icon,
  secureTextEntry = false,
  autoCapitalize = 'none',
  containerStyle,
  ...rest
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const borderColor = error 
    ? theme.colors.error 
    : isFocused 
    ? theme.colors.secondary 
    : theme.colors.outlineVariant;
  
  const borderWidth = (error || isFocused) ? 2.5 : 1.5;

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      
      {isDropdown ? (
        <Pressable
          onPress={onPress}
          style={({ pressed }) => [
            styles.inputContainer,
            { borderColor, borderWidth },
            pressed && styles.pressed,
          ]}
        >
          {icon && (
            <View style={styles.iconContainer}>
              <MaterialIcons name={icon} size={20} color={theme.colors.onSurfaceVariant} />
            </View>
          )}
          <Text 
            style={[
              styles.inputText, 
              !value && styles.placeholderText
            ]}
          >
            {value || placeholder}
          </Text>
          <MaterialIcons 
            name="expand-more" 
            size={24} 
            color={theme.colors.onSurfaceVariant} 
          />
        </Pressable>
      ) : (
        <View style={[styles.inputContainer, { borderColor, borderWidth }]}>
          {icon && (
            <View style={styles.iconContainer}>
              <MaterialIcons name={icon} size={20} color={isFocused ? theme.colors.secondary : theme.colors.onSurfaceVariant} />
            </View>
          )}
          <TextInput
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={theme.colors.outline}
            keyboardType={keyboardType}
            editable={editable}
            secureTextEntry={secureTextEntry}
            autoCapitalize={autoCapitalize}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            style={styles.input}
            {...rest}
          />
        </View>
      )}
      
      {error ? (
        <View style={styles.errorRow}>
          <MaterialIcons name="error-outline" size={14} color={theme.colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 16,
    width: '100%',
  },
  label: {
    fontFamily: 'PublicSans-SemiBold',
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: theme.spacing.touchTargetMin,
    borderRadius: theme.rounded.lg,
    backgroundColor: theme.colors.surfaceContainerLowest,
    paddingHorizontal: 14,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: theme.colors.surfaceContainerHigh,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: '100%',
    fontFamily: 'PublicSans-Regular',
    fontSize: 16,
    fontWeight: '400',
    color: theme.colors.onSurface,
    padding: 0,
  },
  inputText: {
    flex: 1,
    fontFamily: 'PublicSans-Regular',
    fontSize: 16,
    fontWeight: '400',
    color: theme.colors.onSurface,
  },
  placeholderText: {
    color: theme.colors.outline,
  },
  pressed: {
    opacity: 0.85,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  errorText: {
    fontFamily: 'PublicSans-Regular',
    fontSize: 13,
    color: theme.colors.error,
    marginLeft: 4,
    fontWeight: '400',
  },
});

export default InputField;
