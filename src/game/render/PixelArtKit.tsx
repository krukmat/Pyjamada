import React from 'react';
import { Rect } from '@shopify/react-native-skia';
import type { GameState } from '../core/GameState';
import { getWalkFrame, RETRO_PALETTE } from './VisualLanguage';

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

export function PajamaHero({ gameState, px }: { gameState: GameState; px: ScaleFn }) {
  const { x, y, facing } = gameState.player;
  const frame = getWalkFrame(gameState);
  const eyeX = facing === 'right' ? x + 5 : x + 2;
  const frontArmX = facing === 'right' ? x + 6 : x;
  const backArmX = facing === 'right' ? x : x + 6;
  const leftLegX = frame === 0 ? x + 1 : x + 2;
  const rightLegX = frame === 0 ? x + 5 : x + 4;

  const blocks: PixelBlock[] = [
    { x: x + 1, y, width: 5, height: 1, color: RETRO_PALETTE.magenta },
    { x, y: y + 1, width: 7, height: 1, color: RETRO_PALETTE.magenta },
    { x: x + 1, y: y + 2, width: 6, height: 4, color: RETRO_PALETTE.ink },
    { x: eyeX, y: y + 3, width: 1, height: 1, color: RETRO_PALETTE.shadow },
    { x: x + 1, y: y + 6, width: 6, height: 6, color: RETRO_PALETTE.cyan },
    { x: x + 1, y: y + 9, width: 6, height: 1, color: RETRO_PALETTE.magenta },
    { x: frontArmX, y: y + 7, width: 2, height: 4, color: RETRO_PALETTE.cyan },
    { x: backArmX, y: y + 7, width: 1, height: 3, color: RETRO_PALETTE.blue },
    { x: leftLegX, y: y + 12, width: 2, height: frame === 0 ? 4 : 3, color: RETRO_PALETTE.cyan },
    { x: rightLegX, y: y + 12, width: 2, height: frame === 0 ? 3 : 4, color: RETRO_PALETTE.cyan },
    { x: leftLegX - 1, y: y + 15, width: 3, height: 1, color: RETRO_PALETTE.ink },
    { x: rightLegX, y: y + 15, width: 3, height: 1, color: RETRO_PALETTE.ink },
  ];

  return <PixelBlocks blocks={blocks} px={px} prefix="hero" />;
}

export function KeySprite({ x, y, px }: { x: number; y: number; px: ScaleFn }) {
  const blocks: PixelBlock[] = [
    { x, y: y + 1, width: 2, height: 2, color: RETRO_PALETTE.yellow },
    { x: x + 2, y: y + 2, width: 4, height: 1, color: RETRO_PALETTE.yellow },
    { x: x + 4, y: y + 3, width: 1, height: 2, color: RETRO_PALETTE.yellow },
    { x: x + 6, y: y + 2, width: 1, height: 2, color: RETRO_PALETTE.yellow },
  ];
  return <PixelBlocks blocks={blocks} px={px} prefix="key" />;
}

export function ClosedDoor({ x, y, px }: { x: number; y: number; px: ScaleFn }) {
  const blocks: PixelBlock[] = [
    { x, y, width: 12, height: 24, color: RETRO_PALETTE.magenta },
    { x: x + 2, y: y + 2, width: 8, height: 20, color: '#451f47' },
    { x: x + 3, y: y + 3, width: 6, height: 8, color: RETRO_PALETTE.red },
    { x: x + 3, y: y + 13, width: 6, height: 7, color: RETRO_PALETTE.red },
    { x: x + 8, y: y + 12, width: 1, height: 1, color: RETRO_PALETTE.yellow },
  ];
  return <PixelBlocks blocks={blocks} px={px} prefix="closed-door" />;
}

export function OpenDoor({ x, y, px }: { x: number; y: number; px: ScaleFn }) {
  const blocks: PixelBlock[] = [
    { x, y, width: 2, height: 24, color: RETRO_PALETTE.cyan },
    { x: x + 10, y, width: 2, height: 24, color: RETRO_PALETTE.cyan },
    { x, y, width: 12, height: 2, color: RETRO_PALETTE.cyan },
    { x: x + 2, y: y + 2, width: 8, height: 22, color: RETRO_PALETTE.void },
  ];
  return <PixelBlocks blocks={blocks} px={px} prefix="open-door" />;
}
