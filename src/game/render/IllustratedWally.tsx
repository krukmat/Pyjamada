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

type EyeMode = 'normal' | 'sleepy' | 'wide' | 'squint';
type MouthMode = 'neutral' | 'smile' | 'gasp' | 'frown';
type ArmMode = 'down' | 'forward' | 'up' | 'wide' | 'ears' | 'hips';

type Pose = {
  bobY: number;
  bodyX: number;
  headX: number;
  headY: number;
  crouch: number;
  eyeMode: EyeMode;
  mouthMode: MouthMode;
  armMode: ArmMode;
  step: number;
};

type ClothingPalette = {
  topShadow: string;
  top: string;
  topLight: string;
  legShadow: string;
  leg: string;
  legLight: string;
  accent: string;
};

export function IllustratedWally({ state, visual, x, y, scale, facing }: Props) {
  const pose = resolvePose(visual.clipId, visual.animation.frameIndex, state.wallyState);
  const s = (value: number) => Math.round(value * scale);
  const palette = clothingPalette(state.flags.dressed);

  const actor = (
    <Group transform={[{ translateX: x }, { translateY: y + s(pose.bobY) }]}>
      <Legs s={s} pose={pose} slippers={state.equipped.includes('slippers')} palette={palette} dressed={state.flags.dressed} />
      <Arms s={s} pose={pose} palette={palette} />
      <Body s={s} pose={pose} palette={palette} dressed={state.flags.dressed} />
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

function clothingPalette(dressed: boolean): ClothingPalette {
  return dressed
    ? {
        topShadow: VISUAL_TOKENS.actor.dressedShadow,
        top: VISUAL_TOKENS.actor.dressed,
        topLight: VISUAL_TOKENS.actor.dressedLight,
        legShadow: VISUAL_TOKENS.actor.trousersShadow,
        leg: VISUAL_TOKENS.actor.trousers,
        legLight: VISUAL_TOKENS.actor.trousersLight,
        accent: VISUAL_TOKENS.actor.pajamasAccent,
      }
    : {
        topShadow: VISUAL_TOKENS.actor.pajamasShadow,
        top: VISUAL_TOKENS.actor.pajamas,
        topLight: VISUAL_TOKENS.actor.pajamasLight,
        legShadow: VISUAL_TOKENS.actor.pajamasShadow,
        leg: VISUAL_TOKENS.actor.pajamas,
        legLight: VISUAL_TOKENS.actor.pajamasLight,
        accent: VISUAL_TOKENS.actor.pajamasAccent,
      };
}

function Body({ s, pose, palette, dressed }: { s: (value: number) => number; pose: Pose; palette: ClothingPalette; dressed: boolean }) {
  const y = -22 + pose.crouch;
  const height = 12 - pose.crouch * 0.28;
  const x = -7 + pose.bodyX;

  return (
    <>
      <RoundedRect x={s(x)} y={s(y)} width={s(14)} height={s(height)} r={s(4.4)} color={VISUAL_TOKENS.actor.outline} />
      <RoundedRect x={s(x + 1)} y={s(y + 1)} width={s(12)} height={s(height - 2)} r={s(3.5)} color={palette.top} />
      <RoundedRect x={s(x + 1.5)} y={s(y + 1.4)} width={s(3.2)} height={s(height - 3.2)} r={s(1.6)} color={palette.topLight} />
      <Rect x={s(x + 10)} y={s(y + 2)} width={s(2)} height={s(height - 3)} color={palette.topShadow} />
      <RoundedRect x={s(x + 5.7)} y={s(y + 1)} width={s(2.4)} height={s(4)} r={s(1.1)} color={palette.accent} />
      <Rect x={s(x + 2)} y={s(y + height - 3)} width={s(10)} height={s(1.4)} color={palette.topShadow} />
      {dressed ? (
        <RoundedRect x={s(x + 4.7)} y={s(y + 4.5)} width={s(4.6)} height={s(2.2)} r={s(1)} color={palette.accent} />
      ) : (
        <Circle cx={s(x + 7)} cy={s(y + 5.7)} r={s(1.25)} color={palette.accent} />
      )}
    </>
  );
}

function Legs({
  s,
  pose,
  slippers,
  palette,
  dressed,
}: {
  s: (value: number) => number;
  pose: Pose;
  slippers: boolean;
  palette: ClothingPalette;
  dressed: boolean;
}) {
  const short = pose.crouch > 2 ? 2 : 0;
  const leftX = -5.8 + pose.step;
  const rightX = 1.2 - pose.step;
  const top = -11 + pose.crouch;
  const height = 10 - short;

  return (
    <>
      <RoundedRect x={s(leftX)} y={s(top)} width={s(4.8)} height={s(height)} r={s(2.2)} color={VISUAL_TOKENS.actor.outline} />
      <RoundedRect x={s(leftX + 0.8)} y={s(top + 0.7)} width={s(3.2)} height={s(height - 1.5)} r={s(1.5)} color={palette.leg} />
      <Rect x={s(leftX + 1)} y={s(top + 1)} width={s(1)} height={s(height - 3)} color={palette.legLight} />
      <RoundedRect x={s(rightX)} y={s(top)} width={s(4.8)} height={s(height)} r={s(2.2)} color={VISUAL_TOKENS.actor.outline} />
      <RoundedRect x={s(rightX + 0.8)} y={s(top + 0.7)} width={s(3.2)} height={s(height - 1.5)} r={s(1.5)} color={palette.leg} />
      <Rect x={s(rightX + 2.6)} y={s(top + 1)} width={s(1)} height={s(height - 3)} color={palette.legShadow} />
      <Foot s={s} x={leftX - 1.2} y={-2 + pose.crouch} slippers={slippers} dressed={dressed} />
      <Foot s={s} x={rightX - 1.2} y={-2 + pose.crouch} slippers={slippers} dressed={dressed} />
    </>
  );
}

function Foot({ s, x, y, slippers, dressed }: { s: (value: number) => number; x: number; y: number; slippers: boolean; dressed: boolean }) {
  const fill = slippers ? VISUAL_TOKENS.actor.slippers : dressed ? VISUAL_TOKENS.actor.shoe : VISUAL_TOKENS.actor.skinShadow;
  return (
    <>
      <RoundedRect x={s(x)} y={s(y)} width={s(7)} height={s(3.6)} r={s(1.8)} color={VISUAL_TOKENS.actor.outline} />
      <RoundedRect x={s(x + 0.7)} y={s(y + 0.6)} width={s(5.7)} height={s(2.2)} r={s(1.1)} color={fill} />
      <Rect x={s(x + 3.8)} y={s(y + 0.6)} width={s(1.7)} height={s(0.8)} color={slippers ? VISUAL_TOKENS.actor.pajamasAccent : VISUAL_TOKENS.actor.skinLight} />
    </>
  );
}

function Arms({ s, pose, palette }: { s: (value: number) => number; pose: Pose; palette: ClothingPalette }) {
  const outline = VISUAL_TOKENS.actor.outline;
  const bodyY = -21 + pose.crouch;

  if (pose.armMode === 'up' || pose.armMode === 'ears') {
    const ears = pose.armMode === 'ears';
    const top = ears ? -31 : -34;
    const side = ears ? 9 : 10;
    return (
      <>
        <SleevedArm s={s} x={-side} y={top + 6} width={4.8} height={12} palette={palette} />
        <Hand s={s} x={-side + 2.4} y={top + 2.8} />
        <SleevedArm s={s} x={side - 4.8} y={top + 6} width={4.8} height={12} palette={palette} />
        <Hand s={s} x={side - 2.4} y={top + 2.8} />
      </>
    );
  }

  if (pose.armMode === 'forward') {
    return (
      <>
        <RoundedRect x={s(4 + pose.bodyX)} y={s(bodyY)} width={s(11)} height={s(5)} r={s(2.4)} color={outline} />
        <RoundedRect x={s(5 + pose.bodyX)} y={s(bodyY + 0.8)} width={s(8)} height={s(3.2)} r={s(1.5)} color={palette.top} />
        <Hand s={s} x={14.2 + pose.bodyX} y={bodyY + 2.5} />
        <SleevedArm s={s} x={-9 + pose.bodyX} y={bodyY} width={5} height={11} palette={palette} />
        <Hand s={s} x={-6.5 + pose.bodyX} y={bodyY + 10.4} />
      </>
    );
  }

  if (pose.armMode === 'wide') {
    return (
      <>
        <RoundedRect x={s(-15 + pose.bodyX)} y={s(bodyY)} width={s(10)} height={s(5)} r={s(2.4)} color={outline} />
        <RoundedRect x={s(-14 + pose.bodyX)} y={s(bodyY + 0.8)} width={s(8)} height={s(3.2)} r={s(1.5)} color={palette.top} />
        <Hand s={s} x={-15.2 + pose.bodyX} y={bodyY + 2.5} />
        <RoundedRect x={s(5 + pose.bodyX)} y={s(bodyY)} width={s(10)} height={s(5)} r={s(2.4)} color={outline} />
        <RoundedRect x={s(6 + pose.bodyX)} y={s(bodyY + 0.8)} width={s(8)} height={s(3.2)} r={s(1.5)} color={palette.top} />
        <Hand s={s} x={15.2 + pose.bodyX} y={bodyY + 2.5} />
      </>
    );
  }

  if (pose.armMode === 'hips') {
    return (
      <>
        <RoundedRect x={s(-10 + pose.bodyX)} y={s(bodyY + 2)} width={s(6)} height={s(5)} r={s(2.4)} color={outline} />
        <RoundedRect x={s(-9 + pose.bodyX)} y={s(bodyY + 2.8)} width={s(4.2)} height={s(3.2)} r={s(1.5)} color={palette.top} />
        <Hand s={s} x={-7.1 + pose.bodyX} y={bodyY + 7} />
        <RoundedRect x={s(4 + pose.bodyX)} y={s(bodyY + 2)} width={s(6)} height={s(5)} r={s(2.4)} color={outline} />
        <RoundedRect x={s(4.8 + pose.bodyX)} y={s(bodyY + 2.8)} width={s(4.2)} height={s(3.2)} r={s(1.5)} color={palette.top} />
        <Hand s={s} x={7.1 + pose.bodyX} y={bodyY + 7} />
      </>
    );
  }

  return (
    <>
      <SleevedArm s={s} x={-9 + pose.bodyX} y={bodyY} width={5} height={11} palette={palette} />
      <Hand s={s} x={-6.5 + pose.bodyX} y={bodyY + 10.5} />
      <SleevedArm s={s} x={4 + pose.bodyX} y={bodyY} width={5} height={11} palette={palette} />
      <Hand s={s} x={6.5 + pose.bodyX} y={bodyY + 10.5} />
    </>
  );
}

function SleevedArm({
  s,
  x,
  y,
  width,
  height,
  palette,
}: {
  s: (value: number) => number;
  x: number;
  y: number;
  width: number;
  height: number;
  palette: ClothingPalette;
}) {
  return (
    <>
      <RoundedRect x={s(x)} y={s(y)} width={s(width)} height={s(height)} r={s(2.3)} color={VISUAL_TOKENS.actor.outline} />
      <RoundedRect x={s(x + 0.8)} y={s(y + 0.8)} width={s(width - 1.6)} height={s(height - 1.6)} r={s(1.5)} color={palette.top} />
      <Rect x={s(x + 1)} y={s(y + 1)} width={s(1)} height={s(Math.max(2, height - 3))} color={palette.topLight} />
    </>
  );
}

function Hand({ s, x, y }: { s: (value: number) => number; x: number; y: number }) {
  return (
    <>
      <Circle cx={s(x)} cy={s(y)} r={s(2.5)} color={VISUAL_TOKENS.actor.outline} />
      <Circle cx={s(x)} cy={s(y)} r={s(1.7)} color={VISUAL_TOKENS.actor.skin} />
      <Circle cx={s(x - 0.5)} cy={s(y - 0.5)} r={s(0.6)} color={VISUAL_TOKENS.actor.skinLight} />
    </>
  );
}

function Head({ s, pose }: { s: (value: number) => number; pose: Pose }) {
  const cx = pose.headX;
  const cy = -31 + pose.headY + pose.crouch;

  return (
    <>
      <Circle cx={s(cx - 9)} cy={s(cy + 1)} r={s(3.2)} color={VISUAL_TOKENS.actor.outline} />
      <Circle cx={s(cx - 9)} cy={s(cy + 1)} r={s(2.1)} color={VISUAL_TOKENS.actor.skin} />
      <Circle cx={s(cx + 9)} cy={s(cy + 1)} r={s(3.2)} color={VISUAL_TOKENS.actor.outline} />
      <Circle cx={s(cx + 9)} cy={s(cy + 1)} r={s(2.1)} color={VISUAL_TOKENS.actor.skin} />

      <Circle cx={s(cx)} cy={s(cy)} r={s(10.4)} color={VISUAL_TOKENS.actor.outline} />
      <Circle cx={s(cx)} cy={s(cy)} r={s(9.1)} color={VISUAL_TOKENS.actor.skin} />
      <Circle cx={s(cx - 3.2)} cy={s(cy - 3)} r={s(4.6)} color={VISUAL_TOKENS.actor.skinLight} />
      <Circle cx={s(cx + 5.4)} cy={s(cy + 4)} r={s(2.8)} color={VISUAL_TOKENS.actor.skinShadow} />

      <Hair s={s} cx={cx} cy={cy} />
      <Brows s={s} cx={cx} cy={cy} mode={pose.eyeMode} />
      <Eyes s={s} cx={cx} cy={cy} mode={pose.eyeMode} />
      <RoundedRect x={s(cx + 4)} y={s(cy + 1)} width={s(2.2)} height={s(1.5)} r={s(0.7)} color={VISUAL_TOKENS.actor.skinShadow} />
      <Mouth s={s} cx={cx} cy={cy} mode={pose.mouthMode} />
    </>
  );
}

function Hair({ s, cx, cy }: { s: (value: number) => number; cx: number; cy: number }) {
  return (
    <>
      <RoundedRect x={s(cx - 8.3)} y={s(cy - 10.4)} width={s(16.5)} height={s(5.8)} r={s(2.9)} color={VISUAL_TOKENS.actor.hairDeep} />
      <Circle cx={s(cx - 5.6)} cy={s(cy - 8.4)} r={s(3.6)} color={VISUAL_TOKENS.actor.hair} />
      <Circle cx={s(cx)} cy={s(cy - 9.7)} r={s(4.1)} color={VISUAL_TOKENS.actor.hair} />
      <Circle cx={s(cx + 5.5)} cy={s(cy - 8.2)} r={s(3.8)} color={VISUAL_TOKENS.actor.hair} />
      <RoundedRect x={s(cx - 7.2)} y={s(cy - 7.6)} width={s(5)} height={s(3.6)} r={s(1.8)} color={VISUAL_TOKENS.actor.hair} />
      <RoundedRect x={s(cx + 3.7)} y={s(cy - 7.4)} width={s(5.8)} height={s(3.5)} r={s(1.7)} color={VISUAL_TOKENS.actor.hair} />
      <Circle cx={s(cx - 2.5)} cy={s(cy - 10.2)} r={s(1.4)} color={VISUAL_TOKENS.actor.hairLight} />
      <Circle cx={s(cx + 2.8)} cy={s(cy - 9.2)} r={s(1.2)} color={VISUAL_TOKENS.actor.hairLight} />
      <RoundedRect x={s(cx - 1.5)} y={s(cy - 13.2)} width={s(3)} height={s(5)} r={s(1.5)} color={VISUAL_TOKENS.actor.hairDeep} />
      <RoundedRect x={s(cx + 2.3)} y={s(cy - 12.1)} width={s(2.7)} height={s(4)} r={s(1.3)} color={VISUAL_TOKENS.actor.hairDeep} />
    </>
  );
}

function Brows({ s, cx, cy, mode }: { s: (value: number) => number; cx: number; cy: number; mode: EyeMode }) {
  const y = mode === 'wide' ? cy - 4.6 : cy - 3.8;
  const innerDrop = mode === 'squint' ? 0.8 : 0;
  return (
    <>
      <RoundedRect x={s(cx - 5.3)} y={s(y + innerDrop)} width={s(3.8)} height={s(1.2)} r={s(0.6)} color={VISUAL_TOKENS.actor.hairDeep} />
      <RoundedRect x={s(cx + 1.4)} y={s(y)} width={s(3.8)} height={s(1.2)} r={s(0.6)} color={VISUAL_TOKENS.actor.hairDeep} />
    </>
  );
}

function Eyes({ s, cx, cy, mode }: { s: (value: number) => number; cx: number; cy: number; mode: EyeMode }) {
  if (mode === 'sleepy') {
    return (
      <>
        <RoundedRect x={s(cx - 5)} y={s(cy - 1.4)} width={s(3.8)} height={s(1.2)} r={s(0.6)} color={VISUAL_TOKENS.actor.outline} />
        <RoundedRect x={s(cx + 1.2)} y={s(cy - 1.4)} width={s(3.8)} height={s(1.2)} r={s(0.6)} color={VISUAL_TOKENS.actor.outline} />
      </>
    );
  }

  if (mode === 'squint') {
    return (
      <>
        <RoundedRect x={s(cx - 5)} y={s(cy - 1)} width={s(4)} height={s(1.4)} r={s(0.7)} color={VISUAL_TOKENS.actor.outline} />
        <RoundedRect x={s(cx + 1)} y={s(cy - 1)} width={s(4)} height={s(1.4)} r={s(0.7)} color={VISUAL_TOKENS.actor.outline} />
      </>
    );
  }

  const whiteRadius = mode === 'wide' ? 2.5 : 2.1;
  const pupilRadius = mode === 'wide' ? 1.25 : 1.05;
  return (
    <>
      <Circle cx={s(cx - 3.4)} cy={s(cy - 0.8)} r={s(whiteRadius)} color={VISUAL_TOKENS.actor.eyeWhite} />
      <Circle cx={s(cx + 2.8)} cy={s(cy - 0.8)} r={s(whiteRadius)} color={VISUAL_TOKENS.actor.eyeWhite} />
      <Circle cx={s(cx - 3)} cy={s(cy - 0.5)} r={s(pupilRadius)} color={VISUAL_TOKENS.actor.outline} />
      <Circle cx={s(cx + 3.2)} cy={s(cy - 0.5)} r={s(pupilRadius)} color={VISUAL_TOKENS.actor.outline} />
      <Circle cx={s(cx - 3.4)} cy={s(cy - 1.1)} r={s(0.45)} color={VISUAL_TOKENS.actor.eyeWhite} />
      <Circle cx={s(cx + 2.8)} cy={s(cy - 1.1)} r={s(0.45)} color={VISUAL_TOKENS.actor.eyeWhite} />
    </>
  );
}

function Mouth({ s, cx, cy, mode }: { s: (value: number) => number; cx: number; cy: number; mode: MouthMode }) {
  if (mode === 'gasp') {
    return (
      <>
        <Circle cx={s(cx)} cy={s(cy + 5)} r={s(2.5)} color={VISUAL_TOKENS.actor.outline} />
        <Circle cx={s(cx - 0.4)} cy={s(cy + 4.5)} r={s(0.8)} color={VISUAL_TOKENS.actor.skinLight} />
      </>
    );
  }

  if (mode === 'smile') {
    return (
      <>
        <RoundedRect x={s(cx - 3.5)} y={s(cy + 3.8)} width={s(7)} height={s(2.5)} r={s(1.2)} color={VISUAL_TOKENS.actor.outline} />
        <RoundedRect x={s(cx - 2.5)} y={s(cy + 3.8)} width={s(5)} height={s(1)} r={s(0.5)} color={VISUAL_TOKENS.actor.eyeWhite} />
      </>
    );
  }

  if (mode === 'frown') {
    return (
      <>
        <Rect x={s(cx - 3)} y={s(cy + 5)} width={s(2.2)} height={s(1.2)} color={VISUAL_TOKENS.actor.outline} />
        <Rect x={s(cx - 0.8)} y={s(cy + 4.2)} width={s(1.6)} height={s(1.2)} color={VISUAL_TOKENS.actor.outline} />
        <Rect x={s(cx + 0.8)} y={s(cy + 5)} width={s(2.2)} height={s(1.2)} color={VISUAL_TOKENS.actor.outline} />
      </>
    );
  }

  return <RoundedRect x={s(cx - 2.3)} y={s(cy + 4.4)} width={s(4.6)} height={s(1.2)} r={s(0.6)} color={VISUAL_TOKENS.actor.outline} />;
}

function resolvePose(clipId: string, frameIndex: number, state: SystemicRunState['wallyState']): Pose {
  const step = frameIndex % 2 === 0 ? -1.2 : 1.2;
  const base: Pose = {
    bobY: 0,
    bodyX: 0,
    headX: 0,
    headY: 0,
    crouch: 0,
    eyeMode: state === 'sleepy' ? 'sleepy' : state === 'startled' ? 'wide' : state === 'rushed' ? 'squint' : 'normal',
    mouthMode: state === 'startled' ? 'gasp' : state === 'rushed' ? 'frown' : 'neutral',
    armMode: 'down',
    step: 0,
  };

  if (clipId.startsWith('walk_')) {
    return {
      ...base,
      bobY: frameIndex % 2 === 0 ? 0 : -1.2,
      bodyX: state === 'rushed' ? 1.8 : step * 0.45,
      headX: state === 'rushed' ? 2.2 : step * 0.25,
      step,
    };
  }
  if (clipId === 'wake') return { ...base, bobY: -1.5, headY: -1, eyeMode: 'wide', mouthMode: 'gasp', armMode: 'wide' };
  if (clipId === 'alarm_recoil') return { ...base, bobY: -1.5, bodyX: -1.5, headX: -2.5, headY: -1, eyeMode: 'wide', mouthMode: 'gasp', armMode: 'up', step: 1.4 };
  if (clipId === 'fumble') return { ...base, bodyX: 2.5, headX: 3, headY: 1, eyeMode: 'wide', mouthMode: 'gasp', armMode: 'forward', crouch: 2.5 };
  if (clipId === 'equip_slippers') return { ...base, crouch: 4.5, headY: 3, eyeMode: 'normal', mouthMode: 'smile', armMode: 'forward' };
  if (clipId === 'wardrobe_change') return { ...base, bobY: frameIndex % 2 === 0 ? -1.5 : 0, eyeMode: 'wide', mouthMode: 'smile', armMode: 'wide', step };
  if (clipId === 'collect_keys') return { ...base, bobY: -1, headX: 1.5, mouthMode: 'smile', armMode: 'forward' };
  if (clipId === 'window_react') return { ...base, headX: 1.5, eyeMode: 'wide', mouthMode: 'neutral', armMode: 'forward' };
  if (clipId === 'rest') return { ...base, crouch: 5, headY: 4, headX: -1, eyeMode: 'sleepy', mouthMode: 'smile', armMode: 'down' };
  if (clipId === 'success') return { ...base, bobY: -4.5, headY: -1, eyeMode: 'wide', mouthMode: 'smile', armMode: 'up', step };
  if (clipId === 'fail_noise') return { ...base, crouch: 1, headY: -1, eyeMode: 'wide', mouthMode: 'gasp', armMode: 'ears' };
  if (clipId === 'fail_exhausted') return { ...base, crouch: 5.5, headY: 5, headX: -2, eyeMode: 'sleepy', mouthMode: 'frown', armMode: 'down' };
  if (clipId === 'fail_late') return { ...base, bodyX: 2.5, headX: 3, eyeMode: 'squint', mouthMode: 'frown', armMode: 'wide', step };
  if (clipId === 'idle_sleepy') return { ...base, bodyX: -0.7, headX: -1.8, headY: 2.4, crouch: 1, eyeMode: 'sleepy', mouthMode: 'neutral' };
  if (clipId === 'idle_normal') return { ...base, headY: -0.4, mouthMode: 'smile', armMode: 'hips' };
  if (clipId === 'idle_rushed') return { ...base, bobY: frameIndex % 2 === 0 ? 0 : -1, bodyX: 1.4, headX: 2.2, eyeMode: 'squint', mouthMode: 'frown', armMode: 'forward', step: 0.5 };
  if (clipId === 'idle_startled') return { ...base, bobY: -1, headY: -1, eyeMode: 'wide', mouthMode: 'gasp', armMode: 'wide' };
  return base;
}
