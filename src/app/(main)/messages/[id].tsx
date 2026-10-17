import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, KeyboardAvoidingView, Platform, TouchableOpacity, ActivityIndicator, Alert, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Avatar } from '@/components/ui/Avatar';
import { Colors } from '@/constants/colors';
import { FontFamily, FontSize } from '@/constants/typography';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { ArrowLeft, Send } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMessages } from '@/features/messages/hooks/useMessages';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { messageService, MessageRow } from '@/features/messages/services/messageService';
import { supabase } from '@/lib/supabase/client';
import { isRealId } from '@/utils/ids';
import { RealtimeChannel } from '@supabase/supabase-js';

export default function ChatRoomScreen() {
  const { id, name, avatar } = useLocalSearchParams<{ id: string; name?: string; avatar?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session } = useAuthStore();
  const { fetchMessages, sendMessage, loading } = useMessages();
  
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const contactName = name || 'Conversation';

  const loadMessages = async () => {
    if (!id || typeof id !== 'string') return;
    try {
      const data = await fetchMessages(id);
      setMessages(data);
    } catch (err: any) {
      console.warn('[ChatRoom] loadMessages error:', err);
      Alert.alert('Unable to load messages', 'You must have an accepted connection with this member to participate in this chat.');
    }
  };

  useEffect(() => {
    if (id && typeof id === 'string') {
      loadMessages();
      if (isRealId(id)) {
        const sub: RealtimeChannel = messageService.subscribeToConversation(id, async (newMsg) => {
          setMessages(prev => {
            const exists = prev.some(m => m.id === newMsg.id);
            if (exists) return prev;
            return [...prev, newMsg];
          });
          setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

          // Realtime payloads do not carry the joined profile; backfill it
          // so the sender name/avatar render correctly.
          if (!newMsg.sender_profile && newMsg.sender_id !== session?.user?.id) {
            try {
              const profiles = await messageService.getProfiles([newMsg.sender_id]);
              const profile = profiles.get(newMsg.sender_id);
              if (profile) {
                setMessages(prev =>
                  prev.map(m => m.id === newMsg.id ? { ...m, sender_profile: profile } : m)
                );
              }
            } catch (err) {
              console.warn('[Chat] Failed to backfill sender profile:', err);
            }
          }
        });

        return () => {
          supabase.removeChannel(sub);
        };
      }
    }
  }, [id]);

  const handleSend = async () => {
    if (sending || !inputText.trim() || !session?.user.id || typeof id !== 'string') return;
    
    const content = inputText.trim();
    setInputText(''); // optimistic clear
    setSending(true);
    
    try {
      if (isRealId(id)) {
        const sent = await sendMessage(id, session.user.id, content);
        // Realtime pushes it to other clients; ensure it also shows for the sender.
        setMessages(prev => (prev.some(m => m.id === sent.id) ? prev : [...prev, sent]));
      } else {
        throw new Error('This conversation is no longer available.');
      }
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (err: any) {
      console.error(err);
      setInputText(content); // revert on error
      Alert.alert('Message Failed', err?.message || 'You must have an accepted connection to send messages.');
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item, index }: { item: MessageRow; index: number }) => {
    const isMe = item.sender_id === session?.user?.id;
    const time = new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const currentDate = new Date(item.created_at);
    const previousDate = index > 0 ? new Date(messages[index - 1].created_at) : null;
    const showDate = !previousDate || currentDate.toDateString() !== previousDate.toDateString();
    const dateLabel = currentDate.toDateString() === new Date().toDateString()
      ? `Today, ${currentDate.toLocaleDateString([], { month: 'short', day: 'numeric' })}`
      : currentDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
    
    return (
      <View>
        {showDate && (
          <View style={styles.dateSeparator}>
            <View style={styles.dateRule} />
            <Text style={styles.dateText}>{dateLabel}</Text>
            <View style={styles.dateRule} />
          </View>
        )}
        <View style={[styles.messageWrapper, isMe ? styles.messageWrapperMe : styles.messageWrapperThem]}>
          {!isMe && (
            <Avatar
              name={item.sender_profile?.display_name || contactName}
              imageUrl={item.sender_profile?.avatar_url || (avatar || undefined)}
              size="sm"
              style={styles.messageAvatar}
            />
          )}
          <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
            <Text style={[styles.messageText, isMe ? styles.messageTextMe : styles.messageTextThem]}>
              {item.content}
            </Text>
            <Text style={[styles.timeText, isMe ? styles.timeTextMe : styles.timeTextThem]}>
              {time}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.canGoBack() ? router.back() : router.replace('/(main)/messages')}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={21} color={Colors.dark.DEFAULT} />
        </TouchableOpacity>
        <Avatar name={contactName} url={avatar || undefined} size="sm" />
        <View style={styles.contactCopy}>
          <Text style={styles.contactName} numberOfLines={1}>{contactName}</Text>
        </View>
      </View>
      
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {loading && messages.length === 0 ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={Colors.primary.DEFAULT} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.messageList}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
            ListEmptyComponent={
              <View style={styles.emptyConversation}>
                <Text style={styles.emptyConversationText}>Start the conversation by sending a message.</Text>
              </View>
            }
          />
        )}
        
        <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, Spacing.sm) }]}>
          <View style={styles.inputWrapper}>
            <TextInput
              placeholder="Type here..."
              placeholderTextColor={Colors.dark.tertiary}
              value={inputText}
              onChangeText={setInputText}
              style={styles.composerInput}
              multiline
              editable={!sending}
              accessibilityLabel="Message"
              underlineColorAndroid="transparent"
            />
          </View>
          <TouchableOpacity 
            style={[styles.sendBtn, (!inputText.trim() || sending) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim() || sending}
            accessibilityRole="button"
            accessibilityLabel="Send message"
          >
            {sending ? <ActivityIndicator size="small" color={Colors.white} /> : <Send size={18} color={Colors.white} />}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  backButton: {
    width: 32,
    height: 36,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  contactCopy: {
    flex: 1,
    minWidth: 0,
  },
  contactName: {
    fontFamily: FontFamily.semibold,
    fontSize: FontSize.base,
    color: Colors.dark.DEFAULT,
  },
  dateSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginVertical: Spacing.sm,
  },
  dateRule: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border.light,
  },
  dateText: {
    color: Colors.dark.tertiary,
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
  },
  emptyConversation: {
    minHeight: 220,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing['2xl'],
  },
  emptyConversationText: {
    color: Colors.dark.tertiary,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    textAlign: 'center',
  },
  composerInput: {
    minHeight: 40,
    maxHeight: 96,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    color: Colors.dark.DEFAULT,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    textAlignVertical: 'top',
  },
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboardView: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  messageList: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  messageWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: Spacing.xs,
  },
  messageWrapperMe: {
    justifyContent: 'flex-end',
  },
  messageWrapperThem: {
    justifyContent: 'flex-start',
  },
  messageAvatar: {
    marginRight: Spacing.xs,
  },
  bubble: {
    maxWidth: '75%',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
  },
  bubbleMe: {
    backgroundColor: Colors.primary.DEFAULT,
    borderBottomRightRadius: 2,
  },
  bubbleThem: {
    backgroundColor: '#F1F1F2',
    borderBottomLeftRadius: 2,
  },
  messageText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
    lineHeight: 20,
  },
  messageTextMe: {
    color: Colors.white,
  },
  messageTextThem: {
    color: Colors.dark.DEFAULT,
  },
  timeText: {
    fontFamily: FontFamily.medium,
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  timeTextMe: {
    color: 'rgba(255,255,255,0.7)',
  },
  timeTextThem: {
    color: Colors.dark.tertiary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    backgroundColor: Colors.surface.DEFAULT,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  attachBtn: {
    padding: Spacing.sm,
    marginBottom: 4,
  },
  inputWrapper: {
    flex: 1,
    marginRight: Spacing.sm,
    marginBottom: Spacing.xs,
    backgroundColor: '#F5F5F6',
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  sendBtn: {
    backgroundColor: Colors.primary.DEFAULT,
    width: 38,
    height: 38,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  sendBtnDisabled: {
    backgroundColor: Colors.border.dark,
  },
});
