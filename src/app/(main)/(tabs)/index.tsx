// Project LifeOrbit — Home Screen (dashboard)
// Senior-quality landing surface: greeting + donor status, quick actions,
// and a live feed of active blood requests near the user.
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Droplet, PlusCircle, MessageCircle, Bell, ChevronRight, MapPin, Clock, Newspaper, Search, Heart, MessageSquare } from 'lucide-react-native';
import { Screen } from '@/components/layout/Screen';
import { Header } from '@/components/layout/Header';
import { Avatar } from '@/components/ui/Avatar';
import { BloodInLogo } from '@/components/ui/Logo';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { requestService, type BloodRequestRow } from '@/features/requests/services/requestService';
import { postService, type PostRow } from '@/features/posts/services/postService';
import { POST_PURPOSE_LABEL } from '@/features/posts/constants/posts';
import { UrgencyBadge } from '@/features/requests/components/UrgencyBadge';
import { Colors } from '@/constants/colors';
import { FontFamily, FontSize, LineHeight } from '@/constants/typography';
import { BorderRadius, Spacing, Shadows } from '@/constants/spacing';

interface QuickAction {
  key: string;
  label: string;
  caption: string;
  icon: React.ReactNode;
  tint: string;
  onPress: () => void;
}

export default function HomeScreen() {
  const router = useRouter();
  const { profile, user } = useAuthStore();
  const [available, setAvailable] = useState<boolean>(profile?.is_available ?? true);
  const [requests, setRequests] = useState<BloodRequestRow[]>([]);
  const [recentPosts, setRecentPosts] = useState<PostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRequests = useCallback(async () => {
    try {
      setError(null);
      const [reqs, posts] = await Promise.all([
        requestService.getActiveRequests({ limit: 5 }),
        postService.getFeed({ limit: 3, userId: user?.id }),
      ]);
      setRequests(reqs);
      setRecentPosts(posts);
    } catch (err) {
      console.warn('[Home] Failed to load data:', err);
      setError('Could not load the latest data.');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      loadRequests();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const quickActions: QuickAction[] = [
    {
      key: 'request',
      label: 'Request Blood',
      caption: 'Post an urgent need',
      icon: <PlusCircle size={24} color={Colors.white} />,
      tint: Colors.semantic.critical.DEFAULT,
      onPress: () => router.push('/(main)/requests/create'),
    },
    {
      key: 'post',
      label: 'New Post',
      caption: 'Share with your network',
      icon: <Newspaper size={24} color={Colors.white} />,
      tint: Colors.primary.DEFAULT,
      onPress: () => router.push('/(main)/posts/create'),
    },
    {
      key: 'discover',
      label: 'Find People',
      caption: 'Grow your network',
      icon: <Search size={24} color={Colors.white} />,
      tint: Colors.verification.community,
      onPress: () => router.push('/(main)/(tabs)/discover'),
    },
    {
      key: 'messages',
      label: 'Messages',
      caption: 'Your inbox',
      icon: <MessageCircle size={24} color={Colors.white} />,
      tint: Colors.verification.identity,
      onPress: () => router.push('/(main)/messages'),
    },
  ];

  const firstName = profile?.display_name?.split(' ')[0] || 'there';
  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background.DEFAULT }}>
      <Header
        title="BloodIn"
        rightElement={
          <TouchableOpacity onPress={() => router.push('/(main)/(tabs)/profile')} activeOpacity={0.8}>
            <Avatar
              name={profile?.display_name || user?.email || 'User'}
              url={profile?.avatar_url}
              size="md"
              showBorder
            />
          </TouchableOpacity>
        }
      />

      <Screen scrollable padding keyboardAvoiding={false}>
        {/* Hero greeting */}
        <View style={styles.heroRow}>
          <View style={styles.heroLeft}>
            <BloodInLogo size={56} />
            <View style={styles.heroText}>
              <Text style={styles.eyebrow}>{today}</Text>
              <Text style={styles.greeting}>Hello, {firstName}</Text>
            </View>
          </View>

          <View style={styles.heroRight}>
            <TouchableOpacity
              style={styles.notificationButton}
              onPress={() => router.push('/(main)/notifications')}
              activeOpacity={0.8}
            >
              <Bell size={20} color={Colors.dark.DEFAULT} />
              <View style={styles.notificationDot} />
            </TouchableOpacity>

            <View style={styles.impactCard}>
              <View style={styles.impactItem}>
                <Text style={styles.impactNumber}>{requests.length}</Text>
                <Text style={styles.impactLabel}>Active requests</Text>
              </View>
              <View style={styles.impactDivider} />
              <View style={styles.impactItem}>
                <Text style={styles.impactNumber}>{recentPosts.length}</Text>
                <Text style={styles.impactLabel}>Recent posts</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Donor status card */}
        <Card variant="elevated" style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <View style={styles.bloodPill}>
              <Droplet size={18} color={Colors.primary.DEFAULT} />
              <Text style={styles.bloodPillText}>{profile?.blood_group || 'Set blood type'}</Text>
            </View>
            <View style={styles.availability}>
              <Text style={styles.availabilityLabel}>
                {available ? 'Available to help' : 'Unavailable'}
              </Text>
              <Switch
                value={available}
                onValueChange={setAvailable}
                trackColor={{ true: Colors.semantic.success.DEFAULT, false: Colors.border.dark }}
              />
            </View>
          </View>
          <View style={styles.verificationRow}>
            {profile?.human_verified ? (
              <Badge label="Verified" variant="success" leftIcon={<Droplet size={12} color={Colors.semantic.success.dark} />} />
            ) : null}
            {profile?.identity_verified ? (
              <Badge label="Identity confirmed" variant="info" />
            ) : null}
          </View>
        </Card>

        {/* Quick actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickGrid}>
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.key}
                style={styles.quickActionClean}
                activeOpacity={0.75}
                onPress={action.onPress}
              >
                <View style={[styles.quickIconClean, { backgroundColor: action.tint }]}>{action.icon}</View>
                <View style={styles.quickTextWrap}>
                  <Text style={styles.quickLabel}>{action.label}</Text>
                  <Text style={styles.quickCaption} numberOfLines={1}>{action.caption}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Latest from your network */}
        {recentPosts.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Latest from Your Network</Text>
              <TouchableOpacity onPress={() => router.push('/(main)/(tabs)/feed')} style={styles.seeAll}>
                <Text style={styles.seeAllText}>See feed</Text>
                <ChevronRight size={16} color={Colors.primary.DEFAULT} />
              </TouchableOpacity>
            </View>
            {recentPosts.map((post) => (
              <CompactPostCard key={post.id} post={post} />
            ))}
          </View>
        )}

        {/* Active requests */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Active Requests</Text>
            <TouchableOpacity onPress={() => router.push('/(main)/(tabs)/requests')} style={styles.seeAll}>
              <Text style={styles.seeAllText}>See all</Text>
              <ChevronRight size={16} color={Colors.primary.DEFAULT} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.centeredState}>
              <ActivityIndicator color={Colors.primary.DEFAULT} />
            </View>
          ) : error ? (
            <Card variant="flat" style={styles.stateCard}>
              <Text style={styles.stateText}>{error}</Text>
            </Card>
          ) : requests.length === 0 ? (
            <Card variant="flat" style={styles.stateCard}>
              <Text style={styles.stateTitle}>No active requests right now</Text>
              <Text style={styles.stateText}>
                Be the first to post a request or check back soon as the community needs blood.
              </Text>
              <Button
                title="Post a request"
                variant="secondary"
                size="sm"
                leftIcon={<PlusCircle size={16} color={Colors.primary.dark} />}
                style={styles.stateButton}
                onPress={() => router.push('/(main)/requests/create')}
              />
            </Card>
          ) : (
            <View>
              {requests.map((request) => (
                <CompactRequestCard key={request.id} request={request} />
              ))}
            </View>
          )}
        </View>
      </Screen>
    </View>
  );
}

function CompactRequestCard({ request }: { request: BloodRequestRow }) {
  const router = useRouter();
  const isExpired = new Date(request.expires_at) < new Date();
  const timeLabel = isExpired ? 'Expired' : 'Active';

  return (
    <TouchableOpacity
      style={styles.requestCard}
      onPress={() => router.push(`/(main)/requests/${request.id}`)}
      activeOpacity={0.75}
    >
      <View style={styles.requestBlood}>
        <Text style={styles.requestBloodText}>{request.blood_group}</Text>
        <Text style={styles.requestUnits}>{request.units_required} U</Text>
      </View>
      <View style={styles.requestBody}>
        <View style={styles.requestTopRow}>
          <Text style={styles.requestName} numberOfLines={1}>
            {request.patient_name || request.hospital_name}
          </Text>
          <UrgencyBadge level={request.urgency_level} />
        </View>
        <View style={styles.requestMetaRow}>
          <View style={styles.requestMetaItem}>
            <MapPin size={13} color={Colors.dark.tertiary} />
            <Text style={styles.requestMetaText} numberOfLines={1}>{request.hospital_name}</Text>
          </View>
          <View style={styles.requestMetaItem}>
            <Clock size={13} color={Colors.dark.tertiary} />
            <Text style={styles.requestMetaText}>{timeLabel}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function CompactPostCard({ post }: { post: PostRow }) {
  const router = useRouter();
  const purposeLabel = POST_PURPOSE_LABEL[post.purpose] || post.purpose;

  return (
    <TouchableOpacity
      style={styles.postCard}
      activeOpacity={0.75}
      onPress={() => router.push(`/(main)/posts/${post.id}`)}
    >
      <Avatar
        name={post.author?.display_name || 'User'}
        imageUrl={post.author?.avatar_url || undefined}
        size="sm"
      />
      <View style={styles.postBody}>
        <View style={styles.postHeader}>
          <Text style={styles.postAuthor} numberOfLines={1}>
            {post.author?.display_name || 'Unknown'}
          </Text>
          <Text style={styles.postTime}>{timeAgo(post.created_at)}</Text>
        </View>
        <Text style={styles.postContent} numberOfLines={2}>
          {post.content}
        </Text>
        <View style={styles.postFooter}>
          <View style={[styles.postPurposeTag, { backgroundColor: Colors.primary.subtle }]}>
            <Text style={[styles.postPurposeText, { color: Colors.primary.dark }]}>{purposeLabel}</Text>
          </View>
          {post.reaction_count > 0 && (
            <View style={styles.postStat}>
              <Heart size={12} color={Colors.dark.tertiary} />
              <Text style={styles.postStatText}>{post.reaction_count}</Text>
            </View>
          )}
          {post.comment_count > 0 && (
            <View style={styles.postStat}>
              <MessageSquare size={12} color={Colors.dark.tertiary} />
              <Text style={styles.postStatText}>{post.comment_count}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  eyebrow: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: Colors.dark.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing['2xs'],
  },
  greeting: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xl,
    color: Colors.dark.DEFAULT,
  },
  heroRow: {
    alignItems: 'stretch',
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  heroLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
    minWidth: 0,
  },
  heroText: {
    flexDirection: 'column',
    flex: 1,
    minWidth: 0,
  },
  heroRight: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginLeft: 0,
    marginTop: Spacing.md,
  },
  impactCard: {
    flex: 1,
    marginLeft: Spacing.md,
    backgroundColor: Colors.surface.DEFAULT,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    ...Shadows.sm,
  },
  impactItem: {
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
  },
  impactNumber: {
    fontFamily: FontFamily.semibold,
    fontSize: FontSize.md,
    color: Colors.dark.DEFAULT,
  },
  impactLabel: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.dark.tertiary,
  },
  impactDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.border.light,
    marginHorizontal: Spacing.sm,
  },
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  notificationDot: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.semantic.critical.DEFAULT,
    borderWidth: 1.5,
    borderColor: Colors.surface.DEFAULT,
  },
  statusCard: {
    padding: Spacing.lg,
    marginBottom: Spacing['2xl'],
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bloodPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary.subtle,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  bloodPillText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.base,
    color: Colors.primary.dark,
    marginLeft: Spacing.xs,
  },
  availability: {
    alignItems: 'flex-end',
  },
  availabilityLabel: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: Colors.dark.secondary,
    marginBottom: 2,
  },
  verificationRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginTop: Spacing.md,
  },
  section: {
    marginBottom: Spacing['2xl'],
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontFamily: FontFamily.semibold,
    fontSize: FontSize.lg,
    color: Colors.dark.DEFAULT,
    marginBottom: Spacing.md,
  },
  seeAll: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 24,
  },
  seeAllText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.primary.DEFAULT,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: Spacing.md,
  },
  quickActionClean: {
    width: '48%',
    backgroundColor: Colors.surface.DEFAULT,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    ...Shadows.sm,
  },
  quickIconClean: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickTextWrap: {
    flex: 1,
  },
  quickLabel: {
    fontFamily: FontFamily.semibold,
    fontSize: FontSize.base,
    color: Colors.dark.DEFAULT,
  },
  quickCaption: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.dark.tertiary,
    marginTop: 2,
  },
  centeredState: {
    paddingVertical: Spacing['3xl'],
    alignItems: 'center',
  },
  stateCard: {
    padding: Spacing.lg,
  },
  stateTitle: {
    fontFamily: FontFamily.semibold,
    fontSize: FontSize.base,
    color: Colors.dark.DEFAULT,
    marginBottom: Spacing.xs,
  },
  stateText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    lineHeight: LineHeight.sm,
    color: Colors.dark.secondary,
  },
  stateButton: {
    alignSelf: 'flex-start',
    marginTop: Spacing.md,
  },
  requestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface.DEFAULT,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  requestBlood: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.semantic.critical.light,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginRight: Spacing.md,
    minWidth: 64,
  },
  requestBloodText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    color: Colors.semantic.critical.dark,
  },
  requestUnits: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: Colors.semantic.critical.dark,
    marginTop: 2,
  },
  requestBody: {
    flex: 1,
  },
  requestTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  requestName: {
    fontFamily: FontFamily.semibold,
    fontSize: FontSize.base,
    color: Colors.dark.DEFAULT,
    flex: 1,
    marginRight: Spacing.sm,
  },
  requestMetaRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  requestMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
  },
  requestMetaText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.dark.tertiary,
    flexShrink: 1,
  },
  postCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface.DEFAULT,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  postBody: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  postAuthor: {
    fontFamily: FontFamily.semibold,
    fontSize: FontSize.sm,
    color: Colors.dark.DEFAULT,
    flex: 1,
  },
  postTime: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.dark.tertiary,
    marginLeft: Spacing.xs,
  },
  postContent: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.dark.secondary,
    lineHeight: 18,
    marginBottom: Spacing.xs,
  },
  postFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  postPurposeTag: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  postPurposeText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
  },
  postStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  postStatText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.dark.tertiary,
  },
});
