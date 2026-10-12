import type { RoomId } from '../adventure/AdventureState';

// Closed retro palette applied to the room layer by PixelArcadeLayer. Every
// room shares the accent colors (signals, hazards, highlights) and owns a
// twelve-step ramp that gives it a distinct key hue after quantization.
// Actor sprites are not quantized, so their art does not need to fit here.
export const PIXEL_PALETTE_SIZE = 20;

const SHARED_ACCENTS = [
  '#0b0a12', '#f4f1de', '#ffd84a', '#44d9e6',
  '#1f8fa8', '#ff5277', '#b04fd1', '#e8873a',
] as const;

const ROOM_RAMPS: Record<RoomId, readonly string[]> = {
  bedroom: ['#1d1426', '#3a2236', '#5e3446', '#8c4d52', '#b8705a', '#dfa16e', '#f3d29a', '#34405e', '#5c86a8', '#2e4a3c', '#3f6a4c', '#6f9a5e'],
  hallway: ['#120f24', '#221b3d', '#352a5a', '#4c3d7a', '#6b5aa0', '#9585c9', '#c8b8ea', '#2e1e22', '#4e3230', '#7a5040', '#2a3a5a', '#4a6a8a'],
  'living-room': ['#0c1618', '#132629', '#1d3a3a', '#2a5450', '#3f7468', '#66a08a', '#a8d8b8', '#2a1e2a', '#4a3242', '#6e4a5a', '#1a2a44', '#33507a'],
  kitchen: ['#14160e', '#22261a', '#343a24', '#4d5532', '#6e7a42', '#a3ad62', '#dfe3a0', '#2e221c', '#4e3a2c', '#7a5a40', '#3a3a44', '#5e5e6a'],
  bathroom: ['#0e1820', '#18303c', '#255061', '#3a7486', '#5a95a5', '#8fc2cc', '#cfeaea', '#1c2a30', '#2e4650', '#4a6a76', '#3a2e2a', '#5e4a40'],
  attic: ['#1a120e', '#2e1f17', '#4a3121', '#6e4a2e', '#9a6b3e', '#c8925a', '#f0c890', '#2e2236', '#4a3a52', '#6e5a74', '#24303a', '#3e5260'],
  basement: ['#160e0e', '#2a1614', '#42221c', '#643226', '#8e4a2e', '#c47038', '#f0a860', '#2a201e', '#40302a', '#5e4638', '#2a3a2e', '#46604a'],
  laboratory: ['#07081a', '#10132e', '#1b2048', '#2a326a', '#3e4c96', '#6a7ed0', '#b0c0f0', '#2a0e3a', '#4a1a64', '#7a2a9a', '#0e2a30', '#1a4a52'],
};

export function pixelPaletteFor(roomId: RoomId): readonly string[] {
  return [...SHARED_ACCENTS, ...ROOM_RAMPS[roomId]];
}

/** Flattened normalized RGB triples, the layout of the shader's `float3 palette[20]`. */
export function pixelPaletteUniform(roomId: RoomId): number[] {
  return pixelPaletteFor(roomId).flatMap((hex) => [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255));
}
