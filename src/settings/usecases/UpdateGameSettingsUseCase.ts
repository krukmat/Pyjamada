import {
  applyGameSettingsPatch,
  type GameSettings,
  type GameSettingsPatch,
} from '../core/GameSettings';
import type { GameSettingsPort } from '../ports/GameSettingsPort';

export class UpdateGameSettingsUseCase {
  constructor(private readonly settings: GameSettingsPort) {}

  async execute(current: GameSettings, patch: GameSettingsPatch): Promise<GameSettings> {
    const next = applyGameSettingsPatch(current, patch);
    await this.settings.save(next);
    return next;
  }
}
