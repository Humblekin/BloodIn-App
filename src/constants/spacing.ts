// Project LifeOrbit — Spacing System
// Consistent 4px base unit spacing scale.

export const Spacing = {
  /** 0px */
  none: 0,
  /** 2px — Hairline gaps */
  '2xs': 2,
  /** 4px — Tight internal padding */
  xs: 4,
  /** 8px — Compact spacing */
  sm: 8,
  /** 12px — Standard internal padding */
  md: 12,
  /** 16px — Default padding, gaps */
  lg: 16,
  /** 20px — Section padding */
  xl: 20,
  /** 24px — Screen horizontal padding */
  '2xl': 24,
  /** 32px — Large section gaps */
  '3xl': 32,
  /** 40px — Major section spacing */
  '4xl': 40,
  /** 48px — Hero spacing */
  '5xl': 48,
  /** 64px — Extra large spacing */
  '6xl': 64,
} as const;

// Screen padding (horizontal)
export const ScreenPadding = {
  horizontal: Spacing['2xl'],  // 24px
  vertical: Spacing.lg,       // 16px
} as const;

// Border radius
export const BorderRadius = {
  /** 0px */
  none: 0,
  /** 4px — Subtle rounding */
  xs: 4,
  /** 8px — Standard cards, inputs */
  sm: 8,
  /** 12px — Larger cards */
  md: 12,
  /** 16px — Prominent cards */
  lg: 16,
  /** 24px — Pills, tags */
  xl: 24,
  /** 9999px — Full circle */
  full: 9999,
} as const;

// Elevation / Shadow system
export const Shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  xl: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;

// Touch target minimum sizes (accessibility)
export const TouchTarget = {
  /** 44px — Minimum touch target per WCAG */
  minimum: 44,
  /** 48px — Comfortable touch target */
  comfortable: 48,
} as const;
