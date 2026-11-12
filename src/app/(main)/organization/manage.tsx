import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check, X, UserMinus, ArrowUp, ArrowDown, ShieldCheck } from 'lucide-react-native';
import { Header } from '@/components/layout/Header';
import { Avatar } from '@/components/ui/Avatar';
import { colors } from '@/constants/colors';
import { typography } from '@/constants/typography';
import { useOrganizations } from '@/features/organizations/hooks/useOrganizations';
import { organizationService } from '@/features/organizations/services/organizationService';
import type {
  OrganizationRow,
  OrganizationMemberRow,
  OrgRole,
} from '@/features/organizations/services/organizationService';
import { useAuthStore } from '@/features/auth/stores/authStore';

const roleLabel = (role: OrgRole): string =>
  role === 'owner' ? 'Owner' : role === 'admin' ? 'Admin' : 'Staff';

export default function ManageOrganizationScreen() {
  const { id } = useLocalSearchParams();
  const { session } = useAuthStore();
  const {
    fetchOrganizationById,
    fetchMembers,
    fetchPendingMembers,
    setMemberStatus,
    setMemberRole,
  } = useOrganizations();

  const [organization, setOrganization] = useState<OrganizationRow | null>(null);
  const [members, setMembers] = useState<OrganizationMemberRow[]>([]);
  const [pending, setPending] = useState<OrganizationMemberRow[]>([]);
  const [myRole, setMyRole] = useState<OrgRole | null>(null);
  const [isFetching, setIsFetching] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!id || typeof id !== 'string') return;
    try {
      setIsFetching(true);
      const org = await fetchOrganizationById(id);
      setOrganization(org);

      if (org) {
        const [mems, pend, mine] = await Promise.all([
          fetchMembers(org.id),
          fetchPendingMembers(org.id),
          session?.user?.id
            ? organizationService.getMyMembership(org.id, session.user.id)
            : Promise.resolve(null),
        ]);
        setMembers(mems);
        setPending(pend);
        setMyRole(mine?.status === 'active' ? mine.role : null);
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to load organization details');
    } finally {
      setIsFetching(false);
    }
  }, [id, session?.user?.id, fetchOrganizationById, fetchMembers, fetchPendingMembers]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const isOwner = myRole === 'owner';
  const isAdmin = myRole === 'admin';
  const canManage = isOwner || isAdmin;

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

  const memberName = (member: OrganizationMemberRow) => member.profile?.display_name || 'Member';

  const handleApprove = (member: OrganizationMemberRow) =>
    runAction(
      member.id,
      () => setMemberStatus(member.id, 'active'),
      `${memberName(member)} joined the organization.`
    );

  const handleDecline = (member: OrganizationMemberRow) =>
    runAction(member.id, () => setMemberStatus(member.id, 'left'), 'Join request declined.');

  const handleChangeRole = (member: OrganizationMemberRow, role: OrgRole) =>
    runAction(member.id, () => setMemberRole(member.id, role), 'Member role updated.');

  const handleRemove = (member: OrganizationMemberRow) =>
    runAction(
      member.id,
      () => setMemberStatus(member.id, 'suspended'),
      `${memberName(member)} was removed.`
    );

  if (isFetching || !organization) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary.default} />
      </View>
    );
  }

  if (!canManage) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <Header title="Manage Organization" showBack variant="brand" />
        <View style={styles.center}>
          <Text style={styles.emptyText}>
            You need owner or admin access to manage this organization.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const renderPendingRow = (member: OrganizationMemberRow) => {
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

  const renderMemberRow = (member: OrganizationMemberRow) => {
    const busy = actingId === member.id;
    const isSelf = member.user_id === session?.user?.id;
    // Owners manage everyone; admins manage staff only. Never act on yourself.
    const canActOnRow = !isSelf && (isOwner || member.role === 'staff');

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
            {member.role === 'staff' && (
              <Pressable
                style={styles.iconButton}
                onPress={() => handleChangeRole(member, 'admin')}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel={`Promote ${memberName(member)} to admin`}
              >
                <ArrowUp size={16} color={colors.primary.default} />
              </Pressable>
            )}
            {member.role === 'admin' && (
              <>
                <Pressable
                  style={styles.iconButton}
                  onPress={() => handleChangeRole(member, 'staff')}
                  disabled={busy}
                  accessibilityRole="button"
                  accessibilityLabel={`Demote ${memberName(member)} to staff`}
                >
                  <ArrowDown size={16} color={colors.text.secondary} />
                </Pressable>
                {isOwner && (
                  <Pressable
                    style={styles.iconButton}
                    onPress={() => handleChangeRole(member, 'owner')}
                    disabled={busy}
                    accessibilityRole="button"
                    accessibilityLabel={`Make ${memberName(member)} an owner`}
                  >
                    <ShieldCheck size={16} color={colors.primary.default} />
                  </Pressable>
                )}
              </>
            )}
            {member.role === 'owner' && isOwner && (
              <Pressable
                style={styles.iconButton}
                onPress={() => handleChangeRole(member, 'admin')}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel={`Demote ${memberName(member)} to admin`}
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
      <Header title="Manage Organization" showBack variant="brand" />

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
