import React from 'react';
import { Group, Line, Oval, vec } from '@shopify/react-native-skia';
import { PLAYER_GROUND_Y } from '../core/World';
import { BEDROOM_REAPER, type BedroomReaperSnapshot } from '../adventure/BedroomReaperHazard';
import { PixelSpritePicture } from './PixelSpritePicture';
import { PixelSpriteBuilder, pixelEllipse, pixelLine, pixelRect, type PixelSprite } from './PixelSpriteBuilder';
import { spreadX } from './StageViewport';

// The altered Bedroom's reaper as a procedural pixel sprite, drawn facing
// right: a ragged black hood, a skull with red eyes and a long scythe.

const MATERIALS = {
  robe: ['#2a2238', '#16121f', '#463a5c', '#07060b'],
  bone: ['#e8e2cf', '#b9b19a', '#ffffff', '#4a4536'],
  wood: ['#6b4a2a', '#45301a', '#8f6a42', '#1c1209'],
  blade: ['#c9d6e2', '#8b9bab', '#ffffff', '#2b3440'],
} as const;

type Pose = 'idle' | 'raised' | 'low';

function buildReaper(pose: Pose, flutter: boolean): PixelSprite {
  const s = new PixelSpriteBuilder(26, 30, MATERIALS);
  // Robe widening to a ragged hem that flutters between frames.
  s.paint(pixelRect(4, 9, 17, 29).filter(([x, y]) => Math.abs(x - 10) <= 3 + (y - 9) * 0.3 && !(y >= 27 && (x + (flutter ? 1 : 0)) % 3 === 0)), 'robe');
  s.paint(pixelEllipse(10, 7, 5, 6), 'robe');
  s.paint(pixelEllipse(11, 8, 2.5, 3), 'bone');
  if (pose === 'raised') {
    s.paint(pixelLine([12, 13], [15, 8], 2), 'robe');
    s.paint(pixelLine([16, 1], [17, 24], 1), 'wood');
    s.paint([...pixelLine([16, 1], [22, 0], 2), ...pixelLine([22, 0], [25, 3], 1)], 'blade');
  } else if (pose === 'low') {
    s.paint(pixelLine([12, 14], [16, 17], 2), 'robe');
    s.paint(pixelLine([13, 15], [23, 26], 1), 'wood');
    s.paint([...pixelLine([23, 26], [25, 29], 1), ...pixelLine([24, 29], [17, 29], 1)], 'blade');
  } else {
    s.paint(pixelLine([12, 14], [15, 15], 2), 'robe');
    s.paint(pixelLine([17, 3], [14, 28], 1), 'wood');
    s.paint([...pixelLine([17, 3], [22, 3], 2), ...pixelLine([22, 3], [24, 6], 1)], 'blade');
  }
  return s.dot('#ff3048', [[10, 7], [12, 7]]).dot('#07060b', [[11, 10]]).build();
}

const FRAMES: Record<Pose, readonly [PixelSprite, PixelSprite]> = {
  idle: [buildReaper('idle', false), buildReaper('idle', true)],
  raised: [buildReaper('raised', false), buildReaper('raised', true)],
  low: [buildReaper('low', false), buildReaper('low', true)],
};

const SCALE = 1.3;

type Props = {
  reaper: BedroomReaperSnapshot;
  nowMs: number;
  px: (value: number) => number;
};

/**
 * The reaper floats a little above the floor. While it raises the scythe the
 * floor it will sweep is marked red; the sweep leaves a pale slash. A Dream
 * Spark dispels it whenever it is out; then it blinks away.
 */
export function BedroomReaperLayer({ reaper, nowMs, px }: Props) {
  const { phase, progress, dispelled } = reaper;
  const pose: Pose = phase === 'telegraph' ? 'raised' : phase === 'sweep' || phase === 'recovery' ? 'low' : 'idle';
  const sprite = FRAMES[pose][Math.floor(nowMs / 160) % 2]!;
  const width = sprite.width * SCALE;
  const height = sprite.height * SCALE;
  const x = spreadX(reaper.x);
  const lift = pose === 'low' ? 0 : 3 + Math.sin(nowMs / 220) * 1.5;
  const top = PLAYER_GROUND_Y - lift - height;
  const blink = Math.floor(nowMs / 90) % 2 === 0;
  const opacity = dispelled
    ? (blink ? 0.8 : 0.35) * (1 - reaper.dispelProgress)
    : phase === 'rise' ? progress * 0.9 : phase === 'fade' ? 1 - progress : 0.95;
  const reachLeft = spreadX(reaper.x - BEDROOM_REAPER.reach);
  const reachRight = spreadX(reaper.x + BEDROOM_REAPER.reach);

  return (
    <Group>
      {phase === 'telegraph' && !dispelled && (
        <Oval x={px(reachLeft)} y={px(PLAYER_GROUND_Y - 2)} width={px(reachRight - reachLeft)} height={px(4)} color="#d23a3a" opacity={blink ? 0.75 : 0.4} />
      )}
      <Oval x={px(x - width * 0.35)} y={px(PLAYER_GROUND_Y - 2)} width={px(width * 0.7)} height={px(4)} color="#000000" opacity={0.35 * opacity} />
      <Group opacity={opacity} transform={reaper.facing < 0 ? [{ translateX: px(x) * 2 }, { scaleX: -1 }] : undefined}>
        <PixelSpritePicture sprite={sprite} x={x - width / 2} y={top} px={px} scale={SCALE} />
      </Group>
      {phase === 'sweep' && !dispelled && (
        <Line p1={vec(px(reachLeft), px(PLAYER_GROUND_Y - 3))} p2={vec(px(reachRight), px(PLAYER_GROUND_Y - 3))} color="#e8f4ff" strokeWidth={px(2)} opacity={1 - progress * 0.6} />
      )}
    </Group>
  );
}
