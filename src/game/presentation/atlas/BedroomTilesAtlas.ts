import type { SpriteAtlasManifest } from './SpriteAtlas';
import { BEDROOM_TILE_IDS, BEDROOM_TILE_SIZE } from './pixels/BedroomTilesPixels';

const COLUMNS = 16;

export const BEDROOM_TILES_ATLAS: SpriteAtlasManifest = {
  id: 'bedroom-tiles',
  width: 256,
  height: 16,
  frames: BEDROOM_TILE_IDS.map((id, index) => ({
    id,
    x: (index % COLUMNS) * BEDROOM_TILE_SIZE,
    y: Math.floor(index / COLUMNS) * BEDROOM_TILE_SIZE,
    width: BEDROOM_TILE_SIZE,
    height: BEDROOM_TILE_SIZE,
    anchorX: 0,
    anchorY: 0,
  })),
  clips: [],
};
