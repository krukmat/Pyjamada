import type { GameSettings } from '../core/GameSettings';

export interface GameSettingsPort {
  load(): Promise<GameSettings>;
  save(settings: GameSettings): Promise<void>;
}
