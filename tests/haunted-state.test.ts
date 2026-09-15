import { decodeHauntedSession, encodeHauntedSession } from '../src/game/haunted/HauntedSessionCodec';
import { HauntedSaveCoordinator } from '../src/game/haunted/HauntedSaveCoordinator';
import { createHauntedSession, type HauntedSessionState } from '../src/game/haunted/HauntedSessionRuntime';
import { nextSeededRandom, seedFromString } from '../src/game/haunted/SeededRng';
import type { HauntedGameSavePort, HauntedGameSaveReadResult } from '../src/game/ports/HauntedGameSavePort';

function equal(actual: unknown, expected: unknown, label: string) { if (actual !== expected) throw new Error(`${label}: ${String(actual)} !== ${String(expected)}`); }

async function main() {
  const seedA = seedFromString('same-run');
  const seedB = seedFromString('same-run');
  equal(seedA, seedB, 'run id produces stable seed');
  let a = nextSeededRandom(seedA);
  let b = nextSeededRandom(seedB);
  equal(a.value, b.value, 'same seed produces same first random value');
  a = nextSeededRandom(a.state);
  b = nextSeededRandom(b.state);
  equal(a.value, b.value, 'same seed produces reproducible sequence');

  let session = createHauntedSession('codec-run');
  const encoded = encodeHauntedSession(session);
  let decoded = decodeHauntedSession(encoded);
  equal(decoded.status, 'ok', 'haunted codec roundtrip');
  if (decoded.status === 'ok') {
    equal(decoded.state.schemaVersion, 2, 'codec restores v2 state');
    equal(decoded.state.input.left, false, 'held input is not persisted');
    equal(decoded.state.input.attackPressed, false, 'transient action is not persisted');
  }

  const armedSession: HauntedSessionState = {
    ...createHauntedSession('projectile-save'),
    combat: {
      ...createHauntedSession('projectile-save').combat,
      nextAttackAllowedMs: 325,
      nextProjectileId: 2,
      projectiles: [{ id: 1, x: 32, y: 86, vx: 76, damage: 1 }],
    },
  };
  decoded = decodeHauntedSession(encodeHauntedSession(armedSession));
  equal(decoded.status, 'ok', 'codec persists active Dream Spark state');
  if (decoded.status === 'ok') equal(decoded.state.combat.projectiles.length, 1, 'active Dream Spark survives save roundtrip');

  equal(decodeHauntedSession(JSON.stringify({ schemaVersion: 1 })).status, 'invalid', 'legacy schema is intentionally incompatible');
  const invalidRng = JSON.parse(encoded) as Record<string, unknown>;
  invalidRng.rngState = 0;
  equal(decodeHauntedSession(JSON.stringify(invalidRng)).status, 'invalid', 'zero RNG state is rejected');

  const tooManyProjectiles = JSON.parse(encodeHauntedSession(armedSession)) as { combat: { projectiles: unknown[] } };
  tooManyProjectiles.combat.projectiles.push(
    { id: 2, x: 40, y: 86, vx: 76, damage: 1 },
    { id: 3, x: 48, y: 86, vx: 76, damage: 1 },
  );
  equal(decodeHauntedSession(JSON.stringify(tooManyProjectiles)).status, 'invalid', 'codec rejects projectile count above gameplay cap');

  session = {
    ...session,
    domestic: {
      ...session.domestic,
      flags: { ...session.domestic.flags, dressed: true },
      collected: ['keys'],
      interactionCounts: { ...session.domestic.interactionCounts, wardrobe: 1, keys: 1 },
      objectStates: { ...session.domestic.objectStates, wardrobe: 'used', keys: 'collected' },
    },
    objective: { phase: 'escape-ready' },
  };
  decoded = decodeHauntedSession(encodeHauntedSession(session));
  equal(decoded.status, 'ok', 'codec allows haunted escape-ready state without legacy instant completion');

  const fake = new FakeHauntedSavePort();
  const coordinator = new HauntedSaveCoordinator(fake);
  let saved = await coordinator.persist(createHauntedSession('save-run'), 'periodic');
  equal(saved, true, 'first periodic save persists');
  saved = await coordinator.persist({ ...createHauntedSession('save-run'), elapsedMs: 1000 }, 'periodic');
  equal(saved, false, 'rapid periodic save is throttled');
  saved = await coordinator.persist({ ...createHauntedSession('save-run'), elapsedMs: 1200 }, 'interaction');
  equal(saved, true, 'meaningful interaction bypasses periodic throttle');
  equal(fake.saveCount, 2, 'coordinator prevents per-tick storage writes');

  console.log('haunted state tests passed');
}

class FakeHauntedSavePort implements HauntedGameSavePort {
  saveCount = 0;
  state: HauntedSessionState | null = null;
  async read(): Promise<HauntedGameSaveReadResult> { return this.state ? { status: 'ok', state: this.state } : { status: 'none' }; }
  async save(state: HauntedSessionState): Promise<void> { this.saveCount += 1; this.state = state; }
  async clear(): Promise<void> { this.state = null; }
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
