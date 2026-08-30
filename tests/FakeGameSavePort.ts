import type { GameState } from '../src/game/core/GameState';
import type { GameSavePort, GameSaveReadResult } from '../src/game/ports/GameSavePort';

export class FakeGameSavePort implements GameSavePort {
  clearCount = 0;
  saveCount = 0;

  constructor(
    private state: GameState | null = null,
    private invalid = false,
  ) {}

  async read(): Promise<GameSaveReadResult> {
    if (this.invalid) return { status: 'invalid' };
    return this.state === null
      ? { status: 'none' }
      : { status: 'ok', gameState: this.state };
  }

  async save(state: GameState): Promise<void> {
    this.state = state;
    this.invalid = false;
    this.saveCount += 1;
  }

  async clear(): Promise<void> {
    this.state = null;
    this.invalid = false;
    this.clearCount += 1;
  }

  snapshot(): GameState | null {
    return this.state;
  }
}
