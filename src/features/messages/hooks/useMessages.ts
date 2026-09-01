import { useState, useCallback, useEffect } from 'react';
import { messageService, ConversationRow, MessageRow } from '../services/messageService';

export function useMessages(conversationId?: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchConversations = useCallback(async (userId: string) => {
    setLoading(true);
    setError(null);
    try {
      return await messageService.getConversations(userId);
    } catch (err: any) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMessages = useCallback(async (id: string, options?: { limit?: number; before?: string }) => {
    setLoading(true);
    setError(null);
    try {
      return await messageService.getMessages(id, options);
    } catch (err: any) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const sendMessage = useCallback(async (id: string, senderId: string, content: string) => {
    try {
      return await messageService.sendMessage(id, senderId, content);
    } catch (err: any) {
      setError(err);
      throw err;
    }
  }, []);

  return {
    loading,
    error,
    fetchConversations,
    fetchMessages,
    sendMessage,
  };
}
