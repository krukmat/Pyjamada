import type { SpriteAtlasManifest } from './SpriteAtlas';

const FRAME_WIDTH = 32;
const FRAME_HEIGHT = 40;

function frame(id: string, column: number, row: number) {
  return {
    id,
    x: column * FRAME_WIDTH,
    y: row * FRAME_HEIGHT,
    width: FRAME_WIDTH,
    height: FRAME_HEIGHT,
    anchorX: 16,
    anchorY: 36,
  } as const;
}

export const HAUNTED_GHOST_ATLAS: SpriteAtlasManifest = {
  id: 'haunted-ghost',
  width: 256,
  height: 80,
  frames: [
    frame('telegraph_0', 0, 0),
    frame('telegraph_1', 1, 0),
    frame('telegraph_2', 2, 0),
    frame('float_0', 3, 0),
    frame('float_1', 4, 0),
    frame('float_2', 5, 0),
    frame('attack_0', 6, 0),
    frame('attack_1', 7, 0),
    frame('attack_2', 0, 1),
    frame('attack_3', 1, 1),
    frame('hit_0', 2, 1),
    frame('hit_1', 3, 1),
    frame('death_0', 4, 1),
    frame('death_1', 5, 1),
    frame('death_2', 6, 1),
    frame('death_3', 7, 1),
  ],
  clips: [
    { id: 'telegraph', loop: 'loop', frames: [
      { frameId: 'telegraph_0', durationMs: 120 },
      { frameId: 'telegraph_1', durationMs: 120 },
      { frameId: 'telegraph_2', durationMs: 120 },
    ] },
    { id: 'float', loop: 'loop', frames: [
      { frameId: 'float_0', durationMs: 120 },
      { frameId: 'float_1', durationMs: 120 },
      { frameId: 'float_2', durationMs: 120 },
    ] },
    { id: 'attack', loop: 'loop', frames: [
      { frameId: 'attack_0', durationMs: 90 },
      { frameId: 'attack_1', durationMs: 90 },
      { frameId: 'attack_2', durationMs: 90 },
      { frameId: 'attack_3', durationMs: 90 },
    ] },
    { id: 'hit', loop: 'hold', frames: [
      { frameId: 'hit_0', durationMs: 90 },
      { frameId: 'hit_1', durationMs: 130 },
    ] },
    { id: 'death', loop: 'once', frames: [
      { frameId: 'death_0', durationMs: 60 },
      { frameId: 'death_1', durationMs: 55 },
      { frameId: 'death_2', durationMs: 55 },
      { frameId: 'death_3', durationMs: 70 },
    ] },
  ],
};
