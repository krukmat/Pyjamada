import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  buildAsset,
  encodePng,
  paletteIndexFor,
  parseColor,
  parseFrame,
  parsePalette,
  renderSheet,
  writeIfChanged,
} from './generate-sprites.mjs';
import { decodePngBuffer } from './audit-assets.mjs';

const TINY_SOURCE = {
  output: 'assets/game/test/tiny.png',
  width: 4,
  height: 4,
  frameWidth: 2,
  frameHeight: 2,
  columns: 2,
  palette: ['transparent', '#ff0000', '#00ff00'],
  frames: [
    { id: 'a', rows: ['1.', '.1'] },
    { id: 'b', rows: ['22', '22'] },
    { id: 'c', rows: ['.2', '1.'] },
  ],
};

test('parseColor handles the supported notations', () => {
  assert.deepEqual(parseColor('transparent', 'ctx'), [0, 0, 0, 0]);
  assert.deepEqual(parseColor('#f00', 'ctx'), [255, 0, 0, 255]);
  assert.deepEqual(parseColor('#1a2b3c', 'ctx'), [26, 43, 60, 255]);
  assert.deepEqual(parseColor('#1a2b3c80', 'ctx'), [26, 43, 60, 128]);
});

test('parseColor rejects malformed entries with context', () => {
  assert.throws(() => parseColor('ff0000', 'wally palette[2]'), /wally palette\[2\]/);
  assert.throws(() => parseColor('#12345', 'ctx'), /invalid colour/);
  assert.throws(() => parseColor('#zzzzzz', 'ctx'), /invalid colour/);
});

test('parsePalette rejects an empty palette and one larger than the alphabet', () => {
  assert.throws(() => parsePalette([], 'ctx'), /non-empty/);
  assert.throws(() => parsePalette(new Array(63).fill('#000'), 'ctx'), /index alphabet/);
  assert.equal(parsePalette(new Array(62).fill('#000'), 'ctx').length, 62);
  assert.equal(parsePalette(['transparent', '#fff'], 'ctx').length, 2);
});

test('paletteIndexFor maps the dot to transparent and spans digits then letters', () => {
  assert.equal(paletteIndexFor('.', 'ctx'), 0);
  assert.equal(paletteIndexFor('0', 'ctx'), 0);
  assert.equal(paletteIndexFor('9', 'ctx'), 9);
  assert.equal(paletteIndexFor('a', 'ctx'), 10);
  assert.equal(paletteIndexFor('z', 'ctx'), 35);
  assert.equal(paletteIndexFor('A', 'ctx'), 36);
  assert.equal(paletteIndexFor('Z', 'ctx'), 61);
  assert.throws(() => paletteIndexFor('!', 'frame "idle_0" row 3'), /frame "idle_0" row 3/);
});

test('parseFrame writes palette colours into an RGBA buffer', () => {
  const palette = parsePalette(['transparent', '#ff0000'], 'ctx');
  const pixels = parseFrame(['1.', '.1'], 2, 2, palette, 'ctx');
  assert.deepEqual(Array.from(pixels.subarray(0, 4)), [255, 0, 0, 255]);
  assert.deepEqual(Array.from(pixels.subarray(4, 8)), [0, 0, 0, 0]);
  assert.deepEqual(Array.from(pixels.subarray(8, 12)), [0, 0, 0, 0]);
  assert.deepEqual(Array.from(pixels.subarray(12, 16)), [255, 0, 0, 255]);
});

test('parseFrame reports the wrong row count and wrong row width by frame context', () => {
  const palette = parsePalette(['transparent', '#ff0000'], 'ctx');
  assert.throws(
    () => parseFrame(['1.'], 2, 2, palette, 'frame "walk_0"'),
    /frame "walk_0": expected 2 rows/,
  );
  assert.throws(
    () => parseFrame(['1..', '.1'], 2, 2, palette, 'frame "walk_0"'),
    /frame "walk_0": row 0 has length 3/,
  );
});

test('parseFrame rejects a palette index beyond the declared palette', () => {
  const palette = parsePalette(['transparent', '#ff0000'], 'ctx');
  assert.throws(() => parseFrame(['5.', '..'], 2, 2, palette, 'frame "idle_0"'), /out of range/);
});

test('renderSheet packs frames left-to-right, top-to-bottom', () => {
  const sheet = renderSheet(TINY_SOURCE, 'ctx');
  assert.equal(sheet.frameCount, 3);
  const at = (x, y) => Array.from(sheet.rgba.subarray((y * 4 + x) * 4, (y * 4 + x) * 4 + 4));
  // frame "a" at slot 0 -> origin (0,0)
  assert.deepEqual(at(0, 0), [255, 0, 0, 255]);
  // frame "b" at slot 1 -> origin (2,0)
  assert.deepEqual(at(2, 0), [0, 255, 0, 255]);
  // frame "c" at slot 2 -> origin (0,2), wrapping to the second row
  assert.deepEqual(at(1, 2), [0, 255, 0, 255]);
  assert.deepEqual(at(0, 3), [255, 0, 0, 255]);
  // unused slot 3 stays transparent
  assert.deepEqual(at(3, 3), [0, 0, 0, 0]);
});

test('renderSheet rejects a grid that does not divide the sheet', () => {
  assert.throws(
    () => renderSheet({ ...TINY_SOURCE, width: 5 }, 'ctx'),
    /not a whole number/,
  );
});

test('renderSheet rejects more frames than the grid can hold', () => {
  const frames = [...TINY_SOURCE.frames, { id: 'd', rows: ['..', '..'] }, { id: 'e', rows: ['..', '..'] }];
  assert.throws(() => renderSheet({ ...TINY_SOURCE, frames }, 'ctx'), /exceed the 4-slot grid/);
});

test('encodePng emits a PNG the repository asset decoder accepts', () => {
  const { bytes, sheet } = buildAsset(TINY_SOURCE, 'ctx');
  const decoded = decodePngBuffer(bytes);
  assert.equal(decoded.width, sheet.width);
  assert.equal(decoded.height, sheet.height);
  assert.equal(decoded.bitDepth, 8);
  assert.equal(decoded.colorType, 6);
  assert.equal(decoded.interlace, 0);
});

test('encodePng rejects a pixel buffer that does not match the dimensions', () => {
  assert.throws(() => encodePng(2, 2, new Uint8Array(4)), /expected 16 for 2x2/);
});

// The acceptance criterion from docs/ARCADE_PIXEL_ART_DIRECTION.md: a rerun of
// the generator must leave the tree clean, so the same source must encode to
// byte-identical PNGs across independent builds.
test('building the same source twice yields byte-identical PNGs', () => {
  const first = buildAsset(TINY_SOURCE, 'ctx').bytes;
  const second = buildAsset(TINY_SOURCE, 'ctx').bytes;
  assert.ok(first.equals(second), 'expected deterministic encoding');
});

test('a changed pixel changes the encoded bytes', () => {
  const baseline = buildAsset(TINY_SOURCE, 'ctx').bytes;
  const mutated = buildAsset(
    { ...TINY_SOURCE, frames: [{ id: 'a', rows: ['11', '.1'] }, ...TINY_SOURCE.frames.slice(1)] },
    'ctx',
  ).bytes;
  assert.ok(!baseline.equals(mutated), 'expected a pixel edit to change the PNG');
});

test('writeIfChanged writes once and reports no-op on a rerun', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pyjamada-sprites-'));
  try {
    const target = path.join(dir, 'nested', 'tiny.png');
    const bytes = buildAsset(TINY_SOURCE, 'ctx').bytes;
    assert.equal(writeIfChanged(target, bytes), true);
    assert.equal(writeIfChanged(target, bytes), false);
    assert.ok(fs.readFileSync(target).equals(bytes));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
