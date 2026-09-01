// Project LifeOrbit — Badge Component
import React from 'react';
import { View, Text, StyleSheet, type ViewProps, type StyleProp, type ViewStyle } from 'react-native';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import { BorderRadius, Spacing } from '../../constants/spacing';

export type BadgeVariant = 'default' | 'success' | 'warning' | 'critical' | 'info' | 'outline';

export interface BadgeProps extends ViewProps {
  label: string;
  variant?: BadgeVariant;
  leftIcon?: React.ReactNode;
}

export function Badge({ label, variant = 'default', leftIcon, style, ...props }: BadgeProps) {
  return (
    <View style={[styles.container, styles[`variant_${variant}`], style]} {...props}>
      {leftIcon && <View style={styles.iconContainer}>{leftIcon}</View>}
      <Text style={[styles.label, styles[`textVariant_${variant}`]]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing['2xs'],
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
  },
  iconContainer: {
    marginRight: Spacing['2xs'],
  },
  label: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
  },

  // Variants
  variant_default: {
    backgroundColor: Colors.border.DEFAULT,
  },
  textVariant_default: {
    color: Colors.dark.secondary,
  },

  variant_success: {
    backgroundColor: Colors.semantic.success.light,
  },
  textVariant_success: {
    color: Colors.semantic.success.dark,
  },

  variant_warning: {
    backgroundColor: Colors.semantic.warning.light,
  },
  textVariant_warning: {
    color: Colors.semantic.warning.dark,
  },

  variant_critical: {
    backgroundColor: Colors.semantic.critical.light,
  },
  textVariant_critical: {
    color: Colors.semantic.critical.dark,
  },

  variant_info: {
    backgroundColor: Colors.semantic.info.light,
  },
  textVariant_info: {
    color: Colors.semantic.info.dark,
  },

  variant_outline: {
    backgroundColor: Colors.transparent,
    borderWidth: 1,
    borderColor: Colors.border.dark,
  },
  textVariant_outline: {
    color: Colors.dark.secondary,
  },
});
