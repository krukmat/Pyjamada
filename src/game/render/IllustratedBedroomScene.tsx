import React from 'react';
import { Circle, Group, Rect, RoundedRect } from '@shopify/react-native-skia';
import type { SystemicRunState } from '../systemic/SystemicState';
import {
  STAGE_LOGICAL_WIDTH,
  STAGE_SIDE_MARGIN,
  stageParallaxPx,
  stagePx,
} from './StageViewport';
import { SCENE_TOKENS } from './VisualLanguage';

type Props = {
  state: SystemicRunState;
  size: number;
};

type LayerProps = Props & {
  px: (value: number) => number;
};

export function IllustratedBedroomBackdrop({ state, size }: Props) {
  const px = (value: number) => stagePx(size, value);
  const far = stageParallaxPx(size, state.player.x, -2.5);
  const distant = stageParallaxPx(size, state.player.x, -1.45);
  const room = stageParallaxPx(size, state.player.x, -0.3);

  return (
    <>
      <MorningSky px={px} offset={far} />
      <DistantNeighbourhood px={px} offset={distant} />
      <RoomShell state={state} size={size} px={px} offset={room} />
      <FloorAndRug px={px} />
      <BedroomDressing state={state} size={size} px={px} />
      <Rect
        x={px(-STAGE_SIDE_MARGIN)}
        y={px(92)}
        width={px(STAGE_LOGICAL_WIDTH)}
        height={px(36)}
        color={SCENE_TOKENS.coolShade}
      />
    </>
  );
}

export function IllustratedBedroomLightOverlay({ state, size }: Props) {
  const px = (value: number) => stagePx(size, value);
  const open = state.flags.windowOpen;

  return (
    <>
      <Rect
        x={px(85)}
        y={px(57)}
        width={px(37)}
        height={px(40)}
        color={open ? SCENE_TOKENS.windowGlowStrong : SCENE_TOKENS.windowGlow}
      />
      <Rect
        x={px(77)}
        y={px(82)}
        width={px(48)}
        height={px(22)}
        color={open ? SCENE_TOKENS.warmLightStrong : SCENE_TOKENS.warmLight}
      />
      <Rect x={px(-14)} y={px(8)} width={px(156)} height={px(15)} color="rgba(255,239,194,0.035)" />
    </>
  );
}

export function IllustratedBedroomForeground({ state, size }: Props) {
  const px = (value: number) => stagePx(size, value);
  const foreground = stageParallaxPx(size, state.player.x, 1.35);

  return (
    <Group transform={[{ translateX: foreground }]}>
      <Rect x={px(-20)} y={px(62)} width={px(8)} height={px(66)} color={SCENE_TOKENS.foreground} />
      <Rect x={px(-16)} y={px(69)} width={px(5)} height={px(59)} color={SCENE_TOKENS.foregroundMid} />
      <Circle cx={px(-9)} cy={px(85)} r={px(10)} color={SCENE_TOKENS.foliageDeep} />
      <Circle cx={px(-7)} cy={px(76)} r={px(6)} color={SCENE_TOKENS.foliage} />
      <Circle cx={px(-2)} cy={px(89)} r={px(6)} color={SCENE_TOKENS.foliageLight} />
      <Rect x={px(143)} y={px(76)} width={px(8)} height={px(52)} color={SCENE_TOKENS.foreground} />
      <Rect x={px(143)} y={px(83)} width={px(5)} height={px(45)} color={SCENE_TOKENS.foregroundLight} />
      <Circle cx={px(140)} cy={px(88)} r={px(8)} color={SCENE_TOKENS.foliageDeep} />
      <Rect
        x={px(-STAGE_SIDE_MARGIN)}
        y={px(124)}
        width={px(STAGE_LOGICAL_WIDTH)}
        height={px(4)}
        color="rgba(35,25,34,0.42)"
      />
    </Group>
  );
}

function MorningSky({ px, offset }: { px: (value: number) => number; offset: number }) {
  const left = -STAGE_SIDE_MARGIN - 10;
  const width = STAGE_LOGICAL_WIDTH + 20;
  return (
    <Group transform={[{ translateX: offset }]}>
      <Rect x={px(left)} y={0} width={px(width)} height={px(58)} color={SCENE_TOKENS.skyDeep} />
      <Rect x={px(left)} y={px(8)} width={px(width)} height={px(50)} color={SCENE_TOKENS.sky} />
      <Rect x={px(left)} y={px(30)} width={px(width)} height={px(28)} color={SCENE_TOKENS.skyLight} />
      <Circle cx={px(108)} cy={px(23)} r={px(8)} color={SCENE_TOKENS.sunrise} />
      <RoundedRect x={px(-14)} y={px(20)} width={px(25)} height={px(5)} r={px(2.5)} color="rgba(244,234,209,0.68)" />
      <RoundedRect x={px(6)} y={px(16)} width={px(29)} height={px(5)} r={px(2.5)} color={SCENE_TOKENS.cloudShade} />
      <RoundedRect x={px(10)} y={px(14)} width={px(21)} height={px(5)} r={px(2.5)} color={SCENE_TOKENS.cloud} />
      <RoundedRect x={px(65)} y={px(22)} width={px(25)} height={px(4)} r={px(2)} color="rgba(244,234,209,0.72)" />
      <RoundedRect x={px(132)} y={px(15)} width={px(22)} height={px(5)} r={px(2.5)} color="rgba(244,234,209,0.56)" />
    </Group>
  );
}

function DistantNeighbourhood({ px, offset }: { px: (value: number) => number; offset: number }) {
  return (
    <Group transform={[{ translateX: offset }]}>
      <Rect x={px(-28)} y={px(46)} width={px(184)} height={px(14)} color={SCENE_TOKENS.distantDeep} />
      <Rect x={px(-18)} y={px(40)} width={px(20)} height={px(20)} color={SCENE_TOKENS.distantLight} />
      <Rect x={px(-4)} y={px(41)} width={px(24)} height={px(19)} color={SCENE_TOKENS.distant} />
      <Rect x={px(23)} y={px(38)} width={px(28)} height={px(22)} color={SCENE_TOKENS.distantLight} />
      <Rect x={px(55)} y={px(43)} width={px(20)} height={px(17)} color={SCENE_TOKENS.distant} />
      <Rect x={px(79)} y={px(36)} width={px(22)} height={px(24)} color={SCENE_TOKENS.distantLight} />
      <Rect x={px(105)} y={px(40)} width={px(31)} height={px(20)} color={SCENE_TOKENS.distant} />
      <Rect x={px(139)} y={px(37)} width={px(21)} height={px(23)} color={SCENE_TOKENS.distantLight} />
      <Rect x={px(-15)} y={px(36)} width={px(14)} height={px(6)} color={SCENE_TOKENS.roof} />
      <Rect x={px(-1)} y={px(38)} width={px(18)} height={px(5)} color={SCENE_TOKENS.roofDeep} />
      <Rect x={px(26)} y={px(34)} width={px(21)} height={px(6)} color={SCENE_TOKENS.roof} />
      <Rect x={px(82)} y={px(32)} width={px(16)} height={px(6)} color={SCENE_TOKENS.roof} />
      <Rect x={px(142)} y={px(33)} width={px(15)} height={px(6)} color={SCENE_TOKENS.roofDeep} />
      <Circle cx={px(13)} cy={px(49)} r={px(8)} color={SCENE_TOKENS.foliageDeep} />
      <Circle cx={px(18)} cy={px(47)} r={px(7)} color={SCENE_TOKENS.foliage} />
      <Circle cx={px(113)} cy={px(49)} r={px(9)} color={SCENE_TOKENS.foliageDeep} />
      <Circle cx={px(120)} cy={px(47)} r={px(7)} color={SCENE_TOKENS.foliage} />
      <Circle cx={px(150)} cy={px(50)} r={px(9)} color={SCENE_TOKENS.foliageDeep} />
    </Group>
  );
}

function RoomShell({ state, px, offset }: LayerProps & { offset: number }) {
  return (
    <Group transform={[{ translateX: offset }]}>
      <Rect x={px(-20)} y={px(4)} width={px(168)} height={px(95)} color={SCENE_TOKENS.wallShadow} />
      <Rect x={px(-17)} y={px(7)} width={px(162)} height={px(86)} color={SCENE_TOKENS.wall} />
      <Rect x={px(-16)} y={px(9)} width={px(160)} height={px(27)} color={SCENE_TOKENS.wallWarm} />
      <Rect x={px(-16)} y={px(36)} width={px(160)} height={px(38)} color="#d49a79" />
      <Rect x={px(-16)} y={px(73)} width={px(160)} height={px(18)} color={SCENE_TOKENS.plasterLight} />
      <Rect x={px(-16)} y={px(73)} width={px(160)} height={px(2)} color={SCENE_TOKENS.plasterHighlight} />
      <Rect x={px(-16)} y={px(89)} width={px(160)} height={px(4)} color={SCENE_TOKENS.trimDark} />
      <Rect x={px(-15)} y={px(91)} width={px(158)} height={px(2)} color={SCENE_TOKENS.trim} />

      <Rect x={px(-14)} y={px(18)} width={px(7)} height={px(71)} color={SCENE_TOKENS.trimDark} />
      <Rect x={px(-11)} y={px(22)} width={px(4)} height={px(63)} color={SCENE_TOKENS.trim} />
      <RoundedRect x={px(133)} y={px(20)} width={px(8)} height={px(18)} r={px(3)} color={SCENE_TOKENS.trimDark} />
      <Rect x={px(136)} y={px(38)} width={px(2)} height={px(38)} color={SCENE_TOKENS.trim} />

      <Rect x={px(8)} y={px(14)} width={px(27)} height={px(22)} color={SCENE_TOKENS.trimDark} />
      <Rect x={px(10)} y={px(16)} width={px(23)} height={px(18)} color={SCENE_TOKENS.horizon} />
      <Rect x={px(12)} y={px(18)} width={px(19)} height={px(11)} color={SCENE_TOKENS.skyLight} />
      <Circle cx={px(27)} cy={px(21)} r={px(3)} color={SCENE_TOKENS.sunrise} />
      <Rect x={px(13)} y={px(28)} width={px(17)} height={px(4)} color={SCENE_TOKENS.foliageDeep} />

      <Window state={state} px={px} />
    </Group>
  );
}

function Window({ state, px }: { state: SystemicRunState; px: (value: number) => number }) {
  const glow = state.flags.windowOpen ? SCENE_TOKENS.windowGlowStrong : SCENE_TOKENS.windowGlow;
  return (
    <>
      <Rect x={px(83)} y={px(9)} width={px(39)} height={px(62)} color={SCENE_TOKENS.trimDark} />
      <Rect x={px(87)} y={px(13)} width={px(31)} height={px(54)} color={SCENE_TOKENS.skyDeep} />
      <Rect x={px(88)} y={px(14)} width={px(29)} height={px(29)} color={SCENE_TOKENS.sky} />
      <Rect x={px(88)} y={px(43)} width={px(29)} height={px(23)} color={SCENE_TOKENS.skyLight} />
      <Rect x={px(101)} y={px(14)} width={px(2)} height={px(52)} color={SCENE_TOKENS.trimDark} />
      <Rect x={px(88)} y={px(39)} width={px(29)} height={px(2)} color={SCENE_TOKENS.trimDark} />
      <Rect x={px(79)} y={px(8)} width={px(7)} height={px(64)} color={SCENE_TOKENS.curtainDeep} />
      <Rect x={px(80)} y={px(10)} width={px(4)} height={px(58)} color={SCENE_TOKENS.curtain} />
      <Rect x={px(119)} y={px(8)} width={px(6)} height={px(64)} color={SCENE_TOKENS.curtainDeep} />
      <Rect x={px(120)} y={px(11)} width={px(3)} height={px(56)} color={SCENE_TOKENS.curtainLight} />
      <RoundedRect x={px(86)} y={px(66)} width={px(35)} height={px(5)} r={px(2)} color={SCENE_TOKENS.woodLight} />
      <Rect x={px(87)} y={px(67)} width={px(34)} height={px(26)} color={glow} />
    </>
  );
}

function FloorAndRug({ px }: { px: (value: number) => number }) {
  return (
    <>
      <Rect x={px(-20)} y={px(92)} width={px(168)} height={px(36)} color={SCENE_TOKENS.floorDeep} />
      <Rect x={px(-20)} y={px(97)} width={px(168)} height={px(31)} color={SCENE_TOKENS.floor} />
      {[-15, 5, 25, 45, 65, 85, 105, 125, 145].map((x) => (
        <Rect key={x} x={px(x)} y={px(98)} width={px(1)} height={px(30)} color="rgba(82,58,47,0.30)" />
      ))}
      <Rect x={px(-20)} y={px(98)} width={px(168)} height={px(2)} color={SCENE_TOKENS.floorLight} />
      <RoundedRect x={px(35)} y={px(106)} width={px(52)} height={px(18)} r={px(6)} color={SCENE_TOKENS.rugDeep} />
      <RoundedRect x={px(38)} y={px(108)} width={px(46)} height={px(14)} r={px(5)} color={SCENE_TOKENS.rug} />
      <RoundedRect x={px(44)} y={px(110)} width={px(34)} height={px(3)} r={px(1.5)} color={SCENE_TOKENS.rugLight} />
    </>
  );
}

function BedroomDressing({ state, px }: LayerProps) {
  return (
    <>
      <WallShelf px={px} />
      <LampAndTable px={px} />
      <Plant px={px} />
      <SideCabinet px={px} />
      <Rect x={px(7)} y={px(98)} width={px(27)} height={px(4)} color={SCENE_TOKENS.softShadow} />
      {!state.equipped.includes('slippers') && <Rect x={px(28)} y={px(101)} width={px(9)} height={px(2)} color={SCENE_TOKENS.softShadow} />}
    </>
  );
}

function WallShelf({ px }: { px: (value: number) => number }) {
  return (
    <>
      <Rect x={px(39)} y={px(28)} width={px(31)} height={px(3)} color={SCENE_TOKENS.woodDeep} />
      <Rect x={px(40)} y={px(26)} width={px(29)} height={px(3)} color={SCENE_TOKENS.woodLight} />
      <Rect x={px(43)} y={px(20)} width={px(4)} height={px(6)} color={SCENE_TOKENS.bookGreen} />
      <Rect x={px(48)} y={px(18)} width={px(4)} height={px(8)} color={SCENE_TOKENS.bookGold} />
      <Rect x={px(53)} y={px(21)} width={px(5)} height={px(5)} color={SCENE_TOKENS.bookBlue} />
      <RoundedRect x={px(62)} y={px(20)} width={px(5)} height={px(6)} r={px(2)} color={SCENE_TOKENS.ceramic} />
    </>
  );
}

function LampAndTable({ px }: { px: (value: number) => number }) {
  return (
    <>
      <Rect x={px(39)} y={px(78)} width={px(14)} height={px(4)} color={SCENE_TOKENS.woodLight} />
      <Rect x={px(41)} y={px(82)} width={px(10)} height={px(18)} color={SCENE_TOKENS.wood} />
      <Rect x={px(43)} y={px(66)} width={px(6)} height={px(3)} color={SCENE_TOKENS.trimDark} />
      <Rect x={px(45)} y={px(69)} width={px(2)} height={px(8)} color={SCENE_TOKENS.woodDeep} />
      <RoundedRect x={px(40)} y={px(60)} width={px(12)} height={px(7)} r={px(3)} color={SCENE_TOKENS.sunrise} />
      <Circle cx={px(46)} cy={px(64)} r={px(10)} color="rgba(255,213,139,0.07)" />
    </>
  );
}

function Plant({ px }: { px: (value: number) => number }) {
  return (
    <>
      <RoundedRect x={px(113)} y={px(82)} width={px(8)} height={px(12)} r={px(2)} color={SCENE_TOKENS.ceramic} />
      <Circle cx={px(116)} cy={px(79)} r={px(6)} color={SCENE_TOKENS.foliageDeep} />
      <Circle cx={px(120)} cy={px(77)} r={px(5)} color={SCENE_TOKENS.foliage} />
      <Circle cx={px(114)} cy={px(74)} r={px(4)} color={SCENE_TOKENS.foliageLight} />
    </>
  );
}

function SideCabinet({ px }: { px: (value: number) => number }) {
  return (
    <>
      <Rect x={px(131)} y={px(65)} width={px(12)} height={px(35)} color={SCENE_TOKENS.woodDeep} />
      <Rect x={px(133)} y={px(67)} width={px(8)} height={px(31)} color={SCENE_TOKENS.wood} />
      <Rect x={px(135)} y={px(72)} width={px(4)} height={px(2)} color={SCENE_TOKENS.woodLight} />
      <RoundedRect x={px(-13)} y={px(83)} width={px(9)} height={px(17)} r={px(2)} color={SCENE_TOKENS.woodDeep} />
      <Rect x={px(-11)} y={px(85)} width={px(5)} height={px(13)} color={SCENE_TOKENS.wood} />
    </>
  );
}
