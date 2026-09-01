// Project LifeOrbit — Card Component
import React from 'react';
import { View, StyleSheet, type ViewProps, type StyleProp, type ViewStyle } from 'react-native';
import { Colors } from '../../constants/colors';
import { BorderRadius, Shadows, Spacing } from '../../constants/spacing';

export interface CardProps extends ViewProps {
  variant?: 'elevated' | 'outlined' | 'flat';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export function Card({
  variant = 'elevated',
  padding = 'md',
  style,
  children,
  ...props
}: CardProps) {
  return (
    <View
      style={[
        styles.container,
        styles[`variant_${variant}`],
        styles[`padding_${padding}`],
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface.DEFAULT,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  
  // Variants
  variant_elevated: {
    ...Shadows.sm,
  },
  variant_outlined: {
    borderWidth: 1,
    borderColor: Colors.border.DEFAULT,
  },
  variant_flat: {
    backgroundColor: Colors.background.secondary,
  },

  // Padding
  padding_none: {
    padding: Spacing.none,
  },
  padding_sm: {
    padding: Spacing.sm,
  },
  padding_md: {
    padding: Spacing.lg,
  },
  padding_lg: {
    padding: Spacing.xl,
  },
});
