// Project LifeOrbit — Privacy Settings Screen
// Loads the privacy_settings row, maps it to the form's camelCase fields,
// and writes changes back in snake_case so Supabase accepts them.
import React from 'react';
import { View, Text, StyleSheet, Switch, Alert, type StyleProp, type ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Header } from '@/components/layout/Header';
import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/features/auth/stores/authStore';
import type { PrivacySettingsRow } from '@/types/database';
import { privacySettingsSchema, type PrivacySettingsFormData } from '@/utils/validation';
import { Colors } from '@/constants/colors';
import { FontFamily, FontSize } from '@/constants/typography';
import { Spacing } from '@/constants/spacing';
import { Shield } from 'lucide-react-native';

const DEFAULT_VALUES: PrivacySettingsFormData = {
  bloodGroupVisibility: 'connections',
  locationVisibility: 'city',
  messagingPermission: 'connections',
  showInDiscovery: true,
  showInOrbit: true,
  allowEmergencyNotifications: true,
  allowCommunityNotifications: true,
  allowCampaignNotifications: true,
};

// DB (snake_case) row  ->  form (camelCase)
const fromRow = (row: PrivacySettingsRow): PrivacySettingsFormData => ({
  bloodGroupVisibility: row.blood_group_visibility,
  locationVisibility: row.location_visibility,
  messagingPermission: row.messaging_permission,
  showInDiscovery: row.show_in_discovery,
  showInOrbit: row.show_in_orbit,
  allowEmergencyNotifications: row.allow_emergency_notifications,
  allowCommunityNotifications: row.allow_community_notifications,
  allowCampaignNotifications: row.allow_campaign_notifications,
});

// form (camelCase)  ->  DB (snake_case)
const toRow = (f: PrivacySettingsFormData): Partial<PrivacySettingsRow> => ({
  blood_group_visibility: f.bloodGroupVisibility,
  location_visibility: f.locationVisibility,
  messaging_permission: f.messagingPermission,
  show_in_discovery: f.showInDiscovery,
  show_in_orbit: f.showInOrbit,
  allow_emergency_notifications: f.allowEmergencyNotifications,
  allow_community_notifications: f.allowCommunityNotifications,
  allow_campaign_notifications: f.allowCampaignNotifications,
});

const OPTIONS = {
  bloodGroupVisibility: ['public', 'connections', 'matching_only', 'private'] as const,
  locationVisibility: ['country', 'region', 'city', 'approximate', 'private'] as const,
  messagingPermission: ['everyone', 'connections', 'requests_only', 'nobody'] as const,
};

const OPTION_LABELS: Record<string, Record<string, string>> = {
  bloodGroupVisibility: {
    public: 'Public',
    connections: 'Connections',
    matching_only: 'Matching only',
    private: 'Private',
  },
  locationVisibility: {
    country: 'Country',
    region: 'Region',
    city: 'City',
    approximate: 'Approximate',
    private: 'Hidden',
  },
  messagingPermission: {
    everyone: 'Everyone',
    connections: 'Connections',
    requests_only: 'Request only',
    nobody: 'Nobody',
  },
};

export default function PrivacySettingsScreen() {
  const router = useRouter();
  const { privacySettings, updatePrivacySettings, isLoading } = useAuthStore();

  const { control, handleSubmit } = useForm<PrivacySettingsFormData>({
    resolver: zodResolver(privacySettingsSchema),
    defaultValues: privacySettings ? fromRow(privacySettings) : DEFAULT_VALUES,
  });

  const onSubmit = async (data: PrivacySettingsFormData) => {
    const result = await updatePrivacySettings(toRow(data));
    if (result.error) {
      Alert.alert('Save Failed', result.error);
    } else {
      router.back();
    }
  };

  const renderChoiceSection = (
    title: string,
    field: 'bloodGroupVisibility' | 'locationVisibility' | 'messagingPermission'
  ) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Controller
        control={control}
        name={field}
        render={({ field: { value, onChange } }) => (
          <View style={styles.sectionContent}>
            {OPTIONS[field].map((option, index) => {
              const selected = value === option;
              const rowStyle: StyleProp<ViewStyle> = [
                styles.optionRow,
                index < OPTIONS[field].length - 1 && styles.optionRowBorder,
              ];
              return (
                <View key={option} style={rowStyle}>
                  <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                    {OPTION_LABELS[field][option]}
                  </Text>
                  <Button
                    title={selected ? 'Selected' : 'Choose'}
                    variant={selected ? 'primary' : 'outline'}
                    size="sm"
                    onPress={() => onChange(option)}
                  />
                </View>
              );
            })}
          </View>
        )}
      />
    </View>
  );

  const renderToggleSection = (title: string, children: React.ReactNode) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );

  const ToggleRow = ({
    label,
    name,
    trackOn,
  }: {
    label: string;
    name: keyof PrivacySettingsFormData;
    trackOn: string;
  }) => (
    <View style={styles.settingRow}>
      <Text style={styles.settingLabel}>{label}</Text>
      <Controller
        control={control}
        name={name as never}
        render={({ field: { value, onChange } }) => (
          <Switch
            value={Boolean(value)}
            onValueChange={onChange}
            trackColor={{ true: trackOn, false: Colors.border.dark }}
          />
        )}
      />
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <Header title="Privacy Settings" showBack />
      <Screen scrollable padding>
        <View style={styles.headerInfo}>
          <Shield size={32} color={Colors.primary.DEFAULT} style={styles.icon} />
          <Text style={styles.infoText}>
            You control who can see your information and how you can be contacted.
          </Text>
        </View>

        {renderChoiceSection('Blood Group Visibility', 'bloodGroupVisibility')}
        {renderChoiceSection('Location Visibility', 'locationVisibility')}
        {renderChoiceSection('Who Can Message You', 'messagingPermission')}

        {renderToggleSection(
          'Discovery',
          <>
            <ToggleRow label="Show me in Discovery" name="showInDiscovery" trackOn={Colors.primary.DEFAULT} />
            <ToggleRow label="Show me in Orbit" name="showInOrbit" trackOn={Colors.primary.DEFAULT} />
          </>
        )}

        {renderToggleSection(
          'Notifications',
          <>
            <ToggleRow
              label="Emergency Requests"
              name="allowEmergencyNotifications"
              trackOn={Colors.semantic.critical.DEFAULT}
            />
            <ToggleRow
              label="Community Updates"
              name="allowCommunityNotifications"
              trackOn={Colors.primary.DEFAULT}
            />
            <ToggleRow
              label="Campaign Updates"
              name="allowCampaignNotifications"
              trackOn={Colors.primary.DEFAULT}
            />
          </>
        )}

        <View style={styles.footer}>
          <Button
            title="Save Preferences"
            onPress={handleSubmit(onSubmit)}
            isLoading={isLoading}
            size="lg"
            fullWidth
          />
        </View>
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary.subtle,
    padding: Spacing.md,
    borderRadius: 8,
    marginBottom: Spacing.xl,
  },
  icon: {
    marginRight: Spacing.md,
  },
  infoText: {
    flex: 1,
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.primary.dark,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    color: Colors.dark.DEFAULT,
    marginBottom: Spacing.md,
  },
  sectionContent: {
    backgroundColor: Colors.surface.DEFAULT,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border.DEFAULT,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  settingLabel: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.base,
    color: Colors.dark.DEFAULT,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
  },
  optionRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  optionText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.base,
    color: Colors.dark.secondary,
  },
  optionTextSelected: {
    color: Colors.primary.DEFAULT,
  },
  footer: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
  },
});