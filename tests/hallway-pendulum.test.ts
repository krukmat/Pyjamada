import { equal, test } from './assert';
import { applyFalseEscape, stepAdventureExploration } from '../src/game/adventure/AdventureExplorationRuntime';
import { createAdventureState, createRoomPersistentState, markRoomInspected, type AdventureState } from '../src/game/adventure/AdventureState';
import {
  HALLWAY_PENDULUM,
  isHallwayPendulumArmed,
  isPlayerHitByHallwayPendulum,
  resolveHallwayPendulum,
} from '../src/game/adventure/HallwayPendulumHazard';
import { HAUNTED_PLAYER_PHYSICS } from '../src/game/haunted/PlayerPhysics';
import { createHauntedInputState } from '../src/game/haunted/HauntedInput';
import { createHauntedSession, type HauntedSessionState } from '../src/game/haunted/HauntedSessionRuntime';

function ok(value: unknown, message: string) { if (!value) throw new Error(message); }

function setup(runId: string, clockInspected: boolean, livingVisited = false) {
  const base = createHauntedSession(runId);
  const prepared: HauntedSessionState = {
    ...base,
    domestic: { ...base.domestic, wallyState: 'normal', flags: { ...base.domestic.flags, dressed: true }, collected: ['keys'] },
    objective: { phase: 'completed' },
  };
  const escaped = applyFalseEscape(prepared, createAdventureState());
  let adventure: AdventureState = {
    ...escaped.adventure,
    currentRoom: 'hallway',
    currentEntry: 'hallway-from-bedroom',
    visitedRooms: [...escaped.adventure.visitedRooms, 'hallway', ...(livingVisited ? ['living-room' as const] : [])],
    rooms: { ...escaped.adventure.rooms, hallway: createRoomPersistentState() },
  };
  if (clockInspected) adventure = markRoomInspected(adventure, 'hallway', 'backward-clock');
  const session: HauntedSessionState = {
    ...escaped.session,
    elapsedMs: 777,
    player: { ...escaped.session.player, x: 64, y: 104, vx: 0, vy: 0, grounded: true, facing: 'right' },
    input: createHauntedInputState(),
  };
  return { session, adventure };
}

const P = HALLWAY_PENDULUM;

/** Steps once with Wally at `x`; the pendulum only arms once he is clear of the clock. */
function armAt(runId: string, x: number) {
  const s = setup(runId, true);
  return { setup: s, armed: stepAdventureExploration({ ...s.session, player: { ...s.session.player, x } }, s.adventure, 16) };
}
const CLEAR_LEFT = P.clockX - P.clockReach - 1;
const CLEAR_RIGHT = P.clockX + P.clockReach + 1;

void test('stays calm before the clock and after reaching the Living Room', () => {
  for (const [inspected, visited] of [[false, false], [true, true]] as const) {
    const s = setup('pendulum-calm', inspected, visited);
    const stepped = stepAdventureExploration(s.session, s.adventure, 5_000);
    equal(isHallwayPendulumArmed(stepped.adventure), false, 'pendulum does not arm outside its window');
    equal(stepped.session.elapsedMs, s.session.elapsedMs, 'hallway clock stays frozen without the pendulum');
  }
});

void test('waits while Wally reads the clock and arms once he steps clear of it', () => {
  const s = setup('pendulum-wait', true);
  let session = s.session;
  let adventure = s.adventure;
  for (let x = P.clockX - P.clockReach; x <= P.clockX + P.clockReach; x += 2) {
    const stepped = stepAdventureExploration({ ...session, player: { ...session.player, x } }, adventure, 600);
    equal(isHallwayPendulumArmed(stepped.adventure), false, `still unarmed with Wally at x ${x}, inside the clock's reach`);
    session = stepped.session;
    adventure = stepped.adventure;
  }
  for (const x of [CLEAR_LEFT, CLEAR_RIGHT]) {
    equal(isHallwayPendulumArmed(armAt(`pendulum-clear-${x}`, x).armed.adventure), true, `arms with Wally clear of the clock at x ${x}`);
  }
});

void test('arms raised on the door side and swings back after a readable warning', () => {
  const { setup: s, armed } = armAt('pendulum-arm', CLEAR_RIGHT);
  equal(armed.session.elapsedMs >= s.session.elapsedMs, true, 'arming never moves the clock backward');
  const first = resolveHallwayPendulum(armed.adventure, armed.session.elapsedMs);
  equal(first.phase, 'raised', 'it appears raised');
  equal(first.bobX, P.rightX, 'on the door side of the arc');
  ok(P.firstWarningMs >= 1_800, 'the first swing waits at least 1.8 s');
  ok(P.dropMs >= 600, 'every drop is visible for at least 600 ms');
  for (let t = 0; t < P.firstWarningMs; t += 50) {
    equal(resolveHallwayPendulum(armed.adventure, armed.session.elapsedMs + t).dangerous, false, `harmless ${t}ms after arming`);
  }
  equal(resolveHallwayPendulum(armed.adventure, armed.session.elapsedMs + P.firstWarningMs - 100).phase, 'dropping', 'it visibly drops before sweeping');
  equal(resolveHallwayPendulum(armed.adventure, armed.session.elapsedMs + P.firstWarningMs + 1).dangerous, true, 'the sweep follows the warning');
});

function walk(session: HauntedSessionState, adventure: AdventureState, direction: 'left' | 'right', untilX: (x: number) => boolean) {
  let current = session;
  let state = adventure;
  let hit = false;
  for (let step = 0; step < 90 && !untilX(current.player.x) && !hit; step += 1) {
    const stepped = stepAdventureExploration({ ...current, input: { ...createHauntedInputState(), [direction]: true } }, state, 1000 / 30);
    hit = stepped.session.combat.hp < current.combat.hp;
    current = stepped.session;
    state = stepped.adventure;
  }
  return { hit, session: current, adventure: state };
}

void test('a Wally who walks on from the clock to the Living Room door clears the arc before the first swing', () => {
  const { armed } = armAt('pendulum-walk', CLEAR_RIGHT);
  const run = walk(armed.session, armed.adventure, 'right', x => x >= 106);
  equal(run.hit, false, 'walking straight on is safe');
});

void test('stepping back toward the Bedroom escapes the first swing', () => {
  const { armed } = armAt('pendulum-retreat', CLEAR_LEFT);
  let session = armed.session;
  let adventure = armed.adventure;
  for (let t = 0; t < P.firstWarningMs + P.sweepMs + 200; t += 1000 / 30) {
    const left = session.player.x > P.leftX - P.halfWidth - 3;
    const stepped = stepAdventureExploration({ ...session, input: { ...createHauntedInputState(), left } }, adventure, 1000 / 30);
    equal(stepped.session.combat.hp, session.combat.hp, `retreating Wally is safe at ${Math.round(t)}ms`);
    session = stepped.session;
    adventure = stepped.adventure;
  }
});

void test('standing in the sweep is hit, and jumping does not help', () => {
  const { setup: s, armed } = armAt('pendulum-hit', CLEAR_LEFT);
  const midSweep = armed.session.elapsedMs + P.firstWarningMs + P.sweepMs / 2;
  for (const grounded of [true, false]) {
    const session = { ...armed.session, elapsedMs: midSweep, player: { ...armed.session.player, x: 64, grounded, y: grounded ? 104 : 90 } };
    const stepped = stepAdventureExploration(session, armed.adventure, 0);
    equal(stepped.session.combat.hp, s.session.combat.hp - 1, `the bob hits Wally (${grounded ? 'grounded' : 'airborne'})`);
  }
});

void test('a well-timed run crosses the corridor without a hit', () => {
  const { armed } = armAt('pendulum-cross', CLEAR_LEFT);
  // Wait left of the arc; start running the moment it rises at the right end.
  const cycleStart = armed.session.elapsedMs - (armed.session.elapsedMs % P.cycleMs) + P.cycleMs;
  const start = cycleStart + P.holdMs + P.sweepMs;
  let x = P.leftX - P.halfWidth - 1;
  let v = 0;
  for (let t = 0; x < P.rightX + P.halfWidth + 1; t += 10) {
    v = Math.min(HAUNTED_PLAYER_PHYSICS.maxSpeed, v + HAUNTED_PLAYER_PHYSICS.acceleration * 0.01);
    x += v * 0.01;
    const pendulum = resolveHallwayPendulum(armed.adventure, start + t);
    equal(isPlayerHitByHallwayPendulum({ x }, pendulum), false, `crossing run is safe at ${t}ms (x=${x.toFixed(1)})`);
    ok(t < P.holdMs, 'the crossing fits inside the raised window');
  }
});

void test('both room entries are outside its reach', () => {
  const s = setup('pendulum-safe', true);
  const armed = stepAdventureExploration(s.session, s.adventure, 16);
  for (let t = 0; t < P.cycleMs; t += 10) {
    const pendulum = resolveHallwayPendulum(armed.adventure, armed.session.elapsedMs + t);
    equal(isPlayerHitByHallwayPendulum({ x: 14 }, pendulum), false, `Bedroom entry is safe at ${t}ms`);
    equal(isPlayerHitByHallwayPendulum({ x: 108 }, pendulum), false, `Living Room entry is safe at ${t}ms`);
  }
});

console.log('hallway pendulum tests passed');
