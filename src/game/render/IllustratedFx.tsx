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

type FxProps = {
  s: (value: number) => number;
  phase: number;
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
  const p = Math.min(phase, 2);
  const spread = [4, 8, 11][p];
  const core = [3.5, 2.8, 1.8][p];
  return (
    <>
      <Circle cx={0} cy={0} r={s(core + 3)} color="rgba(255,240,154,0.16)" />
      <Circle cx={0} cy={0} r={s(core)} color={VISUAL_TOKENS.fx.shock} />
      <ArcadeCross s={s} spread={spread} length={6 - p} thickness={2} color={VISUAL_TOKENS.fx.shock} />
      <Rect x={s(-spread - 5)} y={s(-spread - 1)} width={s(4)} height={s(1.5)} color={SCENE_TOKENS.sunrise} />
      <Rect x={s(spread + 1)} y={s(-spread - 1)} width={s(4)} height={s(1.5)} color={SCENE_TOKENS.sunrise} />
      <Rect x={s(-spread - 3)} y={s(spread + 1)} width={s(3)} height={s(1.5)} color={VISUAL_TOKENS.feedback.danger} />
      <Rect x={s(spread)} y={s(spread + 1)} width={s(3)} height={s(1.5)} color={VISUAL_TOKENS.feedback.danger} />
    </>
  );
}

function Noise({ s, phase }: FxProps) {
  const p = Math.min(phase, 2);
  const radius = [5, 9, 13][p];
  const alpha = [0.34, 0.25, 0.16][p];
  return (
    <>
      <RoundedRect x={s(-radius)} y={s(-2.4)} width={s(radius * 2)} height={s(4.8)} r={s(2.4)} color={`rgba(231,90,101,${alpha})`} />
      <RoundedRect x={s(-radius - 6)} y={s(-1.5)} width={s(5)} height={s(3)} r={s(1.5)} color={VISUAL_TOKENS.feedback.noise} />
      <RoundedRect x={s(radius + 1)} y={s(-1.5)} width={s(5)} height={s(3)} r={s(1.5)} color={VISUAL_TOKENS.feedback.noise} />
      <Rect x={s(-radius - 4)} y={s(-6)} width={s(2)} height={s(3.5)} color={VISUAL_TOKENS.feedback.danger} />
      <Rect x={s(radius + 2)} y={s(2.5)} width={s(2)} height={s(3.5)} color={VISUAL_TOKENS.feedback.danger} />
      <Circle cx={0} cy={0} r={s(2.4 - p * 0.4)} color={VISUAL_TOKENS.feedback.noise} />
      {p === 0 && <Circle cx={0} cy={0} r={s(5)} color="rgba(255,240,154,0.10)" />}
    </>
  );
}

function Dust({ s, phase }: FxProps) {
  const p = Math.min(phase, 2);
  const rise = [0, 3, 6][p];
  const spread = [0, 2, 5][p];
  return (
    <>
      <Circle cx={s(-7 - spread)} cy={s(-rise)} r={s(3.6 - p * 0.4)} color="rgba(217,201,168,0.55)" />
      <Circle cx={s(-1)} cy={s(-2 - rise)} r={s(4.8 - p * 0.5)} color="rgba(239,201,145,0.46)" />
      <Circle cx={s(6 + spread)} cy={s(-rise)} r={s(3.2 - p * 0.3)} color="rgba(217,201,168,0.42)" />
      <Circle cx={s(10 + spread)} cy={s(1 - rise)} r={s(2)} color="rgba(244,234,209,0.30)" />
      {p === 0 && <Rect x={s(-3)} y={s(-2)} width={s(6)} height={s(1.5)} color={SCENE_TOKENS.rugLight} />}
    </>
  );
}

function QuietFootsteps({ s, phase }: FxProps) {
  const offset = phase % 2 === 0 ? 0 : 3;
  return (
    <>
      <RoundedRect x={s(-7 + offset)} y={s(-2)} width={s(6)} height={s(2.8)} r={s(1.4)} color="rgba(85,182,106,0.56)" />
      <Circle cx={s(-2 + offset)} cy={s(-3)} r={s(1)} color="rgba(132,236,227,0.50)" />
      <RoundedRect x={s(1 - offset)} y={s(1)} width={s(6)} height={s(2.8)} r={s(1.4)} color="rgba(85,182,106,0.34)" />
      <Circle cx={s(6 - offset)} cy={0} r={s(0.8)} color="rgba(132,236,227,0.34)" />
    </>
  );
}

function Sparkle({ s, phase }: FxProps) {
  const p = Math.min(phase, 2);
  const spread = [3, 7, 10][p];
  const length = [5, 4, 3][p];
  return (
    <>
      <Circle cx={0} cy={0} r={s(4 + p * 2)} color="rgba(255,242,163,0.11)" />
      <Circle cx={0} cy={0} r={s(2.5 - p * 0.4)} color={VISUAL_TOKENS.fx.sparkle} />
      <ArcadeCross s={s} spread={spread} length={length} thickness={1.5} color={VISUAL_TOKENS.fx.sparkle} />
      <Circle cx={s(spread + 3)} cy={s(-spread)} r={s(1.4)} color={VISUAL_TOKENS.interactive.focusLight} />
      <Circle cx={s(-spread)} cy={s(spread + 2)} r={s(1)} color={SCENE_TOKENS.sunrise} />
    </>
  );
}

function Sleep({ s, phase }: FxProps) {
  const p = Math.min(phase, 2);
  const lift = p * 4;
  const drift = p * 2;
  return (
    <>
      <Rect x={s(-3 + drift)} y={s(-lift - 3)} width={s(7)} height={s(2)} color={VISUAL_TOKENS.fx.sleep} />
      <Rect x={s(2 + drift)} y={s(-lift - 1)} width={s(2)} height={s(2)} color={VISUAL_TOKENS.fx.sleep} />
      <Rect x={s(-3 + drift)} y={s(1 - lift)} width={s(7)} height={s(2)} color={VISUAL_TOKENS.fx.sleep} />
      <Circle cx={s(-5 + drift)} cy={s(-1 - lift)} r={s(1.1)} color="rgba(141,217,255,0.38)" />
    </>
  );
}

function MotionStreak({ s, phase }: FxProps) {
  const p = Math.min(phase, 2);
  const length = [9, 14, 19][p];
  return (
    <>
      <RoundedRect x={s(-length)} y={s(-6)} width={s(length)} height={s(2.2)} r={s(1.1)} color="rgba(132,236,227,0.52)" />
      <RoundedRect x={s(-length - 4)} y={s(-1)} width={s(length + 4)} height={s(2.5)} r={s(1.2)} color="rgba(246,211,125,0.56)" />
      <RoundedRect x={s(-length + 3)} y={s(5)} width={s(length - 3)} height={s(2)} r={s(1)} color="rgba(132,236,227,0.34)" />
      <Rect x={s(-length - 2)} y={s(9)} width={s(Math.max(3, length - 7))} height={s(1.2)} color="rgba(231,101,94,0.35)" />
    </>
  );
}

function ClothingBurst({ s, phase }: FxProps) {
  const p = Math.min(phase, 2);
  const spread = [5, 9, 13][p];
  return (
    <>
      <Circle cx={0} cy={0} r={s(3 + p)} color="rgba(255,240,154,0.10)" />
      <RoundedRect x={s(-spread)} y={s(-spread)} width={s(6)} height={s(3.5)} r={s(1.7)} color={VISUAL_TOKENS.actor.pajamas} />
      <RoundedRect x={s(spread - 6)} y={s(-spread + 2)} width={s(6)} height={s(3.5)} r={s(1.7)} color={VISUAL_TOKENS.actor.dressed} />
      <RoundedRect x={s(-spread + 2)} y={s(spread - 3)} width={s(6)} height={s(3.5)} r={s(1.7)} color={VISUAL_TOKENS.actor.slippers} />
      <Circle cx={s(spread)} cy={s(spread - 1)} r={s(2)} color={VISUAL_TOKENS.fx.sparkle} />
      <Rect x={s(-1)} y={s(-spread - 4)} width={s(2)} height={s(4)} color={VISUAL_TOKENS.actor.pajamasAccent} />
    </>
  );
}

function SuccessPop({ s, phase }: FxProps) {
  const p = Math.min(phase, 2);
  const radius = [6, 11, 16][p];
  return (
    <>
      <Circle cx={0} cy={0} r={s(radius)} color={`rgba(112,216,135,${[0.22, 0.15, 0.08][p]})`} />
      <Circle cx={0} cy={0} r={s(3.5 - p * 0.5)} color={VISUAL_TOKENS.feedback.success} />
      <ArcadeCross s={s} spread={radius - 2} length={5 - p} thickness={2} color={SCENE_TOKENS.sunrise} />
      <Circle cx={s(-radius)} cy={s(-radius / 2)} r={s(2)} color={SCENE_TOKENS.sunrise} />
      <Circle cx={s(radius)} cy={s(-radius / 2)} r={s(2)} color={VISUAL_TOKENS.fx.sparkle} />
      <Circle cx={0} cy={s(-radius)} r={s(2)} color={VISUAL_TOKENS.interactive.focusLight} />
      <Circle cx={s(radius * 0.7)} cy={s(radius * 0.65)} r={s(1.5)} color={VISUAL_TOKENS.feedback.success} />
    </>
  );
}

function FailureBurst({ s, phase }: FxProps) {
  const p = Math.min(phase, 2);
  const radius = [6, 11, 16][p];
  return (
    <>
      <Circle cx={0} cy={0} r={s(radius)} color={`rgba(230,79,98,${[0.20, 0.13, 0.07][p]})`} />
      <Rect x={s(-radius)} y={s(-2)} width={s(radius * 2)} height={s(4)} color="rgba(230,79,98,0.48)" />
      <Rect x={s(-2)} y={s(-radius)} width={s(4)} height={s(radius * 2)} color="rgba(230,79,98,0.40)" />
      <Rect x={s(-radius - 4)} y={s(-radius)} width={s(5)} height={s(2)} color={VISUAL_TOKENS.feedback.failure} />
      <Rect x={s(radius - 1)} y={s(radius)} width={s(5)} height={s(2)} color={VISUAL_TOKENS.feedback.failure} />
      <Circle cx={s(-radius)} cy={s(radius * 0.7)} r={s(1.8)} color={VISUAL_TOKENS.feedback.danger} />
      <Circle cx={s(radius)} cy={s(-radius * 0.7)} r={s(1.8)} color={VISUAL_TOKENS.actor.pajamasAccent} />
    </>
  );
}

function ArcadeCross({
  s,
  spread,
  length,
  thickness,
  color,
}: {
  s: (value: number) => number;
  spread: number;
  length: number;
  thickness: number;
  color: string;
}) {
  return (
    <>
      <Rect x={s(-thickness / 2)} y={s(-spread - length)} width={s(thickness)} height={s(length)} color={color} />
      <Rect x={s(-thickness / 2)} y={s(spread)} width={s(thickness)} height={s(length)} color={color} />
      <Rect x={s(-spread - length)} y={s(-thickness / 2)} width={s(length)} height={s(thickness)} color={color} />
      <Rect x={s(spread)} y={s(-thickness / 2)} width={s(length)} height={s(thickness)} color={color} />
    </>
  );
}
