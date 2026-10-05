import { WARM_POLE, toHex } from './ArcadePalette';
import type { PixelFrame, SpriteSource } from './index';

export const BEDROOM_TILE_SIZE = 16;

export const BEDROOM_TILE_IDS = [
  'ceiling',
  'wall-a',
  'wall-b',
  'wall-shadow',
  'baseboard',
  'floor-a',
  'floor-b',
  'floor-c',
  'window-tl',
  'window-tr',
  'window-ml',
  'window-mr',
  'window-bl',
  'window-br',
] as const;

export type BedroomTileId = (typeof BEDROOM_TILE_IDS)[number];

// Compact warm-pole subset. Slot 0 stays transparent for the shared generator.
export const BEDROOM_TILE_PALETTE = [
  'transparent',
  toHex(WARM_POLE.ink),
  toHex(WARM_POLE.ramps.wall.shadow),
  toHex(WARM_POLE.ramps.wall.base),
  toHex(WARM_POLE.ramps.wall.light),
  toHex(WARM_POLE.ramps.floor.outline),
  toHex(WARM_POLE.ramps.floor.shadow),
  toHex(WARM_POLE.ramps.floor.base),
  toHex(WARM_POLE.ramps.floor.light),
  toHex(WARM_POLE.ramps.wood.outline),
  toHex(WARM_POLE.ramps.wood.shadow),
  toHex(WARM_POLE.ramps.wood.base),
  toHex(WARM_POLE.ramps.wood.light),
  toHex(WARM_POLE.ramps.glass.outline),
  toHex(WARM_POLE.ramps.glass.shadow),
  toHex(WARM_POLE.ramps.glass.base),
  toHex(WARM_POLE.ramps.glass.light),
  toHex(WARM_POLE.ramps.accent.shadow),
  toHex(WARM_POLE.ramps.accent.base),
  toHex(WARM_POLE.ramps.accent.light),
] as const;

type Grid = string[][];

function grid(fill: string): Grid {
  return Array.from({ length: BEDROOM_TILE_SIZE }, () =>
    Array.from({ length: BEDROOM_TILE_SIZE }, () => fill),
  );
}

function h(g: Grid, y: number, char: string, x0 = 0, x1 = BEDROOM_TILE_SIZE - 1) {
  for (let x = x0; x <= x1; x += 1) g[y][x] = char;
}

function v(g: Grid, x: number, char: string, y0 = 0, y1 = BEDROOM_TILE_SIZE - 1) {
  for (let y = y0; y <= y1; y += 1) g[y][x] = char;
}

function dot(g: Grid, x: number, y: number, char: string) {
  g[y][x] = char;
}

function rows(g: Grid): readonly string[] {
  return g.map((row) => row.join(''));
}

function ceiling(): readonly string[] {
  const g = grid('2');
  h(g, 13, '3');
  h(g, 14, '3');
  h(g, 15, '1');
  for (let x = 2; x < 16; x += 5) dot(g, x, 6, '4');
  return rows(g);
}

function wallA(): readonly string[] {
  const g = grid('3');
  h(g, 0, '2');
  h(g, 15, '2');
  dot(g, 3, 4, '4');
  dot(g, 11, 9, '4');
  dot(g, 6, 13, '2');
  return rows(g);
}

function wallB(): readonly string[] {
  const g = grid('3');
  h(g, 0, '2');
  h(g, 15, '2');
  for (const [x, y] of [[2, 11], [7, 5], [13, 3], [10, 13]] as const) dot(g, x, y, '4');
  for (const [x, y] of [[5, 2], [14, 8]] as const) dot(g, x, y, '2');
  return rows(g);
}

function wallShadow(): readonly string[] {
  const g = grid('2');
  h(g, 2, '3', 2, 13);
  h(g, 3, '3', 3, 12);
  dot(g, 4, 5, '4');
  dot(g, 12, 10, '3');
  return rows(g);
}

function baseboard(): readonly string[] {
  const g = grid('3');
  h(g, 0, '2');
  h(g, 8, '9');
  h(g, 9, 'a');
  for (let y = 10; y < 15; y += 1) h(g, y, 'b');
  h(g, 12, 'c', 1, 14);
  h(g, 15, '9');
  return rows(g);
}

function floor(variant: 0 | 1 | 2): readonly string[] {
  const g = grid('7');
  h(g, 0, '5');
  h(g, 1, '6');
  h(g, 8, '6');
  h(g, 15, '5');
  const seam = variant === 0 ? 5 : variant === 1 ? 10 : 13;
  v(g, seam, '6', 2, 7);
  v(g, (seam + 7) % 16, '6', 9, 14);
  h(g, 3 + variant, '8', 2, 7);
  h(g, 11 - variant, '8', 9, 14);
  return rows(g);
}

type WindowPart = {
  left?: boolean;
  right?: boolean;
  top?: boolean;
  bottom?: boolean;
  innerLeft?: boolean;
  innerRight?: boolean;
  barTop?: boolean;
  barBottom?: boolean;
};

function windowTile(part: WindowPart): readonly string[] {
  const g = grid('f');
  for (let y = 0; y < 16; y += 1) {
    for (let x = 0; x < 16; x += 1) {
      if ((x + y * 3) % 11 === 0) g[y][x] = 'e';
      if ((x * 2 + y) % 17 === 0) g[y][x] = 'g';
    }
  }
  if (part.left) {
    v(g, 0, '9');
    v(g, 1, 'b');
  }
  if (part.right) {
    v(g, 14, 'b');
    v(g, 15, '9');
  }
  if (part.innerLeft) {
    v(g, 0, 'a');
    v(g, 1, 'c');
  }
  if (part.innerRight) {
    v(g, 14, 'c');
    v(g, 15, 'a');
  }
  if (part.top) {
    h(g, 0, '9');
    h(g, 1, 'b');
  }
  if (part.bottom) {
    h(g, 14, 'b');
    h(g, 15, '9');
  }
  if (part.barTop) {
    h(g, 0, 'a');
    h(g, 1, 'c');
  }
  if (part.barBottom) {
    h(g, 14, 'c');
    h(g, 15, 'a');
  }
  // A couple of warm glints stop the window reading as a flat cyan panel.
  dot(g, part.left ? 11 : 4, part.top ? 5 : 9, 'j');
  return rows(g);
}

const TILE_ROWS: Record<BedroomTileId, readonly string[]> = {
  ceiling: ceiling(),
  'wall-a': wallA(),
  'wall-b': wallB(),
  'wall-shadow': wallShadow(),
  baseboard: baseboard(),
  'floor-a': floor(0),
  'floor-b': floor(1),
  'floor-c': floor(2),
  'window-tl': windowTile({ left: true, top: true, innerRight: true, barBottom: true }),
  'window-tr': windowTile({ right: true, top: true, innerLeft: true, barBottom: true }),
  'window-ml': windowTile({ left: true, innerRight: true, barTop: true, barBottom: true }),
  'window-mr': windowTile({ right: true, innerLeft: true, barTop: true, barBottom: true }),
  'window-bl': windowTile({ left: true, bottom: true, innerRight: true, barTop: true }),
  'window-br': windowTile({ right: true, bottom: true, innerLeft: true, barTop: true }),
};

export const BEDROOM_TILE_FRAMES: readonly PixelFrame[] = BEDROOM_TILE_IDS.map((id) => ({
  id,
  rows: TILE_ROWS[id],
}));

export const BEDROOM_TILES_SOURCE: SpriteSource = {
  output: 'assets/game/rooms/bedroom-tiles.png',
  width: 256,
  height: 16,
  frameWidth: BEDROOM_TILE_SIZE,
  frameHeight: BEDROOM_TILE_SIZE,
  columns: 16,
  palette: BEDROOM_TILE_PALETTE,
  frames: BEDROOM_TILE_FRAMES,
};
