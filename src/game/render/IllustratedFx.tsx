import React from 'react';
import { Circle, Group, Rect, RoundedRect } from '@shopify/react-native-skia';
import type { FxVisualFrame } from '../presentation/FxSystem';
import { SCENE_TOKENS, VISUAL_TOKENS } from './VisualLanguage';

type Props = {
  fx: FxVisualFrame;
  x: number;
  y: number;
  scale: number;
};

export function IllustratedFx({ fx, x, y, scale }: Props) {
  const s = (value: number) => Math.round(value * scale);
  const phase = fx.frameIndex;

  return (
    <Group transform={[{ translateX: x }, { translateY: y }]}>
      {fx.clipId === 'shock' && <Shock s={s} phase={phase} />}
      {fx.clipId === 'noise' && <Noise s={s} phase={phase} />}
      {fx.clipId === 'dust' && <Dust s={s} phase={phase} />}
      {fx.clipId === 'quiet_footsteps' && <QuietFootsteps s={s} phase={phase} />}
      {fx.clipId === 'sparkle' && <Sparkle s={s} phase={phase} />}
      {fx.clipId === 'sleep_z' && <Sleep s={s} phase={phase} />}
      {fx.clipId === 'motion_streak' && <MotionStreak s={s} phase={phase} />}
      {fx.clipId === 'clothing_burst' && <ClothingBurst s={s} phase={phase} />}
      {fx.clipId === 'success_pop' && <SuccessPop s={s} phase={phase} />}
      {fx.clipId === 'failure_burst' && <FailureBurst s={s} phase={phase} />}
    </Group>
  );
}

function Shock({ s, phase }: FxProps) {
  const spread = 4 + Math.min(phase, 3) * 2;
  return (
    <>
      <Circle cx={0} cy={0} r={s(2.5)} color={VISUAL_TOKENS.fx.shock} />
      <Rect x={s(-1)} y={s(-spread - 5)} width={s(2)} height={s(5)} color={VISUAL_TOKENS.fx.shock} />
      <Rect x={s(-1)} y={s(spread)} width={s(2)} height={s(5)} color={VISUAL_TOKENS.fx.shock} />
      <Rect x={s(-spread - 5)} y={s(-1)} width={s(5)} height={s(2)} color={VISUAL_TOKENS.fx.shock} />
      <Rect x={s(spread)} y={s(-1)} width={s(5)} height={s(2)} color={VISUAL_TOKENS.fx.shock} />
      <Circle cx={s(-spread)} cy={s(-spread)} r={s(1.4)} color={SCENE_TOKENS.sunrise} />
      <Circle cx={s(spread)} cy={s(-spread)} r={s(1.4)} color={SCENE_TOKENS.sunrise} />
    </>
  );
}

function Noise({ s, phase }: FxProps) {
  const radius = 5 + phase * 2;
  return (
    <>
      <RoundedRect x={s(-radius)} y={s(-2)} width={s(radius * 2)} height={s(4)} r={s(2)} color="rgba(231,90,101,0.24)" />
      <RoundedRect x={s(-radius - 4)} y={s(-1)} width={s(4)} height={s(2)} r={s(1)} color={VISUAL_TOKENS.feedback.noise} />
      <RoundedRect x={s(radius)} y={s(-1)} width={s(4)} height={s(2)} r={s(1)} color={VISUAL_TOKENS.feedback.noise} />
      <Circle cx={0} cy={0} r={s(2)} color={VISUAL_TOKENS.feedback.noise} />
    </>
  );
}

function Dust({ s, phase }: FxProps) {
  const rise = Math.min(phase, 3) * 2;
  return (
    <>
      <Circle cx={s(-7)} cy={s(-rise)} r={s(3.5)} color="rgba(217,201,168,0.54)" />
      <Circle cx={s(-1)} cy={s(-2 - rise)} r={s(4.5)} color="rgba(239,201,145,0.46)" />
      <Circle cx={s(6)} cy={s(-rise)} r={s(3)} color="rgba(217,201,168,0.42)" />
      <Circle cx={s(10)} cy={s(1 - rise)} r={s(2)} color="rgba(244,234,209,0.30)" />
    </>
  );
}

function QuietFootsteps({ s, phase }: FxProps) {
  const offset = phase % 2 === 0 ? 0 : 3;
  return (
    <>
      <RoundedRect x={s(-6 + offset)} y={s(-2)} width={s(5)} height={s(2.5)} r={s(1.25)} color="rgba(85,182,106,0.50)" />
      <RoundedRect x={s(1 - offset)} y={s(1)} width={s(5)} height={s(2.5)} r={s(1.25)} color="rgba(85,182,106,0.34)" />
    </>
  );
}

function Sparkle({ s, phase }: FxProps) {
  const spread = 3 + phase * 2;
  return (
    <>
      <Circle cx={0} cy={0} r={s(2)} color={VISUAL_TOKENS.fx.sparkle} />
      <Rect x={s(-0.75)} y={s(-spread - 3)} width={s(1.5)} height={s(4)} color={VISUAL_TOKENS.fx.sparkle} />
      <Rect x={s(-0.75)} y={s(spread - 1)} width={s(1.5)} height={s(4)} color={VISUAL_TOKENS.fx.sparkle} />
      <Rect x={s(-spread - 3)} y={s(-0.75)} width={s(4)} height={s(1.5)} color={VISUAL_TOKENS.fx.sparkle} />
      <Rect x={s(spread - 1)} y={s(-0.75)} width={s(4)} height={s(1.5)} color={VISUAL_TOKENS.fx.sparkle} />
      <Circle cx={s(spread + 2)} cy={s(-spread)} r={s(1.2)} color={VISUAL_TOKENS.interactive.focusLight} />
    </>
  );
}

function Sleep({ s, phase }: FxProps) {
  const lift = phase * 3;
  return (
    <>
      <Rect x={s(-2 + phase)} y={s(-lift - 2)} width={s(6)} height={s(2)} color={VISUAL_TOKENS.fx.sleep} />
      <Rect x={s(2 + phase)} y={s(-lift)} width={s(2)} height={s(2)} color={VISUAL_TOKENS.fx.sleep} />
      <Rect x={s(-2 + phase)} y={s(2 - lift)} width={s(6)} height={s(2)} color={VISUAL_TOKENS.fx.sleep} />
    </>
  );
}

function MotionStreak({ s, phase }: FxProps) {
  const length = 7 + phase * 3;
  return (
    <>
      <RoundedRect x={s(-length)} y={s(-5)} width={s(length)} height={s(2)} r={s(1)} color="rgba(132,236,227,0.38)" />
      <RoundedRect x={s(-length - 3)} y={0} width={s(length + 3)} height={s(2)} r={s(1)} color="rgba(246,217,144,0.44)" />
      <RoundedRect x={s(-length + 2)} y={s(5)} width={s(length - 2)} height={s(2)} r={s(1)} color="rgba(132,236,227,0.25)" />
    </>
  );
}

function ClothingBurst({ s, phase }: FxProps) {
  const spread = 5 + phase * 2;
  return (
    <>
      <RoundedRect x={s(-spread)} y={s(-spread)} width={s(5)} height={s(3)} r={s(1.5)} color={VISUAL_TOKENS.actor.pajamas} />
      <RoundedRect x={s(spread - 5)} y={s(-spread + 2)} width={s(5)} height={s(3)} r={s(1.5)} color={VISUAL_TOKENS.actor.slippers} />
      <RoundedRect x={s(-spread + 2)} y={s(spread - 3)} width={s(5)} height={s(3)} r={s(1.5)} color={SCENE_TOKENS.bookGold} />
      <Circle cx={s(spread)} cy={s(spread - 1)} r={s(2)} color={VISUAL_TOKENS.fx.sparkle} />
    </>
  );
}

function SuccessPop({ s, phase }: FxProps) {
  const radius = 5 + phase * 3;
  return (
    <>
      <Circle cx={0} cy={0} r={s(radius)} color="rgba(112,216,135,0.16)" />
      <Circle cx={0} cy={0} r={s(3)} color={VISUAL_TOKENS.feedback.success} />
      <Circle cx={s(-radius)} cy={s(-radius / 2)} r={s(2)} color={SCENE_TOKENS.sunrise} />
      <Circle cx={s(radius)} cy={s(-radius / 2)} r={s(2)} color={VISUAL_TOKENS.fx.sparkle} />
      <Circle cx={0} cy={s(-radius)} r={s(2)} color={VISUAL_TOKENS.interactive.focusLight} />
    </>
  );
}

function FailureBurst({ s, phase }: FxProps) {
  const radius = 5 + phase * 3;
  return (
    <>
      <Circle cx={0} cy={0} r={s(radius)} color="rgba(230,79,98,0.14)" />
      <Rect x={s(-radius)} y={s(-2)} width={s(radius * 2)} height={s(4)} color="rgba(230,79,98,0.44)" />
      <Rect x={s(-2)} y={s(-radius)} width={s(4)} height={s(radius * 2)} color="rgba(230,79,98,0.36)" />
      <Circle cx={s(-radius)} cy={s(-radius)} r={s(2)} color={VISUAL_TOKENS.feedback.failure} />
      <Circle cx={s(radius)} cy={s(radius)} r={s(2)} color={VISUAL_TOKENS.feedback.failure} />
    </>
  );
}

type FxProps = {
  s: (value: number) => number;
  phase: number;
};
