import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Image, Alert } from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';
import { typography } from '@/constants/typography';
import { useBloodRequests } from '@/features/requests/hooks/useBloodRequests';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { UrgencyBadge } from '@/features/requests/components/UrgencyBadge';
import { MapPin, Clock, Phone, AlertCircle, MessageCircle } from 'lucide-react-native';
import type { BloodRequestRow, RequestResponseRow } from '@/features/requests/services/requestService';

export default function RequestDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { session } = useAuthStore();
  const { fetchRequestById, offerToHelp, fetchResponses, loading } = useBloodRequests();
  
  const [request, setRequest] = useState<BloodRequestRow | null>(null);
  const [responses, setResponses] = useState<RequestResponseRow[]>([]);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    if (!id || typeof id !== 'string') return;

    // Only fetch real records — mock/preview ids (e.g. "mock-2") are not UUIDs.
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (!isUuid) {
      setIsFetching(false);
      return;
    }

    try {
      setIsFetching(true);
      const req = await fetchRequestById(id);
      setRequest(req);
      
      if (req) {
        const resps = await fetchResponses(req.id);
        setResponses(resps);
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to load request details');
    } finally {
      setIsFetching(false);
    }
  };

  const handleOfferHelp = async () => {
    if (!session?.user.id || !request) return;
    
    Alert.prompt(
      'Offer to Help',
      'Add an optional message to the requester:',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Send Offer', 
          onPress: async (msg?: string) => {
            try {
              await offerToHelp(request.id, session.user.id, msg);
              Alert.alert('Success', 'Your offer has been sent.');
              loadData(); // refresh
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to send offer');
            }
          }
        }
      ]
    );
  };

  const isOwner = session?.user.id === request?.requester_id;
  const hasOffered = responses.some(r => r.responder_id === session?.user.id);

  if (isFetching) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary.default} />
      </View>
    );
  }

  if (!request) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.notFoundText}>This request could not be found.</Text>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen options={{ title: 'Request Details' }} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.headerCard}>
          <View style={styles.requesterInfoRow}>
            {request.requester_profile?.avatar_url ? (
              <Image source={{ uri: request.requester_profile.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]} />
            )}
            <View style={styles.requesterTextGroup}>
              <Text style={styles.requesterName}>{request.requester_profile?.display_name || 'Anonymous'}</Text>
              <Text style={styles.postedTime}>Posted {new Date(request.created_at).toLocaleDateString()}</Text>
            </View>
            <UrgencyBadge level={request.urgency_level} />
          </View>

          <View style={styles.bloodInfoGroup}>
            <View style={styles.bloodGroupBadge}>
              <Text style={styles.bloodGroupText}>{request.blood_group}</Text>
            </View>
            <View style={styles.unitsGroup}>
              <Text style={styles.unitsValue}>{request.units_required}</Text>
              <Text style={styles.unitsLabel}>Units Needed</Text>
            </View>
          </View>
        </View>

        <View style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>Details</Text>
          
          <View style={styles.detailRow}>
            <MapPin size={20} color={colors.primary.default} />
            <View style={styles.detailTextGroup}>
              <Text style={styles.detailLabel}>Location</Text>
              <Text style={styles.detailValue}>{request.hospital_name}</Text>
            </View>
          </View>
          
          {request.contact_number && (
            <View style={styles.detailRow}>
              <Phone size={20} color={colors.primary.default} />
              <View style={styles.detailTextGroup}>
                <Text style={styles.detailLabel}>Contact</Text>
                <Text style={styles.detailValue}>{request.contact_number}</Text>
              </View>
            </View>
          )}

          <View style={styles.detailRow}>
            <Clock size={20} color={colors.primary.default} />
            <View style={styles.detailTextGroup}>
              <Text style={styles.detailLabel}>Expires At</Text>
              <Text style={styles.detailValue}>{new Date(request.expires_at).toLocaleDateString()}</Text>
            </View>
          </View>

          {request.additional_notes && (
            <View style={styles.notesContainer}>
              <Text style={styles.detailLabel}>Additional Notes</Text>
              <Text style={styles.notesText}>{request.additional_notes}</Text>
            </View>
          )}
        </View>

        {isOwner ? (
          <View style={styles.responsesCard}>
            <Text style={styles.sectionTitle}>Responses ({responses.length})</Text>
            {responses.length === 0 ? (
              <Text style={styles.emptyText}>No responses yet.</Text>
            ) : (
              responses.map(resp => (
                <View key={resp.id} style={styles.responseItem}>
                  <View style={styles.responseHeader}>
                    {resp.responder_profile?.avatar_url ? (
                      <Image source={{ uri: resp.responder_profile.avatar_url }} style={styles.smallAvatar} />
                    ) : (
                      <View style={[styles.smallAvatar, styles.avatarPlaceholder]} />
                    )}
                    <Text style={styles.responderName}>{resp.responder_profile?.display_name || 'User'}</Text>
                    <View style={styles.responseStatusBadge}>
                      <Text style={styles.responseStatusText}>{resp.status}</Text>
                    </View>
                  </View>
                  {resp.message && <Text style={styles.responseMessage}>"{resp.message}"</Text>}
                </View>
              ))
            )}
          </View>
        ) : (
          <View style={styles.actionContainer}>
            <View style={styles.disclaimerBox}>
              <AlertCircle size={16} color={colors.status.warning} />
              <Text style={styles.disclaimerText}>
                By offering to help, you agree to coordinate with the requester. Do not donate if you are unwell or have donated in the last 3 months.
              </Text>
            </View>
            
            {hasOffered ? (
              <View style={styles.successBox}>
                <Text style={styles.successText}>You have offered to help!</Text>
              </View>
            ) : (
              <Pressable 
                style={[styles.primaryButton, loading && styles.disabledButton]}
                onPress={handleOfferHelp}
                disabled={loading}
              >
                <Text style={styles.primaryButtonText}>Offer to Donate</Text>
              </Pressable>
            )}
          </View>
        )}

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
  notFoundText: {
    fontFamily: typography.fonts.medium,
    fontSize: typography.sizes.md,
    color: colors.text.secondary,
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: colors.primary.default,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backButtonText: {
    fontFamily: typography.fonts.semiBold,
    fontSize: typography.sizes.md,
    color: colors.text.inverse,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  headerCard: {
    backgroundColor: colors.background.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  requesterInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  avatarPlaceholder: {
    backgroundColor: colors.border.default,
  },
  requesterTextGroup: {
    flex: 1,
  },
  requesterName: {
    fontFamily: typography.fonts.semiBold,
    fontSize: typography.sizes.md,
    color: colors.text.primary,
  },
  postedTime: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.sizes.xs,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  bloodInfoGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  bloodGroupBadge: {
    backgroundColor: colors.primary.light,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bloodGroupText: {
    fontFamily: typography.fonts.bold,
    fontSize: typography.sizes['2xl'],
    color: colors.primary.default,
  },
  unitsGroup: {
    alignItems: 'center',
  },
  unitsValue: {
    fontFamily: typography.fonts.bold,
    fontSize: typography.sizes.xl,
    color: colors.text.primary,
  },
  unitsLabel: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
  },
  detailsCard: {
    backgroundColor: colors.background.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  sectionTitle: {
    fontFamily: typography.fonts.bold,
    fontSize: typography.sizes.lg,
    color: colors.text.primary,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  detailTextGroup: {
    marginLeft: 12,
    flex: 1,
  },
  detailLabel: {
    fontFamily: typography.fonts.medium,
    fontSize: typography.sizes.xs,
    color: colors.text.secondary,
    marginBottom: 2,
  },
  detailValue: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.sizes.md,
    color: colors.text.primary,
  },
  notesContainer: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  notesText: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.sizes.md,
    color: colors.text.primary,
    marginTop: 8,
    lineHeight: 22,
  },
  responsesCard: {
    backgroundColor: colors.background.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
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
  responseItem: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  responseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  smallAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  responderName: {
    fontFamily: typography.fonts.medium,
    fontSize: typography.sizes.sm,
    color: colors.text.primary,
    flex: 1,
  },
  responseStatusBadge: {
    backgroundColor: colors.status.success + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  responseStatusText: {
    fontFamily: typography.fonts.semiBold,
    fontSize: typography.sizes.xs,
    color: colors.status.success,
  },
  responseMessage: {
    fontFamily: typography.fonts.italic,
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    backgroundColor: colors.background.default,
    padding: 8,
    borderRadius: 8,
  },
  actionContainer: {
    marginTop: 8,
  },
  disclaimerBox: {
    flexDirection: 'row',
    backgroundColor: colors.status.warning + '10',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.status.warning + '30',
  },
  disclaimerText: {
    flex: 1,
    marginLeft: 8,
    fontFamily: typography.fonts.regular,
    fontSize: typography.sizes.xs,
    color: colors.status.warning,
    lineHeight: 18,
  },
  successBox: {
    backgroundColor: colors.status.success + '10',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.status.success + '30',
  },
  successText: {
    fontFamily: typography.fonts.semiBold,
    fontSize: typography.sizes.md,
    color: colors.status.success,
  },
  primaryButton: {
    backgroundColor: colors.primary.default,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
  primaryButtonText: {
    fontFamily: typography.fonts.semiBold,
    fontSize: typography.sizes.md,
    color: colors.text.inverse,
  },
});
