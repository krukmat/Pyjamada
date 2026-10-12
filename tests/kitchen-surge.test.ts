import { equal, test } from './assert';
import {
  applyFalseEscape,
  applyFirstVisitRecovery,
  stepAdventureExploration,
} from '../src/game/adventure/AdventureExplorationRuntime';
import {
  createAdventureState,
  createRoomPersistentState,
  setRoomSwitch,
  type AdventureState,
} from '../src/game/adventure/AdventureState';
import {
  KITCHEN_SURGE,
  isKitchenSurgeArmed,
  isPlayerHitByKitchenSurge,
  resolveKitchenSurge,
} from '../src/game/adventure/KitchenSurgeHazard';
import { createHauntedInputState } from '../src/game/haunted/HauntedInput';
import { createHauntedSession, type HauntedSessionState } from '../src/game/haunted/HauntedSessionRuntime';

function preparedSession(runId: string): HauntedSessionState {
  const base = createHauntedSession(runId);
  return {
    ...base,
    domestic: {
      ...base.domestic,
      wallyState: 'normal',
      flags: { ...base.domestic.flags, dressed: true },
      collected: ['keys'],
      objectStates: { ...base.domestic.objectStates, wardrobe: 'used', keys: 'collected' },
      interactionCounts: { ...base.domestic.interactionCounts, wardrobe: 1, keys: 1 },
    },
    objective: { phase: 'completed' },
  };
}

function kitchenSetup(runId: string, overloaded: boolean, rerouted = false) {
  const escaped = applyFalseEscape(preparedSession(runId), createAdventureState());
  let adventure: AdventureState = {
    ...escaped.adventure,
    currentRoom: 'kitchen',
    currentEntry: 'kitchen-from-living-room',
    visitedRooms: [...escaped.adventure.visitedRooms, 'kitchen'],
    rooms: { ...escaped.adventure.rooms, kitchen: createRoomPersistentState() },
  };
  if (overloaded) adventure = setRoomSwitch(adventure, 'kitchen', 'circuit-overloaded', true);
  if (rerouted) adventure = setRoomSwitch(adventure, 'kitchen', 'power-rerouted', true);
  return { session: moveTo({ ...escaped.session, elapsedMs: 1_234 }, 64), adventure };
}

function moveTo(session: HauntedSessionState, x: number, grounded = true): HauntedSessionState {
  return {
    ...session,
    player: { ...session.player, x, y: grounded ? 104 : 80, vx: 0, vy: grounded ? 0 : -10, grounded, facing: 'right' },
    domestic: { ...session.domestic, player: { ...session.domestic.player, x: Math.round(x) } },
    input: createHauntedInputState(),
  };
}

/** Elapsed time at which the surge front sits on x during the first armed cycle. */
function frontAt(armedAtMs: number, x: number): number {
  const progress = (KITCHEN_SURGE.sourceX - x) / (KITCHEN_SURGE.sourceX - KITCHEN_SURGE.targetX);
  return armedAtMs + KITCHEN_SURGE.safeMs + KITCHEN_SURGE.telegraphMs + Math.round(progress * KITCHEN_SURGE.travelMs);
}

void test('stays calm before the overload and after the reroute', () => {
  for (const [overloaded, rerouted] of [[false, false], [true, true]] as const) {
    const setup = kitchenSetup('surge-calm', overloaded, rerouted);
    const stepped = stepAdventureExploration(setup.session, setup.adventure, 5_000);
    equal(isKitchenSurgeArmed(stepped.adventure), false, 'surge does not arm outside the overload window');
    equal(stepped.session.elapsedMs, setup.session.elapsedMs, 'kitchen clock stays frozen without a live surge');
    equal(stepped.session.combat.hp, setup.session.combat.hp, 'no damage without a live surge');
  }
});

void test('arms on a cycle boundary with a full warning before the first surge', () => {
  const setup = kitchenSetup('surge-arm', true);
  const armed = stepAdventureExploration(setup.session, setup.adventure, 16);
  equal(isKitchenSurgeArmed(armed.adventure), true, 'overload arms the surge');
  equal(armed.session.elapsedMs % KITCHEN_SURGE.cycleMs, 0, 'arming aligns to a cycle boundary');
  for (let t = 0; t < KITCHEN_SURGE.safeMs + KITCHEN_SURGE.telegraphMs; t += 50) {
    equal(resolveKitchenSurge(armed.adventure, armed.session.elapsedMs + t).dangerous, false, `no danger ${t}ms after arming`);
  }
  equal(resolveKitchenSurge(armed.adventure, armed.session.elapsedMs + KITCHEN_SURGE.safeMs).phase, 'telegraph', 'warning precedes every surge');
});

void test('a grounded Wally is hit, a jumping Wally clears the surge', () => {
  const setup = kitchenSetup('surge-hit', true);
  const armed = stepAdventureExploration(setup.session, setup.adventure, 16);
  const atFront = frontAt(armed.session.elapsedMs, 64);

  const grounded = stepAdventureExploration(moveTo({ ...armed.session, elapsedMs: atFront }, 64), armed.adventure, 0);
  equal(grounded.session.combat.hp, setup.session.combat.hp - 1, 'grounded Wally loses one heart');
  equal(grounded.events.some(event => event.type === 'KITCHEN_SURGE_HIT'), true, 'hit is reported for persistence');

  const airborne = stepAdventureExploration(moveTo({ ...armed.session, elapsedMs: atFront }, 64, false), armed.adventure, 0);
  equal(airborne.session.combat.hp, setup.session.combat.hp, 'jumping over the surge avoids damage');
});

void test('never reaches the entry spawn or the breaker', () => {
  const setup = kitchenSetup('surge-safe-zones', true);
  const armed = stepAdventureExploration(setup.session, setup.adventure, 16);
  for (let t = 0; t < KITCHEN_SURGE.cycleMs; t += 10) {
    const surge = resolveKitchenSurge(armed.adventure, armed.session.elapsedMs + t);
    equal(isPlayerHitByKitchenSurge({ x: 14, grounded: true }, surge), false, `entry spawn is safe at ${t}ms`);
    equal(isPlayerHitByKitchenSurge({ x: 108, grounded: true }, surge), false, `breaker is safe at ${t}ms`);
  }
});

void test('first visit to a room restores one heart, capped', () => {
  const setup = kitchenSetup('first-visit', false);
  const hurt = { ...setup.session, combat: { ...setup.session.combat, hp: 1 } };
  const before = { ...setup.adventure, visitedRooms: setup.adventure.visitedRooms.filter(room => room !== 'bathroom') };
  equal(applyFirstVisitRecovery(hurt, before, 'bathroom').combat.hp, 2, 'new room heals one heart');
  equal(applyFirstVisitRecovery(hurt, before, 'kitchen').combat.hp, 1, 'revisiting does not heal');
  equal(applyFirstVisitRecovery(setup.session, before, 'bathroom').combat.hp, setup.session.combat.maxHp, 'healing is capped');
});

console.log('kitchen surge tests passed');
