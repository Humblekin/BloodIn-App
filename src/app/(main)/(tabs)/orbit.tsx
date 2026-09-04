// Project LifeOrbit — Orbit Screen
// Radar-style visualization of the user's nearby network (real profiles from
// find_nearby_users). Tapping a node opens a LinkedIn-style profile sheet.
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useSharedValue, withRepeat, withTiming, Easing, useAnimatedStyle } from 'react-native-reanimated';
import { Activity } from 'lucide-react-native';
import { OrbitCanvas, OrbitNode } from '@/features/orbit/components/OrbitCanvas';
import { OrbitProfileModal } from '@/features/orbit/components/OrbitProfileModal';
import { orbitService } from '@/features/orbit/services/orbitService';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { Colors } from '@/constants/colors';
import { FontFamily, FontSize, LetterSpacing } from '@/constants/typography';
import { Spacing } from '@/constants/spacing';

// Legend removed — labels (Member/Request/Community) intentionally hidden

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
  const { profile } = useAuthStore();
  const insets = useSafeAreaInsets();
  const [selectedNode, setSelectedNode] = useState<OrbitNode | null>(null);
  const [nodes, setNodes] = useState<OrbitNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setError(null);
        const nearby = await orbitService.getNearbyNodes();
        if (active) setNodes(nearby);
      } catch (err) {
        console.warn('[Orbit] Failed to load network:', err);
        if (active) setError('Could not load your network right now.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const statusText = error
    ? error
    : loading
      ? 'Building your network…'
      : nodes.length > 0
        ? `Showing ${nodes.length} relevant ${nodes.length === 1 ? 'member' : 'members'} in your network`
        : 'No nearby network members yet';

  return (
    <View style={styles.screen}>
      {/* Top HUD */}
      <View style={[styles.hud, { paddingTop: insets.top + Spacing.sm }]}>
        <View style={styles.hudTopRow}>
          <View style={styles.brandRow}>
            <Activity size={13} color="rgba(255,255,255,0.5)" />
            <Text style={styles.eyebrow}>LIFEORBIT NETWORK</Text>
          </View>
          <LiveIndicator />
        </View>

        <Text style={styles.title}>Network Orbit</Text>
        <Text style={styles.status}>{statusText}</Text>
      </View>

      {/* Orbit Visualization */}
      <View style={styles.canvas}>
        {loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator color={Colors.primary.DEFAULT} />
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

      {/* Legend and hint intentionally removed for a cleaner Orbit view */}

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
    marginBottom: Spacing.md,
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
  title: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['2xl'],
    color: Colors.white,
    letterSpacing: LetterSpacing.tight,
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
  footer: {
    paddingTop: Spacing.sm,
    paddingHorizontal: Spacing['2xl'],
    paddingBottom: Spacing.lg,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.xl,
    marginBottom: Spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: 'rgba(255,255,255,0.55)',
  },
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  hintText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: 'rgba(255,255,255,0.3)',
  },
});