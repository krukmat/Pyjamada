import type { HauntedSessionState } from '../haunted/HauntedSessionRuntime';
import { createHauntedInputState } from '../haunted/HauntedInput';
import { isAdventureExplorationActive } from './AdventureExplorationRuntime';
import type { AdventureState } from './AdventureState';
import { restoreLaboratoryCheckpoint, shouldUseLaboratoryCheckpoint } from './LaboratoryEncounter';
import { getRoomEntry } from './RoomRegistry';

/**
 * A death in the house costs the room, not the run: Wally wakes at the door he
 * came in by, with full hearts, and every clue, switch and opened route in the
 * house stays as it was. Everything is derived from the saved room and entry,
 * so the save format is unchanged. The Laboratory encounter keeps its own
 * phase checkpoint; the haunted bedroom run still restarts from the bed.
 */
export const ROOM_CHECKPOINT = { invulnerabilityMs: 1_500 } as const;

export function shouldUseRoomCheckpoint(session: HauntedSessionState, adventure: AdventureState): boolean {
  return session.objective.phase === 'failed' && isAdventureExplorationActive(adventure);
}

export function restoreRoomCheckpoint(session: HauntedSessionState, adventure: AdventureState): HauntedSessionState {
  if (shouldUseLaboratoryCheckpoint(adventure)) return restoreLaboratoryCheckpoint(session, adventure);
  if (!shouldUseRoomCheckpoint(session, adventure)) return session;
  const entry = getRoomEntry(adventure.currentRoom, adventure.currentEntry);
  if (!entry) return session;
  return {
    ...session,
    player: { ...session.player, x: entry.x, y: entry.y, vx: 0, vy: 0, grounded: true, facing: entry.facing },
    domestic: { ...session.domestic, player: { x: Math.round(entry.x), facing: entry.facing } },
    input: createHauntedInputState(),
    combat: {
      ...session.combat,
      hp: session.combat.maxHp,
      invulnerableUntilMs: session.elapsedMs + ROOM_CHECKPOINT.invulnerabilityMs,
      nextAttackAllowedMs: session.elapsedMs,
      projectiles: [],
    },
    threats: { ...session.threats, ghosts: [] },
    objective: { phase: 'completed' },
  };
}
