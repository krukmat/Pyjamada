import AsyncStorage from '@react-native-async-storage/async-storage';
import type { GameState } from '../../game/core/GameState';
import { decodeGameState, encodeGameState } from '../../game/core/GameStateCodec';
import type { GameSavePort, GameSaveReadResult } from '../../game/ports/GameSavePort';

export const GAME_SAVE_KEY = 'pyjamada:v1:game-save';

export class AsyncStorageGameSaveRepository implements GameSavePort {
  private writeQueue: Promise<void> = Promise.resolve();

  async read(): Promise<GameSaveReadResult> {
    await this.writeQueue.catch(() => undefined);
    const raw = await AsyncStorage.getItem(GAME_SAVE_KEY);
    if (raw === null) return { status: 'none' };

    const decoded = decodeGameState(raw);
    return decoded.status === 'ok'
      ? { status: 'ok', gameState: decoded.gameState }
      : { status: 'invalid' };
  }

  save(state: GameState): Promise<void> {
    const encoded = encodeGameState(state);
    return this.enqueue(() => AsyncStorage.setItem(GAME_SAVE_KEY, encoded));
  }

  clear(): Promise<void> {
    return this.enqueue(() => AsyncStorage.removeItem(GAME_SAVE_KEY));
  }

  private enqueue(operation: () => Promise<void>): Promise<void> {
    const next = this.writeQueue.catch(() => undefined).then(operation);
    this.writeQueue = next;
    return next;
  }
}
