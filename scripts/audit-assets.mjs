#!/usr/bin/env node
// FINDING/A-04: the platform-neutral asset audit decodes each committed PNG
// for real (not a hardcoded, independently-maintained dimension table) and
// cross-checks it against the same atlas manifest the game renders from, so
// a manifest/PNG drift or an invalid frame fails here with the asset path in
// the diagnostic instead of surfacing later as a rendering bug or an
// Android-only packaging failure.
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

function channelsForColorType(colorType) {
  switch (colorType) {
    case 0: return 1;
    case 2: return 3;
    case 4: return 2;
    case 6: return 4;
    default: throw new Error(`unsupported PNG color type ${colorType}`);
  }
}

export function decodePngBuffer(bytes) {
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

export function readPngFile(filePath) {
  return decodePngBuffer(fs.readFileSync(filePath));
}

// The manifest is the single source of truth the game actually renders
// against (frame bounds, references, duplicate IDs already fail here via
// validateSpriteAtlasManifest); this adds the one check that manifest alone
// cannot make: that its declared canvas size matches the real, decoded PNG.
export function auditManifestAgainstDecodedPng(manifest, decoded, validateSpriteAtlasManifest) {
  const errors = validateSpriteAtlasManifest(manifest);
  if (manifest.width !== decoded.width || manifest.height !== decoded.height) {
    errors.push(
      `atlas ${manifest.id}: declared size ${manifest.width}x${manifest.height} does not match the decoded PNG (${decoded.width}x${decoded.height})`,
    );
  }
  return errors;
}

export function auditAssetBytes(assetPath, manifest, bytes, validateSpriteAtlasManifest) {
  let decoded;
  try {
    decoded = decodePngBuffer(bytes);
  } catch (error) {
    return [`[${assetPath}] ${error instanceof Error ? error.message : String(error)}`];
  }
  return auditManifestAgainstDecodedPng(manifest, decoded, validateSpriteAtlasManifest).map(
    (message) => `[${assetPath}] ${message}`,
  );
}

const PRODUCTION_ASSETS = [
  { path: 'assets/game/wally/wally.png', manifestId: 'wally' },
  { path: 'assets/game/objects/bedroom-objects.png', manifestId: 'bedroom-objects' },
  { path: 'assets/game/fx/domestic-fx.png', manifestId: 'domestic-fx' },
];

async function main() {
  const repoRoot = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
  const compiledAtlasDir = path.join(repoRoot, '.test-dist', 'src', 'game', 'presentation', 'atlas');
  let manifestsModule;
  let spriteAtlasModule;
  try {
    manifestsModule = await import(pathToFileURL(path.join(compiledAtlasDir, 'manifests.js')).href);
    spriteAtlasModule = await import(pathToFileURL(path.join(compiledAtlasDir, 'SpriteAtlas.js')).href);
  } catch (error) {
    console.error(
      `[assets] could not load compiled atlas manifests from ${compiledAtlasDir}. ` +
        `Run "tsc -p tsconfig.test.json" first. (${error instanceof Error ? error.message : String(error)})`,
    );
    process.exit(1);
    return;
  }

  const { ALL_GAME_ATLASES } = manifestsModule;
  const { validateSpriteAtlasManifest } = spriteAtlasModule;
  const manifestById = new Map(ALL_GAME_ATLASES.map((manifest) => [manifest.id, manifest]));

  let failures = 0;
  for (const asset of PRODUCTION_ASSETS) {
    const manifest = manifestById.get(asset.manifestId);
    if (!manifest) {
      console.error(`[${asset.path}] no atlas manifest registered for id "${asset.manifestId}"`);
      failures += 1;
      continue;
    }

    let bytes;
    try {
      bytes = fs.readFileSync(path.join(repoRoot, asset.path));
    } catch (error) {
      console.error(`[${asset.path}] ${error instanceof Error ? error.message : String(error)}`);
      failures += 1;
      continue;
    }

    const errors = auditAssetBytes(asset.path, manifest, bytes, validateSpriteAtlasManifest);
    if (errors.length > 0) {
      errors.forEach((message) => console.error(message));
      failures += errors.length;
      continue;
    }
    console.log(`[assets] OK ${asset.path} matches atlas "${manifest.id}" (${manifest.width}x${manifest.height}, ${manifest.frames.length} frames)`);
  }

  if (failures > 0) process.exit(1);
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  main();
}
