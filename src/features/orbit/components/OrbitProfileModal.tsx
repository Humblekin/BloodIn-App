// Project LifeOrbit — Orbit Profile Modal
// LinkedIn-style profile card shown when a node on the orbit is tapped.
import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  X,
  MapPin,
  MessageCircle,
  UserPlus,
  Droplet,
  Users,
  Building2,
  UserX,
  Flag,
  Check,
  Clock,
  CheckCircle2,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../../../components/ui/Avatar';
import { Button } from '../../../components/ui/Button';
import { PremiumBadge } from '../../../features/premium/components/PremiumBadge';
import { useAuthStore } from '../../auth/stores/authStore';
import { messageService } from '../../messages/services/messageService';
import { connectionService, type UserConnectionState } from '../../connections/services/connectionService';
import { BlockConfirmation } from '../../moderation/components/BlockConfirmation';
import { ReportModal } from '../../moderation/components/ReportModal';
import type { OrbitNode } from './OrbitCanvas';
import { Colors } from '../../../constants/colors';
import { FontFamily, FontSize } from '../../../constants/typography';
import { Spacing } from '../../../constants/spacing';

interface OrbitProfileModalProps {
  node: OrbitNode | null;
  onClose: () => void;
}

export function OrbitProfileModal({ node, onClose }: OrbitProfileModalProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const [connecting, setConnecting] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [connState, setConnState] = useState<UserConnectionState>('none');
  const [requestId, setRequestId] = useState<string | undefined>(undefined);
  const [showBlock, setShowBlock] = useState(false);
  const [showReport, setShowReport] = useState(false);

  const isUser = node?.type === 'user';
  const isDemoNode = !node || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(node.id);

  // Load connection status whenever node changes
  const checkStatus = useCallback(async () => {
    if (!user || !node || !isUser || isDemoNode) {
      setConnState('none');
      return;
    }
    setLoadingStatus(true);
    try {
      const res = await connectionService.getConnectionStatus(user.id, node.id);
      setConnState(res.state);
      setRequestId(res.requestId);
    } catch (err) {
      console.warn('[OrbitModal] Failed to load connection status:', err);
    } finally {
      setLoadingStatus(false);
    }
  }, [user, node, isUser, isDemoNode]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  if (!node) return null;

  const title = node.displayName || node.communityName || node.hospitalName || 'Unknown';

  // Format real geographic distance
  const formattedDistance =
    typeof node.distance === 'number' && Number.isFinite(node.distance)
      ? node.distance < 1
        ? `${Math.round(node.distance * 1000)} m away`
        : `${node.distance.toFixed(1)} km away`
      : null;

  const handleMessage = async () => {
    if (!user) {
      router.push('/(auth)/welcome');
      return;
    }
    if (isDemoNode) {
      Alert.alert('Preview Profile', 'This is a demo node. Messaging works for real network members.');
      return;
    }

    if (connState !== 'accepted') {
      Alert.alert(
        'Connection Required',
        'You can only exchange direct messages once your connection request has been accepted by this member.'
      );
      return;
    }

    try {
      const conversationId = await messageService.getOrCreateDirectConversation(user.id, node.id);
      onClose();
      router.push(`/(main)/messages/${conversationId}`);
    } catch (err: any) {
      console.error('[Orbit] Message error:', err);
      Alert.alert('Unable to Message', err?.message || 'This conversation is not authorized yet.');
    }
  };

  const handleConnect = async () => {
    if (!user) {
      router.push('/(auth)/welcome');
      return;
    }
    if (isDemoNode) {
      Alert.alert('Preview Profile', 'This is a demo node. Connect works for real network members.');
      return;
    }

    setConnecting(true);
    try {
      await connectionService.sendRequest(user.id, node.id);
      setConnState('pending_sent');
      Alert.alert('Request Sent', `Connection request sent to ${title}. Direct messaging will be enabled once accepted.`);
    } catch (err: any) {
      console.error('[Orbit] Connect error:', err);
      Alert.alert('Unable to Connect', err?.message || 'Could not send request right now.');
    } finally {
      setConnecting(false);
    }
  };

  const handleAcceptRequest = async () => {
    if (!requestId) return;
    setConnecting(true);
    try {
      await connectionService.respondToRequest(requestId, 'accepted');
      setConnState('accepted');
      Alert.alert('Connection Accepted', `You and ${title} are now connected. You can now chat directly!`);
    } catch (err: any) {
      console.error('[Orbit] Accept error:', err);
      Alert.alert('Error', err?.message || 'Could not accept connection request.');
    } finally {
      setConnecting(false);
    }
  };

  const handleDeclineRequest = async () => {
    if (!requestId) return;
    setConnecting(true);
    try {
      await connectionService.respondToRequest(requestId, 'declined');
      setConnState('declined');
    } catch (err: any) {
      console.error('[Orbit] Decline error:', err);
      Alert.alert('Error', err?.message || 'Could not decline request.');
    } finally {
      setConnecting(false);
    }
  };

  const handleVisit = () => {
    onClose();
    if (isDemoNode) {
      Alert.alert('Preview Profile', 'The full details will be available for real network connections.');
      return;
    }
    if (node.type === 'request') router.push(`/(main)/requests/${node.id}`);
    else if (node.type === 'community') router.push(`/(main)/community/${node.id}`);
  };

  const TypeIcon = node.type === 'request' ? Droplet : node.type === 'community' ? Users : UserPlus;

  return (
    <>
      <Modal visible transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
        <View style={styles.shell}>
          <TouchableOpacity style={[styles.closeButton, { top: Math.max(insets.top, Spacing.md) }]} onPress={onClose}>
            <X size={22} color={Colors.white} />
          </TouchableOpacity>

          {/* LinkedIn-style header band */}
          <View style={styles.cover}>
            <View style={styles.coverPattern}>
              <TypeIcon size={88} color="rgba(255,255,255,0.22)" />
            </View>
          </View>

          <ScrollView
            style={styles.sheet}
            contentContainerStyle={[
              styles.sheetContent,
              { paddingBottom: Math.max(insets.bottom, Spacing['3xl']) },
            ]}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.headerRow}>
              <Avatar url={node.avatarUrl} name={title} size="xl" style={styles.avatar} showBorder />
              <View style={styles.headerText}>
                <View style={styles.nameRow}>
                  <Text style={styles.name} numberOfLines={2}>{title}</Text>
                  {node.isPremium && <PremiumBadge size="sm" />}
                </View>

                {/* Subtitle / Blood Group */}
                {node.bloodGroup && (
                  <View style={styles.badgeRow}>
                    <View style={styles.bloodBadge}>
                      <Droplet size={11} color={Colors.primary.DEFAULT} />
                      <Text style={styles.bloodText}>{node.bloodGroup}</Text>
                    </View>
                    {connState === 'accepted' && (
                      <View style={styles.connectedBadge}>
                        <CheckCircle2 size={11} color="#059669" />
                        <Text style={styles.connectedText}>Connected</Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Location & Real Distance */}
                <View style={styles.locationRow}>
                  <MapPin size={13} color={Colors.dark.tertiary} />
                  <Text style={styles.locationText} numberOfLines={1}>
                    {[node.locationName, formattedDistance].filter(Boolean).join(' · ')}
                  </Text>
                </View>
              </View>
            </View>

            {/* Donation Willingness Status Pill */}
            {isUser && (
              <View style={styles.willingnessSection}>
                {node.donationWillingness === 'willing' ? (
                  <View style={[styles.willingnessPill, styles.willingPill]}>
                    <Droplet size={13} color="#059669" />
                    <Text style={[styles.willingnessText, styles.willingText]}>
                      Willing to be contacted for blood donation
                    </Text>
                  </View>
                ) : node.donationWillingness === 'not_willing' ? (
                  <View style={[styles.willingnessPill, styles.notWillingPill]}>
                    <Text style={[styles.willingnessText, styles.notWillingText]}>
                      Not available for blood donation
                    </Text>
                  </View>
                ) : (
                  <View style={[styles.willingnessPill, styles.unspecifiedPill]}>
                    <Text style={[styles.willingnessText, styles.unspecifiedText]}>
                      Donation willingness: Unspecified
                    </Text>
                  </View>
                )}
              </View>
            )}

            {node.bio ? (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>About</Text>
                <Text style={styles.bio}>{node.bio}</Text>
              </View>
            ) : null}

            {/* Action Buttons with Strict Connection & Chat Enforcement */}
            <View style={styles.actions}>
              {node.type === 'user' ? (
                <>
                  {loadingStatus ? (
                    <View style={styles.statusLoading}>
                      <ActivityIndicator size="small" color={Colors.primary.DEFAULT} />
                    </View>
                  ) : connState === 'accepted' ? (
                    <Button
                      title="Message"
                      size="lg"
                      onPress={handleMessage}
                      leftIcon={<MessageCircle size={18} color={Colors.white} />}
                      style={styles.actionButton}
                    />
                  ) : connState === 'pending_received' ? (
                    <View style={styles.requestResponseRow}>
                      <Button
                        title="Accept Request"
                        size="lg"
                        isLoading={connecting}
                        onPress={handleAcceptRequest}
                        leftIcon={<Check size={18} color={Colors.white} />}
                        style={styles.actionButton}
                      />
                      <Button
                        title="Decline"
                        variant="outline"
                        size="lg"
                        onPress={handleDeclineRequest}
                        style={styles.actionButton}
                      />
                    </View>
                  ) : connState === 'pending_sent' ? (
                    <View style={styles.pendingBlock}>
                      <Button
                        title="Request Pending"
                        variant="outline"
                        size="lg"
                        disabled
                        leftIcon={<Clock size={18} color={Colors.dark.tertiary} />}
                        style={styles.actionButton}
                      />
                      <Text style={styles.hintNotice}>
                        Chat will be unlocked as soon as {title} accepts your connection request.
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.connectBlock}>
                      <Button
                        title="Connect"
                        variant="primary"
                        size="lg"
                        isLoading={connecting}
                        onPress={handleConnect}
                        leftIcon={<UserPlus size={18} color={Colors.white} />}
                        style={styles.actionButton}
                      />
                      <Text style={styles.hintNotice}>
                        Send a connection request to unlock direct messaging.
                      </Text>
                    </View>
                  )}
                </>
              ) : (
                <Button
                  title={node.type === 'community' ? 'View Community' : 'View Request'}
                  variant="outline"
                  size="lg"
                  leftIcon={<Building2 size={18} color={Colors.primary.DEFAULT} />}
                  onPress={handleVisit}
                  style={styles.actionButton}
                />
              )}
            </View>

            {node.type === 'user' && (
              <View style={styles.safetyRow}>
                <TouchableOpacity style={styles.safetyButton} onPress={() => setShowReport(true)}>
                  <Flag size={14} color={Colors.dark.tertiary} />
                  <Text style={styles.safetyText}>Report</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.safetyButton} onPress={() => setShowBlock(true)}>
                  <UserX size={14} color={Colors.semantic.critical.DEFAULT} />
                  <Text style={[styles.safetyText, { color: Colors.semantic.critical.DEFAULT }]}>Block</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>

      <BlockConfirmation
        visible={showBlock}
        onClose={() => setShowBlock(false)}
        targetId={node.id}
        targetName={title}
        onSuccess={onClose}
      />
      <ReportModal
        visible={showReport}
        onClose={() => setShowReport(false)}
        targetType="user"
        targetId={node.id}
      />
    </>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: Colors.surface.DEFAULT,
  },
  closeButton: {
    position: 'absolute',
    right: Spacing.lg,
    zIndex: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  cover: {
    height: 150,
    backgroundColor: Colors.primary.dark,
  },
  coverPattern: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheet: {
    flex: 1,
  },
  sheetContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: Spacing.md,
  },
  avatar: {
    borderColor: Colors.surface.DEFAULT,
    borderWidth: 4,
    marginRight: Spacing.md,
    marginTop: -76,
  },
  headerText: {
    flex: 1,
    paddingBottom: Spacing.xs,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  name: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xl,
    color: Colors.dark.DEFAULT,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: 3,
  },
  bloodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.primary.subtle,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  bloodText: {
    fontFamily: FontFamily.semibold,
    fontSize: FontSize.xs,
    color: Colors.primary.DEFAULT,
  },
  connectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(5, 150, 105, 0.1)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  connectedText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: '#059669',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 5,
  },
  locationText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.dark.tertiary,
  },
  willingnessSection: {
    marginVertical: Spacing.sm,
  },
  willingnessPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  willingnessText: {
    fontSize: FontSize.xs,
  },
  willingPill: {
    backgroundColor: 'rgba(5, 150, 105, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(5, 150, 105, 0.25)',
  },
  willingText: {
    color: '#059669',
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
  },
  notWillingPill: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  notWillingText: {
    color: '#DC2626',
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
  },
  unspecifiedPill: {
    backgroundColor: 'rgba(107, 114, 128, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(107, 114, 128, 0.15)',
  },
  unspecifiedText: {
    color: Colors.dark.tertiary,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
  },
  section: {
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
    paddingVertical: Spacing.md,
  },
  sectionLabel: {
    fontFamily: FontFamily.semibold,
    fontSize: FontSize.sm,
    color: Colors.dark.secondary,
    marginBottom: Spacing.xs,
  },
  bio: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
    lineHeight: 20,
    color: Colors.dark.DEFAULT,
  },
  actions: {
    paddingTop: Spacing.md,
  },
  actionButton: {
    flex: 1,
  },
  statusLoading: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  requestResponseRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  pendingBlock: {
    gap: Spacing.xs,
  },
  connectBlock: {
    gap: Spacing.xs,
  },
  hintNotice: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.dark.tertiary,
    textAlign: 'center',
    marginTop: 4,
  },
  safetyRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.xl,
    paddingTop: Spacing.md,
    marginTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  safetyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  safetyText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: Colors.dark.tertiary,
  },
});