// Project LifeOrbit — Posts Hooks
import { useState, useCallback } from 'react';
import { postService } from '../services/postService';
import { useAuthStore } from '@/features/auth/stores/authStore';
import type { PostReactionType } from '@/types/common';

export function useFeed() {
  const [posts, setPosts] = useState<ReturnType<typeof postService.getFeed> extends Promise<infer T> ? T : any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async (offset = 0, limit = 20, append = false) => {
    const userId = useAuthStore.getState().session?.user?.id;
    try {
      const result = await postService.getFeed({ limit, offset, userId });
      setPosts((prev) => (append ? [...prev, ...result] : result));
      setHasMore(result.length === limit);
    } catch (err: any) {
      setError(err);
    }
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load(0, 20, false);
      setHasMore(true);
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;
    setLoading(true);
    try {
      await load(posts.length, 20, true);
    } finally {
      setLoading(false);
    }
  }, [hasMore, loading, load, posts.length]);

  const toggleReaction = useCallback(async (postId: string, reaction: PostReactionType) => {
    const { session } = useAuthStore.getState();
    const userId = session?.user?.id;
    if (!userId) return;
    try {
      setPosts((prev) =>
        prev.map((p) => {
          if (p.id !== postId) return p;
          const hadReaction = !!p.my_reaction?.length;
          const delta = hadReaction ? -1 : 1;
          return {
            ...p,
            my_reaction: hadReaction ? [] : [{ reaction }],
            reaction_count: (p.reaction_count ?? 0) + delta,
          };
        })
      );
      await postService.toggleReaction(postId, userId, reaction);
    } catch (err: any) {
      setError(err);
    }
  }, []);

  return {
    posts,
    loading,
    refreshing,
    hasMore,
    error,
    refresh,
    loadMore,
    toggleReaction,
  };
}

export function useMyPosts() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async (authorId: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await postService.getMyPosts(authorId);
      setPosts(result);
    } catch (err: any) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  return { posts, loading, error, load };
}