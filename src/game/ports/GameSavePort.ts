import type { SystemicRunState } from '../systemic/SystemicState';

export type GameSaveReadResult =
  | { status: 'none' }
  | { status: 'ok'; state: SystemicRunState }
  | { status: 'invalid' };

export interface GameSavePort {
  read(): Promise<GameSaveReadResult>;
  save(state: SystemicRunState): Promise<void>;
  clear(): Promise<void>;
}
