import { useState, useCallback } from 'react';
import { requestService, BloodRequestRow, BloodRequestCreate, RequestResponseRow } from '../services/requestService';

export function useBloodRequests() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchActiveRequests = useCallback(async (options?: { bloodGroup?: string; limit?: number; offset?: number }) => {
    setLoading(true);
    setError(null);
    try {
      return await requestService.getActiveRequests(options);
    } catch (err: any) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRequestById = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      return await requestService.getRequestById(id);
    } catch (err: any) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);
  
  const fetchMyRequests = useCallback(async (userId: string) => {
    setLoading(true);
    setError(null);
    try {
      return await requestService.getMyRequests(userId);
    } catch (err: any) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createRequest = useCallback(async (userId: string, data: BloodRequestCreate) => {
    setLoading(true);
    setError(null);
    try {
      return await requestService.createRequest(userId, data);
    } catch (err: any) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const offerToHelp = useCallback(async (requestId: string, responderId: string, message?: string) => {
    setLoading(true);
    setError(null);
    try {
      await requestService.offerToHelp(requestId, responderId, message);
    } catch (err: any) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);
  
  const fetchResponses = useCallback(async (requestId: string) => {
    setLoading(true);
    setError(null);
    try {
      return await requestService.getResponses(requestId);
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
    fetchActiveRequests,
    fetchRequestById,
    fetchMyRequests,
    createRequest,
    offerToHelp,
    fetchResponses,
  };
}
