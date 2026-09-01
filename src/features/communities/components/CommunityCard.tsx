import React from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '@/constants/colors';
import { typography } from '@/constants/typography';
import { Users, ShieldCheck } from 'lucide-react-native';
import type { CommunityRow } from '../services/communityService';

interface CommunityCardProps {
  community: CommunityRow;
}

export function CommunityCard({ community }: CommunityCardProps) {
  const router = useRouter();

  return (
    <Pressable 
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => router.push(`/community/${community.id}`)}
    >
      <View style={styles.header}>
        {community.logo_url ? (
          <Image source={{ uri: community.logo_url }} style={styles.logo} />
        ) : (
          <View style={[styles.logo, styles.logoPlaceholder]}>
            <Text style={styles.initials}>{community.name.substring(0, 2).toUpperCase()}</Text>
          </View>
        )}
        <View style={styles.headerText}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>{community.name}</Text>
            {community.is_verified && (
              <ShieldCheck size={16} color={colors.primary.default} style={styles.badge} />
            )}
          </View>
          <Text style={styles.members}>
            <Users size={12} color={colors.text.tertiary} style={styles.icon} />
            {' '}{community.member_count} members
          </Text>
        </View>
      </View>
      {community.description && (
        <Text style={styles.description} numberOfLines={2}>
          {community.description}
        </Text>
      )}
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
    alignItems: 'center',
    marginBottom: 12,
  },
  logo: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  logoPlaceholder: {
    backgroundColor: colors.primary.light,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    fontFamily: typography.fonts.bold,
    fontSize: typography.sizes.md,
    color: colors.primary.default,
  },
  headerText: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  name: {
    fontFamily: typography.fonts.bold,
    fontSize: typography.sizes.md,
    color: colors.text.primary,
    flexShrink: 1,
  },
  badge: {
    marginLeft: 6,
  },
  members: {
    fontFamily: typography.fonts.medium,
    fontSize: typography.sizes.xs,
    color: colors.text.tertiary,
    marginTop: 4,
  },
  icon: {
    top: 2,
  },
  description: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    lineHeight: 20,
  },
});
