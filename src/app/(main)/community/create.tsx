import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, Pressable, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';
import { typography } from '@/constants/typography';
import { useCommunity } from '@/features/communities/hooks/useCommunity';
import { useAuthStore } from '@/features/auth/stores/authStore';

export default function CreateCommunityScreen() {
  const router = useRouter();
  const { session } = useAuthStore();
  const { createCommunity, loading } = useCommunity();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [joinPolicy, setJoinPolicy] = useState<'open' | 'request' | 'invite_only'>('open');

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Community name is required');
      return;
    }
    
    if (!session?.user.id) return;

    try {
      const newCommunity = await createCommunity({
        name,
        description,
        join_policy: joinPolicy,
        created_by: session.user.id,
      });

      Alert.alert('Success', 'Community created successfully.', [
        { text: 'OK', onPress: () => router.push(`/community/${newCommunity.id}`) }
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create community');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen options={{ title: 'Create Community' }} />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.section}>
          <Text style={styles.inputLabel}>Community Name *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Accra Blood Donors"
            placeholderTextColor={colors.text.tertiary}
          />
          
          <Text style={styles.inputLabel}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="What is this community about?"
            placeholderTextColor={colors.text.tertiary}
            multiline
            numberOfLines={4}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Join Policy</Text>
          
          <Pressable 
            style={[styles.policyOption, joinPolicy === 'open' && styles.policyOptionActive]}
            onPress={() => setJoinPolicy('open')}
          >
            <View style={styles.policyTextGroup}>
              <Text style={styles.policyTitle}>Open</Text>
              <Text style={styles.policyDesc}>Anyone can join immediately</Text>
            </View>
            <View style={[styles.radio, joinPolicy === 'open' && styles.radioActive]}>
              {joinPolicy === 'open' && <View style={styles.radioInner} />}
            </View>
          </Pressable>

          <Pressable 
            style={[styles.policyOption, joinPolicy === 'request' && styles.policyOptionActive]}
            onPress={() => setJoinPolicy('request')}
          >
            <View style={styles.policyTextGroup}>
              <Text style={styles.policyTitle}>Request to Join</Text>
              <Text style={styles.policyDesc}>Admins must approve members</Text>
            </View>
            <View style={[styles.radio, joinPolicy === 'request' && styles.radioActive]}>
              {joinPolicy === 'request' && <View style={styles.radioInner} />}
            </View>
          </Pressable>
          
          <Pressable 
            style={[styles.policyOption, joinPolicy === 'invite_only' && styles.policyOptionActive]}
            onPress={() => setJoinPolicy('invite_only')}
          >
            <View style={styles.policyTextGroup}>
              <Text style={styles.policyTitle}>Invite Only</Text>
              <Text style={styles.policyDesc}>Hidden from public discovery</Text>
            </View>
            <View style={[styles.radio, joinPolicy === 'invite_only' && styles.radioActive]}>
              {joinPolicy === 'invite_only' && <View style={styles.radioInner} />}
            </View>
          </Pressable>
        </View>

        <Pressable 
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.submitButtonText}>
            {loading ? 'Creating...' : 'Create Community'}
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
  sectionTitle: {
    fontFamily: typography.fonts.semiBold,
    fontSize: typography.sizes.md,
    color: colors.text.primary,
    marginBottom: 12,
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
  policyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.background.card,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: 12,
    marginBottom: 12,
  },
  policyOptionActive: {
    borderColor: colors.primary.default,
    backgroundColor: colors.primary.light + '20',
  },
  policyTextGroup: {
    flex: 1,
  },
  policyTitle: {
    fontFamily: typography.fonts.semiBold,
    fontSize: typography.sizes.md,
    color: colors.text.primary,
  },
  policyDesc: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.sizes.sm,
    color: colors.text.tertiary,
    marginTop: 4,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border.default,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioActive: {
    borderColor: colors.primary.default,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary.default,
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
