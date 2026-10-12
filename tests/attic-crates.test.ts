import { equal, test } from './assert';
import { applyFalseEscape, stepAdventureExploration } from '../src/game/adventure/AdventureExplorationRuntime';
import { createAdventureState, createRoomPersistentState, setRoomSwitch, type AdventureState } from '../src/game/adventure/AdventureState';
import {
  ATTIC_CRATES,
  isAtticCratesArmed,
  isPlayerHitByAtticCrate,
  resolveAtticCrates,
} from '../src/game/adventure/AtticCrateHazard';
import { HAUNTED_PLAYER_PHYSICS } from '../src/game/haunted/PlayerPhysics';
import { createHauntedInputState } from '../src/game/haunted/HauntedInput';
import { createHauntedSession, type HauntedSessionState } from '../src/game/haunted/HauntedSessionRuntime';

function ok(value: unknown, message: string) { if (!value) throw new Error(message); }

function setup(runId: string, revealed: boolean) {
  const base = createHauntedSession(runId);
  const prepared: HauntedSessionState = {
    ...base,
    domestic: { ...base.domestic, wallyState: 'normal', flags: { ...base.domestic.flags, dressed: true }, collected: ['keys'] },
    objective: { phase: 'completed' },
  };
  const escaped = applyFalseEscape(prepared, createAdventureState());
  let adventure: AdventureState = {
    ...escaped.adventure,
    currentRoom: 'attic',
    currentEntry: 'attic-from-bathroom',
    visitedRooms: [...escaped.adventure.visitedRooms, 'attic'],
    rooms: { ...escaped.adventure.rooms, attic: createRoomPersistentState() },
  };
  if (revealed) adventure = setRoomSwitch(adventure, 'attic', 'experiment-revealed', true);
  const session: HauntedSessionState = {
    ...escaped.session,
    elapsedMs: 4_321,
    player: { ...escaped.session.player, x: 14, y: 104, vx: 0, vy: 0, grounded: true, facing: 'right' },
    input: createHauntedInputState(),
  };
  return { session, adventure };
}

const C = ATTIC_CRATES;

void test('stays calm once the recording has revealed the experiment', () => {
  const s = setup('crates-calm', true);
  const stepped = stepAdventureExploration(s.session, s.adventure, 5_000);
  equal(isAtticCratesArmed(stepped.adventure), false, 'crates do not arm after the reveal');
  equal(stepped.session.elapsedMs, s.session.elapsedMs, 'attic clock stays frozen without falling crates');
});

void test('every drop shows its shadow before it can hit', () => {
  const s = setup('crates-shadow', false);
  const armed = stepAdventureExploration(s.session, s.adventure, 16);
  equal(isAtticCratesArmed(armed.adventure), true, 'entering the investigation arms the crates');
  equal(armed.session.elapsedMs % C.cycleMs, 0, 'arming aligns to a cycle boundary');
  const firstDanger = C.dropOffsetsMs[0] + C.shadowMs + C.fallMs - C.dangerLeadMs;
  for (let t = 0; t < firstDanger; t += 10) {
    const crates = resolveAtticCrates(armed.adventure, armed.session.elapsedMs + t);
    equal(crates.drops.some(drop => drop.dangerous), false, `nothing can hit ${t}ms after arming`);
  }
  ok(C.shadowMs >= 700, 'shadows last at least 0.7s');
});

void test('a crate hits whoever is under it, even mid-jump; one step aside is safe', () => {
  const s = setup('crates-hit', false);
  const armed = stepAdventureExploration(s.session, s.adventure, 16);
  const impact = armed.session.elapsedMs + C.dropOffsetsMs[0] + C.shadowMs + C.fallMs + 10;
  const target = resolveAtticCrates(armed.adventure, impact).drops.find(drop => drop.dangerous);
  ok(target, 'a crate is landing at the sampled time');
  const x = target!.x;
  for (const grounded of [true, false]) {
    const session = { ...armed.session, elapsedMs: impact, player: { ...armed.session.player, x, grounded, y: grounded ? 104 : 90 } };
    const stepped = stepAdventureExploration(session, armed.adventure, 0);
    equal(stepped.session.combat.hp, s.session.combat.hp - 1, `crate hits Wally (${grounded ? 'grounded' : 'airborne'})`);
  }
  const crates = resolveAtticCrates(armed.adventure, impact);
  equal(isPlayerHitByAtticCrate({ x: x + C.halfWidth + 1 }, crates), false, 'stepping just outside the shadow is safe');
});

void test('there is always time to step out of a shadow', () => {
  const reactionMs = C.shadowMs + C.fallMs - C.dangerLeadMs;
  const escapeMs = ((C.halfWidth + 1) / HAUNTED_PLAYER_PHYSICS.maxSpeed) * 1000
    + (HAUNTED_PLAYER_PHYSICS.maxSpeed / HAUNTED_PLAYER_PHYSICS.acceleration) * 1000;
  ok(escapeMs < reactionMs / 2, `escape (${escapeMs.toFixed(0)}ms) fits well inside the warning (${reactionMs}ms)`);
});

void test('the Bathroom stair entry is never a drop target', () => {
  ok(C.positions.every(x => Math.abs(x - 14) > C.halfWidth + 4), 'no drop lands near the entry');
});

console.log('attic crates tests passed');
