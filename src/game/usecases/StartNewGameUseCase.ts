import { createInitialGameState, type GameState } from '../core/GameState';
import type { GameSavePort } from '../ports/GameSavePort';

export type StartNewGameResult =
  | { status: 'started'; gameState: GameState }
  | { status: 'confirmation-required' };

export class StartNewGameUseCase {
  constructor(private readonly saves: GameSavePort) {}

  async execute(overwriteExistingSave = false): Promise<StartNewGameResult> {
    const existing = await this.saves.read();

    if (existing.status !== 'none' && !overwriteExistingSave) {
      return { status: 'confirmation-required' };
    }

    const gameState = createInitialGameState();

    // Overwrite in one write instead of clear-then-save. If the write fails, the
    // previous save remains available rather than leaving an empty save window.
    await this.saves.save(gameState);

    return { status: 'started', gameState };
  }
}
