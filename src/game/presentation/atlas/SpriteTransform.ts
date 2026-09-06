import type { AtlasFrame } from './SpriteAtlas';

export type SpriteFacing = 'left' | 'right';

// A pixel sprite is placed at (x, y) in logical room space, anchored at
// (frame.anchorX, frame.anchorY) inside its source frame. Facing 'left' must
// mirror the sprite horizontally around that anchor without touching its
// vertical axis — a plain RSXform cannot express that (a negative scos also
// flips y), so callers wrap an unmirrored draw in a Group with scaleX(-1)
// pivoted on the anchor's world position instead.
export type SpritePlacement = {
  drawX: number;
  drawY: number;
  mirror: boolean;
  pivotX: number;
};

export function resolveSpritePlacement(frame: AtlasFrame, x: number, y: number, scale: number, facing: SpriteFacing): SpritePlacement {
  if (!Number.isInteger(x) || !Number.isInteger(y) || !Number.isInteger(scale)) {
    throw new Error('pixel sprites require integer logical placement and integer scale');
  }
  const drawX = x - frame.anchorX * scale;
  const drawY = y - frame.anchorY * scale;
  return {
    drawX,
    drawY,
    mirror: facing === 'left',
    pivotX: x,
  };
}
