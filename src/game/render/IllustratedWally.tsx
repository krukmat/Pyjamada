import React from 'react';
import { Circle, Group, Rect, RoundedRect } from '@shopify/react-native-skia';
import type { WallyVisualFrame } from '../presentation/WallyAnimator';
import type { SystemicRunState } from '../systemic/SystemicState';
import { VISUAL_TOKENS } from './VisualLanguage';

type Props = {
  state: SystemicRunState;
  visual: WallyVisualFrame;
  x: number;
  y: number;
  scale: number;
  facing: 'left' | 'right';
};

type EyeMode = 'normal' | 'sleepy' | 'wide';
type ArmMode = 'down' | 'forward' | 'up' | 'wide' | 'ears';

type Pose = {
  bobY: number;
  bodyX: number;
  headX: number;
  headY: number;
  crouch: number;
  eyeMode: EyeMode;
  armMode: ArmMode;
  step: number;
};

export function IllustratedWally({ state, visual, x, y, scale, facing }: Props) {
  const pose = resolvePose(visual.clipId, visual.animation.frameIndex, state.wallyState);
  const s = (value: number) => Math.round(value * scale);

  const actor = (
    <Group transform={[{ translateX: x }, { translateY: y + s(pose.bobY) }]}>
      <Legs s={s} pose={pose} slippers={state.equipped.includes('slippers')} />
      <Body s={s} pose={pose} />
      <Arms s={s} pose={pose} />
      <Head s={s} pose={pose} />
    </Group>
  );

  if (facing === 'right') return actor;
  return (
    <Group transform={[{ translateX: x }, { scaleX: -1 }, { translateX: -x }]}>
      {actor}
    </Group>
  );
}

function Body({ s, pose }: { s: (value: number) => number; pose: Pose }) {
  const y = -17 + pose.crouch;
  return (
    <>
      <RoundedRect x={s(-6 + pose.bodyX)} y={s(y)} width={s(12)} height={s(11 - pose.crouch * 0.35)} r={s(4)} color={VISUAL_TOKENS.actor.outline} />
      <RoundedRect x={s(-5 + pose.bodyX)} y={s(y + 1)} width={s(10)} height={s(9 - pose.crouch * 0.35)} r={s(3)} color={VISUAL_TOKENS.actor.pajamas} />
      <Rect x={s(-4 + pose.bodyX)} y={s(y + 2)} width={s(2)} height={s(6)} color={VISUAL_TOKENS.actor.pajamasLight} />
      <Rect x={s(2 + pose.bodyX)} y={s(y + 2)} width={s(2)} height={s(7)} color={VISUAL_TOKENS.actor.pajamasShadow} />
    </>
  );
}

function Legs({ s, pose, slippers }: { s: (value: number) => number; pose: Pose; slippers: boolean }) {
  const short = pose.crouch > 1 ? 2 : 0;
  const leftX = -5 + pose.step;
  const rightX = 1 - pose.step;
  return (
    <>
      <RoundedRect x={s(leftX)} y={s(-8 + pose.crouch)} width={s(4)} height={s(8 - short)} r={s(2)} color={VISUAL_TOKENS.actor.outline} />
      <RoundedRect x={s(leftX + 1)} y={s(-7 + pose.crouch)} width={s(2)} height={s(6 - short)} r={s(1)} color={VISUAL_TOKENS.actor.pajamasShadow} />
      <RoundedRect x={s(rightX)} y={s(-8 + pose.crouch)} width={s(4)} height={s(8 - short)} r={s(2)} color={VISUAL_TOKENS.actor.outline} />
      <RoundedRect x={s(rightX + 1)} y={s(-7 + pose.crouch)} width={s(2)} height={s(6 - short)} r={s(1)} color={VISUAL_TOKENS.actor.pajamas} />
      {slippers && (
        <>
          <RoundedRect x={s(leftX - 1)} y={s(-2 + pose.crouch)} width={s(6)} height={s(3)} r={s(1.5)} color={VISUAL_TOKENS.actor.slippers} />
          <RoundedRect x={s(rightX - 1)} y={s(-2 + pose.crouch)} width={s(6)} height={s(3)} r={s(1.5)} color={VISUAL_TOKENS.actor.slippers} />
        </>
      )}
    </>
  );
}

function Arms({ s, pose }: { s: (value: number) => number; pose: Pose }) {
  const skin = VISUAL_TOKENS.actor.skin;
  const outline = VISUAL_TOKENS.actor.outline;
  const bodyY = -16 + pose.crouch;

  if (pose.armMode === 'up' || pose.armMode === 'ears') {
    const nearHead = pose.armMode === 'ears';
    const top = nearHead ? -27 : -29;
    const side = nearHead ? 7 : 8;
    return (
      <>
        <RoundedRect x={s(-side)} y={s(top)} width={s(4)} height={s(12)} r={s(2)} color={outline} />
        <RoundedRect x={s(-side + 1)} y={s(top + 1)} width={s(2)} height={s(9)} r={s(1)} color={skin} />
        <RoundedRect x={s(side - 4)} y={s(top)} width={s(4)} height={s(12)} r={s(2)} color={outline} />
        <RoundedRect x={s(side - 3)} y={s(top + 1)} width={s(2)} height={s(9)} r={s(1)} color={skin} />
      </>
    );
  }

  if (pose.armMode === 'forward') {
    return (
      <>
        <RoundedRect x={s(4)} y={s(bodyY)} width={s(11)} height={s(4)} r={s(2)} color={outline} />
        <RoundedRect x={s(5)} y={s(bodyY + 1)} width={s(9)} height={s(2)} r={s(1)} color={skin} />
        <RoundedRect x={s(-8)} y={s(bodyY)} width={s(4)} height={s(10)} r={s(2)} color={outline} />
        <RoundedRect x={s(-7)} y={s(bodyY + 1)} width={s(2)} height={s(8)} r={s(1)} color={skin} />
      </>
    );
  }

  if (pose.armMode === 'wide') {
    return (
      <>
        <RoundedRect x={s(-14)} y={s(bodyY)} width={s(9)} height={s(4)} r={s(2)} color={outline} />
        <RoundedRect x={s(-13)} y={s(bodyY + 1)} width={s(7)} height={s(2)} r={s(1)} color={skin} />
        <RoundedRect x={s(5)} y={s(bodyY)} width={s(9)} height={s(4)} r={s(2)} color={outline} />
        <RoundedRect x={s(6)} y={s(bodyY + 1)} width={s(7)} height={s(2)} r={s(1)} color={skin} />
      </>
    );
  }

  return (
    <>
      <RoundedRect x={s(-8)} y={s(bodyY)} width={s(4)} height={s(10)} r={s(2)} color={outline} />
      <RoundedRect x={s(-7)} y={s(bodyY + 1)} width={s(2)} height={s(8)} r={s(1)} color={skin} />
      <RoundedRect x={s(4)} y={s(bodyY)} width={s(4)} height={s(10)} r={s(2)} color={outline} />
      <RoundedRect x={s(5)} y={s(bodyY + 1)} width={s(2)} height={s(8)} r={s(1)} color={skin} />
    </>
  );
}

function Head({ s, pose }: { s: (value: number) => number; pose: Pose }) {
  const cx = pose.headX;
  const cy = -23 + pose.headY + pose.crouch;
  return (
    <>
      <Circle cx={s(cx)} cy={s(cy)} r={s(8)} color={VISUAL_TOKENS.actor.outline} />
      <Circle cx={s(cx)} cy={s(cy)} r={s(7)} color={VISUAL_TOKENS.actor.skin} />
      <Circle cx={s(cx - 2)} cy={s(cy - 2)} r={s(4)} color={VISUAL_TOKENS.actor.skinLight} />
      <RoundedRect x={s(cx - 6)} y={s(cy - 8)} width={s(11)} height={s(4)} r={s(2)} color={VISUAL_TOKENS.actor.outline} />
      <Circle cx={s(cx - 4)} cy={s(cy - 6)} r={s(2)} color={VISUAL_TOKENS.actor.outline} />
      <Circle cx={s(cx + 3)} cy={s(cy - 6)} r={s(2.5)} color={VISUAL_TOKENS.actor.outline} />
      <Eyes s={s} cx={cx} cy={cy} mode={pose.eyeMode} />
      <Rect x={s(cx + 3)} y={s(cy + 1)} width={s(2)} height={s(1)} color={VISUAL_TOKENS.actor.skinShadow} />
      <RoundedRect x={s(cx - 2)} y={s(cy + 3)} width={s(5)} height={s(1.5)} r={s(0.75)} color={VISUAL_TOKENS.actor.outline} />
    </>
  );
}

function Eyes({ s, cx, cy, mode }: { s: (value: number) => number; cx: number; cy: number; mode: EyeMode }) {
  if (mode === 'sleepy') {
    return (
      <>
        <Rect x={s(cx - 4)} y={s(cy - 1)} width={s(3)} height={s(1)} color={VISUAL_TOKENS.actor.outline} />
        <Rect x={s(cx + 1)} y={s(cy - 1)} width={s(3)} height={s(1)} color={VISUAL_TOKENS.actor.outline} />
      </>
    );
  }
  const radius = mode === 'wide' ? 1.7 : 1.2;
  return (
    <>
      <Circle cx={s(cx - 3)} cy={s(cy - 1)} r={s(radius)} color={VISUAL_TOKENS.actor.outline} />
      <Circle cx={s(cx + 2)} cy={s(cy - 1)} r={s(radius)} color={VISUAL_TOKENS.actor.outline} />
    </>
  );
}

function resolvePose(clipId: string, frameIndex: number, state: SystemicRunState['wallyState']): Pose {
  const step = frameIndex % 2 === 0 ? -1 : 1;
  const base: Pose = {
    bobY: 0,
    bodyX: 0,
    headX: 0,
    headY: 0,
    crouch: 0,
    eyeMode: state === 'sleepy' ? 'sleepy' : state === 'startled' ? 'wide' : 'normal',
    armMode: 'down',
    step: 0,
  };

  if (clipId.startsWith('walk_')) return { ...base, bobY: frameIndex % 2 === 0 ? 0 : -1, bodyX: step * 0.5, step };
  if (clipId === 'wake') return { ...base, bobY: -1, headY: -1, eyeMode: 'wide', armMode: 'wide' };
  if (clipId === 'alarm_recoil') return { ...base, bobY: -1, bodyX: -1, headX: -2, eyeMode: 'wide', armMode: 'up', step: 1 };
  if (clipId === 'fumble') return { ...base, bodyX: 2, headX: 2, headY: 1, eyeMode: 'wide', armMode: 'forward', crouch: 2 };
  if (clipId === 'equip_slippers') return { ...base, crouch: 4, headY: 2, armMode: 'forward' };
  if (clipId === 'wardrobe_change') return { ...base, bobY: frameIndex % 2 === 0 ? -1 : 0, armMode: 'wide', step };
  if (clipId === 'collect_keys') return { ...base, bobY: -1, headX: 1, armMode: 'forward' };
  if (clipId === 'window_react') return { ...base, headX: 1, armMode: 'forward' };
  if (clipId === 'rest') return { ...base, crouch: 5, headY: 3, eyeMode: 'sleepy', armMode: 'down' };
  if (clipId === 'success') return { ...base, bobY: -4, eyeMode: 'wide', armMode: 'up', step };
  if (clipId === 'fail_noise') return { ...base, crouch: 1, eyeMode: 'wide', armMode: 'ears' };
  if (clipId === 'fail_exhausted') return { ...base, crouch: 5, headY: 4, headX: -1, eyeMode: 'sleepy', armMode: 'down' };
  if (clipId === 'fail_late') return { ...base, bodyX: 2, headX: 2, eyeMode: 'wide', armMode: 'wide', step };
  if (clipId === 'idle_sleepy') return { ...base, headX: -1, headY: 1, eyeMode: 'sleepy' };
  if (clipId === 'idle_rushed') return { ...base, bobY: frameIndex % 2 === 0 ? 0 : -1, headX: 1 };
  if (clipId === 'idle_startled') return { ...base, eyeMode: 'wide', armMode: 'wide' };
  return base;
}
