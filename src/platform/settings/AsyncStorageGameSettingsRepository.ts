import AsyncStorage from '@react-native-async-storage/async-storage';
import type { GameSettings } from '../../settings/core/GameSettings';
import {
  encodeGameSettings,
  safeDecodeGameSettings,
} from '../../settings/core/GameSettingsCodec';
import type { GameSettingsPort } from '../../settings/ports/GameSettingsPort';

export const GAME_SETTINGS_KEY = 'pyjamada:v1:settings';

export class AsyncStorageGameSettingsRepository implements GameSettingsPort {
  private writeQueue: Promise<void> = Promise.resolve();

  async load(): Promise<GameSettings> {
    await this.writeQueue.catch(() => undefined);
    const raw = await AsyncStorage.getItem(GAME_SETTINGS_KEY);
    return safeDecodeGameSettings(raw);
  }

  save(settings: GameSettings): Promise<void> {
    const encoded = encodeGameSettings(settings);
    const next = this.writeQueue
      .catch(() => undefined)
      .then(() => AsyncStorage.setItem(GAME_SETTINGS_KEY, encoded));
    this.writeQueue = next;
    return next;
  }
}
