import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { colors } from '@/constants/colors';
import { typography } from '@/constants/typography';
import type { AnnouncementRow } from '../services/communityService';

interface AnnouncementCardProps {
  announcement: AnnouncementRow;
}

export function AnnouncementCard({ announcement }: AnnouncementCardProps) {
  return (
    <View style={[styles.card, announcement.is_pinned && styles.pinnedCard]}>
      {announcement.is_pinned && (
        <View style={styles.pinnedBadge}>
          <Text style={styles.pinnedText}>PINNED</Text>
        </View>
      )}
      
      <Text style={styles.title}>{announcement.title}</Text>
      <Text style={styles.content}>{announcement.content}</Text>
      
      <View style={styles.footer}>
        <View style={styles.authorInfo}>
          {announcement.author_profile?.avatar_url ? (
            <Image source={{ uri: announcement.author_profile.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]} />
          )}
          <Text style={styles.authorName}>
            {announcement.author_profile?.display_name || 'Admin'}
          </Text>
        </View>
        <Text style={styles.date}>
          {new Date(announcement.created_at).toLocaleDateString()}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  pinnedCard: {
    borderColor: colors.primary.default + '50',
    backgroundColor: colors.primary.light + '10',
  },
  pinnedBadge: {
    backgroundColor: colors.primary.default,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 12,
  },
  pinnedText: {
    fontFamily: typography.fonts.bold,
    fontSize: 10,
    color: colors.text.inverse,
  },
  title: {
    fontFamily: typography.fonts.semiBold,
    fontSize: typography.sizes.md,
    color: colors.text.primary,
    marginBottom: 8,
  },
  content: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    paddingTop: 12,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 8,
  },
  avatarPlaceholder: {
    backgroundColor: colors.border.default,
  },
  authorName: {
    fontFamily: typography.fonts.medium,
    fontSize: typography.sizes.xs,
    color: colors.text.secondary,
  },
  date: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.sizes.xs,
    color: colors.text.tertiary,
  },
});
