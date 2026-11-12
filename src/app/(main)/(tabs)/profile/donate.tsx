// Project LifeOrbit — Donate Programme (donor card + special donor card)
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import {
  Heart,
  QrCode,
  CalendarDays,
  ShieldCheck,
  Award,
  Building2,
  Droplet,
} from 'lucide-react-native';
import { Screen } from '@/components/layout/Screen';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/features/auth/stores/authStore';
import {
  donationService,
  type DonorCard,
  type DonorCardStatus,
} from '@/features/donations/services/donationService';
import { Colors } from '@/constants/colors';
import { FontFamily, FontSize } from '@/constants/typography';
import { BorderRadius, Spacing } from '@/constants/spacing';

const CARD_BENEFITS = [
  {
    icon: QrCode,
    title: 'One card code',
    desc: 'Your code and QR stay the same at every hospital, blood bank, and drive',
  },
  {
    icon: ShieldCheck,
    title: 'Verified recording',
    desc: 'Only verified health workers can record a donation, so your history is trusted',
  },
  {
    icon: Award,
    title: 'Special donor card',
    desc: 'Reach the first donation level and a hospital or blood bank can approve your card',
  },
];

function describeError(err: unknown): string {
  if (
    typeof err === 'object' &&
    err !== null &&
    'message' in err &&
    typeof (err as { message: unknown }).message === 'string' &&
    (err as { message: string }).message.length > 0
  ) {
    return (err as { message: string }).message;
  }
  return 'Something went wrong. Please try again.';
}

function formatDate(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function statusColor(status: DonorCardStatus): string {
  switch (status) {
    case 'active':
      return Colors.semantic.success.DEFAULT;
    case 'suspended':
      return Colors.semantic.warning.DEFAULT;
    case 'revoked':
      return Colors.semantic.critical.DEFAULT;
    default:
      return Colors.dark.tertiary;
  }
}

function statusLabel(status: DonorCardStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export default function DonateScreen() {
  const { profile } = useAuthStore();

  const [card, setCard] = useState<DonorCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const loadCard = useCallback(async () => {
    setLoadError(null);
    try {
      setCard(await donationService.getMyCard());
    } catch (err) {
      setLoadError(describeError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCard();
  }, [loadCard]);

  const handleJoin = async () => {
    setJoining(true);
    try {
      setCard(await donationService.joinProgramme());
    } catch (err) {
      Alert.alert('Could not join', describeError(err));
    } finally {
      setJoining(false);
    }
  };

  const handleLeave = () => {
    Alert.alert(
      'Leave the programme?',
      'Your card code will stop working at donation drives. Your special donor card, if you have one, stays valid and viewable.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            setLeaving(true);
            try {
              await donationService.leaveProgramme();
              setCard(await donationService.getMyCard());
            } catch (err) {
              Alert.alert('Could not leave', describeError(err));
            } finally {
              setLeaving(false);
            }
          },
        },
      ]
    );
  };

  const isActive = card?.isActive === true;
  const specialCard = card?.specialCard ?? null;
  const firstLevel = card?.levels[0] ?? null;
  const progressTarget = specialCard?.nextLevel?.minDonations ?? firstLevel?.minDonations ?? 0;
  const progressCurrent = card?.recognitionCount ?? 0;
  const progress = progressTarget > 0 ? Math.min(1, progressCurrent / progressTarget) : 0;
  const progressWidth = `${Math.round(progress * 100)}%` as `${number}%`;

  return (
    <View style={{ flex: 1 }}>
      <Header title="Donor Card" showBack variant="brand" />
      <Screen scrollable padding>
        {loading ? (
          <Text style={styles.muted}>Loading…</Text>
        ) : loadError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{loadError}</Text>
            <Button title="Try again" variant="outline" size="sm" onPress={() => void loadCard()} />
          </View>
        ) : (
          <>
            {isActive && card && (
              <Card variant="elevated" padding="lg" style={styles.donorCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderText}>
                    <Text style={styles.cardLabel}>DONOR CARD</Text>
                    <Text style={styles.cardName}>
                      {profile?.display_name || 'BloodIn member'}
                    </Text>
                    {profile?.blood_group && (
                      <View style={styles.bloodChip}>
                        <Text style={styles.bloodChipText}>{profile.blood_group}</Text>
                      </View>
                    )}
                  </View>
                  <Heart size={24} color={Colors.primary.DEFAULT} fill={Colors.primary.DEFAULT} />
                </View>

                <View style={styles.qrBox}>
                  <QRCode
                    value={`BLOODIN:${card.memberCode}`}
                    size={168}
                    color={Colors.dark.DEFAULT}
                    backgroundColor={Colors.white}
                  />
                </View>

                <Text style={styles.codeLabel}>Card code</Text>
                <Text selectable style={styles.codeText}>
                  {card.memberCode}
                </Text>
                <Text style={styles.codeHint}>
                  Show this QR or give this code to a verified health worker when you donate.
                </Text>

                <View style={styles.statsRow}>
                  <View style={styles.stat}>
                    <Text style={styles.statValue}>{card.recognitionCount}</Text>
                    <Text style={styles.statLabel}>Donations</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.stat}>
                    <Text style={styles.statValue}>{formatDate(card.lastRecognitionDate)}</Text>
                    <Text style={styles.statLabel}>Last donation</Text>
                  </View>
                </View>
              </Card>
            )}

            {specialCard ? (
              <Card variant="elevated" padding="lg" style={styles.specialCard}>
                <View style={styles.specialHeader}>
                  <View style={styles.specialTitleRow}>
                    <View style={styles.specialIcon}>
                      <Award size={22} color={Colors.white} />
                    </View>
                    <View style={styles.specialTitleText}>
                      <Text style={styles.specialLabel}>SPECIAL DONOR CARD</Text>
                      <Text style={styles.specialLevel}>{specialCard.levelLabel}</Text>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.statusChip,
                      { backgroundColor: `${statusColor(specialCard.status)}18` },
                    ]}
                  >
                    <Text
                      style={[styles.statusText, { color: statusColor(specialCard.status) }]}
                    >
                      {statusLabel(specialCard.status)}
                    </Text>
                  </View>
                </View>

                <View style={styles.specialRow}>
                  <Building2 size={16} color={Colors.dark.tertiary} />
                  <View style={styles.specialRowText}>
                    <Text style={styles.specialRowLabel}>Approved by</Text>
                    <Text style={styles.specialRowValue}>
                      {specialCard.approvedByOrganizationName ?? 'Approved facility'}
                    </Text>
                  </View>
                </View>

                <View style={styles.specialRow}>
                  <CalendarDays size={16} color={Colors.dark.tertiary} />
                  <View style={styles.specialRowText}>
                    <Text style={styles.specialRowLabel}>Issued</Text>
                    <Text style={styles.specialRowValue}>{formatDate(specialCard.issuedAt)}</Text>
                  </View>
                </View>

                <View style={styles.specialRow}>
                  <ShieldCheck size={16} color={Colors.dark.tertiary} />
                  <View style={styles.specialRowText}>
                    <Text style={styles.specialRowLabel}>Expires</Text>
                    <Text style={styles.specialRowValue}>
                      {specialCard.expiresAt ? formatDate(specialCard.expiresAt) : 'No expiry'}
                    </Text>
                  </View>
                </View>

                <View style={styles.benefitBox}>
                  <View style={styles.benefitHeader}>
                    <Droplet size={16} color={Colors.primary.DEFAULT} />
                    <Text style={styles.coverageTitle}>Free blood coverage</Text>
                  </View>
                  <Text style={styles.benefitText}>
                    {specialCard.freeBloodEnabled
                      ? specialCard.freeBloodTerms ??
                        'The approving facility covers free blood under its own terms.'
                      : 'The approving facility has not set free blood coverage yet. Ask them for their terms.'}
                  </Text>
                </View>

                {specialCard.nextLevel && (
                  <View style={styles.progressWrap}>
                    <View style={styles.progressLabelRow}>
                      <Text style={styles.progressLabel}>Next: {specialCard.nextLevel.label}</Text>
                      <Text style={styles.progressValue}>
                        {progressCurrent}/{specialCard.nextLevel.minDonations}
                      </Text>
                    </View>
                    <View style={styles.progressTrack}>
                      <View style={[styles.progressFill, { width: progressWidth }]} />
                    </View>
                    <Text style={styles.progressHint}>
                      {specialCard.donationsToNextLevel} more{' '}
                      {specialCard.donationsToNextLevel === 1 ? 'donation' : 'donations'} to
                      reach the next level.
                    </Text>
                  </View>
                )}
              </Card>
            ) : isActive && card ? (
              <Card variant="outlined" padding="lg" style={styles.notIssuedCard}>
                <View style={styles.notIssuedHeader}>
                  <Award size={20} color={Colors.dark.tertiary} />
                  <Text style={styles.notIssuedTitle}>Special donor card</Text>
                </View>
                <Text style={styles.notIssuedText}>
                  Not issued yet. A verified hospital or blood bank can approve your special card
                  once you reach the first donation level.
                </Text>
                {firstLevel && (
                  <View style={styles.progressWrap}>
                    <View style={styles.progressLabelRow}>
                      <Text style={styles.progressLabel}>
                        Progress to {firstLevel.label}
                      </Text>
                      <Text style={styles.progressValue}>
                        {progressCurrent}/{firstLevel.minDonations}
                      </Text>
                    </View>
                    <View style={styles.progressTrack}>
                      <View style={[styles.progressFill, { width: progressWidth }]} />
                    </View>
                    <Text style={styles.progressHint}>
                      {Math.max(0, firstLevel.minDonations - progressCurrent)} more{' '}
                      {firstLevel.minDonations - progressCurrent === 1 ? 'donation' : 'donations'}{' '}
                      to qualify.
                    </Text>
                  </View>
                )}
              </Card>
            ) : null}

            {!isActive && (
              <View style={styles.hero}>
                <View style={styles.heroBadge}>
                  <Heart size={40} color={Colors.primary.DEFAULT} fill={Colors.primary.DEFAULT} />
                </View>
                <Text style={styles.heroTitle}>
                  {card ? 'Rejoin the Donate Programme' : 'Join the Donate Programme'}
                </Text>
                <Text style={styles.heroSubtitle}>
                  Get a personal card code and QR so verified health workers can record every
                  donation you give.
                </Text>

                <View style={styles.benefits}>
                  {CARD_BENEFITS.map((b) => (
                    <View key={b.title} style={styles.benefitRow}>
                      <View style={styles.benefitIcon}>
                        <b.icon size={18} color={Colors.primary.DEFAULT} />
                      </View>
                      <View style={styles.benefitBody}>
                        <Text style={styles.benefitTitle}>{b.title}</Text>
                        <Text style={styles.benefitDesc}>{b.desc}</Text>
                      </View>
                    </View>
                  ))}
                </View>

                <Button
                  title={joining ? 'Joining…' : 'Join the programme'}
                  onPress={() => void handleJoin()}
                  size="lg"
                  fullWidth
                  isLoading={joining}
                  leftIcon={!joining ? <Heart size={18} color={Colors.white} /> : undefined}
                />
              </View>
            )}

            {isActive && (
              <Button
                title={leaving ? 'Leaving…' : 'Leave the programme'}
                variant="outline"
                onPress={handleLeave}
                isLoading={leaving}
                fullWidth
                style={styles.leaveButton}
              />
            )}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>How it works</Text>
              <View style={styles.steps}>
                <View style={styles.stepRow}>
                  <View style={styles.stepIcon}>
                    <QrCode size={16} color={Colors.primary.DEFAULT} />
                  </View>
                  <View style={styles.stepText}>
                    <Text style={styles.stepTitle}>Join and get your code</Text>
                    <Text style={styles.stepDesc}>
                      Your card code and QR are yours and never change.
                    </Text>
                  </View>
                </View>
                <View style={styles.stepRow}>
                  <View style={styles.stepIcon}>
                    <ShieldCheck size={16} color={Colors.primary.DEFAULT} />
                  </View>
                  <View style={styles.stepText}>
                    <Text style={styles.stepTitle}>Give blood at a verified place</Text>
                    <Text style={styles.stepDesc}>
                      A named health worker at a verified hospital, blood bank, or NGO drive
                      records it for you.
                    </Text>
                  </View>
                </View>
                <View style={styles.stepRow}>
                  <View style={styles.stepIcon}>
                    <Award size={16} color={Colors.primary.DEFAULT} />
                  </View>
                  <View style={styles.stepText}>
                    <Text style={styles.stepTitle}>Earn your special card</Text>
                    <Text style={styles.stepDesc}>
                      {firstLevel
                        ? `Reach ${firstLevel.minDonations} donations and a hospital or blood bank can approve it.`
                        : 'Levels will be confirmed with the blood service.'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </>
        )}
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  muted: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
    color: Colors.dark.secondary,
    textAlign: 'center',
    marginTop: Spacing['3xl'],
  },
  errorBox: {
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing['3xl'],
  },
  errorText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.semantic.critical.DEFAULT,
    textAlign: 'center',
  },
  hero: {
    alignItems: 'center',
    marginTop: Spacing['2xl'],
    marginBottom: Spacing.xl,
  },
  heroBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${Colors.primary.DEFAULT}18`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  heroTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['2xl'],
    color: Colors.dark.DEFAULT,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
    color: Colors.dark.secondary,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing['2xl'],
  },
  benefits: {
    alignSelf: 'stretch',
    marginBottom: Spacing['2xl'],
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
    backgroundColor: `${Colors.primary.DEFAULT}18`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitBody: {
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
  donorCard: {
    marginBottom: Spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  cardHeaderText: {
    flex: 1,
    gap: 4,
  },
  cardLabel: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xs,
    color: Colors.primary.DEFAULT,
    letterSpacing: 1.5,
  },
  cardName: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xl,
    color: Colors.dark.DEFAULT,
  },
  bloodChip: {
    alignSelf: 'flex-start',
    backgroundColor: `${Colors.primary.DEFAULT}14`,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  bloodChipText: {
    fontFamily: FontFamily.semibold,
    fontSize: FontSize.xs,
    color: Colors.primary.DEFAULT,
  },
  qrBox: {
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  codeLabel: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: Colors.dark.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  codeText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['2xl'],
    color: Colors.dark.DEFAULT,
    letterSpacing: 2,
    marginBottom: Spacing.xs,
  },
  codeHint: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.dark.secondary,
    lineHeight: 18,
    marginBottom: Spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.border.DEFAULT,
    paddingTop: Spacing.md,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: Colors.border.DEFAULT,
  },
  statValue: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    color: Colors.dark.DEFAULT,
  },
  statLabel: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.dark.tertiary,
  },
  specialCard: {
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: `${Colors.primary.DEFAULT}33`,
  },
  specialHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  specialTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  specialIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  specialTitleText: {
    flex: 1,
    gap: 2,
  },
  specialLabel: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xs,
    color: Colors.primary.DEFAULT,
    letterSpacing: 1.2,
  },
  specialLevel: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    color: Colors.dark.DEFAULT,
  },
  statusChip: {
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  statusText: {
    fontFamily: FontFamily.semibold,
    fontSize: FontSize.xs,
  },
  specialRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  specialRowText: {
    flex: 1,
    gap: 1,
  },
  specialRowLabel: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.dark.tertiary,
  },
  specialRowValue: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.dark.DEFAULT,
  },
  benefitBox: {
    backgroundColor: `${Colors.primary.DEFAULT}0D`,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.xs,
  },
  benefitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  coverageTitle: {
    fontFamily: FontFamily.semibold,
    fontSize: FontSize.sm,
    color: Colors.dark.DEFAULT,
  },
  benefitText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.dark.secondary,
    lineHeight: 18,
  },
  progressWrap: {
    marginTop: Spacing.lg,
  },
  progressLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  progressLabel: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: Colors.dark.secondary,
  },
  progressValue: {
    fontFamily: FontFamily.semibold,
    fontSize: FontSize.xs,
    color: Colors.dark.DEFAULT,
  },
  progressTrack: {
    height: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.border.DEFAULT,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary.DEFAULT,
  },
  progressHint: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.dark.tertiary,
    marginTop: Spacing.xs,
  },
  notIssuedCard: {
    marginBottom: Spacing.lg,
  },
  notIssuedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  notIssuedTitle: {
    fontFamily: FontFamily.semibold,
    fontSize: FontSize.md,
    color: Colors.dark.DEFAULT,
  },
  notIssuedText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.dark.secondary,
    lineHeight: 20,
  },
  leaveButton: {
    marginBottom: Spacing['2xl'],
  },
  section: {
    marginBottom: Spacing['3xl'],
  },
  sectionTitle: {
    fontFamily: FontFamily.semibold,
    fontSize: FontSize.md,
    color: Colors.dark.DEFAULT,
    marginBottom: Spacing.md,
  },
  steps: {
    gap: Spacing.lg,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  stepIcon: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.md,
    backgroundColor: `${Colors.primary.DEFAULT}14`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: {
    flex: 1,
  },
  stepTitle: {
    fontFamily: FontFamily.semibold,
    fontSize: FontSize.sm,
    color: Colors.dark.DEFAULT,
  },
  stepDesc: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.dark.secondary,
    marginTop: 2,
    lineHeight: 18,
  },
});
