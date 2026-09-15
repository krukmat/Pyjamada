import React from 'react';
import {
  Atlas,
  FilterMode,
  Group,
  MipmapMode,
  Skia,
  rect,
  type SkImage,
} from '@shopify/react-native-skia';
import type { AtlasFrame } from './SpriteAtlas';
import { resolveSpritePlacement } from './SpriteTransform';

type Props = {
  image: SkImage | null;
  frame: AtlasFrame;
  x: number;
  y: number;
  scale?: number;
  facing?: 'left' | 'right';
};

export function AtlasSprite({ image, frame, x, y, scale = 1, facing = 'right' }: Props) {
  if (!image) return null;

  // StageViewport uses an adaptive scale, so logical world coordinates can
  // land on fractional rendered pixels even when gameplay positions are
  // integral. Snap the final actor anchor here, immediately before atlas
  // placement. This preserves the pixel-sprite contract without allowing a
  // common Android viewport scale (for example ~2.42) to throw during render.
  const snappedX = Math.round(x);
  const snappedY = Math.round(y);
  const placement = resolveSpritePlacement(frame, snappedX, snappedY, scale, facing);
  const draw = (
    <Atlas
      image={image}
      sprites={[rect(frame.x, frame.y, frame.width, frame.height)]}
      transforms={[Skia.RSXform(scale, 0, placement.drawX, placement.drawY)]}
      sampling={{ filter: FilterMode.Nearest, mipmap: MipmapMode.None }}
    />
  );

  if (!placement.mirror) return draw;

  // RSXform is a similarity transform: a negative scos also flips the
  // y-axis, rotating the sprite 180 degrees instead of mirroring it. A true
  // horizontal-only mirror needs an independent x/y basis, so the unmirrored
  // draw is wrapped in a Group scaled -1 on x, pivoted at the sprite's own
  // anchor position so it mirrors in place rather than around the origin.
  return (
    <Group transform={[{ translateX: placement.pivotX }, { scaleX: -1 }, { translateX: -placement.pivotX }]}>
      {draw}
    </Group>
  );
}
