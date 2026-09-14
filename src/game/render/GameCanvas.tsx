import React from 'react';
import { Canvas, Circle, Group, Rect, RoundedRect } from '@shopify/react-native-skia';
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
import { HauntedGhostSprite } from './HauntedGhostSprite';
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

        {hauntedSession?.threats.ghosts.map((ghost) => (
          <HauntedGhostSprite
            key={ghost.id}
            ghost={ghost}
            x={px(ghost.x)}
            y={px(ghost.y)}
            scale={scale}
            nowMs={hauntedSession.elapsedMs}
            playerX={playerX}
          />
        ))}

        <WallyFocusLight state={state} size={height} x={playerX} groundY={playerY} />
        {hauntedSession ? (
          <HauntedWallySprite
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
        <IllustratedBedroomLightOverlay state={state} size={height} />
        {fx.map((item) => (
          <IllustratedFx key={item.key} fx={item} x={px(item.x)} y={px(item.y)} scale={scale} />
        ))}
        <IllustratedBedroomForeground state={state} size={height} />
      </Group>
    </Canvas>
  );
}

function HauntedExitDoor({ px, ready, pulse }: { px: (value: number) => number; ready: boolean; pulse: number }) {
  const glowAlpha = ready ? (pulse === 0 ? 0.18 : 0.32) : 0.06;
  return (
    <>
      <RoundedRect x={px(111)} y={px(68)} width={px(15)} height={px(37)} r={px(1.5)} color={ready ? '#15365f' : '#25203d'} />
      <Rect x={px(114)} y={px(72)} width={px(9)} height={px(31)} color={ready ? '#1f6e8d' : '#352c4c'} />
      <Rect x={px(116)} y={px(75)} width={px(5)} height={px(25)} color={ready ? '#5beeff' : '#493b5c'} opacity={ready ? 0.35 : 0.18} />
      <Circle cx={px(121)} cy={px(88)} r={px(1)} color={ready ? '#ffe45c' : '#776d7c'} />
      <RoundedRect x={px(109)} y={px(102)} width={px(19)} height={px(4)} r={px(2)} color={`rgba(91,238,255,${glowAlpha})`} />
    </>
  );
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
