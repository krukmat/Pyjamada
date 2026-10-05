import { LOGICAL_SIZE } from '../src/game/core/World';
import {
  MAX_STAGE_SCALE,
  MIN_STAGE_SCALE,
  STAGE_LOGICAL_HEIGHT,
  STAGE_LOGICAL_WIDTH,
  integerStageScaleForScreenWidth,
  stageDimensionsForScreenWidth,
  stageOriginX,
  stagePx,
  stageScale,
} from '../src/game/render/StageViewport';

function equal(actual: unknown, expected: unknown, label: string) {
  if (actual !== expected) throw new Error(`${label}: ${actual} !== ${expected}`);
}

function ok(value: unknown, label: string) {
  if (!value) throw new Error(label);
}

// Phase 1 / step 3 acceptance edge from docs/ARCADE_PIXEL_ART_DIRECTION.md:
// "at every supported viewport size the pixel scale stays an integer — no
// fractional scaling, no shimmer when Wally moves".
//
// The sweep covers every plausible Android width, including the awkward ones
// that previously produced scales like 2.34.
for (let screenWidth = 200; screenWidth <= 2400; screenWidth += 1) {
  const viewport = stageDimensionsForScreenWidth(screenWidth);
  ok(
    Number.isInteger(viewport.scale),
    `screen width ${screenWidth}: stage scale ${viewport.scale} must be an integer`,
  );
  ok(Number.isInteger(viewport.width), `screen width ${screenWidth}: stage width must be whole pixels`);
  ok(Number.isInteger(viewport.height), `screen width ${screenWidth}: stage height must be whole pixels`);
  equal(
    viewport.width,
    STAGE_LOGICAL_WIDTH * viewport.scale,
    `screen width ${screenWidth}: width is the logical width at an integer scale`,
  );
  equal(
    viewport.height,
    STAGE_LOGICAL_HEIGHT * viewport.scale,
    `screen width ${screenWidth}: height is the logical height at an integer scale`,
  );

  // The renderer re-derives its scale from the pixel height alone
  // (GameCanvas calls stageScale(height)). That round trip must return the
  // same integer, or sprites and primitives would disagree on pixel size.
  equal(
    stageScale(viewport.height),
    viewport.scale,
    `screen width ${screenWidth}: the renderer re-derives the same integer scale`,
  );

  // The stage never overflows the screen it was fitted to.
  ok(
    viewport.width <= Math.max(STAGE_LOGICAL_WIDTH, screenWidth),
    `screen width ${screenWidth}: stage width ${viewport.width} fits the screen`,
  );
}

// Scale bounds.
equal(integerStageScaleForScreenWidth(0), MIN_STAGE_SCALE, 'a degenerate width still yields the minimum scale');
equal(integerStageScaleForScreenWidth(-500), MIN_STAGE_SCALE, 'a negative width clamps to the minimum scale');
equal(integerStageScaleForScreenWidth(Number.NaN), MIN_STAGE_SCALE, 'a non-finite width falls back to the minimum scale');
equal(integerStageScaleForScreenWidth(100000), MAX_STAGE_SCALE, 'an enormous width clamps to the maximum scale');
ok(MIN_STAGE_SCALE >= 1, 'the stage is never scaled below one screen pixel per logical pixel');
ok(MAX_STAGE_SCALE > MIN_STAGE_SCALE, 'the scale range is non-degenerate');

// Scale steps at the thresholds: 168 logical px wide plus the 24px inset.
equal(integerStageScaleForScreenWidth(168 + 24), 1, 'exactly one stage width resolves to scale 1');
equal(integerStageScaleForScreenWidth(336 + 23), 1, 'one pixel short of two stage widths stays at scale 1');
equal(integerStageScaleForScreenWidth(336 + 24), 2, 'exactly two stage widths resolves to scale 2');
equal(integerStageScaleForScreenWidth(504 + 24), 3, 'exactly three stage widths resolves to scale 3');

// The scale is monotonic in screen width: a wider screen never shrinks the stage.
let previous = integerStageScaleForScreenWidth(200);
for (let screenWidth = 201; screenWidth <= 2400; screenWidth += 1) {
  const current = integerStageScaleForScreenWidth(screenWidth);
  ok(current >= previous, `screen width ${screenWidth}: scale must not decrease as the screen widens`);
  previous = current;
}

// A logical coordinate must land on a whole screen pixel at every supported
// size — this is the property that stops sprite rows drifting between frames.
[360, 411, 412, 480, 720, 1080].forEach((screenWidth) => {
  const viewport = stageDimensionsForScreenWidth(screenWidth);
  for (let logical = 0; logical <= LOGICAL_SIZE; logical += 1) {
    const rendered = stagePx(viewport.height, logical);
    ok(Number.isInteger(rendered), `screen width ${screenWidth}: logical ${logical} renders on a whole pixel`);
    equal(
      rendered,
      logical * viewport.scale,
      `screen width ${screenWidth}: logical ${logical} renders at exactly ${viewport.scale}x`,
    );
  }
  ok(
    Number.isInteger(stageOriginX(viewport.width, viewport.height)),
    `screen width ${screenWidth}: the stage origin lands on a whole pixel`,
  );
});

console.log('stage viewport tests passed');
