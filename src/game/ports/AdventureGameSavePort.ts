import type { AdventureGameSessionState } from '../adventure/AdventureGameSession';

export type AdventureGameSaveReadResult =
  | { status: 'none' }
  | { status: 'ok'; state: AdventureGameSessionState }
  | { status: 'invalid' };

export interface AdventureGameSavePort {
  read(): Promise<AdventureGameSaveReadResult>;
  save(state: AdventureGameSessionState): Promise<void>;
  clear(): Promise<void>;
}
