// Project LifeOrbit — Common Type Definitions
// Shared types used across multiple features.

// ─── Blood Group ──────────────────────────────────────────
export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';

// ─── Account Types ────────────────────────────────────────
export type AccountType = 'individual' | 'community_admin' | 'organization_admin';

// ─── Verification ─────────────────────────────────────────
export type VerificationType =
  | 'human'
  | 'identity'
  | 'community'
  | 'organization'
  | 'medical_donor';

export type VerificationStatus = 'pending' | 'approved' | 'rejected' | 'expired' | 'revoked';

// ─── Privacy Settings ─────────────────────────────────────
export type BloodGroupVisibility = 'public' | 'connections' | 'matching_only' | 'private';
export type LocationVisibility = 'country' | 'region' | 'city' | 'approximate' | 'private';
export type MessagingPermission = 'everyone' | 'connections' | 'requests_only' | 'nobody';

export interface PrivacySettings {
  bloodGroupVisibility: BloodGroupVisibility;
  locationVisibility: LocationVisibility;
  messagingPermission: MessagingPermission;
  showInDiscovery: boolean;
  showInOrbit: boolean;
  allowEmergencyNotifications: boolean;
  allowCommunityNotifications: boolean;
  allowCampaignNotifications: boolean;
}

// ─── Connection ───────────────────────────────────────────
export type ConnectionStatus = 'pending' | 'accepted' | 'declined' | 'cancelled';

// ─── Community ────────────────────────────────────────────
export type CommunityRole = 'admin' | 'moderator' | 'member';
export type CommunityMemberStatus = 'pending' | 'active' | 'suspended' | 'left';
export type JoinPolicy = 'open' | 'request' | 'invite_only';

// ─── Organization ─────────────────────────────────────────
export type OrganizationType = 'hospital' | 'blood_bank' | 'ngo' | 'medical_institution' | 'other';
export type OrganizationRole = 'owner' | 'admin' | 'staff';
export type OrganizationVerificationLevel = 'unverified' | 'basic' | 'verified' | 'premium';

// ─── Blood Requests ──────────────────────────────────────
export type RequestType = 'standard' | 'community_assisted' | 'organization_verified' | 'critical';
export type UrgencyLevel = 'normal' | 'urgent' | 'critical';
export type RequestStatus = 'active' | 'partially_fulfilled' | 'fulfilled' | 'expired' | 'cancelled';
export type ResponseStatus = 'offered' | 'accepted' | 'declined' | 'completed' | 'cancelled';

// ─── Campaign ─────────────────────────────────────────────
export type CampaignType = 'donation_drive' | 'awareness' | 'registration' | 'other';
export type CampaignStatus = 'draft' | 'upcoming' | 'active' | 'completed' | 'cancelled';
export type ParticipationStatus = 'interested' | 'registered' | 'attended' | 'cancelled';

// ─── Messaging ────────────────────────────────────────────
export type ConversationType = 'direct' | 'request';

// ─── Notifications ────────────────────────────────────────
export type NotificationType =
  | 'connection_request'
  | 'connection_accepted'
  | 'message'
  | 'message_request'
  | 'blood_request'
  | 'request_response'
  | 'community_invite'
  | 'community_announcement'
  | 'campaign_reminder'
  | 'verification_update'
  | 'system';

// ─── Moderation ───────────────────────────────────────────
export type ReportReason =
  | 'spam'
  | 'harassment'
  | 'fake_account'
  | 'misinformation'
  | 'inappropriate_content'
  | 'suspicious_request'
  | 'other';

export type ReportStatus = 'pending' | 'reviewing' | 'resolved' | 'dismissed';
export type ModerationAction = 'warning' | 'content_removed' | 'suspended' | 'banned' | 'dismissed';

// ─── Location ─────────────────────────────────────────────
export interface HierarchicalLocation {
  countryId?: number;
  countryName?: string;
  regionId?: number;
  regionName?: string;
  cityId?: number;
  cityName?: string;
}

// ─── Generic ──────────────────────────────────────────────
export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  hasMore: boolean;
  nextCursor?: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: string;
}
