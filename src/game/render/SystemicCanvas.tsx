import React from 'react';
import { Canvas } from '@shopify/react-native-skia';
import type { SystemicRunState } from '../systemic/SystemicState';
import { LOGICAL_SIZE, PLAYER_GROUND_Y } from '../core/World';
import { HeroContactShadow, KeySprite, PixelBlocks, type PixelBlock } from './PixelArtKit';
import { BedroomAtmosphere, RoomBackdrop } from './RoomScene';
import { RETRO_PALETTE } from './VisualLanguage';

type Props = { state: SystemicRunState; size: number };
type ScaleFn = (value: number) => number;

export function SystemicCanvas({ state, size }: Props) {
  const scale = size / LOGICAL_SIZE;
  const px = (value: number) => value * scale;
  return (
    <Canvas style={{ width: size, height: size }}>
      <RoomBackdrop roomId="room-01" px={px} />
      <BedroomAtmosphere px={px} windowOpen={state.flags.windowOpen} />
      <BedroomSystemicObjects state={state} px={px} />
      <HeroContactShadow x={state.player.x} y={PLAYER_GROUND_Y} px={px} />
      <SystemicHero state={state} px={px} />
    </Canvas>
  );
}

function BedroomSystemicObjects({ state, px }: { state: SystemicRunState; px: ScaleFn }) {
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
      <PixelBlocks blocks={blocks} px={px} prefix="systemic-bedroom" />
      {!state.collected.includes('keys') && <KeySprite x={88} y={96} px={px} />}
    </>
  );
}

function SystemicHero({ state, px }: { state: SystemicRunState; px: ScaleFn }) {
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
  return <PixelBlocks blocks={blocks} px={px} prefix="systemic-hero" />;
}
