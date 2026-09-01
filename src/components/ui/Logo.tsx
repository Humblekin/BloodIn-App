import React from 'react';
import Svg, { Path, Rect, Text as SvgText } from 'react-native-svg';
import { Colors } from '@/constants/colors';

interface LogoProps {
  size?: number;
}

export function BloodInLogo({ size = 80 }: LogoProps) {
  const borderRadius = size * 0.22;
  const dropScale = size / 80;

  return (
    <Svg width={size} height={size} viewBox="0 0 80 80" fill="none">
      <Rect
        width="80"
        height="80"
        rx={22 / (80 / size)}
        fill={Colors.primary.DEFAULT}
      />

      {/* Blood drop — simplified teardrop path */}
      <Path
        d={`M40 ${14 * dropScale}
            C40 ${14 * dropScale}, 26 ${32 * dropScale}, 26 ${42 * dropScale}
            C26 ${49.7 * dropScale}, 32.3 ${56 * dropScale}, 40 ${56 * dropScale}
            C47.7 ${56 * dropScale}, 54 ${49.7 * dropScale}, 54 ${42 * dropScale}
            C54 ${32 * dropScale}, 40 ${14 * dropScale}, 40 ${14 * dropScale} Z`}
        fill="white"
      />

      {/* "In" text */}
      <SvgText
        x="40"
        y="72"
        textAnchor="middle"
        fontFamily="Inter-Bold"
        fontSize={16}
        fontWeight="700"
        fill="white"
      >
        In
      </SvgText>
    </Svg>
  );
}
