// Project LifeOrbit — Database Row Types
// These mirror the database schema. In production, auto-generate with:
// npx supabase gen types typescript --project-id <id> > src/lib/supabase/database.types.ts
// These manual definitions serve as the reference and fallback.

import type {
  BloodGroup,
  AccountType,
  BloodGroupVisibility,
  LocationVisibility,
  MessagingPermission,
  VerificationType,
  VerificationStatus,
  ConnectionStatus,
  CommunityRole,
  CommunityMemberStatus,
  JoinPolicy,
  OrganizationType,
  OrganizationRole,
  OrganizationVerificationLevel,
  RequestType,
  UrgencyLevel,
  RequestStatus,
  ResponseStatus,
  CampaignType,
  CampaignStatus,
  ParticipationStatus,
  ConversationType,
  NotificationType,
  ReportReason,
  ReportStatus,
  ModerationAction,
} from './common';

// ─── Profiles ─────────────────────────────────────────────
export interface ProfileRow {
  id: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  blood_group: BloodGroup | null;
  account_type: AccountType;
  is_available: boolean;
  is_premium: boolean;
  human_verified: boolean;
  identity_verified: boolean;
  created_at: string;
  updated_at: string;
}

export type ProfileInsert = Omit<ProfileRow, 'created_at' | 'updated_at' | 'is_premium' | 'human_verified' | 'identity_verified'> & {
  is_premium?: boolean;
  human_verified?: boolean;
  identity_verified?: boolean;
};

export type ProfileUpdate = Partial<Omit<ProfileRow, 'id' | 'created_at'>>;

// ─── Privacy Settings ─────────────────────────────────────
export interface PrivacySettingsRow {
  user_id: string;
  blood_group_visibility: BloodGroupVisibility;
  location_visibility: LocationVisibility;
  messaging_permission: MessagingPermission;
  show_in_discovery: boolean;
  show_in_orbit: boolean;
  allow_emergency_notifications: boolean;
  allow_community_notifications: boolean;
  allow_campaign_notifications: boolean;
  updated_at: string;
}

export type PrivacySettingsUpdate = Partial<Omit<PrivacySettingsRow, 'user_id' | 'updated_at'>>;

// ─── Location ─────────────────────────────────────────────
export interface CountryRow {
  id: number;
  name: string;
  code: string;
  phone_code: string | null;
}

export interface RegionRow {
  id: number;
  country_id: number;
  name: string;
}

export interface CityRow {
  id: number;
  region_id: number;
  name: string;
  latitude: number | null;
  longitude: number | null;
}

export interface UserLocationRow {
  user_id: string;
  home_country_id: number | null;
  home_region_id: number | null;
  home_city_id: number | null;
  current_country_id: number | null;
  current_region_id: number | null;
  current_city_id: number | null;
  is_temporarily_elsewhere: boolean;
  updated_at: string;
  // Note: coordinates are NEVER sent to the client
}

export type UserLocationUpdate = Partial<Omit<UserLocationRow, 'user_id' | 'updated_at'>>;

// ─── Verification ─────────────────────────────────────────
export interface VerificationRecordRow {
  id: string;
  user_id: string | null;
  community_id: string | null;
  organization_id: string | null;
  verification_type: VerificationType;
  status: VerificationStatus;
  verified_by: string | null;
  evidence_url: string | null;
  notes: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Connections ──────────────────────────────────────────
export interface ConnectionRequestRow {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: ConnectionStatus;
  message: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConnectionRow {
  id: string;
  user_a_id: string;
  user_b_id: string;
  connected_at: string;
}

// ─── Communities ──────────────────────────────────────────
export interface CommunityRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  cover_url: string | null;
  country_id: number | null;
  region_id: number | null;
  city_id: number | null;
  join_policy: JoinPolicy;
  is_verified: boolean;
  is_active: boolean;
  member_count: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CommunityMemberRow {
  id: string;
  community_id: string;
  user_id: string;
  role: CommunityRole;
  status: CommunityMemberStatus;
  joined_at: string;
}

export interface CommunityAnnouncementRow {
  id: string;
  community_id: string;
  author_id: string;
  title: string;
  content: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Organizations ────────────────────────────────────────
export interface OrganizationRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  org_type: OrganizationType;
  logo_url: string | null;
  website_url: string | null;
  country_id: number | null;
  region_id: number | null;
  city_id: number | null;
  verification_level: OrganizationVerificationLevel;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMemberRow {
  id: string;
  organization_id: string;
  user_id: string;
  role: OrganizationRole;
  is_active: boolean;
  joined_at: string;
}

// ─── Messaging ────────────────────────────────────────────
export interface ConversationRow {
  id: string;
  type: ConversationType;
  created_at: string;
  last_message_at: string;
}

export interface ConversationParticipantRow {
  id: string;
  conversation_id: string;
  user_id: string;
  last_read_at: string;
  is_muted: boolean;
  joined_at: string;
}

export interface MessageRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_system_message: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Blood Requests ──────────────────────────────────────
export interface BloodRequestRow {
  id: string;
  requester_id: string;
  blood_group: BloodGroup;
  request_type: RequestType;
  urgency: UrgencyLevel;
  title: string;
  description: string | null;
  units_needed: number;
  facility_name: string | null;
  facility_address: string | null;
  country_id: number | null;
  region_id: number | null;
  city_id: number | null;
  community_id: string | null;
  organization_id: string | null;
  status: RequestStatus;
  is_verified: boolean;
  safety_acknowledged: boolean;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface RequestResponseRow {
  id: string;
  request_id: string;
  responder_id: string;
  status: ResponseStatus;
  message: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Campaigns ────────────────────────────────────────────
export interface CampaignRow {
  id: string;
  title: string;
  description: string | null;
  campaign_type: CampaignType;
  community_id: string | null;
  organization_id: string | null;
  created_by: string;
  start_date: string;
  end_date: string | null;
  country_id: number | null;
  region_id: number | null;
  city_id: number | null;
  venue: string | null;
  cover_image_url: string | null;
  max_participants: number | null;
  status: CampaignStatus;
  safety_info: string | null;
  created_at: string;
  updated_at: string;
}

export interface CampaignParticipantRow {
  id: string;
  campaign_id: string;
  user_id: string;
  status: ParticipationStatus;
  registered_at: string;
}

// ─── Notifications ────────────────────────────────────────
export interface NotificationRow {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  data: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

export interface PushTokenRow {
  id: string;
  user_id: string;
  token: string;
  platform: 'ios' | 'android';
  is_active: boolean;
  created_at: string;
}

export interface NotificationPreferencesRow {
  user_id: string;
  push_messages: boolean;
  push_connections: boolean;
  push_blood_requests: boolean;
  push_community: boolean;
  push_campaigns: boolean;
  push_security: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  updated_at: string;
}

// ─── Moderation ───────────────────────────────────────────
export interface UserBlockRow {
  id: string;
  blocker_id: string;
  blocked_id: string;
  created_at: string;
}

export interface ReportRow {
  id: string;
  reporter_id: string;
  reported_user_id: string | null;
  reported_community_id: string | null;
  reported_request_id: string | null;
  reported_message_id: string | null;
  reason: ReportReason;
  description: string | null;
  status: ReportStatus;
  created_at: string;
}

export interface ModerationActionRow {
  id: string;
  report_id: string | null;
  moderator_id: string;
  action_type: ModerationAction;
  target_user_id: string | null;
  reason: string | null;
  created_at: string;
}

export interface AuditLogRow {
  id: string;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  created_at: string;
}
