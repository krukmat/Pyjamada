#!/usr/bin/env node
// Generates assets/game/wally/haunted-wally.png: the "bedhead" Wally atlas.
// Frames are described as poses over a shared 32x48 body; shapes are filled
// with materials, then auto-shaded (top-left light, bottom-right shadow) and
// given a selective outline. Layout and frame meanings follow
// HauntedWallyAtlas.ts and hauntedWallyFrameIndex in HauntedWallyVisual.ts.
import { writeFileSync } from 'node:fs';
import { crc32, deflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const FRAME_W = 32;
const FRAME_H = 48;
const COLUMNS = 8;
const FRAMES_PER_OUTFIT = 25;
const SHEET_W = 256;
const SHEET_H = 336;

// base, shadow, light, outline
const MATERIALS = {
  hair: ['#7a4426', '#4e2a1a', '#a8653a', '#2a1610'],
  skin: ['#f0b088', '#c47a55', '#ffd4a8', '#5a2a24'],
  hand: ['#f0b088', '#c47a55', '#ffd4a8', '#5a2a24'],
  pj: ['#3f78d0', '#2a4f9a', '#7fb0ee', '#16244a'],
  pant: ['#3567b8', '#22437e', '#5f8ed8', '#16244a'],
  shirt: ['#d8493f', '#9a2e34', '#f0806a', '#3a1014'],
  jean: ['#3a5a9a', '#24386a', '#5a80c0', '#121a3a'],
  slip: ['#d65aa0', '#8e3466', '#f08ac8', '#3a1028'],
};
const DETAIL = {
  W: '#f4f1de', E: '#1a1424', N: '#7a3040', C: '#e88a7a', Y: '#ffd84a',
  S: '#c47a55', L: '#9fd8ff', D: null,
};
const OUTFITS = {
  pajamas: { top: 'pj', legs: 'pant', print: 'pajamas' },
  dressed: { top: 'shirt', legs: 'jean', print: 'dressed' },
};

const rect = (x0, y0, x1, y1) => {
  const points = [];
  for (let y = y0; y <= y1; y += 1) for (let x = x0; x <= x1; x += 1) points.push([x, y]);
  return points;
};
const ell = (cx, cy, rx, ry) => rect(0, 0, FRAME_W - 1, FRAME_H - 1)
  .filter(([x, y]) => ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1);
const line = ([x0, y0], [x1, y1], width = 2) => {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1;
  const points = [];
  for (let i = 0; i <= steps; i += 1) {
    const x = Math.round(x0 + ((x1 - x0) * i) / steps);
    const y = Math.round(y0 + ((y1 - y0) * i) / steps);
    points.push(...rect(x, y, x + width - 1, y));
  }
  return points;
};

class Sprite {
  constructor(outfit) {
    this.outfit = outfit;
    this.material = new Map();
    this.detail = new Map();
    this.dx = 0;
    this.dy = 0;
  }
  key(x, y) {
    const X = x + this.dx;
    const Y = y + this.dy;
    return X < 0 || X >= FRAME_W || Y < 0 || Y >= FRAME_H ? null : Y * FRAME_W + X;
  }
  paint(points, material) {
    for (const [x, y] of points) {
      const k = this.key(x, y);
      if (k === null) continue;
      this.material.set(k, material);
      this.detail.delete(k);
    }
  }
  dot(code, points) {
    for (const [x, y] of points) {
      const k = this.key(x, y);
      if (k !== null) this.detail.set(k, code === 'D' ? MATERIALS[this.outfit.legs][1] : DETAIL[code]);
    }
  }
  at(offset, fn) {
    const [dx, dy] = [this.dx, this.dy];
    this.dx += offset[0];
    this.dy += offset[1];
    fn();
    [this.dx, this.dy] = [dx, dy];
  }
  draw(sheet, ox, oy) {
    const mat = (x, y) => (x < 0 || x >= FRAME_W || y < 0 || y >= FRAME_H ? undefined : this.material.get(y * FRAME_W + x));
    for (let y = 0; y < FRAME_H; y += 1) {
      for (let x = 0; x < FRAME_W; x += 1) {
        const m = mat(x, y);
        let color;
        if (m) {
          const [base, shadow, light] = MATERIALS[m];
          color = base;
          if (mat(x + 1, y) !== m || mat(x, y + 1) !== m) color = shadow;
          else if (mat(x - 1, y) !== m && mat(x, y - 1) !== m) color = light;
          color = this.detail.get(y * FRAME_W + x) ?? color;
        } else {
          // Effect pixels (sparks, z's, sweat) may float outside the body.
          const neighbor = [mat(x + 1, y), mat(x - 1, y), mat(x, y + 1), mat(x, y - 1)].find(Boolean);
          color = this.detail.get(y * FRAME_W + x) ?? (neighbor ? MATERIALS[neighbor][3] : undefined);
        }
        if (color) sheet.set(ox + x, oy + y, color);
      }
    }
  }
}

const EYES = {
  half: [['E', [[11, 15], [12, 15], [13, 15], [18, 15], [19, 15], [20, 15], [13, 16], [20, 16]]], ['W', [[11, 16], [12, 16], [18, 16], [19, 16]]]],
  focus: [['E', [[11, 15], [12, 15], [13, 15], [18, 15], [19, 15], [20, 15], [13, 16], [20, 16], [13, 14], [18, 14]]], ['W', [[11, 16], [12, 16], [18, 16], [19, 16]]]],
  open: [['W', [[11, 15], [12, 15], [11, 16], [18, 15], [19, 15], [18, 16]]], ['E', [[12, 16], [19, 16]]]],
  wide: [['W', [...rect(11, 14, 13, 16), ...rect(18, 14, 20, 16)]], ['E', [[12, 15], [19, 15]]]],
  closed: [['E', [[11, 16], [12, 16], [13, 16], [18, 16], [19, 16], [20, 16]]]],
  happy: [['E', [[11, 16], [12, 15], [13, 16], [18, 16], [19, 15], [20, 16]]]],
  hurt: [['E', [[11, 14], [12, 15], [11, 16], [20, 14], [19, 15], [20, 16]]]],
  rub: [['E', [[11, 16], [12, 16], [13, 16]]]],
  // Brows slant down toward the nose; narrowed eyes look toward the facing side.
  fierce: [['E', [[10, 13], [11, 13], [12, 14], [13, 14], [18, 14], [19, 14], [20, 13], [21, 13], [13, 15], [20, 15]]], ['W', [[11, 15], [12, 15], [18, 15], [19, 15]]], ['S', [[11, 16], [12, 16], [13, 16], [18, 16], [19, 16], [20, 16]]]],
};
const MOUTHS = {
  mumble: [['N', [[14, 19], [15, 19], [16, 19], [15, 20]]]],
  small: [['N', [[15, 19], [16, 19]]]],
  yawn: [['N', rect(14, 19, 16, 21)], ['E', [[15, 20]]]],
  smile: [['N', [[14, 19], [15, 20], [16, 20], [17, 19]]]],
  open: [['N', rect(15, 19, 16, 20)]],
  frown: [['N', [[14, 20], [15, 19], [16, 19], [17, 20]]]],
  grit: [['W', [[14, 19], [15, 19], [16, 19]]], ['N', [[14, 20], [15, 20], [16, 20]]]],
  shout: [['W', [[14, 19], [15, 19], [16, 19], [17, 19]]], ['N', [[14, 20], [15, 20], [16, 20], [17, 20], [15, 21], [16, 21]]]],
  smirk: [['N', [[14, 19], [15, 19], [16, 19], [17, 18]]]],
};
const EXTRAS = {
  z: [['W', [[24, 6], [25, 6], [26, 6], [25, 7], [24, 8], [25, 8], [26, 8], [28, 2], [29, 2], [29, 3], [28, 4], [29, 4]]]],
  z2: [['W', [[25, 4], [26, 4], [27, 4], [26, 5], [25, 6], [26, 6], [27, 6], [29, 1], [30, 1], [30, 2]]]],
  sweat: [['L', [[25, 10], [25, 11], [24, 11]]]],
  spark: [['Y', [[29, 22], [28, 23], [29, 23], [30, 23], [29, 24]]], ['W', [[29, 23]]]],
  burst: [['Y', [[28, 20], [31, 21], [27, 26], [31, 26], [29, 19], [29, 27], [30, 23], [28, 23]]], ['W', [[29, 23], [29, 22], [29, 24]]]],
  cheer: [['Y', [[4, 9], [5, 8], [5, 10], [6, 9], [26, 4], [27, 3], [27, 5], [28, 4], [3, 18], [28, 14]]]],
  swoosh: [['W', [[20, 22], [21, 22], [22, 22], [19, 31], [20, 31], [21, 31]]]],
  // Bolder 2px rays around the fist, which sits at Dream Spark height.
  pow: [['Y', [[25, 23], [26, 23], [28, 22], [28, 23], [30, 23], [31, 23], [31, 26], [31, 27], [30, 30], [31, 30], [28, 31], [28, 32], [25, 30], [26, 30]]], ['W', [[30, 24], [31, 25], [31, 28], [30, 29]]]],
};

const HAIR_SPIKES = [[17, 1], [18, 1], [17, 2], [16, 3], [17, 3], [16, 4], [10, 4], [11, 4], [11, 5], [23, 4], [22, 4], [22, 5], [7, 8], [8, 8]];
const HAIR_FLY = [[18, 0], [19, 0], [9, 3], [10, 3], [24, 3], [6, 7]];
const FRINGE = [[8, 11], [8, 12], [9, 11], [9, 12], [9, 13], [10, 11], [12, 11], [13, 11], [13, 12], [18, 11], [19, 11], [22, 11], [23, 11], [23, 12], [23, 13]];

const SHOULDER_L = [10, 23];
const SHOULDER_R = [21, 23];
const ARMS = {
  down: { l: [[8, 30]], r: [[22, 30]] },
  swingA: { l: [[7, 28]], r: [[23, 31]] },
  swingB: { l: [[9, 31]], r: [[23, 28]] },
  up: { l: [[7, 18], [7, 12]], r: [[24, 18], [24, 12]] },
  upWide: { l: [[6, 19]], r: [[25, 19]] },
  cheer: { l: [[7, 18], [6, 13]], r: [[24, 18], [25, 13]] },
  rub: { l: [[8, 30]], r: [[23, 26], [20, 19]] },
  windup: { l: [[8, 29]], r: [[23, 27]] },
  shoot: { l: [[8, 28]], r: [[26, 24]] },
  reach: { l: [[8, 30]], r: [[25, 19]] },
  slump: { l: [[10, 32]], r: [[21, 32]] },
  guard: { l: [[6, 27], [9, 20]], r: [[25, 27], [22, 20]] },
  cock: { l: [[6, 27], [9, 20]], r: [[24, 27]] },
  strike: { l: [[6, 27], [9, 21]], r: [[25, 27]], fist: true },
  recoil: { l: [[6, 27], [9, 21]], r: [[25, 25]] },
};

function hand(sprite, [x, y]) {
  sprite.paint(rect(x - 1, y + 1, x + 1, y + 2), 'hand');
}

function arm(sprite, shoulder, path, material, fist = false) {
  let from = shoulder;
  for (const point of path) {
    sprite.paint(line(from, point), material);
    // A mostly horizontal segment needs a second row to keep the sleeve thick.
    if (Math.abs(point[0] - from[0]) > Math.abs(point[1] - from[1])) sprite.paint(line([from[0], from[1] + 1], [point[0], point[1] + 1]), material);
    from = point;
  }
  if (!fist) {
    hand(sprite, from);
    return;
  }
  sprite.paint(rect(from[0] + 1, from[1] - 1, from[0] + 3, from[1] + 2), 'hand');
  sprite.dot('S', [[from[0] + 2, from[1]], [from[0] + 2, from[1] + 1]]);
}

function legs(sprite, pose) {
  const material = sprite.outfit.legs;
  const tuck = pose.tuck ?? false;
  sprite.paint(rect(11, 33, 20, 35), material);
  for (const side of ['l', 'r']) {
    const lift = tuck ? 4 : (pose.lift?.[side] ?? 0);
    const spread = (pose.spread ?? 0) * (side === 'l' ? -1 : 1);
    const x0 = (side === 'l' ? 11 : 16) + spread;
    const bottom = 41 - lift;
    sprite.paint(rect(x0, 34, x0 + 4, bottom), material);
    sprite.paint(rect(side === 'l' ? x0 - 1 : x0, bottom - 1, side === 'l' ? x0 + 4 : x0 + 5, bottom), material);
    sprite.paint(ell(x0 + (side === 'l' ? 1.5 : 3.5), 44.6 - lift, 3.7, 2.4), 'slip');
    sprite.dot('Y', [[x0 + (side === 'l' ? 1 : 3), 43 - lift]]);
  }
  if (!tuck) sprite.dot('D', rect(15, 36, 15, 41 - Math.max(pose.lift?.l ?? 0, pose.lift?.r ?? 0)));
}

function upperBody(sprite, pose) {
  const top = sprite.outfit.top;
  sprite.paint(ell(16, 14, 8.3, 7.3), 'skin');
  sprite.paint([[7, 15], [7, 16], [24, 15], [24, 16]], 'skin');
  sprite.paint(rect(15, 21, 16, 22), 'skin');
  sprite.paint(rect(8, 22, 23, 33).filter(([x, y]) => Math.abs(x - 15.5) <= 4.5 + (y - 22) * 0.25), top);
  sprite.paint(ell(16, 10, 9, 5.6).filter(([, y]) => y < 12), 'hair');
  sprite.paint([...HAIR_SPIKES, ...FRINGE, ...(pose.hairUp ? HAIR_FLY : [])], 'hair');
  const arms = ARMS[pose.arms ?? 'down'];
  arm(sprite, SHOULDER_L, arms.l, top);
  arm(sprite, SHOULDER_R, arms.r, top, arms.fist);
  sprite.dot('S', [[16, 17]]);
  sprite.dot('C', [[10, 18], [11, 18], [20, 18], [21, 18]]);
  for (const [code, points] of EYES[pose.eyes ?? 'half']) sprite.dot(code, points);
  for (const [code, points] of MOUTHS[pose.mouth ?? 'mumble']) sprite.dot(code, points);
  if (sprite.outfit.print === 'pajamas') {
    sprite.dot('Y', [[16, 25], [16, 28], [16, 31], [12, 26], [13, 25], [12, 27]]);
  } else {
    sprite.dot('Y', [[15, 25], [16, 25], [14, 26], [15, 26], [16, 26], [17, 26], [15, 27], [16, 27], [14, 28], [17, 28]]);
  }
}

function frame(outfit, pose) {
  const sprite = new Sprite(outfit);
  sprite.at([pose.lean ?? 0, 0], () => legs(sprite, pose));
  sprite.at([pose.lean ?? 0, pose.bob ?? 0], () => upperBody(sprite, pose));
  for (const extra of pose.extras ?? []) for (const [code, points] of EXTRAS[extra]) sprite.dot(code, points);
  return sprite;
}

// Index = frame number used by hauntedWallyFrameIndex.
const POSES = [
  { eyes: 'half' }, // 0 idle
  { eyes: 'half', bob: 1 }, // 1 idle breathe
  { arms: 'swingA', lift: { r: 2 }, eyes: 'open', mouth: 'small' }, // 2 walk
  { arms: 'down', bob: -1, eyes: 'open', mouth: 'small' }, // 3
  { arms: 'swingB', lift: { l: 2 }, eyes: 'open', mouth: 'small' }, // 4
  { arms: 'down', bob: -1, eyes: 'open', mouth: 'small' }, // 5
  { arms: 'up', tuck: true, bob: -1, eyes: 'wide', mouth: 'open', hairUp: true }, // 6 jump
  { arms: 'upWide', tuck: true, bob: -1, eyes: 'wide', mouth: 'open', hairUp: true }, // 7
  { arms: 'swingA', spread: 1, bob: 1, eyes: 'open', mouth: 'small' }, // 8 land
  { arms: 'down', eyes: 'open', mouth: 'small' }, // 9
  { arms: 'cock', lean: -1, eyes: 'fierce', mouth: 'grit' }, // 10 attack wind-up
  { arms: 'strike', lean: 1, spread: 1, eyes: 'fierce', mouth: 'shout', extras: ['swoosh'] }, // 11 punch lands
  { arms: 'strike', lean: 1, spread: 1, eyes: 'fierce', mouth: 'shout', extras: ['pow'] }, // 12 impact
  { arms: 'recoil', eyes: 'fierce', mouth: 'grit' }, // 13 recover to guard
  { arms: 'reach', eyes: 'open', mouth: 'small' }, // 14 interact
  { arms: 'rub', eyes: 'rub', mouth: 'yawn', extras: ['z'] }, // 15 sleepy
  { arms: 'down', eyes: 'closed', mouth: 'mumble', bob: 1, extras: ['z2'] }, // 16
  { arms: 'upWide', lean: -1, eyes: 'wide', mouth: 'open', hairUp: true, extras: ['sweat'] }, // 17 hit / startled
  { arms: 'up', lean: -1, bob: 1, eyes: 'hurt', mouth: 'open', hairUp: true, extras: ['sweat'] }, // 18
  { arms: 'guard', spread: 1, eyes: 'fierce', mouth: 'smirk' }, // 19 combat guard
  { arms: 'guard', spread: 1, bob: 1, eyes: 'fierce', mouth: 'smirk' }, // 20
  { arms: 'guard', lift: { r: 2 }, eyes: 'fierce', mouth: 'grit' }, // 21 advance in guard
  { arms: 'guard', lift: { l: 2 }, bob: 1, eyes: 'fierce', mouth: 'grit' }, // 22
  { arms: 'cheer', bob: -1, eyes: 'happy', mouth: 'smile', hairUp: true, extras: ['cheer'] }, // 23 success
  { arms: 'slump', bob: 2, eyes: 'closed', mouth: 'frown' }, // 24 fail
];

class Sheet {
  constructor() {
    this.rgba = Buffer.alloc(SHEET_W * SHEET_H * 4);
  }
  set(x, y, hex) {
    const i = (y * SHEET_W + x) * 4;
    this.rgba[i] = parseInt(hex.slice(1, 3), 16);
    this.rgba[i + 1] = parseInt(hex.slice(3, 5), 16);
    this.rgba[i + 2] = parseInt(hex.slice(5, 7), 16);
    this.rgba[i + 3] = 255;
  }
  png() {
    const stride = SHEET_W * 4;
    const raw = Buffer.alloc((stride + 1) * SHEET_H);
    for (let y = 0; y < SHEET_H; y += 1) this.rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
    const chunk = (type, data) => {
      const head = Buffer.alloc(4);
      head.writeUInt32BE(data.length);
      const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
      const crc = Buffer.alloc(4);
      crc.writeUInt32BE(crc32(body));
      return Buffer.concat([head, body, crc]);
    };
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(SHEET_W, 0);
    ihdr.writeUInt32BE(SHEET_H, 4);
    ihdr[8] = 8;
    ihdr[9] = 6;
    return Buffer.concat([
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      chunk('IHDR', ihdr),
      chunk('IDAT', deflateSync(raw, { level: 9 })),
      chunk('IEND', Buffer.alloc(0)),
    ]);
  }
}

export function buildWallyAtlas() {
  const sheet = new Sheet();
  Object.values(OUTFITS).forEach((outfit, outfitIndex) => {
    POSES.forEach((pose, localIndex) => {
      const index = outfitIndex * FRAMES_PER_OUTFIT + localIndex;
      frame(outfit, pose).draw(sheet, (index % COLUMNS) * FRAME_W, Math.floor(index / COLUMNS) * FRAME_H);
    });
  });
  return sheet.png();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const target = process.argv[2] ?? new URL('../assets/game/wally/haunted-wally.png', import.meta.url);
  writeFileSync(target, buildWallyAtlas());
  console.log(`wrote ${target}`);
}
