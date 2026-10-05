import { WALLY_ATLAS } from '../src/game/presentation/atlas/manifests';
import { SPRITE_SOURCES } from '../src/game/presentation/atlas/pixels';
import {
  DERIVED_CLIPS,
  FRAME_HEIGHT,
  FRAME_WIDTH,
  HAND_DRAWN_CLIPS,
  WALLY_FRAMES,
  WALLY_PALETTE,
  WALLY_SOURCE,
} from '../src/game/presentation/atlas/pixels/WallyPixels';

function equal(actual: unknown, expected: unknown, label: string) {
  if (actual !== expected) throw new Error(`${label}: ${actual} !== ${expected}`);
}

function ok(value: unknown, label: string) {
  if (!value) throw new Error(label);
}

// The atlas manifest stays the single source of truth for what each slot
// means. If the pixel source and the manifest disagree on frame order or
// count, every later clip resolves to the wrong art — a silent, purely visual
// failure. These assertions are the guard against that.
equal(WALLY_SOURCE.width, WALLY_ATLAS.width, 'source sheet width matches the manifest');
equal(WALLY_SOURCE.height, WALLY_ATLAS.height, 'source sheet height matches the manifest');
equal(WALLY_FRAMES.length, WALLY_ATLAS.frames.length, 'source frame count matches the manifest');

// Frame ids must line up one-for-one, in order, with the manifest's frames.
WALLY_ATLAS.frames.forEach((manifestFrame, index) => {
  const sourceFrame = WALLY_FRAMES[index];
  ok(sourceFrame, `manifest frame ${manifestFrame.id} has a source frame at index ${index}`);
  equal(sourceFrame.id, manifestFrame.id, `frame ${index} id matches the manifest`);
  equal(manifestFrame.width, FRAME_WIDTH, `manifest frame ${manifestFrame.id} is ${FRAME_WIDTH}px wide`);
  equal(manifestFrame.height, FRAME_HEIGHT, `manifest frame ${manifestFrame.id} is ${FRAME_HEIGHT}px tall`);
});

// Every clip the game can request must resolve to real frames.
WALLY_ATLAS.clips.forEach((clip) => {
  clip.frames.forEach((clipFrame) => {
    const source = WALLY_FRAMES.find((frame) => frame.id === clipFrame.frameId);
    ok(source, `clip ${clip.id} frame ${clipFrame.frameId} exists in the pixel source`);
  });
});

// Frame geometry: rows may be short (the generator pads with transparent) but
// never long, and the row count is exact.
WALLY_FRAMES.forEach((frame) => {
  equal(frame.rows.length, FRAME_HEIGHT, `frame ${frame.id} has ${FRAME_HEIGHT} rows`);
  frame.rows.forEach((row, y) => {
    ok(
      row.length <= FRAME_WIDTH,
      `frame ${frame.id} row ${y} is ${row.length} chars; the frame is ${FRAME_WIDTH} wide`,
    );
  });
});

// Every drawn pixel must address a colour that exists in the palette.
const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
WALLY_FRAMES.forEach((frame) => {
  frame.rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x += 1) {
      const char = row[x];
      if (char === '.') continue;
      const slot = ALPHABET.indexOf(char);
      ok(slot >= 0, `frame ${frame.id} row ${y} col ${x}: "${char}" is in the index alphabet`);
      ok(
        slot < WALLY_PALETTE.length,
        `frame ${frame.id} row ${y} col ${x}: index ${slot} is inside the ${WALLY_PALETTE.length}-entry palette`,
      );
    }
  });
});

// Wally must actually be drawn: a frame that is accidentally blank would pass
// every structural check above while rendering nothing.
WALLY_FRAMES.forEach((frame) => {
  const drawn = frame.rows.reduce(
    (total, row) => total + row.split('').filter((char) => char !== '.').length,
    0,
  );
  ok(drawn > 80, `frame ${frame.id} has ${drawn} drawn pixels; expected a real figure`);
});

// The feet must sit near the anchor row. The manifest anchors Wally at y=27, so
// art floating well above the baseline would render him hovering.
const anchorY = WALLY_ATLAS.frames[0].anchorY;
equal(anchorY, FRAME_HEIGHT - 1, 'the manifest anchors Wally one pixel above the frame bottom');
WALLY_FRAMES.forEach((frame) => {
  let lowestDrawnRow = -1;
  frame.rows.forEach((row, y) => {
    if (row.split('').some((char) => char !== '.')) lowestDrawnRow = y;
  });
  ok(
    lowestDrawnRow >= anchorY - 3,
    `frame ${frame.id}: lowest drawn row ${lowestDrawnRow} should reach the anchor at ${anchorY}`,
  );
  ok(lowestDrawnRow <= anchorY, `frame ${frame.id}: art must not extend below the anchor row`);
});

// Scope bookkeeping for this step: four clips are hand-drawn, the rest are
// declared placeholders. This asserts the accounting is complete and honest —
// no clip may be silently missing from both lists.
equal(HAND_DRAWN_CLIPS.length, 4, 'four clips are hand-drawn in this step');
['idle_normal', 'walk_normal', 'idle_sleepy', 'collect_keys'].forEach((id) => {
  ok(HAND_DRAWN_CLIPS.includes(id), `${id} is hand-drawn`);
});
equal(
  HAND_DRAWN_CLIPS.length + DERIVED_CLIPS.length,
  WALLY_ATLAS.clips.length,
  'every manifest clip is accounted for as either hand-drawn or derived',
);
WALLY_ATLAS.clips.forEach((clip) => {
  const drawn = HAND_DRAWN_CLIPS.includes(clip.id);
  const derived = DERIVED_CLIPS.includes(clip.id);
  ok(drawn !== derived, `clip ${clip.id} is classified exactly once`);
});

// The registry exposes Wally to the build script.
ok(
  SPRITE_SOURCES.some((source) => source.output === 'assets/game/wally/wally.png'),
  'the sprite registry includes the Wally atlas',
);

console.log('wally pixels tests passed');
