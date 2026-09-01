import { useState, useCallback } from 'react';
import { moderationService, ReportCreate } from '../services/moderationService';

export function useReporting() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const submitReport = useCallback(async (reporterId: string, data: ReportCreate) => {
    setLoading(true);
    setError(null);
    try {
      await moderationService.submitReport(reporterId, data);
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
    submitReport,
  };
}

export function useBlocking() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const blockUser = useCallback(async (blockerId: string, blockedId: string) => {
    setLoading(true);
    setError(null);
    try {
      await moderationService.blockUser(blockerId, blockedId);
    } catch (err: any) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const unblockUser = useCallback(async (blockerId: string, blockedId: string) => {
    setLoading(true);
    setError(null);
    try {
      await moderationService.unblockUser(blockerId, blockedId);
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
    blockUser,
    unblockUser,
  };
}
