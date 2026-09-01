// Project LifeOrbit — Login Screen
import React, { useState } from 'react';
import { View, Text, StyleSheet, Keyboard, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, Lock } from 'lucide-react-native';

import { Screen } from '../../components/layout/Screen';
import { Header } from '../../components/layout/Header';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { HeroArtwork } from '../../components/ui/HeroArtwork';
import { signInSchema, type SignInFormData } from '../../utils/validation';
import { useAuthStore } from '../../features/auth/stores/authStore';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import { Spacing } from '../../constants/spacing';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, isLoading, error, clearError } = useAuthStore();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: SignInFormData) => {
    Keyboard.dismiss();
    clearError();
    const result = await signIn(data.email, data.password);
    
    if (result.error) {
      Alert.alert('Login Failed', result.error.message);
    } else {
      // The _layout will handle redirecting since the auth state changes
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <Header showBack transparent />
      <Screen scrollable padding keyboardAvoiding>
          <View style={styles.header}>
            <View style={styles.artworkContainer}>
              <HeroArtwork size={200} />
            </View>
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>Log in to your BloodIn account</Text>
          </View>

          <View style={styles.form}>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Email"
                  placeholder="name@example.com"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                  leftIcon={<Mail size={20} color={Colors.dark.tertiary} />}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.email?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Password"
                  placeholder="Enter your password"
                  secureTextEntry
                  autoComplete="password"
                  leftIcon={<Lock size={20} color={Colors.dark.tertiary} />}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.password?.message}
                />
              )}
            />

            {error && <Text style={styles.errorText}>{error}</Text>}

            <Button
              title="Forgot password?"
              variant="ghost"
              onPress={() => Alert.alert('Coming Soon', 'Password reset will be implemented in a future update.')}
              style={styles.forgotPassword}
              textStyle={styles.forgotPasswordText}
            />
          </View>

          <View style={styles.footer}>
            <Button
              title="Log in"
              onPress={handleSubmit(onSubmit)}
              size="lg"
              fullWidth
              isLoading={isLoading}
            />
          </View>
        </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    marginTop: Spacing.sm,
    marginBottom: Spacing['3xl'],
  },
  artworkContainer: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
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
  },
  form: {
    gap: Spacing.lg,
    marginBottom: Spacing['3xl'],
  },
  forgotPassword: {
    alignSelf: 'flex-start',
    paddingHorizontal: 0,
    marginTop: -Spacing.sm,
  },
  forgotPasswordText: {
    fontFamily: FontFamily.medium,
  },
  errorText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.semantic.critical.DEFAULT,
    marginTop: Spacing.sm,
  },
  footer: {
    marginTop: 'auto',
    marginBottom: Spacing.xl,
  },
});
