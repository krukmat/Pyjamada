import React from 'react';
import {
  Atlas,
  FilterMode,
  MipmapMode,
  Skia,
  rect,
  type SkImage,
} from '@shopify/react-native-skia';
import type { AtlasFrame } from './SpriteAtlas';

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
  if (!Number.isInteger(x) || !Number.isInteger(y) || !Number.isInteger(scale)) {
    throw new Error('pixel sprites require integer logical placement and integer scale');
  }

  const signedScale = facing === 'left' ? -scale : scale;
  const tx = facing === 'left'
    ? x + frame.anchorX * scale
    : x - frame.anchorX * scale;
  const ty = y - frame.anchorY * scale;

  return (
    <Atlas
      image={image}
      sprites={[rect(frame.x, frame.y, frame.width, frame.height)]}
      transforms={[Skia.RSXform(signedScale, 0, tx, ty)]}
      sampling={{ filter: FilterMode.Nearest, mipmap: MipmapMode.None }}
    />
  );
}
