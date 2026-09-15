export type SeededRandomResult = {
  state: number;
  value: number;
};

const FALLBACK_NON_ZERO_SEED = 0x6d2b79f5;

export function seedFromString(value: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  const normalized = hash >>> 0;
  return normalized === 0 ? FALLBACK_NON_ZERO_SEED : normalized;
}

export function nextSeededRandom(state: number): SeededRandomResult {
  let x = normalizeSeed(state);
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  const next = x >>> 0;
  return { state: next === 0 ? FALLBACK_NON_ZERO_SEED : next, value: next / 0x1_0000_0000 };
}

export function seededRange(state: number, min: number, max: number): SeededRandomResult {
  const next = nextSeededRandom(state);
  return { state: next.state, value: min + (max - min) * next.value };
}

export function seededIndex(state: number, length: number): { state: number; index: number } {
  if (!Number.isInteger(length) || length <= 0) throw new Error('seededIndex requires a positive integer length.');
  const next = nextSeededRandom(state);
  return { state: next.state, index: Math.min(length - 1, Math.floor(next.value * length)) };
}

function normalizeSeed(value: number): number {
  if (!Number.isFinite(value)) return FALLBACK_NON_ZERO_SEED;
  const normalized = Math.trunc(value) >>> 0;
  return normalized === 0 ? FALLBACK_NON_ZERO_SEED : normalized;
}
