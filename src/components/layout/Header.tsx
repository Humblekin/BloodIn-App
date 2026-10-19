// Project LifeOrbit — Header Layout Component
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, type ViewStyle, type StyleProp } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import { Spacing, ScreenPadding, TouchTarget } from '../../constants/spacing';

// Surface = neutral white bar (detail screens). Brand = vivid-red bar that
// matches the redesigned home header (top-level browsing screens).
export type HeaderVariant = 'surface' | 'brand';

export interface HeaderProps {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightElement?: React.ReactNode;
  transparent?: boolean;
  variant?: HeaderVariant;
  style?: StyleProp<ViewStyle>;
}

export function Header({
  title,
  showBack = false,
  onBack,
  rightElement,
  transparent = false,
  variant = 'surface',
  style,
}: HeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isBrand = variant === 'brand';
  // Brand headers are red; transparent headers float over imagery — both need
  // light foreground content, while the neutral surface header stays dark.
  const onDarkSurface = isBrand || transparent;
  const foreground = onDarkSurface ? Colors.white : Colors.dark.DEFAULT;

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (router.canGoBack()) {
      router.back();
    } else {
      // No back stack entry (e.g. this screen is the first in its stack) —
      // head to the home tab instead of an unmatched "/" root route.
      router.replace('/(main)/(tabs)');
    }
  };

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top },
        !transparent && (isBrand ? styles.brandBackground : styles.solidBackground),
        style,
      ]}
    >
      <View style={styles.content}>
        <View style={styles.leftSection}>
          {showBack && (
            <TouchableOpacity
              onPress={handleBack}
              style={[styles.backButton, transparent && styles.backButtonScrim]}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <ArrowLeft size={24} color={foreground} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.centerSection}>
          {title ? (
            <Text style={[styles.title, { color: foreground }]} numberOfLines={1}>
              {title}
            </Text>
          ) : null}
        </View>

        <View style={styles.rightSection}>
          {rightElement}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    zIndex: 10,
  },
  solidBackground: {
    backgroundColor: Colors.surface.DEFAULT,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  brandBackground: {
    backgroundColor: Colors.primary.DEFAULT,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56, // Standard header height
    paddingHorizontal: ScreenPadding.horizontal,
  },
  leftSection: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  centerSection: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightSection: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  backButton: {
    width: TouchTarget.minimum,
    height: TouchTarget.minimum,
    justifyContent: 'center',
    alignItems: 'flex-start',
    marginLeft: -Spacing.xs, // Offset padding for optical alignment
  },
  backButtonScrim: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(17, 24, 39, 0.35)',
    alignItems: 'center',
    marginLeft: 0,
  },
  title: {
    fontFamily: FontFamily.semibold,
    fontSize: FontSize.md,
    color: Colors.dark.DEFAULT,
  },
});
