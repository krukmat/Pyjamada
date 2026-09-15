import AsyncStorage from '@react-native-async-storage/async-storage';
import { decodeAdventureGameSession, encodeAdventureGameSession } from '../../game/adventure/AdventureSessionCodec';
import type { AdventureGameSessionState } from '../../game/adventure/AdventureGameSession';
import type { AdventureGameSavePort, AdventureGameSaveReadResult } from '../../game/ports/AdventureGameSavePort';

export const ADVENTURE_GAME_SAVE_KEY = 'pyjamada:game:v3:haunted-house-adventure';

export class AsyncStorageAdventureGameSaveRepository implements AdventureGameSavePort {
  private writeQueue: Promise<void> = Promise.resolve();

  async read(): Promise<AdventureGameSaveReadResult> {
    await this.writeQueue.catch(() => undefined);
    const raw = await AsyncStorage.getItem(ADVENTURE_GAME_SAVE_KEY);
    if (raw === null) return { status: 'none' };
    const decoded = decodeAdventureGameSession(raw);
    return decoded.status === 'ok' ? { status: 'ok', state: decoded.state } : { status: 'invalid' };
  }

  save(state: AdventureGameSessionState): Promise<void> {
    const encoded = encodeAdventureGameSession(state);
    return this.enqueue(() => AsyncStorage.setItem(ADVENTURE_GAME_SAVE_KEY, encoded));
  }

  clear(): Promise<void> {
    return this.enqueue(() => AsyncStorage.removeItem(ADVENTURE_GAME_SAVE_KEY));
  }

  private enqueue(operation: () => Promise<void>): Promise<void> {
    const next = this.writeQueue.catch(() => undefined).then(operation);
    this.writeQueue = next;
    return next;
  }
}
