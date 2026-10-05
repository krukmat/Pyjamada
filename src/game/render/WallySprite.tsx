import React from 'react';
import type { SkImage } from '@shopify/react-native-skia';
import { AtlasSprite } from '../presentation/atlas/AtlasSprite';
import type { WallyVisualFrame } from '../presentation/WallyAnimator';
import type { SystemicRunState } from '../systemic/SystemicState';
import { IllustratedWally } from './IllustratedWally';

/**
 * Phase 1 / step 4 of docs/ARCADE_PIXEL_ART_DIRECTION.md — draws the bedroom
 * Wally from the generated pixel atlas instead of Skia primitives.
 *
 * Before this, `assets/game/wally/wally.png` was generated, validated and
 * never sampled: `GameCanvas` resolved the correct clip and frame through
 * `WallyAnimator` and then handed that data to `IllustratedWally`, which posed
 * `Circle`/`Rect`/`RoundedRect` primitives. The atlas existed but nothing drew
 * it, so redrawing the sprite could not change what the screen showed.
 *
 * The animator keeps owning clip identity and timing; `WallyVisualFrame`
 * already carries the resolved `AtlasFrame`, so this component only chooses
 * between the atlas and the primitive fallback. Rule IDs still terminate at
 * `VisualEventMapper` — nothing here reads gameplay rules.
 *
 * `IllustratedWally` remains the fallback for the frames before the atlas
 * image has decoded, so Wally never disappears while the texture loads.
 */

type Props = {
  image: SkImage | null;
  state: SystemicRunState;
  visual: WallyVisualFrame;
  x: number;
  y: number;
  scale: number;
  facing: 'left' | 'right';
};

export function WallySprite({ image, state, visual, x, y, scale, facing }: Props) {
  if (!image) {
    return <IllustratedWally state={state} visual={visual} x={x} y={y} scale={scale} facing={facing} />;
  }

  return <AtlasSprite image={image} frame={visual.frame} x={x} y={y} scale={scale} facing={facing} />;
}
