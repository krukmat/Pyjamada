import React from 'react';
import { useImage } from '@shopify/react-native-skia';
import type { HauntedSessionState } from '../haunted/HauntedSessionRuntime';
import { HAUNTED_WALLY_ATLAS_SOURCE } from '../presentation/AssetSources';
import { AtlasSprite } from '../presentation/atlas/AtlasSprite';
import { createSpriteAtlasIndex, requireAtlasFrame } from '../presentation/atlas/SpriteAtlas';
import { HAUNTED_WALLY_ATLAS } from '../presentation/atlas/HauntedWallyAtlas';

const INDEX = createSpriteAtlasIndex(HAUNTED_WALLY_ATLAS);

type Props = {
  session: HauntedSessionState;
  x: number;
  y: number;
  scale: number;
  nowMs: number;
};

type Pose = 'idle' | 'walk' | 'jump' | 'attack' | 'hit' | 'interact' | 'sleepy' | 'startled' | 'success' | 'fail';

export function HauntedWallySprite({ session, x, y, scale, nowMs }: Props) {
  const image = useImage(HAUNTED_WALLY_ATLAS_SOURCE);
  const palette = session.domestic.flags.dressed ? 'dressed' : 'pajamas';
  const pose = selectPose(session);
  const frameIndex = frameForPose(pose, nowMs);
  const frame = requireAtlasFrame(INDEX, `${palette}_${String(frameIndex).padStart(2, '0')}`);

  return (
    <AtlasSprite
      image={image}
      frame={frame}
      x={x}
      y={y}
      scale={scale}
      facing={session.player.facing}
    />
  );
}

function selectPose(session: HauntedSessionState): Pose {
  if (session.objective.phase === 'completed') return 'success';
  if (session.objective.phase === 'failed') return 'fail';
  if (session.combat.invulnerableUntilMs > session.elapsedMs) return 'hit';

  const nearbyShot = session.combat.projectiles.some((projectile) => Math.abs(projectile.x - session.player.x) <= 22);
  if (nearbyShot) return 'attack';
  if (!session.player.grounded) return 'jump';
  if (session.input.interactPressed) return 'interact';
  if (session.domestic.wallyState === 'sleepy') return 'sleepy';
  if (session.domestic.wallyState === 'startled') return 'startled';
  if (Math.abs(session.player.vx) > 4) return 'walk';
  return 'idle';
}

function frameForPose(pose: Pose, nowMs: number): number {
  const phase2 = Math.floor(nowMs / 170) % 2;
  const phase4 = Math.floor(nowMs / 95) % 4;
  switch (pose) {
    case 'idle': return phase2;
    case 'walk': return 2 + phase4;
    case 'jump': return 6;
    case 'attack': return 10 + phase4;
    case 'hit': return 17 + phase2;
    case 'interact': return 14;
    case 'sleepy': return 15 + phase2;
    case 'startled': return 17 + phase2;
    case 'success': return 23;
    case 'fail': return 24;
  }
}
