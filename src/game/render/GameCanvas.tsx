import React from 'react';
import { Canvas, Circle, Group, Rect, RoundedRect, type SkImage } from '@shopify/react-native-skia';
import { PLAYER_GROUND_Y } from '../core/World';
import type { DreamSparkProjectile } from '../haunted/HauntedCombat';
import type { HauntedSessionState } from '../haunted/HauntedSessionRuntime';
import type { ActiveVisualEvent } from '../presentation/PresentationRuntime';
import { resolveFxFrames, resolveScreenShake } from '../presentation/FxSystem';
import { resolveObjectVisualFrame } from '../presentation/ObjectAnimator';
import { resolveWallyVisualFrame } from '../presentation/WallyAnimator';
import { findSystemicObject } from '../systemic/SystemicContent';
import type { SystemicObjectId, SystemicRunState } from '../systemic/SystemicState';
import { SYSTEMIC_OBJECT_IDS } from '../systemic/SystemicState';
import { ArcadeStageAtmosphere, WallyFocusLight } from './ArcadeStageLighting';
import { HauntedEnemyLayer } from './HauntedEnemyLayer';
import {
  HauntedExitDoor,
  HauntedHitFeedback,
  HauntedPlayerReadability,
  HauntedStageTreatment,
} from './HauntedStagePresentation';
import { HauntedWallySprite } from './HauntedWallySprite';
import {
  IllustratedBedroomBackdrop,
  IllustratedBedroomForeground,
  IllustratedBedroomLightOverlay,
} from './IllustratedBedroomScene';
import { IllustratedFx } from './IllustratedFx';
import { IllustratedObject } from './IllustratedObject';
import { IllustratedWally } from './IllustratedWally';
import { PixelDreamSpark } from './PixelDreamSpark';
import { stageCameraOffsetPx, stageOriginX, stagePx, stageScale } from './StageViewport';
import { SCENE_TOKENS, VISUAL_TOKENS } from './VisualLanguage';

type Props = {
  state: SystemicRunState;
  width: number;
  height: number;
  activeVisualEvents: readonly ActiveVisualEvent[];
  nowMs: number;
  playerRenderPosition?: { x: number; y: number; facing: 'left' | 'right' };
  dreamSparks?: readonly DreamSparkProjectile[];
  hauntedSession?: HauntedSessionState;
  hauntedWallyImage?: SkImage | null;
  hauntedGhostImage?: SkImage | null;
};

type ObjectPlacement = { x: number; y: number };

const OBJECT_PLACEMENTS: Record<SystemicObjectId, ObjectPlacement> = {
  bed: { x: 16, y: 105 },
  slippers: { x: 32, y: 105 },
  'alarm-clock': { x: 48, y: 78 },
  wardrobe: { x: 68, y: 105 },
  keys: { x: 88, y: 66 },
  window: { x: 108, y: 66 },
};

export function GameCanvas({
  state,
  width,
  height,
  activeVisualEvents,
  nowMs,
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
  const objects = SYSTEMIC_OBJECT_IDS.map((objectId) => ({
    objectId,
    visual: resolveObjectVisualFrame(state, objectId, activeVisualEvents, nowMs),
    placement: OBJECT_PLACEMENTS[objectId],
  }));
  const target = findSystemicObject(playerX);
  const fx = resolveFxFrames(activeVisualEvents, nowMs);
  const shake = resolveScreenShake(activeVisualEvents, nowMs);
  const playerInvulnerable = Boolean(hauntedSession && hauntedSession.combat.invulnerableUntilMs > hauntedSession.elapsedMs);
  const hitDirection = resolveHauntedHitDirection(hauntedSession, playerX, playerInvulnerable);

  return (
    <Canvas style={{ width, height }}>
      <Rect x={0} y={0} width={width} height={height} color={SCENE_TOKENS.skyDeep} />
      <Group transform={[{ translateX: originX + cameraX + px(shake.x) }, { translateY: px(shake.y) }]}>
        <IllustratedBedroomBackdrop state={state} size={height} />
        <ArcadeStageAtmosphere state={state} size={height} />
        <RoomContactShadows state={state} px={px} />
        {hauntedSession && (
          <HauntedExitDoor
            px={px}
            ready={hauntedSession.objective.phase === 'escape-ready' || hauntedSession.objective.phase === 'completed'}
            pulse={Math.floor(nowMs / 140) % 2}
          />
        )}
        {target && (
          <InteractionFocus objectId={target.id} placement={OBJECT_PLACEMENTS[target.id]} px={px} phase={Math.floor(nowMs / 240) % 2} />
        )}
        {objects.map(({ objectId, visual, placement }) => (
          <IllustratedObject
            key={objectId}
            objectId={objectId}
            visual={visual}
            x={px(placement.x)}
            y={px(placement.y)}
            scale={scale}
          />
        ))}

        <WallyFocusLight state={state} size={height} x={playerX} groundY={playerY} />
        <IllustratedBedroomLightOverlay state={state} size={height} />
        <IllustratedBedroomForeground state={state} size={height} />

        {hauntedSession && (
          <>
            <HauntedStageTreatment px={px} pressure={hauntedSession.threats.ghosts.length} />
            <HauntedPlayerReadability x={px(playerX)} y={px(playerY)} px={px} />
          </>
        )}

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

function InteractionFocus({ objectId, placement, px, phase }: {
  objectId: SystemicObjectId;
  placement: ObjectPlacement;
  px: (value: number) => number;
  phase: number;
}) {
  const elevated = objectId === 'window' || objectId === 'keys' || objectId === 'alarm-clock';
  const radius = objectId === 'bed' ? 16 : objectId === 'wardrobe' ? 14 : objectId === 'alarm-clock' || objectId === 'keys' ? 9 : 8;
  const cueY = elevated ? placement.y - (objectId === 'alarm-clock' ? 8 : 11) : placement.y + 1;
  const alpha = phase === 0 ? 0.13 : 0.21;

  return (
    <>
      <RoundedRect x={px(placement.x - radius)} y={px(cueY - 2)} width={px(radius * 2)} height={px(4)} r={px(2)} color={`rgba(241,215,92,${alpha})`} />
      <Circle cx={px(placement.x - radius + 1)} cy={px(cueY - 5 - phase)} r={px(1.2)} color={VISUAL_TOKENS.interactive.focusLight} />
      <Circle cx={px(placement.x + radius - 1)} cy={px(cueY - 7 + phase)} r={px(1)} color={VISUAL_TOKENS.interactive.focus} />
    </>
  );
}

function RoomContactShadows({ state, px }: { state: SystemicRunState; px: (value: number) => number }) {
  return (
    <>
      <RoundedRect x={px(2)} y={px(102)} width={px(30)} height={px(4)} r={px(2)} color={SCENE_TOKENS.contactShadow} />
      <RoundedRect x={px(53)} y={px(102)} width={px(31)} height={px(4)} r={px(2)} color={SCENE_TOKENS.contactShadow} />
      {!state.equipped.includes('slippers') && <RoundedRect x={px(26)} y={px(102)} width={px(12)} height={px(3)} r={px(1.5)} color={SCENE_TOKENS.contactShadow} />}
    </>
  );
}
