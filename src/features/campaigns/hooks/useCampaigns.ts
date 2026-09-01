import { useState, useCallback } from 'react';
import { campaignService, CampaignRow, CampaignParticipantRow } from '../services/campaignService';

export function useCampaigns() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchCampaigns = useCallback(async (options?: { status?: string; limit?: number }) => {
    setLoading(true);
    setError(null);
    try {
      return await campaignService.getCampaigns(options);
    } catch (err: any) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCampaignById = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      return await campaignService.getCampaignById(id);
    } catch (err: any) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createCampaign = useCallback(async (data: Omit<CampaignRow, 'id' | 'created_at' | 'status'> & { status?: string }) => {
    setLoading(true);
    setError(null);
    try {
      return await campaignService.createCampaign(data);
    } catch (err: any) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const registerForCampaign = useCallback(async (campaignId: string, userId: string) => {
    setLoading(true);
    setError(null);
    try {
      await campaignService.registerForCampaign(campaignId, userId);
    } catch (err: any) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchParticipants = useCallback(async (campaignId: string) => {
    setLoading(true);
    setError(null);
    try {
      return await campaignService.getParticipants(campaignId);
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
    fetchCampaigns,
    fetchCampaignById,
    createCampaign,
    registerForCampaign,
    fetchParticipants,
  };
}
