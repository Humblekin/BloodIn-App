// Project LifeOrbit — Profile Screen
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Screen } from '@/components/layout/Screen';
import { Header } from '@/components/layout/Header';
import { Avatar } from '@/components/ui/Avatar';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { Colors } from '@/constants/colors';
import { FontFamily, FontSize } from '@/constants/typography';
import { Spacing } from '@/constants/spacing';
import { useRouter } from 'expo-router';
import { UserCog, Users, Lock, ShieldCheck, LogOut, ChevronRight, Star } from 'lucide-react-native';
import { PremiumBadge } from '@/features/premium/components/PremiumBadge';

export default function ProfileScreen() {
  const { user, profile, signOut } = useAuthStore();
  const router = useRouter();

  const menuItems = [
    {
      label: 'Edit Profile',
      description: profile?.display_name || 'Your name, bio and blood group',
      icon: <UserCog size={22} color={Colors.primary.DEFAULT} />,
      onPress: () => router.push('/(main)/(tabs)/profile/edit'),
    },
    {
      label: 'Connections',
      description: 'People in your blood network',
      icon: <Users size={22} color={Colors.primary.DEFAULT} />,
      onPress: () => router.push('/(main)/(tabs)/profile/connections'),
    },
    {
      label: 'Privacy Settings',
      description: 'Who can see you and contact you',
      icon: <Lock size={22} color={Colors.primary.DEFAULT} />,
      onPress: () => router.push('/(main)/(tabs)/profile/privacy'),
    },
    {
      label: 'Safety Center',
      description: 'Guidelines, blocking and reporting',
      icon: <ShieldCheck size={22} color={Colors.primary.DEFAULT} />,
      onPress: () => router.push('/(main)/(tabs)/profile/safety'),
    },
    {
      label: 'Premium',
      description: profile?.is_premium ? 'You are a Premium member' : 'Upgrade for priority features',
      icon: <Star size={22} color={Colors.premium} />,
      onPress: () => router.push('/(main)/(tabs)/profile/premium'),
    },
  ];

  return (
    <View style={{ flex: 1 }}>
      <Header title="Profile" />
      <Screen scrollable padding>
        <View style={styles.header}>
          <Avatar
            name={profile?.display_name || user?.email || 'User'}
            url={profile?.avatar_url}
            size="xl"
            showBorder
          />
          <View style={styles.nameRow}>
            <Text style={styles.name}>{profile?.display_name || 'Loading...'}</Text>
            {profile?.is_premium && <PremiumBadge size="sm" />}
          </View>
          <Text style={styles.email}>{user?.email}</Text>

          {profile?.blood_group && (
            <View style={styles.bloodGroupBadge}>
              <Text style={styles.bloodGroupText}>{profile.blood_group}</Text>
            </View>
          )}
        </View>

        <View style={styles.menu}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.label}
              style={styles.menuItem}
              activeOpacity={0.7}
              onPress={item.onPress}
            >
              <View style={styles.menuIcon}>{item.icon}</View>
              <View style={styles.menuTextGroup}>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <Text style={styles.menuDescription} numberOfLines={1}>
                  {item.description}
                </Text>
              </View>
              <ChevronRight size={18} color={Colors.dark.tertiary} />
            </TouchableOpacity>
          ))}

          <TouchableOpacity style={[styles.menuItem, styles.signOutItem]} activeOpacity={0.7} onPress={signOut}>
            <View style={styles.menuIcon}>
              <LogOut size={22} color={Colors.semantic.critical.DEFAULT} />
            </View>
            <View style={styles.menuTextGroup}>
              <Text style={[styles.menuLabel, styles.signOutLabel]}>Sign Out</Text>
              <Text style={styles.menuDescription}>End this session</Text>
            </View>
            <ChevronRight size={18} color={Colors.dark.tertiary} />
          </TouchableOpacity>
        </View>
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    marginTop: Spacing.xl,
    marginBottom: Spacing['3xl'],
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    marginBottom: Spacing['2xs'],
  },
  name: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xl,
    color: Colors.dark.DEFAULT,
  },
  email: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
    color: Colors.dark.secondary,
    marginBottom: Spacing.md,
  },
  bloodGroupBadge: {
    backgroundColor: Colors.primary.subtle,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: 16,
  },
  bloodGroupText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
    color: Colors.primary.dark,
  },
  menu: {
    gap: Spacing.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface.DEFAULT,
    borderRadius: 12,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  signOutItem: {
    marginTop: Spacing.sm,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary.subtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  menuTextGroup: {
    flex: 1,
  },
  menuLabel: {
    fontFamily: FontFamily.semibold,
    fontSize: FontSize.base,
    color: Colors.dark.DEFAULT,
  },
  menuDescription: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.dark.tertiary,
    marginTop: 2,
  },
  signOutLabel: {
    color: Colors.semantic.critical.DEFAULT,
  },
});