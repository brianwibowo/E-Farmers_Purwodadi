import React from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { theme } from '../theme';

export const BottomNavBar = ({ state, descriptors, navigation }) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[
      styles.navBar, 
      { 
        height: 72 + insets.bottom, 
        paddingBottom: insets.bottom 
      }
    ]}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label =
          options.tabBarLabel !== undefined
            ? options.tabBarLabel
            : options.title !== undefined
            ? options.title
            : route.name;

        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: false,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        // Determine icon based on route name
        let iconName = 'home';
        if (route.name === 'BerandaTab') {
          iconName = 'home';
        } else if (route.name === 'CatatanTab') {
          iconName = 'description';
        }

        return (
          <Pressable
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={options.tabBarTestID}
            onPress={onPress}
            onLongPress={onLongPress}
            style={({ pressed }) => [
              styles.tabItem,
              isFocused ? styles.activeTabItem : styles.inactiveTabItem,
              pressed && styles.pressed,
            ]}
          >
            <View style={isFocused ? styles.activeIconContainer : null}>
              <MaterialIcons
                name={iconName}
                size={24}
                color={isFocused ? theme.colors.onPrimary : theme.colors.onSurfaceVariant}
              />
            </View>
            <Text style={[
              styles.label,
              isFocused ? styles.activeLabel : styles.inactiveLabel
            ]}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  navBar: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderTopWidth: 1,
    borderTopColor: theme.colors.outlineVariant,
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 24,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    paddingHorizontal: 24,
    borderRadius: 24,
  },
  activeTabItem: {
    backgroundColor: theme.colors.primaryContainer,
  },
  inactiveTabItem: {
    backgroundColor: 'transparent',
  },
  pressed: {
    transform: [{ scale: 0.95 }],
    opacity: 0.9,
  },
  activeIconContainer: {
    marginRight: 8,
  },
  label: {
    fontFamily: 'PublicSans-SemiBold',
    fontSize: 15,
  },
  activeLabel: {
    color: theme.colors.onPrimaryContainer,
    fontWeight: '700',
  },
  inactiveLabel: {
    color: theme.colors.onSurfaceVariant,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default BottomNavBar;
