import React from 'react';
import { Group, type SkImage } from '@shopify/react-native-skia';
import type { HauntedSessionState } from '../haunted/HauntedSessionRuntime';
import { AtlasSprite } from '../presentation/atlas/AtlasSprite';
import { createSpriteAtlasIndex, requireAtlasFrame } from '../presentation/atlas/SpriteAtlas';
import { HAUNTED_WALLY_ATLAS } from '../presentation/atlas/HauntedWallyAtlas';
import { HauntedWallyFallback } from './HauntedActorFallbacks';
import { hauntedWallyFrameIndex, selectHauntedWallyPose } from './HauntedWallyVisual';

const INDEX = createSpriteAtlasIndex(HAUNTED_WALLY_ATLAS);

type Props = {
  image: SkImage | null;
  session: HauntedSessionState;
  x: number;
  y: number;
  scale: number;
  nowMs: number;
  honorTerminalObjective?: boolean;
};

export function HauntedWallySprite({
  image,
  session,
  x,
  y,
  scale,
  nowMs,
  honorTerminalObjective = true,
}: Props) {
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

  const palette = session.domestic.flags.dressed ? 'dressed' : 'pajamas';
  const pose = selectHauntedWallyPose(session, { honorTerminalObjective });
  const frameIndex = hauntedWallyFrameIndex(pose, nowMs);
  const frame = requireAtlasFrame(INDEX, `${palette}_${String(frameIndex).padStart(2, '0')}`);
  const invulnerable = session.combat.invulnerableUntilMs > session.elapsedMs;
  const opacity = invulnerable && Math.floor(nowMs / 70) % 2 === 0 ? 0.76 : 1;

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
