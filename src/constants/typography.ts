// Project LifeOrbit — Typography System
// Uses Inter font family for professional, readable typography.
// Clean hierarchy with purposeful sizing.

import { Platform } from 'react-native';

// Font family configuration
// Inter is loaded via expo-font in the root layout
export const FontFamily = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',

  // Fallback for system font before custom fonts load
  system: Platform.select({
    ios: 'System',
    android: 'Roboto',
    default: 'System',
  }),
} as const;

// Type scale — purposeful sizes for clear hierarchy
export const FontSize = {
  /** 12px — Small labels, timestamps, badges */
  xs: 12,
  /** 14px — Captions, secondary info */
  sm: 14,
  /** 16px — Body text (default) */
  base: 16,
  /** 18px — Emphasized body, list titles */
  md: 18,
  /** 21px — Section headers */
  lg: 21,
  /** 25px — Screen titles */
  xl: 25,
  /** 31px — Hero text, large titles */
  '2xl': 31,
  /** 37px — Display text (rare) */
  '3xl': 37,
} as const;

// Line heights — optimized for readability
export const LineHeight = {
  xs: 16,
  sm: 20,
  base: 24,
  md: 26,
  lg: 30,
  xl: 34,
  '2xl': 40,
  '3xl': 46,
} as const;

// Letter spacing
export const LetterSpacing = {
  tight: -0.5,
  normal: 0,
  wide: 0.5,
  wider: 1,
} as const;

// Pre-composed text styles for consistency
export const TextStyles = {
  // Display — large hero text
  displayLg: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['3xl'],
    lineHeight: LineHeight['3xl'],
    letterSpacing: LetterSpacing.tight,
  },
  displaySm: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['2xl'],
    lineHeight: LineHeight['2xl'],
    letterSpacing: LetterSpacing.tight,
  },

  // Headings
  h1: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xl,
    lineHeight: LineHeight.xl,
    letterSpacing: LetterSpacing.tight,
  },
  h2: {
    fontFamily: FontFamily.semibold,
    fontSize: FontSize.lg,
    lineHeight: LineHeight.lg,
    letterSpacing: LetterSpacing.normal,
  },
  h3: {
    fontFamily: FontFamily.semibold,
    fontSize: FontSize.md,
    lineHeight: LineHeight.md,
    letterSpacing: LetterSpacing.normal,
  },

  // Body
  bodyLg: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.md,
    lineHeight: LineHeight.md,
    letterSpacing: LetterSpacing.normal,
  },
  body: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
    lineHeight: LineHeight.base,
    letterSpacing: LetterSpacing.normal,
  },
  bodySm: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    lineHeight: LineHeight.sm,
    letterSpacing: LetterSpacing.normal,
  },

  // Labels
  label: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.base,
    lineHeight: LineHeight.base,
    letterSpacing: LetterSpacing.normal,
  },
  labelSm: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    lineHeight: LineHeight.sm,
    letterSpacing: LetterSpacing.wide,
  },

  // Caption / Meta
  caption: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    lineHeight: LineHeight.xs,
    letterSpacing: LetterSpacing.wide,
  },

  // Button text
  buttonLg: {
    fontFamily: FontFamily.semibold,
    fontSize: FontSize.md,
    lineHeight: LineHeight.md,
    letterSpacing: LetterSpacing.normal,
  },
  button: {
    fontFamily: FontFamily.semibold,
    fontSize: FontSize.base,
    lineHeight: LineHeight.base,
    letterSpacing: LetterSpacing.normal,
  },
  buttonSm: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    lineHeight: LineHeight.sm,
    letterSpacing: LetterSpacing.normal,
  },
} as const;

// ─── Compatibility aliases ─────────────────────────────────
// Used by screens/components that reference a lowercase `typography` design system.
export const typography = {
  fonts: {
    regular: FontFamily.regular,
    medium: FontFamily.medium,
    semiBold: FontFamily.semibold,
    bold: FontFamily.bold,
    italic: FontFamily.regular,
  },
  sizes: {
    xs: FontSize.xs,
    sm: FontSize.sm,
    base: FontSize.base,
    md: FontSize.md,
    lg: FontSize.lg,
    xl: FontSize.xl,
    '2xl': FontSize['2xl'],
    '3xl': FontSize['3xl'],
  },
} as const;
