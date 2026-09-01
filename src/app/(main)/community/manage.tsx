import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert, TextInput } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';
import { typography } from '@/constants/typography';
import { useCommunity } from '@/features/communities/hooks/useCommunity';
import { MemberList } from '@/features/communities/components/MemberList';
import type { CommunityRow, CommunityMemberRow } from '@/features/communities/services/communityService';
import { useAuthStore } from '@/features/auth/stores/authStore';

export default function ManageCommunityScreen() {
  const { id } = useLocalSearchParams();
  const { session } = useAuthStore();
  const { fetchCommunityById, fetchMembers, postAnnouncement, loading } = useCommunity();
  
  const [community, setCommunity] = useState<CommunityRow | null>(null);
  const [members, setMembers] = useState<CommunityMemberRow[]>([]);
  const [isFetching, setIsFetching] = useState(true);

  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementContent, setAnnouncementContent] = useState('');

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    if (!id || typeof id !== 'string') return;
    try {
      setIsFetching(true);
      const comm = await fetchCommunityById(id);
      setCommunity(comm);
      
      if (comm) {
        const mems = await fetchMembers(comm.id);
        setMembers(mems);
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to load community details');
    } finally {
      setIsFetching(false);
    }
  };

  const handlePostAnnouncement = async () => {
    if (!announcementTitle.trim() || !announcementContent.trim()) {
      Alert.alert('Error', 'Title and content are required.');
      return;
    }
    if (!session?.user.id || !community) return;

    try {
      await postAnnouncement({
        community_id: community.id,
        author_id: session.user.id,
        title: announcementTitle,
        content: announcementContent,
      });

      Alert.alert('Success', 'Announcement posted.');
      setAnnouncementTitle('');
      setAnnouncementContent('');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to post announcement');
    }
  };

  if (isFetching || !community) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary.default} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen options={{ title: 'Manage Community' }} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Post Announcement</Text>
          <View style={styles.card}>
            <Text style={styles.inputLabel}>Title</Text>
            <TextInput
              style={styles.input}
              value={announcementTitle}
              onChangeText={setAnnouncementTitle}
              placeholder="Announcement title"
              placeholderTextColor={colors.text.tertiary}
            />
            
            <Text style={styles.inputLabel}>Content</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={announcementContent}
              onChangeText={setAnnouncementContent}
              placeholder="What do you want to share with members?"
              placeholderTextColor={colors.text.tertiary}
              multiline
              numberOfLines={4}
            />

            <Pressable 
              style={[styles.primaryButton, loading && styles.disabledButton]}
              onPress={handlePostAnnouncement}
              disabled={loading}
            >
              <Text style={styles.primaryButtonText}>
                {loading ? 'Posting...' : 'Post Announcement'}
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Members ({members.length})</Text>
          <View style={styles.card}>
            {members.length === 0 ? (
               <Text style={styles.emptyText}>No members found.</Text>
            ) : (
               <MemberList members={members} />
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.default,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontFamily: typography.fonts.bold,
    fontSize: typography.sizes.lg,
    color: colors.text.primary,
    marginBottom: 12,
  },
  card: {
    backgroundColor: colors.background.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  inputLabel: {
    fontFamily: typography.fonts.medium,
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    backgroundColor: colors.background.default,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: 8,
    padding: 12,
    fontFamily: typography.fonts.regular,
    fontSize: typography.sizes.md,
    color: colors.text.primary,
    marginBottom: 8,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  primaryButton: {
    backgroundColor: colors.primary.default,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  disabledButton: {
    opacity: 0.5,
  },
  primaryButtonText: {
    fontFamily: typography.fonts.semiBold,
    fontSize: typography.sizes.md,
    color: colors.text.inverse,
  },
  emptyText: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.sizes.md,
    color: colors.text.tertiary,
    textAlign: 'center',
    padding: 20,
  }
});
