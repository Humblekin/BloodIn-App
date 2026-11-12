import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, KeyboardAvoidingView, Platform, TouchableOpacity, ActivityIndicator, Alert, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Avatar } from '@/components/ui/Avatar';
import { Colors } from '@/constants/colors';
import { FontFamily, FontSize } from '@/constants/typography';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { ArrowLeft, Send, Mic, Square, X, Play, Pause, Trash2 } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio';
import { useMessages } from '@/features/messages/hooks/useMessages';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { messageService, MessageRow } from '@/features/messages/services/messageService';
import { supabase } from '@/lib/supabase/client';
import { isRealId } from '@/utils/ids';
import { RealtimeChannel } from '@supabase/supabase-js';

function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

function VoiceNotePlayer({
  url,
  duration,
  isMe,
}: {
  url: string | null;
  duration: number | null;
  isMe: boolean;
}) {
  const player = useAudioPlayer(url);
  const status = useAudioPlayerStatus(player);

  const toggle = () => {
    if (!url) return;
    if (status.playing) {
      player.pause();
      return;
    }
    if (status.didJustFinish) {
      void player.seekTo(0);
    }
    player.play();
  };

  const total = duration ?? status.duration ?? 0;
  const current = status.currentTime ?? 0;
  const progress = total > 0 ? Math.min(1, current / total) : 0;
  const progressWidth = `${Math.round(progress * 100)}%` as `${number}%`;

  return (
    <TouchableOpacity
      style={styles.voiceRow}
      onPress={toggle}
      accessibilityRole="button"
      accessibilityLabel={status.playing ? 'Pause voice note' : 'Play voice note'}
    >
      <View style={[styles.voicePlay, isMe ? styles.voicePlayMe : styles.voicePlayThem]}>
        {status.playing ? (
          <Pause size={16} color={isMe ? Colors.primary.DEFAULT : Colors.white} />
        ) : (
          <Play size={16} color={isMe ? Colors.primary.DEFAULT : Colors.white} />
        )}
      </View>
      <View style={styles.voiceTrackWrap}>
        <View style={[styles.voiceTrack, isMe ? styles.voiceTrackMe : styles.voiceTrackThem]}>
          <View
            style={[
              styles.voiceFill,
              isMe ? styles.voiceFillMe : styles.voiceFillThem,
              { width: progressWidth },
            ]}
          />
        </View>
        <Text style={[styles.voiceDuration, isMe ? styles.timeTextMe : styles.timeTextThem]}>
          {formatDuration(current > 0 ? current : total)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function ChatRoomScreen() {
  const { id, name, avatar } = useLocalSearchParams<{ id: string; name?: string; avatar?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session } = useAuthStore();
  const { fetchMessages, sendMessage, loading } = useMessages();

  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [sendingVoice, setSendingVoice] = useState(false);
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);

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
        const sub: RealtimeChannel = messageService.subscribeToConversation(
          id,
          async (newMsg) => {
            setMessages(prev => {
              const exists = prev.some(m => m.id === newMsg.id);
              if (exists) return prev;
              return [...prev, newMsg];
            });
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

            if (newMsg.message_type === 'voice' && newMsg.media_path && !newMsg.media_url) {
              try {
                const url = await messageService.getSignedVoiceUrl(newMsg.media_path);
                setMessages(prev =>
                  prev.map(m => (m.id === newMsg.id ? { ...m, media_url: url } : m))
                );
              } catch (err) {
                console.warn('[Chat] Failed to sign voice note:', err);
              }
            }

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
          },
          (deletedMessageId) => {
            setMessages(prev => prev.filter(message => message.id !== deletedMessageId));
          }
        );

        return () => {
          supabase.removeChannel(sub);
        };
      }
    }
  }, [id]);

  useEffect(() => {
    return () => {
      if (recorder.isRecording) {
        void recorder.stop();
      }
    };
  }, [recorder]);

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

  const confirmDeleteMessage = (message: MessageRow) => {
    Alert.alert(
      'Delete message?',
      'This will remove the message from this conversation for everyone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => void deleteMessage(message),
        },
      ]
    );
  };

  const deleteMessage = async (message: MessageRow) => {
    if (deletingMessageId) return;

    setDeletingMessageId(message.id);
    try {
      const result = await messageService.deleteMessage(message);
      setMessages(prev => prev.filter(item => item.id !== message.id));

      if (result.voiceCleanupFailed) {
        Alert.alert(
          'Message deleted',
          'The voice message was removed from the conversation, but its audio file could not be cleaned up.'
        );
      }
    } catch (err) {
      console.error('[Chat] Failed to delete message:', err);
      Alert.alert(
        'Unable to delete message',
        err instanceof Error ? err.message : 'Please try again.'
      );
    } finally {
      setDeletingMessageId(null);
    }
  };

  const startRecording = async () => {
    if (isRecording || sendingVoice) return;
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Microphone needed', 'Allow microphone access to send a voice note.');
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setIsRecording(true);
    } catch (err) {
      console.error(err);
      Alert.alert('Could not start recording', 'Please try again.');
    }
  };

  const cancelRecording = async () => {
    setIsRecording(false);
    try {
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
    } catch (err) {
      console.warn('[Chat] Failed to cancel recording:', err);
    }
  };

  const stopAndSendVoice = async () => {
    if (!isRecording || !session?.user.id || typeof id !== 'string' || !isRealId(id)) return;

    const duration = recorderState.durationMillis / 1000;
    setIsRecording(false);
    setSendingVoice(true);

    try {
      await recorder.stop();
      const uri = recorder.uri;
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });

      if (!uri) {
        throw new Error('Recording was not saved.');
      }
      if (duration < 1) {
        Alert.alert('Too short', 'Record a little longer and try again.');
        return;
      }

      const sent = await messageService.sendVoiceMessage(id, session.user.id, uri, duration);
      setMessages(prev => (prev.some(m => m.id === sent.id) ? prev : [...prev, sent]));
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (err: any) {
      console.error(err);
      Alert.alert('Voice note failed', err?.message || 'Please try again.');
    } finally {
      setSendingVoice(false);
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
            {item.message_type === 'voice' ? (
              <VoiceNotePlayer
                url={item.media_url ?? null}
                duration={item.duration_seconds}
                isMe={isMe}
              />
            ) : (
              <Text style={[styles.messageText, isMe ? styles.messageTextMe : styles.messageTextThem]}>
                {item.content}
              </Text>
            )}
            <View style={styles.messageFooter}>
              <Text style={[styles.timeText, isMe ? styles.timeTextMe : styles.timeTextThem]}>
                {time}
              </Text>
              {isMe && !item.is_system_message && (
                <TouchableOpacity
                  style={styles.deleteMessageButton}
                  onPress={() => confirmDeleteMessage(item)}
                  disabled={deletingMessageId !== null}
                  accessibilityRole="button"
                  accessibilityLabel="Delete message"
                >
                  {deletingMessageId === item.id ? (
                    <ActivityIndicator size="small" color={Colors.white} />
                  ) : (
                    <Trash2 size={14} color={Colors.white} />
                  )}
                </TouchableOpacity>
              )}
            </View>
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
                <Text style={styles.emptyConversationText}>
                  Start the conversation with a message or a voice note.
                </Text>
              </View>
            }
          />
        )}

        <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, Spacing.sm) }]}>
          {isRecording ? (
            <>
              <View style={styles.recordingBar}>
                <View style={styles.recordingDot} />
                <Text style={styles.recordingText}>
                  {formatDuration(recorderState.durationMillis / 1000)}
                </Text>
                <Text style={styles.recordingHint}>Recording…</Text>
              </View>
              <TouchableOpacity
                style={styles.cancelRecordingBtn}
                onPress={() => void cancelRecording()}
                accessibilityRole="button"
                accessibilityLabel="Cancel recording"
              >
                <X size={18} color={Colors.dark.secondary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.sendBtn}
                onPress={() => void stopAndSendVoice()}
                accessibilityRole="button"
                accessibilityLabel="Send voice note"
              >
                <Square size={16} color={Colors.white} fill={Colors.white} />
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                style={styles.attachBtn}
                onPress={() => void startRecording()}
                disabled={sendingVoice}
                accessibilityRole="button"
                accessibilityLabel="Record a voice note"
              >
                {sendingVoice ? (
                  <ActivityIndicator size="small" color={Colors.primary.DEFAULT} />
                ) : (
                  <Mic size={21} color={Colors.primary.DEFAULT} />
                )}
              </TouchableOpacity>
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
            </>
          )}
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
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: Spacing.xs,
  },
  deleteMessageButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeTextMe: {
    color: 'rgba(255,255,255,0.7)',
  },
  timeTextThem: {
    color: Colors.dark.tertiary,
  },
  voiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    minWidth: 150,
  },
  voicePlay: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voicePlayMe: {
    backgroundColor: Colors.white,
  },
  voicePlayThem: {
    backgroundColor: Colors.primary.DEFAULT,
  },
  voiceTrackWrap: {
    flex: 1,
    gap: 4,
  },
  voiceTrack: {
    height: 4,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  voiceTrackMe: {
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  voiceTrackThem: {
    backgroundColor: Colors.border.dark,
  },
  voiceFill: {
    height: '100%',
    borderRadius: BorderRadius.full,
  },
  voiceFillMe: {
    backgroundColor: Colors.white,
  },
  voiceFillThem: {
    backgroundColor: Colors.primary.DEFAULT,
  },
  voiceDuration: {
    fontFamily: FontFamily.medium,
    fontSize: 10,
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
  recordingBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.semantic.critical.light,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    height: 40,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.semantic.critical.DEFAULT,
  },
  recordingText: {
    fontFamily: FontFamily.semibold,
    fontSize: FontSize.sm,
    color: Colors.semantic.critical.DEFAULT,
  },
  recordingHint: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.dark.secondary,
  },
  cancelRecordingBtn: {
    width: 38,
    height: 38,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
    marginRight: Spacing.xs,
    backgroundColor: Colors.border.light,
  },
});
