// Project LifeOrbit — Tab Navigator
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Tabs } from 'expo-router';
import { Home, MessageCircle, Compass, Search, User } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { FontFamily, FontSize } from '@/constants/typography';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: Colors.primary.DEFAULT,
        tabBarInactiveTintColor: Colors.dark.tertiary,
        tabBarStyle: {
          backgroundColor: Colors.surface.DEFAULT,
          borderTopColor: Colors.border.light,
          paddingBottom: Math.max(insets.bottom, 6),
          paddingTop: 6,
          height: 54 + Math.max(insets.bottom, 6),
          elevation: 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.tabIcon, focused ? styles.activeTab : styles.inactiveTab]}>
              <Home size={16} color={focused ? Colors.white : color} />
              {focused && <Text style={styles.activeLabel}>Home</Text>}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.tabIcon, focused ? styles.activeTab : styles.inactiveTab]}>
              <MessageCircle size={16} color={focused ? Colors.white : color} />
              {focused && <Text style={styles.activeLabel}>Messages</Text>}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="orbit"
        options={{
          title: 'Orbit',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.tabIcon, focused ? styles.activeTab : styles.inactiveTab]}>
              <Compass size={16} color={focused ? Colors.white : color} />
              {focused && <Text style={styles.activeLabel}>Orbit</Text>}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Discover',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.tabIcon, focused ? styles.activeTab : styles.inactiveTab]}>
              <Search size={16} color={focused ? Colors.white : color} />
              {focused && <Text style={styles.activeLabel}>Discover</Text>}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.tabIcon, focused ? styles.activeTab : styles.inactiveTab]}>
              <User size={16} color={focused ? Colors.white : color} />
              {focused && <Text style={styles.activeLabel}>Profile</Text>}
            </View>
          ),
        }}
      />
      <Tabs.Screen name="requests" options={{ href: null }} />
      <Tabs.Screen name="feed" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabIcon: {
    minHeight: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inactiveTab: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F4F4F5',
  },
  activeTab: {
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 9,
    borderRadius: 18,
    backgroundColor: Colors.primary.DEFAULT,
  },
  activeLabel: {
    color: Colors.white,
    fontFamily: FontFamily.medium,
    fontSize: 9,
  },
});
