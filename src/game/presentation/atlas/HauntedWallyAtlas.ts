import type { SpriteAtlasManifest } from './SpriteAtlas';

const FRAME_WIDTH = 32;
const FRAME_HEIGHT = 48;
const COLUMNS = 8;
const FRAMES_PER_PALETTE = 25;

const frames: SpriteAtlasManifest['frames'][number][] = [];
for (let paletteIndex = 0; paletteIndex < 2; paletteIndex += 1) {
  const palette = paletteIndex === 0 ? 'pajamas' : 'dressed';
  for (let localIndex = 0; localIndex < FRAMES_PER_PALETTE; localIndex += 1) {
    const absoluteIndex = paletteIndex * FRAMES_PER_PALETTE + localIndex;
    frames.push({
      id: `${palette}_${String(localIndex).padStart(2, '0')}`,
      x: (absoluteIndex % COLUMNS) * FRAME_WIDTH,
      y: Math.floor(absoluteIndex / COLUMNS) * FRAME_HEIGHT,
      width: FRAME_WIDTH,
      height: FRAME_HEIGHT,
      anchorX: 16,
      anchorY: 47,
    });
  }
}

export const HAUNTED_WALLY_ATLAS: SpriteAtlasManifest = {
  id: 'haunted-wally',
  width: 256,
  height: 336,
  frames,
  clips: [],
};
