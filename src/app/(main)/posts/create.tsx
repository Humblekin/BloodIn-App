// Project LifeOrbit — Create Post Screen
// Purpose-tagged posts for the BloodIn network feed.
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { SafetyNotice } from '@/components/safety/SafetyNotice';
import { postService } from '@/features/posts/services/postService';
import {
  POST_PURPOSES,
  POST_VISIBILITIES,
  ASSISTANCE_SAFETY_TEXT,
  MAX_POST_LENGTH,
} from '@/features/posts/constants/posts';
import { useAuthStore } from '@/features/auth/stores/authStore';
import type { PostPurpose } from '@/types/common';
import { Colors } from '@/constants/colors';
import { FontFamily, FontSize } from '@/constants/typography';
import { Spacing } from '@/constants/spacing';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;

export default function CreatePostScreen() {
  const router = useRouter();
  const { session } = useAuthStore();
  const [purpose, setPurpose] = useState<PostPurpose>('connection');
  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'connections' | 'community' | 'private'>('public');
  const [bloodGroup, setBloodGroup] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isAssistance = purpose === 'assistance';

  const handleSubmit = async () => {
    if (!content.trim()) {
      Alert.alert('Missing content', 'Write something before posting.');
      return;
    }
    if (!session?.user.id) return;

    setSubmitting(true);
    try {
      const post = await postService.createPost(session.user.id, {
        purpose,
        content: content.trim(),
        visibility,
        blood_group: isAssistance ? bloodGroup : null,
      });
      router.replace(`/(main)/posts/${post.id}`);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create post');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <Header showBack title="New Post" />
      <ScrollView
        style={{ flex: 1, backgroundColor: Colors.background.DEFAULT }}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.label}>What is this about?</Text>
        <View style={styles.purposeGrid}>
          {POST_PURPOSES.map((p) => (
            <TouchableOpacity
              key={p.value}
              style={[styles.purposeChip, purpose === p.value && styles.purposeChipActive]}
              onPress={() => setPurpose(p.value)}
              activeOpacity={0.7}
            >
              <Text style={[styles.purposeText, purpose === p.value && styles.purposeTextActive]}>
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Message</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={content}
          onChangeText={setContent}
          placeholder="What would you like to share?"
          placeholderTextColor={Colors.dark.tertiary}
          multiline
          maxLength={MAX_POST_LENGTH}
          textAlignVertical="top"
        />
        <Text style={styles.counter}>{content.length}/{MAX_POST_LENGTH}</Text>

        <Text style={styles.label}>Who can see this?</Text>
        <View style={styles.visibilityRow}>
          {POST_VISIBILITIES.map((v) => (
            <TouchableOpacity
              key={v.value}
              style={[styles.visibilityChip, visibility === v.value && styles.visibilityChipActive]}
              onPress={() => setVisibility(v.value)}
              activeOpacity={0.7}
            >
              <Text style={[styles.visibilityText, visibility === v.value && styles.visibilityTextActive]}>
                {v.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {isAssistance && (
          <>
            <Text style={styles.label}>Blood group related (optional)</Text>
            <View style={styles.bloodGroupGrid}>
              {BLOOD_GROUPS.map((bg) => (
                <TouchableOpacity
                  key={bg}
                  style={[styles.bloodGroupChip, bloodGroup === bg && styles.bloodGroupChipActive]}
                  onPress={() => setBloodGroup(bloodGroup === bg ? null : bg)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.bloodGroupText, bloodGroup === bg && styles.bloodGroupTextActive]}>{bg}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.safetySpacing}>
              <SafetyNotice
                type="custom"
                customTitle={ASSISTANCE_SAFETY_TEXT.title}
                customBody={ASSISTANCE_SAFETY_TEXT.body}
                variant="warning"
              />
            </View>
          </>
        )}

        <Button
          title={submitting ? 'Posting...' : 'Post to network'}
          fullWidth
          isLoading={submitting}
          disabled={submitting}
          onPress={handleSubmit}
          style={styles.submit}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing['3xl'],
  },
  label: {
    fontFamily: FontFamily.semibold,
    fontSize: FontSize.sm,
    color: Colors.dark.secondary,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  purposeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  purposeChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
    backgroundColor: Colors.background.secondary,
    borderWidth: 1,
    borderColor: Colors.border.DEFAULT,
  },
  purposeChipActive: {
    backgroundColor: Colors.primary.DEFAULT,
    borderColor: Colors.primary.DEFAULT,
  },
  purposeText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.dark.secondary,
  },
  purposeTextActive: {
    color: Colors.white,
  },
  input: {
    backgroundColor: Colors.surface.DEFAULT,
    borderWidth: 1,
    borderColor: Colors.border.DEFAULT,
    borderRadius: 10,
    padding: Spacing.md,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
    color: Colors.dark.DEFAULT,
  },
  textArea: {
    minHeight: 120,
  },
  counter: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.dark.tertiary,
    textAlign: 'right',
    marginTop: Spacing.xs,
  },
  visibilityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  visibilityChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 8,
    backgroundColor: Colors.background.secondary,
    borderWidth: 1,
    borderColor: Colors.border.DEFAULT,
  },
  visibilityChipActive: {
    backgroundColor: Colors.primary.light,
    borderColor: Colors.primary.DEFAULT,
  },
  visibilityText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.dark.secondary,
  },
  visibilityTextActive: {
    color: Colors.primary.dark,
  },
  bloodGroupGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  bloodGroupChip: {
    width: 64,
    paddingVertical: Spacing.md,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border.DEFAULT,
    alignItems: 'center',
    backgroundColor: Colors.surface.DEFAULT,
  },
  bloodGroupChipActive: {
    backgroundColor: Colors.primary.DEFAULT,
    borderColor: Colors.primary.DEFAULT,
  },
  bloodGroupText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.md,
    color: Colors.dark.DEFAULT,
  },
  bloodGroupTextActive: {
    color: Colors.white,
  },
  safetySpacing: {
    marginTop: Spacing.md,
  },
  submit: {
    marginTop: Spacing.xl,
  },
});