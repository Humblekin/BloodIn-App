// Project LifeOrbit — Community Service
import { supabase } from '@/lib/supabase/client';

export interface CommunityRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  cover_url: string | null;
  join_policy: 'open' | 'request' | 'invite_only';
  is_verified: boolean;
  is_active: boolean;
  member_count: number;
  created_by: string;
  created_at: string;
}

export interface CommunityMemberRow {
  id: string;
  community_id: string;
  user_id: string;
  role: 'admin' | 'moderator' | 'member';
  status: 'pending' | 'active' | 'suspended' | 'left';
  joined_at: string;
  profile?: { display_name: string; avatar_url: string | null };
}

export interface AnnouncementRow {
  id: string;
  community_id: string;
  author_id: string;
  title: string;
  content: string;
  is_pinned: boolean;
  created_at: string;
  author_profile?: { display_name: string; avatar_url: string | null };
}

export const communityService = {
  async getCommunities(options?: { limit?: number; offset?: number }): Promise<CommunityRow[]> {
    const { data, error } = await supabase
      .from('communities')
      .select('*')
      .eq('is_active', true)
      .order('member_count', { ascending: false })
      .limit(options?.limit ?? 20);

    if (error) throw error;
    return (data || []) as CommunityRow[];
  },

  async getCommunityById(communityId: string): Promise<CommunityRow | null> {
    const { data, error } = await supabase
      .from('communities')
      .select('*')
      .eq('id', communityId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data as CommunityRow;
  },

  async createCommunity(input: {
    name: string;
    description?: string;
    join_policy?: 'open' | 'request' | 'invite_only';
    created_by: string;
  }): Promise<CommunityRow> {
    const slug = input.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    const { data, error } = await supabase
      .from('communities')
      .insert({
        name: input.name,
        slug,
        description: input.description || null,
        join_policy: input.join_policy || 'request',
        created_by: input.created_by,
      })
      .select()
      .single();

    if (error) throw error;

    // Creator becomes admin
    await supabase.from('community_members').insert({
      community_id: data.id,
      user_id: input.created_by,
      role: 'admin',
      status: 'active',
    });

    return data as CommunityRow;
  },

  async getMembers(communityId: string): Promise<CommunityMemberRow[]> {
    const { data, error } = await supabase
      .from('community_members')
      .select(`*, profile:profiles!community_members_user_id_fkey(display_name, avatar_url)`)
      .eq('community_id', communityId)
      .eq('status', 'active')
      .order('role');

    if (error) throw error;
    return (data || []) as CommunityMemberRow[];
  },

  async joinCommunity(communityId: string, userId: string): Promise<void> {
    const community = await communityService.getCommunityById(communityId);
    const status = community?.join_policy === 'open' ? 'active' : 'pending';

    const { error } = await supabase
      .from('community_members')
      .insert({ community_id: communityId, user_id: userId, status });

    if (error) throw error;
  },

  async leaveCommunity(communityId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('community_members')
      .update({ status: 'left' })
      .eq('community_id', communityId)
      .eq('user_id', userId);

    if (error) throw error;
  },

  async getAnnouncements(communityId: string): Promise<AnnouncementRow[]> {
    const { data, error } = await supabase
      .from('community_announcements')
      .select(`*, author_profile:profiles!community_announcements_author_id_fkey(display_name, avatar_url)`)
      .eq('community_id', communityId)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as AnnouncementRow[];
  },

  async postAnnouncement(input: {
    community_id: string;
    author_id: string;
    title: string;
    content: string;
  }): Promise<void> {
    const { error } = await supabase
      .from('community_announcements')
      .insert(input);

    if (error) throw error;
  },
};
