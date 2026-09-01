// Project LifeOrbit — Branding Constants
// Single source of truth for all branding references.
// Change the app name here and it propagates everywhere.

export const Branding = {
  // ─── App Identity ───────────────────────────────────────
  appName: 'BloodIn',
  appTagline: 'Donate Life',
  appDescription:
    'A secure platform connecting individuals, blood donation communities, and organizations through intelligent location-based discovery.',

  // ─── Legal / Compliance ─────────────────────────────────
  companyName: 'BloodIn',
  supportEmail: 'support@bloodin.app',
  privacyPolicyUrl: 'https://bloodin.app/privacy',
  termsOfServiceUrl: 'https://bloodin.app/terms',

  // ─── Platform Role Disclaimer ───────────────────────────
  platformDisclaimer:
    'BloodIn connects people and organizations. It does not medically certify blood, guarantee compatibility, or replace hospitals, laboratories, blood banks, or qualified healthcare professionals.',

  // ─── Copyright ──────────────────────────────────────────
  get copyrightNotice() {
    return `© ${new Date().getFullYear()} ${this.companyName}. All rights reserved.`;
  },
} as const;
