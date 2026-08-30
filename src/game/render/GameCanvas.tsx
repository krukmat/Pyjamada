import React from 'react';
import { Canvas } from '@shopify/react-native-skia';
import type { GameState } from '../core/GameState';
import { LOGICAL_SIZE } from '../core/World';
import { PajamaHero } from './PixelArtKit';
import { RoomScene } from './RoomScene';

type Props = { gameState: GameState; size: number };

export function GameCanvas({ gameState, size }: Props) {
  const scale = size / LOGICAL_SIZE;
  const px = (value: number) => value * scale;

  return (
    <Canvas style={{ width: size, height: size }}>
      <RoomScene gameState={gameState} roomId={gameState.roomId} px={px} />
      <PajamaHero gameState={gameState} px={px} />
    </Canvas>
  );
}
