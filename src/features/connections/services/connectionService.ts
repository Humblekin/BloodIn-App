// Project LifeOrbit — Connection Service
// Encapsulates all Supabase interactions for the connections domain.

import { supabase } from '@/lib/supabase/client';

export type UserConnectionState =
  | 'none'
  | 'pending_sent'
  | 'pending_received'
  | 'accepted'
  | 'declined';

export interface ConnectionStatusResult {
  state: UserConnectionState;
  connectionId?: string;
  requestId?: string;
}

export interface ConnectionRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled';
  message?: string;
  created_at: string;
  updated_at: string;
  // Joined profile data
  sender_profile?: { display_name: string; avatar_url: string | null; blood_group: string | null; is_premium?: boolean };
  receiver_profile?: { display_name: string; avatar_url: string | null; blood_group: string | null; is_premium?: boolean };
}

export interface Connection {
  id: string;
  requester_id: string;
  recipient_id: string;
  status: string;
  created_at: string;
  // Joined profile of the other user
  other_user?: { id: string; display_name: string; avatar_url: string | null; blood_group: string | null; is_premium?: boolean };
}

export const connectionService = {
  // ─── Fetch ────────────────────────────────────────────

  async getConnections(userId: string): Promise<Connection[]> {
    const { data, error } = await supabase
      .from('connections')
      .select(`
        *,
        requester:profiles!connections_requester_id_fkey(id, display_name, avatar_url, blood_group, is_premium),
        recipient:profiles!connections_recipient_id_fkey(id, display_name, avatar_url, blood_group, is_premium)
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
        sender_profile:profiles!connection_requests_sender_id_fkey(display_name, avatar_url, blood_group, is_premium),
        receiver_profile:profiles!connection_requests_receiver_id_fkey(display_name, avatar_url, blood_group, is_premium)
      `)
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as ConnectionRequest[];
  },

  // ─── Queries ──────────────────────────────────────────

  async isConnected(userA: string, userB: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('connections')
      .select('id')
      .or(`and(requester_id.eq.${userA},recipient_id.eq.${userB}),and(requester_id.eq.${userB},recipient_id.eq.${userA})`)
      .eq('status', 'accepted')
      .maybeSingle();

    if (error) {
      console.warn('[Connections] isConnected check error:', error);
      return false;
    }
    return !!data;
  },

  /**
   * Authoritative connection state between two users.
   * Checks both mutual connections and pending requests.
   */
  async getConnectionStatus(currentUserId: string, targetUserId: string): Promise<ConnectionStatusResult> {
    if (!currentUserId || !targetUserId || currentUserId === targetUserId) {
      return { state: 'none' };
    }

    try {
      // 1. Check if already an accepted connection
      const { data: conn } = await supabase
        .from('connections')
        .select('id, status')
        .or(`and(requester_id.eq.${currentUserId},recipient_id.eq.${targetUserId}),and(requester_id.eq.${targetUserId},recipient_id.eq.${currentUserId})`)
        .eq('status', 'accepted')
        .maybeSingle();

      if (conn) {
        return { state: 'accepted', connectionId: conn.id };
      }

      // 2. Check pending / recent requests in connection_requests
      const { data: req } = await supabase
        .from('connection_requests')
        .select('id, sender_id, receiver_id, status')
        .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${targetUserId}),and(sender_id.eq.${targetUserId},receiver_id.eq.${currentUserId})`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (req) {
        if (req.status === 'accepted') {
          return { state: 'accepted', requestId: req.id };
        }
        if (req.status === 'pending') {
          if (req.sender_id === currentUserId) {
            return { state: 'pending_sent', requestId: req.id };
          } else {
            return { state: 'pending_received', requestId: req.id };
          }
        }
        if (req.status === 'declined') {
          return { state: 'declined', requestId: req.id };
        }
      }

      return { state: 'none' };
    } catch (err) {
      console.warn('[Connections] getConnectionStatus failed:', err);
      return { state: 'none' };
    }
  },

  // ─── Mutate ───────────────────────────────────────────

  async sendRequest(senderId: string, receiverId: string, message?: string): Promise<void> {
    if (senderId === receiverId) {
      throw new Error('You cannot send a connection request to yourself.');
    }

    // Verify existing state to prevent duplicates
    const current = await this.getConnectionStatus(senderId, receiverId);
    if (current.state === 'accepted') {
      throw new Error('You are already connected with this user.');
    }
    if (current.state === 'pending_sent') {
      throw new Error('A connection request is already pending.');
    }

    // Insert into connection_requests
    const { error: reqError } = await supabase
      .from('connection_requests')
      .insert({
        sender_id: senderId,
        receiver_id: receiverId,
        status: 'pending',
        message: message || null,
      });

    if (reqError) {
      // Check for duplicate key
      if (reqError.code === '23505') {
        throw new Error('A connection request is already pending.');
      }
      throw reqError;
    }

    // Also record as pending in connections if desired
    try {
      await supabase
        .from('connections')
        .insert({
          requester_id: senderId,
          recipient_id: receiverId,
          status: 'pending',
        });
    } catch (ignore) {
      // Primary authority is handled
    }
  },

  async respondToRequest(
    requestId: string,
    action: 'accepted' | 'declined'
  ): Promise<void> {
    const { data: request, error: fetchError } = await supabase
      .from('connection_requests')
      .update({ status: action, updated_at: new Date().toISOString() })
      .eq('id', requestId)
      .select()
      .single();

    if (fetchError) throw fetchError;

    // If accepted, ensure connections table has the accepted record
    if (action === 'accepted' && request) {
      const { data: existing } = await supabase
        .from('connections')
        .select('id')
        .or(`and(requester_id.eq.${request.sender_id},recipient_id.eq.${request.receiver_id}),and(requester_id.eq.${request.receiver_id},recipient_id.eq.${request.sender_id})`)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('connections')
          .update({ status: 'accepted', updated_at: new Date().toISOString() })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('connections')
          .insert({
            requester_id: request.sender_id,
            recipient_id: request.receiver_id,
            status: 'accepted',
          });
      }
    } else if (action === 'declined' && request) {
      // Update any connection entry
      await supabase
        .from('connections')
        .update({ status: 'rejected', updated_at: new Date().toISOString() })
        .or(`and(requester_id.eq.${request.sender_id},recipient_id.eq.${request.receiver_id}),and(requester_id.eq.${request.receiver_id},recipient_id.eq.${request.sender_id})`);
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
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', requestId);

    if (error) throw error;
  },
};
