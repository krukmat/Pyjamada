import type { GameSettings } from '../src/settings/core/GameSettings';
import type { GameSettingsPort } from '../src/settings/ports/GameSettingsPort';

export class FakeGameSettingsPort implements GameSettingsPort {
  saveCount = 0;

  constructor(private current: GameSettings) {}

  async load(): Promise<GameSettings> {
    return this.current;
  }

  async save(settings: GameSettings): Promise<void> {
    this.current = settings;
    this.saveCount += 1;
  }
}
