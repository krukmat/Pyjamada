import type { AdventureGameSavePort } from '../ports/AdventureGameSavePort';
import type { AdventureGameSessionState } from './AdventureGameSession';

export type AdventureSaveReason = 'interaction' | 'periodic' | 'background' | 'exit-menu' | 'milestone' | 'terminal' | 'room-transition';

export const ADVENTURE_PERIODIC_SAVE_INTERVAL_MS = 5_000;

export class AdventureSaveCoordinator {
  private lastPersistedLogicalMs = -Infinity;

  constructor(private readonly port: AdventureGameSavePort) {}

  markRestored(state: AdventureGameSessionState): void {
    this.lastPersistedLogicalMs = logicalMs(state);
  }

  async persist(state: AdventureGameSessionState, reason: AdventureSaveReason): Promise<boolean> {
    const currentLogicalMs = logicalMs(state);
    if (reason === 'periodic' && currentLogicalMs - this.lastPersistedLogicalMs < ADVENTURE_PERIODIC_SAVE_INTERVAL_MS) return false;
    await this.port.save(state);
    this.lastPersistedLogicalMs = currentLogicalMs;
    return true;
  }
}

function logicalMs(state: AdventureGameSessionState): number {
  return state.haunted.elapsedMs + state.haunted.penaltyMs;
}
