import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import BottomNavBar from '../components/BottomNavBar';
import BerandaScreen from '../screens/BerandaScreen';
import CatatanScreen from '../screens/CatatanScreen';

const Tab = createBottomTabNavigator();

export const BottomTabNavigator = () => {
  return (
    <Tab.Navigator
      tabBar={(props) => <BottomNavBar {...props} />}
      screenOptions={{ headerShown: false }}
      initialRouteName="BerandaTab"
    >
      <Tab.Screen
        name="BerandaTab"
        component={BerandaScreen}
        options={{ title: 'Beranda' }}
      />
      <Tab.Screen
        name="CatatanTab"
        component={CatatanScreen}
        options={{ title: 'Catatan' }}
      />
    </Tab.Navigator>
  );
};

export default BottomTabNavigator;
