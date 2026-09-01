import { useState, useCallback } from 'react';
import { connectionService, Connection, ConnectionRequest } from '../services/connectionService';

export function useConnections() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchConnections = useCallback(async (userId: string) => {
    setLoading(true);
    setError(null);
    try {
      return await connectionService.getConnections(userId);
    } catch (err: any) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPendingRequests = useCallback(async (userId: string) => {
    setLoading(true);
    setError(null);
    try {
      return await connectionService.getPendingRequests(userId);
    } catch (err: any) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const respondToRequest = useCallback(async (requestId: string, action: 'accepted' | 'declined') => {
    setLoading(true);
    setError(null);
    try {
      await connectionService.respondToRequest(requestId, action);
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
    fetchConnections,
    fetchPendingRequests,
    respondToRequest,
  };
}
