import React from 'react';
import { Group, Picture, Skia, type SkPicture } from '@shopify/react-native-skia';
import type { PixelSprite } from './PixelSpriteBuilder';

// Records each procedural sprite once into an SkPicture so a large boss costs
// one draw call per frame instead of hundreds of declarative rects.
const pictures = new WeakMap<PixelSprite, SkPicture>();

function pictureFor(sprite: PixelSprite): SkPicture {
  const cached = pictures.get(sprite);
  if (cached) return cached;
  const recorder = Skia.PictureRecorder();
  const canvas = recorder.beginRecording(Skia.XYWHRect(0, 0, sprite.width, sprite.height));
  const paint = Skia.Paint();
  paint.setAntiAlias(false);
  for (const run of sprite.runs) {
    paint.setColor(Skia.Color(run.color));
    canvas.drawRect(Skia.XYWHRect(run.x, run.y, run.length, 1), paint);
  }
  const picture = recorder.finishRecordingAsPicture();
  pictures.set(sprite, picture);
  return picture;
}

type Props = {
  sprite: PixelSprite;
  /** Logical stage position of the sprite's top-left corner. */
  x: number;
  y: number;
  px: (value: number) => number;
};

export function PixelSpritePicture({ sprite, x, y, px }: Props) {
  const unit = px(1000) / 1000;
  return (
    <Group transform={[{ translateX: px(x) }, { translateY: px(y) }, { scale: unit }]}>
      <Picture picture={pictureFor(sprite)} />
    </Group>
  );
}
