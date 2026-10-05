import {
  GOTHIC_POLE,
  INK_INDEX,
  RAMP_NAMES,
  RAMP_STEPS,
  WARM_POLE,
  arcadePalette,
  blendRgb,
  clampBlend,
  luminance,
  paletteColors,
  paletteIndex,
  toHex,
} from '../src/game/presentation/atlas/pixels/ArcadePalette';
import type { Rgb } from '../src/game/presentation/atlas/pixels/ArcadePalette';

function equal(actual: unknown, expected: unknown, label: string) {
  if (actual !== expected) throw new Error(`${label}: ${actual} !== ${expected}`);
}

function ok(value: unknown, label: string) {
  if (!value) throw new Error(label);
}

// Both poles must expose every named ramp: a sprite drawn against the warm
// palette has to render in the gothic register without a missing index.
RAMP_NAMES.forEach((name) => {
  ok(WARM_POLE.ramps[name], `warm pole defines ramp ${name}`);
  ok(GOTHIC_POLE.ramps[name], `gothic pole defines ramp ${name}`);
});
equal(Object.keys(WARM_POLE.ramps).length, RAMP_NAMES.length, 'warm pole has no unnamed ramp');
equal(Object.keys(GOTHIC_POLE.ramps).length, RAMP_NAMES.length, 'gothic pole has no unnamed ramp');

// The core of the art direction: every ramp is monotonically brighter from
// outline to light, with real separation. This is precisely what the current
// SCENE_TOKENS palette lacks, so it is asserted rather than left to judgement.
const MIN_STEP = 0.04;
[
  { label: 'warm', palette: WARM_POLE },
  { label: 'gothic', palette: GOTHIC_POLE },
].forEach(({ label, palette }) => {
  RAMP_NAMES.forEach((name) => {
    const ramp = palette.ramps[name];
    const steps = RAMP_STEPS.map((step) => luminance(ramp[step]));
    for (let index = 1; index < steps.length; index += 1) {
      ok(
        steps[index] - steps[index - 1] >= MIN_STEP,
        `${label} ramp ${name}: ${RAMP_STEPS[index]} must be at least ${MIN_STEP} brighter than ${RAMP_STEPS[index - 1]} (${steps[index - 1]} -> ${steps[index]})`,
      );
    }
    ok(
      steps[steps.length - 1] - steps[0] >= 0.25,
      `${label} ramp ${name}: outline-to-light spread must stay wide (${steps[0]} -> ${steps[steps.length - 1]})`,
    );
  });
});

// The gothic pole is the darker register by construction.
RAMP_NAMES.forEach((name) => {
  const warmBase = luminance(WARM_POLE.ramps[name].base);
  const gothicBase = luminance(GOTHIC_POLE.ramps[name].base);
  ok(gothicBase < warmBase, `gothic ${name} base is darker than warm (${gothicBase} < ${warmBase})`);
});
ok(luminance(GOTHIC_POLE.ink) < luminance(WARM_POLE.ink), 'gothic ink is the deeper black');

// Blend endpoints and midpoint.
equal(arcadePalette(0), WARM_POLE, 'blend 0 returns the warm pole itself');
equal(arcadePalette(1), GOTHIC_POLE, 'blend 1 returns the gothic pole itself');

const mid = arcadePalette(0.5);
RAMP_NAMES.forEach((name) => {
  const warmBase = luminance(WARM_POLE.ramps[name].base);
  const gothicBase = luminance(GOTHIC_POLE.ramps[name].base);
  const midBase = luminance(mid.ramps[name].base);
  ok(midBase < warmBase && midBase > gothicBase, `mid-blend ${name} sits between the poles`);
});

// A mid-blend must still be a usable palette, not a muddy one: value separation
// survives the interpolation.
RAMP_NAMES.forEach((name) => {
  const ramp = mid.ramps[name];
  const steps = RAMP_STEPS.map((step) => luminance(ramp[step]));
  for (let index = 1; index < steps.length; index += 1) {
    ok(steps[index] > steps[index - 1], `mid-blend ramp ${name} stays monotonic at ${RAMP_STEPS[index]}`);
  }
});

// Out-of-range and non-finite blends clamp instead of producing broken colour.
equal(clampBlend(-3), 0, 'negative blend clamps to the warm pole');
equal(clampBlend(7), 1, 'blend above one clamps to the gothic pole');
equal(clampBlend(Number.NaN), 0, 'non-finite blend falls back to the warm pole');
equal(arcadePalette(-3), WARM_POLE, 'negative blend resolves to the warm pole');
equal(arcadePalette(Number.POSITIVE_INFINITY), GOTHIC_POLE, 'infinite blend resolves to the gothic pole');

const black: Rgb = [0, 0, 0];
const white: Rgb = [255, 255, 255];
equal(toHex(blendRgb(black, white, 0.5)), '#808080', 'linear blend reaches the midpoint');
equal(toHex(blendRgb(black, white, 0)), '#000000', 'blend 0 keeps the source colour');
equal(toHex(blendRgb(black, white, 1)), '#ffffff', 'blend 1 reaches the target colour');
equal(toHex(blendRgb(black, white, Number.NaN)), '#000000', 'non-finite blend keeps the source colour');

// Channels stay inside the byte range even if a pole were edited out of bounds.
equal(toHex([-20, 300, 128]), '#00ff80', 'channels clamp into the byte range');

// The flattened layout the sprite sources index into.
const colors = paletteColors(WARM_POLE);
equal(colors.length, 1 + RAMP_NAMES.length * RAMP_STEPS.length + 1, 'palette flattens to transparent + ramps + ink');
equal(colors[0], 'transparent', 'slot 0 is transparent by the pixel-source convention');
equal(colors[INK_INDEX], toHex(WARM_POLE.ink), 'ink occupies the documented final slot');
equal(colors[paletteIndex('skin', 'base')], toHex(WARM_POLE.ramps.skin.base), 'skin base resolves through paletteIndex');
equal(colors[paletteIndex('accent', 'light')], toHex(WARM_POLE.ramps.accent.light), 'accent light resolves through paletteIndex');
equal(paletteIndex(RAMP_NAMES[0], 'outline'), 1, 'the first ramp starts immediately after transparent');

// Every index the sprite sources can ask for stays inside the emitted palette,
// and within the 36-slot alphabet the generator supports.
RAMP_NAMES.forEach((name) => {
  RAMP_STEPS.forEach((step) => {
    const index = paletteIndex(name, step);
    ok(index > 0 && index < colors.length, `index for ${name}.${step} is inside the palette`);
    ok(colors[index].startsWith('#'), `index for ${name}.${step} resolves to a colour`);
  });
});
// 62 is the generator's index alphabet ('0'-'9', 'a'-'z', 'A'-'Z'); the
// flattened palette must stay addressable from a single sprite source.
ok(colors.length <= 62, 'flattened palette fits the generator index alphabet');

let unknownRampRejected = false;
try {
  paletteIndex('nope' as never, 'base');
} catch {
  unknownRampRejected = true;
}
ok(unknownRampRejected, 'an unknown ramp name is rejected');

// A blended palette flattens to the same layout, so a sprite renders in any
// register without re-indexing.
const blendedColors = paletteColors(arcadePalette(0.4));
equal(blendedColors.length, colors.length, 'a blended palette keeps the same slot layout');
ok(blendedColors[paletteIndex('wood', 'base')] !== colors[paletteIndex('wood', 'base')], 'a blend actually shifts colour');

console.log('arcade palette tests passed');
