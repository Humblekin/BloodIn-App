// Project LifeOrbit — Connection Service
// Encapsulates all Supabase interactions for the connections domain.

import { supabase } from '@/lib/supabase/client';

export interface ConnectionRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled';
  message?: string;
  created_at: string;
  updated_at: string;
  // Joined profile data
  sender_profile?: { display_name: string; avatar_url: string | null; blood_group: string | null };
  receiver_profile?: { display_name: string; avatar_url: string | null; blood_group: string | null };
}

export interface Connection {
  id: string;
  requester_id: string;
  recipient_id: string;
  status: string;
  created_at: string;
  // Joined profile of the other user
  other_user?: { id: string; display_name: string; avatar_url: string | null; blood_group: string | null };
}

export const connectionService = {
  // ─── Fetch ────────────────────────────────────────────

  async getConnections(userId: string): Promise<Connection[]> {
    const { data, error } = await supabase
      .from('connections')
      .select(`
        *,
        requester:profiles!connections_requester_id_fkey(id, display_name, avatar_url, blood_group),
        recipient:profiles!connections_recipient_id_fkey(id, display_name, avatar_url, blood_group)
      `)
      .or(`requester_id.eq.${userId},recipient_id.eq.${userId}`)
      .eq('status', 'accepted');

    if (error) throw error;

    return (data || []).map((conn: any) => ({
      ...conn,
      other_user: conn.requester_id === userId ? conn.recipient : conn.requester,
    }));
  },

  async getPendingRequests(userId: string): Promise<ConnectionRequest[]> {
    const { data, error } = await supabase
      .from('connection_requests')
      .select(`
        *,
        sender_profile:profiles!connection_requests_sender_id_fkey(display_name, avatar_url, blood_group),
        receiver_profile:profiles!connection_requests_receiver_id_fkey(display_name, avatar_url, blood_group)
      `)
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as ConnectionRequest[];
  },

  // ─── Mutate ───────────────────────────────────────────

  async sendRequest(senderId: string, receiverId: string, message?: string): Promise<void> {
    const { error } = await supabase
      .from('connection_requests')
      .insert({
        sender_id: senderId,
        receiver_id: receiverId,
        message: message || null,
      });

    if (error) throw error;
  },

  async respondToRequest(
    requestId: string,
    action: 'accepted' | 'declined'
  ): Promise<void> {
    const { data: request, error: fetchError } = await supabase
      .from('connection_requests')
      .update({ status: action })
      .eq('id', requestId)
      .select()
      .single();

    if (fetchError) throw fetchError;

    // If accepted, create a mutual connection entry
    if (action === 'accepted' && request) {
      const { error: connError } = await supabase
        .from('connections')
        .insert({
          requester_id: request.sender_id,
          recipient_id: request.receiver_id,
          status: 'accepted',
        });

      if (connError) throw connError;
    }
  },

  async removeConnection(connectionId: string): Promise<void> {
    const { error } = await supabase
      .from('connections')
      .delete()
      .eq('id', connectionId);

    if (error) throw error;
  },

  async cancelRequest(requestId: string): Promise<void> {
    const { error } = await supabase
      .from('connection_requests')
      .update({ status: 'cancelled' })
      .eq('id', requestId);

    if (error) throw error;
  },

  // ─── Queries ──────────────────────────────────────────

  async isConnected(userA: string, userB: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('connections')
      .select('id')
      .or(`and(requester_id.eq.${userA},recipient_id.eq.${userB}),and(requester_id.eq.${userB},recipient_id.eq.${userA})`)
      .eq('status', 'accepted')
      .maybeSingle();

    if (error) throw error;
    return !!data;
  },
};
