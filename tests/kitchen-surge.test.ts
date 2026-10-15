import { dispelRoomBoss } from '../src/game/adventure/RoomBossHazard';
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
  if (rerouted) adventure = dispelRoomBoss(setRoomSwitch(adventure, 'kitchen', 'power-rerouted', true), 'kitchen');
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

void test('arms into its quiet window, moving the clock forward only', () => {
  const setup = kitchenSetup('surge-arm', true);
  const armed = stepAdventureExploration(setup.session, setup.adventure, 16);
  equal(isKitchenSurgeArmed(armed.adventure), true, 'overload arms the surge');
  equal(armed.session.elapsedMs >= setup.session.elapsedMs, true, 'arming never moves the clock backward');
  equal(armed.session.elapsedMs % KITCHEN_SURGE.cycleMs, 0, 'the first cycle opens with its quiet window');
  equal(resolveKitchenSurge(armed.adventure, armed.session.elapsedMs).phase, 'safe', 'no warning yet');
  for (let t = 0; t < KITCHEN_SURGE.safeMs + KITCHEN_SURGE.telegraphMs; t += 50) {
    equal(resolveKitchenSurge(armed.adventure, armed.session.elapsedMs + t).dangerous, false, `no danger ${t}ms after arming`);
  }
  equal(resolveKitchenSurge(armed.adventure, armed.session.elapsedMs + KITCHEN_SURGE.safeMs).phase, 'telegraph', 'every surge is telegraphed');
  equal(resolveKitchenSurge(armed.adventure, armed.session.elapsedMs + KITCHEN_SURGE.safeMs + KITCHEN_SURGE.telegraphMs + 1).dangerous, true, 'the surge follows its warning');
});

void test('reading the microwave text that overloads the circuit is safe', () => {
  // The overload can fire anywhere inside the microwave's reach (x 54..74);
  // reading its text and looking up takes about 1.6 s.
  for (let triggerX = 54; triggerX <= 74; triggerX += 2) {
    const setup = kitchenSetup(`surge-read-${triggerX}`, true);
    let session = moveTo(setup.session, triggerX);
    let adventure = setup.adventure;
    for (let t = 0; t < 1_800; t += 1000 / 30) {
      const stepped = stepAdventureExploration(session, adventure, 1000 / 30);
      equal(stepped.session.combat.hp, session.combat.hp, `Wally reading at x ${triggerX} is safe ${Math.round(t)}ms after the overload`);
      session = stepped.session;
      adventure = stepped.adventure;
    }
  }
});

void test('a grounded Wally is hit, a jumping Wally clears the surge', () => {
  const setup = kitchenSetup('surge-hit', true);
  const armed = stepAdventureExploration(setup.session, setup.adventure, 16);
  const atFront = frontAt(armed.session.elapsedMs, 86);

  const grounded = stepAdventureExploration(moveTo({ ...armed.session, elapsedMs: atFront }, 86), armed.adventure, 0);
  equal(grounded.session.combat.hp, setup.session.combat.hp - 1, 'grounded Wally loses one heart');
  equal(grounded.events.some(event => event.type === 'KITCHEN_SURGE_HIT'), true, 'hit is reported for persistence');

  const airborne = stepAdventureExploration(moveTo({ ...armed.session, elapsedMs: atFront }, 86, false), armed.adventure, 0);
  equal(airborne.session.combat.hp, setup.session.combat.hp, 'jumping over the surge avoids damage');
});

void test('never reaches the entry spawn or the breaker', () => {
  const setup = kitchenSetup('surge-safe-zones', true);
  const armed = stepAdventureExploration(setup.session, setup.adventure, 16);
  for (let t = 0; t < KITCHEN_SURGE.cycleMs; t += 10) {
    const surge = resolveKitchenSurge(armed.adventure, armed.session.elapsedMs + t);
    equal(isPlayerHitByKitchenSurge({ x: 14, grounded: true }, surge), false, `entry spawn is safe at ${t}ms`);
    for (const [from, to] of [[54, 74], [99, 116]]) {
      for (let x = from; x <= to; x += 1) {
        equal(isPlayerHitByKitchenSurge({ x, grounded: true }, surge), false, `microwave/breaker reach x ${x} is safe at ${t}ms`);
      }
    }
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
