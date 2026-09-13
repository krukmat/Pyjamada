import React from 'react';
import { Canvas, Group, Rect, useImage } from '@shopify/react-native-skia';
import { PLAYER_GROUND_Y } from '../core/World';
import type { ActiveVisualEvent } from '../presentation/PresentationRuntime';
import { BEDROOM_OBJECTS_ATLAS_SOURCE, DOMESTIC_FX_ATLAS_SOURCE, WALLY_ATLAS_SOURCE } from '../presentation/AssetSources';
import { resolveFxFrames, resolveScreenShake } from '../presentation/FxSystem';
import { resolveObjectVisualFrame } from '../presentation/ObjectAnimator';
import { resolveWallyVisualFrame } from '../presentation/WallyAnimator';
import { AtlasSprite } from '../presentation/atlas/AtlasSprite';
import type { SystemicObjectId, SystemicRunState } from '../systemic/SystemicState';
import { SYSTEMIC_OBJECT_IDS } from '../systemic/SystemicState';
import { IllustratedBedroomScene } from './IllustratedBedroomScene';
import { stagePx, stageScale } from './StageViewport';
import { SCENE_TOKENS } from './VisualLanguage';

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
  const scale = stageScale(size);
  const px = (value: number) => stagePx(size, value);
  const wallyImage = useImage(WALLY_ATLAS_SOURCE);
  const objectImage = useImage(BEDROOM_OBJECTS_ATLAS_SOURCE);
  const fxImage = useImage(DOMESTIC_FX_ATLAS_SOURCE);
  const wally = resolveWallyVisualFrame(state, activeVisualEvents, nowMs);
  const objects = SYSTEMIC_OBJECT_IDS.map((objectId) => ({
    objectId,
    visual: resolveObjectVisualFrame(state, objectId, activeVisualEvents, nowMs),
    placement: OBJECT_PLACEMENTS[objectId],
  }));
  const fx = resolveFxFrames(activeVisualEvents, nowMs);
  const shake = resolveScreenShake(activeVisualEvents, nowMs);

  return (
    <Canvas style={{ width: size, height: size }}>
      <Group transform={[{ translateX: px(shake.x) }, { translateY: px(shake.y) }]}>
        <IllustratedBedroomScene state={state} size={size} />
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
        <Rect
          x={px(state.player.x - 8)}
          y={px(PLAYER_GROUND_Y + 1)}
          width={px(16)}
          height={px(2)}
          color={SCENE_TOKENS.contactShadow}
        />
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
      </Group>
    </Canvas>
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
