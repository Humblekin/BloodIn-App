// Project LifeOrbit — Moderation Service
import { supabase } from '@/lib/supabase/client';

export type ReportReason =
  | 'spam'
  | 'harassment'
  | 'fake_account'
  | 'misinformation'
  | 'inappropriate_content'
  | 'suspicious_request'
  | 'other';

export interface ReportCreate {
  reported_user_id?: string;
  reported_community_id?: string;
  reported_request_id?: string;
  reported_message_id?: string;
  reported_post_id?: string;
  reason: ReportReason;
  description?: string;
}

export const moderationService = {
  // ─── Block / Unblock ──────────────────────────────────

  async blockUser(blockerId: string, blockedId: string): Promise<void> {
    const { error } = await supabase
      .from('user_blocks')
      .insert({ blocker_id: blockerId, blocked_id: blockedId });

    if (error) throw error;

    // Also remove any existing connection
    await supabase
      .from('connections')
      .delete()
      .or(`and(requester_id.eq.${blockerId},recipient_id.eq.${blockedId}),and(requester_id.eq.${blockedId},recipient_id.eq.${blockerId})`);
  },

  async unblockUser(blockerId: string, blockedId: string): Promise<void> {
    const { error } = await supabase
      .from('user_blocks')
      .delete()
      .eq('blocker_id', blockerId)
      .eq('blocked_id', blockedId);

    if (error) throw error;
  },

  async getBlockedUsers(userId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('user_blocks')
      .select('blocked_id')
      .eq('blocker_id', userId);

    if (error) throw error;
    return (data || []).map(b => b.blocked_id);
  },

  async isBlocked(blockerId: string, blockedId: string): Promise<boolean> {
    const { data } = await supabase
      .from('user_blocks')
      .select('id')
      .eq('blocker_id', blockerId)
      .eq('blocked_id', blockedId)
      .maybeSingle();

    return !!data;
  },

  // ─── Reports ──────────────────────────────────────────

  async submitReport(reporterId: string, input: ReportCreate): Promise<void> {
    const { error } = await supabase
      .from('reports')
      .insert({
        reporter_id: reporterId,
        ...input,
      });

    if (error) throw error;
  },

  async getMyReports(userId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('reporter_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },
};
