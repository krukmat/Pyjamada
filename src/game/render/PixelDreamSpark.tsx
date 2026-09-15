import React from 'react';
import { Circle, Group, Rect } from '@shopify/react-native-skia';
import type { DreamSparkProjectile } from '../haunted/HauntedCombat';
import { VISUAL_TOKENS } from './VisualLanguage';

type Props = {
  projectile: DreamSparkProjectile;
  x: number;
  y: number;
  scale: number;
};

export function PixelDreamSpark({ projectile, x, y, scale }: Props) {
  const px = (value: number) => Math.max(1, Math.round(value * scale));
  const facing = projectile.vx < 0 ? -1 : 1;

  return (
    <Group transform={[{ translateX: x }, { translateY: y }, { scaleX: facing }]}>
      <Circle cx={0} cy={0} r={px(4)} color="rgba(255,228,92,0.12)" />
      <Rect x={px(-8)} y={px(-1)} width={px(3)} height={px(1)} color={VISUAL_TOKENS.fx.motion} />
      <Rect x={px(-6)} y={px(-1)} width={px(3)} height={px(2)} color={VISUAL_TOKENS.interactive.focus} />
      <Rect x={px(-3)} y={px(-2)} width={px(3)} height={px(4)} color={VISUAL_TOKENS.interactive.focusLight} />
      <Rect x={px(-1)} y={px(-4)} width={px(2)} height={px(8)} color={VISUAL_TOKENS.fx.sparkle} />
      <Rect x={px(-4)} y={px(-1)} width={px(8)} height={px(2)} color={VISUAL_TOKENS.fx.sparkle} />
      <Rect x={px(-1)} y={px(-1)} width={px(2)} height={px(2)} color="#fffdf0" />
      <Rect x={px(4)} y={px(-1)} width={px(2)} height={px(2)} color="#5beeff" />
      <Rect x={px(6)} y={0} width={px(1)} height={px(1)} color="#fff4a8" />
    </Group>
  );
}
