import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Header } from '@/components/layout/Header';
import { Screen } from '@/components/layout/Screen';
import { Avatar } from '@/components/ui/Avatar';
import { Colors } from '@/constants/colors';
import { FontFamily, FontSize } from '@/constants/typography';
import { Spacing } from '@/constants/spacing';
import { Edit } from 'lucide-react-native';
import { useMessages } from '@/features/messages/hooks/useMessages';
import { useAuthStore } from '@/features/auth/stores/authStore';
import type { ConversationRow } from '@/features/messages/services/messageService';

export default function MessagesListScreen() {
  const router = useRouter();
  const { session } = useAuthStore();
  const { fetchConversations, loading } = useMessages();
  
  const [conversations, setConversations] = useState<ConversationRow[]>([]);

  useEffect(() => {
    if (session?.user.id) {
      loadData();
    }
  }, [session?.user.id]);

  const loadData = async () => {
    if (!session?.user.id) return;
    try {
      const data = await fetchConversations(session.user.id);
      setConversations(data);
    } catch (err) {
      console.error(err);
    }
  };

  const renderChat = ({ item }: { item: ConversationRow }) => {
    // In a real implementation we would fetch the other participant's profile
    // and the last message from the database. For MVP, we use fallback data if not joined.
    const otherParticipant = item.participants?.find(p => p.user_id !== session?.user?.id)?.profile;
    const name = otherParticipant?.display_name || 'Conversation';
    const avatar = otherParticipant?.avatar_url || undefined;
    
    return (
      <TouchableOpacity 
        style={styles.chatRow} 
        onPress={() => router.push(`/(main)/messages/${item.id}`)}
        activeOpacity={0.7}
      >
        <Avatar name={name} imageUrl={avatar} size="md" />
        <View style={styles.chatContent}>
          <View style={styles.chatHeader}>
            <Text style={styles.chatName}>{name}</Text>
            <Text style={styles.chatTime}>
              {new Date(item.last_message_at).toLocaleDateString()}
            </Text>
          </View>
          <View style={styles.chatFooter}>
            <Text style={styles.lastMessage} numberOfLines={1}>
              {item.last_message?.content || 'Tap to view messages...'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <Header 
        title="Messages" 
        showBack 
        rightElement={
          <TouchableOpacity style={{ padding: Spacing.xs }}>
            <Edit size={24} color={Colors.primary.DEFAULT} />
          </TouchableOpacity>
        }
      />
      <Screen padding={false} backgroundColor={Colors.background.DEFAULT}>
        {loading && conversations.length === 0 ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={Colors.primary.DEFAULT} />
          </View>
        ) : (
          <FlatList
            data={conversations}
            keyExtractor={(item) => item.id}
            renderItem={renderChat}
            contentContainerStyle={styles.list}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            ListEmptyComponent={
              <View style={styles.center}>
                 <Text style={styles.emptyText}>No messages yet.</Text>
              </View>
            }
          />
        )}
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  emptyText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
    color: Colors.dark.secondary,
  },
  list: {
    paddingTop: Spacing.sm,
  },
  chatRow: {
    flexDirection: 'row',
    padding: Spacing.md,
    alignItems: 'center',
    backgroundColor: Colors.surface.DEFAULT,
  },
  chatContent: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatName: {
    fontFamily: FontFamily.semibold,
    fontSize: FontSize.base,
    color: Colors.dark.DEFAULT,
  },
  chatTime: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.dark.tertiary,
  },
  chatFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.dark.secondary,
    paddingRight: Spacing.sm,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.border.light,
    marginLeft: 76,
  },
});
