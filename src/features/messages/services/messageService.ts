// Project LifeOrbit — Message Service
import { supabase } from '@/lib/supabase/client';

export interface ConversationRow {
  id: string;
  type: 'direct' | 'request';
  created_at: string;
  last_message_at: string;
  // Joined
  participants?: { user_id: string; profile: { display_name: string; avatar_url: string | null } }[];
  last_message?: { content: string; sender_id: string; created_at: string };
}

export interface MessageRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_system_message: boolean;
  created_at: string;
  sender_profile?: { display_name: string; avatar_url: string | null };
}

export const messageService = {
  // ─── Conversations ────────────────────────────────────

  async getConversations(userId: string): Promise<ConversationRow[]> {
    // Step 1: Get conversation IDs the user participates in
    const { data: participations, error: partError } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', userId);

    if (partError) throw partError;
    if (!participations || participations.length === 0) return [];

    const conversationIds = participations.map(p => p.conversation_id);

    // Step 2: Get conversations with last message
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .in('id', conversationIds)
      .order('last_message_at', { ascending: false });

    if (error) throw error;
    return (data || []) as ConversationRow[];
  },

  async getOrCreateDirectConversation(userA: string, userB: string): Promise<string> {
    // Check if a direct conversation already exists between these two users
    const { data: existingA } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', userA);

    const { data: existingB } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', userB);

    if (existingA && existingB) {
      const aIds = new Set(existingA.map(r => r.conversation_id));
      const shared = existingB.find(r => aIds.has(r.conversation_id));
      if (shared) return shared.conversation_id;
    }

    // Create new conversation
    const { data: conv, error: convError } = await supabase
      .from('conversations')
      .insert({ type: 'direct' })
      .select()
      .single();

    if (convError) throw convError;

    // Add both participants
    const { error: partError } = await supabase
      .from('conversation_participants')
      .insert([
        { conversation_id: conv.id, user_id: userA },
        { conversation_id: conv.id, user_id: userB },
      ]);

    if (partError) throw partError;
    return conv.id;
  },

  // ─── Messages ─────────────────────────────────────────

  async getMessages(
    conversationId: string,
    options?: { limit?: number; before?: string }
  ): Promise<MessageRow[]> {
    let query = supabase
      .from('messages')
      .select(`
        *,
        sender_profile:profiles!messages_sender_id_fkey(display_name, avatar_url)
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(options?.limit ?? 50);

    if (options?.before) {
      query = query.lt('created_at', options.before);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).reverse() as MessageRow[]; // Reverse so oldest first for display
  },

  async sendMessage(
    conversationId: string,
    senderId: string,
    content: string
  ): Promise<MessageRow> {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        content,
      })
      .select()
      .single();

    if (error) throw error;

    // Update conversation last_message_at
    await supabase
      .from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', conversationId);

    return data as MessageRow;
  },

  // ─── Realtime ─────────────────────────────────────────

  subscribeToConversation(
    conversationId: string,
    onMessage: (message: MessageRow) => void
  ) {
    return supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          onMessage(payload.new as MessageRow);
        }
      )
      .subscribe();
  },

  unsubscribeFromConversation(conversationId: string) {
    supabase.removeChannel(
      supabase.channel(`messages:${conversationId}`)
    );
  },
};
