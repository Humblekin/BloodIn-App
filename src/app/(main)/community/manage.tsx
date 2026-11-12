import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert, TextInput } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check, X, UserMinus, ArrowUp, ArrowDown, ShieldCheck } from 'lucide-react-native';
import { Header } from '@/components/layout/Header';
import { Avatar } from '@/components/ui/Avatar';
import { colors } from '@/constants/colors';
import { typography } from '@/constants/typography';
import { useCommunity } from '@/features/communities/hooks/useCommunity';
import { communityService } from '@/features/communities/services/communityService';
import type { CommunityRow, CommunityMemberRow } from '@/features/communities/services/communityService';
import { useAuthStore } from '@/features/auth/stores/authStore';

type MemberRole = CommunityMemberRow['role'];

const roleLabel = (role: MemberRole): string =>
  role === 'admin' ? 'Admin' : role === 'moderator' ? 'Moderator' : 'Member';

export default function ManageCommunityScreen() {
  const { id } = useLocalSearchParams();
  const { session } = useAuthStore();
  const {
    fetchCommunityById,
    fetchMembers,
    fetchPendingMembers,
    postAnnouncement,
    setMemberStatus,
    setMemberRole,
    loading,
  } = useCommunity();

  const [community, setCommunity] = useState<CommunityRow | null>(null);
  const [members, setMembers] = useState<CommunityMemberRow[]>([]);
  const [pending, setPending] = useState<CommunityMemberRow[]>([]);
  const [myRole, setMyRole] = useState<MemberRole | null>(null);
  const [isFetching, setIsFetching] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);

  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementContent, setAnnouncementContent] = useState('');

  const loadData = useCallback(async () => {
    if (!id || typeof id !== 'string') return;
    try {
      setIsFetching(true);
      const comm = await fetchCommunityById(id);
      setCommunity(comm);

      if (comm) {
        const [mems, pend, mine] = await Promise.all([
          fetchMembers(comm.id),
          fetchPendingMembers(comm.id),
          session?.user?.id
            ? communityService.getMyMembership(comm.id, session.user.id)
            : Promise.resolve(null),
        ]);
        setMembers(mems);
        setPending(pend);
        setMyRole(mine?.status === 'active' ? mine.role : null);
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to load community details');
    } finally {
      setIsFetching(false);
    }
  }, [id, session?.user?.id, fetchCommunityById, fetchMembers, fetchPendingMembers]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const canManage = myRole === 'admin' || myRole === 'moderator';
  const isAdmin = myRole === 'admin';

  const runAction = async (memberId: string, action: () => Promise<void>, success: string) => {
    setActingId(memberId);
    try {
      await action();
      await loadData();
      Alert.alert('Done', success);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Action failed');
    } finally {
      setActingId(null);
    }
  };

  const memberName = (member: CommunityMemberRow) => member.profile?.display_name || 'Member';

  const handleApprove = (member: CommunityMemberRow) =>
    runAction(member.id, () => setMemberStatus(member.id, 'active'), `${memberName(member)} joined the community.`);

  const handleDecline = (member: CommunityMemberRow) =>
    runAction(member.id, () => setMemberStatus(member.id, 'left'), 'Join request declined.');

  const handleChangeRole = (member: CommunityMemberRow, role: MemberRole) =>
    runAction(member.id, () => setMemberRole(member.id, role), 'Member role updated.');

  const handleRemove = (member: CommunityMemberRow) =>
    runAction(member.id, () => setMemberStatus(member.id, 'suspended'), `${memberName(member)} was removed.`);

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

  if (!canManage) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <Header title="Manage Community" showBack variant="brand" />
        <View style={styles.center}>
          <Text style={styles.emptyText}>
            You need moderator or admin access to manage this community.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const renderPendingRow = (member: CommunityMemberRow) => {
    const busy = actingId === member.id;
    return (
      <View key={member.id} style={styles.memberRow}>
        <Avatar name={memberName(member)} imageUrl={member.profile?.avatar_url} size="sm" />
        <View style={styles.memberInfo}>
          <Text style={styles.memberName}>{memberName(member)}</Text>
          <Text style={styles.memberRole}>Requested to join</Text>
        </View>
        <View style={styles.actionRow}>
          <Pressable
            style={[styles.iconButton, styles.approveButton]}
            onPress={() => handleApprove(member)}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel={`Approve ${memberName(member)}`}
          >
            <Check size={16} color={colors.text.inverse} />
          </Pressable>
          <Pressable
            style={[styles.iconButton, styles.declineButton]}
            onPress={() => handleDecline(member)}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel={`Decline ${memberName(member)}`}
          >
            <X size={16} color={colors.status.error} />
          </Pressable>
        </View>
      </View>
    );
  };

  const renderMemberRow = (member: CommunityMemberRow) => {
    const busy = actingId === member.id;
    const isSelf = member.user_id === session?.user?.id;
    const isAdminRow = member.role === 'admin';
    const canActOnRow = !isSelf && (isAdmin || !isAdminRow);

    return (
      <View key={member.id} style={styles.memberRow}>
        <Avatar name={memberName(member)} imageUrl={member.profile?.avatar_url} size="sm" />
        <View style={styles.memberInfo}>
          <Text style={styles.memberName}>
            {memberName(member)}
            {isSelf ? ' (you)' : ''}
          </Text>
          <Text style={styles.memberRole}>{roleLabel(member.role)}</Text>
        </View>
        {canActOnRow && (
          <View style={styles.actionRow}>
            {member.role === 'member' && (
              <Pressable
                style={styles.iconButton}
                onPress={() => handleChangeRole(member, 'moderator')}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel={`Promote ${memberName(member)} to moderator`}
              >
                <ArrowUp size={16} color={colors.primary.default} />
              </Pressable>
            )}
            {member.role === 'moderator' && (
              <>
                <Pressable
                  style={styles.iconButton}
                  onPress={() => handleChangeRole(member, 'member')}
                  disabled={busy}
                  accessibilityRole="button"
                  accessibilityLabel={`Demote ${memberName(member)} to member`}
                >
                  <ArrowDown size={16} color={colors.text.secondary} />
                </Pressable>
                {isAdmin && (
                  <Pressable
                    style={styles.iconButton}
                    onPress={() => handleChangeRole(member, 'admin')}
                    disabled={busy}
                    accessibilityRole="button"
                    accessibilityLabel={`Make ${memberName(member)} an admin`}
                  >
                    <ShieldCheck size={16} color={colors.primary.default} />
                  </Pressable>
                )}
              </>
            )}
            {member.role === 'admin' && isAdmin && (
              <Pressable
                style={styles.iconButton}
                onPress={() => handleChangeRole(member, 'moderator')}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel={`Demote ${memberName(member)} to moderator`}
              >
                <ArrowDown size={16} color={colors.text.secondary} />
              </Pressable>
            )}
            <Pressable
              style={[styles.iconButton, styles.removeButton]}
              onPress={() => handleRemove(member)}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${memberName(member)}`}
            >
              <UserMinus size={16} color={colors.status.error} />
            </Pressable>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Header title="Manage Community" showBack variant="brand" />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Join Requests ({pending.length})</Text>
          <View style={styles.card}>
            {pending.length === 0 ? (
              <Text style={styles.emptyText}>No pending requests.</Text>
            ) : (
              pending.map(renderPendingRow)
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Members ({members.length})</Text>
          <View style={styles.card}>
            {members.length === 0 ? (
              <Text style={styles.emptyText}>No members found.</Text>
            ) : (
              members.map(renderMemberRow)
            )}
          </View>
        </View>

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
              underlineColorAndroid="transparent"
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
              underlineColorAndroid="transparent"
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
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
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
    borderRadius: 12,
    padding: 12,
    minHeight: 52,
    fontFamily: typography.fonts.regular,
    fontSize: typography.sizes.md,
    color: colors.text.primary,
    textAlignVertical: 'center',
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
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.light,
  },
  memberInfo: {
    flex: 1,
    marginLeft: 12,
  },
  memberName: {
    fontFamily: typography.fonts.medium,
    fontSize: typography.sizes.md,
    color: colors.text.primary,
  },
  memberRole: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.sizes.xs,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.background.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  approveButton: {
    backgroundColor: colors.status.success,
    borderColor: colors.status.success,
  },
  declineButton: {
    borderColor: colors.status.error,
  },
  removeButton: {
    borderColor: colors.status.error,
  },
});
