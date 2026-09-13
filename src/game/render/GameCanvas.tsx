import React from 'react';
import { Canvas, Circle, Group, Rect, RoundedRect } from '@shopify/react-native-skia';
import { PLAYER_GROUND_Y } from '../core/World';
import type { ActiveVisualEvent } from '../presentation/PresentationRuntime';
import { resolveFxFrames, resolveScreenShake } from '../presentation/FxSystem';
import { resolveObjectVisualFrame } from '../presentation/ObjectAnimator';
import { resolveWallyVisualFrame } from '../presentation/WallyAnimator';
import { findSystemicObject } from '../systemic/SystemicContent';
import type { SystemicObjectId, SystemicRunState } from '../systemic/SystemicState';
import { SYSTEMIC_OBJECT_IDS } from '../systemic/SystemicState';
import {
  IllustratedBedroomBackdrop,
  IllustratedBedroomForeground,
  IllustratedBedroomLightOverlay,
} from './IllustratedBedroomScene';
import { IllustratedFx } from './IllustratedFx';
import { IllustratedObject } from './IllustratedObject';
import { IllustratedWally } from './IllustratedWally';
import { stageOriginX, stagePx, stageScale } from './StageViewport';
import { SCENE_TOKENS, VISUAL_TOKENS } from './VisualLanguage';

type Props = {
  state: SystemicRunState;
  width: number;
  height: number;
  activeVisualEvents: readonly ActiveVisualEvent[];
  nowMs: number;
};

type ObjectPlacement = { x: number; y: number };

const OBJECT_PLACEMENTS: Record<SystemicObjectId, ObjectPlacement> = {
  bed: { x: 16, y: 105 },
  slippers: { x: 32, y: 105 },
  'alarm-clock': { x: 48, y: 101 },
  wardrobe: { x: 68, y: 105 },
  keys: { x: 88, y: 101 },
  window: { x: 108, y: 66 },
};

export function GameCanvas({ state, width, height, activeVisualEvents, nowMs }: Props) {
  const scale = stageScale(height);
  const px = (value: number) => stagePx(height, value);
  const originX = stageOriginX(width, height);
  const wally = resolveWallyVisualFrame(state, activeVisualEvents, nowMs);
  const objects = SYSTEMIC_OBJECT_IDS.map((objectId) => ({
    objectId,
    visual: resolveObjectVisualFrame(state, objectId, activeVisualEvents, nowMs),
    placement: OBJECT_PLACEMENTS[objectId],
  }));
  const target = findSystemicObject(state.player.x);
  const fx = resolveFxFrames(activeVisualEvents, nowMs);
  const shake = resolveScreenShake(activeVisualEvents, nowMs);

  return (
    <Canvas style={{ width, height }}>
      <Rect x={0} y={0} width={width} height={height} color={SCENE_TOKENS.skyDeep} />
      <Group transform={[{ translateX: originX + px(shake.x) }, { translateY: px(shake.y) }]}>
        <IllustratedBedroomBackdrop state={state} size={height} />
        <RoomContactShadows state={state} px={px} />
        {target && (
          <InteractionFocus
            objectId={target.id}
            placement={OBJECT_PLACEMENTS[target.id]}
            px={px}
            phase={Math.floor(nowMs / 240) % 2}
          />
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
        <Rect
          x={px(state.player.x - 8)}
          y={px(PLAYER_GROUND_Y + 1)}
          width={px(16)}
          height={px(2)}
          color={SCENE_TOKENS.contactShadow}
        />
        <IllustratedWally
          state={state}
          visual={wally}
          x={px(state.player.x)}
          y={px(PLAYER_GROUND_Y)}
          scale={scale}
          facing={state.player.facing}
        />
        <IllustratedBedroomLightOverlay state={state} size={height} />
        {fx.map((item) => (
          <IllustratedFx
            key={item.key}
            fx={item}
            x={px(item.x)}
            y={px(item.y)}
            scale={scale}
          />
        ))}
        <IllustratedBedroomForeground state={state} size={height} />
      </Group>
    </Canvas>
  );
}

function InteractionFocus({ objectId, placement, px, phase }: {
  objectId: SystemicObjectId;
  placement: ObjectPlacement;
  px: (value: number) => number;
  phase: number;
}) {
  const isWallObject = objectId === 'window';
  const radius = objectId === 'bed' ? 15 : objectId === 'wardrobe' ? 11 : 7;
  const cueY = isWallObject ? placement.y - 11 : placement.y + 1;
  const alpha = phase === 0 ? 0.15 : 0.24;

  return (
    <>
      <RoundedRect
        x={px(placement.x - radius)}
        y={px(cueY - 2)}
        width={px(radius * 2)}
        height={px(4)}
        r={px(2)}
        color={`rgba(241,215,92,${alpha})`}
      />
      <Circle
        cx={px(placement.x - radius + 1)}
        cy={px(cueY - 5 - phase)}
        r={px(1.2)}
        color={VISUAL_TOKENS.interactive.focusLight}
      />
      <Circle
        cx={px(placement.x + radius - 1)}
        cy={px(cueY - 7 + phase)}
        r={px(1)}
        color={VISUAL_TOKENS.interactive.focus}
      />
    </>
  );
}

function RoomContactShadows({ state, px }: { state: SystemicRunState; px: (value: number) => number }) {
  return (
    <>
      <Rect x={px(2)} y={px(103)} width={px(29)} height={px(3)} color={SCENE_TOKENS.contactShadow} />
      <Rect x={px(55)} y={px(103)} width={px(27)} height={px(3)} color={SCENE_TOKENS.contactShadow} />
      {!state.equipped.includes('slippers') && <Rect x={px(27)} y={px(103)} width={px(10)} height={px(2)} color={SCENE_TOKENS.contactShadow} />}
      {!state.collected.includes('keys') && <Rect x={px(84)} y={px(102)} width={px(9)} height={px(2)} color={SCENE_TOKENS.contactShadow} />}
    </>
  );
}
