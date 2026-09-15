import React from 'react';
import { Circle, Group, Rect } from '@shopify/react-native-skia';
import type { DreamSparkProjectile } from '../haunted/HauntedCombat';
import { HAUNTED_STAGE_TOKENS } from './HauntedStageLanguage';

type Props = {
  projectile: DreamSparkProjectile;
  x: number;
  y: number;
  scale: number;
};

export function PixelDreamSpark({ projectile, x, y, scale }: Props) {
  const px = (value: number) => Math.max(1, Math.round(value * scale));
  const facing = projectile.vx < 0 ? -1 : 1;
  const tokens = HAUNTED_STAGE_TOKENS.projectile;

  return (
    <Group transform={[{ translateX: x }, { translateY: y }, { scaleX: facing }]}>
      <Circle cx={0} cy={0} r={px(4)} color={tokens.glow} />
      <Rect x={px(-8)} y={px(-1)} width={px(3)} height={px(1)} color={tokens.trail} />
      <Rect x={px(-6)} y={px(-1)} width={px(3)} height={px(2)} color={tokens.trailAccent} />
      <Rect x={px(-3)} y={px(-2)} width={px(3)} height={px(4)} color={tokens.spark} />
      <Rect x={px(-1)} y={px(-4)} width={px(2)} height={px(8)} color={tokens.trailAccent} />
      <Rect x={px(-4)} y={px(-1)} width={px(8)} height={px(2)} color={tokens.trailAccent} />
      <Rect x={px(-1)} y={px(-1)} width={px(2)} height={px(2)} color={tokens.core} />
      <Rect x={px(4)} y={px(-1)} width={px(2)} height={px(2)} color={tokens.edge} />
      <Rect x={px(6)} y={0} width={px(1)} height={px(1)} color={tokens.spark} />
    </Group>
  );
}
