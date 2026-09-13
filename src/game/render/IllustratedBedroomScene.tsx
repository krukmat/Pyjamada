import React from 'react';
import { Group, Rect } from '@shopify/react-native-skia';
import type { SystemicRunState } from '../systemic/SystemicState';
import { stageParallaxPx, stagePx } from './StageViewport';
import { SCENE_TOKENS } from './VisualLanguage';

type Props = {
  state: SystemicRunState;
  size: number;
};

export function IllustratedBedroomScene({ state, size }: Props) {
  const px = (value: number) => stagePx(size, value);
  const far = stageParallaxPx(size, state.player.x, -2.5);
  const distant = stageParallaxPx(size, state.player.x, -1.5);
  const room = stageParallaxPx(size, state.player.x, -0.35);
  const foreground = stageParallaxPx(size, state.player.x, 1.25);

  return (
    <>
      <Rect x={0} y={0} width={px(128)} height={px(128)} color={SCENE_TOKENS.skyDeep} />
      <Group transform={[{ translateX: far }]}>
        <Rect x={px(-10)} y={0} width={px(148)} height={px(46)} color={SCENE_TOKENS.sky} />
        <Rect x={px(-10)} y={px(29)} width={px(148)} height={px(17)} color={SCENE_TOKENS.skyLight} />
        <Rect x={px(4)} y={px(14)} width={px(30)} height={px(4)} color="rgba(246,240,218,0.24)" />
        <Rect x={px(92)} y={px(18)} width={px(27)} height={px(4)} color="rgba(246,240,218,0.20)" />
      </Group>
      <Group transform={[{ translateX: distant }]}>
        <Rect x={px(-8)} y={px(38)} width={px(144)} height={px(18)} color={SCENE_TOKENS.distantDeep} />
        <Rect x={px(4)} y={px(32)} width={px(18)} height={px(24)} color={SCENE_TOKENS.distant} />
        <Rect x={px(32)} y={px(35)} width={px(28)} height={px(21)} color={SCENE_TOKENS.distantLight} />
        <Rect x={px(74)} y={px(30)} width={px(15)} height={px(26)} color={SCENE_TOKENS.distant} />
        <Rect x={px(98)} y={px(34)} width={px(31)} height={px(22)} color={SCENE_TOKENS.distantLight} />
      </Group>
      <Group transform={[{ translateX: room }]}>
        <Rect x={px(2)} y={px(4)} width={px(124)} height={px(95)} color={SCENE_TOKENS.wallShadow} />
        <Rect x={px(5)} y={px(7)} width={px(118)} height={px(86)} color={SCENE_TOKENS.wall} />
        <Rect x={px(6)} y={px(9)} width={px(116)} height={px(28)} color={SCENE_TOKENS.wallWarm} />
        <Rect x={px(6)} y={px(74)} width={px(116)} height={px(18)} color={SCENE_TOKENS.plasterLight} />
        <Rect x={px(6)} y={px(88)} width={px(116)} height={px(4)} color={SCENE_TOKENS.trimDark} />
        <Rect x={px(9)} y={px(15)} width={px(25)} height={px(20)} color={SCENE_TOKENS.trimDark} />
        <Rect x={px(11)} y={px(17)} width={px(21)} height={px(16)} color={SCENE_TOKENS.horizon} />
        <Rect x={px(84)} y={px(11)} width={px(36)} height={px(58)} color={SCENE_TOKENS.trimDark} />
        <Rect x={px(88)} y={px(15)} width={px(28)} height={px(49)} color={SCENE_TOKENS.sky} />
        <Rect x={px(88)} y={px(39)} width={px(28)} height={px(25)} color={SCENE_TOKENS.skyLight} />
        <Rect x={px(79)} y={px(10)} width={px(7)} height={px(62)} color={SCENE_TOKENS.curtainDeep} />
        <Rect x={px(118)} y={px(10)} width={px(6)} height={px(62)} color={SCENE_TOKENS.curtain} />
        <Rect x={px(87)} y={px(64)} width={px(34)} height={px(30)} color={state.flags.windowOpen ? 'rgba(255,226,157,0.20)' : SCENE_TOKENS.windowGlow} />
      </Group>
      <Rect x={0} y={px(92)} width={px(128)} height={px(36)} color={SCENE_TOKENS.floorDeep} />
      <Rect x={0} y={px(97)} width={px(128)} height={px(31)} color={SCENE_TOKENS.floor} />
      <Rect x={px(37)} y={px(108)} width={px(48)} height={px(15)} color={SCENE_TOKENS.rugDeep} />
      <Rect x={px(41)} y={px(110)} width={px(40)} height={px(11)} color={SCENE_TOKENS.rug} />
      <Rect x={0} y={px(92)} width={px(128)} height={px(36)} color={SCENE_TOKENS.coolShade} />
      <Group transform={[{ translateX: foreground }]}>
        <Rect x={px(-5)} y={px(70)} width={px(10)} height={px(58)} color={SCENE_TOKENS.foreground} />
        <Rect x={px(123)} y={px(83)} width={px(10)} height={px(45)} color={SCENE_TOKENS.foreground} />
      </Group>
    </>
  );
}
