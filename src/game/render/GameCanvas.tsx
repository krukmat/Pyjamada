import React from 'react';
import { Canvas, Group, Rect, useImage } from '@shopify/react-native-skia';
import { LOGICAL_SIZE, PLAYER_GROUND_Y } from '../core/World';
import type { ActiveVisualEvent } from '../presentation/PresentationRuntime';
import { BEDROOM_OBJECTS_ATLAS_SOURCE, DOMESTIC_FX_ATLAS_SOURCE, WALLY_ATLAS_SOURCE } from '../presentation/AssetSources';
import { resolveFxFrames, resolveScreenShake } from '../presentation/FxSystem';
import { resolveObjectVisualFrame } from '../presentation/ObjectAnimator';
import { resolveWallyVisualFrame } from '../presentation/WallyAnimator';
import { AtlasSprite } from '../presentation/atlas/AtlasSprite';
import type { SystemicObjectId, SystemicRunState } from '../systemic/SystemicState';
import { SYSTEMIC_OBJECT_IDS } from '../systemic/SystemicState';
import { VISUAL_TOKENS } from './VisualLanguage';

type Props = {
  state: SystemicRunState;
  size: number;
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

export function GameCanvas({ state, size, activeVisualEvents, nowMs }: Props) {
  const scale = size / LOGICAL_SIZE;
  const px = (value: number) => Math.round(value * scale);
  const wallyImage = useImage(WALLY_ATLAS_SOURCE);
  const objectImage = useImage(BEDROOM_OBJECTS_ATLAS_SOURCE);
  const fxImage = useImage(DOMESTIC_FX_ATLAS_SOURCE);
  const wally = resolveWallyVisualFrame(state, activeVisualEvents, nowMs);
  const objects = SYSTEMIC_OBJECT_IDS.map((objectId) => ({
    objectId,
    visual: resolveObjectVisualFrame(state, objectId, activeVisualEvents, nowMs),
    placement: OBJECT_PLACEMENTS[objectId],
  }));
  const fx = resolveFxFrames(state, activeVisualEvents, nowMs);
  const shake = resolveScreenShake(activeVisualEvents, nowMs);

  return (
    <Canvas style={{ width: size, height: size }}>
      <Group transform={[{ translateX: px(shake.x) }, { translateY: px(shake.y) }]}>
        <BedroomEnvironment state={state} px={px} />
        <RoomContactShadows state={state} px={px} />
        {objects.map(({ objectId, visual, placement }) => (
          <AtlasSprite
            key={objectId}
            image={objectImage}
            frame={visual.frame}
            x={px(placement.x)}
            y={px(placement.y)}
            scale={scale}
          />
        ))}
        <Rect x={px(state.player.x - 8)} y={px(PLAYER_GROUND_Y + 1)} width={px(16)} height={px(2)} color="rgba(5,5,9,0.48)" />
        <AtlasSprite
          image={wallyImage}
          frame={wally.frame}
          x={px(state.player.x)}
          y={px(PLAYER_GROUND_Y)}
          scale={scale}
          facing={state.player.facing}
        />
        {fx.map((item) => (
          <AtlasSprite key={item.key} image={fxImage} frame={item.frame} x={px(item.x)} y={px(item.y)} scale={scale} />
        ))}
        <ForegroundVignette px={px} />
      </Group>
    </Canvas>
  );
}

function BedroomEnvironment({ state, px }: { state: SystemicRunState; px: (value: number) => number }) {
  const windowGlow = state.flags.windowOpen ? VISUAL_TOKENS.feedback.quietDark : VISUAL_TOKENS.environment.floorDeep;
  return (
    <>
      <Rect x={0} y={0} width={px(128)} height={px(128)} color={VISUAL_TOKENS.environment.void} />
      <Rect x={px(3)} y={px(5)} width={px(122)} height={px(91)} color={VISUAL_TOKENS.environment.wallDeep} />
      <Rect x={px(5)} y={px(7)} width={px(118)} height={px(87)} color={VISUAL_TOKENS.environment.wall} />
      <Rect x={px(5)} y={px(80)} width={px(118)} height={px(14)} color={VISUAL_TOKENS.environment.wallLight} />
      <Rect x={0} y={px(94)} width={px(128)} height={px(34)} color={VISUAL_TOKENS.environment.floorDeep} />
      <Rect x={0} y={px(99)} width={px(128)} height={px(29)} color={VISUAL_TOKENS.environment.floor} />
      <Rect x={0} y={px(99)} width={px(128)} height={px(2)} color={VISUAL_TOKENS.environment.floorLight} />
      <Rect x={px(84)} y={px(18)} width={px(34)} height={px(3)} color={VISUAL_TOKENS.environment.wallDeep} />
      <Rect x={px(88)} y={px(22)} width={px(26)} height={px(2)} color={VISUAL_TOKENS.environment.wallLight} />
      <Rect x={px(90)} y={px(28)} width={px(4)} height={px(4)} color={VISUAL_TOKENS.interactive.shadow} />
      <Rect x={px(98)} y={px(28)} width={px(7)} height={px(4)} color={VISUAL_TOKENS.environment.floorLight} />
      <Rect x={px(8)} y={px(18)} width={px(22)} height={px(18)} color={VISUAL_TOKENS.environment.wallDeep} />
      <Rect x={px(10)} y={px(20)} width={px(18)} height={px(14)} color={VISUAL_TOKENS.environment.floorDeep} />
      <Rect x={px(13)} y={px(23)} width={px(12)} height={px(2)} color={VISUAL_TOKENS.environment.moon} />
      <Rect x={px(16)} y={px(27)} width={px(6)} height={px(4)} color={VISUAL_TOKENS.interactive.shadow} />
      <Rect x={px(94)} y={px(68)} width={px(29)} height={px(2)} color={windowGlow} />
      <Rect x={px(96)} y={px(70)} width={px(24)} height={px(10)} color={state.flags.windowOpen ? 'rgba(85,182,106,0.10)' : 'rgba(52,81,143,0.08)'} />
      <Rect x={px(42)} y={px(109)} width={px(36)} height={px(12)} color={VISUAL_TOKENS.environment.floorDeep} />
      <Rect x={px(46)} y={px(111)} width={px(28)} height={px(8)} color={VISUAL_TOKENS.environment.wallDeep} />
      <Rect x={px(50)} y={px(113)} width={px(20)} height={px(4)} color={VISUAL_TOKENS.environment.floorLight} />
    </>
  );
}

function RoomContactShadows({ state, px }: { state: SystemicRunState; px: (value: number) => number }) {
  return (
    <>
      <Rect x={px(2)} y={px(103)} width={px(29)} height={px(3)} color="rgba(5,5,9,0.38)" />
      <Rect x={px(55)} y={px(103)} width={px(27)} height={px(3)} color="rgba(5,5,9,0.42)" />
      {!state.equipped.includes('slippers') && <Rect x={px(27)} y={px(103)} width={px(10)} height={px(2)} color="rgba(5,5,9,0.36)" />}
      {!state.collected.includes('keys') && <Rect x={px(84)} y={px(102)} width={px(9)} height={px(2)} color="rgba(5,5,9,0.34)" />}
    </>
  );
}

function ForegroundVignette({ px }: { px: (value: number) => number }) {
  return (
    <>
      <Rect x={0} y={0} width={px(3)} height={px(128)} color="rgba(5,5,9,0.68)" />
      <Rect x={px(125)} y={0} width={px(3)} height={px(128)} color="rgba(5,5,9,0.68)" />
      <Rect x={0} y={px(125)} width={px(128)} height={px(3)} color="rgba(5,5,9,0.72)" />
    </>
  );
}
