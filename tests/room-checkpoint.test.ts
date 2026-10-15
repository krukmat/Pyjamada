import { equal, test } from './assert';
import { applyFalseEscape } from '../src/game/adventure/AdventureExplorationRuntime';
import { createAdventureState, setRoomSwitch } from '../src/game/adventure/AdventureState';
import { LABORATORY_CHECKPOINT } from '../src/game/adventure/LaboratoryEncounter';
import { restoreRoomCheckpoint, ROOM_CHECKPOINT, shouldUseRoomCheckpoint } from '../src/game/adventure/RoomCheckpoint';
import { getRoomEntry } from '../src/game/adventure/RoomRegistry';
import { createHauntedSession, type HauntedSessionState } from '../src/game/haunted/HauntedSessionRuntime';
import { explorationIn, laboratoryIn, THREAT_SESSION } from './support/ThreatScenarios';

function ok(value: unknown, message: string) { if (!value) throw new Error(message); }

/** An escaped run, dressed and holding the keys, as the App has it in the house. */
const ESCAPED: HauntedSessionState = (() => {
  const base = createHauntedSession('room-checkpoint');
  return applyFalseEscape({
    ...base,
    domestic: { ...base.domestic, wallyState: 'normal', flags: { ...base.domestic.flags, dressed: true }, collected: ['keys'] },
    objective: { phase: 'completed' },
  }, createAdventureState()).session;
})();

function dead(session: HauntedSessionState): HauntedSessionState {
  return {
    ...session,
    elapsedMs: 9_000,
    player: { ...session.player, x: 70, vx: 20, grounded: false },
    combat: { ...session.combat, hp: 0, projectiles: [{ id: 7, x: 80, y: 84, vx: 76, damage: 1 }] },
    objective: { phase: 'failed', reason: 'haunted' },
  };
}

void test('a death in a house room retries that room from its entry with full hearts and keeps progress', () => {
  const kitchen = setRoomSwitch({ ...explorationIn('kitchen'), currentEntry: 'kitchen-from-living-room' }, 'kitchen', 'circuit-overloaded', true);
  const session = dead(ESCAPED);
  equal(shouldUseRoomCheckpoint(session, kitchen), true, 'a failed exploration run uses the room checkpoint');
  const restored = restoreRoomCheckpoint(session, kitchen);
  const entry = getRoomEntry(kitchen.currentRoom, kitchen.currentEntry)!;
  equal(restored.objective.phase, 'completed', 'exploration resumes');
  equal(restored.combat.hp, restored.combat.maxHp, 'hearts are full');
  equal(restored.player.x, entry.x, 'Wally wakes at the entry he came in by');
  equal(restored.player.facing, entry.facing, 'facing into the room');
  equal(restored.player.grounded, true, 'on the floor');
  equal(restored.combat.projectiles.length, 0, 'no stray Dream Sparks');
  equal(restored.combat.invulnerableUntilMs, session.elapsedMs + ROOM_CHECKPOINT.invulnerabilityMs, 'a short grace period');
  equal(restored.elapsedMs, session.elapsedMs, 'the clock never moves backward');
  // Room progress lives in the adventure state, which the checkpoint never touches;
  // the QA bot checks that every checkpointed state is a valid save.
  ok(restored.domestic.flags.dressed && restored.domestic.collected.includes('keys'), 'Wally keeps clothes and keys');
});

void test('the room checkpoint leaves living runs, the haunted bedroom and the Laboratory phase checkpoint alone', () => {
  const kitchen = explorationIn('kitchen');
  equal(shouldUseRoomCheckpoint(THREAT_SESSION, kitchen), false, 'a living run is not restored');
  equal(restoreRoomCheckpoint(THREAT_SESSION, kitchen), THREAT_SESSION, 'restore is a no-op while alive');
  const bedroom = dead(createHauntedSession('bedroom-death'));
  equal(shouldUseRoomCheckpoint(bedroom, createAdventureState()), false, 'the haunted bedroom run still restarts from the bed');
  const laboratory = restoreRoomCheckpoint(dead(THREAT_SESSION), laboratoryIn('resonator'));
  equal(laboratory.player.x, LABORATORY_CHECKPOINT.x, 'the Laboratory encounter keeps its phase checkpoint');
});
