/**
 * Phase 1 / step 2 of docs/ARCADE_PIXEL_ART_DIRECTION.md.
 *
 * One palette system with two poles and a per-room blend, not two art styles.
 * The warm pole carries the early rooms; the gothic pole carries the descent.
 * Every sprite and tile indexes the same named ramps, so shifting the whole
 * game's register is a change to this table rather than a repaint of each
 * asset.
 *
 * All colours here are original to Pyjamada. The reference games inform the
 * *principles* — small palettes, wide value separation, 3-4 step material
 * ramps — never the specific pixels.
 *
 * This module is pure data plus pure functions. It is authoring-time colour
 * theory, not gameplay, and it must stay free of gameplay and renderer
 * imports so the sprite build script can consume it directly.
 */

export type Rgb = readonly [number, number, number];

/**
 * A material ramp: shadow -> base -> light, plus the outline that separates the
 * material from whatever sits behind it. Three value steps is the arcade
 * minimum that still reads as a solid form; the outline is deliberately not
 * pure black so the silhouette sits in the scene instead of punching a hole.
 */
export type Ramp = {
  readonly outline: Rgb;
  readonly shadow: Rgb;
  readonly base: Rgb;
  readonly light: Rgb;
};

export type RampName =
  | 'skin'
  | 'hair'
  | 'cloth'
  | 'clothAccent'
  | 'wood'
  | 'metal'
  | 'wall'
  | 'floor'
  | 'glass'
  | 'accent';

export type ArcadePalette = {
  readonly ink: Rgb;
  readonly ramps: { readonly [K in RampName]: Ramp };
};

export const RAMP_NAMES: readonly RampName[] = [
  'skin',
  'hair',
  'cloth',
  'clothAccent',
  'wood',
  'metal',
  'wall',
  'floor',
  'glass',
  'accent',
];

export const RAMP_STEPS = ['outline', 'shadow', 'base', 'light'] as const;
export type RampStep = (typeof RAMP_STEPS)[number];

/**
 * Warm pole: bedroom, hallway, living room, kitchen. Saturated, cheerful, and
 * separated widely enough in value that an object reads without its outline.
 */
export const WARM_POLE: ArcadePalette = {
  ink: [26, 18, 32],
  ramps: {
    skin: { outline: [88, 40, 42], shadow: [176, 96, 74], base: [231, 160, 111], light: [255, 209, 163] },
    hair: { outline: [34, 20, 28], shadow: [92, 46, 38], base: [150, 79, 46], light: [204, 124, 62] },
    cloth: { outline: [24, 36, 82], shadow: [46, 74, 158], base: [72, 122, 224], light: [126, 178, 255] },
    clothAccent: { outline: [96, 24, 40], shadow: [176, 50, 62], base: [234, 92, 84], light: [255, 150, 128] },
    wood: { outline: [50, 28, 22], shadow: [106, 60, 34], base: [166, 102, 54], light: [216, 152, 88] },
    metal: { outline: [38, 40, 54], shadow: [92, 100, 122], base: [154, 164, 186], light: [214, 222, 238] },
    wall: { outline: [64, 40, 70], shadow: [122, 74, 108], base: [178, 116, 142], light: [224, 166, 176] },
    floor: { outline: [58, 34, 30], shadow: [118, 70, 48], base: [178, 116, 74], light: [226, 170, 116] },
    glass: { outline: [30, 58, 74], shadow: [62, 120, 148], base: [110, 186, 214], light: [186, 234, 246] },
    accent: { outline: [104, 62, 12], shadow: [190, 128, 24], base: [248, 190, 54], light: [255, 236, 138] },
  },
};

/**
 * Gothic pole: basement, laboratory, attic, nightmare. Colder hues, deeper
 * blacks, harder silhouettes. The ramps keep the same names and roles so a
 * sprite drawn once renders in either register.
 */
export const GOTHIC_POLE: ArcadePalette = {
  ink: [8, 6, 14],
  ramps: {
    skin: { outline: [40, 24, 44], shadow: [104, 70, 86], base: [158, 124, 136], light: [206, 178, 182] },
    hair: { outline: [12, 10, 20], shadow: [40, 32, 52], base: [74, 62, 88], light: [114, 100, 128] },
    cloth: { outline: [10, 14, 40], shadow: [26, 38, 84], base: [48, 66, 130], light: [86, 110, 176] },
    clothAccent: { outline: [46, 10, 26], shadow: [96, 24, 44], base: [148, 44, 62], light: [196, 82, 90] },
    wood: { outline: [20, 14, 18], shadow: [52, 36, 40], base: [86, 62, 62], light: [124, 96, 90] },
    metal: { outline: [14, 16, 26], shadow: [48, 56, 74], base: [92, 104, 128], light: [148, 162, 188] },
    wall: { outline: [14, 12, 26], shadow: [40, 36, 62], base: [70, 64, 98], light: [108, 100, 138] },
    floor: { outline: [12, 10, 16], shadow: [38, 32, 40], base: [66, 58, 68], light: [100, 90, 100] },
    glass: { outline: [10, 22, 36], shadow: [30, 60, 84], base: [58, 104, 134], light: [104, 158, 184] },
    accent: { outline: [58, 34, 8], shadow: [116, 76, 20], base: [178, 126, 40], light: [222, 178, 92] },
  },
};

function clampChannel(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(255, Math.round(value)));
}

export function clampBlend(amount: number): number {
  // Only NaN has no meaningful position on the axis; the infinities clamp to
  // their respective poles like any other out-of-range value.
  if (Number.isNaN(amount)) return 0;
  return Math.max(0, Math.min(1, amount));
}

/**
 * Linear per-channel mix. Arcade palettes are small and hand-tuned, so the
 * poles are authored to interpolate well directly; a perceptual space would
 * add a dependency and cost without changing what the eye reads at these
 * value separations.
 */
export function blendRgb(from: Rgb, to: Rgb, amount: number): Rgb {
  const t = clampBlend(amount);
  return [
    clampChannel(from[0] + (to[0] - from[0]) * t),
    clampChannel(from[1] + (to[1] - from[1]) * t),
    clampChannel(from[2] + (to[2] - from[2]) * t),
  ];
}

export function blendRamp(from: Ramp, to: Ramp, amount: number): Ramp {
  return {
    outline: blendRgb(from.outline, to.outline, amount),
    shadow: blendRgb(from.shadow, to.shadow, amount),
    base: blendRgb(from.base, to.base, amount),
    light: blendRgb(from.light, to.light, amount),
  };
}

/**
 * `gothic` is the per-room position on the warm -> gothic axis: 0 is the
 * bedroom, 1 is the deepest nightmare register. Rooms pick their own value;
 * nothing else in the game needs to know how the ramp is built.
 */
export function arcadePalette(gothic: number): ArcadePalette {
  const t = clampBlend(gothic);
  if (t === 0) return WARM_POLE;
  if (t === 1) return GOTHIC_POLE;
  const ramps = {} as { [K in RampName]: Ramp };
  RAMP_NAMES.forEach((name) => {
    ramps[name] = blendRamp(WARM_POLE.ramps[name], GOTHIC_POLE.ramps[name], t);
  });
  return { ink: blendRgb(WARM_POLE.ink, GOTHIC_POLE.ink, t), ramps };
}

export function toHex(color: Rgb): string {
  return `#${color.map((channel) => clampChannel(channel).toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Relative luminance (Rec. 709). Used to assert that each ramp keeps real value
 * separation: the arcade look depends on steps the eye can tell apart in a
 * greyscale reduction, which is exactly what the current muddy palette lacks.
 */
export function luminance(color: Rgb): number {
  return (0.2126 * color[0] + 0.7152 * color[1] + 0.0722 * color[2]) / 255;
}

/**
 * Flattens a palette into the ordered colour list a sprite source indexes into.
 * Slot 0 is transparent by the pixel-source convention; ramps follow in
 * RAMP_NAMES order, four steps each, then the ink. A sprite drawn against this
 * layout renders in any register by rebuilding the palette at a different
 * `gothic` value.
 */
export function paletteColors(palette: ArcadePalette): string[] {
  const colors: string[] = ['transparent'];
  RAMP_NAMES.forEach((name) => {
    const ramp = palette.ramps[name];
    RAMP_STEPS.forEach((step) => colors.push(toHex(ramp[step])));
  });
  colors.push(toHex(palette.ink));
  return colors;
}

/**
 * The index a sprite source uses for a given ramp step, in the layout
 * `paletteColors` produces. Sprite modules address colours through this rather
 * than hardcoding a number, so inserting a ramp does not silently recolour
 * every existing frame.
 */
export function paletteIndex(name: RampName, step: RampStep): number {
  const rampOffset = RAMP_NAMES.indexOf(name);
  if (rampOffset < 0) throw new Error(`unknown ramp ${name}`);
  return 1 + rampOffset * RAMP_STEPS.length + RAMP_STEPS.indexOf(step);
}

export const INK_INDEX = 1 + RAMP_NAMES.length * RAMP_STEPS.length;
