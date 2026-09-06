import React, { useRef } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { Canvas, useFrame } from '@react-three/fiber/native';
import * as THREE from 'three';
import { Colors } from '@/constants/colors';

interface BloodLinkCharacter3DProps {
  size?: number;
  style?: StyleProp<ViewStyle>;
}

function HelperCharacter() {
  const group = useRef<THREE.Group>(null);
  const halo = useRef<THREE.Mesh>(null);
  const badge = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    if (group.current) {
      group.current.position.y = Math.sin(time * 1.4) * 0.08;
      group.current.rotation.y = Math.sin(time * 0.65) * 0.16;
    }
    if (halo.current) {
      halo.current.rotation.z = time * 0.3;
      halo.current.scale.setScalar(1 + Math.sin(time * 1.5) * 0.035);
    }
    if (badge.current) {
      badge.current.position.z = 0.61 + Math.sin(time * 2.2) * 0.025;
      badge.current.rotation.z = Math.sin(time * 1.6) * 0.08;
    }
  });

  return (
    <group ref={group}>
      <mesh ref={halo} position={[0, 0.15, -0.35]} rotation={[0.2, 0.1, 0]}>
        <torusGeometry args={[1.08, 0.018, 12, 64]} />
        <meshBasicMaterial color={Colors.primary.muted} transparent opacity={0.7} />
      </mesh>
      <mesh position={[0, -0.18, 0]} castShadow>
        <capsuleGeometry args={[0.54, 0.74, 10, 28]} />
        <meshStandardMaterial color={Colors.white} roughness={0.38} metalness={0.08} />
      </mesh>
      <mesh position={[0, -0.2, 0.46]}>
        <capsuleGeometry args={[0.27, 0.42, 8, 20]} />
        <meshStandardMaterial color={Colors.primary.DEFAULT} roughness={0.42} />
      </mesh>
      <mesh position={[-0.38, -0.1, 0]} rotation={[0, 0, -0.14]}>
        <capsuleGeometry args={[0.13, 0.42, 8, 16]} />
        <meshStandardMaterial color={Colors.white} roughness={0.4} />
      </mesh>
      <mesh position={[0.38, -0.1, 0]} rotation={[0, 0, 0.14]}>
        <capsuleGeometry args={[0.13, 0.42, 8, 16]} />
        <meshStandardMaterial color={Colors.white} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.72, 0]} castShadow>
        <sphereGeometry args={[0.38, 24, 16]} />
        <meshStandardMaterial color="#F1C7A8" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.87, -0.02]} scale={[1.02, 0.7, 0.9]}>
        <sphereGeometry args={[0.4, 24, 16]} />
        <meshStandardMaterial color="#24151A" roughness={0.55} />
      </mesh>
      <mesh position={[0, 0.75, 0.34]} rotation={[-0.12, 0, 0]}>
        <torusGeometry args={[0.28, 0.018, 10, 32, Math.PI]} />
        <meshBasicMaterial color="#C9E8F0" transparent opacity={0.8} />
      </mesh>
      <mesh position={[-0.14, 0.79, 0.33]}>
        <sphereGeometry args={[0.045, 12, 8]} />
        <meshBasicMaterial color={Colors.dark.DEFAULT} />
      </mesh>
      <mesh position={[0.14, 0.79, 0.33]}>
        <sphereGeometry args={[0.045, 12, 8]} />
        <meshBasicMaterial color={Colors.dark.DEFAULT} />
      </mesh>
      <mesh position={[0, 0.56, 0.36]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.12, 0.025, 10, 24, Math.PI]} />
        <meshBasicMaterial color={Colors.dark.DEFAULT} />
      </mesh>
      <mesh ref={badge} position={[0, -0.15, 0.61]}>
        <sphereGeometry args={[0.13, 20, 12]} />
        <meshStandardMaterial color={Colors.white} roughness={0.45} />
      </mesh>
      <mesh position={[0, -0.15, 0.76]} scale={[0.55, 1.2, 0.3]}>
        <sphereGeometry args={[0.1, 16, 10]} />
        <meshBasicMaterial color={Colors.primary.light} />
      </mesh>
      <mesh position={[0, -0.68, 0.04]} rotation={[0.08, 0, 0]}>
        <capsuleGeometry args={[0.18, 0.3, 8, 16]} />
        <meshStandardMaterial color={Colors.primary.DEFAULT} roughness={0.5} />
      </mesh>
      <mesh position={[-0.3, -0.73, 0.08]} rotation={[0, 0, -0.08]}>
        <capsuleGeometry args={[0.14, 0.35, 8, 16]} />
        <meshStandardMaterial color="#F1C7A8" roughness={0.7} />
      </mesh>
      <mesh position={[0.3, -0.73, 0.08]} rotation={[0, 0, 0.08]}>
        <capsuleGeometry args={[0.14, 0.35, 8, 16]} />
        <meshStandardMaterial color="#F1C7A8" roughness={0.7} />
      </mesh>
      <mesh position={[-0.3, -0.97, 0.15]} scale={[1.2, 0.5, 1.6]}>
        <sphereGeometry args={[0.16, 16, 10]} />
        <meshStandardMaterial color="#F8FAFC" roughness={0.45} />
      </mesh>
      <mesh position={[0.3, -0.97, 0.15]} scale={[1.2, 0.5, 1.6]}>
        <sphereGeometry args={[0.16, 16, 10]} />
        <meshStandardMaterial color="#F8FAFC" roughness={0.45} />
      </mesh>
      <mesh position={[-0.57, -0.15, 0]} rotation={[0, 0, -0.2]}>
        <capsuleGeometry args={[0.11, 0.35, 6, 12]} />
        <meshStandardMaterial color="#F1C7A8" roughness={0.7} />
      </mesh>
      <mesh position={[0.57, -0.15, 0]} rotation={[0, 0, 0.2]}>
        <capsuleGeometry args={[0.11, 0.35, 6, 12]} />
        <meshStandardMaterial color="#F1C7A8" roughness={0.7} />
      </mesh>
    </group>
  );
}

export function BloodLinkCharacter3D({ size = 240, style }: BloodLinkCharacter3DProps) {
  return (
    <View style={[{ width: size, height: size }, style]}>
      <Canvas camera={{ position: [0, 0.15, 4], fov: 42 }}>
        <ambientLight intensity={1.8} />
        <directionalLight position={[2, 3, 4]} intensity={2.2} color="#FFFFFF" />
        <pointLight position={[-2, -1, 2]} intensity={1.5} color={Colors.primary.light} />
        <HelperCharacter />
      </Canvas>
    </View>
  );
}
