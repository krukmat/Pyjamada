import { PLAYER_GROUND_Y, type RoomId } from './World';

export const INITIAL_ROOM_ID: RoomId = 'room-01';
export const BEDROOM_KEY_ID = 'bedroom-key';

export type GameState = {
  schemaVersion: 1;
  sessionId: string;
  roomId: RoomId;
  player: {
    x: number;
    y: number;
    facing: 'left' | 'right';
  };
  inventory: readonly string[];
  flags: Readonly<Record<string, boolean>>;
};

export function createInitialGameState(sessionId = 'v1-session'): GameState {
  return {
    schemaVersion: 1,
    sessionId,
    roomId: INITIAL_ROOM_ID,
    player: { x: 24, y: PLAYER_GROUND_Y, facing: 'right' },
    inventory: [],
    flags: {},
  };
}
