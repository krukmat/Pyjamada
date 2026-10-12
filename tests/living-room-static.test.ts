import { equal, test } from './assert';

function ok(value: unknown, message: string) { if (!value) throw new Error(message); }
import {
  applyFalseEscape,
  stepAdventureExploration,
} from '../src/game/adventure/AdventureExplorationRuntime';
import {
  createAdventureState,
  createRoomPersistentState,
  setRoomSwitch,
  type AdventureState,
} from '../src/game/adventure/AdventureState';
import {
  LIVING_ROOM_STATIC,
  isLivingRoomStaticArmed,
  isPlayerHitByLivingRoomStatic,
  resolveLivingRoomStatic,
} from '../src/game/adventure/LivingRoomStaticHazard';
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

function livingRoomSetup(runId: string, tvOn: boolean, traced = false) {
  const escaped = applyFalseEscape(preparedSession(runId), createAdventureState());
  let adventure: AdventureState = {
    ...escaped.adventure,
    currentRoom: 'living-room',
    currentEntry: 'living-room-from-hallway',
    visitedRooms: [...escaped.adventure.visitedRooms, 'living-room'],
    rooms: { ...escaped.adventure.rooms, 'living-room': createRoomPersistentState() },
  };
  if (tvOn) adventure = setRoomSwitch(adventure, 'living-room', 'tv-on', true);
  if (traced) adventure = setRoomSwitch(adventure, 'living-room', 'source-hum-traced', true);
  return { session: moveTo({ ...escaped.session, elapsedMs: 1_234 }, 109), adventure };
}

function moveTo(session: HauntedSessionState, x: number, grounded = true): HauntedSessionState {
  return {
    ...session,
    player: { ...session.player, x, y: grounded ? 104 : 80, vx: 0, vy: grounded ? 0 : -10, grounded, facing: 'right' },
    domestic: { ...session.domestic, player: { ...session.domestic.player, x: Math.round(x) } },
    input: createHauntedInputState(),
  };
}

const C = LIVING_ROOM_STATIC;
const waveStart = (armedAtMs: number, wave: number) => armedAtMs + C.safeMs + C.telegraphMs + C.waveOffsetsMs[wave];
const frontAt = (armedAtMs: number, wave: number, x: number) =>
  waveStart(armedAtMs, wave) + Math.round(((C.sourceX - x) / (C.sourceX - C.targetX)) * C.travelMs);

void test('stays calm before the TV is on and after the source is traced', () => {
  for (const [tvOn, traced] of [[false, false], [true, true]] as const) {
    const setup = livingRoomSetup('static-calm', tvOn, traced);
    const stepped = stepAdventureExploration(setup.session, setup.adventure, 5_000);
    equal(isLivingRoomStaticArmed(stepped.adventure), false, 'static does not arm outside the TV window');
    equal(stepped.session.elapsedMs, setup.session.elapsedMs, 'living room clock stays frozen without live static');
  }
});

void test('arms on a cycle boundary and warns before the first wave', () => {
  const setup = livingRoomSetup('static-arm', true);
  const armed = stepAdventureExploration(setup.session, setup.adventure, 16);
  equal(isLivingRoomStaticArmed(armed.adventure), true, 'TV static arms the threat');
  equal(armed.session.elapsedMs % C.cycleMs, 0, 'arming aligns to a cycle boundary');
  for (let t = 0; t < C.safeMs + C.telegraphMs; t += 50) {
    equal(resolveLivingRoomStatic(armed.adventure, armed.session.elapsedMs + t).dangerous, false, `no danger ${t}ms after arming`);
  }
});

void test('each of the two waves needs its own jump', () => {
  const setup = livingRoomSetup('static-two-waves', true);
  const armed = stepAdventureExploration(setup.session, setup.adventure, 16);
  for (const wave of [0, 1]) {
    const atFront = frontAt(armed.session.elapsedMs, wave, 84);
    const grounded = stepAdventureExploration(moveTo({ ...armed.session, elapsedMs: atFront }, 84), armed.adventure, 0);
    equal(grounded.session.combat.hp, setup.session.combat.hp - 1, `wave ${wave + 1} hits a grounded Wally at the radio`);
    equal(grounded.events.some(event => event.type === 'LIVING_ROOM_STATIC_HIT'), true, 'hit is reported for persistence');
    const airborne = stepAdventureExploration(moveTo({ ...armed.session, elapsedMs: atFront }, 84, false), armed.adventure, 0);
    equal(airborne.session.combat.hp, setup.session.combat.hp, `jumping clears wave ${wave + 1}`);
  }
  const jumpAirtimeMs = 800;
  ok(C.waveOffsetsMs[1] - C.waveOffsetsMs[0] > jumpAirtimeMs, 'waves are spaced wider than one jump');
});

void test('the television spot and the Hallway entry are never hit', () => {
  const setup = livingRoomSetup('static-safe-zones', true);
  const armed = stepAdventureExploration(setup.session, setup.adventure, 16);
  for (let t = 0; t < C.cycleMs; t += 10) {
    const wave = resolveLivingRoomStatic(armed.adventure, armed.session.elapsedMs + t);
    equal(isPlayerHitByLivingRoomStatic({ x: 109, grounded: true }, wave), false, `television spot is safe at ${t}ms`);
    equal(isPlayerHitByLivingRoomStatic({ x: 14, grounded: true }, wave), false, `Hallway entry is safe at ${t}ms`);
  }
});

console.log('living room static tests passed');
