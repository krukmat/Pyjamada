import React from 'react';
import { Canvas, Rect } from '@shopify/react-native-skia';
import { LOGICAL_SIZE, PLAYER_GROUND_Y } from '../core/World';
import type { SystemicRunState } from '../systemic/SystemicState';
import { HeroContactShadow, KeySprite, PixelBlocks, type PixelBlock } from './PixelArtKit';
import { RETRO_PALETTE } from './VisualLanguage';

type Props = { state: SystemicRunState; size: number };
type ScaleFn = (value: number) => number;

export function GameCanvas({ state, size }: Props) {
  const scale = size / LOGICAL_SIZE;
  const px = (value: number) => value * scale;
  return (
    <Canvas style={{ width: size, height: size }}>
      <BedroomBackdrop px={px} />
      <BedroomAtmosphere px={px} windowOpen={state.flags.windowOpen} />
      <BedroomObjects state={state} px={px} />
      <HeroContactShadow x={state.player.x} y={PLAYER_GROUND_Y} px={px} />
      <Wally state={state} px={px} />
    </Canvas>
  );
}

function BedroomBackdrop({ px }: { px: ScaleFn }) {
  const dither: PixelBlock[] = [
    { x: 8, y: 111, width: 10, height: 2, color: RETRO_PALETTE.blueDark },
    { x: 31, y: 120, width: 14, height: 2, color: RETRO_PALETTE.blueDark },
    { x: 58, y: 109, width: 8, height: 2, color: RETRO_PALETTE.blueDark },
    { x: 83, y: 122, width: 12, height: 2, color: RETRO_PALETTE.blueDark },
    { x: 108, y: 113, width: 9, height: 2, color: RETRO_PALETTE.blueDark },
  ];
  return (
    <>
      <Rect x={0} y={0} width={px(128)} height={px(128)} color={RETRO_PALETTE.void} />
      <Rect x={px(4)} y={px(8)} width={px(120)} height={px(96)} color={RETRO_PALETTE.panelRaised} />
      <Rect x={px(4)} y={px(100)} width={px(120)} height={px(4)} color={RETRO_PALETTE.cyan} />
      <Rect x={0} y={px(104)} width={px(128)} height={px(24)} color={RETRO_PALETTE.blue} />
      <Rect x={0} y={px(104)} width={px(128)} height={px(2)} color={RETRO_PALETTE.yellow} />
      <PixelBlocks blocks={dither} px={px} prefix="floor-dither" />
    </>
  );
}

function BedroomAtmosphere({ px, windowOpen }: { px: ScaleFn; windowOpen: boolean }) {
  const blocks: PixelBlock[] = [
    { x: 12, y: 44, width: 8, height: 20, color: '#1e2b52' },
    { x: 20, y: 44, width: 8, height: 30, color: '#1b274a' },
    { x: 28, y: 44, width: 8, height: 40, color: '#182342' },
    { x: 18, y: 16, width: 1, height: 1, color: RETRO_PALETTE.moon },
    { x: 31, y: 19, width: 1, height: 1, color: RETRO_PALETTE.yellow },
    { x: 39, y: 14, width: 1, height: 1, color: RETRO_PALETTE.cyan },
    { x: 12, y: 22, width: 28, height: 22, color: RETRO_PALETTE.cyanDark },
    { x: 14, y: 24, width: 24, height: 18, color: RETRO_PALETTE.cyan },
    { x: 16, y: 26, width: 20, height: 14, color: windowOpen ? RETRO_PALETTE.greenDark : RETRO_PALETTE.blueDark },
    { x: 25, y: 26, width: 2, height: 14, color: RETRO_PALETTE.cyan },
    { x: 16, y: 32, width: 20, height: 2, color: RETRO_PALETTE.cyan },
  ];
  return <PixelBlocks blocks={blocks} px={px} prefix="bedroom-atmosphere" />;
}

function BedroomObjects({ state, px }: { state: SystemicRunState; px: ScaleFn }) {
  const wardrobePrimary = state.flags.dressed ? RETRO_PALETTE.green : RETRO_PALETTE.orange;
  const wardrobeShade = state.flags.dressed ? RETRO_PALETTE.greenDark : RETRO_PALETTE.orangeDark;
  const blocks: PixelBlock[] = [
    { x: 7, y: 81, width: 30, height: 16, color: RETRO_PALETTE.magentaDark },
    { x: 8, y: 82, width: 28, height: 14, color: RETRO_PALETTE.magenta },
    { x: 9, y: 91, width: 26, height: 5, color: RETRO_PALETTE.magentaDark },
    { x: 8, y: 96, width: 4, height: 8, color: RETRO_PALETTE.yellowDark },
    { x: 32, y: 96, width: 4, height: 8, color: RETRO_PALETTE.yellowDark },
    { x: 28, y: 99, width: 9, height: 4, color: RETRO_PALETTE.shadow },
    { x: 29, y: 100, width: 7, height: 2, color: state.equipped.includes('slippers') ? RETRO_PALETTE.green : RETRO_PALETTE.cyan },
    { x: 43, y: 87, width: 12, height: 14, color: RETRO_PALETTE.orangeDark },
    { x: 44, y: 88, width: 10, height: 12, color: RETRO_PALETTE.orange },
    { x: 46, y: 84, width: 6, height: 5, color: state.interactionCounts['alarm-clock'] > 1 ? RETRO_PALETTE.red : RETRO_PALETTE.yellow },
    { x: 51, y: 89, width: 2, height: 9, color: RETRO_PALETTE.orangeDark },
    { x: 58, y: 41, width: 24, height: 63, color: wardrobeShade },
    { x: 59, y: 42, width: 22, height: 62, color: wardrobePrimary },
    { x: 62, y: 47, width: 16, height: 24, color: RETRO_PALETTE.redDark },
    { x: 63, y: 48, width: 14, height: 22, color: '#6d3c3c' },
    { x: 62, y: 75, width: 16, height: 25, color: RETRO_PALETTE.redDark },
    { x: 63, y: 76, width: 14, height: 23, color: '#6d3c3c' },
    { x: 76, y: 72, width: 1, height: 1, color: RETRO_PALETTE.yellow },
  ];
  return (
    <>
      <PixelBlocks blocks={blocks} px={px} prefix="bedroom" />
      {!state.collected.includes('keys') && <KeySprite x={88} y={96} px={px} />}
    </>
  );
}

function Wally({ state, px }: { state: SystemicRunState; px: ScaleFn }) {
  const x = state.player.x;
  const y = PLAYER_GROUND_Y;
  const facingRight = state.player.facing === 'right';
  const body = state.wallyState === 'sleepy'
    ? RETRO_PALETTE.cyan
    : state.wallyState === 'normal'
      ? RETRO_PALETTE.green
      : state.wallyState === 'rushed'
        ? RETRO_PALETTE.yellow
        : RETRO_PALETTE.red;
  const bodyShade = state.wallyState === 'sleepy'
    ? RETRO_PALETTE.cyanDark
    : state.wallyState === 'normal'
      ? RETRO_PALETTE.greenDark
      : state.wallyState === 'rushed'
        ? RETRO_PALETTE.yellowDark
        : RETRO_PALETTE.redDark;
  const eyeX = facingRight ? x + 5 : x + 2;
  const blocks: PixelBlock[] = [
    { x: x + 1, y, width: 5, height: 2, color: RETRO_PALETTE.magenta },
    { x: x + 1, y: y + 2, width: 6, height: 4, color: RETRO_PALETTE.ink },
    { x: eyeX, y: y + 3, width: 1, height: 1, color: RETRO_PALETTE.shadow },
    { x: x + 1, y: y + 6, width: 6, height: 6, color: body },
    { x: x + 5, y: y + 6, width: 2, height: 6, color: bodyShade },
    { x: x + 1, y: y + 12, width: 2, height: 4, color: body },
    { x: x + 5, y: y + 12, width: 2, height: 4, color: bodyShade },
  ];
  return <PixelBlocks blocks={blocks} px={px} prefix="wally" />;
}
