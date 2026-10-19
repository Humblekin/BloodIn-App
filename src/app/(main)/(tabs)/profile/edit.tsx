import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Keyboard, Alert, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as ImagePicker from 'expo-image-picker';
import { User, FileText, Camera } from 'lucide-react-native';

import { Screen } from '@/components/layout/Screen';
import { Header } from '@/components/layout/Header';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { LocationPicker } from '@/components/location/LocationPicker';
import { profileSetupSchema, type ProfileSetupFormData } from '@/utils/validation';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { profileService } from '@/features/profiles/services/profileService';
import { locationService } from '@/features/location/services/locationService';
import { Colors } from '@/constants/colors';
import { FontFamily, FontSize } from '@/constants/typography';
import { Spacing } from '@/constants/spacing';
import { BLOOD_GROUPS } from '@/constants/bloodGroups';

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, profile, updateProfile, fetchProfile, isLoading } = useAuthStore();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile?.avatar_url ?? null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
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
    reset,
    formState: { errors },
  } = useForm<ProfileSetupFormData>({
    resolver: zodResolver(profileSetupSchema),
    defaultValues: {
      displayName: profile?.display_name || '',
      bio: profile?.bio || '',
      bloodGroup: profile?.blood_group || null,
      donationWillingness: (profile?.donation_willingness as any) || 'unspecified',
    },
  });

  // Keep the form in sync if the profile is still loading when this screen opens
  useEffect(() => {
    if (!profile) return;
    reset({
      displayName: profile.display_name || '',
      bio: profile.bio || '',
      bloodGroup: profile.blood_group || null,
      donationWillingness: (profile.donation_willingness as any) || 'unspecified',
    });
    setAvatarUrl(profile.avatar_url ?? null);
  }, [profile?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedBloodGroup = watch('bloodGroup');
  const selectedWillingness = watch('donationWillingness');

  const handlePickPhoto = async () => {
    if (!user) return;

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Enable photo access to change your avatar.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (result.canceled || result.assets.length === 0) return;

    setUploadingPhoto(true);
    try {
      const url = await profileService.updateAvatar(user.id, result.assets[0].uri);
      setAvatarUrl(url);
      await fetchProfile();
      Alert.alert('Photo updated', 'Your profile photo has been updated.');
    } catch (err) {
      console.error('[EditProfile] Avatar upload failed:', err);
      const message = err && typeof err === 'object' && 'message' in err ? String((err as { message: unknown }).message) : String(err);
      Alert.alert('Upload failed', `Could not update photo: ${message}`);
    } finally {
      setUploadingPhoto(false);
    }
  };

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
        await locationService.updateUserLocation(user.id, selectedLocation, { updateHome: true });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Location could not be saved';
        Alert.alert('Location Update Failed', message);
        return;
      }
    }

    router.back();
  };

  return (
    <View style={{ flex: 1 }}>
      <Header title="Edit Profile" showBack variant="brand" />
        <Screen scrollable padding keyboardAvoiding>
          <View style={styles.form}>
            <View style={styles.avatarSection}>
              <View>
                <Avatar name={profile?.display_name} url={avatarUrl} size="xl" />
                <View style={styles.cameraBadge}>
                  <Camera size={16} color={Colors.white} />
                </View>
              </View>
              <Button
                title={uploadingPhoto ? 'Uploading...' : 'Change Photo'}
                variant="ghost"
                size="sm"
                style={{ marginTop: Spacing.sm }}
                isLoading={uploadingPhoto}
                onPress={handlePickPhoto}
              />
            </View>

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
                  label="Bio"
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
              <Text style={styles.sectionLabel}>Blood Group</Text>
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
              <LocationPicker
                currentLocationName={selectedLocation?.name}
                onLocationSelect={setSelectedLocation}
              />
            </View>

            <View style={styles.footer}>
              <Button
                title="Save Changes"
                onPress={handleSubmit(onSubmit)}
                size="lg"
                fullWidth
                isLoading={isLoading}
              />
            </View>
          </View>
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing['3xl'],
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.primary.DEFAULT,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.background.DEFAULT,
  },
  sectionLabel: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.dark.secondary,
    marginBottom: Spacing.sm,
  },
  bloodGroupSection: {
    marginTop: Spacing.xs,
  },
  locationSection: {
    marginTop: Spacing.xs,
  },
  bloodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  bloodButton: {
    width: '23%',
  },
  bloodButtonActive: {
    borderColor: Colors.primary.DEFAULT,
  },
  willingnessSection: {
    marginTop: Spacing.xs,
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
  footer: {
    marginTop: Spacing.xl,
  },
});