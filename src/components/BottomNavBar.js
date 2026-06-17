import React from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { theme } from '../theme';

export const BottomNavBar = ({ state, descriptors, navigation }) => {
  const insets = useSafeAreaInsets();
  const hasSafeArea = insets.bottom > 0;
  const paddingTop = hasSafeArea ? 6 : 0;
  const paddingBottom = hasSafeArea ? insets.bottom - 6 : 0;
  const totalHeight = 56 + paddingTop + paddingBottom;

  return (
    <View style={[
      styles.navBar,
      {
        height: totalHeight,
        paddingTop,
        paddingBottom
      }
    ]}>
      <View style={styles.navBarContent}>
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
                  size={22}
                  color={isFocused ? '#cbffc2' : 'rgba(255, 255, 255, 0.6)'}
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
    </View>
  );
};

const styles = StyleSheet.create({
  navBar: {
    backgroundColor: '#012d1d',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  navBarContent: {
    height: 56,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 19,
  },
  activeTabItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
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
    fontSize: 14,
  },
  activeLabel: {
    color: '#cbffc2',
    fontWeight: '700',
  },
  inactiveLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default BottomNavBar;
