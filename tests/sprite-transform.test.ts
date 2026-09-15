import type { AtlasFrame } from '../src/game/presentation/atlas/SpriteAtlas';
import { resolveSpritePlacement } from '../src/game/presentation/atlas/SpriteTransform';

function equal(actual: unknown, expected: unknown, label: string) {
  if (actual !== expected) throw new Error(`${label}: ${actual} !== ${expected}`);
}

function ok(value: unknown, label: string) {
  if (!value) throw new Error(label);
}

const frame: AtlasFrame = {
  id: 'haunted-wally-test',
  x: 0,
  y: 0,
  width: 32,
  height: 48,
  anchorX: 16,
  anchorY: 47,
};

const scale = 2.421875; // representative 390-430dp Android stage scale
const right = resolveSpritePlacement(frame, 120, 252, scale, 'right');
equal(right.drawX, 120 - 16 * scale, 'fractional scale preserves anchored x placement');
equal(right.drawY, 252 - 47 * scale, 'fractional scale preserves anchored y placement');
equal(right.mirror, false, 'right-facing fractional sprite is not mirrored');

const left = resolveSpritePlacement(frame, 120, 252, scale, 'left');
equal(left.drawX, right.drawX, 'left/right use identical anchored draw x before mirroring');
equal(left.drawY, right.drawY, 'left/right use identical anchored draw y');
equal(left.pivotX, 120, 'fractional sprite mirror pivots at the snapped actor x');
ok(left.mirror, 'left-facing fractional sprite requests horizontal mirroring');

let invalidScaleRejected = false;
try {
  resolveSpritePlacement(frame, 120, 252, Number.NaN, 'right');
} catch {
  invalidScaleRejected = true;
}
ok(invalidScaleRejected, 'non-finite scale is rejected');

let fractionalPositionRejected = false;
try {
  resolveSpritePlacement(frame, 120.5, 252, scale, 'right');
} catch {
  fractionalPositionRejected = true;
}
ok(fractionalPositionRejected, 'rendered actor x remains pixel-snapped');

console.log('sprite transform tests passed');
