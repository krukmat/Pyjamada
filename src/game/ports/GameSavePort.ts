import type { GameState } from '../core/GameState';

export type GameSaveReadResult =
  | { status: 'none' }
  | { status: 'invalid' }
  | { status: 'ok'; gameState: GameState };

export interface GameSavePort {
  read(): Promise<GameSaveReadResult>;
  save(state: GameState): Promise<void>;
  clear(): Promise<void>;
}
