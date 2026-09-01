// Project LifeOrbit — Avatar Component
import React from 'react';
import { View, Text, Image, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import { BorderRadius } from '../../constants/spacing';

export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export interface AvatarProps {
  url?: string | null;
  imageUrl?: string | null;
  name?: string;
  size?: AvatarSize;
  style?: StyleProp<ViewStyle>;
  showBorder?: boolean;
}

const SIZE_MAP: Record<AvatarSize, number> = {
  sm: 32,
  md: 48,
  lg: 64,
  xl: 96,
  '2xl': 120,
};

const FONT_SIZE_MAP: Record<AvatarSize, number> = {
  sm: FontSize.xs,
  md: FontSize.md,
  lg: FontSize.xl,
  xl: FontSize['2xl'],
  '2xl': FontSize['3xl'],
};

export function Avatar({ url, imageUrl, name, size = 'md', style, showBorder = false }: AvatarProps) {
  const dimension = SIZE_MAP[size];
  const fontSize = FONT_SIZE_MAP[size];
  const image = url ?? imageUrl;

  const getInitials = (fullName?: string) => {
    if (!fullName) return '?';
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const containerStyle: StyleProp<ViewStyle> = [
    styles.container,
    { width: dimension, height: dimension, borderRadius: dimension / 2 },
    showBorder && styles.border,
    style,
  ];

  if (image) {
    return (
      <View style={containerStyle}>
        <Image
          source={{ uri: image }}
          style={{ width: dimension, height: dimension, borderRadius: dimension / 2 }}
          accessibilityLabel={name ? `Avatar for ${name}` : 'User avatar'}
        />
      </View>
    );
  }

  return (
    <View style={[containerStyle, styles.fallbackContainer]}>
      <Text style={[styles.initials, { fontSize }]}>{getInitials(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: Colors.border.light,
    justifyContent: 'center',
    alignItems: 'center',
  },
  border: {
    borderWidth: 2,
    borderColor: Colors.surface.DEFAULT,
  },
  fallbackContainer: {
    backgroundColor: Colors.primary.subtle,
  },
  initials: {
    fontFamily: FontFamily.semibold,
    color: Colors.primary.dark,
  },
});
