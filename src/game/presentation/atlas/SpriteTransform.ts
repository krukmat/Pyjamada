import type { AtlasFrame } from './SpriteAtlas';

export type SpriteFacing = 'left' | 'right';

// A pixel sprite is placed at (x, y) in rendered stage pixels, anchored at
// (frame.anchorX, frame.anchorY) inside its source frame. Stage coordinates
// are snapped before they reach this function, but the viewport scale is
// intentionally adaptive and therefore may be fractional on real devices.
// Nearest-neighbour sampling in AtlasSprite preserves the pixel-art look;
// rejecting a fractional scale here would blank haunted actors on common
// mobile widths (for example a ~2.42 stage scale).
//
// Facing 'left' mirrors horizontally around the actor anchor without touching
// the vertical axis — a plain RSXform cannot express that (negative scos also
// flips y), so callers wrap an unmirrored draw in a Group with scaleX(-1)
// pivoted on the anchor's world position instead.
export type SpritePlacement = {
  drawX: number;
  drawY: number;
  mirror: boolean;
  pivotX: number;
};

export function resolveSpritePlacement(frame: AtlasFrame, x: number, y: number, scale: number, facing: SpriteFacing): SpritePlacement {
  if (!Number.isInteger(x) || !Number.isInteger(y)) {
    throw new Error('pixel sprites require integer rendered x/y placement');
  }
  if (!Number.isFinite(scale) || scale <= 0) {
    throw new Error('pixel sprites require a finite positive scale');
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
