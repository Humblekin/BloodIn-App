// Project LifeOrbit — Home Screen (dashboard)
// Senior-quality landing surface: greeting + donor status, quick actions,
// and a live feed of active blood requests near the user.
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, ActivityIndicator, Image, ImageBackground, TextInput } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Droplet, PlusCircle, MessageCircle, Bell, ChevronRight, MapPin, Clock, Search, Heart, MessageSquare, SlidersHorizontal } from 'lucide-react-native';
import { Screen } from '@/components/layout/Screen';
import { Avatar } from '@/components/ui/Avatar';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  const insets = useSafeAreaInsets();
  const { profile, user, updateProfile } = useAuthStore();
  const [available, setAvailable] = useState<boolean>(profile?.is_available ?? true);
  const [requests, setRequests] = useState<BloodRequestRow[]>([]);
  const [recentPosts, setRecentPosts] = useState<PostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

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
      key: 'discover',
      label: 'Find Donors',
      caption: 'Search nearby people',
      icon: <Search size={19} color={Colors.primary.DEFAULT} />,
      tint: Colors.primary.subtle,
      onPress: () => router.push('/(main)/(tabs)/discover'),
    },
    {
      key: 'request',
      label: 'Request Blood',
      caption: 'Post an urgent need',
      icon: <PlusCircle size={19} color={Colors.primary.DEFAULT} />,
      tint: Colors.primary.subtle,
      onPress: () => router.push('/(main)/requests/create'),
    },
    {
      key: 'post',
      label: 'Blood Orders',
      caption: 'View open requests',
      icon: <Droplet size={19} color={Colors.primary.DEFAULT} />,
      tint: Colors.primary.subtle,
      onPress: () => router.push('/(main)/(tabs)/requests'),
    },
    {
      key: 'messages',
      label: 'Messages',
      caption: 'Coordinate with people',
      icon: <MessageCircle size={19} color={Colors.primary.DEFAULT} />,
      tint: Colors.primary.subtle,
      onPress: () => router.push('/(main)/(tabs)/messages'),
    },
  ];

  const firstName = profile?.display_name?.split(' ')[0] || 'there';

  const handleAvailabilityToggle = async (value: boolean) => {
    setAvailable(value);
    const result = await updateProfile({ is_available: value });
    if (result.error) {
      // Revert on failure so the UI always mirrors the stored value.
      setAvailable(profile?.is_available ?? true);
    }
  };

  const openDiscover = () => {
    const query = searchQuery.trim();
    router.push(query
      ? `/(main)/(tabs)/discover?search=${encodeURIComponent(query)}`
      : '/(main)/(tabs)/discover');
  };

  return (
    <View style={styles.homeRoot}>
      <Screen
        scrollable
        padding={false}
        safeArea={false}
        keyboardAvoiding={false}
        backgroundColor={Colors.primary.DEFAULT}
        contentContainerStyle={styles.homeScrollContent}
      >
        <View style={[styles.redPanel, { paddingTop: insets.top + Spacing.sm }]}>
          <View style={styles.greetingRow}>
            <TouchableOpacity onPress={() => router.push('/(main)/(tabs)/profile')} activeOpacity={0.8}>
              <Avatar name={profile?.display_name || user?.email || 'User'} url={profile?.avatar_url} size="sm" showBorder />
            </TouchableOpacity>
            <View style={styles.greetingCopy}>
              <Text style={styles.greeting}>Hi, {firstName}</Text>
              <Text style={styles.welcomeText} numberOfLines={1}>
                {profile?.blood_group ? `Welcome to BloodIn · ${profile.blood_group}` : 'Welcome to BloodIn'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.headerAction}
              onPress={() => router.push('/(main)/notifications')}
              activeOpacity={0.8}
              accessibilityLabel="Notifications"
            >
              <Bell size={17} color={Colors.primary.DEFAULT} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerAction}
              onPress={() => router.push('/(main)/(tabs)/messages')}
              activeOpacity={0.8}
              accessibilityLabel="Messages"
            >
              <MessageCircle size={17} color={Colors.primary.DEFAULT} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.donationHero} onPress={openDiscover} activeOpacity={0.92}>
            <Text style={styles.donationHeadline}>Donate Blood{ '\n' }Save Life</Text>
            <Image
              source={require('../../../../assets/images/blood_donation_hero.jpg')}
              style={styles.donationImage}
              resizeMode="cover"
              accessibilityLabel="A donor giving blood"
            />
          </TouchableOpacity>

          <View style={styles.searchRow}>
            <View style={styles.searchField}>
              <Search size={16} color={Colors.dark.tertiary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search nearby"
                placeholderTextColor={Colors.dark.tertiary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={openDiscover}
                returnKeyType="search"
                accessibilityLabel="Search donors and community"
                underlineColorAndroid="transparent"
              />
              <TouchableOpacity
                style={styles.searchSubmit}
                onPress={openDiscover}
                activeOpacity={0.75}
                hitSlop={4}
                accessibilityRole="button"
                accessibilityLabel="Search"
              >
                <Search size={16} color={Colors.primary.DEFAULT} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.filterButton}
              onPress={openDiscover}
              activeOpacity={0.8}
              accessibilityLabel="Open discovery filters"
            >
              <SlidersHorizontal size={17} color={Colors.primary.DEFAULT} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.bodyContent}>

        {/* Quick actions */}
        <View style={styles.section}>
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

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Emergency Blood</Text>
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
              {requests.slice(0, 1).map((request) => (
                <TouchableOpacity
                  key={request.id}
                  style={styles.emergencyCard}
                  onPress={() => router.push(`/(main)/requests/${request.id}`)}
                  activeOpacity={0.85}
                >
                  <ImageBackground
                    source={require('../../../../assets/images/blood_donation_care.jpg')}
                    style={styles.emergencyImage}
                    imageStyle={styles.emergencyImageStyle}
                  >
                    <View style={styles.emergencyScrim}>
                      <View style={styles.emergencyTitleRow}>
                        <Text style={styles.emergencyTitle} numberOfLines={1}>
                          {request.hospital_name || request.patient_name || 'Blood request'}
                        </Text>
                        <UrgencyBadge level={request.urgency_level} />
                      </View>
                      <Text style={styles.emergencyDetail} numberOfLines={1}>
                        {request.blood_group} · {request.units_required} units needed
                      </Text>
                    </View>
                  </ImageBackground>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={styles.availabilityStrip}>
          <View style={styles.availabilityCopy}>
            <Text style={styles.availabilityTitle}>{available ? 'Available to donate' : 'Not available'}</Text>
            <Text style={styles.availabilityDetail}>
              {profile?.human_verified ? 'Verified donor' : 'Manage your donor availability'}
            </Text>
          </View>
          <Switch
            value={available}
            onValueChange={handleAvailabilityToggle}
            trackColor={{ true: Colors.semantic.success.DEFAULT, false: Colors.border.dark }}
          />
        </View>

        {/* Latest from your network */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Latest from Your Network</Text>
            <TouchableOpacity onPress={() => router.push('/(main)/(tabs)/feed')} style={styles.seeAll}>
              <Text style={styles.seeAllText}>See feed</Text>
              <ChevronRight size={16} color={Colors.primary.DEFAULT} />
            </TouchableOpacity>
          </View>
          {recentPosts.length > 0 ? recentPosts.map((post) => (
            <CompactPostCard key={post.id} post={post} />
          )) : (
            <Text style={styles.stateText}>No recent community posts.</Text>
          )}
        </View>
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
    homeRoot: {
      flex: 1,
      backgroundColor: Colors.background.DEFAULT,
    },
    homeScrollContent: {
      paddingBottom: Spacing.sm,
    },
    redPanel: {
      backgroundColor: Colors.primary.DEFAULT,
      paddingHorizontal: Spacing.md,
      paddingBottom: Spacing.md,
    },
    greetingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      marginBottom: Spacing.md,
    },
    greetingCopy: {
      flex: 1,
      minWidth: 0,
    },
    welcomeText: {
      color: 'rgba(255,255,255,0.84)',
      fontFamily: FontFamily.regular,
      fontSize: 10,
      marginTop: 2,
    },
    headerAction: {
      width: 32,
      height: 32,
      borderRadius: BorderRadius.full,
      backgroundColor: Colors.white,
      alignItems: 'center',
      justifyContent: 'center',
    },
    donationHero: {
      height: 174,
      backgroundColor: Colors.white,
      borderRadius: 14,
      overflow: 'hidden',
      marginBottom: Spacing.sm,
      paddingTop: Spacing.sm,
    },
    donationHeadline: {
      color: Colors.dark.DEFAULT,
      fontFamily: FontFamily.semibold,
      fontSize: FontSize.md,
      lineHeight: 19,
      paddingHorizontal: Spacing.md,
      paddingBottom: Spacing.xs,
    },
    donationImage: {
      width: '100%',
      height: 128,
    },
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    searchField: {
      flex: 1,
      height: 46,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      paddingLeft: Spacing.md,
      paddingRight: Spacing.xs,
      borderRadius: BorderRadius.full,
      borderWidth: 1,
      borderColor: Colors.primary.subtle,
      backgroundColor: Colors.white,
    },
    searchInput: {
      flex: 1,
      minWidth: 0,
      paddingVertical: 0,
      color: Colors.dark.DEFAULT,
      fontFamily: FontFamily.regular,
      fontSize: FontSize.sm,
    },
    searchSubmit: {
      width: 34,
      height: 34,
      borderRadius: BorderRadius.full,
      backgroundColor: Colors.primary.subtle,
      alignItems: 'center',
      justifyContent: 'center',
    },
    filterButton: {
      width: 46,
      height: 46,
      borderRadius: BorderRadius.full,
      backgroundColor: Colors.white,
      borderWidth: 1,
      borderColor: Colors.primary.subtle,
      alignItems: 'center',
      justifyContent: 'center',
    },
    bodyContent: {
      flex: 1,
      backgroundColor: '#F5F5F6',
      paddingHorizontal: Spacing.md,
      paddingTop: Spacing.md,
    },
    availabilityStrip: {
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: Colors.white,
      borderRadius: BorderRadius.md,
      paddingHorizontal: Spacing.md,
      marginBottom: Spacing.md,
    },
    availabilityCopy: {
      flex: 1,
    },
    availabilityTitle: {
      color: Colors.dark.DEFAULT,
      fontFamily: FontFamily.medium,
      fontSize: FontSize.xs,
    },
    availabilityDetail: {
      color: Colors.dark.tertiary,
      fontFamily: FontFamily.regular,
      fontSize: 10,
    },
    emergencyCard: {
      height: 126,
      borderRadius: BorderRadius.md,
      overflow: 'hidden',
      marginBottom: Spacing.sm,
    },
    emergencyImage: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    emergencyImageStyle: {
      borderRadius: BorderRadius.md,
    },
    emergencyScrim: {
      padding: Spacing.md,
      backgroundColor: 'rgba(0,0,0,0.42)',
    },
    emergencyTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: Spacing.sm,
    },
    emergencyTitle: {
      flex: 1,
      color: Colors.white,
      fontFamily: FontFamily.semibold,
      fontSize: FontSize.base,
    },
    emergencyDetail: {
      color: Colors.white,
      fontFamily: FontFamily.medium,
      fontSize: FontSize.xs,
      marginTop: Spacing.xs,
    },
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
    fontFamily: FontFamily.semibold,
    fontSize: FontSize.md,
    color: Colors.white,
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
    rowGap: Spacing.sm,
  },
  quickActionClean: {
    width: '48.5%',
    backgroundColor: Colors.surface.DEFAULT,
    borderRadius: 10,
    minHeight: 50,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  quickIconClean: {
    width: 30,
    height: 30,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickTextWrap: {
    flex: 1,
  },
  quickLabel: {
    fontFamily: FontFamily.semibold,
    fontSize: FontSize.xs,
    color: Colors.dark.DEFAULT,
  },
  quickCaption: {
    fontFamily: FontFamily.regular,
    fontSize: 9,
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
