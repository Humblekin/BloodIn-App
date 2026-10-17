// Project LifeOrbit — Orbit Screen
// Radar-style visualization of the user's nearby network (real profiles from
// find_nearby_users). Tapping a node opens a LinkedIn-style profile sheet.
import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import Animated, { useSharedValue, withRepeat, withTiming, Easing, useAnimatedStyle } from 'react-native-reanimated';
import { Activity, MapPin, RefreshCw, Droplet } from 'lucide-react-native';
import { OrbitCanvas, OrbitNode } from '@/features/orbit/components/OrbitCanvas';
import { OrbitProfileModal } from '@/features/orbit/components/OrbitProfileModal';
import { orbitService } from '@/features/orbit/services/orbitService';
import { locationService } from '@/features/location/services/locationService';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { Button } from '@/components/ui/Button';
import { Colors } from '@/constants/colors';
import { FontFamily, FontSize, LetterSpacing } from '@/constants/typography';
import { Spacing } from '@/constants/spacing';

function LiveIndicator() {
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [pulse]);

  const dotStyle = useAnimatedStyle(() => ({
    opacity: 0.35 + pulse.value * 0.65,
    transform: [{ scale: 0.8 + pulse.value * 0.4 }],
  }));

  return (
    <View style={styles.livePill}>
      <View style={styles.liveDotSlot}>
        <Animated.View style={[styles.liveDot, dotStyle]} />
      </View>
      <Text style={styles.liveText}>LIVE</Text>
    </View>
  );
}

export default function OrbitScreen() {
  const router = useRouter();
  const { user, profile } = useAuthStore();
  const insets = useSafeAreaInsets();
  const [selectedNode, setSelectedNode] = useState<OrbitNode | null>(null);
  const [nodes, setNodes] = useState<OrbitNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);
  const [locationRequired, setLocationRequired] = useState(false);
  const [willingOnly, setWillingOnly] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadNetwork = useCallback(async (isWilling: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const nearby = await orbitService.getNearbyNodes({
        willingOnly: isWilling,
      });
      setNodes(nearby);
      setLocationRequired(false);
    } catch (err: any) {
      console.warn('[Orbit] Failed to load network:', err);
      setNodes([]);
      if (err instanceof Error && err.message === 'LOCATION_REQUIRED') {
        setLocationRequired(true);
      } else {
        setError('Could not load your network right now.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadNetwork(willingOnly);
    }, [loadNetwork, willingOnly])
  );

  const handleEnableLocation = async () => {
    if (!user) {
      router.push('/(auth)/welcome');
      return;
    }

    setLocating(true);
    try {
      const res = await locationService.acquireAndSaveUserLocation(user.id);
      if (res.success) {
        setLocationRequired(false);
        await loadNetwork(willingOnly);
      } else {
        Alert.alert(
          'Location Needed',
          res.error || 'Please grant location permission to view nearby members on Orbit.'
        );
      }
    } catch (err: any) {
      Alert.alert('Location Error', err?.message || 'Could not acquire your current location.');
    } finally {
      setLocating(false);
    }
  };

  const handleToggleWilling = () => {
    const next = !willingOnly;
    setWillingOnly(next);
    loadNetwork(next);
  };

  const statusText = locationRequired
    ? 'Location is required to calculate geographic distances'
    : error
      ? error
      : loading
        ? 'Scanning your nearby radius…'
        : nodes.length > 0
          ? `Showing ${nodes.length} nearest ${nodes.length === 1 ? 'member' : 'members'} (closest in center)`
          : willingOnly
            ? 'No willing blood donors found in this radius'
            : 'No nearby network members found in this radius';

  return (
    <View style={styles.screen}>
      {/* Top HUD */}
      <View style={[styles.hud, { paddingTop: insets.top + Spacing.sm }]}>
        <View style={styles.hudTopRow}>
          <View style={styles.brandRow}>
            <Activity size={13} color="rgba(255,255,255,0.5)" />
            <Text style={styles.eyebrow}>BLOODIN NETWORK</Text>
          </View>
          <View style={styles.topRightActions}>
            {!locationRequired && (
              <TouchableOpacity
                onPress={() => loadNetwork(willingOnly)}
                disabled={loading}
                style={styles.refreshIconBtn}
                accessibilityLabel="Refresh Orbit"
              >
                <RefreshCw size={13} color="rgba(255,255,255,0.6)" />
              </TouchableOpacity>
            )}
            <LiveIndicator />
          </View>
        </View>

        <View style={styles.titleFilterRow}>
          <Text style={styles.title}>Network Orbit</Text>
          {!locationRequired && (
            <TouchableOpacity
              onPress={handleToggleWilling}
              style={[styles.filterToggle, willingOnly && styles.filterToggleActive]}
              activeOpacity={0.8}
            >
              <Droplet size={12} color={willingOnly ? Colors.white : Colors.primary.DEFAULT} />
              <Text style={[styles.filterToggleText, willingOnly && styles.filterToggleTextActive]}>
                {willingOnly ? 'Willing Only' : 'All Nearby'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.status}>{statusText}</Text>
      </View>

      {/* Orbit Visualization or Location Onboarding */}
      <View style={styles.canvas}>
        {loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator color={Colors.primary.DEFAULT} />
          </View>
        ) : locationRequired ? (
          <View style={styles.locationRequiredContainer}>
            <View style={styles.locationIconRing}>
              <MapPin size={38} color={Colors.primary.DEFAULT} />
            </View>
            <Text style={styles.locationRequiredTitle}>Enable Location Access</Text>
            <Text style={styles.locationRequiredText}>
              Orbit maps donors, requests, and community members in concentric rings according to their real distance from you.
            </Text>
            <Button
              title="Enable Location"
              size="lg"
              isLoading={locating}
              onPress={handleEnableLocation}
              leftIcon={<MapPin size={18} color={Colors.white} />}
              style={styles.enableLocationBtn}
            />
          </View>
        ) : (
          <OrbitCanvas
            nodes={nodes}
            centerUser={
              profile
                ? { displayName: profile.display_name, avatarUrl: profile.avatar_url }
                : { displayName: 'You', avatarUrl: null }
            }
            onNodePress={setSelectedNode}
          />
        )}
      </View>

      <OrbitProfileModal node={selectedNode} onClose={() => setSelectedNode(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.orbit.background,
  },
  hud: {
    paddingHorizontal: Spacing['2xl'],
    paddingBottom: Spacing.sm,
  },
  hudTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  eyebrow: {
    fontFamily: FontFamily.medium,
    fontSize: 10,
    letterSpacing: LetterSpacing.wider,
    color: 'rgba(255,255,255,0.45)',
  },
  topRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  refreshIconBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(5, 150, 105, 0.4)',
    backgroundColor: 'rgba(5, 150, 105, 0.12)',
  },
  liveDotSlot: {
    width: 10,
    height: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: Colors.semantic.success.DEFAULT,
  },
  liveText: {
    fontFamily: FontFamily.semibold,
    fontSize: 10,
    letterSpacing: LetterSpacing.wider,
    color: Colors.semantic.success.DEFAULT,
  },
  titleFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  title: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['2xl'],
    color: Colors.white,
    letterSpacing: LetterSpacing.tight,
  },
  filterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  filterToggleActive: {
    backgroundColor: Colors.primary.DEFAULT,
    borderColor: Colors.primary.DEFAULT,
  },
  filterToggleText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: 'rgba(255,255,255,0.8)',
  },
  filterToggleTextActive: {
    color: Colors.white,
    fontFamily: FontFamily.semibold,
  },
  status: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.45)',
    marginTop: Spacing.xs,
  },
  canvas: {
    flex: 1,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationRequiredContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing['3xl'],
  },
  locationIconRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(122, 31, 43, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(122, 31, 43, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  locationRequiredTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xl,
    color: Colors.white,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  locationRequiredText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing['2xl'],
  },
  enableLocationBtn: {
    width: '100%',
  },
});