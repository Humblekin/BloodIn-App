// Project LifeOrbit — Screen Layout Component
import React from 'react';
import {
  View,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { ScreenPadding } from '../../constants/spacing';

export interface ScreenProps {
  children: React.ReactNode;
  scrollable?: boolean;
  safeArea?: boolean | 'top' | 'bottom';
  backgroundColor?: string;
  padding?: boolean;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  keyboardAvoiding?: boolean;
}

export function Screen({
  children,
  scrollable = false,
  safeArea = true,
  backgroundColor = Colors.background.DEFAULT,
  padding = true,
  style,
  contentContainerStyle,
  keyboardAvoiding = true,
}: ScreenProps) {
  const insets = useSafeAreaInsets();

  const getPaddingStyle = () => {
    let style: ViewStyle = {};
    if (padding) {
      style.paddingHorizontal = ScreenPadding.horizontal;
    }
    if (safeArea === 'top') {
      style.paddingTop = insets.top + (padding ? ScreenPadding.vertical : 0);
    } else if (safeArea === 'bottom') {
      style.paddingBottom = insets.bottom + (padding ? ScreenPadding.vertical : 0);
    } else if (safeArea === true) {
      style.paddingTop = insets.top + (padding ? ScreenPadding.vertical : 0);
      style.paddingBottom = insets.bottom + (padding ? ScreenPadding.vertical : 0);
    } else if (padding) {
      style.paddingTop = ScreenPadding.vertical;
      style.paddingBottom = ScreenPadding.vertical;
    }
    return style;
  };

  const Wrapper = safeArea === true && !scrollable ? SafeAreaView : View;
  
  const content = scrollable ? (
    <ScrollView
      style={[styles.container, { backgroundColor }, style]}
      contentContainerStyle={[getPaddingStyle(), contentContainerStyle]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <Wrapper style={[styles.container, { backgroundColor }, getPaddingStyle(), style]}>
      {children}
    </Wrapper>
  );

  if (keyboardAvoiding) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {content}
      </KeyboardAvoidingView>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
