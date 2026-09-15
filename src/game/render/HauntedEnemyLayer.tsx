import React from 'react';
import type { SkImage } from '@shopify/react-native-skia';
import type { HauntedSessionState } from '../haunted/HauntedSessionRuntime';
import { HauntedGhostSprite } from './HauntedGhostSprite';

type Props = {
  session: HauntedSessionState;
  ghostImage: SkImage | null;
  scale: number;
  nowMs: number;
  playerX: number;
  px: (value: number) => number;
};

/**
 * Single presentation boundary for Haunted enemies.
 *
 * GameCanvas owns scene composition, while this layer owns which enemy
 * renderers are present. New enemy families should be registered here rather
 * than teaching GameCanvas about Goblin/Skull/etc. That keeps stage layering,
 * player readability and combat effects stable as the roster grows.
 */
export function HauntedEnemyLayer({ session, ghostImage, scale, nowMs, playerX, px }: Props) {
  return (
    <>
      {session.threats.ghosts.map((ghost) => (
        <HauntedGhostSprite
          key={`ghost-${ghost.id}`}
          image={ghostImage}
          ghost={ghost}
          x={px(ghost.x)}
          y={px(ghost.y)}
          scale={scale}
          nowMs={nowMs}
          playerX={playerX}
        />
      ))}
    </>
  );
}
