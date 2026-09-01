import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, Pressable, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';
import { typography } from '@/constants/typography';
import { useCampaigns } from '@/features/campaigns/hooks/useCampaigns';
import { useAuthStore } from '@/features/auth/stores/authStore';

export default function CreateCampaignScreen() {
  const router = useRouter();
  const { session } = useAuthStore();
  const { createCampaign, loading } = useCampaigns();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [venue, setVenue] = useState('');
  const [startDateStr, setStartDateStr] = useState(''); // Simple text input for MVP

  const handleSubmit = async () => {
    if (!title.trim() || !startDateStr.trim()) {
      Alert.alert('Error', 'Title and start date are required');
      return;
    }
    
    if (!session?.user.id) return;

    try {
      const startDate = new Date(startDateStr);
      if (isNaN(startDate.getTime())) {
         throw new Error("Invalid date format. Use YYYY-MM-DD");
      }

      const newCampaign = await createCampaign({
        title,
        description,
        campaign_type: 'donation_drive',
        community_id: null,
        organization_id: null,
        created_by: session.user.id,
        start_date: startDate.toISOString(),
        end_date: null,
        venue,
        cover_image_url: null,
        max_participants: null,
        safety_info: null,
        status: 'upcoming'
      });

      Alert.alert('Success', 'Campaign created successfully.', [
        { text: 'OK', onPress: () => router.push(`/campaigns/${newCampaign.id}`) }
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create campaign');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen options={{ title: 'Create Campaign' }} />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <Text style={styles.inputLabel}>Campaign Title *</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Accra City Donation Drive"
            placeholderTextColor={colors.text.tertiary}
          />
          
          <Text style={styles.inputLabel}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Details about this campaign..."
            placeholderTextColor={colors.text.tertiary}
            multiline
            numberOfLines={4}
          />

          <Text style={styles.inputLabel}>Start Date (YYYY-MM-DD) *</Text>
          <TextInput
            style={styles.input}
            value={startDateStr}
            onChangeText={setStartDateStr}
            placeholder="e.g. 2026-12-01"
            placeholderTextColor={colors.text.tertiary}
          />

          <Text style={styles.inputLabel}>Venue / Location</Text>
          <TextInput
            style={styles.input}
            value={venue}
            onChangeText={setVenue}
            placeholder="e.g. Independence Square"
            placeholderTextColor={colors.text.tertiary}
          />
        </View>

        <Pressable 
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.submitButtonText}>
            {loading ? 'Creating...' : 'Create Campaign'}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.default,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  inputLabel: {
    fontFamily: typography.fonts.medium,
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    marginBottom: 6,
    marginTop: 16,
  },
  input: {
    backgroundColor: colors.background.card,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: 8,
    padding: 12,
    fontFamily: typography.fonts.regular,
    fontSize: typography.sizes.md,
    color: colors.text.primary,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: colors.primary.default,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontFamily: typography.fonts.semiBold,
    fontSize: typography.sizes.md,
    color: colors.text.inverse,
  },
});
