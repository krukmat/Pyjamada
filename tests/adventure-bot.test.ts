import { deepEqual, equal, test } from './assert';
import { encodeAdventureGameSession } from '../src/game/adventure/AdventureSessionCodec';
import { isAdventureEndingComplete } from '../src/game/adventure/AdventureEnding';
import { ACTIVE_ROOM_IDS } from '../src/game/adventure/RoomRegistry';
import { createBotStart, RandomBot, RouteBot, runBot, type BotRunResult } from './support/AdventureBot';

const ROUTE_OPTIONS = { maxGameMs: 20 * 60_000, stallMs: 120_000 };

function summary(result: BotRunResult) {
  return {
    outcome: result.outcome,
    gameTimeMs: result.gameTimeMs,
    hits: result.hits,
    deaths: result.deaths,
    save: encodeAdventureGameSession({ schemaVersion: 3, haunted: result.world.session, adventure: result.world.adventure }),
  };
}

const route = runBot(createBotStart('qa-bot-route'), new RouteBot(800), ROUTE_OPTIONS);

void test('QA route bot plays from the false escape to the completed ending', () => {
  equal(route.outcome, 'completed', `route bot finishes the adventure (${route.diagnostic})`);
  equal(isAdventureEndingComplete(route.world.adventure), true, 'ending is complete');
  equal(route.deaths, 0, 'a bot that sees danger 800ms ahead never dies');
  deepEqual(route.violations, [], 'route run keeps every gameplay invariant');
  for (const room of ACTIVE_ROOM_IDS) {
    equal(route.roomEntries[room] !== undefined, true, `route reaches ${room}`);
  }
});

void test('QA route bot without dodging never softlocks or breaks invariants', () => {
  const result = runBot(createBotStart('qa-bot-no-dodge'), new RouteBot(0), ROUTE_OPTIONS);
  equal(result.outcome === 'stuck' || result.outcome === 'timeout', false, `no softlock (${result.diagnostic})`);
  deepEqual(result.violations, [], 'no-dodge run keeps every gameplay invariant');
});

void test('QA bot runs are deterministic', () => {
  const first = runBot(createBotStart('qa-bot-determinism'), new RouteBot(400), ROUTE_OPTIONS);
  const second = runBot(createBotStart('qa-bot-determinism'), new RouteBot(400), ROUTE_OPTIONS);
  deepEqual(summary(second), summary(first), 'same start and policy reproduce the same run');
});

void test('QA random fuzz from every room entry keeps gameplay invariants', () => {
  for (const room of ACTIVE_ROOM_IDS) {
    const start = route.roomEntries[room];
    if (!start) throw new Error(`Route bot did not reach ${room}.`);
    for (let seed = 0; seed < 25; seed += 1) {
      const result = runBot(start, new RandomBot(`fuzz-${room}-${seed}`), { maxGameMs: 45_000 });
      deepEqual(result.violations, [], `random run ${room}#${seed} keeps every gameplay invariant`);
    }
  }
});
