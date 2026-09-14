import React from 'react';
import { Group, useImage } from '@shopify/react-native-skia';
import type { HauntedSessionState } from '../haunted/HauntedSessionRuntime';
import { HAUNTED_WALLY_ATLAS_SOURCE } from '../presentation/AssetSources';
import { AtlasSprite } from '../presentation/atlas/AtlasSprite';
import { createSpriteAtlasIndex, requireAtlasFrame } from '../presentation/atlas/SpriteAtlas';
import { HAUNTED_WALLY_ATLAS } from '../presentation/atlas/HauntedWallyAtlas';
import { hauntedWallyFrameIndex, selectHauntedWallyPose } from './HauntedWallyVisual';

const INDEX = createSpriteAtlasIndex(HAUNTED_WALLY_ATLAS);

type Props = {
  session: HauntedSessionState;
  x: number;
  y: number;
  scale: number;
  nowMs: number;
};

export function HauntedWallySprite({ session, x, y, scale, nowMs }: Props) {
  const image = useImage(HAUNTED_WALLY_ATLAS_SOURCE);
  const palette = session.domestic.flags.dressed ? 'dressed' : 'pajamas';
  const pose = selectHauntedWallyPose(session);
  const frameIndex = hauntedWallyFrameIndex(pose, nowMs);
  const frame = requireAtlasFrame(INDEX, `${palette}_${String(frameIndex).padStart(2, '0')}`);
  const invulnerable = session.combat.invulnerableUntilMs > session.elapsedMs;
  const opacity = invulnerable && Math.floor(nowMs / 70) % 2 === 0 ? 0.42 : 1;

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
