// Project LifeOrbit — Register Screen
import React, { useState } from 'react';
import { View, Text, StyleSheet, Keyboard, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, Lock, User } from 'lucide-react-native';

import { Screen } from '../../components/layout/Screen';
import { Header } from '../../components/layout/Header';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { SafetyNotice } from '../../components/safety/SafetyNotice';
import { signUpSchema, type SignUpFormData } from '../../utils/validation';
import { useAuthStore } from '../../features/auth/stores/authStore';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import { Spacing } from '../../constants/spacing';
import { Checkbox } from 'expo-checkbox'; // Need to install this or build custom

// We'll build a simple custom checkbox since expo-checkbox isn't installed yet
const CustomCheckbox = ({ value, onValueChange, label, error }: any) => (
  <View style={checkboxStyles.container}>
    <Pressable onPress={() => onValueChange(!value)}>
      <View style={checkboxStyles.row}>
        <View style={[checkboxStyles.box, value && checkboxStyles.boxChecked, error && checkboxStyles.boxError]}>
          {value && <View style={checkboxStyles.check} />}
        </View>
        <Text style={checkboxStyles.label}>{label}</Text>
      </View>
    </Pressable>
    {error && <Text style={checkboxStyles.errorText}>{error}</Text>}
  </View>
);

const checkboxStyles = StyleSheet.create({
  container: { gap: 4 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  box: { width: 20, height: 20, borderWidth: 1, borderColor: Colors.border.dark, borderRadius: 4, justifyContent: 'center', alignItems: 'center' },
  boxChecked: { backgroundColor: Colors.primary.DEFAULT, borderColor: Colors.primary.DEFAULT },
  boxError: { borderColor: Colors.semantic.critical.DEFAULT },
  check: { width: 10, height: 10, backgroundColor: Colors.white, borderRadius: 2 },
  label: { flex: 1, fontFamily: FontFamily.regular, fontSize: FontSize.sm, color: Colors.dark.secondary },
  errorText: { fontFamily: FontFamily.regular, fontSize: FontSize.xs, color: Colors.semantic.critical.DEFAULT, marginLeft: 32 },
});


export default function RegisterScreen() {
  const router = useRouter();
  const { signUp, isLoading, error, clearError } = useAuthStore();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      displayName: '',
      email: '',
      password: '',
      confirmPassword: '',
      accountType: 'individual',
      safetyAcknowledged: false as true, // Type cast for default
    },
  });

  const onSubmit = async (data: SignUpFormData) => {
    Keyboard.dismiss();
    clearError();
    const result = await signUp(data.email, data.password, data.displayName);
    
    if (result.error) {
      Alert.alert('Registration Failed', result.error.message);
    } else {
      // Typically we might redirect to a 'verify email' screen, 
      // but if auto-confirm is enabled or they are logged in, layout will handle it.
      Alert.alert(
        'Registration Successful',
        'Please check your email to verify your account if required.',
        [{ text: 'OK', onPress: () => router.replace('/(auth)/login') }]
      );
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <Header showBack transparent />
      <Screen scrollable padding keyboardAvoiding>
          <View style={styles.header}>
            <Text style={styles.title}>Create an account</Text>
            <Text style={styles.subtitle}>Join the BloodIn network</Text>
          </View>

          <View style={styles.form}>
            <Controller
              control={control}
              name="displayName"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Full Name / Display Name"
                  placeholder="John Doe"
                  autoCapitalize="words"
                  autoComplete="name"
                  leftIcon={<User size={20} color={Colors.dark.tertiary} />}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.displayName?.message}
                />
              )}
            />

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
                  placeholder="Create a strong password"
                  secureTextEntry
                  autoComplete="new-password"
                  leftIcon={<Lock size={20} color={Colors.dark.tertiary} />}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.password?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="confirmPassword"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Confirm Password"
                  placeholder="Repeat your password"
                  secureTextEntry
                  autoComplete="new-password"
                  leftIcon={<Lock size={20} color={Colors.dark.tertiary} />}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.confirmPassword?.message}
                />
              )}
            />

            <View style={styles.safetySection}>
              <SafetyNotice type="registration" />
              
              <Controller
                control={control}
                name="safetyAcknowledged"
                render={({ field: { onChange, value } }) => (
                  <CustomCheckbox
                    value={value}
                    onValueChange={onChange}
                    label="I understand that BloodIn is a connection platform and does not provide medical services."
                    error={errors.safetyAcknowledged?.message}
                  />
                )}
              />
            </View>

            {error && <Text style={styles.errorText}>{error}</Text>}
          </View>

          <View style={styles.footer}>
            <Button
              title="Sign up"
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
  },
  form: {
    gap: Spacing.lg,
    marginBottom: Spacing['3xl'],
  },
  safetySection: {
    marginTop: Spacing.md,
    gap: Spacing.lg,
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
