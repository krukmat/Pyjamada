import React from 'react';
import { Group, type SkImage } from '@shopify/react-native-skia';
import type { HauntedSessionState } from '../haunted/HauntedSessionRuntime';
import { AtlasSprite } from '../presentation/atlas/AtlasSprite';
import { createSpriteAtlasIndex, requireAtlasFrame } from '../presentation/atlas/SpriteAtlas';
import { HAUNTED_WALLY_ATLAS } from '../presentation/atlas/HauntedWallyAtlas';
import { WALLY_ATLAS } from '../presentation/atlas/manifests';
import { HauntedWallyFallback } from './HauntedActorFallbacks';
import { hauntedWallyFrameIndex, selectHauntedWallyPose } from './HauntedWallyVisual';

const INDEX = createSpriteAtlasIndex(HAUNTED_WALLY_ATLAS);
const ARCADE_INDEX = createSpriteAtlasIndex(WALLY_ATLAS);
const ARCADE_SCALE_MULTIPLIER = 2;

type Props = {
  arcadeImage?: SkImage | null;
  image: SkImage | null;
  session: HauntedSessionState;
  x: number;
  y: number;
  scale: number;
  nowMs: number;
  honorTerminalObjective?: boolean;
};

export function HauntedWallySprite({
  arcadeImage = null,
  image,
  session,
  x,
  y,
  scale,
  nowMs,
  honorTerminalObjective = true,
}: Props) {
  const palette = session.domestic.flags.dressed ? 'dressed' : 'pajamas';
  const pose = selectHauntedWallyPose(session, { honorTerminalObjective });
  const invulnerable = session.combat.invulnerableUntilMs > session.elapsedMs;
  const opacity = invulnerable && Math.floor(nowMs / 70) % 2 === 0 ? 0.76 : 1;

  // Phase-1 bridge: use the generated arcade actor for the pajama state that
  // dominates the visual proof. Dressed art stays on the proven haunted atlas
  // until the dedicated actor pass adds a matching arcade outfit.
  if (arcadeImage && palette === 'pajamas') {
    const frame = requireAtlasFrame(ARCADE_INDEX, arcadeFrameIdForPose(pose, nowMs));
    return (
      <Group opacity={opacity}>
        <AtlasSprite
          image={arcadeImage}
          frame={frame}
          x={x}
          y={y}
          scale={scale * ARCADE_SCALE_MULTIPLIER}
          facing={session.player.facing}
        />
      </Group>
    );
  }

  if (!image) {
    return (
      <HauntedWallyFallback
        session={session}
        x={x}
        y={y}
        scale={scale}
        honorTerminalObjective={honorTerminalObjective}
      />
    );
  }

  const frameIndex = hauntedWallyFrameIndex(pose, nowMs);
  const frame = requireAtlasFrame(INDEX, `${palette}_${String(frameIndex).padStart(2, '0')}`);

  return (
    <Group opacity={opacity}>
      <AtlasSprite
        image={image}
        frame={frame}
        x={x}
        y={y}
        scale={scale}
        facing={session.player.facing}
      />
    </Group>
  );
}


function arcadeFrameIdForPose(pose: ReturnType<typeof selectHauntedWallyPose>, nowMs: number): string {
  const phase2 = Math.floor(nowMs / 170) % 2;
  const phase3 = Math.floor(nowMs / 110) % 3;
  switch (pose) {
    case 'idle': return `idle_normal_${phase2}`;
    case 'walk': return `walk_normal_${phase3}`;
    case 'sleepy': return `idle_sleepy_${phase2}`;
    case 'startled': return `idle_startled_${phase2}`;
    case 'interact': return 'collect_keys_0';
    case 'attack': return `collect_keys_${phase3}`;
    case 'jump': return 'success_1';
    case 'hit': return `idle_startled_${phase2}`;
    case 'success': return 'success_1';
    case 'fail': return `fail_exhausted_${1 + phase2}`;
  }
}
