import React, { type ReactNode } from 'react';
import { Platform } from 'react-native';
import { Group, Paint, RuntimeShader, Skia, type SkRuntimeEffect } from '@shopify/react-native-skia';
import { PIXEL_PALETTE_SIZE } from './PixelArcadePalette';

// Snaps everything drawn inside the layer to one logical stage pixel (`block`
// canvas units). With a palette it also applies 4x4 ordered dithering and
// nearest-color quantization, so vector shapes, soft glows and gradients read
// as one restricted pixel-art surface. Presentation-only; no gameplay input.
const PIXEL_ARCADE_SKSL = `
uniform shader image;
uniform float block;
uniform float quantize;
uniform float dither;
uniform float3 palette[${PIXEL_PALETTE_SIZE}];

float bayer2(float2 p) { return mod(2.0 * p.x + 3.0 * p.y, 4.0); }

float bayer4(float2 cell) {
  float2 c = mod(cell, 4.0);
  return (4.0 * bayer2(mod(c, 2.0)) + bayer2(floor(c / 2.0)) + 0.5) / 16.0 - 0.5;
}

half4 main(float2 xy) {
  float2 cell = floor(xy / block);
  half4 src = image.eval((cell + 0.5) * block);
  if (quantize < 0.5 || src.a < 0.01) return src;
  float3 rgb = float3(src.rgb) / float(src.a) + bayer4(cell) * dither;
  float best = 1000.0;
  float3 pick = rgb;
  for (int i = 0; i < ${PIXEL_PALETTE_SIZE}; i++) {
    float3 d = rgb - palette[i];
    float dist = dot(d * d, float3(0.30, 0.59, 0.11));
    if (dist < best) { best = dist; pick = palette[i]; }
  }
  return half4(half3(pick) * src.a, src.a);
}
`;

const DITHER_STRENGTH = 0.02;
const NO_PALETTE: number[] = new Array(PIXEL_PALETTE_SIZE * 3).fill(0);

let cachedEffect: SkRuntimeEffect | null | undefined;

function pixelArcadeEffect(): SkRuntimeEffect | null {
  // Skia's web build (CanvasKit) does not implement runtime-shader image
  // filters, so the web version draws the stage unpixelated.
  if (cachedEffect === undefined) cachedEffect = Platform.OS === 'web' ? null : Skia.RuntimeEffect.Make(PIXEL_ARCADE_SKSL);
  return cachedEffect;
}

type Props = {
  block: number;
  /** Output of pixelPaletteUniform; omit to pixelate without quantizing. */
  palette?: readonly number[];
  children: ReactNode;
};

export function PixelArcadeLayer({ block, palette, children }: Props) {
  const source = pixelArcadeEffect();
  if (!source || block < 1) return <>{children}</>;
  const uniforms = {
    block,
    quantize: palette ? 1 : 0,
    dither: DITHER_STRENGTH,
    palette: palette ? [...palette] : NO_PALETTE,
  };
  return (
    <Group layer={<Paint><RuntimeShader source={source} uniforms={uniforms} /></Paint>}>
      {children}
    </Group>
  );
}
