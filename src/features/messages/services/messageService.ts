// Project LifeOrbit — Message Service
import { supabase } from '@/lib/supabase/client';
import { demoService, isRealId } from '@/features/demo/demoService';

export interface ConversationRow {
  id: string;
  type: 'direct' | 'request';
  created_at: string;
  last_message_at: string;
  // Joined
  participants?: { user_id: string; profile?: { display_name: string; avatar_url: string | null } }[];
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
    if (!isRealId(userId)) {
      return demoService.getConversations();
    }

    // Step 1: Get conversation IDs the user participates in
    const { data: participations, error: partError } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', userId);

    if (partError) throw partError;
    if (!participations || participations.length === 0) {
      return demoService.getConversations();
    }

    const conversationIds = participations.map(p => p.conversation_id);

    // Step 2: Get conversations with last message
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .in('id', conversationIds)
      .order('last_message_at', { ascending: false });

    if (error) throw error;
    const conversations = (data || []) as ConversationRow[];

    // Step 3: Attach participants + their profiles for every conversation
    const [{ data: members, error: membersError }, { data: profiles, error: profilesError }] =
      await Promise.all([
        supabase
          .from('conversation_participants')
          .select('conversation_id, user_id')
          .in('conversation_id', conversationIds),
        supabase
          .from('profiles')
          .select('id, display_name, avatar_url'),
      ]);

    if (membersError) throw membersError;
    if (profilesError) throw profilesError;

    const profilesById = new Map(
      (profiles || []).map((profile) => [profile.id, profile as { display_name: string; avatar_url: string | null }])
    );

    const membersByConversation = (members || []).reduce<Record<string, { user_id: string }[]>>((acc, member) => {
      const list = acc[member.conversation_id] || (acc[member.conversation_id] = []);
      list.push({ user_id: member.user_id });
      return acc;
    }, {});

    // Step 4: Attach the most recent message for each conversation
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('id, conversation_id, sender_id, content, created_at')
      .in('conversation_id', conversationIds)
      .order('created_at', { ascending: false })
      .limit(200);

    if (messagesError) throw messagesError;

    const lastMessageByConversation = new Map<string, { content: string; sender_id: string; created_at: string }>();
    for (const message of (messages || []) as { conversation_id: string; content: string; sender_id: string; created_at: string }[]) {
      if (!lastMessageByConversation.has(message.conversation_id)) {
        lastMessageByConversation.set(message.conversation_id, {
          content: message.content,
          sender_id: message.sender_id,
          created_at: message.created_at,
        });
      }
    }

    return conversations.map((conversation) => ({
      ...conversation,
      participants: (membersByConversation[conversation.id] || []).map((member) => ({
        user_id: member.user_id,
        profile: profilesById.get(member.user_id),
      })),
      last_message: lastMessageByConversation.get(conversation.id),
    }));
  },

  async getOrCreateDirectConversation(userA: string, userB: string): Promise<string> {
    // SECURITY DEFINER RPC: safely creates the conversation + both participant
    // rows even though the participants INSERT policy only allows one's own row.
    const { data, error } = await supabase.rpc('create_direct_conversation', {
      user_a: userA,
      user_b: userB,
    });

    if (error) {
      console.warn('[Messaging] create_direct_conversation RPC failed:', error);
      throw error;
    }

    return data as string;
  },

  // ─── Messages ─────────────────────────────────────────

  async getMessages(
    conversationId: string,
    options?: { limit?: number; before?: string }
  ): Promise<MessageRow[]> {
    if (!isRealId(conversationId)) {
      return demoService.getMessages(conversationId);
    }

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

  async getProfiles(userIds: string[]): Promise<Map<string, { display_name: string; avatar_url: string | null }>> {
    if (userIds.length === 0) return new Map();
    const { data, error } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url')
      .in('id', userIds);
    if (error) throw error;
    return new Map(
      (data || []).map((profile) => [
        profile.id,
        { display_name: profile.display_name, avatar_url: profile.avatar_url },
      ])
    );
  },
};
