import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Image, ScrollView, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Header } from '@/components/layout/Header';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Colors } from '@/constants/colors';
import { FontFamily, FontSize } from '@/constants/typography';
import { Spacing } from '@/constants/spacing';
import { Users, MapPin, Calendar, Heart, ShieldCheck } from 'lucide-react-native';
import { useCommunity } from '@/features/communities/hooks/useCommunity';
import { useAuthStore } from '@/features/auth/stores/authStore';
import type { CommunityRow, AnnouncementRow } from '@/features/communities/services/communityService';
import { AnnouncementCard } from '@/features/communities/components/AnnouncementCard';

export default function CommunityProfileScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { session } = useAuthStore();
  const { fetchCommunityById, fetchAnnouncements, joinCommunity, loading } = useCommunity();
  
  const [community, setCommunity] = useState<CommunityRow | null>(null);
  const [announcements, setAnnouncements] = useState<AnnouncementRow[]>([]);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    if (!id || typeof id !== 'string') return;

    // Only fetch real records — mock/preview ids (e.g. "mock-2") are not UUIDs.
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (!isUuid) {
      setIsFetching(false);
      return;
    }

    try {
      setIsFetching(true);
      const comm = await fetchCommunityById(id);
      setCommunity(comm);
      if (comm) {
        const anns = await fetchAnnouncements(comm.id);
        setAnnouncements(anns);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsFetching(false);
    }
  };

  const handleJoin = async () => {
    if (!session?.user.id || !community) return;
    try {
      await joinCommunity(community.id, session.user.id);
      Alert.alert('Success', 'You requested to join this community.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to join');
    }
  };

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
              <Button 
                title={community.join_policy === 'open' ? "Join" : "Request to Join"} 
                size="sm" 
                leftIcon={<Users size={16} color={Colors.white} />}
                onPress={handleJoin}
                disabled={loading}
              />
            </View>
          </View>

          <View style={styles.infoSection}>
            <Text style={styles.name}>{community.name}</Text>
            
            <View style={styles.badges}>
              <Badge label="Community" variant="info" />
              {community.is_verified && (
                <Badge label="Verified" variant="success" leftIcon={<ShieldCheck size={12} color={Colors.semantic.success.dark} />} />
              )}
            </View>

            <View style={styles.stats}>
              <View style={styles.statRow}>
                <MapPin size={16} color={Colors.dark.tertiary} />
                <Text style={styles.statText}>Location ID: {community.city_id || 'Unknown'}</Text>
              </View>
              <View style={styles.statRow}>
                <Users size={16} color={Colors.dark.tertiary} />
                <Text style={styles.statText}>{community.member_count} Members</Text>
              </View>
            </View>

            {community.description && (
              <Text style={styles.description}>{community.description}</Text>
            )}
          </View>

          <View style={styles.divider} />

          <View style={styles.eventsSection}>
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
  divider: {
    height: 1,
    backgroundColor: Colors.border.light,
    marginVertical: Spacing.xl,
  },
  eventsSection: {
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
