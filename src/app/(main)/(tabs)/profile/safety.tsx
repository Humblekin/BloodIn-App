import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '@/components/layout/Header';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Colors } from '@/constants/colors';
import { FontFamily, FontSize } from '@/constants/typography';
import { Spacing } from '@/constants/spacing';
import { ShieldAlert, FileText, UserCheck } from 'lucide-react-native';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { useBlocking } from '@/features/moderation/hooks/useModeration';
import { moderationService } from '@/features/moderation/services/moderationService';
import { profileService } from '@/features/profiles/services/profileService';
import type { ProfileRow } from '@/types/database';

interface BlockedUser {
  id: string;
  profile: ProfileRow | null;
}

export default function SafetyCenterScreen() {
  const { session } = useAuthStore();
  const { unblockUser, loading } = useBlocking();

  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loadingBlocked, setLoadingBlocked] = useState(true);
  const [unblockingId, setUnblockingId] = useState<string | null>(null);

  const loadBlockedUsers = useCallback(async () => {
    if (!session?.user.id) {
      setBlockedUsers([]);
      setLoadingBlocked(false);
      return;
    }

    try {
      const blockedIds = await moderationService.getBlockedUsers(session.user.id);
      const users = await Promise.all(
        blockedIds.map(async (id) => ({
          id,
          profile: await profileService.getProfileById(id),
        }))
      );
      setBlockedUsers(users);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingBlocked(false);
    }
  }, [session?.user.id]);

  useEffect(() => {
    loadBlockedUsers();
  }, [loadBlockedUsers]);

  const handleUnblock = async (userId: string, displayName: string) => {
    if (!session?.user.id) return;
    setUnblockingId(userId);
    try {
      await unblockUser(session.user.id, userId);
      setBlockedUsers((prev) => prev.filter((u) => u.id !== userId));
      Alert.alert('Unblocked', `${displayName} has been unblocked.`);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to unblock user');
    } finally {
      setUnblockingId(null);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Header title="Safety Center" showBack />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.heroSection}>
          <ShieldAlert size={48} color={Colors.primary.DEFAULT} style={styles.heroIcon} />
          <Text style={styles.heroTitle}>Your Safety Matters</Text>
          <Text style={styles.heroDesc}>
            BloodIn is committed to providing a safe, verified platform for people and organizations to connect around blood needs.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Safety Guidelines</Text>

          <View style={styles.guidelineCard}>
            <View style={styles.guidelineRow}>
              <View style={styles.guidelineNumber}>
                <Text style={styles.guidelineNumberText}>1</Text>
              </View>
              <View style={styles.guidelineTextGroup}>
                <Text style={styles.guidelineTitle}>Never pay for blood</Text>
                <Text style={styles.guidelineDesc}>Selling or buying blood is illegal and strictly prohibited on BloodIn.</Text>
              </View>
            </View>

            <View style={styles.guidelineRow}>
              <View style={styles.guidelineNumber}>
                <Text style={styles.guidelineNumberText}>2</Text>
              </View>
              <View style={styles.guidelineTextGroup}>
                <Text style={styles.guidelineTitle}>Verify at the hospital</Text>
                <Text style={styles.guidelineDesc}>All donations must be medically screened by certified professionals.</Text>
              </View>
            </View>

            <View style={styles.guidelineRow}>
              <View style={styles.guidelineNumber}>
                <Text style={styles.guidelineNumberText}>3</Text>
              </View>
              <View style={styles.guidelineTextGroup}>
                <Text style={styles.guidelineTitle}>Protect your privacy</Text>
                <Text style={styles.guidelineDesc}>Only share your phone number when you have confirmed a donation plan.</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Blocked Users</Text>
          <Text style={styles.sectionDesc}>
            People you have blocked can no longer find you, see your requests or posts, or message you.
          </Text>

          {loadingBlocked ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={Colors.primary.DEFAULT} />
            </View>
          ) : blockedUsers.length === 0 ? (
            <View style={styles.emptyCard}>
              <UserCheck size={32} color={Colors.dark.tertiary} />
              <Text style={styles.emptyText}>You haven't blocked anyone yet.</Text>
            </View>
          ) : (
            <View style={styles.blockedList}>
              {blockedUsers.map(({ id, profile }) => (
                <View key={id} style={styles.blockedCard}>
                  <Avatar
                    name={profile?.display_name || 'User'}
                    imageUrl={profile?.avatar_url || undefined}
                    size="md"
                  />
                  <View style={styles.blockedContent}>
                    <Text style={styles.blockedName} numberOfLines={1}>
                      {profile?.display_name || 'Unknown User'}
                    </Text>
                    <Text style={styles.blockedMeta} numberOfLines={1}>
                      {profile?.blood_group ? `Blood ${profile?.blood_group}` : 'Blocked user'}
                    </Text>
                  </View>
                  <Button
                    title={unblockingId === id ? '...' : 'Unblock'}
                    variant="outline"
                    size="sm"
                    onPress={() => handleUnblock(id, profile?.display_name || 'User')}
                    disabled={loading || unblockingId !== null}
                  />
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tools</Text>

          <TouchableOpacity style={styles.actionCard} activeOpacity={0.7} onPress={() => {/* Read our rules for a safe platform */}}>
            <FileText size={24} color={Colors.dark.secondary} />
            <View style={styles.actionTextGroup}>
              <Text style={styles.actionTitle}>Community Guidelines</Text>
              <Text style={styles.actionDesc}>Read our rules for a safe platform</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.DEFAULT,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing['3xl'],
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    backgroundColor: Colors.primary.subtle,
    borderRadius: 16,
    marginBottom: Spacing.xl,
  },
  heroIcon: {
    marginBottom: Spacing.md,
  },
  heroTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xl,
    color: Colors.primary.DEFAULT,
    marginBottom: Spacing.xs,
  },
  heroDesc: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.dark.secondary,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
    lineHeight: 20,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    color: Colors.dark.DEFAULT,
    marginBottom: Spacing.xs,
  },
  sectionDesc: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.dark.tertiary,
    marginBottom: Spacing.md,
    lineHeight: 20,
  },
  guidelineCard: {
    backgroundColor: Colors.surface.DEFAULT,
    borderRadius: 16,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  guidelineRow: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
  },
  guidelineNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary.DEFAULT,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  guidelineNumberText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
    color: Colors.white,
  },
  guidelineTextGroup: {
    flex: 1,
  },
  guidelineTitle: {
    fontFamily: FontFamily.semibold,
    fontSize: FontSize.md,
    color: Colors.dark.DEFAULT,
    marginBottom: 4,
  },
  guidelineDesc: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.dark.secondary,
    lineHeight: 20,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: Colors.surface.DEFAULT,
    borderRadius: 12,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border.light,
    gap: Spacing.sm,
  },
  emptyText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
    color: Colors.dark.secondary,
    textAlign: 'center',
  },
  blockedList: {
    gap: Spacing.sm,
  },
  blockedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface.DEFAULT,
    borderRadius: 12,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  blockedContent: {
    flex: 1,
    marginLeft: Spacing.md,
    marginRight: Spacing.sm,
  },
  blockedName: {
    fontFamily: FontFamily.semibold,
    fontSize: FontSize.base,
    color: Colors.dark.DEFAULT,
    marginBottom: 2,
  },
  blockedMeta: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.dark.tertiary,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface.DEFAULT,
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  actionTextGroup: {
    marginLeft: Spacing.md,
  },
  actionTitle: {
    fontFamily: FontFamily.semibold,
    fontSize: FontSize.md,
    color: Colors.dark.DEFAULT,
  },
  actionDesc: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.dark.tertiary,
    marginTop: 2,
  },
});
