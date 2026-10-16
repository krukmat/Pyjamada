import { createHauntedSession, type HauntedSessionState } from '../haunted/HauntedSessionRuntime';
import type { AdventureDifficulty } from './AdventureDifficulty';
import { createAdventureState, type AdventureState } from './AdventureState';

export type AdventureGameSessionState = {
  schemaVersion: 3;
  haunted: HauntedSessionState;
  adventure: AdventureState;
};

export function createAdventureGameSession(runId = 'adventure-run', difficulty: AdventureDifficulty = 1): AdventureGameSessionState {
  return {
    schemaVersion: 3,
    haunted: createHauntedSession(runId),
    adventure: createAdventureState(difficulty),
  };
}
