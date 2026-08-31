import AsyncStorage from '@react-native-async-storage/async-storage';
import type { GameSavePort, GameSaveReadResult } from '../../game/ports/GameSavePort';
import { decodeSystemicRun, encodeSystemicRun } from '../../game/systemic/SystemicCodec';
import type { SystemicRunState } from '../../game/systemic/SystemicState';

export const GAME_SAVE_KEY = 'pyjamada:game:v1:run';

export class AsyncStorageGameSaveRepository implements GameSavePort {
  private writeQueue: Promise<void> = Promise.resolve();

  async read(): Promise<GameSaveReadResult> {
    await this.writeQueue.catch(() => undefined);
    const raw = await AsyncStorage.getItem(GAME_SAVE_KEY);
    if (raw === null) return { status: 'none' };
    const decoded = decodeSystemicRun(raw);
    return decoded.status === 'ok' ? { status: 'ok', state: decoded.state } : { status: 'invalid' };
  }

  save(state: SystemicRunState): Promise<void> {
    const encoded = encodeSystemicRun(state);
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
