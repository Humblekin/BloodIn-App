// Project LifeOrbit — Orbit Profile Modal
// LinkedIn-style profile card shown when a node on the orbit is tapped.
import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { X, MapPin, MessageCircle, UserPlus, Droplet, Users, Building2 } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../../../components/ui/Avatar';
import { Button } from '../../../components/ui/Button';
import { useAuthStore } from '../../auth/stores/authStore';
import { messageService } from '../../messages/services/messageService';
import { connectionService } from '../../connections/services/connectionService';
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

  if (!node) return null;

  // Demo/mock nodes carry non-UUID ids (e.g. "mock-2"). Only real profile
  // records with UUID ids can be messaged/connected to in the database.
  const isDemoNode = !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(node.id);

  const isUser = node.type === 'user';
  const title = node.displayName || node.communityName || node.hospitalName || 'Unknown';
  const subtitle = isUser
    ? [node.bloodGroup, node.locationName].filter(Boolean).join(' · ')
    : node.type === 'request'
      ? `Urgent request · ${node.bloodGroup}`
      : 'Community';

  const handleMessage = async () => {
    if (!user) {
      router.push('/(auth)/welcome');
      return;
    }
    if (isDemoNode) {
      Alert.alert('Preview profile', 'This is a demo node. Message will work for real network connections.');
      return;
    }
    try {
      const conversationId = await messageService.getOrCreateDirectConversation(user.id, node.id);
      onClose();
      router.push(`/(main)/messages/${conversationId}`);
    } catch (err) {
      console.error('[Orbit] Message error:', err);
      Alert.alert('Unable to message', 'This profile is not reachable yet.');
    }
  };

  const handleConnect = async () => {
    if (!user) {
      router.push('/(auth)/welcome');
      return;
    }
    if (isDemoNode) {
      Alert.alert('Preview profile', 'This is a demo node. Connect will work for real network connections.');
      return;
    }
    setConnecting(true);
    try {
      await connectionService.sendRequest(user.id, node.id);
      Alert.alert('Request sent', `Connection request sent to ${title}.`);
    } catch (err) {
      console.error('[Orbit] Connect error:', err);
      Alert.alert('Unable to connect', 'This profile is not reachable yet.');
    } finally {
      setConnecting(false);
    }
  };

  const handleVisit = () => {
    onClose();
    if (isDemoNode) {
      Alert.alert('Preview profile', 'This is a demo node. The full profile will be available for real network connections.');
      return;
    }
    if (node.type === 'request') router.push(`/(main)/requests/${node.id}`);
    else if (node.type === 'community') router.push(`/(main)/community/${node.id}`);
  };

  const TypeIcon = node.type === 'request' ? Droplet : node.type === 'community' ? Users : UserPlus;

  return (
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
              <Text style={styles.name} numberOfLines={2}>{title}</Text>
              <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
              {node.locationName ? (
                <View style={styles.locationRow}>
                  <MapPin size={13} color={Colors.dark.tertiary} />
                  <Text style={styles.locationText} numberOfLines={1}>{node.locationName}</Text>
                </View>
              ) : null}
            </View>
          </View>

          {node.bio ? (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>About</Text>
              <Text style={styles.bio}>{node.bio}</Text>
            </View>
          ) : null}

          <View style={styles.actions}>
            {node.type === 'user' ? (
              <>
                <Button
                  title="Message"
                  size="lg"
                  onPress={handleMessage}
                  leftIcon={<MessageCircle size={18} color={Colors.white} />}
                  style={styles.actionButton}
                />
                <Button
                  title="Connect"
                  variant="outline"
                  size="lg"
                  isLoading={connecting}
                  onPress={handleConnect}
                  leftIcon={<UserPlus size={18} color={Colors.primary.DEFAULT} />}
                  style={styles.actionButton}
                />
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
        </ScrollView>
      </View>
    </Modal>
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
    marginBottom: Spacing.lg,
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
  name: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xl,
    color: Colors.dark.DEFAULT,
  },
  subtitle: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.primary.DEFAULT,
    marginTop: 2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  locationText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.dark.tertiary,
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
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingTop: Spacing.md,
  },
  actionButton: {
    flex: 1,
  },
});