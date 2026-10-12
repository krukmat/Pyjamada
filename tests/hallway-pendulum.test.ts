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

void test('stays calm before the clock and after reaching the Living Room', () => {
  for (const [inspected, visited] of [[false, false], [true, true]] as const) {
    const s = setup('pendulum-calm', inspected, visited);
    const stepped = stepAdventureExploration(s.session, s.adventure, 5_000);
    equal(isHallwayPendulumArmed(stepped.adventure), false, 'pendulum does not arm outside its window');
    equal(stepped.session.elapsedMs, s.session.elapsedMs, 'hallway clock stays frozen without the pendulum');
  }
});

void test('starts raised, so Wally at the clock has the whole hold to move away', () => {
  const s = setup('pendulum-arm', true);
  const armed = stepAdventureExploration(s.session, s.adventure, 16);
  equal(isHallwayPendulumArmed(armed.adventure), true, 'inspecting the clock arms the pendulum');
  equal(armed.session.elapsedMs % P.cycleMs, 0, 'arming aligns to a cycle boundary');
  for (let t = 0; t < P.holdMs; t += 50) {
    equal(resolveHallwayPendulum(armed.adventure, armed.session.elapsedMs + t).dangerous, false, `raised and harmless ${t}ms after arming`);
  }
  equal(resolveHallwayPendulum(armed.adventure, armed.session.elapsedMs + P.holdMs - 100).phase, 'dropping', 'it visibly drops before sweeping');
});

void test('standing in the sweep is hit, and jumping does not help', () => {
  const s = setup('pendulum-hit', true);
  const armed = stepAdventureExploration(s.session, s.adventure, 16);
  const midSweep = armed.session.elapsedMs + P.holdMs + P.sweepMs / 2;
  for (const grounded of [true, false]) {
    const session = { ...armed.session, elapsedMs: midSweep, player: { ...armed.session.player, x: 64, grounded, y: grounded ? 104 : 90 } };
    const stepped = stepAdventureExploration(session, armed.adventure, 0);
    equal(stepped.session.combat.hp, s.session.combat.hp - 1, `the bob hits Wally (${grounded ? 'grounded' : 'airborne'})`);
  }
});

void test('a well-timed run crosses the corridor without a hit', () => {
  const s = setup('pendulum-cross', true);
  const armed = stepAdventureExploration(s.session, s.adventure, 16);
  // Wait left of the arc; start running the moment it rises at the right end.
  const start = armed.session.elapsedMs + P.holdMs + P.sweepMs;
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
