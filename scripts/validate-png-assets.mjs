#!/usr/bin/env node
import fs from 'node:fs';
import zlib from 'node:zlib';

const DEFAULT_ASSETS = [
  'assets/game/wally/wally.png',
  'assets/game/objects/bedroom-objects.png',
  'assets/game/fx/domestic-fx.png',
];

const EXPECTED_DIMENSIONS = new Map([
  ['assets/game/wally/wally.png', [240, 168]],
  ['assets/game/objects/bedroom-objects.png', [256, 192]],
  ['assets/game/fx/domestic-fx.png', [128, 64]],
]);

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function channelsForColorType(colorType) {
  switch (colorType) {
    case 0: return 1;
    case 2: return 3;
    case 4: return 2;
    case 6: return 4;
    default: throw new Error(`unsupported PNG color type ${colorType}`);
  }
}

function validatePng(filePath) {
  const bytes = fs.readFileSync(filePath);
  if (bytes.length < 20 || !bytes.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new Error('invalid PNG signature');
  }

  let offset = 8;
  let ihdr;
  const idatParts = [];
  let sawIend = false;

  while (offset < bytes.length) {
    if (offset + 12 > bytes.length) throw new Error(`truncated chunk header at byte ${offset}`);

    const length = bytes.readUInt32BE(offset);
    const type = bytes.toString('ascii', offset + 4, offset + 8);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    const crcOffset = dataEnd;
    const nextOffset = crcOffset + 4;
    if (nextOffset > bytes.length) throw new Error(`truncated ${type} chunk`);

    const typeBytes = bytes.subarray(offset + 4, offset + 8);
    const data = bytes.subarray(dataStart, dataEnd);
    const storedCrc = bytes.readUInt32BE(crcOffset);
    const computedCrc = crc32(Buffer.concat([typeBytes, data]));
    if (storedCrc !== computedCrc) {
      throw new Error(`${type} CRC mismatch: stored=${storedCrc.toString(16)} computed=${computedCrc.toString(16)}`);
    }

    if (type === 'IHDR') {
      if (ihdr) throw new Error('multiple IHDR chunks');
      if (length !== 13) throw new Error(`invalid IHDR length ${length}`);
      ihdr = {
        width: data.readUInt32BE(0),
        height: data.readUInt32BE(4),
        bitDepth: data[8],
        colorType: data[9],
        compression: data[10],
        filter: data[11],
        interlace: data[12],
      };
    } else if (type === 'IDAT') {
      idatParts.push(data);
    } else if (type === 'IEND') {
      if (length !== 0) throw new Error('IEND must be empty');
      sawIend = true;
      if (nextOffset !== bytes.length) throw new Error('bytes found after IEND');
    }

    offset = nextOffset;
  }

  if (!ihdr) throw new Error('missing IHDR');
  if (idatParts.length === 0) throw new Error('missing IDAT');
  if (!sawIend) throw new Error('missing IEND');
  if (ihdr.bitDepth !== 8) throw new Error(`unsupported bit depth ${ihdr.bitDepth}; expected 8`);
  if (ihdr.compression !== 0 || ihdr.filter !== 0 || ihdr.interlace !== 0) {
    throw new Error(`unsupported PNG methods compression=${ihdr.compression} filter=${ihdr.filter} interlace=${ihdr.interlace}`);
  }

  const channels = channelsForColorType(ihdr.colorType);
  const rowBytes = ihdr.width * channels;
  let inflated;
  try {
    inflated = zlib.inflateSync(Buffer.concat(idatParts));
  } catch (error) {
    throw new Error(`zlib inflate failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  const expectedInflated = ihdr.height * (rowBytes + 1);
  if (inflated.length !== expectedInflated) {
    throw new Error(`inflated byte length ${inflated.length}; expected ${expectedInflated}`);
  }

  for (let row = 0; row < ihdr.height; row += 1) {
    const filterType = inflated[row * (rowBytes + 1)];
    if (filterType > 4) throw new Error(`invalid PNG filter ${filterType} on row ${row}`);
  }

  return ihdr;
}

const assets = process.argv.slice(2).length > 0 ? process.argv.slice(2) : DEFAULT_ASSETS;
let failures = 0;

for (const asset of assets) {
  try {
    const meta = validatePng(asset);
    const expected = EXPECTED_DIMENSIONS.get(asset);
    if (expected && (meta.width !== expected[0] || meta.height !== expected[1])) {
      throw new Error(`dimensions ${meta.width}x${meta.height}; expected ${expected[0]}x${expected[1]}`);
    }
    console.log(`[png] OK ${asset} ${meta.width}x${meta.height} colorType=${meta.colorType}`);
  } catch (error) {
    failures += 1;
    console.error(`[png] FAIL ${asset}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (failures > 0) process.exit(1);
