import React from 'react';
import { Canvas, Rect } from '@shopify/react-native-skia';
import type { SystemicRunState } from '../systemic/SystemicState';
import { LOGICAL_SIZE, PLAYER_GROUND_Y } from '../core/World';
import { KeySprite, PixelBlocks, type PixelBlock } from './PixelArtKit';
import { RETRO_PALETTE, ROOM_VISUALS } from './VisualLanguage';

type Props = { state: SystemicRunState; size: number };
type ScaleFn = (value: number) => number;

export function SystemicCanvas({ state, size }: Props) {
  const scale = size / LOGICAL_SIZE;
  const px = (value: number) => value * scale;
  const palette = ROOM_VISUALS['room-01'];
  return (
    <Canvas style={{ width: size, height: size }}>
      <Rect x={0} y={0} width={px(128)} height={px(128)} color={palette.background} />
      <Rect x={px(4)} y={px(8)} width={px(120)} height={px(96)} color={palette.wall} />
      <Rect x={0} y={px(104)} width={px(128)} height={px(24)} color={palette.floor} />
      <Rect x={0} y={px(104)} width={px(128)} height={px(2)} color={palette.accent} />
      <BedroomSystemicObjects state={state} px={px} />
      <SystemicHero state={state} px={px} />
    </Canvas>
  );
}

function BedroomSystemicObjects({ state, px }: { state: SystemicRunState; px: ScaleFn }) {
  const blocks: PixelBlock[] = [
    { x: 8, y: 82, width: 28, height: 14, color: RETRO_PALETTE.magenta },
    { x: 8, y: 96, width: 4, height: 8, color: RETRO_PALETTE.yellow },
    { x: 32, y: 96, width: 4, height: 8, color: RETRO_PALETTE.yellow },
    { x: 29, y: 100, width: 7, height: 2, color: state.equipped.includes('slippers') ? RETRO_PALETTE.green : RETRO_PALETTE.cyan },
    { x: 44, y: 88, width: 10, height: 12, color: RETRO_PALETTE.orange },
    { x: 46, y: 84, width: 6, height: 5, color: state.interactionCounts['alarm-clock'] > 1 ? RETRO_PALETTE.red : RETRO_PALETTE.yellow },
    { x: 59, y: 42, width: 22, height: 62, color: state.flags.dressed ? RETRO_PALETTE.green : RETRO_PALETTE.orange },
    { x: 62, y: 47, width: 16, height: 24, color: '#6d3c3c' },
    { x: 62, y: 75, width: 16, height: 25, color: '#6d3c3c' },
    { x: 99, y: 23, width: 20, height: 23, color: RETRO_PALETTE.cyan },
    { x: 102, y: 26, width: 14, height: 17, color: state.flags.windowOpen ? RETRO_PALETTE.green : RETRO_PALETTE.blue },
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
  const eyeX = facingRight ? x + 5 : x + 2;
  const blocks: PixelBlock[] = [
    { x: x + 1, y, width: 5, height: 2, color: RETRO_PALETTE.magenta },
    { x: x + 1, y: y + 2, width: 6, height: 4, color: RETRO_PALETTE.ink },
    { x: eyeX, y: y + 3, width: 1, height: 1, color: RETRO_PALETTE.shadow },
    { x: x + 1, y: y + 6, width: 6, height: 6, color: body },
    { x: x + 1, y: y + 12, width: 2, height: 4, color: body },
    { x: x + 5, y: y + 12, width: 2, height: 4, color: body },
  ];
  return <PixelBlocks blocks={blocks} px={px} prefix="systemic-hero" />;
}
