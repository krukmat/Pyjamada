import React from 'react';
import { Rect } from '@shopify/react-native-skia';
import type { GameState } from '../core/GameState';
import type { RoomId } from '../core/World';
import { ClosedDoor, KeySprite, OpenDoor, PixelBlocks, type PixelBlock } from './PixelArtKit';
import { RETRO_PALETTE, ROOM_VISUALS } from './VisualLanguage';

type Props = {
  gameState: GameState;
  roomId: RoomId;
  px: (value: number) => number;
};

export function RoomScene({ gameState, roomId, px }: Props) {
  const palette = ROOM_VISUALS[roomId];

  return (
    <>
      <Rect x={0} y={0} width={px(128)} height={px(128)} color={palette.background} />
      <Rect x={px(4)} y={px(8)} width={px(120)} height={px(96)} color={palette.wall} />
      <Rect x={px(4)} y={px(100)} width={px(120)} height={px(4)} color={palette.primary} />
      <Rect x={0} y={px(104)} width={px(128)} height={px(24)} color={palette.floor} />
      <Rect x={0} y={px(104)} width={px(128)} height={px(2)} color={palette.accent} />

      {roomId === 'room-01' && <BedroomScene gameState={gameState} px={px} />}
      {roomId === 'room-02' && <HallScene px={px} />}
      {roomId === 'room-03' && <LandingScene px={px} />}
    </>
  );
}

function BedroomScene({ gameState, px }: { gameState: GameState; px: Props['px'] }) {
  const blocks: PixelBlock[] = [
    // bed
    { x: 8, y: 78, width: 34, height: 4, color: RETRO_PALETTE.yellow },
    { x: 8, y: 82, width: 34, height: 14, color: RETRO_PALETTE.magenta },
    { x: 10, y: 80, width: 11, height: 5, color: RETRO_PALETTE.ink },
    { x: 8, y: 96, width: 4, height: 8, color: RETRO_PALETTE.yellow },
    { x: 38, y: 96, width: 4, height: 8, color: RETRO_PALETTE.yellow },
    // window
    { x: 12, y: 22, width: 28, height: 22, color: RETRO_PALETTE.cyan },
    { x: 15, y: 25, width: 22, height: 16, color: RETRO_PALETTE.blue },
    { x: 25, y: 25, width: 2, height: 16, color: RETRO_PALETTE.cyan },
    { x: 15, y: 32, width: 22, height: 2, color: RETRO_PALETTE.cyan },
    // cabinet
    { x: 54, y: 42, width: 24, height: 62, color: RETRO_PALETTE.orange },
    { x: 57, y: 46, width: 18, height: 24, color: '#6d3c3c' },
    { x: 57, y: 74, width: 18, height: 26, color: '#6d3c3c' },
    { x: 72, y: 71, width: 2, height: 2, color: RETRO_PALETTE.yellow },
    // bedside lamp
    { x: 44, y: 68, width: 8, height: 3, color: RETRO_PALETTE.yellow },
    { x: 46, y: 71, width: 4, height: 8, color: RETRO_PALETTE.cyan },
    { x: 43, y: 79, width: 10, height: 3, color: RETRO_PALETTE.orange },
  ];

  return (
    <>
      <PixelBlocks blocks={blocks} px={px} prefix="bedroom" />
      {!gameState.flags.bedroomKeyCollected && <KeySprite x={48} y={96} px={px} />}
      {gameState.flags.bedroomDoorUnlocked
        ? <OpenDoor x={92} y={80} px={px} />
        : <ClosedDoor x={92} y={80} px={px} />}
    </>
  );
}

function HallScene({ px }: { px: Props['px'] }) {
  const stairs: PixelBlock[] = Array.from({ length: 7 }, (_, index) => ({
    x: 58 + index * 7,
    y: 94 - index * 8,
    width: 10,
    height: 4,
    color: index % 2 === 0 ? RETRO_PALETTE.cyan : RETRO_PALETTE.green,
  }));

  const blocks: PixelBlock[] = [
    // picture
    { x: 14, y: 24, width: 27, height: 24, color: RETRO_PALETTE.yellow },
    { x: 17, y: 27, width: 21, height: 18, color: RETRO_PALETTE.blue },
    { x: 20, y: 36, width: 6, height: 6, color: RETRO_PALETTE.magenta },
    { x: 28, y: 31, width: 7, height: 11, color: RETRO_PALETTE.green },
    // console table
    { x: 12, y: 74, width: 34, height: 5, color: RETRO_PALETTE.orange },
    { x: 16, y: 79, width: 4, height: 25, color: RETRO_PALETTE.yellow },
    { x: 38, y: 79, width: 4, height: 25, color: RETRO_PALETTE.yellow },
    // vase
    { x: 25, y: 65, width: 8, height: 9, color: RETRO_PALETTE.magenta },
    { x: 27, y: 60, width: 4, height: 6, color: RETRO_PALETTE.green },
    // stair rail
    { x: 60, y: 35, width: 3, height: 61, color: RETRO_PALETTE.yellow },
    { x: 108, y: 18, width: 3, height: 78, color: RETRO_PALETTE.yellow },
    { x: 62, y: 35, width: 48, height: 3, color: RETRO_PALETTE.yellow },
  ];

  return <PixelBlocks blocks={[...blocks, ...stairs]} px={px} prefix="hall" />;
}

function LandingScene({ px }: { px: Props['px'] }) {
  const blocks: PixelBlock[] = [
    // tall clock
    { x: 12, y: 31, width: 18, height: 73, color: RETRO_PALETTE.orange },
    { x: 15, y: 35, width: 12, height: 15, color: RETRO_PALETTE.yellow },
    { x: 18, y: 38, width: 6, height: 8, color: RETRO_PALETTE.void },
    { x: 20, y: 51, width: 2, height: 38, color: RETRO_PALETTE.yellow },
    { x: 17, y: 88, width: 8, height: 8, color: RETRO_PALETTE.magenta },
    // window
    { x: 43, y: 24, width: 30, height: 30, color: RETRO_PALETTE.cyan },
    { x: 47, y: 28, width: 22, height: 22, color: RETRO_PALETTE.blue },
    { x: 57, y: 28, width: 2, height: 22, color: RETRO_PALETTE.cyan },
    { x: 47, y: 38, width: 22, height: 2, color: RETRO_PALETTE.cyan },
    // table and phone-like prop
    { x: 43, y: 75, width: 34, height: 5, color: RETRO_PALETTE.yellow },
    { x: 47, y: 80, width: 4, height: 24, color: RETRO_PALETTE.orange },
    { x: 69, y: 80, width: 4, height: 24, color: RETRO_PALETTE.orange },
    { x: 55, y: 67, width: 11, height: 7, color: RETRO_PALETTE.red },
    { x: 57, y: 64, width: 7, height: 3, color: RETRO_PALETTE.ink },
    // continuation arch
    { x: 93, y: 35, width: 25, height: 69, color: RETRO_PALETTE.magenta },
    { x: 97, y: 40, width: 17, height: 64, color: RETRO_PALETTE.void },
    { x: 100, y: 45, width: 11, height: 3, color: RETRO_PALETTE.red },
  ];

  return <PixelBlocks blocks={blocks} px={px} prefix="landing" />;
}
