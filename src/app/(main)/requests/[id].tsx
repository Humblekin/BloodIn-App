import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlertCircle, ArrowLeft, Check, Clock, Droplet, MapPin, Phone } from 'lucide-react-native';
import { colors } from '@/constants/colors';
import { typography } from '@/constants/typography';
import { useBloodRequests } from '@/features/requests/hooks/useBloodRequests';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { UrgencyBadge } from '@/features/requests/components/UrgencyBadge';
import type { BloodRequestRow, RequestResponseRow } from '@/features/requests/services/requestService';
import { requestService } from '@/features/requests/services/requestService';
import { isRealId } from '@/utils/ids';

export default function RequestDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { session } = useAuthStore();
  const { fetchRequestById, offerToHelp, fetchResponses, loading } = useBloodRequests();
  const [request, setRequest] = useState<BloodRequestRow | null>(null);
  const [responses, setResponses] = useState<RequestResponseRow[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [offerVisible, setOfferVisible] = useState(false);
  const [offerMessage, setOfferMessage] = useState('');
  const [sendingOffer, setSendingOffer] = useState(false);

  const photoWidth = Math.min(width * 0.56, 224);
  const photoHeight = Math.min(height * 0.38, 324);
  const heroHeight = Math.min(480, Math.max(310, height * 0.55));

  useEffect(() => {
    void loadData();
  }, [id]);

  const loadData = async () => {
    if (!id || typeof id !== 'string') return;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    try {
      setIsFetching(true);
      const loadedRequest = isUuid
        ? await fetchRequestById(id)
        : await requestService.getRequestById(id);
      setRequest(loadedRequest);
      if (loadedRequest) {
        const loadedResponses = isUuid
          ? await fetchResponses(loadedRequest.id)
          : await requestService.getResponses(loadedRequest.id);
        setResponses(loadedResponses);
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to load request details');
    } finally {
      setIsFetching(false);
    }
  };

  const handleOfferHelp = () => {
    if (!session?.user.id || !request) return;
    if (!isRealId(request.id)) {
      Alert.alert('Demo request', 'Offer to help works for real requests in the network.');
      return;
    }
    setOfferMessage('');
    setOfferVisible(true);
  };

  const sendOffer = async () => {
    if (!session?.user.id || !request || sendingOffer) return;
    setSendingOffer(true);
    try {
      await offerToHelp(request.id, session.user.id, offerMessage.trim() || undefined);
      setOfferVisible(false);
      setOfferMessage('');
      Alert.alert('Success', 'Your offer has been sent.');
      await loadData();
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to send offer');
    } finally {
      setSendingOffer(false);
    }
  };

  const isOwner = session?.user.id === request?.requester_id;
  const hasOffered = responses.some((response) => response.responder_id === session?.user.id);

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
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.redHero, { height: heroHeight, paddingTop: insets.top + 10 }]}>
          <View style={styles.heroTopBar}>
            <Pressable style={styles.heroBackButton} onPress={() => router.back()} accessibilityLabel="Go back">
              <ArrowLeft size={20} color={colors.text.inverse} />
            </Pressable>
          </View>
          <ImageBackground
            source={require('../../../../assets/images/blood_donation_care.jpg')}
            style={[styles.detailPhoto, { width: photoWidth, height: photoHeight }]}
            imageStyle={styles.detailPhotoImage}
            accessibilityLabel="A donor receiving care during a blood donation"
          />
        </View>

        <View style={styles.requestPanel}>
          <View style={styles.metricsRow}>
            <Metric value={request.blood_group} label="Blood Type" />
            <Metric value={String(request.units_required)} label="Units Needed" />
            <Metric value={String(responses.length)} label="Offers" />
          </View>
          <Text style={styles.storyTitle}>One Drop Can Save a Life</Text>
          <Text style={styles.storyCopy}>Coordinate directly with the requester using the details below.</Text>
        </View>

        <View style={styles.detailsCard}>
          <View style={styles.requesterInfoRow}>
            {request.requester_profile?.avatar_url ? (
              <Image source={{ uri: request.requester_profile.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]} />
            )}
            <View style={styles.requesterTextGroup}>
              <Text style={styles.requesterName} numberOfLines={1}>
                {request.requester_profile?.display_name || 'Anonymous'}
              </Text>
              <Text style={styles.postedTime}>Posted {new Date(request.created_at).toLocaleDateString()}</Text>
            </View>
            <UrgencyBadge level={request.urgency_level} />
          </View>
          <Text style={styles.sectionTitle}>Request details</Text>
          <DetailRow icon={<MapPin size={18} color={colors.primary.default} />} label="Location" value={request.hospital_name} />
          {request.contact_number ? (
            <DetailRow icon={<Phone size={18} color={colors.primary.default} />} label="Contact" value={request.contact_number} />
          ) : null}
          <DetailRow icon={<Clock size={18} color={colors.primary.default} />} label="Expires" value={new Date(request.expires_at).toLocaleDateString()} />
          {request.additional_notes ? (
            <View style={styles.notesContainer}>
              <Text style={styles.detailLabel}>Additional notes</Text>
              <Text style={styles.notesText}>{request.additional_notes}</Text>
            </View>
          ) : null}
        </View>

        {isOwner ? (
          <View style={styles.responsesCard}>
            <Text style={styles.sectionTitle}>Responses ({responses.length})</Text>
            {responses.length === 0 ? (
              <Text style={styles.emptyText}>No responses yet.</Text>
            ) : responses.map((response) => (
              <View key={response.id} style={styles.responseItem}>
                <View style={styles.responseHeader}>
                  {response.responder_profile?.avatar_url ? (
                    <Image source={{ uri: response.responder_profile.avatar_url }} style={styles.smallAvatar} />
                  ) : <View style={[styles.smallAvatar, styles.avatarPlaceholder]} />}
                  <Text style={styles.responderName} numberOfLines={1}>
                    {response.responder_profile?.display_name || 'User'}
                  </Text>
                  <Text style={styles.responseStatus}>{response.status}</Text>
                </View>
                {response.message ? <Text style={styles.responseMessage}>{response.message}</Text> : null}
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.disclaimerBox}>
            <AlertCircle size={16} color={colors.status.warning} />
            <Text style={styles.disclaimerText}>
              Coordinate with the requester. Do not donate if you are unwell or have donated in the last 3 months.
            </Text>
          </View>
        )}
      </ScrollView>

      {!isOwner ? (
        <View style={[styles.bottomAction, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <Pressable
            style={[styles.donateAction, hasOffered && styles.donateActionComplete, loading && styles.disabledButton]}
            onPress={handleOfferHelp}
            disabled={loading || hasOffered}
            accessibilityRole="button"
          >
            <View style={styles.actionIcon}>
              <Droplet size={17} color={colors.primary.default} />
            </View>
            <Text style={styles.donateActionText}>{hasOffered ? 'Offer Sent' : 'Donate Now'}</Text>
            <View style={styles.actionIcon}>
              <Check size={17} color={colors.primary.default} />
            </View>
          </Pressable>
        </View>
      ) : null}

      <Modal visible={offerVisible} transparent animationType="slide" onRequestClose={() => setOfferVisible(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Offer to Help</Text>
            <Text style={styles.modalSubtitle}>Add an optional message to the requester:</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Message (optional)"
              placeholderTextColor={colors.text.tertiary}
              value={offerMessage}
              onChangeText={setOfferMessage}
              multiline
              numberOfLines={3}
              underlineColorAndroid="transparent"
            />
            <View style={styles.modalActions}>
              <Pressable style={[styles.modalButton, styles.modalCancel]} onPress={() => setOfferVisible(false)} disabled={sendingOffer}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.modalButton, styles.modalConfirm, sendingOffer && styles.disabledButton]} onPress={sendOffer} disabled={sendingOffer}>
                {sendingOffer ? <ActivityIndicator size="small" color={colors.text.inverse} /> : <Text style={styles.modalConfirmText}>Send Offer</Text>}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.metricGroup}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      {icon}
      <View style={styles.detailTextGroup}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.default },
  center: { justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingBottom: 24 },
  redHero: { alignItems: 'center', backgroundColor: colors.primary.default, paddingHorizontal: 16, paddingBottom: 52 },
  heroTopBar: { width: '100%', flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  heroBackButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  detailPhoto: {
    overflow: 'hidden',
    borderTopLeftRadius: 120,
    borderTopRightRadius: 120,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    borderWidth: 3,
    borderColor: colors.text.inverse,
  },
  detailPhotoImage: {
    borderTopLeftRadius: 120,
    borderTopRightRadius: 120,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  requestPanel: { backgroundColor: colors.background.card, borderRadius: 20, padding: 16, marginTop: -28, marginHorizontal: 16, marginBottom: 14, zIndex: 1 },
  requesterInfoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
  avatarPlaceholder: { backgroundColor: colors.border.default },
  requesterTextGroup: { flex: 1, minWidth: 0 },
  requesterName: { fontFamily: typography.fonts.semiBold, fontSize: typography.sizes.md, color: colors.text.primary },
  postedTime: { fontFamily: typography.fonts.regular, fontSize: typography.sizes.xs, color: colors.text.tertiary, marginTop: 2 },
  metricsRow: { flexDirection: 'row', paddingVertical: 14, borderTopWidth: 1, borderTopColor: colors.border.light },
  metricGroup: { flex: 1, alignItems: 'center' },
  metricValue: { fontFamily: typography.fonts.bold, fontSize: typography.sizes.lg, color: colors.primary.default },
  metricLabel: { fontFamily: typography.fonts.regular, fontSize: typography.sizes.xs, color: colors.text.secondary, textAlign: 'center' },
  storyTitle: { marginTop: 8, color: colors.text.primary, fontFamily: typography.fonts.semiBold, fontSize: typography.sizes.lg, textAlign: 'center' },
  storyCopy: { marginTop: 6, color: colors.text.secondary, fontFamily: typography.fonts.regular, fontSize: typography.sizes.sm, textAlign: 'center' },
  notFoundText: { fontFamily: typography.fonts.medium, fontSize: typography.sizes.md, color: colors.text.secondary, marginBottom: 16 },
  backButton: { backgroundColor: colors.primary.default, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 },
  backButtonText: { fontFamily: typography.fonts.semiBold, fontSize: typography.sizes.md, color: colors.text.inverse },
  detailsCard: { backgroundColor: colors.background.card, borderRadius: 12, padding: 16, marginHorizontal: 16, marginBottom: 14 },
  sectionTitle: { fontFamily: typography.fonts.bold, fontSize: typography.sizes.md, color: colors.text.primary, marginBottom: 14 },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  detailTextGroup: { marginLeft: 12, flex: 1 },
  detailLabel: { fontFamily: typography.fonts.medium, fontSize: typography.sizes.xs, color: colors.text.secondary, marginBottom: 2 },
  detailValue: { fontFamily: typography.fonts.regular, fontSize: typography.sizes.md, color: colors.text.primary },
  notesContainer: { marginTop: 8, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.border.light },
  notesText: { fontFamily: typography.fonts.regular, fontSize: typography.sizes.md, color: colors.text.primary, marginTop: 6, lineHeight: 22 },
  responsesCard: { backgroundColor: colors.background.card, borderRadius: 12, padding: 16, marginHorizontal: 16, marginBottom: 16 },
  emptyText: { fontFamily: typography.fonts.regular, fontSize: typography.sizes.md, color: colors.text.tertiary, textAlign: 'center', padding: 20 },
  responseItem: { marginBottom: 14, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  responseHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  smallAvatar: { width: 24, height: 24, borderRadius: 12, marginRight: 8 },
  responderName: { fontFamily: typography.fonts.medium, fontSize: typography.sizes.sm, color: colors.text.primary, flex: 1 },
  responseStatus: { color: colors.status.success, fontFamily: typography.fonts.semiBold, fontSize: typography.sizes.xs },
  responseMessage: { fontFamily: typography.fonts.regular, fontSize: typography.sizes.sm, color: colors.text.secondary, backgroundColor: colors.background.default, padding: 8, borderRadius: 8 },
  disclaimerBox: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: colors.status.warning + '10', padding: 12, borderRadius: 8, marginHorizontal: 16, marginBottom: 16 },
  disclaimerText: { flex: 1, marginLeft: 8, fontFamily: typography.fonts.regular, fontSize: typography.sizes.xs, color: colors.status.warning, lineHeight: 18 },
  bottomAction: { backgroundColor: colors.background.card, paddingHorizontal: 16, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border.light },
  donateAction: { minHeight: 52, borderRadius: 28, backgroundColor: colors.primary.default, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  donateActionComplete: { opacity: 0.8 },
  actionIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.background.card, alignItems: 'center', justifyContent: 'center' },
  donateActionText: { flex: 1, color: colors.text.inverse, fontFamily: typography.fonts.semiBold, fontSize: typography.sizes.md, textAlign: 'center' },
  disabledButton: { opacity: 0.5 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 },
  modalContainer: { backgroundColor: colors.background.card, borderRadius: 16, padding: 20 },
  modalTitle: { fontFamily: typography.fonts.bold, fontSize: typography.sizes.lg, color: colors.text.primary },
  modalSubtitle: { fontFamily: typography.fonts.regular, fontSize: typography.sizes.sm, color: colors.text.secondary, marginTop: 4, marginBottom: 12 },
  modalInput: { borderWidth: 1, borderColor: colors.border.default, borderRadius: 12, padding: 12, minHeight: 80, textAlignVertical: 'top', fontFamily: typography.fonts.regular, fontSize: typography.sizes.md, color: colors.text.primary, backgroundColor: colors.background.card, marginBottom: 16 },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalButton: { flex: 1, paddingVertical: 12, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  modalCancel: { backgroundColor: colors.background.default, borderWidth: 1, borderColor: colors.border.light },
  modalCancelText: { fontFamily: typography.fonts.semiBold, fontSize: typography.sizes.md, color: colors.text.secondary },
  modalConfirm: { backgroundColor: colors.primary.default },
  modalConfirmText: { fontFamily: typography.fonts.semiBold, fontSize: typography.sizes.md, color: colors.text.inverse },
});
