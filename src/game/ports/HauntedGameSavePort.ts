import type { HauntedSessionState } from '../haunted/HauntedSessionRuntime';

export type HauntedGameSaveReadResult =
  | { status: 'none' }
  | { status: 'ok'; state: HauntedSessionState }
  | { status: 'invalid' };

export interface HauntedGameSavePort {
  read(): Promise<HauntedGameSaveReadResult>;
  save(state: HauntedSessionState): Promise<void>;
  clear(): Promise<void>;
}
