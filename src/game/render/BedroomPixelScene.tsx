import React from 'react';
import {
  Atlas,
  FilterMode,
  MipmapMode,
  Skia,
  rect,
  type SkImage,
} from '@shopify/react-native-skia';
import { BEDROOM_TILE_IDS, BEDROOM_TILE_SIZE, type BedroomTileId } from '../presentation/atlas/pixels/BedroomTilesPixels';

type Px = (value: number) => number;

type Props = {
  image: SkImage;
  scale: number;
  px: Px;
};

const TILE_INDEX = new Map<BedroomTileId, number>(
  BEDROOM_TILE_IDS.map((id, index) => [id, index]),
);

const MAP: readonly (readonly BedroomTileId[])[] = [
  ['ceiling','ceiling','ceiling','ceiling','ceiling','ceiling','ceiling','ceiling','ceiling','ceiling','ceiling'],
  ['wall-shadow','wall-a','wall-b','wall-a','wall-b','wall-a','wall-b','wall-a','wall-b','wall-a','wall-shadow'],
  ['wall-shadow','wall-b','wall-a','wall-b','wall-a','wall-b','wall-a','window-tl','window-tr','wall-b','wall-shadow'],
  ['wall-shadow','wall-a','wall-b','wall-a','wall-b','wall-a','wall-b','window-ml','window-mr','wall-a','wall-shadow'],
  ['wall-shadow','wall-b','wall-a','wall-b','wall-a','wall-b','wall-a','window-bl','window-br','wall-b','wall-shadow'],
  ['baseboard','baseboard','baseboard','baseboard','baseboard','baseboard','baseboard','baseboard','baseboard','baseboard','baseboard'],
  ['floor-a','floor-b','floor-c','floor-a','floor-b','floor-c','floor-a','floor-b','floor-c','floor-a','floor-b'],
  ['floor-b','floor-c','floor-a','floor-b','floor-c','floor-a','floor-b','floor-c','floor-a','floor-b','floor-c'],
];

const START_X = -20;

export function BedroomPixelBackdrop({ image, scale, px }: Props) {
  const sprites = [];
  const transforms = [];

  MAP.forEach((row, rowIndex) => {
    row.forEach((tileId, columnIndex) => {
      const index = TILE_INDEX.get(tileId);
      if (index === undefined) throw new Error(`unknown bedroom tile ${tileId}`);
      sprites.push(rect(index * BEDROOM_TILE_SIZE, 0, BEDROOM_TILE_SIZE, BEDROOM_TILE_SIZE));
      transforms.push(
        Skia.RSXform(
          scale,
          0,
          px(START_X + columnIndex * BEDROOM_TILE_SIZE),
          px(rowIndex * BEDROOM_TILE_SIZE),
        ),
      );
    });
  });

  return (
    <Atlas
      image={image}
      sprites={sprites}
      transforms={transforms}
      sampling={{ filter: FilterMode.Nearest, mipmap: MipmapMode.None }}
    />
  );
}
