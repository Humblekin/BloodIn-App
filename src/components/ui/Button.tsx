// Project LifeOrbit — Button Component
import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  type TouchableOpacityProps,
  type StyleProp,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize, LineHeight } from '../../constants/typography';
import { BorderRadius, Spacing, TouchTarget } from '../../constants/spacing';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<TouchableOpacityProps, 'style'> {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  fullWidth?: boolean;
}

export function Button({
  title,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  style,
  textStyle,
  fullWidth = false,
  disabled,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || isLoading;

  const getContainerStyle = (): StyleProp<ViewStyle> => {
    const baseStyle = [styles.container, styles[`size_${size}`]];
    if (fullWidth) baseStyle.push(styles.fullWidth);
    baseStyle.push(styles[`variant_${variant}`]);
    if (isDisabled) baseStyle.push(styles.disabled);
    return baseStyle;
  };

  const getTextStyle = (): StyleProp<TextStyle> => {
    const baseStyle = [styles.text, styles[`textSize_${size}`]];
    baseStyle.push(styles[`textVariant_${variant}`]);
    if (isDisabled) baseStyle.push(styles.textDisabled);
    return baseStyle;
  };

  return (
    <TouchableOpacity
      style={[getContainerStyle(), style]}
      disabled={isDisabled}
      activeOpacity={0.8}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator
          color={variant === 'primary' || variant === 'danger' ? Colors.white : Colors.primary.DEFAULT}
          size="small"
        />
      ) : (
        <>
          {leftIcon && <React.Fragment>{leftIcon}</React.Fragment>}
          <Text style={[getTextStyle(), textStyle]} numberOfLines={1}>
            {title}
          </Text>
          {rightIcon && <React.Fragment>{rightIcon}</React.Fragment>}
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.sm,
    gap: Spacing.sm,
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.6,
  },
  text: {
    fontFamily: FontFamily.semibold,
    textAlign: 'center',
  },
  textDisabled: {
    opacity: 0.9,
  },
  
  // Sizes
  size_sm: {
    minHeight: 36,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  size_md: {
    minHeight: TouchTarget.comfortable,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  size_lg: {
    minHeight: 56,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  
  // Text Sizes
  textSize_sm: {
    fontSize: FontSize.sm,
    lineHeight: LineHeight.sm,
  },
  textSize_md: {
    fontSize: FontSize.base,
    lineHeight: LineHeight.base,
  },
  textSize_lg: {
    fontSize: FontSize.md,
    lineHeight: LineHeight.md,
  },

  // Variants
  variant_primary: {
    backgroundColor: Colors.primary.DEFAULT,
  },
  textVariant_primary: {
    color: Colors.white,
  },
  
  variant_secondary: {
    backgroundColor: Colors.primary.subtle,
  },
  textVariant_secondary: {
    color: Colors.primary.dark,
  },
  
  variant_outline: {
    backgroundColor: Colors.transparent,
    borderWidth: 1,
    borderColor: Colors.border.dark,
  },
  textVariant_outline: {
    color: Colors.dark.DEFAULT,
  },
  
  variant_ghost: {
    backgroundColor: Colors.transparent,
  },
  textVariant_ghost: {
    color: Colors.primary.DEFAULT,
  },
  
  variant_danger: {
    backgroundColor: Colors.semantic.critical.DEFAULT,
  },
  textVariant_danger: {
    color: Colors.white,
  },
});
