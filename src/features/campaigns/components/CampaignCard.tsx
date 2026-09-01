import React from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '@/constants/colors';
import { typography } from '@/constants/typography';
import { Calendar, MapPin, Users } from 'lucide-react-native';
import type { CampaignRow } from '../services/campaignService';

interface CampaignCardProps {
  campaign: CampaignRow;
}

export function CampaignCard({ campaign }: CampaignCardProps) {
  const router = useRouter();
  const startDate = new Date(campaign.start_date);

  return (
    <Pressable 
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => router.push(`/campaigns/${campaign.id}`)}
    >
      {campaign.cover_image_url ? (
        <Image source={{ uri: campaign.cover_image_url }} style={styles.coverImage} />
      ) : (
        <View style={[styles.coverImage, styles.coverPlaceholder]}>
          <Text style={styles.placeholderText}>Campaign</Text>
        </View>
      )}
      
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <View style={styles.typeBadge}>
            <Text style={styles.typeText}>
              {campaign.campaign_type.replace('_', ' ').toUpperCase()}
            </Text>
          </View>
          <Text style={styles.statusText}>{campaign.status.toUpperCase()}</Text>
        </View>

        <Text style={styles.title} numberOfLines={2}>{campaign.title}</Text>
        
        <View style={styles.details}>
          <View style={styles.detailRow}>
            <Calendar size={14} color={colors.text.tertiary} />
            <Text style={styles.detailText}>{startDate.toLocaleDateString()} at {startDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
          </View>
          
          {campaign.venue && (
            <View style={styles.detailRow}>
              <MapPin size={14} color={colors.text.tertiary} />
              <Text style={styles.detailText} numberOfLines={1}>{campaign.venue}</Text>
            </View>
          )}

          {campaign.max_participants && (
            <View style={styles.detailRow}>
              <Users size={14} color={colors.text.tertiary} />
              <Text style={styles.detailText}>Max {campaign.max_participants} participants</Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background.card,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border.light,
    overflow: 'hidden',
  },
  cardPressed: {
    opacity: 0.8,
  },
  coverImage: {
    width: '100%',
    height: 120,
    backgroundColor: colors.border.light,
  },
  coverPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primary.light + '30',
  },
  placeholderText: {
    fontFamily: typography.fonts.semiBold,
    color: colors.primary.default,
  },
  content: {
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  typeBadge: {
    backgroundColor: colors.primary.light + '40',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeText: {
    fontFamily: typography.fonts.semiBold,
    fontSize: 10,
    color: colors.primary.default,
  },
  statusText: {
    fontFamily: typography.fonts.bold,
    fontSize: 10,
    color: colors.text.tertiary,
  },
  title: {
    fontFamily: typography.fonts.bold,
    fontSize: typography.sizes.md,
    color: colors.text.primary,
    marginBottom: 12,
  },
  details: {
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    marginLeft: 6,
    flex: 1,
  },
});
