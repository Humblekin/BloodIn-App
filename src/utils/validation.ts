// Project LifeOrbit — Validation Schemas
// Zod schemas for client-side validation. These mirror database constraints.

import { z } from 'zod';
import { BLOOD_GROUPS } from '../constants/bloodGroups';

// ─── Auth ─────────────────────────────────────────────────
export const emailSchema = z
  .string()
  .email('Please enter a valid email address')
  .max(255, 'Email is too long');

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password is too long')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

export const signUpSchema = z.object({
  displayName: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be at most 50 characters')
    .regex(/^[a-zA-Z\s\-'.]+$/, 'Name contains invalid characters'),
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
  accountType: z.enum(['individual', 'community_admin', 'organization_admin']),
  safetyAcknowledged: z.literal(true, {
    errorMap: () => ({ message: 'You must acknowledge the safety notice' }),
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export type SignUpFormData = z.infer<typeof signUpSchema>;

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export type SignInFormData = z.infer<typeof signInSchema>;

export const resetPasswordSchema = z.object({
  email: emailSchema,
});

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

// ─── OTP ──────────────────────────────────────────────────
export const otpSchema = z.object({
  code: z
    .string()
    .length(6, 'Verification code must be 6 digits')
    .regex(/^\d+$/, 'Code must contain only digits'),
});

export type OtpFormData = z.infer<typeof otpSchema>;

// ─── Profile ──────────────────────────────────────────────
export const profileSetupSchema = z.object({
  displayName: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be at most 50 characters'),
  bio: z
    .string()
    .max(500, 'Bio must be at most 500 characters')
    .optional()
    .or(z.literal('')),
  bloodGroup: z
    .enum(BLOOD_GROUPS)
    .optional()
    .nullable(),
  countryId: z.number().int().positive().optional().nullable(),
  regionId: z.number().int().positive().optional().nullable(),
  cityId: z.number().int().positive().optional().nullable(),
});

export type ProfileSetupFormData = z.infer<typeof profileSetupSchema>;

export const profileUpdateSchema = profileSetupSchema.partial();

export type ProfileUpdateFormData = z.infer<typeof profileUpdateSchema>;

// ─── Privacy ──────────────────────────────────────────────
export const privacySettingsSchema = z.object({
  bloodGroupVisibility: z.enum(['public', 'connections', 'matching_only', 'private']),
  locationVisibility: z.enum(['country', 'region', 'city', 'approximate', 'private']),
  messagingPermission: z.enum(['everyone', 'connections', 'requests_only', 'nobody']),
  showInDiscovery: z.boolean(),
  showInOrbit: z.boolean(),
  allowEmergencyNotifications: z.boolean(),
  allowCommunityNotifications: z.boolean(),
  allowCampaignNotifications: z.boolean(),
});

export type PrivacySettingsFormData = z.infer<typeof privacySettingsSchema>;

// ─── Blood Request ────────────────────────────────────────
export const bloodRequestSchema = z.object({
  bloodGroup: z.enum(BLOOD_GROUPS),
  title: z
    .string()
    .min(5, 'Title must be at least 5 characters')
    .max(200, 'Title must be at most 200 characters'),
  description: z
    .string()
    .max(3000, 'Description is too long')
    .optional()
    .or(z.literal('')),
  urgency: z.enum(['normal', 'urgent', 'critical']),
  unitsNeeded: z.number().int().min(1).max(20),
  facilityName: z.string().max(200).optional().or(z.literal('')),
  facilityAddress: z.string().max(500).optional().or(z.literal('')),
  countryId: z.number().int().positive().optional().nullable(),
  regionId: z.number().int().positive().optional().nullable(),
  cityId: z.number().int().positive().optional().nullable(),
  safetyAcknowledged: z.literal(true, {
    errorMap: () => ({ message: 'You must acknowledge the safety notice' }),
  }),
});

export type BloodRequestFormData = z.infer<typeof bloodRequestSchema>;

// ─── Connection Request ──────────────────────────────────
export const connectionRequestSchema = z.object({
  message: z
    .string()
    .max(300, 'Message must be at most 300 characters')
    .optional()
    .or(z.literal('')),
});

export type ConnectionRequestFormData = z.infer<typeof connectionRequestSchema>;

// ─── Message ──────────────────────────────────────────────
export const messageSchema = z.object({
  content: z
    .string()
    .min(1, 'Message cannot be empty')
    .max(5000, 'Message is too long'),
});

export type MessageFormData = z.infer<typeof messageSchema>;

// ─── Report ───────────────────────────────────────────────
export const reportSchema = z.object({
  reason: z.enum([
    'spam', 'harassment', 'fake_account', 'misinformation',
    'inappropriate_content', 'suspicious_request', 'other',
  ]),
  description: z
    .string()
    .max(2000, 'Description is too long')
    .optional()
    .or(z.literal('')),
});

export type ReportFormData = z.infer<typeof reportSchema>;

// ─── Community ────────────────────────────────────────────
export const communitySchema = z.object({
  name: z
    .string()
    .min(3, 'Name must be at least 3 characters')
    .max(100, 'Name must be at most 100 characters'),
  description: z
    .string()
    .max(2000, 'Description is too long')
    .optional()
    .or(z.literal('')),
  joinPolicy: z.enum(['open', 'request', 'invite_only']),
  countryId: z.number().int().positive().optional().nullable(),
  regionId: z.number().int().positive().optional().nullable(),
  cityId: z.number().int().positive().optional().nullable(),
});

export type CommunityFormData = z.infer<typeof communitySchema>;
