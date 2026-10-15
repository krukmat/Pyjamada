import type { RoomId } from '../adventure/AdventureState';
import type { PixelRun, PixelSprite } from './PixelSpriteBuilder';
import { STAGE_LOGICAL_WIDTH, STAGE_SIDE_MARGIN } from './StageViewport';

// Pixel-art surface textures laid over each room's flat wall and floor
// colors. They only darken or lighten what is underneath, so state-driven
// room colors (flicker, lights off) keep working, and the room palette
// quantizes the result into real material tones.

export type TexturedRoomId = Exclude<RoomId, 'bedroom'>;

/** Stage-space origin of every texture: it spans the full spread room plus its side margins. */
export const ROOM_TEXTURE_ORIGIN = { x: -STAGE_SIDE_MARGIN, y: 0 } as const;
const WIDTH = STAGE_LOGICAL_WIDTH;
const HEIGHT = 128;

const SHADE = 'rgba(0,0,0,0.30)';
const DEEP = 'rgba(0,0,0,0.48)';
const LIGHT = 'rgba(255,255,255,0.12)';
const BRIGHT = 'rgba(255,255,255,0.22)';

type Paint = (x: number, y: number) => string | undefined;
type Layout = { wallTop: number; floorTop: number; wall: Paint; floor: Paint };

const hash = (x: number, y: number) => {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
};

function planks(x: number, y: number, top: number, height: number, length: number): string | undefined {
  const row = Math.floor((y - top) / height);
  const v = (y - top) % height;
  if (v === 0) return SHADE;
  if (v === 1) return LIGHT;
  const joint = (x + row * Math.floor(length / 2) + 400) % length;
  if (joint === 0) return SHADE;
  return hash(x, y) > 0.985 ? SHADE : undefined;
}

function grid(x: number, y: number, top: number, size: number, highlight = true): string | undefined {
  const u = (x + 400) % size;
  const v = (y - top) % size;
  if (u === 0 || v === 0) return SHADE;
  if (highlight && u === 1 && v === 1) return BRIGHT;
  return undefined;
}

const LAYOUTS: Record<TexturedRoomId, Layout> = {
  hallway: {
    wallTop: 23,
    floorTop: 84,
    wall: (x, y) => {
      if (y >= 64) {
        if (y === 64) return BRIGHT;
        if (y === 65) return SHADE;
        const u = (x + 400) % 14;
        if (y === 82 || u === 0) return SHADE;
        if (u === 1 || y === 67) return LIGHT;
        return undefined;
      }
      const u = (x + 400) % 6;
      if (u === 0) return SHADE;
      if (u === 3 && (y % 6 === 2)) return LIGHT;
      return undefined;
    },
    floor: (x, y) => planks(x, y, 84, 5, 22),
  },
  'living-room': {
    wallTop: 22,
    floorTop: 86,
    wall: (x, y) => {
      if (y === 30) return LIGHT;
      if (y === 31) return SHADE;
      const u = (x + 400) % 8;
      const v = (y - 22) % 8;
      if ((u === 4 && v === 3) || (u === 3 && v === 4) || (u === 5 && v === 4) || (u === 4 && v === 5)) return SHADE;
      if (u === 4 && v === 4) return LIGHT;
      return undefined;
    },
    floor: (x, y) => {
      if (y === 86 || y === 87) return SHADE;
      // Woven carpet: offset dot rows instead of random noise.
      if ((y - 86) % 3 === 0) return (x + 400 + ((y - 86) % 6 === 0 ? 0 : 2)) % 4 === 0 ? SHADE : undefined;
      return (y - 86) % 3 === 1 && (x + 400) % 8 === 4 ? LIGHT : undefined;
    },
  },
  kitchen: {
    wallTop: 22,
    floorTop: 87,
    wall: (x, y) => {
      if (y < 44) return hash(x, y) > 0.97 ? SHADE : undefined;
      if (y === 44) return DEEP;
      return grid(x, y, 45, 6);
    },
    floor: (x, y) => {
      const checker = (Math.floor((x + 400) / 8) + Math.floor((y - 87) / 8)) % 2 === 0;
      if ((y - 87) % 8 === 0) return SHADE;
      return checker ? DEEP : (hash(x, y) > 0.98 ? LIGHT : undefined);
    },
  },
  bathroom: {
    wallTop: 22,
    floorTop: 87,
    wall: (x, y) => grid(x, y, 22, 5),
    floor: (x, y) => grid(x, y, 87, 4, false),
  },
  attic: {
    wallTop: 32,
    floorTop: 87,
    wall: (x, y) => {
      const u = (x + 400) % 7;
      if (u === 0) return DEEP;
      if (u === 1) return LIGHT;
      const board = Math.floor((x + 400) / 7);
      const knotY = 40 + Math.floor(hash(board, 3) * 40);
      if (Math.abs(y - knotY) <= 1 && u >= 3 && u <= 4) return SHADE;
      return undefined;
    },
    floor: (x, y) => {
      const v = (y - 87) % 6;
      const joint = (x + Math.floor((y - 87) / 6) * 13 + 400) % 26;
      if (v === 0 || joint === 0) return SHADE;
      if (v === 2 && (joint === 2 || joint === 24)) return DEEP;
      return undefined;
    },
  },
  basement: {
    wallTop: 23,
    floorTop: 89,
    wall: (x, y) => {
      const row = Math.floor((y - 23) / 5);
      const v = (y - 23) % 5;
      const u = (x + 400 + (row % 2) * 5) % 10;
      if (v === 0 || u === 0) return DEEP;
      if (v === 1 && u > 1) return LIGHT;
      const stain = hash(Math.floor((x + 400) / 12), 7) > 0.6 && y > 60 + hash(Math.floor((x + 400) / 12), 9) * 20;
      return stain && (x + y) % 2 === 0 ? SHADE : undefined;
    },
    floor: (x, y) => {
      const crack = Math.abs(((x + 400) % 37) - 18 - Math.round((y - 89) * 0.6)) === 0 && hash(Math.floor((x + 400) / 37), 1) > 0.4;
      if (crack || y === 89) return DEEP;
      return hash(x, y) > 0.985 ? SHADE : undefined;
    },
  },
  laboratory: {
    wallTop: 22,
    floorTop: 87,
    wall: (x, y) => {
      const u = (x + 400) % 16;
      const v = (y - 22) % 16;
      if (u === 0 || v === 0) return DEEP;
      if (u === 1 || v === 1) return LIGHT;
      if ((u === 3 || u === 13) && (v === 3 || v === 13)) return BRIGHT;
      return undefined;
    },
    floor: (x, y) => {
      if ((y - 87) % 3 === 0) return DEEP;
      return (x + 400) % 12 === 0 ? SHADE : undefined;
    },
  },
};

function buildTexture(layout: Layout): PixelSprite {
  const runs: PixelRun[] = [];
  for (let row = 0; row < HEIGHT; row += 1) {
    const y = row + ROOM_TEXTURE_ORIGIN.y;
    let current: { x: number; length: number; color: string } | null = null;
    for (let col = 0; col <= WIDTH; col += 1) {
      const x = col + ROOM_TEXTURE_ORIGIN.x;
      let color: string | undefined;
      if (col < WIDTH) {
        if (y >= layout.floorTop) color = layout.floor(x, y);
        else if (y >= layout.wallTop) color = layout.wall(x, y);
        else if (y === layout.wallTop - 1) color = DEEP;
      }
      if (current && color === current.color) {
        current.length += 1;
        continue;
      }
      if (current) runs.push({ x: current.x, y: row, length: current.length, color: current.color });
      current = color ? { x: col, length: 1, color } : null;
    }
  }
  return { width: WIDTH, height: HEIGHT, runs };
}

const TEXTURES = new Map<TexturedRoomId, PixelSprite>();

export function roomTexture(roomId: TexturedRoomId): PixelSprite {
  let texture = TEXTURES.get(roomId);
  if (!texture) {
    texture = buildTexture(LAYOUTS[roomId]);
    TEXTURES.set(roomId, texture);
  }
  return texture;
}
