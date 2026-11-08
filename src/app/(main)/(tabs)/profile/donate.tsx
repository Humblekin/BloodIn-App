// Project LifeOrbit — Donate Programme (donor card + donation recognition)
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import { Heart, QrCode, CalendarDays, ShieldCheck, ScanLine, MapPin, CheckCircle2 } from 'lucide-react-native';
import { Screen } from '@/components/layout/Screen';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/features/auth/stores/authStore';
import {
  donationService,
  type DonorCard,
} from '@/features/donations/services/donationService';
import { Colors } from '@/constants/colors';
import { FontFamily, FontSize } from '@/constants/typography';
import { BorderRadius, Spacing } from '@/constants/spacing';

const CARD_BENEFITS = [
  {
    icon: QrCode,
    title: 'Donor card',
    desc: 'A unique card code and QR that volunteers read at a donation drive',
  },
  {
    icon: CalendarDays,
    title: 'Recognition ledger',
    desc: 'Each recognised donation is recorded with its date',
  },
  {
    icon: ShieldCheck,
    title: 'Optional',
    desc: 'Leave anytime; your card stops working but your history is kept',
  },
];

function getTodayIso(): string {
  const now = new Date();
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

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

export default function DonateScreen() {
  const router = useRouter();
  const { profile } = useAuthStore();

  const [card, setCard] = useState<DonorCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const [code, setCode] = useState('');
  const [date, setDate] = useState(getTodayIso);
  const [place, setPlace] = useState('');
  const [recognising, setRecognising] = useState(false);

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
      'Your donor card will stop working. Recognitions already recorded are kept.',
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

  const handleRecognise = async () => {
    const trimmed = code.replace(/\s+/g, '').toUpperCase();
    if (trimmed.length < 6) {
      Alert.alert('Enter the card code', 'The card code has at least 6 characters.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      Alert.alert('Check the date', 'Use the format YYYY-MM-DD.');
      return;
    }
    if (date > getTodayIso()) {
      Alert.alert('Check the date', 'The donation date cannot be in the future.');
      return;
    }

    setRecognising(true);
    try {
      const record = await donationService.recogniseDonation({
        donorCode: trimmed,
        donationDate: date,
        locationLabel: place.trim() || undefined,
      });
      setCode('');
      setPlace('');
      Alert.alert('Donation recorded', `The donation of ${record.donationDate} was recognised.`);
      await loadCard();
    } catch (err) {
      Alert.alert('Could not record donation', describeError(err));
    } finally {
      setRecognising(false);
    }
  };

  const isActive = card?.isActive === true;

  return (
    <View style={{ flex: 1 }}>
      <Header title="Donate Programme" showBack variant="brand" />
      <Screen scrollable padding keyboardAvoiding>
        {loading ? (
          <Text style={styles.muted}>Loading…</Text>
        ) : loadError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{loadError}</Text>
            <Button title="Try again" variant="outline" size="sm" onPress={() => void loadCard()} />
          </View>
        ) : (
          <>
            {!isActive ? (
              <View style={styles.hero}>
                <View style={styles.heroBadge}>
                  <Heart size={40} color={Colors.primary.DEFAULT} fill={Colors.primary.DEFAULT} />
                </View>
                <Text style={styles.heroTitle}>Join the Donate Programme</Text>
                <Text style={styles.heroSubtitle}>
                  Get a personal donor card with a QR code so donation drives can recognise every
                  unit you give.
                </Text>

                <View style={styles.benefits}>
                  {CARD_BENEFITS.map((b) => (
                    <View key={b.title} style={styles.benefitRow}>
                      <View style={styles.benefitIcon}>
                        <b.icon size={18} color={Colors.primary.DEFAULT} />
                      </View>
                      <View style={styles.benefitText}>
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
            ) : (
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
                  Share this code, or let a volunteer scan the QR, to record your donations.
                </Text>

                <View style={styles.statsRow}>
                  <View style={styles.stat}>
                    <Text style={styles.statValue}>{card.recognitionCount}</Text>
                    <Text style={styles.statLabel}>Recognitions</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.stat}>
                    <Text style={styles.statValue}>{card.lastRecognitionDate ?? '—'}</Text>
                    <Text style={styles.statLabel}>Last donation</Text>
                  </View>
                </View>
              </Card>
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
              <Text style={styles.sectionTitle}>Recognise a donation</Text>
              <Text style={styles.sectionDesc}>
                Volunteers and organisers can record a donation for a donor by entering the card
                code from their donor card.
              </Text>

              <Input
                label="Donor card code"
                value={code}
                onChangeText={setCode}
                autoCapitalize="characters"
                autoCorrect={false}
                placeholder="e.g. 3F9A2C7B1D4E"
                leftIcon={<ScanLine size={18} color={Colors.dark.tertiary} />}
                containerStyle={styles.field}
              />
              <Input
                label="Donation date"
                value={date}
                onChangeText={setDate}
                keyboardType="numbers-and-punctuation"
                placeholder="YYYY-MM-DD"
                maxLength={10}
                leftIcon={<CalendarDays size={18} color={Colors.dark.tertiary} />}
                hint="Defaults to today"
                containerStyle={styles.field}
              />
              <Input
                label="Location (optional)"
                value={place}
                onChangeText={setPlace}
                placeholder="e.g. National Blood Centre, Accra"
                leftIcon={<MapPin size={18} color={Colors.dark.tertiary} />}
                containerStyle={styles.field}
              />
              <Button
                title={recognising ? 'Recording…' : 'Record donation'}
                onPress={() => void handleRecognise()}
                isLoading={recognising}
                fullWidth
                leftIcon={!recognising ? <CheckCircle2 size={18} color={Colors.white} /> : undefined}
                style={styles.recogniseButton}
              />
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
    marginBottom: Spacing.xs,
  },
  sectionDesc: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.dark.secondary,
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  field: {
    marginBottom: Spacing.md,
  },
  recogniseButton: {
    marginTop: Spacing.xs,
  },
});
