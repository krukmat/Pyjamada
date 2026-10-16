import type { RoomBossKind } from '../adventure/RoomBossHazard';
import {
  PixelSpriteBuilder,
  pixelEllipse,
  pixelLine,
  pixelRect,
  type PixelMaterial,
  type PixelPoint,
  type PixelSprite,
} from './PixelSpriteBuilder';

// The room bosses before the Bathroom as procedural pixel sprites, all
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
  leg: ['#d08a4a', '#d08a4a', '#d08a4a', '#1a0b04'],
  crown: ['#ffd84a', '#c99a1a', '#fff2a8', '#5a3e06'],
} as const satisfies Record<string, PixelMaterial>;

const CUCKOO_MATERIALS = {
  feather: ['#8a5a34', '#5a3a20', '#b47c4c', '#24160b'],
  breast: ['#e8d3a6', '#c4a878', '#fff1cf', '#5a3a20'],
  wing: ['#6b4426', '#432a16', '#93643c', '#1c1008'],
  beak: ['#ffb43a', '#d0801a', '#ffe08a', '#5a3306'],
} as const satisfies Record<string, PixelMaterial>;

const RED = '#ff5277';
const WHITE = '#f4f1de';
const INK = '#0b0a12';
const SHINE = '#e0a060';

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
  // Side view, low and long so a jumping Wally visibly clears it: domed wing
  // covers, a head shield, six splayed legs and long antennae. Legs and
  // antennae are one flat bright tone, to read against a dark floor.
  const s = new PixelSpriteBuilder(32, 10, ROACH_MATERIALS);
  const swing = stride ? 2 : -2;
  const legs: PixelPoint[] = [];
  for (const [index, baseX] of [6, 12, 18].entries()) {
    const reach = index === 0 ? -3 : index === 2 ? 3 : 0;
    legs.push(...pixelLine([baseX, 7], [baseX + reach + swing, 9], 1));
    legs.push(...pixelLine([baseX + 2, 7], [baseX + 2 + reach - swing, 9], 1));
  }
  s.paint(pixelEllipse(13, 5, 11, 3.5), 'shell');
  s.paint(pixelEllipse(24, 5, 3, 3), 'head');
  s.paint(pixelRect(22, 0, 26, 1).filter(([x, y]) => y === 1 || x % 2 === 0), 'crown');
  const antennae = [...pixelLine([28, 5], [31, stride ? 0 : 1], 1), ...pixelLine([27, 3], [29, stride ? 1 : 0], 1)];
  s.paint([...legs, ...antennae], 'leg');
  return s
    .dot(SHINE, [[6, 3], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2]])
    .dot(INK, pixelLine([8, 4], [20, 7], 1))
    .dot(WHITE, [[25, 4]])
    .dot(RED, [[26, 5]])
    .build();
}

function buildCuckoo(wingsUp: boolean): PixelSprite {
  // The clock's carved bird come alive: round body, cream breast, a fan tail,
  // an open orange beak and one beating wing.
  const s = new PixelSpriteBuilder(18, 14, CUCKOO_MATERIALS);
  s.paint(pixelLine([1, 6], [5, 8], 2), 'feather');
  s.paint(pixelEllipse(8, 8, 5, 4), 'feather');
  s.paint(pixelEllipse(12, 4, 3, 3), 'feather');
  s.paint(pixelEllipse(10, 9, 3, 2.5), 'breast');
  s.paint(pixelRect(15, 3, 17, 3), 'beak');
  s.paint(pixelRect(15, 5, 16, 5), 'beak');
  s.paint(wingsUp ? pixelLine([5, 6], [8, 0], 2) : pixelLine([4, 9], [9, 12], 2), 'wing');
  s.paint(pixelRect(8, 12, 8, 13).concat(pixelRect(11, 12, 11, 13)), 'beak');
  return s.dot(INK, [[13, 3]]).dot(WHITE, [[12, 3]]).dot(RED, [[14, 5]]).build();
}

const FRAMES: Record<RoomBossKind, readonly [PixelSprite, PixelSprite]> = {
  cuckoo: [buildCuckoo(true), buildCuckoo(false)],
  moth: [buildMoth(true), buildMoth(false)],
  wraith: [buildWraith(false), buildWraith(true)],
  roach: [buildRoach(false), buildRoach(true)],
};

/** Sprites are drawn this many stage units per sprite pixel: bosses tower over Wally. */
export const ROOM_BOSS_SCALE = 1.5;
/** The Moth, the Cuckoo and the Roach are drawn 15% smaller (their hit widths shrink with them). */
const ROOM_BOSS_KIND_SCALE: Record<RoomBossKind, number> = { moth: 0.85, cuckoo: 0.85, roach: 0.85, wraith: 1 };

export function roomBossScale(kind: RoomBossKind): number {
  return ROOM_BOSS_SCALE * ROOM_BOSS_KIND_SCALE[kind];
}

/** Animation frame for a boss; `fast` (charging, fluttering) doubles the frame rate. */
export function roomBossFrame(kind: RoomBossKind, nowMs: number, fast: boolean): PixelSprite {
  const period = fast ? 70 : 140;
  return FRAMES[kind][Math.floor(nowMs / period) % 2]!;
}
