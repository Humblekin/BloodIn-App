import { useState, useCallback, useEffect } from 'react';
import { notificationService, NotificationRow } from '../services/notificationService';

export function useNotifications() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchNotifications = useCallback(async (userId: string, options?: { limit?: number; unreadOnly?: boolean }) => {
    setLoading(true);
    setError(null);
    try {
      return await notificationService.getNotifications(userId, options);
    } catch (err: any) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId);
    } catch (err: any) {
      console.error(err);
    }
  }, []);

  const markAllAsRead = useCallback(async (userId: string) => {
    try {
      await notificationService.markAllAsRead(userId);
    } catch (err: any) {
      console.error(err);
    }
  }, []);

  return {
    loading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
  };
}
