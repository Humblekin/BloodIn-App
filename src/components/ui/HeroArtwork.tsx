// Project LifeOrbit — Hero Artwork
// Transparent, scalable decorative SVG used on the auth screens (login /
// register / welcome). A stylised blood drop wrapped in soft network rings,
// rendered in the brand burgundy so it sits naturally on the light background.
import React from 'react';
import Svg, { Defs, LinearGradient, Stop, Path, Circle } from 'react-native-svg';
import { Colors } from '@/constants/colors';

interface HeroArtworkProps {
  size?: number;
}

export function HeroArtwork({ size = 240 }: HeroArtworkProps) {
  const scale = size / 200;

  return (
    <Svg width={size} height={size * 0.85} viewBox="0 0 200 170" fill="none">
      <Defs>
        <LinearGradient id="drop" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={Colors.primary.light} />
          <Stop offset="1" stopColor={Colors.primary.DEFAULT} />
        </LinearGradient>
      </Defs>

      {/* Outer network rings */}
      <Circle cx="100" cy="88" r={74 * scale} stroke={Colors.primary.muted} strokeOpacity={0.25} strokeWidth={1.2} fill="none" />
      <Circle cx="100" cy="88" r={58 * scale} stroke={Colors.primary.muted} strokeOpacity={0.4} strokeWidth={1} fill="none" />

      {/* Ring nodes (community/people) */}
      <Circle cx="100" cy={88 - 74 * scale} r={4 * scale} fill={Colors.primary.DEFAULT} fillOpacity={0.5} />
      <Circle cx={100 + 74 * scale * Math.cos(Math.PI / 3)} cy={88 - 74 * scale * Math.sin(Math.PI / 3)} r={3 * scale} fill={Colors.primary.muted} />
      <Circle cx={100 - 74 * scale * Math.cos(Math.PI / 3)} cy={88 - 74 * scale * Math.sin(Math.PI / 3)} r={3 * scale} fill={Colors.primary.muted} />

      {/* Blood drop */}
      <Path
        d={`M100 ${30 * scale}
            C100 ${30 * scale}, 66 ${62 * scale}, 66 ${88 * scale}
            C66 ${108 * scale}, 81 ${124 * scale}, 100 ${124 * scale}
            C119 ${124 * scale}, 134 ${108 * scale}, 134 ${88 * scale}
            C134 ${62 * scale}, 100 ${30 * scale}, 100 ${30 * scale} Z`}
        fill="url(#drop)"
      />

      {/* Inside highlight — subtle transparent sheen */}
      <Path
        d={`M100 ${44 * scale}
            C100 ${44 * scale}, 79 ${65 * scale}, 79 ${84 * scale}
            C79 ${91 * scale}, 82 ${97 * scale}, 87 ${101 * scale}
            C84 ${95 * scale}, 84 ${88 * scale}, 88 ${78 * scale}
            C93 ${65 * scale}, 100 ${56 * scale}, 100 ${44 * scale} Z`}
        fill={Colors.white}
        fillOpacity={0.25}
      />

      {/* Small floating droplets */}
      <Circle cx={150 * scale} cy={48 * scale} r={5 * scale} fill={Colors.primary.muted} fillOpacity={0.5} />
      <Circle cx={46 * scale} cy={130 * scale} r={4 * scale} fill={Colors.primary.light} fillOpacity={0.45} />
    </Svg>
  );
}
