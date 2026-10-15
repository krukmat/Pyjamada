import { deepEqual, equal, test } from './assert';
import { encodeAdventureGameSession } from '../src/game/adventure/AdventureSessionCodec';
import { isAdventureEndingComplete } from '../src/game/adventure/AdventureEnding';
import { isAdventureExplorationActive } from '../src/game/adventure/AdventureExplorationRuntime';
import { setRoomSwitch } from '../src/game/adventure/AdventureState';
import { armBasementElectricalHazard, BASEMENT_ELECTRICAL_HAZARD } from '../src/game/adventure/BasementElectricalHazard';
import { ACTIVE_ROOM_IDS } from '../src/game/adventure/RoomRegistry';
import { observeRoomThreats } from '../src/game/adventure/RoomThreatObservation';
import {
  BOT_STEP_MS,
  createBotNewGame,
  createBotStart,
  IDLE_ACTION,
  RandomBot,
  RouteBot,
  runBot,
  stepBotWorld,
  type BotAction,
  type BotPolicy,
  type BotRunResult,
  type BotWorld,
} from '../src/game/bot/AdventureBot';
import { GhostHuggerBot, HUMAN_LATENCY_MS, HUMAN_REACTION_MS, HumanBot, IdleBot, type HumanThreatResponse } from '../src/game/bot/HumanBot';
import { explorationIn, THREAT_SESSION } from './support/ThreatScenarios';

function ok(value: unknown, message: string) { if (!value) throw new Error(message); }

const ROUTE_OPTIONS = { maxGameMs: 20 * 60_000, stallMs: 120_000 };
const ROOM_OPTIONS = { maxGameMs: 3 * 60_000, stallMs: 60_000, stopOnRoomExit: true };
const RESPONSES: readonly HumanThreatResponse[] = ['always', 'not-while-reading', 'never'];

function summary(result: BotRunResult) {
  return {
    outcome: result.outcome,
    gameTimeMs: result.gameTimeMs,
    hits: result.hits,
    deaths: result.deaths,
    hitTimesMs: result.hitTimesMs,
    rooms: result.rooms,
    save: encodeAdventureGameSession({ schemaVersion: 3, haunted: result.world.session, adventure: result.world.adventure }),
  };
}

function softlocked(result: BotRunResult): boolean {
  return result.outcome === 'stuck' || result.outcome === 'timeout';
}

function withFullHp(world: BotWorld): BotWorld {
  return { ...world, session: { ...world.session, combat: { ...world.session.combat, hp: world.session.combat.maxHp } } };
}

/** Records every action a policy emits, as the harness applies it. */
class Recorder implements BotPolicy {
  readonly actions: BotAction[] = [];
  constructor(private readonly inner: BotPolicy) {}
  act(world: BotWorld): BotAction {
    const action = this.inner.act(world);
    this.actions.push(action);
    return action;
  }
  describe(): string { return this.inner.describe(); }
  hasGoal(): boolean { return this.inner.hasGoal?.() ?? true; }
  isReading(): boolean { return this.inner.isReading?.() ?? false; }
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
  equal(softlocked(result), false, `no softlock (${result.diagnostic})`);
  deepEqual(result.violations, [], 'no-dodge run keeps every gameplay invariant');
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

void test('HumanBot keeps to one thumb and its first inputs wait for the input latency', () => {
  const runs: Recorder[] = [];
  const bedroom = new Recorder(new HumanBot({ seed: 'thumb-bedroom' }));
  runBot(createBotNewGame('thumb-bedroom'), bedroom, ROOM_OPTIONS);
  runs.push(bedroom);
  for (const room of ['kitchen', 'laboratory'] as const) {
    const recorder = new Recorder(new HumanBot({ seed: `thumb-${room}` }));
    runBot(withFullHp(route.roomEntries[room]!), recorder, ROOM_OPTIONS);
    runs.push(recorder);
  }
  const latencySteps = Math.ceil(HUMAN_LATENCY_MS / BOT_STEP_MS - 1e-9);
  for (const recorder of runs) {
    ok(recorder.actions.length > 100, 'the human-model run plays for a while');
    deepEqual(recorder.actions.slice(0, latencySteps), Array(latencySteps).fill(IDLE_ACTION), 'nothing lands before the input latency');
    recorder.actions.forEach((action, index) => {
      const taps = Number(action.jump) + Number(action.attack) + Number(action.interact);
      ok(taps <= 1, `step ${index}: at most one button tapped`);
      ok(taps === 0 || action.move === 0, `step ${index}: a tap releases the held direction`);
    });
    ok(recorder.actions.some(action => action.attack || action.interact || action.jump), 'the run taps buttons');
  }
});

void test('HumanBot reacts to a threat no sooner than its reaction time plus input latency', () => {
  const armed = armBasementElectricalHazard(setRoomSwitch(explorationIn('basement'), 'basement', 'basement-control-revealed', true), 4_000);
  let world: BotWorld = {
    adventure: armed.adventure,
    session: { ...THREAT_SESSION, elapsedMs: armed.elapsedMs, player: { ...THREAT_SESSION.player, x: 108, vx: 0, grounded: true } },
  };
  // A long hesitation leaves threat reactions as the only thing the bot does.
  const bot = new HumanBot({ startDelayMs: 60_000 });
  let warningStep: number | undefined;
  let reactionStep: number | undefined;
  for (let step = 0; step < 90 && reactionStep === undefined; step += 1) {
    if (warningStep === undefined && observeRoomThreats(world.session, world.adventure).some(threat => threat.phase === 'warning')) warningStep = step;
    const action = bot.act(world);
    if (action.move !== 0) reactionStep = step;
    world = stepBotWorld(world, action).world;
  }
  ok(warningStep !== undefined, 'the discharge warning appears');
  ok(Math.abs(warningStep! * BOT_STEP_MS - BASEMENT_ELECTRICAL_HAZARD.safeLeadMs) <= 2 * BOT_STEP_MS, 'warning appears after the safe lead');
  ok(reactionStep !== undefined, 'the bot steps out of the warned zone');
  const minimum = Math.ceil(HUMAN_REACTION_MS / BOT_STEP_MS - 1e-9) + Math.ceil(HUMAN_LATENCY_MS / BOT_STEP_MS - 1e-9);
  const delay = reactionStep! - warningStep!;
  ok(delay >= minimum && delay <= minimum + 1, `reaction lands ${delay} steps after the warning (expected ${minimum})`);
});

void test('HumanBot, the reader probe and the no-dodge walker never softlock from any room entry', () => {
  for (const room of ACTIVE_ROOM_IDS) {
    if (room === 'bedroom') continue;
    const entry = withFullHp(route.roomEntries[room]!);
    for (const threatResponse of RESPONSES) {
      for (const startDelayMs of [0, 1_000, 2_000]) {
        const result = runBot(entry, new HumanBot({ threatResponse, startDelayMs, seed: `gate-${room}` }), ROOM_OPTIONS);
        const label = `${room} ${threatResponse} +${startDelayMs}ms`;
        equal(softlocked(result), false, `${label}: no softlock (${result.diagnostic})`);
        deepEqual(result.violations, [], `${label}: keeps every gameplay invariant`);
      }
    }
  }
});

void test('the haunted bedroom is played for real: HumanBot escapes and every policy keeps the invariants', () => {
  for (const seed of ['gate-bedroom-a', 'gate-bedroom-b']) {
    for (const threatResponse of RESPONSES) {
      for (const startDelayMs of [0, 1_000, 2_000]) {
        const result = runBot(createBotNewGame(seed), new HumanBot({ threatResponse, startDelayMs, seed }), ROOM_OPTIONS);
        const label = `bedroom ${seed} ${threatResponse} +${startDelayMs}ms`;
        equal(softlocked(result), false, `${label}: no softlock (${result.diagnostic})`);
        deepEqual(result.violations, [], `${label}: keeps every gameplay invariant`);
        if (threatResponse === 'always') {
          equal(result.outcome, 'completed', `${label}: the human model escapes the haunted bedroom (${result.diagnostic})`);
          equal(isAdventureExplorationActive(result.world.adventure), true, `${label}: the App's false escape follows the haunted run`);
          equal(result.world.session.player.x, 24, `${label}: Wally restarts at the false-escape spot`);
        }
      }
    }
    const idle = runBot(createBotNewGame(seed), new IdleBot(), ROOM_OPTIONS);
    equal(idle.outcome, 'died', 'an idle player is eventually caught by the haunting');
    deepEqual(idle.violations, [], 'idle bedroom run keeps every gameplay invariant');
  }
});

void test('room threats are fair to the human model: no deaths, at most one hit per visit, reading spots safe (W1-3)', () => {
  for (const room of ACTIVE_ROOM_IDS) {
    if (room === 'bedroom') continue;
    const entry = withFullHp(route.roomEntries[room]!);
    for (const startDelayMs of [0, 1_000, 2_000]) {
      const human = runBot(entry, new HumanBot({ startDelayMs, seed: `fair-${room}` }), ROOM_OPTIONS);
      equal(human.deaths, 0, `${room} +${startDelayMs}ms: HumanBot never dies in a room entered at full HP`);
      ok(human.hits <= 1, `${room} +${startDelayMs}ms: HumanBot takes at most one hit (${human.hits})`);
      const reader = runBot(entry, new HumanBot({ threatResponse: 'not-while-reading', startDelayMs, seed: `fair-${room}` }), ROOM_OPTIONS);
      equal(reader.hitsAtObjects, 0, `${room} +${startDelayMs}ms: standing at an object to read it is safe`);
    }
  }
});

/** Shortest span in which `maxHp` consecutive hearts were lost. */
function fastestKillChainMs(result: BotRunResult): number {
  const needed = result.world.session.combat.maxHp;
  let fastest = Infinity;
  for (let index = 0; index + needed - 1 < result.hitTimesMs.length; index += 1) {
    fastest = Math.min(fastest, result.hitTimesMs[index + needed - 1] - result.hitTimesMs[index]);
  }
  return fastest;
}

void test('the haunted bedroom is survivable: one Ghost touch costs one heart and idle players get time to read', () => {
  for (const seed of ['gate-bedroom-a', 'gate-bedroom-b', 'gate-bedroom-c']) {
    const hugger = runBot(createBotNewGame(seed), new GhostHuggerBot(), ROOM_OPTIONS);
    ok(fastestKillChainMs(hugger) >= 2_999, `${seed}: walking into Ghosts cannot take three hearts in under 3 s (${fastestKillChainMs(hugger)} ms)`);
    deepEqual(hugger.violations, [], `${seed}: ghost-hugger run keeps every gameplay invariant`);
    const idle = runBot(createBotNewGame(seed), new IdleBot(), ROOM_OPTIONS);
    ok(idle.gameTimeMs >= 25_000, `${seed}: an idle player survives at least 25 s (${idle.gameTimeMs} ms)`);
    for (const startDelayMs of [0, 1_000, 2_000]) {
      const walker = runBot(createBotNewGame(seed), new HumanBot({ threatResponse: 'never', startDelayMs, seed }), ROOM_OPTIONS);
      ok(walker.outcome !== 'died' || walker.gameTimeMs >= 20_000, `${seed} +${startDelayMs}ms: a player who never shoots survives at least 20 s (${walker.gameTimeMs} ms)`);
    }
  }
});

void test('HumanBot plays from a new game without softlocks, deterministically', () => {
  const first = runBot(createBotNewGame('qa-bot-human'), new HumanBot({ seed: 'qa-bot-human' }), ROUTE_OPTIONS);
  const second = runBot(createBotNewGame('qa-bot-human'), new HumanBot({ seed: 'qa-bot-human' }), ROUTE_OPTIONS);
  equal(softlocked(first), false, `no softlock (${first.diagnostic})`);
  deepEqual(first.violations, [], 'human-model run keeps every gameplay invariant');
  ok(Object.keys(first.rooms).length >= 4, 'the run gets well past the bedroom');
  deepEqual(summary(second), summary(first), 'same start and policy reproduce the same run');
});
