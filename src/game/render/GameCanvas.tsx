import React from 'react';
import { Canvas, Group, Rect, type SkImage } from '@shopify/react-native-skia';
import type { RoomId } from '../adventure/AdventureState';
import { PLAYER_GROUND_Y } from '../core/World';
import type { DreamSparkProjectile } from '../haunted/HauntedCombat';
import type { HauntedSessionState } from '../haunted/HauntedSessionRuntime';
import type { ActiveVisualEvent } from '../presentation/PresentationRuntime';
import { resolveFxFrames, resolveScreenShake } from '../presentation/FxSystem';
import { resolveWallyVisualFrame } from '../presentation/WallyAnimator';
import type { SystemicRunState } from '../systemic/SystemicState';
import { HauntedEnemyLayer } from './HauntedEnemyLayer';
import { HauntedHitFeedback } from './HauntedStagePresentation';
import { HauntedWallySprite } from './HauntedWallySprite';
import { IllustratedFx } from './IllustratedFx';
import { IllustratedWally } from './IllustratedWally';
import { PixelDreamSpark } from './PixelDreamSpark';
import { RoomPresentation } from './RoomPresentation';
import { stageCameraOffsetPx, stageOriginX, stagePx, stageScale } from './StageViewport';
import { SCENE_TOKENS } from './VisualLanguage';

type Props = {
  state: SystemicRunState;
  width: number;
  height: number;
  activeVisualEvents: readonly ActiveVisualEvent[];
  nowMs: number;
  roomId?: RoomId;
  playerRenderPosition?: { x: number; y: number; facing: 'left' | 'right' };
  dreamSparks?: readonly DreamSparkProjectile[];
  hauntedSession?: HauntedSessionState;
  hauntedWallyImage?: SkImage | null;
  hauntedGhostImage?: SkImage | null;
};

export function GameCanvas({
  state,
  width,
  height,
  activeVisualEvents,
  nowMs,
  roomId = 'bedroom',
  playerRenderPosition,
  dreamSparks = [],
  hauntedSession,
  hauntedWallyImage = null,
  hauntedGhostImage = null,
}: Props) {
  const scale = stageScale(height);
  const px = (value: number) => stagePx(height, value);
  const originX = stageOriginX(width, height);
  const playerX = playerRenderPosition?.x ?? state.player.x;
  const playerY = playerRenderPosition?.y ?? PLAYER_GROUND_Y;
  const playerFacing = playerRenderPosition?.facing ?? state.player.facing;
  const cameraX = stageCameraOffsetPx(height, playerX, playerFacing);
  const legacyWally = hauntedSession ? null : resolveWallyVisualFrame(state, activeVisualEvents, nowMs);
  const fx = resolveFxFrames(activeVisualEvents, nowMs);
  const shake = resolveScreenShake(activeVisualEvents, nowMs);
  const playerInvulnerable = Boolean(hauntedSession && hauntedSession.combat.invulnerableUntilMs > hauntedSession.elapsedMs);
  const hitDirection = resolveHauntedHitDirection(hauntedSession, playerX, playerInvulnerable);

  return (
    <Canvas style={{ width, height }}>
      <Rect x={0} y={0} width={width} height={height} color={SCENE_TOKENS.skyDeep} />
      <Group transform={[{ translateX: originX + cameraX + px(shake.x) }, { translateY: px(shake.y) }]}>
        <RoomPresentation
          roomId={roomId}
          state={state}
          hauntedSession={hauntedSession}
          activeVisualEvents={activeVisualEvents}
          size={height}
          playerX={playerX}
          playerY={playerY}
          nowMs={nowMs}
          scale={scale}
          px={px}
        />

        {hauntedSession && (
          <HauntedEnemyLayer
            session={hauntedSession}
            ghostImage={hauntedGhostImage}
            scale={scale}
            nowMs={hauntedSession.elapsedMs}
            playerX={playerX}
            px={px}
          />
        )}

        {hauntedSession ? (
          <HauntedWallySprite
            image={hauntedWallyImage}
            session={hauntedSession}
            x={px(playerX)}
            y={px(playerY)}
            scale={scale}
            nowMs={nowMs}
          />
        ) : legacyWally ? (
          <IllustratedWally
            state={state}
            visual={legacyWally}
            x={px(playerX)}
            y={px(playerY)}
            scale={scale}
            facing={playerFacing}
          />
        ) : null}

        {dreamSparks.map((projectile) => (
          <PixelDreamSpark
            key={projectile.id}
            projectile={projectile}
            x={px(projectile.x)}
            y={px(projectile.y)}
            scale={scale}
          />
        ))}

        {fx.map((item) => (
          <IllustratedFx key={item.key} fx={item} x={px(item.x)} y={px(item.y)} scale={scale} />
        ))}

        {playerInvulnerable && (
          <HauntedHitFeedback
            x={px(playerX)}
            y={px(playerY - 23)}
            px={px}
            pulse={Math.floor(nowMs / 90) % 2}
            direction={hitDirection}
          />
        )}
      </Group>
    </Canvas>
  );
}

function resolveHauntedHitDirection(
  session: HauntedSessionState | undefined,
  playerX: number,
  active: boolean,
): -1 | 0 | 1 {
  if (!session || !active) return 0;
  const source = session.threats.ghosts
    .filter((ghost) => ghost.phase === 'active')
    .reduce<(typeof session.threats.ghosts)[number] | undefined>((nearest, ghost) => {
      if (!nearest) return ghost;
      return Math.abs(ghost.x - playerX) < Math.abs(nearest.x - playerX) ? ghost : nearest;
    }, undefined);
  if (!source || source.x === playerX) return 0;
  return source.x > playerX ? -1 : 1;
}
