import type { SystemicRunState } from '../systemic/SystemicState';

export type SystemicRunReadResult =
  | { status: 'none' }
  | { status: 'ok'; state: SystemicRunState }
  | { status: 'invalid' };

export interface SystemicRunPort {
  read(): Promise<SystemicRunReadResult>;
  save(state: SystemicRunState): Promise<void>;
  clear(): Promise<void>;
}
