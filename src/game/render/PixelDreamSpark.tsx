import React from 'react';
import { Circle, Group, Rect } from '@shopify/react-native-skia';
import type { DreamSparkProjectile } from '../haunted/HauntedCombat';
import { HAUNTED_STAGE_RULES, HAUNTED_STAGE_TOKENS } from './HauntedStageLanguage';

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
      <Circle cx={0} cy={0} r={px(HAUNTED_STAGE_RULES.projectileOuterGlowRadius)} color={tokens.outerGlow} />
      <Circle cx={0} cy={0} r={px(HAUNTED_STAGE_RULES.projectileInnerGlowRadius)} color={tokens.glow} />

      <Rect x={px(-11)} y={px(-1)} width={px(4)} height={px(1)} color={tokens.trail} />
      <Rect x={px(-8)} y={px(-2)} width={px(4)} height={px(2)} color={tokens.trailAccent} />
      <Rect x={px(-5)} y={px(-2)} width={px(3)} height={px(4)} color={tokens.spark} />

      <Rect x={px(-1)} y={px(-5)} width={px(2)} height={px(10)} color={tokens.trailAccent} />
      <Rect x={px(-5)} y={px(-1)} width={px(10)} height={px(2)} color={tokens.trailAccent} />
      <Rect x={px(-2)} y={px(-2)} width={px(4)} height={px(4)} color={tokens.core} />

      <Rect x={px(4)} y={px(-2)} width={px(3)} height={px(3)} color={tokens.edge} />
      <Rect x={px(7)} y={px(-1)} width={px(2)} height={px(2)} color={tokens.spark} />
      <Rect x={px(-9)} y={px(3)} width={px(2)} height={px(1)} color={tokens.edge} />
    </Group>
  );
}
