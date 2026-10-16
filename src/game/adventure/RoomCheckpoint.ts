import type { HauntedSessionState } from '../haunted/HauntedSessionRuntime';
import { createHauntedInputState } from '../haunted/HauntedInput';
import { isAdventureExplorationActive } from './AdventureExplorationRuntime';
import type { AdventureState } from './AdventureState';
import { restoreLaboratoryCheckpoint, shouldUseLaboratoryCheckpoint } from './LaboratoryEncounter';
import { getRoomEntry } from './RoomRegistry';
import { restartRoomBossRound } from './RoomBossHazard';

/**
 * A death in the house costs the room, not the run: Wally wakes at the door he
 * came in by, with full hearts, and every clue, switch and opened route in the
 * house stays as it was. Everything is derived from the saved room and entry,
 * so the save format is unchanged. An awake room boss restarts its round
 * (wounds kept), so Wally wakes to its harmless rise. The Laboratory encounter keeps its own
 * phase checkpoint; the haunted bedroom run still restarts from the bed.
 */
export const ROOM_CHECKPOINT = { invulnerabilityMs: 1_500 } as const;

export function shouldUseRoomCheckpoint(session: HauntedSessionState, adventure: AdventureState): boolean {
  return session.objective.phase === 'failed' && isAdventureExplorationActive(adventure);
}

export function restoreRoomCheckpoint(session: HauntedSessionState, adventure: AdventureState): HauntedSessionState {
  return restoreRoomCheckpointState(session, adventure).session;
}

/** The checkpoint restore plus the adventure mark that restarts an awake boss's round. */
export function restoreRoomCheckpointState(
  session: HauntedSessionState,
  adventure: AdventureState,
): { session: HauntedSessionState; adventure: AdventureState } {
  if (shouldUseLaboratoryCheckpoint(adventure)) return { session: restoreLaboratoryCheckpoint(session, adventure), adventure };
  if (!shouldUseRoomCheckpoint(session, adventure)) return { session, adventure };
  const entry = getRoomEntry(adventure.currentRoom, adventure.currentEntry);
  if (!entry) return { session, adventure };
  const restart = restartRoomBossRound(adventure, session.elapsedMs);
  const { elapsedMs } = restart;
  return { adventure: restart.adventure, session: {
    ...session,
    elapsedMs,
    player: { ...session.player, x: entry.x, y: entry.y, vx: 0, vy: 0, grounded: true, facing: entry.facing },
    domestic: { ...session.domestic, player: { x: Math.round(entry.x), facing: entry.facing } },
    input: createHauntedInputState(),
    combat: {
      ...session.combat,
      hp: session.combat.maxHp,
      invulnerableUntilMs: elapsedMs + ROOM_CHECKPOINT.invulnerabilityMs,
      nextAttackAllowedMs: elapsedMs,
      projectiles: [],
    },
    threats: { ...session.threats, ghosts: [] },
    objective: { phase: 'completed' },
  } };
}
