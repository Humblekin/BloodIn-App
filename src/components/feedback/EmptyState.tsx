// Project LifeOrbit — Empty State Component
import React from 'react';
import { View, Text, StyleSheet, type ViewStyle, type StyleProp } from 'react-native';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize, LineHeight } from '../../constants/typography';
import { Spacing } from '../../constants/spacing';
import { Button, type ButtonProps } from '../ui/Button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onPress: () => void;
    variant?: ButtonProps['variant'];
  };
  style?: StyleProp<ViewStyle>;
}

export function EmptyState({ icon, title, description, action, style }: EmptyStateProps) {
  return (
    <View style={[styles.container, style]}>
      {icon && <View style={styles.iconContainer}>{icon}</View>}
      <Text style={styles.title}>{title}</Text>
      {description && <Text style={styles.description}>{description}</Text>}
      {action && (
        <Button
          title={action.label}
          onPress={action.onPress}
          variant={action.variant || 'primary'}
          style={styles.actionButton}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
    minHeight: 200,
  },
  iconContainer: {
    marginBottom: Spacing.md,
    opacity: 0.8,
  },
  title: {
    fontFamily: FontFamily.semibold,
    fontSize: FontSize.lg,
    color: Colors.dark.DEFAULT,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  description: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
    lineHeight: LineHeight.base,
    color: Colors.dark.secondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    maxWidth: 300,
  },
  actionButton: {
    marginTop: Spacing.sm,
    minWidth: 160,
  },
});
