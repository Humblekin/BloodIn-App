import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Star, Zap, Heart, ShieldCheck, Users, TrendingUp } from 'lucide-react-native';
import { Screen } from '@/components/layout/Screen';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { PremiumBadge } from '@/features/premium/components/PremiumBadge';
import {
  PREMIUM_DISPLAY_PRICE,
  premiumService,
} from '@/features/premium/services/premiumService';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { Colors } from '@/constants/colors';
import { FontFamily, FontSize } from '@/constants/typography';
import { BorderRadius, Spacing } from '@/constants/spacing';

const BENEFITS = [
  { icon: TrendingUp, title: 'Boosted Posts', desc: 'Your posts appear at the top of the feed for 48 hours' },
  { icon: ShieldCheck, title: 'Verified Badge', desc: 'Get the premium star badge on your profile' },
  { icon: Zap, title: 'Priority Requests', desc: 'Your blood requests are highlighted and shown first' },
  { icon: Users, title: 'Priority Matching', desc: 'Get matched faster with donors in your network' },
  { icon: Heart, title: 'Support the Mission', desc: 'Your subscription helps keep BloodIn free for everyone' },
];

export default function PremiumScreen() {
  const router = useRouter();
  const { session, profile, fetchProfile } = useAuthStore();
  const [upgrading, setUpgrading] = useState(false);

  const isAlreadyPremium = profile?.is_premium === true;

  const waitForPremium = async (reference: string) => {
    let attempts = 0;
    while (attempts < 40) {
      await new Promise((r) => setTimeout(r, 3000));
      attempts += 1;

      const result = await premiumService.confirmPurchase(reference);
      if (result.paid) {
        await fetchProfile();
        if (useAuthStore.getState().profile?.is_premium) {
          Alert.alert('Welcome to Premium!', 'Your account has been upgraded.', [
            { text: 'OK', onPress: () => router.back() },
          ]);
          return;
        }
        continue;
      }
      if (result.failed || result.status === 'failed') {
        Alert.alert(
          'Payment Not Completed',
          'The payment was not completed. You can try again whenever you are ready.'
        );
        return;
      }
    }
    Alert.alert(
      'Payment Pending',
      'BloodIn could not confirm your payment yet. It will activate automatically once Paystack confirms it.'
    );
  };

  const handleUpgrade = async () => {
    if (!session?.user?.email) {
      Alert.alert('Sign In Required', 'Please sign in before upgrading to Premium.');
      return;
    }
    setUpgrading(true);
    try {
      const result = await premiumService.startPurchase(session.user.id, session.user.email);
      if (result.error || !result.data?.reference) {
        Alert.alert('Upgrade Failed', result.error || 'Could not start the payment.');
        return;
      }
      Alert.alert(
        'Complete Your Payment',
        `Complete the payment of ${PREMIUM_DISPLAY_PRICE} in the browser window that just opened, then return to BloodIn.`
      );
      void waitForPremium(result.data.reference);
    } catch (err) {
      Alert.alert('Upgrade Failed', 'An unexpected error occurred. Please try again.');
    } finally {
      setUpgrading(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <Header title="Premium" showBack variant="brand" />
      <Screen scrollable padding>
        {isAlreadyPremium ? (
          <View style={styles.currentBadge}>
            <PremiumBadge size="md" />
            <Text style={styles.alreadyText}>You are a Premium member</Text>
            <Text style={styles.alreadySubtext}>Thank you for supporting BloodIn.</Text>
          </View>
        ) : (
          <View style={styles.hero}>
            <View style={styles.starBadge}>
              <Star size={40} color={Colors.premium} fill={Colors.premium} />
            </View>
            <Text style={styles.heroTitle}>Upgrade to Premium</Text>
            <Text style={styles.heroSubtitle}>
              Unlock exclusive features and help keep BloodIn free for everyone in need.
            </Text>
          </View>
        )}

        <View style={styles.benefits}>
          <Text style={styles.benefitsTitle}>What you get</Text>
          {BENEFITS.map((b) => (
            <View key={b.title} style={styles.benefitRow}>
              <View style={styles.benefitIcon}>
                <b.icon size={18} color={Colors.premium} />
              </View>
              <View style={styles.benefitText}>
                <Text style={styles.benefitTitle}>{b.title}</Text>
                <Text style={styles.benefitDesc}>{b.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {!isAlreadyPremium && (
          <View style={styles.cta}>
            <Button
              title={upgrading ? 'Starting…' : `Subscribe for ${PREMIUM_DISPLAY_PRICE}`}
              onPress={handleUpgrade}
              size="lg"
              fullWidth
              isLoading={upgrading}
              leftIcon={!upgrading ? <Star size={18} color={Colors.white} /> : undefined}
              style={{ backgroundColor: Colors.premium }}
            />
            <Text style={styles.disclaimer}>
              Payment is handled securely by Paystack. You will be redirected to complete the
              transaction, and Premium activates once the payment is confirmed.
            </Text>
          </View>
        )}
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    marginTop: Spacing['3xl'],
    marginBottom: Spacing['3xl'],
  },
  starBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${Colors.premium}18`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  heroTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['2xl'],
    color: Colors.dark.DEFAULT,
    marginBottom: Spacing.sm,
  },
  heroSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
    color: Colors.dark.secondary,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
  },
  currentBadge: {
    alignItems: 'center',
    marginTop: Spacing['3xl'],
    marginBottom: Spacing['3xl'],
  },
  alreadyText: {
    fontFamily: FontFamily.semibold,
    fontSize: FontSize.lg,
    color: Colors.dark.DEFAULT,
    marginTop: Spacing.md,
  },
  alreadySubtext: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.dark.secondary,
    marginTop: Spacing.xs,
  },
  benefits: {
    marginBottom: Spacing.xl,
  },
  benefitsTitle: {
    fontFamily: FontFamily.semibold,
    fontSize: FontSize.md,
    color: Colors.dark.DEFAULT,
    marginBottom: Spacing.md,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  benefitIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.lg,
    backgroundColor: `${Colors.premium}18`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitText: {
    flex: 1,
  },
  benefitTitle: {
    fontFamily: FontFamily.semibold,
    fontSize: FontSize.sm,
    color: Colors.dark.DEFAULT,
  },
  benefitDesc: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.dark.secondary,
    marginTop: 2,
  },
  cta: {
    marginTop: Spacing.lg,
    marginBottom: Spacing['3xl'],
  },
  disclaimer: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.dark.tertiary,
    textAlign: 'center',
    marginTop: Spacing.md,
    lineHeight: 18,
  },
});
