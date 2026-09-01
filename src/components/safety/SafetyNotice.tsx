// Project LifeOrbit — Safety Notice Component
// Renders the mandatory medical safety disclaimers required by the spec.

import React from 'react';
import { View, Text, StyleSheet, type ViewStyle, type StyleProp } from 'react-native';
import { AlertCircle, ShieldAlert, Info } from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize, LineHeight } from '../../constants/typography';
import { BorderRadius, Spacing } from '../../constants/spacing';
import { SafetyTexts } from '../../constants/safety';

export type SafetyNoticeVariant = 'critical' | 'warning' | 'info';

export interface SafetyNoticeProps {
  type: keyof typeof SafetyTexts | 'custom';
  customTitle?: string;
  customBody?: string;
  variant?: SafetyNoticeVariant;
  style?: StyleProp<ViewStyle>;
}

export function SafetyNotice({
  type,
  customTitle,
  customBody,
  variant = 'warning',
  style,
}: SafetyNoticeProps) {
  let title = customTitle || '';
  let body = customBody || '';

  // Extract from constants if not custom
  if (type !== 'custom') {
    const textData = SafetyTexts[type as keyof typeof SafetyTexts];
    if (typeof textData === 'string') {
      body = textData;
    } else if (textData && typeof textData === 'object' && 'title' in textData) {
      title = textData.title;
      body = textData.body;
    }
  }

  const getIcon = () => {
    const size = 20;
    switch (variant) {
      case 'critical':
        return <ShieldAlert size={size} color={Colors.semantic.critical.DEFAULT} />;
      case 'warning':
        return <AlertCircle size={size} color={Colors.semantic.warning.DEFAULT} />;
      case 'info':
        return <Info size={size} color={Colors.semantic.info.DEFAULT} />;
    }
  };

  return (
    <View style={[styles.container, styles[`variant_${variant}`], style]}>
      <View style={styles.iconContainer}>{getIcon()}</View>
      <View style={styles.textContainer}>
        {title ? <Text style={[styles.title, styles[`text_${variant}`]]}>{title}</Text> : null}
        <Text style={[styles.body, styles[`text_${variant}`]]}>{body}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  iconContainer: {
    marginRight: Spacing.sm,
    marginTop: 2,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontFamily: FontFamily.semibold,
    fontSize: FontSize.sm,
    marginBottom: Spacing['2xs'],
  },
  body: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    lineHeight: LineHeight.sm,
  },

  // Variants
  variant_critical: {
    backgroundColor: Colors.semantic.critical.light,
    borderColor: Colors.semantic.critical.DEFAULT,
  },
  text_critical: {
    color: Colors.semantic.critical.dark,
  },

  variant_warning: {
    backgroundColor: Colors.semantic.warning.light,
    borderColor: Colors.semantic.warning.DEFAULT,
  },
  text_warning: {
    color: Colors.semantic.warning.dark,
  },

  variant_info: {
    backgroundColor: Colors.semantic.info.light,
    borderColor: Colors.semantic.info.DEFAULT,
  },
  text_info: {
    color: Colors.semantic.info.dark,
  },
});
