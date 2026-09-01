import React from 'react';
import { View, Text, StyleSheet, FlatList, Image } from 'react-native';
import { colors } from '@/constants/colors';
import { typography } from '@/constants/typography';
import type { CommunityMemberRow } from '../services/communityService';

interface MemberListProps {
  members: CommunityMemberRow[];
}

export function MemberList({ members }: MemberListProps) {
  const renderItem = ({ item }: { item: CommunityMemberRow }) => (
    <View style={styles.memberRow}>
      {item.profile?.avatar_url ? (
        <Image source={{ uri: item.profile.avatar_url }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarPlaceholder]} />
      )}
      <View style={styles.memberInfo}>
        <Text style={styles.memberName}>{item.profile?.display_name || 'Anonymous'}</Text>
        <Text style={styles.memberRole}>
          {item.role.charAt(0).toUpperCase() + item.role.slice(1)}
        </Text>
      </View>
    </View>
  );

  return (
    <FlatList
      data={members}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      scrollEnabled={false}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
    />
  );
}

const styles = StyleSheet.create({
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  avatarPlaceholder: {
    backgroundColor: colors.border.default,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontFamily: typography.fonts.medium,
    fontSize: typography.sizes.md,
    color: colors.text.primary,
  },
  memberRole: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.sizes.xs,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border.light,
  },
});
