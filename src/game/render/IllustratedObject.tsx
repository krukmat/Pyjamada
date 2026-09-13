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

const OBJECT_COLORS = {
  beddingDeep: '#355d78',
  bedding: '#5e8fa4',
  beddingLight: '#91bec5',
  alarmGoldDeep: '#a95e43',
  alarmGold: '#e8aa4d',
  alarmLight: '#ffe19a',
  alarmFace: '#fff1c4',
  wardrobeInside: '#302631',
  wardrobeRed: '#cf655c',
  wardrobeBlue: '#567ba6',
  keyDeep: '#9a6b2f',
  keyGold: '#e7b84e',
  keyLight: '#fff09a',
  slipperLight: '#f29fd0',
} as const;

export function IllustratedObject({ objectId, visual, x, y, scale }: Props) {
  const s = (value: number) => Math.round(value * scale);
  const frame = visual.animation.frameIndex;
  return (
    <Group transform={[{ translateX: x }, { translateY: y }]}>
      {objectId === 'bed' && <Bed s={s} clipId={visual.clipId} frame={frame} />}
      {objectId === 'slippers' && <Slippers s={s} clipId={visual.clipId} frame={frame} />}
      {objectId === 'alarm-clock' && <Alarm s={s} clipId={visual.clipId} frame={frame} />}
      {objectId === 'wardrobe' && <Wardrobe s={s} clipId={visual.clipId} frame={frame} />}
      {objectId === 'keys' && <Keys s={s} clipId={visual.clipId} frame={frame} />}
      {objectId === 'window' && <WindowCue s={s} clipId={visual.clipId} frame={frame} />}
    </Group>
  );
}

function Bed({ s, clipId, frame }: { s: (value: number) => number; clipId: string; frame: number }) {
  const rest = clipId === 'bed_rest';
  const bounce = rest ? [0, 1.5, 0.5][Math.min(frame, 2)] : 0;
  const blanketLift = rest ? [0, -1.5, -0.5][Math.min(frame, 2)] : 0;
  return (
    <>
      <RoundedRect x={s(-17)} y={s(-22)} width={s(6)} height={s(23)} r={s(2.5)} color={SCENE_TOKENS.woodDeep} />
      <RoundedRect x={s(-16)} y={s(-20)} width={s(4)} height={s(18)} r={s(1.7)} color={SCENE_TOKENS.wood} />
      <RoundedRect x={s(-15)} y={s(-19)} width={s(31)} height={s(18)} r={s(4.5)} color={VISUAL_TOKENS.actor.outline} />
      <RoundedRect x={s(-14)} y={s(-18 + bounce)} width={s(29)} height={s(15)} r={s(3.7)} color="#e1bc96" />
      <RoundedRect x={s(-11)} y={s(-17 + bounce)} width={s(10)} height={s(5.5)} r={s(2.7)} color={SCENE_TOKENS.cloud} />
      <RoundedRect x={s(-2)} y={s(-13 + bounce + blanketLift)} width={s(16)} height={s(9)} r={s(2.4)} color={OBJECT_COLORS.beddingDeep} />
      <RoundedRect x={s(-1)} y={s(-12 + bounce + blanketLift)} width={s(14)} height={s(7)} r={s(1.8)} color={OBJECT_COLORS.bedding} />
      <Rect x={s(0)} y={s(-11 + bounce + blanketLift)} width={s(12)} height={s(2)} color={OBJECT_COLORS.beddingLight} />
      <Rect x={s(6)} y={s(-9 + bounce + blanketLift)} width={s(2)} height={s(4)} color={VISUAL_TOKENS.actor.pajamasAccent} />
      <RoundedRect x={s(12)} y={s(-7)} width={s(5)} height={s(8)} r={s(2)} color={SCENE_TOKENS.woodDeep} />
      {rest && frame === 1 && <Circle cx={s(1)} cy={s(-21)} r={s(1.5)} color={VISUAL_TOKENS.fx.sleep} />}
    </>
  );
}

function Slippers({ s, clipId, frame }: { s: (value: number) => number; clipId: string; frame: number }) {
  if (clipId === 'slippers_empty') return null;
  const lift = clipId === 'slippers_equip' ? [0, 4, 7][Math.min(frame, 2)] : 0;
  const spread = clipId === 'slippers_equip' ? [0, 1, 2][Math.min(frame, 2)] : 0;
  return (
    <>
      <Slipper s={s} x={-9 - spread} y={-5 - lift} light />
      <Slipper s={s} x={1 + spread} y={-5 - lift} />
      {clipId === 'slippers_equip' && frame > 0 && (
        <>
          <Circle cx={s(-8)} cy={s(-11 - lift)} r={s(1.1)} color={VISUAL_TOKENS.interactive.focusLight} />
          <Circle cx={s(8)} cy={s(-9 - lift)} r={s(0.9)} color={VISUAL_TOKENS.interactive.focus} />
        </>
      )}
    </>
  );
}

function Slipper({ s, x, y, light = false }: { s: (value: number) => number; x: number; y: number; light?: boolean }) {
  return (
    <>
      <RoundedRect x={s(x)} y={s(y)} width={s(9)} height={s(5)} r={s(2.5)} color={VISUAL_TOKENS.actor.outline} />
      <RoundedRect x={s(x + 0.8)} y={s(y + 0.8)} width={s(7.4)} height={s(3.4)} r={s(1.7)} color={light ? OBJECT_COLORS.slipperLight : VISUAL_TOKENS.actor.slippers} />
      <RoundedRect x={s(x + 3)} y={s(y + 0.6)} width={s(4)} height={s(2)} r={s(1)} color={VISUAL_TOKENS.actor.pajamasAccent} />
      <Rect x={s(x + 1.2)} y={s(y + 3.2)} width={s(6.2)} height={s(0.7)} color={VISUAL_TOKENS.actor.outline} />
    </>
  );
}

function Alarm({ s, clipId, frame }: { s: (value: number) => number; clipId: string; frame: number }) {
  const ringing = clipId === 'alarm_ring' || clipId === 'alarm_ring_strong';
  const strong = clipId === 'alarm_ring_strong';
  const wobbleSteps = strong ? [-2.2, 2.2, -1] : [-1.2, 1.2, 0];
  const wobble = ringing ? wobbleSteps[Math.min(frame, 2)] : 0;
  return (
    <Group transform={[{ translateX: s(wobble) }]}>
      <RoundedRect x={s(-7.5)} y={s(-14.5)} width={s(5.5)} height={s(3.8)} r={s(1.8)} color={VISUAL_TOKENS.actor.outline} />
      <RoundedRect x={s(-6.6)} y={s(-13.7)} width={s(4)} height={s(2.3)} r={s(1.1)} color={OBJECT_COLORS.alarmGold} />
      <RoundedRect x={s(2)} y={s(-14.5)} width={s(5.5)} height={s(3.8)} r={s(1.8)} color={VISUAL_TOKENS.actor.outline} />
      <RoundedRect x={s(2.6)} y={s(-13.7)} width={s(4)} height={s(2.3)} r={s(1.1)} color={OBJECT_COLORS.alarmGold} />
      <Circle cx={0} cy={s(-7.2)} r={s(7.2)} color={VISUAL_TOKENS.actor.outline} />
      <Circle cx={0} cy={s(-7.2)} r={s(6.1)} color={OBJECT_COLORS.alarmGoldDeep} />
      <Circle cx={0} cy={s(-7.2)} r={s(5.2)} color={OBJECT_COLORS.alarmFace} />
      <Circle cx={s(-1.8)} cy={s(-9.2)} r={s(1.5)} color={OBJECT_COLORS.alarmLight} />
      <Rect x={s(-0.7)} y={s(-7.2)} width={s(1.4)} height={s(3.7)} color={SCENE_TOKENS.trimDark} />
      <Rect x={0} y={s(-7.7)} width={s(3.8)} height={s(1.4)} color={SCENE_TOKENS.trimDark} />
      <Circle cx={0} cy={s(-7.2)} r={s(1)} color={SCENE_TOKENS.trimDark} />
      <Rect x={s(-5)} y={s(-1.8)} width={s(2.8)} height={s(3)} color={VISUAL_TOKENS.actor.outline} />
      <Rect x={s(2.2)} y={s(-1.8)} width={s(2.8)} height={s(3)} color={VISUAL_TOKENS.actor.outline} />
      {ringing && <AlarmRays s={s} strong={strong} />}
    </Group>
  );
}

function AlarmRays({ s, strong }: { s: (value: number) => number; strong: boolean }) {
  const length = strong ? 5 : 3.5;
  return (
    <>
      <Rect x={s(-13)} y={s(-13)} width={s(length)} height={s(1.4)} color={VISUAL_TOKENS.feedback.rush} />
      <Rect x={s(8)} y={s(-13)} width={s(length)} height={s(1.4)} color={VISUAL_TOKENS.feedback.rush} />
      {strong && (
        <>
          <Rect x={s(-11)} y={s(-18)} width={s(1.4)} height={s(4)} color={VISUAL_TOKENS.feedback.danger} />
          <Rect x={s(10)} y={s(-18)} width={s(1.4)} height={s(4)} color={VISUAL_TOKENS.feedback.danger} />
        </>
      )}
    </>
  );
}

function Wardrobe({ s, clipId, frame }: { s: (value: number) => number; clipId: string; frame: number }) {
  const active = clipId === 'wardrobe_clothes' || clipId === 'wardrobe_scramble' || clipId === 'wardrobe_fumble';
  const dressed = clipId === 'wardrobe_dressed';
  const open = active || dressed;
  const scramble = clipId === 'wardrobe_scramble';
  const fumble = clipId === 'wardrobe_fumble';
  const wobble = scramble ? [-1.7, 1.7, -0.8][Math.min(frame, 2)] : fumble ? [1.2, -1.2, 0][Math.min(frame, 2)] : 0;
  const doorSpread = open ? 5.5 : 0;
  return (
    <Group transform={[{ translateX: s(wobble) }]}>
      <RoundedRect x={s(-14)} y={s(-46)} width={s(28)} height={s(46)} r={s(4)} color={VISUAL_TOKENS.actor.outline} />
      <RoundedRect x={s(-12.5)} y={s(-44.5)} width={s(25)} height={s(43)} r={s(3)} color={SCENE_TOKENS.woodDeep} />
      <RoundedRect x={s(-10.8)} y={s(-42.8)} width={s(21.6)} height={s(39.6)} r={s(2.2)} color={OBJECT_COLORS.wardrobeInside} />
      {open && <WardrobeContents s={s} dressed={dressed} frame={frame} />}
      <WardrobeDoor s={s} x={-11.2 - doorSpread} right={false} open={open} />
      <WardrobeDoor s={s} x={0.2 + doorSpread} right open={open} />
      <Rect x={s(-11)} y={s(-3.5)} width={s(22)} height={s(2)} color={SCENE_TOKENS.woodLight} />
      {active && frame > 0 && (
        <>
          <Circle cx={s(-15)} cy={s(-35)} r={s(1.2)} color={VISUAL_TOKENS.interactive.focusLight} />
          <Circle cx={s(15)} cy={s(-30)} r={s(1)} color={VISUAL_TOKENS.interactive.focus} />
        </>
      )}
    </Group>
  );
}

function WardrobeDoor({ s, x, right, open }: { s: (value: number) => number; x: number; right: boolean; open: boolean }) {
  const width = open ? 10.2 : 11;
  return (
    <>
      <RoundedRect x={s(x)} y={s(-42)} width={s(width)} height={s(37)} r={s(2)} color={SCENE_TOKENS.wood} />
      <RoundedRect x={s(x + 1.2)} y={s(-39.5)} width={s(width - 2.4)} height={s(13)} r={s(1.5)} color={SCENE_TOKENS.woodLight} />
      <RoundedRect x={s(x + 1.2)} y={s(-24)} width={s(width - 2.4)} height={s(15.5)} r={s(1.5)} color="#916448" />
      <Circle cx={s(x + (right ? 2.2 : width - 2.2))} cy={s(-22)} r={s(1.2)} color={OBJECT_COLORS.keyGold} />
    </>
  );
}

function WardrobeContents({ s, dressed, frame }: { s: (value: number) => number; dressed: boolean; frame: number }) {
  if (dressed) {
    return (
      <>
        <Rect x={s(-7)} y={s(-36)} width={s(14)} height={s(1.4)} color={SCENE_TOKENS.bookGold} />
        <RoundedRect x={s(-5)} y={s(-33)} width={s(10)} height={s(3)} r={s(1.5)} color={SCENE_TOKENS.ceramic} />
      </>
    );
  }
  const hop = frame === 1 ? -2 : 0;
  return (
    <>
      <Rect x={s(-7)} y={s(-36)} width={s(14)} height={s(1.4)} color={SCENE_TOKENS.bookGold} />
      <RoundedRect x={s(-6)} y={s(-32 + hop)} width={s(12)} height={s(9)} r={s(3)} color={OBJECT_COLORS.wardrobeRed} />
      <Rect x={s(-1)} y={s(-31 + hop)} width={s(2)} height={s(6)} color={VISUAL_TOKENS.actor.pajamasAccent} />
      <RoundedRect x={s(-5)} y={s(-21 - hop)} width={s(10)} height={s(9)} r={s(2.5)} color={OBJECT_COLORS.wardrobeBlue} />
    </>
  );
}

function Keys({ s, clipId, frame }: { s: (value: number) => number; clipId: string; frame: number }) {
  if (clipId === 'keys_empty') return null;
  const collect = clipId === 'keys_collect' ? [0, 4, 8][Math.min(frame, 2)] : 0;
  const pulse = clipId === 'keys_pulse' ? (frame % 2 === 0 ? 0 : 1.2) : 0;
  return (
    <Group transform={[{ translateY: s(-collect) }]}>
      {pulse > 0 && <Circle cx={s(-2)} cy={s(-7)} r={s(8 + pulse)} color="rgba(255,240,154,0.14)" />}
      <Circle cx={s(-3)} cy={s(-7)} r={s(5.1 + pulse * 0.3)} color={VISUAL_TOKENS.actor.outline} />
      <Circle cx={s(-3)} cy={s(-7)} r={s(4.1 + pulse * 0.2)} color={OBJECT_COLORS.keyGold} />
      <Circle cx={s(-3)} cy={s(-7)} r={s(2.1)} color={OBJECT_COLORS.keyDeep} />
      <Rect x={s(1)} y={s(-8.5)} width={s(11)} height={s(3.2)} color={VISUAL_TOKENS.actor.outline} />
      <Rect x={s(1.5)} y={s(-7.8)} width={s(10)} height={s(1.8)} color={OBJECT_COLORS.keyGold} />
      <Rect x={s(6)} y={s(-5.5)} width={s(2.3)} height={s(3.5)} color={OBJECT_COLORS.keyGold} />
      <Rect x={s(9.5)} y={s(-5.5)} width={s(2.3)} height={s(2.7)} color={OBJECT_COLORS.keyGold} />
      <Circle cx={s(-4.3)} cy={s(-8.3)} r={s(1.1)} color={OBJECT_COLORS.keyLight} />
      {(pulse > 0 || clipId === 'keys_collect') && (
        <>
          <Circle cx={s(8)} cy={s(-13)} r={s(1.4)} color={OBJECT_COLORS.keyLight} />
          <Circle cx={s(-9)} cy={s(-3)} r={s(0.9)} color={VISUAL_TOKENS.interactive.focus} />
        </>
      )}
    </Group>
  );
}

function WindowCue({ s, clipId, frame }: { s: (value: number) => number; clipId: string; frame: number }) {
  const moving = clipId === 'window_opening' || clipId === 'window_closing';
  const open = clipId === 'window_open' || clipId === 'window_opening';
  const direction = clipId === 'window_closing' ? -1 : 1;
  const shift = moving ? [0, 2.5, 4][Math.min(frame, 2)] * direction : open ? 4 : 0;
  return (
    <>
      <RoundedRect x={s(-7 + shift)} y={s(-8)} width={s(14)} height={s(6)} r={s(2.5)} color={VISUAL_TOKENS.actor.outline} />
      <RoundedRect x={s(-6 + shift)} y={s(-7)} width={s(12)} height={s(4)} r={s(1.7)} color={SCENE_TOKENS.woodLight} />
      <RoundedRect x={s(-1 + shift)} y={s(-6.5)} width={s(6)} height={s(3)} r={s(1.3)} color={OBJECT_COLORS.keyGold} />
      <Circle cx={s(3.5 + shift)} cy={s(-5)} r={s(0.8)} color={OBJECT_COLORS.keyLight} />
      {moving && (
        <>
          <Rect x={s(-13)} y={s(-12)} width={s(4)} height={s(1.2)} color={VISUAL_TOKENS.interactive.focusLight} />
          <Rect x={s(9)} y={s(-15)} width={s(3)} height={s(1.2)} color={VISUAL_TOKENS.interactive.focus} />
        </>
      )}
    </>
  );
}
