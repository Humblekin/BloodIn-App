// Project LifeOrbit — Orbit Canvas component
// Electron-configuration (Bohr model) style visualization: the current user is
// the central "nucleus", surrounded by up to 3 concentric electron-shell rings.
// Each shell holds profile nodes that revolve around the nucleus.
//
// Self-measuring (onLayout) for proper phone fit, with enforced large gaps
// between ring paths so nodes never feel cramped.
import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, useWindowDimensions, type LayoutChangeEvent } from 'react-native';
import { Droplet, Users } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';
import { Avatar } from '../../../components/ui/Avatar';
import { Colors } from '../../../constants/colors';

export interface OrbitNode {
  id: string;
  type: 'user' | 'community' | 'request';
  distance: number;
  angle: number;
  active?: boolean;
  displayName?: string;
  bio?: string;
  bloodGroup?: string;
  locationName?: string;
  avatarUrl?: string | null;
  communityName?: string;
  hospitalName?: string;
}

interface OrbitCanvasProps {
  nodes?: OrbitNode[];
  centerUser?: { displayName: string; avatarUrl: string | null } | null;
  onNodePress?: (node: OrbitNode) => void;
}

const NODE_SIZE = 54;
const MIN_NODE_SIZE = 46;
const CENTER_SIZE = 78;

// One full revolution every 90 seconds — very slow, meditative motion
const REVOLUTION_DURATION_MS = 90000;

// Shell ring colours — every orbit uses the single brand colour so the shells
// read as one cohesive atom (like path lines in a Bohr model diagram).
const RING_COLORS = [
  'rgba(122, 31, 43, 0.85)',
  'rgba(122, 31, 43, 0.85)',
  'rgba(122, 31, 43, 0.85)',
];

// Soft outer glow underneath each ring to lift it off the background
const RING_GLOW_COLORS = [
  'rgba(122, 31, 43, 0.16)',
  'rgba(122, 31, 43, 0.16)',
  'rgba(122, 31, 43, 0.16)',
];

const nodeColor = (type: OrbitNode['type']) => {
  if (type === 'user') return Colors.orbit.nodeBorder;
  if (type === 'request') return Colors.semantic.critical.DEFAULT;
  return Colors.semantic.warning.DEFAULT;
};

export function orbitNodeColor(type: OrbitNode['type']): string {
  return nodeColor(type);
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

interface NodeCircleProps {
  node: OrbitNode;
  center: number;
  nodeSize: number;
  ringRadius: number;
  revolution: SharedValue<number>;
  onNodePress?: (node: OrbitNode) => void;
}

function NodeCircle({ node, center, nodeSize, ringRadius, revolution, onNodePress }: NodeCircleProps) {
  const color = nodeColor(node.type);

  const haloLayers = [
    { size: 1, opacity: 0.07 },
    { size: 0.66, opacity: 0.11 },
    { size: 0.38, opacity: 0.16 },
  ];

  const haloStyleA = useAnimatedStyle(() => {
    const theta = ((node.angle + revolution.value) * Math.PI) / 180;
    const s = nodeSize * (1 + haloLayers[0].size);
    return {
      left: center + ringRadius * Math.cos(theta) - s / 2,
      top: center + ringRadius * Math.sin(theta) - s / 2,
    };
  });

  const haloStyleB = useAnimatedStyle(() => {
    const theta = ((node.angle + revolution.value) * Math.PI) / 180;
    const s = nodeSize * (1 + haloLayers[1].size);
    return {
      left: center + ringRadius * Math.cos(theta) - s / 2,
      top: center + ringRadius * Math.sin(theta) - s / 2,
    };
  });

  const haloStyleC = useAnimatedStyle(() => {
    const theta = ((node.angle + revolution.value) * Math.PI) / 180;
    const s = nodeSize * (1 + haloLayers[2].size);
    return {
      left: center + ringRadius * Math.cos(theta) - s / 2,
      top: center + ringRadius * Math.sin(theta) - s / 2,
    };
  });

  const nodeStyle = useAnimatedStyle(() => {
    const theta = ((node.angle + revolution.value) * Math.PI) / 180;
    const x = center + ringRadius * Math.cos(theta);
    const y = center + ringRadius * Math.sin(theta);
    return { left: x - nodeSize / 2, top: y - nodeSize / 2 };
  });

  const reactor = (layer: { size: number; opacity: number }, style: any, idx: number) => (
    <Animated.View
      key={idx}
      pointerEvents="none"
      style={[
        styles.nodeGlow,
        { width: nodeSize * (1 + layer.size), height: nodeSize * (1 + layer.size), backgroundColor: color, opacity: layer.opacity },
        style,
      ]}
    />
  );

  return (
    <>
      {node.active && (
        <>
          {reactor(haloLayers[0], haloStyleA, 0)}
          {reactor(haloLayers[1], haloStyleB, 1)}
          {reactor(haloLayers[2], haloStyleC, 2)}
        </>
      )}

      <AnimatedTouchable
        activeOpacity={0.85}
        onPress={() => onNodePress?.(node)}
        style={[
          styles.node,
          { width: nodeSize, height: nodeSize, borderColor: color },
          nodeStyle,
        ]}
      >
        {node.type === 'user' ? (
          <Avatar url={node.avatarUrl} name={node.displayName} size="md" />
        ) : (
          <View style={[styles.nodeIcon, { backgroundColor: color, width: nodeSize - 8, height: nodeSize - 8 }]}>
            {node.type === 'request' ? (
              <Droplet size={nodeSize * 0.4} color={Colors.white} />
            ) : (
              <Users size={nodeSize * 0.4} color={Colors.white} />
            )}
          </View>
        )}
      </AnimatedTouchable>
    </>
  );
}

export function OrbitCanvas({ nodes = [], centerUser, onNodePress }: OrbitCanvasProps) {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  const [contentSize, setContentSize] = useState({
    width: Math.min(windowWidth - 20, 340),
    height: Math.max(280, windowHeight - 170),
  });

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setContentSize({ width, height });
    }
  };

  // Use nearly the full available width so the structure reads larger on screen,
  // while keeping modest insets so it never crowds the edges or the UI chrome.
  const size = Math.max(0, Math.min(contentSize.width, contentSize.height));
  const center = size / 2;

  const revolution = useSharedValue(0);

  useEffect(() => {
    revolution.value = withRepeat(
      withTiming(360, {
        duration: REVOLUTION_DURATION_MS,
        easing: Easing.linear,
      }),
      -1,
      false
    );
  }, [revolution]);

  // ── Shrink nodes on smaller canvases so rings stay clear ──
  const nodeSize = size >= 320 ? NODE_SIZE : MIN_NODE_SIZE;

  // ── Number of orbit rings: adapt to screen size and available space, max 3 ──
  const maxByScreen = size >= 300 ? 3 : size >= 220 ? 2 : 1;

  // ── Ring gap: larger space between ring paths (proportional to node size) ──
  const usableRadius = center - nodeSize / 2 - 6;
  const innerRadius = CENTER_SIZE / 2 + nodeSize / 2 + 8;
  const ringGap = nodeSize * 1.6; // generous gap between ring paths
  const maxBySpace = Math.max(1, Math.floor((usableRadius - innerRadius) / ringGap) + 1);
  const effectiveRingCount = Math.min(maxByScreen, maxBySpace);

  // ── Ring configuration ──
  const systemConfig = useMemo(() => {
    const ringStagger = 120 / Math.max(1, effectiveRingCount);

    if (nodes.length > 0) {
      const groups: OrbitNode[][] = Array.from({ length: effectiveRingCount }, () => []);
      nodes.forEach((node, idx) => groups[idx % effectiveRingCount].push(node));
      return groups.map((ringNodes, ringIndex) =>
        ringNodes.map((node, i) => ({
          ...node,
          angle: (360 / ringNodes.length) * i + ringIndex * ringStagger,
        }))
      );
    }

    const mockGroups: OrbitNode[][] = [
      // Ring 1 (innermost) — 1 profile
      [
        { id: 'mock-1', type: 'user', distance: 0, angle: 0, active: true, displayName: 'Sarah K.', bloodGroup: 'O+', bio: 'Humanitarian & regular donor', locationName: 'Kampala' },
      ],
      // Ring 2 — 1 profile
      [
        { id: 'mock-4', type: 'user', distance: 0, angle: ringStagger, active: true, displayName: 'Amina T.', bloodGroup: 'AB+', bio: 'Nurse & volunteer donor', locationName: 'Entebbe' },
      ],
      // Ring 3 — 1 profile
      [
        { id: 'mock-8', type: 'user', distance: 0, angle: ringStagger * 2, active: true, displayName: 'Grace N.', bloodGroup: 'A+', bio: 'Regular donor', locationName: 'Entebbe' },
      ],
    ];

    return mockGroups.slice(0, effectiveRingCount);
  }, [nodes, effectiveRingCount]);

  // ── Ring radii — evenly spaced within the available canvas ──
  const ringRadii = useMemo(() => {
    const count = systemConfig.length;
    return Array.from({ length: count }, (_, i) => {
      const t = count === 1 ? 0.55 : (i + 1) / (count + 1);
      return innerRadius + (usableRadius - innerRadius) * t;
    });
  }, [systemConfig, innerRadius, usableRadius]);

  return (
    <View style={styles.container} onLayout={onLayout}>
      {size > 0 && (
        <View style={{ width: size, height: size }}>
          {/* Concentric electron-shell rings (Bohr model) */}
          {ringRadii.map((r, i) => (
            <React.Fragment key={i}>
              {/* Soft glow under each shell to separate layers */}
              <View
                pointerEvents="none"
                style={[
                  styles.ringGlow,
                  {
                    width: r * 2,
                    height: r * 2,
                    left: center - r,
                    top: center - r,
                    borderColor: RING_GLOW_COLORS[i],
                  },
                ]}
              />
              {/* Clear visible path line */}
              <View
                pointerEvents="none"
                style={[
                  styles.ring,
                  {
                    width: r * 2,
                    height: r * 2,
                    left: center - r,
                    top: center - r,
                    borderColor: RING_COLORS[i],
                  },
                ]}
              />
            </React.Fragment>
          ))}

          {/* Center node ring — nucleus boundary */}
          <View
            pointerEvents="none"
            style={[
              styles.nucleusRing,
              {
                width: CENTER_SIZE + 24,
                height: CENTER_SIZE + 24,
                left: center - (CENTER_SIZE + 24) / 2,
                top: center - (CENTER_SIZE + 24) / 2,
              },
            ]}
          />

          {/* Center user glow — the nucleus halo */}
          {centerUser && (
            <View
              pointerEvents="none"
              style={[
                styles.centerGlow,
                {
                  width: CENTER_SIZE * 1.7,
                  height: CENTER_SIZE * 1.7,
                  left: center - (CENTER_SIZE * 1.7) / 2,
                  top: center - (CENTER_SIZE * 1.7) / 2,
                },
              ]}
            />
          )}

          {/* Center user node — the nucleus */}
          {centerUser && (
            <View
              style={[
                styles.centerNode,
                {
                  width: CENTER_SIZE,
                  height: CENTER_SIZE,
                  left: center - CENTER_SIZE / 2,
                  top: center - CENTER_SIZE / 2,
                },
              ]}
            >
              <Avatar
                url={centerUser.avatarUrl}
                name={centerUser.displayName}
                size="lg"
                showBorder
                style={styles.centerAvatar}
              />
            </View>
          )}

          {/* Revolving profile nodes — one per shell, moving around the nucleus */}
          {systemConfig.map((ringNodes, i) =>
            ringNodes.map((node) => (
              <NodeCircle
                key={node.id}
                node={node}
                center={center}
                nodeSize={nodeSize}
                ringRadius={ringRadii[i]}
                revolution={revolution}
                onNodePress={onNodePress}
              />
            ))
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.orbit.background,
  },
  ring: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 0.5,
  },
  ringGlow: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 5,
    opacity: 1,
  },
  nucleusRing: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 2,
    borderColor: 'rgba(122, 31, 43, 0.55)',
  },
  node: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 2,
    backgroundColor: Colors.surface.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.25,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
  },
  nodeGlow: {
    position: 'absolute',
    borderRadius: 999,
  },
  nodeIcon: {
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerNode: {
    position: 'absolute',
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 10,
  },
  centerAvatar: {
    borderColor: Colors.surface.DEFAULT,
    borderWidth: 3,
  },
  centerGlow: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 2,
    borderColor: Colors.orbit.centerRing,
    opacity: 0.18,
  },
});