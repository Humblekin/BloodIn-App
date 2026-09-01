import React from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '@/constants/colors';
import { typography } from '@/constants/typography';
import { UrgencyBadge } from './UrgencyBadge';
import { MapPin, Clock } from 'lucide-react-native';
import type { BloodRequestRow } from '../services/requestService';

interface RequestCardProps {
  request: BloodRequestRow;
}

export function RequestCard({ request }: RequestCardProps) {
  const router = useRouter();

  const handlePress = () => {
    router.push(`/requests/${request.id}`);
  };

  const isExpired = new Date(request.expires_at) < new Date();
  const timeRemaining = isExpired 
    ? 'Expired' 
    : 'Expires soon'; // In a real app, calculate relative time (e.g. "2 hours left")

  return (
    <Pressable 
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]} 
      onPress={handlePress}
    >
      <View style={styles.header}>
        <View style={styles.requesterInfo}>
          {request.requester_profile?.avatar_url ? (
            <Image source={{ uri: request.requester_profile.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]} />
          )}
          <Text style={styles.requesterName} numberOfLines={1}>
            {request.requester_profile?.display_name || 'Anonymous'}
          </Text>
        </View>
        <UrgencyBadge level={request.urgency_level} />
      </View>

      <View style={styles.mainContent}>
        <View style={styles.bloodGroupContainer}>
          <Text style={styles.bloodGroup}>{request.blood_group}</Text>
          <Text style={styles.units}>{request.units_required} {request.units_required === 1 ? 'Unit' : 'Units'}</Text>
        </View>
        
        <View style={styles.details}>
          <View style={styles.detailRow}>
            <MapPin size={16} color={colors.text.secondary} />
            <Text style={styles.detailText} numberOfLines={1}>{request.hospital_name}</Text>
          </View>
          <View style={styles.detailRow}>
            <Clock size={16} color={colors.text.secondary} />
            <Text style={styles.detailText}>{timeRemaining}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  cardPressed: {
    opacity: 0.7,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  requesterInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  avatarPlaceholder: {
    backgroundColor: colors.border.default,
  },
  requesterName: {
    fontFamily: typography.fonts.medium,
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    flex: 1,
  },
  mainContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bloodGroupContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary.light,
    padding: 12,
    borderRadius: 12,
    marginRight: 16,
    minWidth: 70,
  },
  bloodGroup: {
    fontFamily: typography.fonts.bold,
    fontSize: typography.sizes.xl,
    color: colors.primary.default,
  },
  units: {
    fontFamily: typography.fonts.medium,
    fontSize: typography.sizes.xs,
    color: colors.primary.default,
    marginTop: 4,
  },
  details: {
    flex: 1,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.sizes.sm,
    color: colors.text.primary,
    marginLeft: 8,
    flex: 1,
  },
});
