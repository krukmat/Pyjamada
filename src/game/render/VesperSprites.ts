import {
  PixelSpriteBuilder,
  pixelEllipse,
  pixelLine,
  pixelRect,
  type PixelMaterial,
  type PixelPoint,
  type PixelSprite,
} from './PixelSpriteBuilder';

// Dr. Vesper and the Vesper Nightmare as procedural pixel sprites. Colors are
// taken from the Laboratory pixel palette so room quantization keeps them.

const VESPER_MATERIALS = {
  coat: ['#f4f1de', '#b0c0f0', '#f4f1de', '#2a326a'],
  skin: ['#b0c0f0', '#6a7ed0', '#f4f1de', '#1b2048'],
  hair: ['#f4f1de', '#b0c0f0', '#f4f1de', '#3e4c96'],
  shirt: ['#2a326a', '#1b2048', '#3e4c96', '#07081a'],
  glove: ['#4a1a64', '#2a0e3a', '#7a2a9a', '#07081a'],
  remote: ['#7a2a9a', '#4a1a64', '#b04fd1', '#10132e'],
} as const satisfies Record<string, PixelMaterial>;

const NIGHTMARE_MATERIALS = {
  shade: ['#2a0e3a', '#10132e', '#4a1a64', '#07081a'],
  tatter: ['#4a1a64', '#2a0e3a', '#7a2a9a', '#07081a'],
  hair: ['#f4f1de', '#b0c0f0', '#f4f1de', '#3e4c96'],
  clawL: ['#b04fd1', '#7a2a9a', '#ff5277', '#2a0e3a'],
  clawR: ['#44d9e6', '#1f8fa8', '#b0c0f0', '#0e2a30'],
  core: ['#7a2a9a', '#4a1a64', '#b04fd1', '#07081a'],
} as const satisfies Record<string, PixelMaterial>;

const WHITE = '#f4f1de';
const INK = '#0b0a12';
const CYAN = '#44d9e6';
const RED = '#ff5277';
const YELLOW = '#ffd84a';

/** Top-left stage placement of the standing Vesper sprite (behind the operator console). */
export const VESPER_ORIGIN = { x: 100, y: 34 } as const;
/** Top-left stage placement of the Nightmare; its core sits on VESPER_NIGHTMARE_TARGET. */
export const NIGHTMARE_ORIGIN = { x: 86, y: 20 } as const;
/** Top-left stage placement of Vesper collapsed after the Nightmare is defeated. */
export const VESPER_DOWN_ORIGIN = { x: 96, y: 86 } as const;
export const NIGHTMARE_CORE = { x: 22, y: 54 } as const;

function wildHair(cx: number, top: number, spread: number): PixelPoint[] {
  const strands: PixelPoint[] = [];
  for (let i = -spread; i <= spread; i += 3) {
    const lift = 3 - Math.abs(i) / spread * 2;
    strands.push(...pixelLine([cx + i, top + 4], [cx + i * 1.35, top + 4 - lift * 1.6], 1));
  }
  return strands;
}

function buildVesper(): PixelSprite {
  const s = new PixelSpriteBuilder(28, 38, VESPER_MATERIALS);
  s.paint(pixelRect(0, 0, 27, 37).filter(([x, y]) => y >= 20 && Math.abs(x - 14) <= 7 + (y - 20) * 0.35), 'coat');
  s.paint(pixelRect(11, 20, 17, 30).filter(([x, y]) => Math.abs(x - 14) <= (30 - y) * 0.35), 'shirt');
  s.paint(pixelEllipse(14, 8, 10.5, 6), 'hair');
  s.paint(wildHair(14, 0, 10), 'hair');
  s.paint(pixelEllipse(14, 12, 6, 7.5), 'skin');
  s.paint(pixelRect(13, 19, 15, 20), 'skin');
  s.paint(pixelLine([7, 22], [2, 15]), 'coat');
  s.paint(pixelRect(0, 12, 3, 14), 'glove');
  s.paint(pixelRect(1, 7, 3, 11), 'remote');
  s.paint(pixelLine([21, 22], [25, 31]), 'coat');
  s.paint(pixelRect(24, 32, 26, 34), 'glove');
  s.dot(INK, [...pixelRect(8, 10, 20, 10), [8, 11], [12, 11], [16, 11], [20, 11]]);
  s.dot(CYAN, [...pixelRect(9, 11, 11, 12), ...pixelRect(17, 11, 19, 12)]);
  s.dot(WHITE, [[9, 11], [17, 11]]);
  s.dot(INK, [...pixelRect(10, 16, 18, 16), [11, 17], [17, 17]]);
  s.dot(WHITE, [[11, 16], [13, 16], [15, 16], [17, 16]]);
  s.dot(RED, [[2, 6], [2, 7]]);
  s.dot('#b04fd1', [[14, 22], [14, 23], [13, 24], [15, 24], [14, 25]]);
  return s.build();
}

function buildNightmare(frame: 0 | 1, vulnerable: boolean): PixelSprite {
  const s = new PixelSpriteBuilder(44, 78, NIGHTMARE_MATERIALS);
  const sway = frame === 0 ? 0 : 1;
  for (let i = 0; i < 7; i += 1) {
    const x = 11 + i * 3.6;
    const length = 66 + ((i * 5) % 9) + (i % 2 === sway ? 2 : 0);
    s.paint(pixelLine([Math.round(x), 54], [Math.round(x + (i - 3) * 0.8 + (i % 2 === 0 ? sway : -sway)), length], 3), 'tatter');
  }
  s.paint(pixelEllipse(22, 42, 13, 17), 'shade');
  s.paint(pixelRect(6, 26, 38, 60).filter(([x, y]) => Math.abs(x - 22) >= 9 && Math.abs(x - 22) <= 9 + (y - 26) * 0.2 && y % 6 !== sway), 'tatter');
  s.paint([...pixelLine([11, 28], [5, 44], 3), ...pixelLine([5, 44], [2, 56 + sway], 3)], 'clawL');
  s.paint([...pixelLine([33, 28], [39, 44], 3), ...pixelLine([39, 44], [41, 56 + sway], 3)], 'clawR');
  s.paint([...pixelLine([0, 58 + sway], [0, 62 + sway], 1), ...pixelLine([2, 59 + sway], [2, 63 + sway], 1), ...pixelLine([4, 58 + sway], [5, 62 + sway], 1)], 'clawL');
  s.paint([...pixelLine([39, 58 + sway], [38, 62 + sway], 1), ...pixelLine([41, 59 + sway], [41, 63 + sway], 1), ...pixelLine([43, 58 + sway], [43, 62 + sway], 1)], 'clawR');
  s.paint(pixelEllipse(22, 14, 9.5, 6.5), 'hair');
  s.paint(wildHair(22, 4 - sway, 11), 'hair');
  s.paint(pixelEllipse(22, 17, 8, 9), 'shade');
  s.dot(INK, pixelRect(15, 14, 29, 15));
  s.dot(RED, pixelRect(16, 14, 19, 15));
  s.dot(YELLOW, pixelRect(25, 14, 28, 15));
  s.dot(INK, pixelRect(16, 20, 28, 22));
  s.dot(WHITE, [[16, 20], [18, 21], [20, 20], [22, 21], [24, 20], [26, 21], [28, 20]]);
  s.paint(pixelEllipse(NIGHTMARE_CORE.x, NIGHTMARE_CORE.y, 5, 5), 'core');
  const coreColor = vulnerable ? YELLOW : RED;
  s.dot(coreColor, pixelEllipse(NIGHTMARE_CORE.x, NIGHTMARE_CORE.y, 3, 3));
  s.dot(vulnerable ? WHITE : YELLOW, pixelRect(NIGHTMARE_CORE.x - 1, NIGHTMARE_CORE.y - 1, NIGHTMARE_CORE.x, NIGHTMARE_CORE.y));
  return s.build();
}

function buildVesperDown(): PixelSprite {
  const s = new PixelSpriteBuilder(32, 12, VESPER_MATERIALS);
  s.paint(pixelEllipse(18, 8, 11, 3.6), 'coat');
  s.paint(pixelLine([26, 7], [31, 10]), 'coat');
  s.paint(pixelRect(29, 10, 31, 11), 'glove');
  s.paint(pixelEllipse(5, 6, 5, 4.6), 'hair');
  s.paint(pixelEllipse(7, 8, 3.6, 3.2), 'skin');
  s.dot(INK, [[5, 7], [6, 7], [7, 7], [8, 7], [9, 7]]);
  s.dot(CYAN, [[6, 8], [9, 8]]);
  s.dot(INK, [[7, 10], [8, 10]]);
  s.paint(pixelRect(13, 2, 15, 4), 'remote');
  return s.build();
}

export const VESPER_SPRITE = buildVesper();
export const VESPER_DOWN_SPRITE = buildVesperDown();
const NIGHTMARE_SPRITES = [
  [buildNightmare(0, false), buildNightmare(1, false)],
  [buildNightmare(0, true), buildNightmare(1, true)],
] as const;

export function nightmareSprite(nowMs: number, vulnerable: boolean): PixelSprite {
  return NIGHTMARE_SPRITES[vulnerable ? 1 : 0][Math.floor(nowMs / 180) % 2 === 0 ? 0 : 1];
}
