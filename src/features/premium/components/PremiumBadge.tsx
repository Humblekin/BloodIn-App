import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Star } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { FontFamily, FontSize } from '@/constants/typography';
import { BorderRadius, Spacing } from '@/constants/spacing';

interface PremiumBadgeProps {
  size?: 'sm' | 'md';
}

export function PremiumBadge({ size = 'sm' }: PremiumBadgeProps) {
  if (size === 'sm') {
    return (
      <View style={styles.badgeSm}>
        <Star size={12} color={Colors.premium} fill={Colors.premium} />
      </View>
    );
  }

  return (
    <View style={styles.badgeMd}>
      <Star size={14} color={Colors.premium} fill={Colors.premium} />
      <Text style={styles.badgeText}>Premium</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badgeSm: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: `${Colors.premium}18`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeMd: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    backgroundColor: `${Colors.premium}18`,
  },
  badgeText: {
    fontFamily: FontFamily.semibold,
    fontSize: FontSize.xs,
    color: Colors.premium,
  },
});
