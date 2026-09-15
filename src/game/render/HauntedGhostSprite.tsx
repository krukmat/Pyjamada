import React from 'react';
import { Group, type SkImage } from '@shopify/react-native-skia';
import { GHOST_RULES, type HauntedGhostState } from '../haunted/HauntedThreats';
import { AtlasSprite } from '../presentation/atlas/AtlasSprite';
import { createSpriteAtlasIndex, requireAtlasFrame } from '../presentation/atlas/SpriteAtlas';
import { HAUNTED_GHOST_ATLAS } from '../presentation/atlas/HauntedGhostAtlas';
import { EnemyDeathCue, EnemyPresenceCue, EnemyTelegraphCue } from './EnemyPresentation';
import { GHOST_VISUAL_PROFILE } from './EnemyVisualProfile';
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
  const dying = ghost.phase === 'dying';
  const frame = image ? requireAtlasFrame(INDEX, selectFrameId(ghost, nowMs, playerX)) : null;
  const pulse = Math.floor(nowMs / 90) % 2;
  const deathProgress = dying
    ? Math.max(0, Math.min(1, 1 - Math.max(0, ghost.phaseUntilMs - nowMs) / GHOST_RULES.dyingMs))
    : 0;
  const spriteOpacity = telegraph
    ? 0.42
    : dying
      ? Math.max(0.16, 0.46 - deathProgress * 0.28)
      : 1;

  return (
    <Group>
      {telegraph ? (
        <EnemyTelegraphCue
          profile={GHOST_VISUAL_PROFILE}
          x={x}
          y={y}
          scale={scale}
          pulse={pulse}
        />
      ) : dying ? (
        <EnemyDeathCue
          profile={GHOST_VISUAL_PROFILE}
          x={x}
          y={y}
          scale={scale}
          pulse={pulse}
          progress={deathProgress}
        />
      ) : (
        <EnemyPresenceCue
          profile={GHOST_VISUAL_PROFILE}
          x={x}
          y={y}
          scale={scale}
        />
      )}

      <Group opacity={spriteOpacity}>
        {image && frame ? (
          <AtlasSprite image={image} frame={frame} x={x} y={y} scale={scale} facing={facing} />
        ) : (
          <HauntedGhostFallback ghost={ghost} x={x} y={y} scale={scale} playerX={playerX} />
        )}
      </Group>
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
