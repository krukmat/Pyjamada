import React from 'react';
import { Circle, Group, Rect, RoundedRect, type SkImage } from '@shopify/react-native-skia';
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
  const dying = ghost.phase === 'dying';
  const p = (value: number) => Math.max(1, Math.round(value * scale));
  const centerY = y - p(18);
  const frame = image ? requireAtlasFrame(INDEX, selectFrameId(ghost, nowMs, playerX)) : null;
  const pulse = Math.floor(nowMs / 90) % 2;

  return (
    <Group>
      {telegraph ? (
        <GhostTelegraphCue x={x} y={y} p={p} pulse={pulse} />
      ) : (
        <GhostPresenceCue x={x} y={y} p={p} dying={dying} />
      )}

      <Group opacity={telegraph ? 0.42 : dying ? 0.78 : 1}>
        {image && frame ? (
          <AtlasSprite image={image} frame={frame} x={x} y={y} scale={scale} facing={facing} />
        ) : (
          <HauntedGhostFallback ghost={ghost} x={x} y={y} scale={scale} playerX={playerX} />
        )}
      </Group>

      {telegraph && (
        <>
          <Rect x={x - p(4)} y={centerY - p(3)} width={p(3)} height={p(3)} color="rgba(255,232,92,0.96)" />
          <Rect x={x + p(2)} y={centerY - p(3)} width={p(3)} height={p(3)} color="rgba(255,232,92,0.96)" />
        </>
      )}
    </Group>
  );
}

function GhostTelegraphCue({ x, y, p, pulse }: {
  x: number;
  y: number;
  p: (value: number) => number;
  pulse: number;
}) {
  const centerY = y - p(18);
  const halo = pulse === 0 ? 0.17 : 0.24;
  const body = pulse === 0 ? 0.22 : 0.32;
  return (
    <>
      <Circle cx={x} cy={centerY} r={p(pulse === 0 ? 14 : 16)} color={`rgba(91,238,255,${halo})`} />
      <Circle cx={x} cy={centerY} r={p(9)} color="rgba(255,230,88,0.075)" />

      <RoundedRect
        x={x - p(7)}
        y={y - p(34)}
        width={p(14)}
        height={p(20)}
        r={p(6)}
        color={`rgba(190,248,255,${body})`}
      />
      <Rect x={x - p(7)} y={y - p(17)} width={p(5)} height={p(6)} color={`rgba(91,218,237,${body})`} />
      <Rect x={x - p(1)} y={y - p(17)} width={p(4)} height={p(5)} color={`rgba(190,248,255,${body})`} />
      <Rect x={x + p(4)} y={y - p(17)} width={p(3)} height={p(4)} color={`rgba(91,218,237,${body})`} />
      <Rect x={x - p(11)} y={y - p(27)} width={p(4)} height={p(4)} color="rgba(91,238,255,0.24)" />
      <Rect x={x + p(7)} y={y - p(25)} width={p(5)} height={p(4)} color="rgba(91,238,255,0.24)" />

      <Rect x={x - p(18)} y={centerY - p(1)} width={p(6)} height={p(2)} color="rgba(91,238,255,0.78)" />
      <Rect x={x + p(12)} y={centerY - p(1)} width={p(6)} height={p(2)} color="rgba(255,230,88,0.82)" />
      <Rect x={x - p(1)} y={centerY - p(18)} width={p(2)} height={p(6)} color="rgba(235,255,255,0.82)" />
      <Rect x={x - p(1)} y={centerY + p(12)} width={p(2)} height={p(5)} color="rgba(91,238,255,0.72)" />

      <Rect x={x - p(13)} y={y - p(39)} width={p(2)} height={p(2)} color="rgba(91,238,255,0.90)" />
      <Rect x={x + p(11)} y={y - p(37)} width={p(2)} height={p(2)} color="rgba(255,230,88,0.90)" />
      <Rect x={x - p(15)} y={y - p(10)} width={p(2)} height={p(2)} color="rgba(255,255,225,0.72)" />
      <Rect x={x + p(14)} y={y - p(12)} width={p(2)} height={p(2)} color="rgba(91,238,255,0.72)" />
    </>
  );
}

function GhostPresenceCue({ x, y, p, dying }: {
  x: number;
  y: number;
  p: (value: number) => number;
  dying: boolean;
}) {
  return (
    <>
      <Circle
        cx={x}
        cy={y - p(18)}
        r={p(13)}
        color={dying ? 'rgba(143,174,199,0.055)' : 'rgba(91,238,255,0.085)'}
      />
      <RoundedRect
        x={x - p(9)}
        y={y - p(3)}
        width={p(18)}
        height={p(4)}
        r={p(2)}
        color={dying ? 'rgba(13,21,45,0.20)' : 'rgba(8,16,38,0.36)'}
      />
    </>
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
