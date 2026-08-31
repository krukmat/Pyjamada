import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SystemicRunPort, SystemicRunReadResult } from '../../game/ports/SystemicRunPort';
import { decodeSystemicRun, encodeSystemicRun } from '../../game/systemic/SystemicCodec';
import type { SystemicRunState } from '../../game/systemic/SystemicState';

export const SYSTEMIC_RUN_KEY = 'pyjamada:systemic:v1:run';

export class AsyncStorageSystemicRunRepository implements SystemicRunPort {
  private writeQueue: Promise<void> = Promise.resolve();

  async read(): Promise<SystemicRunReadResult> {
    await this.writeQueue.catch(() => undefined);
    const raw = await AsyncStorage.getItem(SYSTEMIC_RUN_KEY);
    if (raw === null) return { status: 'none' };
    const decoded = decodeSystemicRun(raw);
    return decoded.status === 'ok' ? { status: 'ok', state: decoded.state } : { status: 'invalid' };
  }

  save(state: SystemicRunState): Promise<void> {
    const encoded = encodeSystemicRun(state);
    return this.enqueue(() => AsyncStorage.setItem(SYSTEMIC_RUN_KEY, encoded));
  }

  clear(): Promise<void> {
    return this.enqueue(() => AsyncStorage.removeItem(SYSTEMIC_RUN_KEY));
  }

  private enqueue(operation: () => Promise<void>): Promise<void> {
    const next = this.writeQueue.catch(() => undefined).then(operation);
    this.writeQueue = next;
    return next;
  }
}
