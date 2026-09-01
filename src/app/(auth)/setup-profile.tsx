// Project LifeOrbit — Setup Profile Screen
import React from 'react';
import { View, Text, StyleSheet, Keyboard, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { User, FileText, Droplet } from 'lucide-react-native';

import { Screen } from '../../components/layout/Screen';
import { Header } from '../../components/layout/Header';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { SafetyNotice } from '../../components/safety/SafetyNotice';
import { LocationPicker } from '../../components/location/LocationPicker';
import { profileSetupSchema, type ProfileSetupFormData } from '../../utils/validation';
import { useAuthStore } from '../../features/auth/stores/authStore';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import { Spacing } from '../../constants/spacing';
import { BLOOD_GROUPS } from '../../constants/bloodGroups';

export default function SetupProfileScreen() {
  const router = useRouter();
  const { updateProfile, isLoading, user } = useAuthStore();

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProfileSetupFormData>({
    resolver: zodResolver(profileSetupSchema),
    defaultValues: {
      displayName: user?.user_metadata?.display_name || '',
      bio: '',
      bloodGroup: null,
      countryId: null,
      regionId: null,
      cityId: null,
    },
  });

  const selectedBloodGroup = watch('bloodGroup');

  const onSubmit = async (data: ProfileSetupFormData) => {
    Keyboard.dismiss();
    const result = await updateProfile({
      display_name: data.displayName,
      bio: data.bio,
      blood_group: data.bloodGroup,
    });
    
    if (result.error) {
      Alert.alert('Update Failed', result.error);
    } else {
      router.replace('/(main)/(tabs)/home');
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <Header title="Setup Profile" />
      <Screen scrollable padding keyboardAvoiding>
          <View style={styles.header}>
            <Text style={styles.title}>Complete your profile</Text>
            <Text style={styles.subtitle}>Help others know you better</Text>
          </View>

          <View style={styles.form}>
            <Controller
              control={control}
              name="displayName"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Display Name"
                  placeholder="Your full name or alias"
                  autoCapitalize="words"
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
              name="bio"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Bio (Optional)"
                  placeholder="Tell us a bit about yourself"
                  multiline
                  numberOfLines={3}
                  leftIcon={<FileText size={20} color={Colors.dark.tertiary} />}
                  value={value || ''}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.bio?.message}
                  style={{ minHeight: 80, paddingTop: 12 }}
                />
              )}
            />

            <View style={styles.bloodGroupSection}>
              <Text style={styles.sectionLabel}>Blood Group (Optional)</Text>
              <SafetyNotice 
                type="custom" 
                variant="info" 
                customBody="Adding your blood group helps others find you when they need specific donors. It does not certify medical eligibility." 
                style={{ marginBottom: Spacing.md }}
              />
              <View style={styles.bloodGrid}>
                {BLOOD_GROUPS.map((bg) => (
                  <Button
                    key={bg}
                    title={bg}
                    variant={selectedBloodGroup === bg ? 'primary' : 'outline'}
                    size="sm"
                    style={[styles.bloodButton, selectedBloodGroup === bg && styles.bloodButtonActive]}
                    onPress={() => setValue('bloodGroup', bg === selectedBloodGroup ? null : bg)}
                  />
                ))}
              </View>
            </View>

            <View style={styles.locationSection}>
               <Text style={styles.sectionLabel}>Location</Text>
               <Controller
                 control={control}
                 name="cityId"
                 render={({ field: { onChange, value } }) => (
                   <LocationPicker
                     currentLocationName={value ? 'Location Selected' : undefined}
                     onLocationSelect={(loc) => {
                       // In real app we map loc.name to cityId/regionId
                       onChange(loc.name);
                     }}
                   />
                 )}
               />
            </View>

          </View>

          <View style={styles.footer}>
            <Button
              title="Save & Continue"
              onPress={handleSubmit(onSubmit)}
              size="lg"
              fullWidth
              isLoading={isLoading}
            />
            <Button
              title="Skip for now"
              onPress={() => router.replace('/(main)/(tabs)/home')}
              variant="ghost"
              size="lg"
              fullWidth
              style={{ marginTop: Spacing.sm }}
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
  sectionLabel: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.dark.secondary,
    marginBottom: Spacing.sm,
  },
  bloodGroupSection: {
    marginTop: Spacing.sm,
  },
  bloodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  bloodButton: {
    width: '23%', // roughly 4 per row
  },
  bloodButtonActive: {
    borderColor: Colors.primary.DEFAULT,
  },
  locationSection: {
    marginTop: Spacing.sm,
  },
  placeholderText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.dark.tertiary,
    fontStyle: 'italic',
  },
  footer: {
    marginTop: 'auto',
    marginBottom: Spacing.xl,
  },
});
