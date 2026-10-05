#!/usr/bin/env node
// Phase 1 / step 1 of docs/ARCADE_PIXEL_ART_DIRECTION.md: compile committed
// pixel-art sources into the PNG atlases the existing SpriteAtlas pipeline
// already loads. The source of truth is reviewable TypeScript-adjacent pixel
// data; the PNG is a generated artifact. Encoding is deterministic on purpose
// (fixed zlib level, no timestamp chunks) so a rerun leaves the tree clean and
// CI can assert that the committed PNG still matches its source.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath, pathToFileURL } from 'node:url';

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])), 0);
  return Buffer.concat([length, typeBytes, data, crc]);
}

// RGBA8, non-interlaced, filter type 0 on every scanline. Filter 0 keeps the
// encoder trivially deterministic and the output readable by the existing
// decoder in scripts/audit-assets.mjs; these atlases are small enough that
// adaptive filtering would buy nothing.
export function encodePng(width, height, rgba) {
  if (!Number.isInteger(width) || width <= 0) throw new Error(`invalid width ${width}`);
  if (!Number.isInteger(height) || height <= 0) throw new Error(`invalid height ${height}`);
  const expected = width * height * 4;
  if (rgba.length !== expected) {
    throw new Error(`pixel buffer length ${rgba.length}; expected ${expected} for ${width}x${height}`);
  }

  const rowBytes = width * 4;
  const raw = Buffer.alloc(height * (rowBytes + 1));
  for (let row = 0; row < height; row += 1) {
    raw[row * (rowBytes + 1)] = 0;
    Buffer.from(rgba.buffer, rgba.byteOffset + row * rowBytes, rowBytes).copy(
      raw,
      row * (rowBytes + 1) + 1,
    );
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const idat = zlib.deflateSync(raw, { level: 9 });

  return Buffer.concat([
    PNG_SIGNATURE,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// '#rgb', '#rrggbb', '#rrggbbaa' and the literal 'transparent'. Palettes are
// authored by hand, so a malformed entry must fail loudly with its index
// rather than silently render as black.
export function parseColor(value, context) {
  if (value === 'transparent') return [0, 0, 0, 0];
  if (typeof value !== 'string' || value[0] !== '#') {
    throw new Error(`${context}: invalid colour ${JSON.stringify(value)}`);
  }
  const hex = value.slice(1);
  if (![3, 6, 8].includes(hex.length) || !/^[0-9a-fA-F]+$/.test(hex)) {
    throw new Error(`${context}: invalid colour ${JSON.stringify(value)}`);
  }
  const expand = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex;
  const channel = (index) => parseInt(expand.slice(index * 2, index * 2 + 2), 16);
  return [channel(0), channel(1), channel(2), expand.length === 8 ? channel(3) : 255];
}

export function parsePalette(palette, context) {
  if (!Array.isArray(palette) || palette.length === 0) {
    throw new Error(`${context}: palette must be a non-empty array`);
  }
  if (palette.length > ALPHABET.length) {
    throw new Error(
      `${context}: palette has ${palette.length} entries; the index alphabet holds ${ALPHABET.length}`,
    );
  }
  return palette.map((value, index) => parseColor(value, `${context} palette[${index}]`));
}

// Index alphabet: '.' is always transparent (palette slot 0 by convention),
// then '0'-'9', 'a'-'z' and 'A'-'Z' address the rest. Readable in a diff
// without a legend, and wide enough for the full flattened arcade palette
// (ten ramps of four steps, plus transparent and ink) to be addressed from a
// single sprite source.
const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function paletteIndexFor(char, context) {
  if (char === '.') return 0;
  const index = ALPHABET.indexOf(char);
  if (index < 0) throw new Error(`${context}: unknown pixel character ${JSON.stringify(char)}`);
  return index;
}

// A frame is an array of equal-length strings. Dimensions are asserted against
// the atlas grid rather than inferred, so a mis-drawn row fails at build time
// with the frame id instead of shifting every later frame in the sheet.
export function parseFrame(rows, width, height, palette, context) {
  if (!Array.isArray(rows) || rows.length !== height) {
    throw new Error(`${context}: expected ${height} rows, received ${Array.isArray(rows) ? rows.length : 'non-array'}`);
  }
  const pixels = new Uint8Array(width * height * 4);
  rows.forEach((row, y) => {
    // Rows shorter than the frame are padded with transparent. Sprites are
    // mostly empty space at the edges, so requiring hand-counted trailing dots
    // would make the sources harder to read and to diff for no benefit. A row
    // that is too long is still an error: that means a mis-drawn pixel.
    if (typeof row !== 'string' || row.length > width) {
      throw new Error(`${context}: row ${y} has length ${typeof row === 'string' ? row.length : 'n/a'}; expected at most ${width}`);
    }
    for (let x = 0; x < row.length; x += 1) {
      const slot = paletteIndexFor(row[x], `${context} row ${y} col ${x}`);
      if (slot >= palette.length) {
        throw new Error(`${context} row ${y} col ${x}: palette index ${slot} is out of range (${palette.length} entries)`);
      }
      const [r, g, b, a] = palette[slot];
      const offset = (y * width + x) * 4;
      pixels[offset] = r;
      pixels[offset + 1] = g;
      pixels[offset + 2] = b;
      pixels[offset + 3] = a;
    }
  });
  return pixels;
}

function blit(sheet, sheetWidth, frame, frameWidth, frameHeight, originX, originY) {
  for (let y = 0; y < frameHeight; y += 1) {
    const from = y * frameWidth * 4;
    const to = ((originY + y) * sheetWidth + originX) * 4;
    sheet.set(frame.subarray(from, from + frameWidth * 4), to);
  }
}

// A sprite source describes one atlas: the grid it packs into and its frames in
// manifest order. Frames are placed left-to-right, top-to-bottom, which is the
// same order buildGridAtlas assigns frame coordinates in — the manifest stays
// the single source of truth for what each slot means.
export function renderSheet(source, context) {
  const { width, height, frameWidth, frameHeight, columns, frames } = source;
  const palette = parsePalette(source.palette, context);

  if (width % frameWidth !== 0 || height % frameHeight !== 0) {
    throw new Error(`${context}: sheet ${width}x${height} is not a whole number of ${frameWidth}x${frameHeight} frames`);
  }
  const capacity = columns * Math.floor(height / frameHeight);
  if (frames.length > capacity) {
    throw new Error(`${context}: ${frames.length} frames exceed the ${capacity}-slot grid`);
  }

  const sheet = new Uint8Array(width * height * 4);
  frames.forEach((frame, index) => {
    const pixels = parseFrame(frame.rows, frameWidth, frameHeight, palette, `${context} frame "${frame.id}"`);
    const originX = (index % columns) * frameWidth;
    const originY = Math.floor(index / columns) * frameHeight;
    blit(sheet, width, pixels, frameWidth, frameHeight, originX, originY);
  });

  return { width, height, rgba: sheet, frameCount: frames.length };
}

export function buildAsset(source, context) {
  const sheet = renderSheet(source, context);
  return { bytes: encodePng(sheet.width, sheet.height, sheet.rgba), sheet };
}

// Writes only when the bytes actually differ, so a no-op rebuild leaves mtimes
// alone and the determinism check stays honest about what changed.
export function writeIfChanged(filePath, bytes) {
  let current;
  try {
    current = fs.readFileSync(filePath);
  } catch {
    current = undefined;
  }
  if (current && current.equals(bytes)) return false;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, bytes);
  return true;
}

const REPO_ROOT = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const SOURCE_DIR = path.join(REPO_ROOT, '.test-dist', 'src', 'game', 'presentation', 'atlas', 'pixels');

async function main() {
  const checkOnly = process.argv.includes('--check');
  let index;
  try {
    index = await import(pathToFileURL(path.join(SOURCE_DIR, 'index.js')).href);
  } catch (error) {
    console.error(
      `[sprites] could not load compiled pixel sources from ${SOURCE_DIR}. ` +
        `Run "tsc -p tsconfig.test.json" first. (${error instanceof Error ? error.message : String(error)})`,
    );
    process.exit(1);
    return;
  }

  const sources = index.SPRITE_SOURCES;
  if (!Array.isArray(sources)) {
    console.error('[sprites] SPRITE_SOURCES must be an array');
    process.exit(1);
    return;
  }
  // An empty registry is the expected state until the first sprite source
  // lands (phase 1 step 4). The pipeline is still exercised by its own test
  // suite, so this is a clean no-op rather than a failure.
  if (sources.length === 0) {
    console.log('[sprites] no pixel sources registered yet; nothing to build');
    return;
  }

  let failures = 0;
  let stale = 0;
  for (const source of sources) {
    const target = path.join(REPO_ROOT, source.output);
    let built;
    try {
      built = buildAsset(source, `[${source.output}]`);
    } catch (error) {
      console.error(`[${source.output}] ${error instanceof Error ? error.message : String(error)}`);
      failures += 1;
      continue;
    }

    if (checkOnly) {
      let current;
      try {
        current = fs.readFileSync(target);
      } catch {
        current = undefined;
      }
      if (!current || !current.equals(built.bytes)) {
        console.error(`[${source.output}] generated PNG differs from the committed file; run "npm run sprites:build"`);
        stale += 1;
        continue;
      }
      console.log(`[sprites] OK ${source.output} is up to date (${built.sheet.frameCount} frames)`);
      continue;
    }

    const changed = writeIfChanged(target, built.bytes);
    console.log(
      `[sprites] ${changed ? 'wrote' : 'unchanged'} ${source.output} ` +
        `(${built.sheet.width}x${built.sheet.height}, ${built.sheet.frameCount} frames)`,
    );
  }

  if (failures > 0 || stale > 0) process.exit(1);
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  main();
}
