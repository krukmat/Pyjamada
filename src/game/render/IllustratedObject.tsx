import React from 'react';
import { Circle, Group, Rect, RoundedRect } from '@shopify/react-native-skia';
import type { ObjectVisualFrame } from '../presentation/ObjectAnimator';
import type { SystemicObjectId } from '../systemic/SystemicState';
import { SCENE_TOKENS, VISUAL_TOKENS } from './VisualLanguage';

type Props = {
  objectId: SystemicObjectId;
  visual: ObjectVisualFrame;
  x: number;
  y: number;
  scale: number;
};

export function IllustratedObject({ objectId, visual, x, y, scale }: Props) {
  const s = (value: number) => Math.round(value * scale);
  const phase = visual.animation.frameIndex % 2 === 0 ? 0 : 1;
  return (
    <Group transform={[{ translateX: x }, { translateY: y }]}>
      {objectId === 'bed' && <Bed s={s} clipId={visual.clipId} phase={phase} />}
      {objectId === 'slippers' && <Slippers s={s} clipId={visual.clipId} phase={phase} />}
      {objectId === 'alarm-clock' && <Alarm s={s} clipId={visual.clipId} phase={phase} />}
      {objectId === 'wardrobe' && <Wardrobe s={s} clipId={visual.clipId} phase={phase} />}
      {objectId === 'keys' && <Keys s={s} clipId={visual.clipId} phase={phase} />}
      {objectId === 'window' && <WindowCue s={s} clipId={visual.clipId} phase={phase} />}
    </Group>
  );
}

function Bed({ s, clipId, phase }: { s: (value: number) => number; clipId: string; phase: number }) {
  const rest = clipId === 'bed_rest' ? phase : 0;
  return (
    <>
      <RoundedRect x={s(-15)} y={s(-17 + rest)} width={s(30)} height={s(16)} r={s(4)} color={SCENE_TOKENS.woodDeep} />
      <RoundedRect x={s(-13)} y={s(-15 + rest)} width={s(27)} height={s(12)} r={s(3)} color="#d9b08b" />
      <RoundedRect x={s(-10)} y={s(-14 + rest)} width={s(9)} height={s(5)} r={s(2.5)} color={SCENE_TOKENS.cloud} />
      <RoundedRect x={s(-2)} y={s(-10 + rest)} width={s(15)} height={s(7)} r={s(2)} color="#6e91a4" />
      <Rect x={s(-2)} y={s(-9 + rest)} width={s(13)} height={s(2)} color="#91b1bb" />
      <Rect x={s(-14)} y={s(-2)} width={s(3)} height={s(4)} color={SCENE_TOKENS.woodDeep} />
      <Rect x={s(11)} y={s(-2)} width={s(3)} height={s(4)} color={SCENE_TOKENS.woodDeep} />
    </>
  );
}

function Slippers({ s, clipId, phase }: { s: (value: number) => number; clipId: string; phase: number }) {
  if (clipId === 'slippers_empty') return null;
  const lift = clipId === 'slippers_equip' ? 2 + phase : 0;
  return (
    <>
      <RoundedRect x={s(-8)} y={s(-4 - lift)} width={s(7)} height={s(4)} r={s(2)} color={VISUAL_TOKENS.actor.outline} />
      <RoundedRect x={s(-7)} y={s(-3 - lift)} width={s(6)} height={s(3)} r={s(1.5)} color={VISUAL_TOKENS.actor.slippers} />
      <RoundedRect x={s(1)} y={s(-4 - lift)} width={s(7)} height={s(4)} r={s(2)} color={VISUAL_TOKENS.actor.outline} />
      <RoundedRect x={s(2)} y={s(-3 - lift)} width={s(6)} height={s(3)} r={s(1.5)} color="#e58bc3" />
    </>
  );
}

function Alarm({ s, clipId, phase }: { s: (value: number) => number; clipId: string; phase: number }) {
  const ringing = clipId === 'alarm_ring' || clipId === 'alarm_ring_strong';
  const strong = clipId === 'alarm_ring_strong';
  const wobble = ringing ? (phase === 0 ? -1 : 1) * (strong ? 2 : 1) : 0;
  return (
    <Group transform={[{ translateX: s(wobble) }]}>
      <Circle cx={0} cy={s(-7)} r={s(6)} color={VISUAL_TOKENS.actor.outline} />
      <Circle cx={0} cy={s(-7)} r={s(5)} color="#eab85f" />
      <Circle cx={0} cy={s(-7)} r={s(3.5)} color="#f5dfad" />
      <Rect x={s(-1)} y={s(-7)} width={s(1)} height={s(3)} color={SCENE_TOKENS.trimDark} />
      <Rect x={0} y={s(-7)} width={s(3)} height={s(1)} color={SCENE_TOKENS.trimDark} />
      <RoundedRect x={s(-6)} y={s(-14)} width={s(5)} height={s(3)} r={s(1.5)} color="#d88a56" />
      <RoundedRect x={s(1)} y={s(-14)} width={s(5)} height={s(3)} r={s(1.5)} color="#d88a56" />
      <Rect x={s(-4)} y={s(-2)} width={s(2)} height={s(3)} color={SCENE_TOKENS.trimDark} />
      <Rect x={s(2)} y={s(-2)} width={s(2)} height={s(3)} color={SCENE_TOKENS.trimDark} />
      {ringing && (
        <>
          <Rect x={s(-10)} y={s(-13)} width={s(3)} height={s(1)} color={VISUAL_TOKENS.feedback.rush} />
          <Rect x={s(7)} y={s(-13)} width={s(3)} height={s(1)} color={VISUAL_TOKENS.feedback.rush} />
        </>
      )}
    </Group>
  );
}

function Wardrobe({ s, clipId, phase }: { s: (value: number) => number; clipId: string; phase: number }) {
  const active = clipId === 'wardrobe_clothes' || clipId === 'wardrobe_scramble' || clipId === 'wardrobe_fumble';
  const open = active || clipId === 'wardrobe_dressed';
  const wobble = clipId === 'wardrobe_scramble' ? (phase === 0 ? -1 : 1) : 0;
  return (
    <Group transform={[{ translateX: s(wobble) }]}>
      <RoundedRect x={s(-12)} y={s(-39)} width={s(24)} height={s(39)} r={s(3)} color={SCENE_TOKENS.woodDeep} />
      <RoundedRect x={s(-10)} y={s(-37)} width={s(20)} height={s(35)} r={s(2)} color={SCENE_TOKENS.wood} />
      <Rect x={s(-1)} y={s(-36)} width={s(2)} height={s(33)} color={SCENE_TOKENS.woodDeep} />
      <Rect x={s(-8)} y={s(-34)} width={s(6)} height={s(2)} color={SCENE_TOKENS.woodLight} />
      <Rect x={s(2)} y={s(-34)} width={s(6)} height={s(2)} color={SCENE_TOKENS.woodLight} />
      {open && (
        <>
          <Rect x={s(1)} y={s(-33)} width={s(8)} height={s(27)} color="#3d2f36" />
          <RoundedRect x={s(3)} y={s(-29)} width={s(5)} height={s(10)} r={s(2)} color={VISUAL_TOKENS.actor.pajamas} />
          <Rect x={s(4)} y={s(-18)} width={s(4)} height={s(7)} color={VISUAL_TOKENS.actor.slippers} />
        </>
      )}
      <Circle cx={s(-3)} cy={s(-19)} r={s(1)} color={SCENE_TOKENS.bookGold} />
      <Circle cx={s(3)} cy={s(-19)} r={s(1)} color={SCENE_TOKENS.bookGold} />
    </Group>
  );
}

function Keys({ s, clipId, phase }: { s: (value: number) => number; clipId: string; phase: number }) {
  if (clipId === 'keys_empty') return null;
  const collect = clipId === 'keys_collect' ? 3 + phase : 0;
  const pulse = clipId === 'keys_pulse' ? phase : 0;
  return (
    <Group transform={[{ translateY: s(-collect) }]}>
      <Circle cx={s(-3)} cy={s(-7)} r={s(4 + pulse)} color={SCENE_TOKENS.bookGold} />
      <Circle cx={s(-3)} cy={s(-7)} r={s(2)} color="#5f4732" />
      <Rect x={0} y={s(-8)} width={s(9)} height={s(3)} color={SCENE_TOKENS.bookGold} />
      <Rect x={s(5)} y={s(-5)} width={s(2)} height={s(3)} color={SCENE_TOKENS.bookGold} />
      <Rect x={s(8)} y={s(-5)} width={s(2)} height={s(2)} color={SCENE_TOKENS.bookGold} />
      {pulse > 0 && <Circle cx={s(7)} cy={s(-12)} r={s(1.5)} color={VISUAL_TOKENS.interactive.focusLight} />}
    </Group>
  );
}

function WindowCue({ s, clipId, phase }: { s: (value: number) => number; clipId: string; phase: number }) {
  const moving = clipId === 'window_opening' || clipId === 'window_closing';
  const open = clipId === 'window_open' || clipId === 'window_opening';
  const shift = moving ? phase * 2 : open ? 2 : 0;
  return (
    <>
      <RoundedRect x={s(-3 + shift)} y={s(-5)} width={s(6)} height={s(3)} r={s(1.5)} color={SCENE_TOKENS.woodDeep} />
      <RoundedRect x={s(-2 + shift)} y={s(-4)} width={s(4)} height={s(1.5)} r={s(0.75)} color={SCENE_TOKENS.bookGold} />
      {moving && <Rect x={s(-8)} y={s(-10)} width={s(3)} height={s(1)} color={VISUAL_TOKENS.interactive.focusLight} />}
    </>
  );
}
