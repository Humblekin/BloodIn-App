// Project LifeOrbit — Tab Navigator
import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { ColorValue } from 'react-native';
import { Tabs } from 'expo-router';
import { Home, MessageCircle, Compass, Search, User } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { FontFamily, FontSize } from '@/constants/typography';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TAB_CONTENT_HEIGHT = 64;
const ICON_SIZE = 20;
const ICON_BACKGROUND_SIZE = 34;

type TabIconProps = {
  focused: boolean;
  children: React.ReactNode;
};

function TabIcon({ focused, children }: TabIconProps) {
  return (
    <View style={[styles.iconBackground, focused && styles.iconBackgroundActive]}>
      {children}
    </View>
  );
}

type TabIconRenderProps = {
  color: ColorValue;
  focused: boolean;
};

function renderTabIcon(Icon: typeof Home) {
  return ({ color, focused }: TabIconRenderProps) => (
    <TabIcon focused={focused}>
      <Icon size={ICON_SIZE} color={focused ? Colors.primary.DEFAULT : color} />
    </TabIcon>
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarVariant: 'uikit',
        tabBarActiveTintColor: Colors.primary.DEFAULT,
        tabBarInactiveTintColor: Colors.dark.tertiary,
        tabBarLabelStyle: styles.tabLabel,
        tabBarStyle: {
          backgroundColor: Colors.surface.DEFAULT,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: Colors.border.light,
          height: TAB_CONTENT_HEIGHT + insets.bottom,
          elevation: 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarAccessibilityLabel: 'Home',
          tabBarIcon: renderTabIcon(Home),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarAccessibilityLabel: 'Messages',
          tabBarIcon: renderTabIcon(MessageCircle),
        }}
      />
      <Tabs.Screen
        name="orbit"
        options={{
          title: 'Orbit',
          tabBarAccessibilityLabel: 'Orbit',
          tabBarIcon: renderTabIcon(Compass),
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Discover',
          tabBarAccessibilityLabel: 'Discover',
          tabBarIcon: renderTabIcon(Search),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarAccessibilityLabel: 'Profile',
          tabBarIcon: renderTabIcon(User),
        }}
      />
      <Tabs.Screen name="requests" options={{ href: null }} />
      <Tabs.Screen name="feed" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconBackground: {
    width: ICON_BACKGROUND_SIZE,
    height: ICON_BACKGROUND_SIZE,
    borderRadius: ICON_BACKGROUND_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBackgroundActive: {
    backgroundColor: Colors.primary.subtle,
  },
  tabLabel: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    lineHeight: 14,
  },
});
