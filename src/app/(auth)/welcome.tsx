// Project LifeOrbit — Welcome Screen
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '../../components/layout/Screen';
import { Button } from '../../components/ui/Button';
import { HeroArtwork } from '../../components/ui/HeroArtwork';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize, LineHeight } from '../../constants/typography';
import { Spacing } from '../../constants/spacing';
import { Branding } from '../../constants/branding';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <Screen padding safeArea="bottom">
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={styles.artworkContainer}>
            <HeroArtwork size={220} />
          </View>

          <Text style={styles.appName}>{Branding.appName}</Text>
          <Text style={styles.description}>{Branding.appDescription}</Text>
        </View>

        <View style={styles.footer}>
          <Button
            title="Create an account"
            onPress={() => router.push('/(auth)/register')}
            size="lg"
            fullWidth
            style={styles.button}
          />
          <Button
            title="Log in"
            onPress={() => router.push('/(auth)/login')}
            variant="outline"
            size="lg"
            fullWidth
            style={styles.button}
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  artworkContainer: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  appName: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['2xl'],
    color: Colors.primary.DEFAULT,
  },
  description: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
    lineHeight: LineHeight.base,
    color: Colors.dark.secondary,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
  footer: {
    width: '100%',
    paddingTop: Spacing.xl,
    gap: Spacing.md,
  },
  button: {
    marginBottom: Spacing.xs,
  },
});
