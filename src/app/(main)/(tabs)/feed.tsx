// Project LifeOrbit — Feed Screen (tab)
// Purpose-driven network feed. Posts respect visibility rules enforced by RLS.
import React, { useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Newspaper, Plus } from 'lucide-react-native';
import { Header } from '@/components/layout/Header';
import { Screen } from '@/components/layout/Screen';
import { PostCard } from '@/features/posts/components/PostCard';
import { useFeed } from '@/features/posts/hooks/usePosts';
import { Avatar } from '@/components/ui/Avatar';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { Colors } from '@/constants/colors';
import { FontFamily, FontSize } from '@/constants/typography';
import { Spacing } from '@/constants/spacing';

export default function FeedScreen() {
  const router = useRouter();
  const { profile } = useAuthStore();
  const { posts, refreshing, hasMore, error, refresh, loadMore, toggleReaction } = useFeed();

  const handleToggleReaction = useCallback(
    (postId: string) => {
      toggleReaction(postId, 'support');
    },
    [toggleReaction]
  );

  const renderItem = ({ item }: { item: any }) => (
    <PostCard
      post={item}
      onOpen={() => router.push(`/(main)/posts/${item.id}`)}
      onToggleReaction={handleToggleReaction}
    />
  );

  return (
    <View style={{ flex: 1 }}>
      <Header
        title="Feed"
        rightElement={
          <TouchableOpacity
            style={styles.composeButton}
            onPress={() => router.push('/(main)/posts/create')}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Create a post"
          >
            <Plus size={20} color={Colors.white} />
            <Text style={styles.composeText}>New Post</Text>
          </TouchableOpacity>
        }
      />

      {/* Composer bar — looks like a social media posting input */}
      <View style={styles.composerContainer}>
        <Avatar url={profile?.avatar_url} name={profile?.display_name} size="sm" />
        <Pressable style={styles.composerInput} onPress={() => router.push('/(main)/posts/create')} accessibilityRole="button">
          <Text style={styles.composerPlaceholder}>What's happening in your network?</Text>
        </Pressable>
      </View>

      <Screen padding={false}>
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[styles.listContent, posts.length === 0 && { flexGrow: 1 }]}
          showsVerticalScrollIndicator={false}
          onRefresh={refresh}
          refreshing={refreshing}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            <View style={styles.centerState}>
              {error ? (
                <>
                  <Text style={styles.stateEmoji}>Oops</Text>
                  <Text style={styles.stateText}>Could not load the feed right now.</Text>
                  <TouchableOpacity style={styles.retryButton} onPress={refresh} activeOpacity={0.7}>
                    <Text style={styles.retryText}>Try again</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Newspaper size={36} color={Colors.dark.tertiary} />
                  <Text style={styles.stateText}>No posts yet.</Text>
                  <Text style={styles.stateHint}>Share a connection, need, or update to start the conversation.</Text>
                </>
              )}
            </View>
          }
          ListFooterComponent={
            hasMore && posts.length > 0 ? (
              <ActivityIndicator style={styles.footerLoader} color={Colors.primary.DEFAULT} />
            ) : null
          }
        />
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  composeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.primary.DEFAULT,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: 20,
  },
  composeText: {
    fontFamily: FontFamily.semibold,
    fontSize: FontSize.sm,
    color: Colors.white,
  },
  listContent: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['3xl'],
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  stateEmoji: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.md,
    color: Colors.dark.secondary,
  },
  stateText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.md,
    color: Colors.dark.secondary,
    textAlign: 'center',
  },
  stateHint: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.dark.tertiary,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: Spacing.sm,
    backgroundColor: Colors.primary.DEFAULT,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
  },
  retryText: {
    fontFamily: FontFamily.semibold,
    fontSize: FontSize.sm,
    color: Colors.white,
  },
  footerLoader: {
    paddingVertical: Spacing.lg,
  },
  composerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
    backgroundColor: Colors.surface.DEFAULT,
  },
  composerInput: {
    flex: 1,
    backgroundColor: Colors.surface.secondary,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: 24,
    justifyContent: 'center',
  },
  composerPlaceholder: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.dark.tertiary,
  },
});