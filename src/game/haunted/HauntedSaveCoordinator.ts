import type { HauntedGameSavePort } from '../ports/HauntedGameSavePort';
import type { HauntedSessionState } from './HauntedSessionRuntime';

export type HauntedSaveReason = 'interaction' | 'periodic' | 'background' | 'exit-menu' | 'milestone' | 'terminal';

export const HAUNTED_PERIODIC_SAVE_INTERVAL_MS = 5_000;

/**
 * Gameplay can tick at 30 Hz, but persistence is checkpoint based. This
 * coordinator deliberately prevents simulation ticks from becoming storage
 * writes while still allowing meaningful events to flush immediately.
 */
export class HauntedSaveCoordinator {
  private lastPersistedLogicalMs = -Infinity;

  constructor(private readonly port: HauntedGameSavePort) {}

  markRestored(state: HauntedSessionState): void {
    this.lastPersistedLogicalMs = logicalMs(state);
  }

  async persist(state: HauntedSessionState, reason: HauntedSaveReason): Promise<boolean> {
    const currentLogicalMs = logicalMs(state);
    if (reason === 'periodic' && currentLogicalMs - this.lastPersistedLogicalMs < HAUNTED_PERIODIC_SAVE_INTERVAL_MS) return false;
    await this.port.save(state);
    this.lastPersistedLogicalMs = currentLogicalMs;
    return true;
  }
}

function logicalMs(state: HauntedSessionState): number {
  return state.elapsedMs + state.penaltyMs;
}
