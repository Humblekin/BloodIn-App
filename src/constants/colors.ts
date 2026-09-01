// Project LifeOrbit — Color System
// Professional, restrained palette for a health technology platform.
// Every color has a purpose. No decorative gradients or neon effects.

export const Colors = {
  // ─── Brand ───────────────────────────────────────────────
  primary: {
    DEFAULT: '#7A1F2B',       // Deep Burgundy — brand identity, primary actions
    light: '#9A3A47',         // Lighter burgundy for hover/pressed states
    dark: '#5C1620',          // Darker burgundy for emphasis
    subtle: '#F5E6E8',        // Very light burgundy tint for backgrounds
    muted: '#D4A0A8',         // Soft burgundy for secondary elements
  },

  // ─── Dark / Typography ──────────────────────────────────
  dark: {
    DEFAULT: '#111827',       // Deep Charcoal — primary text, navigation
    secondary: '#374151',     // Secondary text
    tertiary: '#6B7280',      // Tertiary text, placeholders
    muted: '#9CA3AF',         // Muted text, timestamps
  },

  // ─── Backgrounds ────────────────────────────────────────
  background: {
    DEFAULT: '#F7F7F5',       // Soft Off-White — main background
    secondary: '#F0F0EE',     // Slightly darker for sections
    elevated: '#FFFFFF',      // White — cards, surfaces
  },

  // ─── Surface ────────────────────────────────────────────
  surface: {
    DEFAULT: '#FFFFFF',       // Cards, modals, sheets
    secondary: '#F9FAFB',     // Slightly tinted surface
    overlay: 'rgba(17, 24, 39, 0.5)',  // Modal overlays
  },

  // ─── Borders ────────────────────────────────────────────
  border: {
    DEFAULT: '#E5E7EB',       // Standard border
    light: '#F3F4F6',         // Subtle border
    dark: '#D1D5DB',          // Emphasized border
    focus: '#7A1F2B',         // Focus ring (primary)
  },

  // ─── Semantic ───────────────────────────────────────────
  semantic: {
    // Critical / Emergency — used sparingly for blood requests, safety
    critical: {
      DEFAULT: '#DC2626',
      light: '#FEF2F2',
      dark: '#991B1B',
      text: '#DC2626',
    },
    // Success — verification, completed actions
    success: {
      DEFAULT: '#059669',
      light: '#ECFDF5',
      dark: '#065F46',
      text: '#059669',
    },
    // Warning — important notices, urgency
    warning: {
      DEFAULT: '#D97706',
      light: '#FFFBEB',
      dark: '#92400E',
      text: '#D97706',
    },
    // Info — neutral information, guidance
    info: {
      DEFAULT: '#2563EB',
      light: '#EFF6FF',
      dark: '#1E40AF',
      text: '#2563EB',
    },
  },

  // ─── Verification Badge Colors ──────────────────────────
  verification: {
    human: '#059669',         // Green checkmark
    identity: '#2563EB',      // Blue shield
    community: '#7C3AED',     // Purple badge
    organization: '#0891B2',  // Teal badge
    premium: '#D97706',       // Amber premium
  },

  // ─── Blood Group Colors (subtle, purposeful) ───────────
  bloodGroup: {
    'A+': '#E74C3C',
    'A-': '#C0392B',
    'B+': '#3498DB',
    'B-': '#2980B9',
    'AB+': '#9B59B6',
    'AB-': '#8E44AD',
    'O+': '#27AE60',
    'O-': '#229954',
  },

  // ─── Orbit-specific Colors ─────────────────────────────
  orbit: {
    background: '#111827',    // Deep dark background for orbit view
    ring: 'rgba(122, 31, 43, 0.2)',   // Subtle burgundy ring
    ringActive: 'rgba(122, 31, 43, 0.4)',
    node: '#FFFFFF',          // User avatars
    nodeBorder: '#7A1F2B',
    connectionLine: 'rgba(122, 31, 43, 0.15)',
    glow: 'rgba(122, 31, 43, 0.1)',
    centerRing: '#7A1F2B',
  },

  // ─── Utility ────────────────────────────────────────────
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
} as const;

// Type for accessing color paths
export type ColorToken = typeof Colors;

// ─── Compatibility aliases ─────────────────────────────────
// Used by screens/components that reference a lowercase `colors` design system.
export const colors = {
  primary: { default: Colors.primary.DEFAULT, light: Colors.primary.light, dark: Colors.primary.dark },
  background: { default: Colors.background.DEFAULT, card: Colors.surface.DEFAULT, secondary: Colors.background.secondary },
  border: { default: Colors.border.DEFAULT, light: Colors.border.light, dark: Colors.border.dark },
  surface: { default: Colors.surface.DEFAULT, secondary: Colors.surface.secondary },
  dark: { default: Colors.dark.DEFAULT, secondary: Colors.dark.secondary, tertiary: Colors.dark.tertiary },
  status: {
    error: Colors.semantic.critical.DEFAULT,
    success: Colors.semantic.success.DEFAULT,
    warning: Colors.semantic.warning.DEFAULT,
    info: Colors.semantic.info.DEFAULT,
  },
  text: {
    primary: Colors.dark.DEFAULT,
    secondary: Colors.dark.secondary,
    tertiary: Colors.dark.tertiary,
    inverse: Colors.white,
  },
} as const;
