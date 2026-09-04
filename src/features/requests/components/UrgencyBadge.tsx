import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/constants/colors';
import { typography } from '@/constants/typography';

interface UrgencyBadgeProps {
  level: number;
}

export function UrgencyBadge({ level }: UrgencyBadgeProps) {
  let label = 'Normal';
  let backgroundColor = colors.status.success + '20'; // 20% opacity
  let textColor: string = colors.status.success;

  if (level === 2) {
    label = 'Urgent';
    backgroundColor = colors.status.warning + '20';
    textColor = colors.status.warning;
  } else if (level === 3) {
    label = 'Critical';
    backgroundColor = colors.status.error + '20';
    textColor = colors.status.error;
  }

  return (
    <View style={[styles.badge, { backgroundColor }]}>
      <Text style={[styles.text, { color: textColor }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  text: {
    fontFamily: typography.fonts.semiBold,
    fontSize: typography.sizes.xs,
  },
});
