import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, KeyboardAvoidingView, Platform, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Header } from '@/components/layout/Header';
import { Input } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Avatar';
import { Colors } from '@/constants/colors';
import { FontFamily, FontSize } from '@/constants/typography';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { Send, Image as ImageIcon, Phone } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMessages } from '@/features/messages/hooks/useMessages';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { messageService, MessageRow } from '@/features/messages/services/messageService';

export default function ChatRoomScreen() {
  const { id } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { session } = useAuthStore();
  const { fetchMessages, sendMessage, loading } = useMessages();
  
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (id && typeof id === 'string') {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      if (isUuid) {
        loadMessages();

        const sub = messageService.subscribeToConversation(id, (newMsg) => {
          setMessages(prev => [...prev, newMsg]);
          setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        });

        return () => {
          messageService.unsubscribeFromConversation(id);
        };
      }
    }
  }, [id]);

  const loadMessages = async () => {
    if (!id || typeof id !== 'string') return;
    try {
      const data = await fetchMessages(id);
      setMessages(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() || !session?.user.id || typeof id !== 'string') return;
    
    const content = inputText.trim();
    setInputText(''); // optimistic clear
    
    try {
      await sendMessage(id, session.user.id, content);
      // Realtime subscription will push it to the list
    } catch (err) {
      console.error(err);
      setInputText(content); // revert on error
    }
  };

  const renderMessage = ({ item }: { item: MessageRow }) => {
    const isMe = item.sender_id === session?.user?.id;
    const time = new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    return (
      <View style={[styles.messageWrapper, isMe ? styles.messageWrapperMe : styles.messageWrapperThem]}>
        {!isMe && <Avatar name={item.sender_profile?.display_name || 'User'} imageUrl={item.sender_profile?.avatar_url || undefined} size="sm" style={styles.messageAvatar} />}
        <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
          <Text style={[styles.messageText, isMe ? styles.messageTextMe : styles.messageTextThem]}>
            {item.content}
          </Text>
          <Text style={[styles.timeText, isMe ? styles.timeTextMe : styles.timeTextThem]}>
            {time}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Header 
        title="Chat" 
        showBack 
        rightElement={
          <TouchableOpacity style={{ padding: Spacing.xs }}>
            <Phone size={20} color={Colors.dark.DEFAULT} />
          </TouchableOpacity>
        }
      />
      
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
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
          />
        )}
        
        <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, Spacing.md) }]}>
          <TouchableOpacity style={styles.attachBtn}>
            <ImageIcon size={24} color={Colors.dark.tertiary} />
          </TouchableOpacity>
          <View style={styles.inputWrapper}>
            <Input
              placeholder="Type a message..."
              value={inputText}
              onChangeText={setInputText}
              containerStyle={{ minHeight: 40 }}
              style={{ minHeight: 40, paddingVertical: 8 }}
              multiline
            />
          </View>
          <TouchableOpacity 
            style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]} 
            onPress={handleSend}
            disabled={!inputText.trim()}
          >
            <Send size={20} color={Colors.white} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboardView: {
    flex: 1,
  },
  messageList: {
    padding: Spacing.md,
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
    backgroundColor: Colors.surface.DEFAULT,
    borderBottomLeftRadius: 2,
    borderWidth: 1,
    borderColor: Colors.border.light,
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
    paddingHorizontal: Spacing.md,
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
    marginHorizontal: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  sendBtn: {
    backgroundColor: Colors.primary.DEFAULT,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  sendBtnDisabled: {
    backgroundColor: Colors.border.dark,
  },
});
