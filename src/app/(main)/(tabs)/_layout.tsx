// Project LifeOrbit — Tab Navigator
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { ColorValue } from 'react-native';
import { Tabs } from 'expo-router';
import { Home, MessageCircle, Compass, Search, User } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { FontFamily } from '@/constants/typography';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Custom footer for expo-router's vendored bottom-tab navigator.
 *
 * `tabBarIcon` is rendered twice (active + inactive, stacked for the fade)
 * inside a *fixed* 31x28 wrapper, so a content-sized pill cannot be drawn from
 * it directly. We stretch that wrapper to the full (equal-width) item slot with
 * `tabBarIconStyle` and center the visual pill/circle inside it.
 *
 * Two rules make the active state safe:
 *  - every item is `flex: 1` (equal width) via the navigator, and
 *  - the active pill sizes to its own content and is centered, so it can never
 *    push, resize or shift a neighbouring tab.
 */

// Height of the icon/pill row excluding the Android/iOS bottom inset.
const TAB_CONTENT_HEIGHT = 56;
// Padding the navigator applies to every tab item (bottom-tabs `tabVerticalUiKit`).
const ITEM_PADDING = 5;
// The icon wrapper must fill the item's content box for vertical centering.
const ICON_WRAPPER_HEIGHT = TAB_CONTENT_HEIGHT - ITEM_PADDING * 2;
const PILL_HEIGHT = 32;
const ICON_SIZE = 15;
// Neutral grey circle used for inactive tabs (matches the app's light neutrals).
const INACTIVE_BACKGROUND = '#F4F4F5';

type TabIconProps = {
  label: string;
  focused: boolean;
  children: React.ReactNode;
};

function TabIcon({ label, focused, children }: TabIconProps) {
  return (
    <View style={styles.iconSlot}>
      <View style={[styles.pill, focused ? styles.pillActive : styles.pillInactive]}>
        {children}
        {focused ? (
          <Text numberOfLines={1} style={styles.activeLabel}>
            {label}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

type TabIconRenderProps = {
  color: ColorValue;
  focused: boolean;
};

function renderTabIcon(label: string, Icon: typeof Home) {
  return ({ color, focused }: TabIconRenderProps) => (
    <TabIcon label={label} focused={focused}>
      <Icon size={ICON_SIZE} color={focused ? Colors.white : color} />
    </TabIcon>
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarVariant: 'uikit',
        tabBarActiveTintColor: Colors.primary.DEFAULT,
        tabBarInactiveTintColor: Colors.dark.tertiary,
        // Stretch the fixed icon wrapper to the full tab slot.
        tabBarIconStyle: { width: '100%', height: ICON_WRAPPER_HEIGHT },
        tabBarStyle: {
          backgroundColor: Colors.surface.DEFAULT,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: Colors.border.light,
          // Total height includes the bottom inset; the navigator itself adds
          // `paddingBottom: insets.bottom`, so the inset is applied exactly once.
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
          tabBarIcon: renderTabIcon('Home', Home),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarAccessibilityLabel: 'Messages',
          tabBarIcon: renderTabIcon('Messages', MessageCircle),
        }}
      />
      <Tabs.Screen
        name="orbit"
        options={{
          title: 'Orbit',
          tabBarAccessibilityLabel: 'Orbit',
          tabBarIcon: renderTabIcon('Orbit', Compass),
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Discover',
          tabBarAccessibilityLabel: 'Discover',
          tabBarIcon: renderTabIcon('Discover', Search),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarAccessibilityLabel: 'Profile',
          tabBarIcon: renderTabIcon('Profile', User),
        }}
      />
      <Tabs.Screen name="requests" options={{ href: null }} />
      <Tabs.Screen name="feed" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  // Fills the (now full-width) icon wrapper and centers the pill inside it.
  iconSlot: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    height: PILL_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: PILL_HEIGHT / 2,
    maxWidth: '100%',
  },
  pillActive: {
    paddingHorizontal: 9,
    gap: 4,
    backgroundColor: Colors.primary.DEFAULT,
  },
  pillInactive: {
    width: PILL_HEIGHT,
    backgroundColor: INACTIVE_BACKGROUND,
  },
  activeLabel: {
    color: Colors.white,
    fontFamily: FontFamily.medium,
    fontSize: 10,
    flexShrink: 1,
  },
});
