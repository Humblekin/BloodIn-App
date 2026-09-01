// Project LifeOrbit — Password Reset Screen
import React, { useState } from 'react';
import { View, Text, StyleSheet, Keyboard, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Mail, ArrowLeft } from 'lucide-react-native';

import { Screen } from '../../components/layout/Screen';
import { Header } from '../../components/layout/Header';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useAuthStore } from '../../features/auth/stores/authStore';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import { Spacing } from '../../constants/spacing';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { resetPassword, isLoading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleReset = async () => {
    Keyboard.dismiss();
    setError(null);
    
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    const result = await resetPassword(email);
    
    if (result.error) {
      setError(result.error.message);
    } else {
      setIsSent(true);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <Header showBack transparent />
      <Screen padding keyboardAvoiding>
          <View style={styles.header}>
            <Text style={styles.title}>Reset Password</Text>
            <Text style={styles.subtitle}>
              {isSent 
                ? "We've sent you an email with a link to reset your password."
                : "Enter your email address and we'll send you a link to reset your password."}
            </Text>
          </View>

          {!isSent ? (
            <View style={styles.form}>
              <Input
                label="Email"
                placeholder="name@example.com"
                autoCapitalize="none"
                keyboardType="email-address"
                leftIcon={<Mail size={20} color={Colors.dark.tertiary} />}
                value={email}
                onChangeText={setEmail}
                error={error || undefined}
              />

              <Button
                title="Send Reset Link"
                onPress={handleReset}
                size="lg"
                fullWidth
                isLoading={isLoading}
                style={styles.submitButton}
              />
            </View>
          ) : (
            <View style={styles.successState}>
              <Button
                title="Back to Login"
                onPress={() => router.replace('/(auth)/login')}
                size="lg"
                fullWidth
                variant="outline"
              />
            </View>
          )}
        </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    marginTop: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  title: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['2xl'],
    color: Colors.dark.DEFAULT,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
    color: Colors.dark.secondary,
    lineHeight: 22,
  },
  form: {
    gap: Spacing.lg,
  },
  submitButton: {
    marginTop: Spacing.md,
  },
  successState: {
    marginTop: Spacing.xl,
  },
});
