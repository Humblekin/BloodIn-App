// Project LifeOrbit — Post Service
// Encapsulates all Supabase interactions for the purpose-driven network feed.
import { supabase } from '@/lib/supabase/client';
import { isRealId } from '@/utils/ids';
import type { PostPurpose, PostVisibility, PostReactionType } from '@/types/common';

export interface PostRow {
  id: string;
  author_id: string;
  purpose: PostPurpose;
  visibility: PostVisibility;
  content: string;
  blood_group: string | null;
  community_id: string | null;
  shared_from_post_id: string | null;
  status: 'active' | 'hidden';
  created_at: string;
  updated_at: string;
  // Joined
  author?: { display_name: string; avatar_url: string | null; is_premium?: boolean };
  community?: { id: string; name: string } | null;
  shared_from?: { id: string; content: string; author: { display_name: string } | null } | null;
  comment_count: number;
  reaction_count: number;
  my_reaction?: { reaction: PostReactionType }[];
}

export interface PostCreate {
  purpose: PostPurpose;
  content: string;
  visibility?: PostVisibility;
  blood_group?: string | null;
  community_id?: string | null;
  shared_from_post_id?: string | null;
}

export interface PostCommentRow {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  created_at: string;
  author?: { display_name: string; avatar_url: string | null };
}

const POST_SELECT = `
  *,
  author:profiles!posts_author_id_fkey(display_name, avatar_url, is_premium),
  community:communities!posts_community_id_fkey(id, name),
  shared_from:posts(id, content, author:profiles!posts_author_id_fkey(display_name)),
  comment_count:post_comments(count),
  reaction_count:post_reactions(count),
  my_reaction:post_reactions!post_reactions_post_id_fkey(reaction, user_id)
`;

const normalize = (post: any, userId?: string): PostRow => {
  // Supabase returns aggregate counts as `[{ count }]`; demo posts carry plain numbers.
  const toCount = (value: unknown): number =>
    Array.isArray(value) ? (value[0]?.count ?? 0) : typeof value === 'number' ? value : 0;
  const commentCount = toCount(post.comment_count);
  const reactionCount = toCount(post.reaction_count);
  const myReaction = (post.my_reaction as { reaction: PostReactionType; user_id: string }[] | undefined)
    ?.filter((r) => r.user_id === userId)
    .map(({ reaction }) => ({ reaction })) ?? [];
  return {
    ...post,
    comment_count: commentCount,
    reaction_count: reactionCount,
    my_reaction: myReaction,
  };
};

export const postService = {
  // ─── Create ───────────────────────────────────────────

  async createPost(authorId: string, input: PostCreate): Promise<PostRow> {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user || authData.user.id !== authorId) {
      throw new Error('Your session has expired. Please sign in again.');
    }

    const { data: postId, error } = await supabase.rpc('create_post', {
      p_purpose: input.purpose,
      p_content: input.content,
      p_visibility: input.visibility || 'public',
      p_blood_group: input.blood_group || null,
      p_community_id: input.community_id || null,
      p_shared_from_post_id: input.shared_from_post_id || null,
    });

    if (error) throw error;

    const { data, error: fetchError } = await supabase
      .from('posts')
      .select(POST_SELECT)
      .eq('id', postId)
      .single();

    if (fetchError) throw fetchError;
    return normalize(data, authorId);
  },

  // ─── Delete ───────────────────────────────────────────

  async deletePost(postId: string, userId: string): Promise<boolean> {
    if (!isRealId(postId)) {
      throw new Error('Demo posts cannot be deleted.');
    }
    // Scoped to author_id so an authenticated user can never delete a post
    // they don't own, even if RLS were somehow bypassed client-side.
    const { count, error } = await supabase
      .from('posts')
      .delete({ count: 'exact' })
      .eq('id', postId)
      .eq('author_id', userId);
    if (error) throw error;
    return (count ?? 0) > 0;
  },

  // ─── Feed ─────────────────────────────────────────────

  async getFeed(options?: { limit?: number; offset?: number; userId?: string }): Promise<PostRow[]> {
    let data: any[] | null = null;
    let error: any = null;
    try {
      const res = await supabase
        .from('posts')
        .select(POST_SELECT)
        .order('created_at', { ascending: false })
        .range(options?.offset ?? 0, (options?.offset ?? 0) + (options?.limit ?? 20) - 1);
      data = res.data;
      error = res.error;
    } catch (err) {
      error = err;
    }

    if (error || !data || data.length === 0) {
      if (error) throw error;
      return [];
    }

    const posts = (data || []).map((post) => normalize(post, options?.userId));

    // Premium perk — "boosted" posts from premium authors (within 24h) float to
    // the top of the feed. Kept stable: boosted posts keep newest-first order.
    const boostWindowMs = 24 * 60 * 60 * 1000;
    const now = Date.now();
    const isBoosted = (p: PostRow) =>
      p.author?.is_premium === true && now - new Date(p.created_at).getTime() <= boostWindowMs;

    return [...posts].sort((a, b) => {
      const aBoosted = isBoosted(a) ? 1 : 0;
      const bBoosted = isBoosted(b) ? 1 : 0;
      if (aBoosted !== bBoosted) return bBoosted - aBoosted;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  },

  async getPostById(postId: string, userId?: string): Promise<PostRow | null> {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(postId)) {
      return null;
    }

    const { data, error } = await supabase
      .from('posts')
      .select(POST_SELECT)
      .eq('id', postId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return normalize(data, userId);
  },

  async getMyPosts(authorId: string, options?: { limit?: number }): Promise<PostRow[]> {
    const { data, error } = await supabase
      .from('posts')
      .select(POST_SELECT)
      .eq('author_id', authorId)
      .order('created_at', { ascending: false })
      .limit(options?.limit ?? 20);

    if (error) throw error;
    return (data || []).map((post) => normalize(post, authorId));
  },

  // ─── Community feed ────────────────────────────────

  async getCommunityPosts(
    communityId: string,
    options?: { limit?: number; userId?: string }
  ): Promise<PostRow[]> {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(communityId)) {
      return [];
    }

    let data: any[] | null = null;
    let error: any = null;
    try {
      const res = await supabase
        .from('posts')
        .select(POST_SELECT)
        .eq('community_id', communityId)
        .order('created_at', { ascending: false })
        .limit(options?.limit ?? 20);
      data = res.data;
      error = res.error;
    } catch (err) {
      error = err;
    }

    if (error) throw error;
    if (!data || data.length === 0) return [];

    return (data || []).map((post) => normalize(post, options?.userId));
  },

  // ─── Share (within BloodIn) ───────────────────────────

  async sharePost(userId: string, postId: string, note?: string): Promise<PostRow> {
    const original = await postService.getPostById(postId);
    if (!original) throw new Error('Post not found');

    return postService.createPost(userId, {
      purpose: original.purpose,
      content: note || original.content,
      visibility: 'public',
      shared_from_post_id: postId,
    });
  },

  // ─── Comments ─────────────────────────────────────────

  async addComment(postId: string, authorId: string, content: string): Promise<PostCommentRow> {
    const { data, error } = await supabase
      .from('post_comments')
      .insert({ post_id: postId, author_id: authorId, content })
      .select(`*, author:profiles!post_comments_author_id_fkey(display_name, avatar_url)`)
      .single();

    if (error) throw error;
    return data as PostCommentRow;
  },

  async getComments(postId: string): Promise<PostCommentRow[]> {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(postId)) {
      return [];
    }

    const { data, error } = await supabase
      .from('post_comments')
      .select(`*, author:profiles!post_comments_author_id_fkey(display_name, avatar_url)`)
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []) as PostCommentRow[];
  },

  // ─── Reactions ────────────────────────────────────────

  async toggleReaction(postId: string, userId: string, reaction: PostReactionType): Promise<boolean> {
    // Return true if the reaction is now active, false if it was removed.
    const { data: existing } = await supabase
      .from('post_reactions')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      const { error: delError } = await supabase
        .from('post_reactions')
        .delete()
        .eq('id', existing.id);
      if (delError) throw delError;
      return false;
    }

    const { error: insError } = await supabase
      .from('post_reactions')
      .insert({ post_id: postId, user_id: userId, reaction });
    if (insError) throw insError;
    return true;
  },
};