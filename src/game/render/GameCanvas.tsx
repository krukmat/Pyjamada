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

        {hauntedSession?.threats.ghosts.map((ghost) => (
          <HauntedGhostSprite
            key={ghost.id}
            image={hauntedGhostImage}
            ghost={ghost}
            x={px(ghost.x)}
            y={px(ghost.y)}
            scale={scale}
            nowMs={hauntedSession.elapsedMs}
            playerX={playerX}
          />
        ))}

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
          <HauntedHitBurst
            x={px(playerX)}
            y={px(playerY - 23)}
            px={px}
            pulse={Math.floor(nowMs / 90) % 2}
          />
        )}
      </Group>
    </Canvas>
  );
}

function HauntedStageTreatment({ px, pressure }: { px: (value: number) => number; pressure: number }) {
  const washAlpha = pressure > 0 ? 0.19 : 0.135;
  const edgeAlpha = pressure > 0 ? 0.13 : 0.09;
  return (
    <>
      <Rect x={px(-20)} y={0} width={px(168)} height={px(128)} color={`rgba(15,27,69,${washAlpha})`} />
      <Rect x={px(-20)} y={0} width={px(34)} height={px(128)} color={`rgba(12,18,45,${edgeAlpha})`} />
      <Rect x={px(116)} y={0} width={px(32)} height={px(128)} color={`rgba(18,18,50,${edgeAlpha})`} />
      <Rect x={px(-20)} y={px(91)} width={px(168)} height={px(37)} color="rgba(9,15,39,0.14)" />
      <Circle cx={px(108)} cy={px(55)} r={px(33)} color="rgba(91,238,255,0.075)" />
      <Circle cx={px(108)} cy={px(55)} r={px(20)} color="rgba(155,222,255,0.040)" />
      <RoundedRect x={px(87)} y={px(101)} width={px(40)} height={px(4)} r={px(2)} color="rgba(91,238,255,0.075)" />
    </>
  );
}

function HauntedPlayerReadability({ x, y, px }: { x: number; y: number; px: (value: number) => number }) {
  return (
    <>
      <Circle cx={x} cy={y - px(23)} r={px(16)} color="rgba(7,16,38,0.18)" />
      <Circle cx={x} cy={y - px(23)} r={px(13)} color="rgba(255,228,92,0.035)" />
      <RoundedRect x={x - px(9)} y={y - px(2)} width={px(18)} height={px(4)} r={px(2)} color="rgba(5,12,29,0.42)" />
      <RoundedRect x={x - px(6)} y={y - px(1)} width={px(12)} height={px(2)} r={px(1)} color="rgba(91,238,255,0.10)" />
    </>
  );
}

function HauntedHitBurst({ x, y, px, pulse }: { x: number; y: number; px: (value: number) => number; pulse: number }) {
  const reach = pulse === 0 ? 8 : 10;
  return (
    <>
      <Circle cx={x} cy={y} r={px(pulse === 0 ? 7 : 9)} color="rgba(255,228,92,0.10)" />
      <Rect x={x - px(reach)} y={y - px(1)} width={px(4)} height={px(2)} color="#ffe45c" />
      <Rect x={x + px(reach - 4)} y={y - px(1)} width={px(4)} height={px(2)} color="#5beeff" />
      <Rect x={x - px(1)} y={y - px(reach)} width={px(2)} height={px(4)} color="#ff7b82" />
      <Rect x={x - px(1)} y={y + px(reach - 4)} width={px(2)} height={px(4)} color="#fff4b0" />
      <Rect x={x - px(6)} y={y - px(7)} width={px(2)} height={px(2)} color="#fff4b0" />
      <Rect x={x + px(5)} y={y + px(5)} width={px(2)} height={px(2)} color="#5beeff" />
    </>
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
