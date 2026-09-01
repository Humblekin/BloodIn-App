import { useState, useCallback } from 'react';
import { communityService, CommunityRow, CommunityMemberRow, AnnouncementRow } from '../services/communityService';

export function useCommunity() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchCommunities = useCallback(async (options?: { limit?: number; offset?: number }) => {
    setLoading(true);
    setError(null);
    try {
      return await communityService.getCommunities(options);
    } catch (err: any) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCommunityById = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      return await communityService.getCommunityById(id);
    } catch (err: any) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createCommunity = useCallback(async (data: {
    name: string;
    description?: string;
    join_policy?: 'open' | 'request' | 'invite_only';
    created_by: string;
  }) => {
    setLoading(true);
    setError(null);
    try {
      return await communityService.createCommunity(data);
    } catch (err: any) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMembers = useCallback(async (communityId: string) => {
    setLoading(true);
    setError(null);
    try {
      return await communityService.getMembers(communityId);
    } catch (err: any) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAnnouncements = useCallback(async (communityId: string) => {
    setLoading(true);
    setError(null);
    try {
      return await communityService.getAnnouncements(communityId);
    } catch (err: any) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const joinCommunity = useCallback(async (communityId: string, userId: string) => {
    setLoading(true);
    setError(null);
    try {
      await communityService.joinCommunity(communityId, userId);
    } catch (err: any) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const postAnnouncement = useCallback(async (data: {
    community_id: string;
    author_id: string;
    title: string;
    content: string;
  }) => {
    setLoading(true);
    setError(null);
    try {
      await communityService.postAnnouncement(data);
    } catch (err: any) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    fetchCommunities,
    fetchCommunityById,
    createCommunity,
    fetchMembers,
    fetchAnnouncements,
    joinCommunity,
    postAnnouncement,
  };
}
