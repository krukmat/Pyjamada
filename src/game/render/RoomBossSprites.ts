import type { RoomBossKind } from '../adventure/RoomBossHazard';
import {
  PixelSpriteBuilder,
  pixelEllipse,
  pixelLine,
  pixelRect,
  type PixelMaterial,
  type PixelSprite,
} from './PixelSpriteBuilder';

// The three room bosses before the Bathroom as procedural pixel sprites, all
// drawn facing right. Two frames each animate wings, static or legs.

const MOTH_MATERIALS = {
  wing: ['#c9b48a', '#8a7556', '#efe2bf', '#3a2e22'],
  band: ['#8a7556', '#5c4b38', '#c9b48a', '#2a2018'],
  body: ['#6b5640', '#3f3226', '#9a8262', '#1c150f'],
  fur: ['#efe2bf', '#c9b48a', '#fff6dc', '#5c4b38'],
} as const satisfies Record<string, PixelMaterial>;

const WRAITH_MATERIALS = {
  shroud: ['#5f6f86', '#3a4558', '#9aa8bc', '#151a24'],
  tv: ['#2b2f3a', '#16181f', '#454b5c', '#07080b'],
  glass: ['#b9f3ff', '#5fc6dc', '#ffffff', '#1d4d58'],
} as const satisfies Record<string, PixelMaterial>;

const ROACH_MATERIALS = {
  shell: ['#7a3b1c', '#4a2210', '#b0602f', '#1a0b04'],
  head: ['#4a2210', '#2a1208', '#7a3b1c', '#0e0603'],
  leg: ['#3a1a0b', '#22100a', '#5a2a14', '#0e0603'],
  crown: ['#ffd84a', '#c99a1a', '#fff2a8', '#5a3e06'],
} as const satisfies Record<string, PixelMaterial>;

const RED = '#ff5277';
const WHITE = '#f4f1de';
const INK = '#0b0a12';

function buildMoth(wingsUp: boolean): PixelSprite {
  const s = new PixelSpriteBuilder(26, 20, MOTH_MATERIALS);
  const lift = wingsUp ? -3 : 2;
  s.paint(pixelEllipse(7, 8 + lift / 2, 7, wingsUp ? 7 : 5), 'wing');
  s.paint(pixelEllipse(19, 8 + lift / 2, 7, wingsUp ? 7 : 5), 'wing');
  s.paint(pixelEllipse(7, 9 + lift / 2, 3.5, 2.5), 'band');
  s.paint(pixelEllipse(19, 9 + lift / 2, 3.5, 2.5), 'band');
  s.paint(pixelEllipse(13, 11, 3, 7), 'body');
  s.paint(pixelEllipse(13, 6, 3.5, 2.5), 'fur');
  s.paint(pixelLine([12, 3], [9, 0], 1), 'body');
  s.paint(pixelLine([14, 3], [17, 0], 1), 'body');
  return s.dot(RED, [[12, 6], [15, 6]]).dot(INK, [[13, 15], [13, 17]]).build();
}

function buildWraith(flicker: boolean): PixelSprite {
  const s = new PixelSpriteBuilder(20, 26, WRAITH_MATERIALS);
  // A ragged shroud hanging from an old TV set for a head.
  s.paint(pixelRect(3, 9, 16, 25).filter(([x, y]) => Math.abs(x - 9.5) <= 4 + (y - 9) * 0.35 && !(y >= 23 && (x + (flicker ? 1 : 0)) % 3 === 0)), 'shroud');
  s.paint(pixelRect(2, 0, 17, 10), 'tv');
  s.paint(pixelRect(4, 2, 15, 8), 'glass');
  s.paint(pixelLine([7, 0], [5, -3], 1), 'tv');
  s.paint(pixelLine([12, 0], [14, -3], 1), 'tv');
  const noise: [number, number][] = [];
  for (let y = 2; y <= 8; y += 2) for (let x = 4 + ((y + (flicker ? 1 : 0)) % 3); x <= 15; x += 3) noise.push([x, y]);
  s.dot('#ffffff', noise);
  return s.dot(INK, [[7, 5], [8, 5], [11, 5], [12, 5]]).dot(RED, [[9, 7], [10, 7]]).build();
}

function buildRoach(stride: boolean): PixelSprite {
  // Low and long, so a jumping Wally visibly clears it.
  const s = new PixelSpriteBuilder(30, 9, ROACH_MATERIALS);
  const legs = stride ? [[-2, 1, 2], [1, -1, 1]] : [[1, -1, 1], [-2, 1, 2]];
  for (const [index, baseX] of [7, 13, 19].entries()) {
    const swing = legs[index % 2]![0]!;
    s.paint(pixelLine([baseX, 6], [baseX + swing, 8], 1), 'leg');
    s.paint(pixelLine([baseX + 1, 6], [baseX + 1 - swing, 8], 1), 'leg');
  }
  s.paint(pixelEllipse(13, 4.5, 11, 3), 'shell');
  s.paint(pixelLine([4, 4], [21, 4], 1), 'head');
  s.paint(pixelEllipse(25, 5.5, 3.5, 2.5), 'head');
  s.paint(pixelLine([27, 4], [29, stride ? 0 : 1], 1), 'leg');
  s.paint(pixelLine([26, 3], [27, stride ? 1 : 0], 1), 'leg');
  s.paint(pixelRect(22, 1, 26, 2).filter(([x, y]) => y === 2 || x % 2 === 0), 'crown');
  return s.dot(WHITE, [[26, 5]]).dot(RED, [[27, 6]]).build();
}

const FRAMES: Record<RoomBossKind, readonly [PixelSprite, PixelSprite]> = {
  moth: [buildMoth(true), buildMoth(false)],
  wraith: [buildWraith(false), buildWraith(true)],
  roach: [buildRoach(false), buildRoach(true)],
};

/** Sprites are drawn this many stage units per sprite pixel: bosses tower over Wally. */
export const ROOM_BOSS_SCALE = 2;

/** Animation frame for a boss; `fast` (charging, fluttering) doubles the frame rate. */
export function roomBossFrame(kind: RoomBossKind, nowMs: number, fast: boolean): PixelSprite {
  const period = fast ? 70 : 140;
  return FRAMES[kind][Math.floor(nowMs / period) % 2]!;
}
