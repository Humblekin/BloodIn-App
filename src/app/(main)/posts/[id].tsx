// Project LifeOrbit — Post Detail Screen
// Single post view with comments. Visibility is enforced by RLS on posts.
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Header } from '@/components/layout/Header';
import { Avatar } from '@/components/ui/Avatar';
import { PostCard } from '@/features/posts/components/PostCard';
import { postService, type PostRow, type PostCommentRow } from '@/features/posts/services/postService';
import { MAX_COMMENT_LENGTH } from '@/features/posts/constants/posts';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { Colors } from '@/constants/colors';
import { FontFamily, FontSize } from '@/constants/typography';
import { Spacing } from '@/constants/spacing';

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuthStore();
  const [post, setPost] = useState<PostRow | null>(null);
  const [comments, setComments] = useState<PostCommentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [postData, commentData] = await Promise.all([
        postService.getPostById(id),
        postService.getComments(id),
      ]);
      if (!postData) {
        setError('This post is no longer available.');
      } else {
        setPost(postData);
        setComments(commentData);
      }
    } catch (err) {
      console.warn('[Post] Failed to load:', err);
      setError('Could not load this post.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleToggleReaction = useCallback(() => {
    setPost((prev) => {
      if (!prev) return prev;
      const hadReaction = !!prev.my_reaction?.length;
      return {
        ...prev,
        my_reaction: hadReaction ? [] : [{ reaction: 'support' as const }],
        reaction_count: Number(prev.reaction_count ?? 0) + (hadReaction ? -1 : 1),
      };
    });
    if (post && session?.user.id) {
      postService.toggleReaction(post.id, session.user.id, 'support').catch((err) => {
        console.warn('[Post] Reaction failed:', err);
      });
    }
  }, [post, session]);

  const handleSendComment = async () => {
    const text = draft.trim();
    if (!text || !post || !session?.user.id) return;
    setSending(true);
    try {
      const comment = await postService.addComment(post.id, session.user.id, text);
      setComments((prev) => [...prev, comment]);
      setPost((prev) =>
        prev ? { ...prev, comment_count: Number(prev.comment_count ?? 0) + 1 } : prev
      );
      setDraft('');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not add comment.');
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <Header showBack title="Post" />

      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator color={Colors.primary.DEFAULT} />
        </View>
      ) : error || !post ? (
        <View style={styles.centerState}>
          <Text style={styles.stateText}>{error || 'Post not found.'}</Text>
        </View>
      ) : (
        <>
          <ScrollView
            style={{ flex: 1, backgroundColor: Colors.background.DEFAULT }}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <PostCard post={post} onToggleReaction={handleToggleReaction} />

            <Text style={styles.commentsTitle}>
              {comments.length === 0 ? 'No comments yet' : `${comments.length} comment${comments.length === 1 ? '' : 's'}`}
            </Text>

            {comments.map((comment) => (
              <View key={comment.id} style={styles.comment}>
                <Avatar name={comment.author?.display_name || 'User'} url={comment.author?.avatar_url} size="sm" />
                <View style={styles.commentBody}>
                  <Text style={styles.commentAuthor}>{comment.author?.display_name || 'User'}</Text>
                  <Text style={styles.commentText}>{comment.content}</Text>
                </View>
              </View>
            ))}
          </ScrollView>

          <View style={styles.composer}>
            <TextInput
              style={styles.composerInput}
              value={draft}
              onChangeText={setDraft}
              placeholder="Add a comment..."
              placeholderTextColor={Colors.dark.tertiary}
              multiline
              maxLength={MAX_COMMENT_LENGTH}
            />
            <TouchableOpacity
              style={[styles.sendButton, (!draft.trim() || sending) && styles.sendButtonDisabled]}
              onPress={handleSendComment}
              disabled={!draft.trim() || sending}
              activeOpacity={0.7}
            >
              <Text style={styles.sendButtonText}>{sending ? '...' : 'Send'}</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  stateText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.md,
    color: Colors.dark.secondary,
    textAlign: 'center',
  },
  content: {
    padding: Spacing.md,
    paddingBottom: Spacing['3xl'],
  },
  commentsTitle: {
    fontFamily: FontFamily.semibold,
    fontSize: FontSize.md,
    color: Colors.dark.DEFAULT,
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
  },
  comment: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
  },
  commentBody: {
    flex: 1,
    marginLeft: Spacing.sm,
    backgroundColor: Colors.surface.DEFAULT,
    borderRadius: 12,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  commentAuthor: {
    fontFamily: FontFamily.semibold,
    fontSize: FontSize.sm,
    color: Colors.dark.DEFAULT,
    marginBottom: 2,
  },
  commentText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
    lineHeight: 20,
    color: Colors.dark.secondary,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface.DEFAULT,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  composerInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 96,
    backgroundColor: Colors.background.secondary,
    borderRadius: 20,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
    color: Colors.dark.DEFAULT,
  },
  sendButton: {
    backgroundColor: Colors.primary.DEFAULT,
    borderRadius: 20,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    fontFamily: FontFamily.semibold,
    fontSize: FontSize.sm,
    color: Colors.white,
  },
});