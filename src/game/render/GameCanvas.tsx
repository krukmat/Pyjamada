import React from 'react';
import { Canvas, Rect } from '@shopify/react-native-skia';
import { BEDROOM_KEY_ID, type GameState } from '../core/GameState';
import { LOGICAL_SIZE, PLAYER_HEIGHT, PLAYER_WIDTH, ROOMS } from '../core/World';

type Props = { gameState: GameState; size: number };
export function GameCanvas({ gameState, size }: Props) {
  const scale = size / LOGICAL_SIZE;
  const px = (value: number) => value * scale;
  const room = ROOMS[gameState.roomId];
  const showKey = gameState.roomId === 'room-01' && !gameState.flags.bedroomKeyCollected;
  const doorUnlocked = Boolean(gameState.flags.bedroomDoorUnlocked);

  return (
    <Canvas style={{ width: size, height: size }}>
      <Rect x={0} y={0} width={size} height={size} color={room.background} />
      <Rect x={0} y={px(104)} width={size} height={px(24)} color={room.floor} />
      {room.platforms.map((platform, index) => (
        <Rect key={`${room.id}-platform-${index}`} x={px(platform.x)} y={px(platform.y)} width={px(platform.width)} height={px(platform.height)} color="#8a6f91" />
      ))}

      {showKey && <Rect x={px(48)} y={px(96)} width={px(6)} height={px(4)} color="#f5df6e" />}
      {gameState.roomId === 'room-01' && (
        <Rect x={px(92)} y={px(80)} width={px(12)} height={px(24)} color={doorUnlocked ? '#4f9f68' : '#9e4755'} />
      )}

      <Rect x={px(gameState.player.x)} y={px(gameState.player.y)} width={px(PLAYER_WIDTH)} height={px(PLAYER_HEIGHT)} color="#f6d365" />
    </Canvas>
  );
}
