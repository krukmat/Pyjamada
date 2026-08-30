import type { GameState } from '../core/GameState';
import type { GameSavePort } from '../ports/GameSavePort';

export type ContinueSavedGameResult =
  | { status: 'resumed'; gameState: GameState }
  | { status: 'no-save' }
  | { status: 'invalid-save' };

export class ContinueSavedGameUseCase {
  constructor(private readonly saves: GameSavePort) {}

  async isAvailable(): Promise<boolean> {
    return (await this.saves.read()).status === 'ok';
  }

  async execute(): Promise<ContinueSavedGameResult> {
    const stored = await this.saves.read();
    if (stored.status === 'none') return { status: 'no-save' };
    if (stored.status === 'invalid') return { status: 'invalid-save' };
    return { status: 'resumed', gameState: stored.gameState };
  }
}
