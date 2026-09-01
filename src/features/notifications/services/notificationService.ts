// Project LifeOrbit — Notification Service
import { supabase } from '@/lib/supabase/client';

export interface NotificationRow {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  data: Record<string, any>;
  is_read: boolean;
  created_at: string;
}

export const notificationService = {
  async getNotifications(
    userId: string,
    options?: { limit?: number; unreadOnly?: boolean }
  ): Promise<NotificationRow[]> {
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(options?.limit ?? 50);

    if (options?.unreadOnly) {
      query = query.eq('is_read', false);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as NotificationRow[];
  },

  async getUnreadCount(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) throw error;
    return count || 0;
  },

  async markAsRead(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    if (error) throw error;
  },

  async markAllAsRead(userId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) throw error;
  },

  // ─── Push Token Management ────────────────────────────

  async registerPushToken(userId: string, token: string, platform: 'ios' | 'android'): Promise<void> {
    const { error } = await supabase
      .from('push_tokens')
      .upsert(
        { user_id: userId, token, platform, is_active: true },
        { onConflict: 'token' }
      );

    if (error) throw error;
  },

  async deactivatePushToken(token: string): Promise<void> {
    const { error } = await supabase
      .from('push_tokens')
      .update({ is_active: false })
      .eq('token', token);

    if (error) throw error;
  },

  // ─── Realtime subscription ────────────────────────────

  subscribeToNotifications(userId: string, onNotification: (n: NotificationRow) => void) {
    return supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          onNotification(payload.new as NotificationRow);
        }
      )
      .subscribe();
  },
};
