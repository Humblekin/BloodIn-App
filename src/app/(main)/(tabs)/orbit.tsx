// Project LifeOrbit — Orbit Screen
// Radar-style visualization of nearby users, requests and communities.
// Tapping a node opens a LinkedIn-style profile sheet.
import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Screen } from '@/components/layout/Screen';
import { Header } from '@/components/layout/Header';
import { OrbitCanvas, OrbitNode } from '@/features/orbit/components/OrbitCanvas';
import { OrbitProfileModal } from '@/features/orbit/components/OrbitProfileModal';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { Colors } from '@/constants/colors';
import { FontFamily, FontSize } from '@/constants/typography';
import { Spacing } from '@/constants/spacing';

export default function OrbitScreen() {
  const { profile } = useAuthStore();
  const [selectedNode, setSelectedNode] = useState<OrbitNode | null>(null);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.orbit.background }}>
      <Header title="Network Orbit" transparent />

      <View style={styles.content}>
        <Text style={styles.statusText}>Searching for connections in your area...</Text>

        {/* Orbit Visualization */}
        <OrbitCanvas
          centerUser={
            profile
              ? { displayName: profile.display_name, avatarUrl: profile.avatar_url }
              : { displayName: 'You', avatarUrl: null }
          }
          onNodePress={setSelectedNode}
        />

        <OrbitProfileModal node={selectedNode} onClose={() => setSelectedNode(null)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingTop: Spacing.md,
  },
  statusText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.white,
    opacity: 0.8,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
});