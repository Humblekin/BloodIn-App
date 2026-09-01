// Project LifeOrbit — Header Layout Component
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, type ViewStyle, type StyleProp } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import { Spacing, ScreenPadding, TouchTarget } from '../../constants/spacing';

export interface HeaderProps {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightElement?: React.ReactNode;
  transparent?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Header({
  title,
  showBack = false,
  onBack,
  rightElement,
  transparent = false,
  style,
}: HeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top },
        !transparent && styles.solidBackground,
        style,
      ]}
    >
      <View style={styles.content}>
        <View style={styles.leftSection}>
          {showBack && (
            <TouchableOpacity
              onPress={handleBack}
              style={styles.backButton}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <ArrowLeft size={24} color={Colors.dark.DEFAULT} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.centerSection}>
          {title && (
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
          )}
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
  title: {
    fontFamily: FontFamily.semibold,
    fontSize: FontSize.md,
    color: Colors.dark.DEFAULT,
  },
});
