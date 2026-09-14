import AsyncStorage from '@react-native-async-storage/async-storage';
import { decodeHauntedSession, encodeHauntedSession } from '../../game/haunted/HauntedSessionCodec';
import type { HauntedSessionState } from '../../game/haunted/HauntedSessionRuntime';
import type { HauntedGameSavePort, HauntedGameSaveReadResult } from '../../game/ports/HauntedGameSavePort';

export const HAUNTED_GAME_SAVE_KEY = 'pyjamada:game:v2:haunted-run';

export class AsyncStorageHauntedGameSaveRepository implements HauntedGameSavePort {
  private writeQueue: Promise<void> = Promise.resolve();

  async read(): Promise<HauntedGameSaveReadResult> {
    await this.writeQueue.catch(() => undefined);
    const raw = await AsyncStorage.getItem(HAUNTED_GAME_SAVE_KEY);
    if (raw === null) return { status: 'none' };
    const decoded = decodeHauntedSession(raw);
    return decoded.status === 'ok' ? { status: 'ok', state: decoded.state } : { status: 'invalid' };
  }

  save(state: HauntedSessionState): Promise<void> {
    const encoded = encodeHauntedSession(state);
    return this.enqueue(() => AsyncStorage.setItem(HAUNTED_GAME_SAVE_KEY, encoded));
  }

  clear(): Promise<void> {
    return this.enqueue(() => AsyncStorage.removeItem(HAUNTED_GAME_SAVE_KEY));
  }

  private enqueue(operation: () => Promise<void>): Promise<void> {
    const next = this.writeQueue.catch(() => undefined).then(operation);
    this.writeQueue = next;
    return next;
  }
}
