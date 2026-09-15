import React from 'react';
import { Circle, Group, Rect, type SkImage } from '@shopify/react-native-skia';
import type { HauntedGhostState } from '../haunted/HauntedThreats';
import { AtlasSprite } from '../presentation/atlas/AtlasSprite';
import { createSpriteAtlasIndex, requireAtlasFrame } from '../presentation/atlas/SpriteAtlas';
import { HAUNTED_GHOST_ATLAS } from '../presentation/atlas/HauntedGhostAtlas';
import { HauntedGhostFallback } from './HauntedActorFallbacks';

const INDEX = createSpriteAtlasIndex(HAUNTED_GHOST_ATLAS);

type Props = {
  image: SkImage | null;
  ghost: HauntedGhostState;
  x: number;
  y: number;
  scale: number;
  nowMs: number;
  playerX: number;
};

export function HauntedGhostSprite({ image, ghost, x, y, scale, nowMs, playerX }: Props) {
  const facing = ghost.x <= playerX ? 'right' : 'left';
  const telegraph = ghost.phase === 'telegraph';
  const p = (value: number) => Math.max(1, Math.round(value * scale));
  const centerY = y - p(16);

  if (!image) {
    return <HauntedGhostFallback ghost={ghost} x={x} y={y} scale={scale} playerX={playerX} />;
  }

  const frame = requireAtlasFrame(INDEX, selectFrameId(ghost, nowMs, playerX));
  const telegraphOpacity = 0.76 + (Math.floor(nowMs / 90) % 2) * 0.18;

  return (
    <Group opacity={telegraph ? telegraphOpacity : 1}>
      {telegraph && (
        <>
          <Circle cx={x} cy={centerY} r={p(13)} color="rgba(91,238,255,0.19)" />
          <Circle cx={x} cy={centerY} r={p(8)} color="rgba(255,230,88,0.14)" />
          <Rect x={x - p(17)} y={centerY - p(1)} width={p(6)} height={p(2)} color="rgba(91,238,255,0.78)" />
          <Rect x={x + p(11)} y={centerY - p(1)} width={p(6)} height={p(2)} color="rgba(255,230,88,0.82)" />
          <Rect x={x - p(1)} y={centerY - p(17)} width={p(2)} height={p(6)} color="rgba(255,255,220,0.72)" />
          <Rect x={x - p(1)} y={centerY + p(11)} width={p(2)} height={p(6)} color="rgba(91,238,255,0.72)" />
        </>
      )}
      <AtlasSprite image={image} frame={frame} x={x} y={y} scale={scale} facing={facing} />
    </Group>
  );
}

function selectFrameId(ghost: HauntedGhostState, nowMs: number, playerX: number): string {
  if (ghost.phase === 'telegraph') return `telegraph_${Math.floor(nowMs / 110) % 3}`;
  if (ghost.phase === 'dying') {
    const remainingMs = Math.max(0, ghost.phaseUntilMs - nowMs);
    return `death_${3 - Math.min(3, Math.floor(remainingMs / 55))}`;
  }

  const nearPlayer = Math.abs(ghost.x - playerX) <= 12;
  if (nearPlayer) return `attack_${Math.floor(nowMs / 85) % 4}`;
  return `float_${Math.floor(nowMs / 120) % 3}`;
}
