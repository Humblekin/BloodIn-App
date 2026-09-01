import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';
import { typography } from '@/constants/typography';
import { Shield, ShieldAlert, FileText, UserX } from 'lucide-react-native';

export default function SafetyCenterScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen options={{ title: 'Safety Center' }} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.heroSection}>
          <ShieldAlert size={48} color={colors.primary.default} style={styles.heroIcon} />
          <Text style={styles.heroTitle}>Your Safety Matters</Text>
          <Text style={styles.heroDesc}>
            BloodIn is committed to providing a safe, verified platform for blood donors and recipients.
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
          <Text style={styles.sectionTitle}>Tools</Text>
          
          <Pressable style={styles.actionCard} onPress={() => {/* Navigate to blocked users list */}}>
            <UserX size={24} color={colors.text.secondary} />
            <View style={styles.actionTextGroup}>
              <Text style={styles.actionTitle}>Blocked Users</Text>
              <Text style={styles.actionDesc}>Manage accounts you have blocked</Text>
            </View>
          </Pressable>

          <Pressable style={styles.actionCard} onPress={() => {/* Navigate to terms */}}>
            <FileText size={24} color={colors.text.secondary} />
            <View style={styles.actionTextGroup}>
              <Text style={styles.actionTitle}>Community Guidelines</Text>
              <Text style={styles.actionDesc}>Read our rules for a safe platform</Text>
            </View>
          </Pressable>
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
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: colors.primary.light + '20',
    borderRadius: 16,
    marginBottom: 24,
  },
  heroIcon: {
    marginBottom: 16,
  },
  heroTitle: {
    fontFamily: typography.fonts.bold,
    fontSize: typography.sizes.xl,
    color: colors.primary.default,
    marginBottom: 8,
  },
  heroDesc: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    textAlign: 'center',
    paddingHorizontal: 24,
    lineHeight: 20,
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
  guidelineCard: {
    backgroundColor: colors.background.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  guidelineRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  guidelineNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary.default,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  guidelineNumberText: {
    fontFamily: typography.fonts.bold,
    fontSize: typography.sizes.sm,
    color: colors.text.inverse,
  },
  guidelineTextGroup: {
    flex: 1,
  },
  guidelineTitle: {
    fontFamily: typography.fonts.semiBold,
    fontSize: typography.sizes.md,
    color: colors.text.primary,
    marginBottom: 4,
  },
  guidelineDesc: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  actionTextGroup: {
    marginLeft: 16,
  },
  actionTitle: {
    fontFamily: typography.fonts.semiBold,
    fontSize: typography.sizes.md,
    color: colors.text.primary,
  },
  actionDesc: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.sizes.xs,
    color: colors.text.tertiary,
    marginTop: 2,
  },
});
