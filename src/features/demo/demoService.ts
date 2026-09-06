// Project LifeOrbit — Demo Service
// Client-side seeded content so a fresh install feels alive before real
// community data exists. Functions mirror the service-layer return shapes and
// are used as fallbacks when live Supabase queries return empty or fail.
import {
  DEMO_ORBIT_NODES,
  DEMO_DISCOVER,
  DEMO_REQUESTS,
  DEMO_RESPONSES,
  DEMO_POSTS,
  DEMO_COMMENTS,
  DEMO_COMMUNITIES,
  DEMO_MEMBERS,
  DEMO_ANNOUNCEMENTS,
  DEMO_CAMPAIGNS,
  DEMO_CAMPAIGN_PARTICIPANTS,
  DEMO_NOTIFICATIONS,
  DEMO_CONVERSATIONS,
  DEMO_MESSAGES,
} from './demoData';
import type { OrbitNode } from '@/features/orbit/components/OrbitCanvas';
import type { DiscoverResult } from '@/features/discover/services/discoverService';
import type { BloodRequestRow, RequestResponseRow } from '@/features/requests/services/requestService';
import type { PostRow, PostCommentRow } from '@/features/posts/services/postService';
import type { CommunityRow, CommunityMemberRow, AnnouncementRow } from '@/features/communities/services/communityService';
import type { CampaignRow, CampaignParticipantRow } from '@/features/campaigns/services/campaignService';
import type { NotificationRow } from '@/features/notifications/services/notificationService';
import type { ConversationRow, MessageRow } from '@/features/messages/services/messageService';

// A real DB uuid is a UUID; anything else (e.g. "demo-*" or "mock-*") is demo.
export function isRealId(id: string | undefined | null): boolean {
  return !!id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

function demoById<T>(items: T[], id: string): T | null {
  return items.find((item) => (item as { id?: string }).id === id) || null;
}

export const demoService = {
  // ─── Orbit ───────────────────────────────────────────
  getOrbitNodes(): OrbitNode[] {
    return DEMO_ORBIT_NODES;
  },

  // ─── Discover ────────────────────────────────────────
  getDiscover(type: 'people' | 'communities' | 'organizations'): DiscoverResult[] {
    return DEMO_DISCOVER[type];
  },

  // ─── Blood Requests ─────────────────────────────────
  getActiveRequests(): BloodRequestRow[] {
    return DEMO_REQUESTS;
  },

  getRequestById(id: string): BloodRequestRow | null {
    return demoById(DEMO_REQUESTS, id);
  },

  getResponses(requestId: string): RequestResponseRow[] {
    return DEMO_RESPONSES.filter((r) => r.request_id === requestId);
  },

  // ─── Posts ──────────────────────────────────────────
  getFeed(): PostRow[] {
    return DEMO_POSTS;
  },

  getCommunityPosts(communityId: string): PostRow[] {
    return DEMO_POSTS.filter((post) => post.community_id === communityId);
  },

  getPostById(id: string): PostRow | null {
    return demoById(DEMO_POSTS, id);
  },

  getComments(postId: string): PostCommentRow[] {
    return DEMO_COMMENTS[postId] || [];
  },

  // ─── Communities ────────────────────────────────────
  getCommunities(): CommunityRow[] {
    return DEMO_COMMUNITIES;
  },

  getCommunityById(id: string): CommunityRow | null {
    return demoById(DEMO_COMMUNITIES, id);
  },

  getMembers(communityId: string): CommunityMemberRow[] {
    return DEMO_MEMBERS[communityId] || [];
  },

  getAnnouncements(communityId: string): AnnouncementRow[] {
    return DEMO_ANNOUNCEMENTS[communityId] || [];
  },

  // ─── Campaigns ──────────────────────────────────────
  getCampaigns(): CampaignRow[] {
    return DEMO_CAMPAIGNS;
  },

  getCampaignById(id: string): CampaignRow | null {
    return demoById(DEMO_CAMPAIGNS, id);
  },

  getCampaignParticipants(campaignId: string): CampaignParticipantRow[] {
    return DEMO_CAMPAIGN_PARTICIPANTS[campaignId] || [];
  },

  // ─── Notifications ──────────────────────────────────
  getNotifications(): NotificationRow[] {
    return DEMO_NOTIFICATIONS;
  },

  // ─── Messages ───────────────────────────────────────
  getConversations(): ConversationRow[] {
    return DEMO_CONVERSATIONS;
  },

  getMessages(conversationId: string): MessageRow[] {
    return DEMO_MESSAGES[conversationId] || [];
  },
};
