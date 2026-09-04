// Project LifeOrbit — BloodIn Logo
// Brand mark: a stylised blood drop wrapped in soft network rings.
// Same visual language as the HeroArtwork used on the auth screens, in a
// square form factor so it works as an app logo on light surfaces.
import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';
import { Colors } from '@/constants/colors';

interface LogoProps {
  size?: number;
}

export function BloodInLogo({ size = 80 }: LogoProps) {
  const s = size / 120;

  // Geometries authored in a 120px box, everything centred on (60, 62).
  // The blood drop + sheen are the HeroArtwork paths scaled by `s`.
  const drop = `M60 ${62 - 47 * s}
C60 ${62 - 47 * s}, ${60 - 34 * s} ${62 - 15 * s}, ${60 - 34 * s} ${62 + 11 * s}
C${60 - 34 * s} ${62 + 31 * s}, ${60 - 19 * s} ${62 + 47 * s}, 60 ${62 + 47 * s}
C${60 + 19 * s} ${62 + 47 * s}, ${60 + 34 * s} ${62 + 31 * s}, ${60 + 34 * s} ${62 + 11 * s}
C${60 + 34 * s} ${62 - 15 * s}, 60 ${62 - 47 * s}, 60 ${62 - 47 * s} Z`;

  const sheen = `M60 ${62 - 33 * s}
C60 ${62 - 33 * s}, ${60 - 21 * s} ${62 - 12 * s}, ${60 - 21 * s} ${62 + 7 * s}
C${60 - 21 * s} ${62 + 14 * s}, ${60 - 18 * s} ${62 + 20 * s}, ${60 - 13 * s} ${62 + 24 * s}
C${60 - 16 * s} ${62 + 18 * s}, ${60 - 16 * s} ${62 + 11 * s}, ${60 - 12 * s} ${62 + 1 * s}
C${60 - 7 * s} ${62 - 12 * s}, 60 ${62 - 21 * s}, 60 ${62 - 33 * s} Z`;

  return (
    <Svg width={size} height={size} viewBox="0 0 120 120" fill="none">
      {/* Outer network ring */}
      <Circle
        cx="60"
        cy="62"
        r={52 * s}
        stroke={Colors.primary.muted}
        strokeOpacity={0.35}
        strokeWidth={1.2}
        fill="none"
      />
      {/* Inner network ring */}
      <Circle
        cx="60"
        cy="62"
        r={36 * s}
        stroke={Colors.primary.muted}
        strokeOpacity={0.55}
        strokeWidth={1}
        fill="none"
      />

      {/* Ring nodes (community/people) */}
      <Circle cx="60" cy={62 - 52 * s} r={2.6 * s} fill={Colors.primary.muted} fillOpacity={0.6} />
      <Circle cx={60 + 45 * s} cy={62 - 26 * s} r={2 * s} fill={Colors.primary.muted} fillOpacity={0.5} />
      <Circle cx={60 - 45 * s} cy={62 - 26 * s} r={2 * s} fill={Colors.primary.muted} fillOpacity={0.5} />

      {/* Blood drop */}
      <Path d={drop} fill={Colors.primary.DEFAULT} />

      {/* Inside highlight — subtle transparent sheen */}
      <Path d={sheen} fill={Colors.white} fillOpacity={0.4} />

      {/* Small floating droplets */}
      <Circle cx={60 + 42 * s} cy={62 - 33 * s} r={2.4 * s} fill={Colors.primary.muted} fillOpacity={0.5} />
      <Circle cx={60 - 38 * s} cy={62 + 27 * s} r={1.8 * s} fill={Colors.primary.light} fillOpacity={0.45} />
    </Svg>
  );
}