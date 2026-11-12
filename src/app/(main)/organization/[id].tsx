import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Image,
  ScrollView,
  Alert,
  Linking,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Header } from '@/components/layout/Header';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Colors } from '@/constants/colors';
import { FontFamily, FontSize } from '@/constants/typography';
import { Spacing } from '@/constants/spacing';
import { Users, MapPin, ShieldCheck, Settings, LogOut, Globe, Building2 } from 'lucide-react-native';
import { useOrganizations } from '@/features/organizations/hooks/useOrganizations';
import { organizationService } from '@/features/organizations/services/organizationService';
import { useAuthStore } from '@/features/auth/stores/authStore';
import type { OrganizationRow, OrganizationMemberRow } from '@/features/organizations/services/organizationService';
import { isRealId } from '@/utils/ids';

const ORG_TYPE_LABELS: Record<OrganizationRow['org_type'], string> = {
  hospital: 'Hospital',
  blood_bank: 'Blood Bank',
  ngo: 'NGO',
  medical_institution: 'Medical Institution',
  other: 'Organization',
};

const ROLE_LABELS: Record<OrganizationMemberRow['role'], string> = {
  owner: 'Owner',
  admin: 'Admin',
  staff: 'Staff',
};

export default function OrganizationProfileScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { session } = useAuthStore();
  const { fetchOrganizationById, fetchMembers, joinOrganization, leaveOrganization, loading } =
    useOrganizations();

  const [organization, setOrganization] = useState<OrganizationRow | null>(null);
  const [members, setMembers] = useState<OrganizationMemberRow[]>([]);
  const [myMembership, setMyMembership] = useState<{
    role: OrganizationMemberRow['role'];
    status: OrganizationMemberRow['status'];
  } | null>(null);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    void loadData();
  }, [id]);

  const loadData = async () => {
    if (!id || typeof id !== 'string') return;

    try {
      setIsFetching(true);
      const org = await fetchOrganizationById(id);
      setOrganization(org);
      if (org) {
        const [mems, mine] = await Promise.all([
          fetchMembers(org.id),
          session?.user?.id
            ? organizationService.getMyMembership(org.id, session.user.id)
            : Promise.resolve(null),
        ]);
        setMembers(mems);
        setMyMembership(mine);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsFetching(false);
    }
  };

  const isActiveMember = myMembership?.status === 'active';
  const isPendingMember = myMembership?.status === 'pending';
  const canManage =
    isActiveMember && (myMembership?.role === 'owner' || myMembership?.role === 'admin');

  const handleJoin = async () => {
    if (!session?.user.id || !organization) return;
    if (!isRealId(organization.id)) {
      Alert.alert('Sample organization', 'Joining works for real organizations.');
      return;
    }
    try {
      await joinOrganization(organization.id, session.user.id);
      Alert.alert(
        'Success',
        organization.join_policy === 'open'
          ? 'You joined this organization.'
          : 'Your request was sent. An organization leader will review it.'
      );
      void loadData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to join');
    }
  };

  const handleLeave = () => {
    if (!session?.user.id || !organization) return;
    if (!isRealId(organization.id)) {
      Alert.alert('Sample organization', 'Leaving works for real organizations.');
      return;
    }
    const pending = myMembership?.status === 'pending';
    Alert.alert(
      pending ? 'Cancel request' : 'Leave organization',
      pending
        ? 'Withdraw your request to join this organization?'
        : `Leave "${organization.name}"? You can rejoin anytime.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: pending ? 'Withdraw' : 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              await leaveOrganization(organization.id, session.user.id);
              Alert.alert(
                pending ? 'Request withdrawn' : 'Left',
                pending ? 'Your request was withdrawn.' : 'You left this organization.'
              );
              void loadData();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to leave');
            }
          },
        },
      ]
    );
  };

  const openWebsite = () => {
    if (!organization?.website_url) return;
    void Linking.openURL(organization.website_url).catch(() => {
      Alert.alert('Error', 'Could not open the website.');
    });
  };

  if (isFetching) {
    return (
      <View style={[styles.center, { flex: 1, backgroundColor: Colors.background.DEFAULT }]}>
        <ActivityIndicator size="large" color={Colors.primary.DEFAULT} />
      </View>
    );
  }

  if (!organization) {
    return (
      <View style={[styles.center, { flex: 1, backgroundColor: Colors.background.DEFAULT }]}>
        <Text style={styles.notFoundText}>This organization could not be found.</Text>
        <Button title="Go Back" variant="outline" onPress={() => router.back()} />
      </View>
    );
  }

  const joinLabel = organization.join_policy === 'open' ? 'Join' : 'Request to Join';
  const isVerified = organization.verification_level !== 'unverified';

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background.DEFAULT }}>
      <Stack.Screen options={{ headerShown: false }} />
      <Header title="" showBack transparent style={{ position: 'absolute', top: 0, zIndex: 100 }} />

      <ScrollView contentContainerStyle={{ paddingBottom: Spacing['3xl'] }}>
        {organization.logo_url ? (
          <Image source={{ uri: organization.logo_url }} style={styles.coverImage} blurRadius={12} />
        ) : (
          <View style={styles.coverImage}>
            <View style={styles.coverOverlay} />
          </View>
        )}

        <View style={styles.content}>
          <View style={styles.headerRow}>
            <Avatar
              name={organization.name}
              imageUrl={organization.logo_url || undefined}
              size="2xl"
              showBorder
              style={styles.avatar}
            />
            <View style={styles.actions}>
              {isActiveMember && canManage && (
                <Button
                  title="Manage"
                  size="sm"
                  variant="outline"
                  leftIcon={<Settings size={16} color={Colors.primary.DEFAULT} />}
                  onPress={() =>
                    router.push({
                      pathname: '/(main)/organization/manage',
                      params: { id: organization.id },
                    })
                  }
                  disabled={loading}
                />
              )}
              {isActiveMember ? (
                <Button
                  title="Leave"
                  size="sm"
                  variant="outline"
                  leftIcon={<LogOut size={16} color={Colors.semantic.critical.DEFAULT} />}
                  onPress={handleLeave}
                  disabled={loading}
                />
              ) : isPendingMember ? (
                <Button
                  title="Cancel request"
                  size="sm"
                  variant="outline"
                  leftIcon={<LogOut size={16} color={Colors.semantic.critical.DEFAULT} />}
                  onPress={handleLeave}
                  disabled={loading}
                />
              ) : (
                <Button
                  title={joinLabel}
                  size="sm"
                  leftIcon={<Users size={16} color={Colors.white} />}
                  onPress={handleJoin}
                  disabled={loading}
                />
              )}
            </View>
          </View>

          <View style={styles.infoSection}>
            <Text style={styles.name}>{organization.name}</Text>

            <View style={styles.badges}>
              <Badge label={ORG_TYPE_LABELS[organization.org_type] || 'Organization'} variant="info" />
              {isVerified && (
                <Badge
                  label={
                    organization.verification_level === 'premium'
                      ? 'Premium'
                      : organization.verification_level === 'verified'
                        ? 'Verified'
                        : 'Basic'
                  }
                  variant="success"
                  leftIcon={<ShieldCheck size={12} color={Colors.semantic.success.dark} />}
                />
              )}
              {isPendingMember && <Badge label="Pending approval" variant="warning" />}
              {isActiveMember && myMembership && (
                <Badge label={ROLE_LABELS[myMembership.role]} variant="success" />
              )}
            </View>

            <View style={styles.stats}>
              <View style={styles.statRow}>
                <Users size={16} color={Colors.dark.tertiary} />
                <Text style={styles.statText}>
                  {organization.member_count} Member{organization.member_count === 1 ? '' : 's'}
                </Text>
              </View>
              <View style={styles.statRow}>
                <MapPin size={16} color={Colors.dark.tertiary} />
                <Text style={styles.statText}>Location ID: {organization.city_id || 'Unknown'}</Text>
              </View>
            </View>

            {organization.description && (
              <Text style={styles.description}>{organization.description}</Text>
            )}

            {organization.website_url && (
              <TouchableOpacity style={styles.websiteRow} onPress={openWebsite} activeOpacity={0.7}>
                <Globe size={16} color={Colors.primary.DEFAULT} />
                <Text style={styles.websiteText} numberOfLines={1}>
                  {organization.website_url}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {members.length > 0 && (
            <View style={styles.membersSection}>
              <Text style={styles.subSectionTitle}>Members</Text>
              <View style={styles.memberRow}>
                {members.slice(0, 6).map((member) => (
                  <View key={member.id} style={styles.memberAvatar}>
                    <Avatar
                      name={member.profile?.display_name || 'Member'}
                      url={member.profile?.avatar_url || undefined}
                      size="lg"
                    />
                    {member.role !== 'staff' && (
                      <Badge
                        label={member.role === 'owner' ? 'O' : 'A'}
                        variant="info"
                        style={styles.roleBadge}
                      />
                    )}
                  </View>
                ))}
              </View>
            </View>
          )}

          {members.length === 0 && (
            <View style={styles.emptyMembers}>
              <Building2 size={24} color={Colors.dark.tertiary} />
              <Text style={styles.emptyText}>The member list is visible to members.</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  notFoundText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.md,
    color: Colors.dark.secondary,
    marginBottom: Spacing.lg,
  },
  coverImage: {
    height: 160,
    backgroundColor: Colors.primary.DEFAULT,
    width: '100%',
  },
  coverOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  content: {
    paddingHorizontal: Spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: -48,
    marginBottom: Spacing.md,
  },
  avatar: {
    borderWidth: 4,
    borderColor: Colors.background.DEFAULT,
    backgroundColor: Colors.surface.DEFAULT,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  infoSection: {
    gap: Spacing.sm,
  },
  name: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['2xl'],
    color: Colors.dark.DEFAULT,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  stats: {
    flexDirection: 'row',
    gap: Spacing.lg,
    marginBottom: Spacing.xs,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.dark.secondary,
  },
  description: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
    color: Colors.dark.DEFAULT,
    lineHeight: 22,
    marginTop: Spacing.xs,
  },
  websiteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.xs,
  },
  websiteText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.primary.DEFAULT,
    flex: 1,
  },
  membersSection: {
    marginTop: Spacing.lg,
  },
  subSectionTitle: {
    fontFamily: FontFamily.semibold,
    fontSize: FontSize.sm,
    color: Colors.dark.secondary,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberAvatar: {
    marginRight: -8,
  },
  roleBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
  },
  emptyMembers: {
    marginTop: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  emptyText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.dark.secondary,
  },
});
