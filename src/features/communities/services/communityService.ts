// Project LifeOrbit — Community Service
import { supabase } from '@/lib/supabase/client';

export interface CommunityRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  cover_url: string | null;
  city_id: number | null;
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
    let data: any[] | null = null;
    let error: any = null;
    try {
      const res = await supabase
        .from('communities')
        .select('*')
        .eq('is_active', true)
        .order('member_count', { ascending: false })
        .limit(options?.limit ?? 20);
      data = res.data;
      error = res.error;
    } catch (err) {
      error = err;
    }

    if (error) throw error;
    if (!data || data.length === 0) return [];

    return data as CommunityRow[];
  },

  async getCommunityById(communityId: string): Promise<CommunityRow | null> {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(communityId)) {
      return null;
    }

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
    const baseSlug = input.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    let slug = baseSlug;

    for (let attempt = 0; attempt < 5; attempt++) {
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

      if (error) {
        // Slug already taken (e.g. two communities with the same name) -> retry with a suffix.
        if (error.code === '23505' && attempt < 4) {
          slug = `${baseSlug}-${attempt + 2}`;
          continue;
        }
        throw error;
      }

      // Creator becomes admin
      const { error: memberError } = await supabase.from('community_members').insert({
        community_id: data.id,
        user_id: input.created_by,
        role: 'admin',
        status: 'active',
      });

      if (memberError) {
        console.warn('[Community] Failed to add creator as admin:', memberError);
      }

      return data as CommunityRow;
    }

    throw new Error('Could not create community. Try a different name.');
  },

  async getMembers(communityId: string): Promise<CommunityMemberRow[]> {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(communityId)) {
      return [];
    }

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

    // Avoid duplicate-key errors when the user is already a member.
    const { data: existing } = await supabase
      .from('community_members')
      .select('id, status')
      .eq('community_id', communityId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      if (existing.status === 'active' || existing.status === 'pending') return;
      throw new Error('You previously left this community.');
    }

    const { error } = await supabase
      .from('community_members')
      .insert({ community_id: communityId, user_id: userId, role: 'member', status });

    if (error) {
      if (error.code === '23505') return; // concurrent join — already a member
      throw error;
    }
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
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(communityId)) {
      return [];
    }

    const { data, error } = await supabase
      .from('community_announcements')
      .select('*')
      .eq('community_id', communityId)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;

    const announcements = (data || []) as AnnouncementRow[];
    const authorIds = [...new Set(announcements.map((announcement) => announcement.author_id))];
    if (authorIds.length === 0) return announcements;

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url')
      .in('id', authorIds);

    if (profilesError) throw profilesError;

    const profilesById = new Map(
      (profiles || []).map((profile) => [profile.id, profile])
    );

    return announcements.map((announcement) => ({
      ...announcement,
      author_profile: profilesById.get(announcement.author_id),
    }));
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
