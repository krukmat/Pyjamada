import { test } from 'node:test';
import assert from 'node:assert/strict';
import zlib from 'node:zlib';
import { crc32, decodePngBuffer, auditManifestAgainstDecodedPng, auditAssetBytes } from './audit-assets.mjs';

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function pngChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([length, typeBuf, data, crc]);
}

function encodeMinimalPng(width, height) {
  const rowBytes = width * 4;
  const raw = Buffer.alloc((rowBytes + 1) * height, 0);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  return Buffer.concat([
    PNG_SIGNATURE,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function fixtureManifest(overrides = {}) {
  return {
    id: 'fixture',
    width: 16,
    height: 16,
    frames: [{ id: 'idle-0', x: 0, y: 0, width: 8, height: 16, anchorX: 4, anchorY: 15 }],
    clips: [{ id: 'idle', loop: 'loop', frames: [{ frameId: 'idle-0', durationMs: 100 }] }],
    ...overrides,
  };
}

function fixtureValidator(manifest) {
  const errors = [];
  if (manifest.frames.some((frame, index) => manifest.frames.findIndex((other) => other.id === frame.id) !== index)) {
    errors.push(`atlas ${manifest.id}: duplicate frame id`);
  }
  manifest.frames.forEach((frame) => {
    if (frame.x + frame.width > manifest.width || frame.y + frame.height > manifest.height) {
      errors.push(`atlas ${manifest.id}: frame ${frame.id} is outside atlas bounds`);
    }
  });
  return errors;
}

test('decodePngBuffer reads real width/height from a minimal well-formed PNG', () => {
  const decoded = decodePngBuffer(encodeMinimalPng(16, 16));
  assert.equal(decoded.width, 16);
  assert.equal(decoded.height, 16);
});

test('decodePngBuffer rejects a corrupt signature', () => {
  assert.throws(() => decodePngBuffer(Buffer.from([1, 2, 3, 4])), /invalid PNG signature/);
});

test('decodePngBuffer rejects a tampered chunk CRC', () => {
  const bytes = encodeMinimalPng(16, 16);
  const tampered = Buffer.from(bytes);
  tampered[tampered.length - 5] ^= 0xff; // flip a byte inside the IEND CRC
  assert.throws(() => decodePngBuffer(tampered), /CRC mismatch/);
});

test('auditManifestAgainstDecodedPng passes when the manifest matches the real PNG', () => {
  const manifest = fixtureManifest();
  const errors = auditManifestAgainstDecodedPng(manifest, { width: 16, height: 16 }, fixtureValidator);
  assert.deepEqual(errors, []);
});

test('auditManifestAgainstDecodedPng fails on a manifest/PNG dimension mismatch', () => {
  const manifest = fixtureManifest({ width: 32, height: 16 });
  const errors = auditManifestAgainstDecodedPng(manifest, { width: 16, height: 16 }, fixtureValidator);
  assert.ok(errors.some((message) => message.includes('declared size 32x16') && message.includes('16x16')));
});

test('auditManifestAgainstDecodedPng still surfaces an out-of-bounds frame from the manifest validator', () => {
  const manifest = fixtureManifest({ frames: [{ id: 'idle-0', x: 10, y: 0, width: 8, height: 16, anchorX: 4, anchorY: 15 }] });
  const errors = auditManifestAgainstDecodedPng(manifest, { width: 16, height: 16 }, fixtureValidator);
  assert.ok(errors.some((message) => message.includes('outside atlas bounds')));
});

test('auditAssetBytes reports the asset path alongside a decode failure', () => {
  const errors = auditAssetBytes('assets/game/fixture.png', fixtureManifest(), Buffer.from('not a png'), fixtureValidator);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /^\[assets\/game\/fixture\.png\] /);
});

test('auditAssetBytes reports the asset path alongside a real dimension mismatch', () => {
  const manifest = fixtureManifest({ width: 32, height: 32 });
  const errors = auditAssetBytes('assets/game/fixture.png', manifest, encodeMinimalPng(16, 16), fixtureValidator);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /^\[assets\/game\/fixture\.png\] atlas fixture: declared size 32x32 does not match the decoded PNG \(16x16\)/);
});

test('auditAssetBytes reports no errors for a matching manifest and real PNG', () => {
  const errors = auditAssetBytes('assets/game/fixture.png', fixtureManifest(), encodeMinimalPng(16, 16), fixtureValidator);
  assert.deepEqual(errors, []);
});
