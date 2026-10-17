import React, { useState } from 'react';
import { View, Text, StyleSheet, Keyboard, Alert, ScrollView, TouchableOpacity } from 'react-native';
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
import { locationService } from '../../features/location/services/locationService';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import { Spacing } from '../../constants/spacing';
import { BLOOD_GROUPS } from '../../constants/bloodGroups';

export default function SetupProfileScreen() {
  const router = useRouter();
  const { updateProfile, isLoading, user } = useAuthStore();
  const [selectedLocation, setSelectedLocation] = useState<{
    latitude: number;
    longitude: number;
    name: string;
    countryId?: number;
    regionId?: number;
    cityId?: number;
  } | null>(null);

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
      donationWillingness: 'unspecified',
      countryId: null,
      regionId: null,
      cityId: null,
    },
  });

  const selectedBloodGroup = watch('bloodGroup');
  const selectedWillingness = watch('donationWillingness');

  const onSubmit = async (data: ProfileSetupFormData) => {
    Keyboard.dismiss();
    const result = await updateProfile({
      display_name: data.displayName,
      bio: data.bio,
      blood_group: data.bloodGroup,
      donation_willingness: data.donationWillingness,
    });
    
    if (result.error) {
      Alert.alert('Update Failed', result.error);
      return;
    }

    if (selectedLocation && user) {
      try {
        await locationService.updateUserLocation(user.id, selectedLocation);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Location could not be saved';
        Alert.alert('Location Update Failed', message);
        return;
      }
    }

    router.replace('/(main)/(tabs)');
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
                customBody="Adding your blood group helps relevant people find you and connect for help. It does not certify medical eligibility." 
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

            {/* Donation Willingness Preference */}
            <View style={styles.willingnessSection}>
              <Text style={styles.sectionLabel}>Blood Donation Willingness</Text>
              <Text style={styles.helperText}>
                Are you willing to be contacted about donating blood?
              </Text>
              <View style={styles.willingnessOptions}>
                {[
                  { id: 'willing', label: 'Yes, I am willing' },
                  { id: 'not_willing', label: 'No, I am not willing' },
                  { id: 'unspecified', label: 'Prefer not to decide yet' },
                ].map((opt) => (
                  <TouchableOpacity
                    key={opt.id}
                    style={[
                      styles.willingnessOption,
                      selectedWillingness === opt.id && styles.willingnessOptionActive,
                    ]}
                    onPress={() => setValue('donationWillingness', opt.id as any)}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.radioCircle,
                        selectedWillingness === opt.id && styles.radioCircleActive,
                      ]}
                    >
                      {selectedWillingness === opt.id && <View style={styles.radioDot} />}
                    </View>
                    <Text
                      style={[
                        styles.willingnessOptionText,
                        selectedWillingness === opt.id && styles.willingnessOptionTextActive,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
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
                     currentLocationName={selectedLocation?.name}
                     onLocationSelect={(loc) => {
                       setSelectedLocation(loc);
                       onChange(null);
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
              onPress={() => router.replace('/(main)/(tabs)')}
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
  willingnessSection: {
    marginTop: Spacing.sm,
  },
  helperText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.dark.tertiary,
    marginBottom: Spacing.sm,
  },
  willingnessOptions: {
    gap: Spacing.xs,
  },
  willingnessOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border.DEFAULT,
    backgroundColor: Colors.surface.DEFAULT,
  },
  willingnessOptionActive: {
    borderColor: Colors.primary.DEFAULT,
    backgroundColor: 'rgba(122, 31, 43, 0.04)',
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: Colors.dark.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleActive: {
    borderColor: Colors.primary.DEFAULT,
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary.DEFAULT,
  },
  willingnessOptionText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.dark.DEFAULT,
  },
  willingnessOptionTextActive: {
    fontFamily: FontFamily.semibold,
    color: Colors.primary.DEFAULT,
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
