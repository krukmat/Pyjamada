import React from 'react';
import { Circle, Rect, RoundedRect } from '@shopify/react-native-skia';
import type { SystemicRunState } from '../systemic/SystemicState';
import { stagePx } from './StageViewport';
import { SCENE_TOKENS } from './VisualLanguage';

type StageProps = {
  state: SystemicRunState;
  size: number;
};

type HeroProps = StageProps & {
  x: number;
  groundY: number;
};

/**
 * Low-frequency, gameplay-first lighting hierarchy.
 *
 * This pass does not simulate light physically. It uses restrained value and
 * temperature shifts to preserve the old arcade principle that the player and
 * interactables must read instantly, while giving the illustrated room a
 * modern sense of depth.
 */
export function ArcadeStageAtmosphere({ state, size }: StageProps) {
  const px = (value: number) => stagePx(size, value);
  const windowOpen = state.flags.windowOpen;

  return (
    <>
      <Rect x={px(-20)} y={0} width={px(57)} height={px(128)} color="rgba(42,67,96,0.085)" />
      <Circle cx={px(46)} cy={px(65)} r={px(23)} color="rgba(255,190,103,0.075)" />
      <Circle cx={px(47)} cy={px(66)} r={px(13)} color="rgba(255,222,153,0.055)" />
      <Rect
        x={px(80)}
        y={px(8)}
        width={px(49)}
        height={px(94)}
        color={windowOpen ? "rgba(255,222,151,0.090)" : "rgba(255,222,151,0.050)"}
      />
      <RoundedRect
        x={px(86)}
        y={px(70)}
        width={px(39)}
        height={px(32)}
        r={px(7)}
        color={windowOpen ? SCENE_TOKENS.warmLightStrong : SCENE_TOKENS.warmLight}
      />
      <Rect x={px(-20)} y={px(116)} width={px(168)} height={px(12)} color="rgba(39,28,37,0.075)" />
    </>
  );
}

export function WallyFocusLight({ state, size, x, groundY }: HeroProps) {
  const px = (value: number) => stagePx(size, value);
  const rushed = state.wallyState === 'rushed';
  const startled = state.wallyState === 'startled';
  const glow = startled
    ? 'rgba(255,240,154,0.105)'
    : rushed
      ? 'rgba(255,205,112,0.090)'
      : 'rgba(255,242,199,0.072)';

  return (
    <>
      <RoundedRect
        x={px(x - 13)}
        y={px(groundY - 49)}
        width={px(26)}
        height={px(47)}
        r={px(13)}
        color={glow}
      />
      <RoundedRect
        x={px(x - 9)}
        y={px(groundY - 3)}
        width={px(18)}
        height={px(4)}
        r={px(2)}
        color="rgba(31,22,30,0.34)"
      />
    </>
  );
}
