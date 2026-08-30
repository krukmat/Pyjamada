import type { GameSettings } from '../core/GameSettings';
import type { GameSettingsPort } from '../ports/GameSettingsPort';

export class LoadGameSettingsUseCase {
  constructor(private readonly settings: GameSettingsPort) {}

  execute(): Promise<GameSettings> {
    return this.settings.load();
  }
}
