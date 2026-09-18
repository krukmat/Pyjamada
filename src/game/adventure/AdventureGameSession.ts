import { createHauntedSession, type HauntedSessionState } from '../haunted/HauntedSessionRuntime';
import { createAdventureState, type AdventureState } from './AdventureState';

export type AdventureGameSessionState = {
  schemaVersion: 3;
  haunted: HauntedSessionState;
  adventure: AdventureState;
};

export function createAdventureGameSession(runId = 'adventure-run'): AdventureGameSessionState {
  return {
    schemaVersion: 3,
    haunted: createHauntedSession(runId),
    adventure: createAdventureState(),
  };
}
