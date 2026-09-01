// Project LifeOrbit — Orbit Screen
// Radar-style visualization of nearby users, requests and communities.
// Tapping a node opens a LinkedIn-style profile sheet.
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useSharedValue, withRepeat, withTiming, Easing, useAnimatedStyle } from 'react-native-reanimated';
import { Activity, Info } from 'lucide-react-native';
import { OrbitCanvas, OrbitNode, orbitNodeColor } from '@/features/orbit/components/OrbitCanvas';
import { OrbitProfileModal } from '@/features/orbit/components/OrbitProfileModal';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { Colors } from '@/constants/colors';
import { FontFamily, FontSize, LetterSpacing } from '@/constants/typography';
import { Spacing } from '@/constants/spacing';

const LEGEND = [
  { label: 'Donor', color: orbitNodeColor('user') },
  { label: 'Request', color: orbitNodeColor('request') },
  { label: 'Community', color: orbitNodeColor('community') },
] as const;

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
        <Text style={styles.status}>Scanning nearby donors, requests &amp; communities</Text>
      </View>

      {/* Orbit Visualization */}
      <View style={styles.canvas}>
        <OrbitCanvas
          centerUser={
            profile
              ? { displayName: profile.display_name, avatarUrl: profile.avatar_url }
              : { displayName: 'You', avatarUrl: null }
          }
          onNodePress={setSelectedNode}
        />
      </View>

      {/* Legend / key */}
      <View style={styles.footer}>
        <View style={styles.legend}>
          {LEGEND.map((item) => (
            <View key={item.label} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: item.color }]} />
              <Text style={styles.legendText}>{item.label}</Text>
            </View>
          ))}
        </View>
        <View style={styles.hint}>
          <Info size={12} color="rgba(255,255,255,0.35)" />
          <Text style={styles.hintText}>Tap a node to connect</Text>
        </View>
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