import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Image, ScrollView, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Header } from '@/components/layout/Header';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Colors } from '@/constants/colors';
import { FontFamily, FontSize } from '@/constants/typography';
import { Spacing } from '@/constants/spacing';
import { Users, MapPin, ShieldCheck, PenSquare, Settings, LogOut } from 'lucide-react-native';
import { useCommunity } from '@/features/communities/hooks/useCommunity';
import { communityService } from '@/features/communities/services/communityService';
import { postService, type PostRow } from '@/features/posts/services/postService';
import { PostCard } from '@/features/posts/components/PostCard';
import { useAuthStore } from '@/features/auth/stores/authStore';
import type { CommunityRow, AnnouncementRow, CommunityMemberRow } from '@/features/communities/services/communityService';
import { AnnouncementCard } from '@/features/communities/components/AnnouncementCard';
import { isRealId } from '@/utils/ids';
import type { PostReactionType } from '@/types/common';

export default function CommunityProfileScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { session } = useAuthStore();
  const { fetchCommunityById, fetchAnnouncements, fetchMembers, joinCommunity, leaveCommunity, loading } = useCommunity();
  
  const [community, setCommunity] = useState<CommunityRow | null>(null);
  const [announcements, setAnnouncements] = useState<AnnouncementRow[]>([]);
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [members, setMembers] = useState<CommunityMemberRow[]>([]);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    if (!id || typeof id !== 'string') return;

    // Demo ids resolve through the service; only real UUIDs hit Supabase.
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    try {
      setIsFetching(true);
      const comm = isUuid ? await fetchCommunityById(id) : await communityService.getCommunityById(id);
      setCommunity(comm);
      if (comm) {
        const [anns, mems, commPosts] = await Promise.all([
          isUuid ? fetchAnnouncements(comm.id) : communityService.getAnnouncements(comm.id),
          isUuid ? fetchMembers(comm.id) : communityService.getMembers(comm.id),
          postService.getCommunityPosts(comm.id, { userId: session?.user?.id }),
        ]);
        setAnnouncements(anns);
        setMembers(mems);
        setPosts(commPosts);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsFetching(false);
    }
  };

  const myMembership = session?.user.id
    ? members.find((m) => m.user_id === session.user.id && m.status === 'active')
    : undefined;
  const canManage = !!myMembership && (myMembership.role === 'admin' || myMembership.role === 'moderator');

  const handleJoin = async () => {
    if (!session?.user.id || !community) return;
    if (!isRealId(community.id)) {
      Alert.alert('Demo community', 'This is a sample community so you can preview the flow. Joining works for real communities.');
      return;
    }
    try {
      await joinCommunity(community.id, session.user.id);
      Alert.alert('Success', community.join_policy === 'open'
        ? 'You joined this community. Start posting and connecting with members!'
        : 'Your request was sent. An admin will approve it soon.');
      loadData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to join');
    }
  };

  const handleLeave = () => {
    if (!session?.user.id || !community) return;
    if (!isRealId(community.id)) {
      Alert.alert('Demo community', 'This is a sample community. Leaving works for real communities.');
      return;
    }
    Alert.alert('Leave community', `Leave "${community.name}"? You can rejoin anytime.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          try {
            await leaveCommunity(community.id, session.user.id);
            Alert.alert('Left', 'You left this community.');
            loadData();
          } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to leave');
          }
        },
      },
    ]);
  };

  const handleToggleReaction = useCallback((postId: string) => {
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        const hadReaction = !!p.my_reaction?.length;
        const delta = hadReaction ? -1 : 1;
        return {
          ...p,
          my_reaction: hadReaction ? [] : [{ reaction: 'support' as PostReactionType }],
          reaction_count: (p.reaction_count ?? 0) + delta,
        };
      })
    );

    if (session?.user?.id && isRealId(postId)) {
      postService.toggleReaction(postId, session.user.id, 'support').catch(() => {
        // Reaction state is optimistic; a failure here is non-fatal for the feed.
      });
    }
  }, [session?.user?.id]);

  if (isFetching) {
    return (
      <View style={[styles.center, { flex: 1, backgroundColor: Colors.background.DEFAULT }]}>
        <ActivityIndicator size="large" color={Colors.primary.DEFAULT} />
      </View>
    );
  }

  if (!community) {
    return (
      <View style={[styles.center, { flex: 1, backgroundColor: Colors.background.DEFAULT }]}>
        <Text style={styles.notFoundText}>This community could not be found.</Text>
        <Button title="Go Back" variant="outline" onPress={() => router.back()} />
      </View>
    );
  }

  const joinLabel = myMembership
    ? 'Member'
    : community.join_policy === 'open'
      ? 'Join'
      : 'Request to Join';

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background.DEFAULT }}>
      <Stack.Screen options={{ headerShown: false }} />
      <Header title="" showBack transparent style={{ position: 'absolute', top: 0, zIndex: 100 }} />
      
      <ScrollView contentContainerStyle={{ paddingBottom: Spacing['3xl'] }}>
        
        {community.cover_url ? (
          <Image source={{ uri: community.cover_url }} style={styles.coverImage} />
        ) : (
          <View style={styles.coverImage}>
            <View style={styles.coverOverlay} />
          </View>
        )}

        <View style={styles.content}>
          <View style={styles.headerRow}>
            <Avatar name={community.name} imageUrl={community.logo_url || undefined} size="2xl" showBorder style={styles.avatar} />
            <View style={styles.actions}>
              {myMembership && canManage && (
                <Button
                  title="Manage"
                  size="sm"
                  variant="outline"
                  leftIcon={<Settings size={16} color={Colors.primary.DEFAULT} />}
                  onPress={() => router.push({ pathname: '/(main)/community/manage', params: { id: community.id } })}
                  disabled={loading}
                />
              )}
              {myMembership ? (
                <Button
                  title="Leave"
                  size="sm"
                  variant="outline"
                  leftIcon={<LogOut size={16} color={Colors.semantic.critical.DEFAULT} />}
                  onPress={handleLeave}
                  disabled={loading}
                />
              ) : (
                <Button
                  title={joinLabel}
                  size="sm"
                  leftIcon={<Users size={16} color={Colors.white} />}
                  onPress={handleJoin}
                  disabled={loading}
                />
              )}
            </View>
          </View>

          <View style={styles.infoSection}>
            <Text style={styles.name}>{community.name}</Text>
            
            <View style={styles.badges}>
              <Badge label="Community" variant="info" />
              {community.is_verified && (
                <Badge label="Verified" variant="success" leftIcon={<ShieldCheck size={12} color={Colors.semantic.success.dark} />} />
              )}
              {myMembership && (
                <Badge
                  label={myMembership.role === 'admin' ? 'Admin' : myMembership.role === 'moderator' ? 'Moderator' : 'Member'}
                  variant="success"
                />
              )}
            </View>

            <View style={styles.stats}>
              <View style={styles.statRow}>
                <Users size={16} color={Colors.dark.tertiary} />
                <Text style={styles.statText}>{community.member_count} Members</Text>
              </View>
              <View style={styles.statRow}>
                <MapPin size={16} color={Colors.dark.tertiary} />
                <Text style={styles.statText}>Location ID: {community.city_id || 'Unknown'}</Text>
              </View>
            </View>

            {community.description && (
              <Text style={styles.description}>{community.description}</Text>
            )}
          </View>

          {/* Members roster */}
          {members.length > 0 && (
            <View style={styles.membersSection}>
              <Text style={styles.subSectionTitle}>Members</Text>
              <View style={styles.memberRow}>
                {members.slice(0, 6).map((member) => (
                  <View key={member.id} style={styles.memberAvatar}>
                    <Avatar
                      name={member.profile?.display_name || 'Member'}
                      url={member.profile?.avatar_url || undefined}
                      size="lg"
                    />
                    {member.role !== 'member' && (
                      <Badge
                        label={member.role === 'admin' ? 'A' : 'M'}
                        variant="info"
                        style={styles.roleBadge}
                      />
                    )}
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={styles.divider} />

          {/* Community feed */}
          <View style={styles.feedSection}>
            <View style={styles.feedHeader}>
              <Text style={styles.sectionTitle}>Community Feed</Text>
              <TouchableOpacity
                style={styles.postButton}
                onPress={() => router.push({ pathname: '/(main)/posts/create', params: { communityId: community.id } })}
                activeOpacity={0.7}
              >
                <PenSquare size={15} color={Colors.white} />
                <Text style={styles.postButtonText}>Post</Text>
              </TouchableOpacity>
            </View>

            {posts.length === 0 ? (
              <Text style={styles.emptyText}>
                No posts yet. Be the first to share an update with this community!
              </Text>
            ) : (
              <View style={styles.postsList}>
                {posts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    onOpen={() => router.push(`/(main)/posts/${post.id}`)}
                    onToggleReaction={handleToggleReaction}
                    style={styles.postCard}
                  />
                ))}
              </View>
            )}
          </View>

          <View style={styles.divider} />

          <View style={styles.announcementsSection}>
            <Text style={styles.sectionTitle}>Announcements</Text>
            
            {announcements.length === 0 ? (
               <Text style={styles.emptyText}>No announcements yet.</Text>
            ) : (
               announcements.map((ann, i) => (
                 <AnnouncementCard key={ann.id || i} announcement={ann} />
               ))
            )}
          </View>

        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  notFoundText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.md,
    color: Colors.dark.secondary,
    marginBottom: Spacing.lg,
  },
  coverImage: {
    height: 160,
    backgroundColor: Colors.primary.DEFAULT,
    width: '100%',
  },
  coverOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  content: {
    paddingHorizontal: Spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: -48,
    marginBottom: Spacing.md,
  },
  avatar: {
    borderWidth: 4,
    borderColor: Colors.background.DEFAULT,
    backgroundColor: Colors.surface.DEFAULT,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  infoSection: {
    gap: Spacing.sm,
  },
  name: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['2xl'],
    color: Colors.dark.DEFAULT,
  },
  badges: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  stats: {
    flexDirection: 'row',
    gap: Spacing.lg,
    marginBottom: Spacing.xs,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.dark.secondary,
  },
  description: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
    color: Colors.dark.DEFAULT,
    lineHeight: 22,
    marginTop: Spacing.xs,
  },
  membersSection: {
    marginTop: Spacing.lg,
  },
  subSectionTitle: {
    fontFamily: FontFamily.semibold,
    fontSize: FontSize.sm,
    color: Colors.dark.secondary,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberAvatar: {
    marginRight: -8,
  },
  roleBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border.light,
    marginVertical: Spacing.xl,
  },
  feedSection: {
    gap: Spacing.md,
  },
  feedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  postButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary.DEFAULT,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
  },
  postButtonText: {
    fontFamily: FontFamily.semibold,
    fontSize: FontSize.sm,
    color: Colors.white,
  },
  postsList: {
    gap: Spacing.md,
  },
  postCard: {
    marginBottom: Spacing.xs,
  },
  announcementsSection: {
    gap: Spacing.md,
  },
  sectionTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    color: Colors.dark.DEFAULT,
    marginBottom: 8,
  },
  emptyText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
    color: Colors.dark.secondary,
  },
});