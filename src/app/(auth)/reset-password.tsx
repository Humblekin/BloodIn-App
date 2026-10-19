// Project LifeOrbit — Password Reset Screen
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Keyboard } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Lock, Mail } from 'lucide-react-native';

import { Screen } from '../../components/layout/Screen';
import { Header } from '../../components/layout/Header';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useAuthStore } from '../../features/auth/stores/authStore';
import { describeAuthCallbackError } from '../../features/auth/authCallback';
import { passwordSchema, resetPasswordSchema } from '../../utils/validation';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import { Spacing } from '../../constants/spacing';

const firstParam = (value?: string | string[]) =>
  Array.isArray(value) ? value[0] : value;

export default function ResetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    email?: string;
    error_message?: string;
    error_code?: string;
    error_description?: string;
  }>();
  const { resetPassword, updatePassword, isLoading, session } = useAuthStore();

  const initialEmail = firstParam(params.email);
  // Link failures arrive either as a prepared sentence (from the root layout)
  // or as raw Supabase error params on the callback URL.
  const linkError =
    firstParam(params.error_message) ??
    (firstParam(params.error_code) || firstParam(params.error_description)
      ? describeAuthCallbackError(
          firstParam(params.error_code),
          firstParam(params.error_description)
        )
      : null);

  const [email, setEmail] = useState(typeof initialEmail === 'string' ? initialEmail : '');
  const [isSent, setIsSent] = useState(false);
  const [isUpdated, setIsUpdated] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (linkError) setError(linkError);
  }, [linkError]);

  const handleSendReset = async () => {
    Keyboard.dismiss();
    setError(null);

    const parsedEmail = resetPasswordSchema.safeParse({ email: email.trim() });
    if (!parsedEmail.success) {
      setError(parsedEmail.error.issues[0]?.message || 'Please enter a valid email address.');
      return;
    }

    const result = await resetPassword(parsedEmail.data.email);
    if (result.error) {
      setError(result.error.message);
    } else {
      setIsSent(true);
    }
  };

  const handleUpdatePassword = async () => {
    Keyboard.dismiss();
    setError(null);

    const parsedPassword = passwordSchema.safeParse(password);
    if (!parsedPassword.success) {
      setError(parsedPassword.error.issues[0]?.message || 'Please choose a stronger password.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    const result = await updatePassword(password);
    if (result.error) {
      setError(result.error.message);
    } else {
      setIsUpdated(true);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <Header showBack transparent />
      <Screen padding keyboardAvoiding>
        <View style={styles.header}>
          <Text style={styles.title}>
            {isUpdated ? 'Password Updated' : session?.user ? 'Choose a New Password' : 'Reset Password'}
          </Text>
          <Text style={styles.subtitle}>
            {isUpdated
              ? 'Your password has been changed. You can continue into BloodIn.'
              : session?.user
                ? 'Choose a strong password for your BloodIn account.'
                : isSent
                  ? 'Check your inbox for a secure link. It will return here so you can choose a new password.'
                  : "Enter your email address and we'll send you a secure reset link."}
          </Text>
        </View>

        {isUpdated ? (
          <View style={styles.successState}>
            <Button
              title="Continue to BloodIn"
              onPress={() => router.replace('/(main)/(tabs)')}
              size="lg"
              fullWidth
            />
          </View>
        ) : session?.user ? (
          <View style={styles.form}>
            <Input
              label="New password"
              placeholder="Enter a new password"
              secureTextEntry
              autoComplete="new-password"
              returnKeyType="next"
              leftIcon={<Lock size={20} color={Colors.dark.tertiary} />}
              value={password}
              onChangeText={setPassword}
            />
            <Input
              label="Confirm new password"
              placeholder="Enter the password again"
              secureTextEntry
              autoComplete="new-password"
              returnKeyType="go"
              onSubmitEditing={handleUpdatePassword}
              leftIcon={<Lock size={20} color={Colors.dark.tertiary} />}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              error={error || undefined}
            />
            <Button
              title="Update Password"
              onPress={handleUpdatePassword}
              size="lg"
              fullWidth
              isLoading={isLoading}
              style={styles.submitButton}
            />
          </View>
        ) : isSent ? (
          <View style={styles.successState}>
            <Button
              title="Send Another Link"
              onPress={() => setIsSent(false)}
              size="lg"
              fullWidth
              variant="outline"
            />
            <Button
              title="Back to Login"
              onPress={() => router.replace('/(auth)/login')}
              size="lg"
              fullWidth
            />
          </View>
        ) : (
          <View style={styles.form}>
            <Input
              label="Email"
              placeholder="name@example.com"
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              returnKeyType="send"
              onSubmitEditing={handleSendReset}
              leftIcon={<Mail size={20} color={Colors.dark.tertiary} />}
              value={email}
              onChangeText={setEmail}
              error={error || undefined}
            />
            <Button
              title="Send Reset Link"
              onPress={handleSendReset}
              size="lg"
              fullWidth
              isLoading={isLoading}
              style={styles.submitButton}
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
    gap: Spacing.md,
  },
});
