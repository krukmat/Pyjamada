import React, { useEffect, useState } from 'react';
import { Rect } from '@shopify/react-native-skia';
import { RETRO_PALETTE } from './VisualLanguage';

type ScaleFn = (value: number) => number;

export type PixelBlock = {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
};

export function PixelBlocks({ blocks, px, prefix }: { blocks: readonly PixelBlock[]; px: ScaleFn; prefix: string }) {
  return (
    <>
      {blocks.map((block, index) => (
        <Rect
          key={`${prefix}-${index}`}
          x={px(block.x)}
          y={px(block.y)}
          width={px(block.width)}
          height={px(block.height)}
          color={block.color}
        />
      ))}
    </>
  );
}

export function PixelHalo({ x, y, width, height, px, active = true }: { x: number; y: number; width: number; height: number; px: ScaleFn; active?: boolean }) {
  if (!active) return null;
  return (
    <>
      <Rect x={px(x - 2)} y={px(y - 2)} width={px(width + 4)} height={px(height + 4)} color="rgba(241,215,92,0.08)" />
      <Rect x={px(x - 1)} y={px(y - 1)} width={px(width + 2)} height={px(height + 2)} color="rgba(241,215,92,0.15)" />
    </>
  );
}

export function HeroContactShadow({ x, y, px, width = 10 }: { x: number; y: number; px: ScaleFn; width?: number }) {
  return (
    <>
      <Rect x={px(x - 1)} y={px(y + 15)} width={px(width)} height={px(2)} color="rgba(5,5,9,0.42)" />
      <Rect x={px(x + 1)} y={px(y + 16)} width={px(Math.max(2, width - 4))} height={px(1)} color="rgba(5,5,9,0.62)" />
    </>
  );
}

export function KeySprite({ x, y, px, pulse = true }: { x: number; y: number; px: ScaleFn; pulse?: boolean }) {
  const [bright, setBright] = useState(true);

  useEffect(() => {
    if (!pulse) return undefined;
    const timer = setInterval(() => setBright((current) => !current), 650);
    return () => clearInterval(timer);
  }, [pulse]);

  const blocks: PixelBlock[] = [
    { x, y, width: 5, height: 1, color: RETRO_PALETTE.yellow },
    { x, y: y + 1, width: 1, height: 4, color: RETRO_PALETTE.yellow },
    { x: x + 4, y: y + 1, width: 1, height: 4, color: RETRO_PALETTE.yellowDark },
    { x, y: y + 5, width: 5, height: 1, color: RETRO_PALETTE.yellowDark },
    { x: x + 1, y: y + 1, width: 3, height: 3, color: RETRO_PALETTE.void },
    { x: x + 5, y: y + 2, width: 5, height: 2, color: RETRO_PALETTE.yellow },
    { x: x + 8, y: y + 4, width: 2, height: 2, color: RETRO_PALETTE.yellowDark },
    { x: x + 6, y: y + 4, width: 1, height: 1, color: RETRO_PALETTE.yellow },
  ];

  return (
    <>
      <PixelHalo x={x} y={y} width={10} height={6} px={px} active={pulse && bright} />
      <PixelBlocks blocks={blocks} px={px} prefix="key" />
    </>
  );
}
