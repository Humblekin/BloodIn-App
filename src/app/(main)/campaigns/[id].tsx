import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Image, Alert } from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';
import { typography } from '@/constants/typography';
import { useCampaigns } from '@/features/campaigns/hooks/useCampaigns';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { Calendar, MapPin, Users } from 'lucide-react-native';
import type { CampaignRow, CampaignParticipantRow } from '@/features/campaigns/services/campaignService';

export default function CampaignDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { session } = useAuthStore();
  const { fetchCampaignById, registerForCampaign, fetchParticipants, loading } = useCampaigns();
  
  const [campaign, setCampaign] = useState<CampaignRow | null>(null);
  const [participants, setParticipants] = useState<CampaignParticipantRow[]>([]);
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
      const camp = await fetchCampaignById(id);
      setCampaign(camp);
      
      if (camp) {
        const parts = await fetchParticipants(camp.id);
        setParticipants(parts);
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to load campaign details');
    } finally {
      setIsFetching(false);
    }
  };

  const handleRegister = async () => {
    if (!session?.user.id || !campaign) return;
    try {
      await registerForCampaign(campaign.id, session.user.id);
      Alert.alert('Success', 'You are now registered for this campaign.');
      loadData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to register');
    }
  };

  const isRegistered = participants.some(p => p.user_id === session?.user.id);
  const startDate = campaign ? new Date(campaign.start_date) : new Date();

  if (isFetching) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary.default} />
      </View>
    );
  }

  if (!campaign) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.notFoundText}>This campaign could not be found.</Text>
        <Pressable style={styles.primaryButton} onPress={() => router.back()}>
          <Text style={styles.primaryButtonText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen options={{ title: 'Campaign' }} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {campaign.cover_image_url ? (
          <Image source={{ uri: campaign.cover_image_url }} style={styles.coverImage} />
        ) : (
          <View style={[styles.coverImage, styles.coverPlaceholder]}>
             <Text style={styles.placeholderText}>Campaign</Text>
          </View>
        )}

        <View style={styles.header}>
          <Text style={styles.title}>{campaign.title}</Text>
          <View style={styles.badges}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{campaign.campaign_type.replace('_', ' ').toUpperCase()}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: colors.status.success + '20' }]}>
               <Text style={[styles.badgeText, { color: colors.status.success }]}>{campaign.status.toUpperCase()}</Text>
            </View>
          </View>
        </View>

        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Calendar size={20} color={colors.primary.default} />
            <View style={styles.detailTextGroup}>
              <Text style={styles.detailLabel}>Date & Time</Text>
              <Text style={styles.detailValue}>
                {startDate.toLocaleDateString()} at {startDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </Text>
            </View>
          </View>
          
          {campaign.venue && (
            <View style={styles.detailRow}>
              <MapPin size={20} color={colors.primary.default} />
              <View style={styles.detailTextGroup}>
                <Text style={styles.detailLabel}>Venue</Text>
                <Text style={styles.detailValue}>{campaign.venue}</Text>
              </View>
            </View>
          )}

          <View style={styles.detailRow}>
            <Users size={20} color={colors.primary.default} />
            <View style={styles.detailTextGroup}>
              <Text style={styles.detailLabel}>Participants</Text>
              <Text style={styles.detailValue}>
                {participants.length} {campaign.max_participants ? `/ ${campaign.max_participants}` : ''} registered
              </Text>
            </View>
          </View>
        </View>

        {campaign.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.bodyText}>{campaign.description}</Text>
          </View>
        )}

        <View style={styles.actionContainer}>
          {isRegistered ? (
             <View style={styles.successBox}>
               <Text style={styles.successText}>You are registered for this campaign!</Text>
             </View>
          ) : (
            <Pressable 
              style={[styles.primaryButton, loading && styles.disabledButton]}
              onPress={handleRegister}
              disabled={loading}
            >
              <Text style={styles.primaryButtonText}>Register to Attend</Text>
            </Pressable>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.default,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  notFoundText: {
    fontFamily: typography.fonts.medium,
    fontSize: typography.sizes.md,
    color: colors.text.secondary,
    marginBottom: 16,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  coverImage: {
    width: '100%',
    height: 200,
    backgroundColor: colors.border.light,
  },
  coverPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primary.light + '30',
  },
  placeholderText: {
    fontFamily: typography.fonts.semiBold,
    fontSize: typography.sizes.xl,
    color: colors.primary.default,
  },
  header: {
    padding: 16,
  },
  title: {
    fontFamily: typography.fonts.bold,
    fontSize: typography.sizes.xl,
    color: colors.text.primary,
    marginBottom: 12,
  },
  badges: {
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    backgroundColor: colors.primary.light + '40',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontFamily: typography.fonts.semiBold,
    fontSize: 10,
    color: colors.primary.default,
  },
  detailsCard: {
    backgroundColor: colors.background.card,
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  detailTextGroup: {
    marginLeft: 12,
    flex: 1,
  },
  detailLabel: {
    fontFamily: typography.fonts.medium,
    fontSize: typography.sizes.xs,
    color: colors.text.secondary,
    marginBottom: 2,
  },
  detailValue: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.sizes.md,
    color: colors.text.primary,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontFamily: typography.fonts.bold,
    fontSize: typography.sizes.lg,
    color: colors.text.primary,
    marginBottom: 12,
  },
  bodyText: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.sizes.md,
    color: colors.text.secondary,
    lineHeight: 24,
  },
  actionContainer: {
    paddingHorizontal: 16,
    marginTop: 8,
  },
  primaryButton: {
    backgroundColor: colors.primary.default,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
  primaryButtonText: {
    fontFamily: typography.fonts.semiBold,
    fontSize: typography.sizes.md,
    color: colors.text.inverse,
  },
  successBox: {
    backgroundColor: colors.status.success + '10',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.status.success + '30',
  },
  successText: {
    fontFamily: typography.fonts.semiBold,
    fontSize: typography.sizes.md,
    color: colors.status.success,
  },
});
