import { BEDROOM_KEY_ID, type GameState } from './GameState';
import { isRoomId, LOGICAL_SIZE } from './World';

export type DecodeGameStateResult =
  | { status: 'ok'; gameState: GameState }
  | { status: 'invalid-save'; reason: string };

const KNOWN_FLAGS = new Set([
  'bedroomKeyCollected',
  'bedroomDoorUnlocked',
  'verticalSliceReached',
]);

export function encodeGameState(state: GameState): string {
  return JSON.stringify(state);
}

export function decodeGameState(raw: string): DecodeGameStateResult {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return invalid('Save data is not valid JSON.');
  }

  if (!isRecord(value)) return invalid('Save root must be an object.');
  if (value.schemaVersion !== 1) return invalid('Unsupported save schema version.');
  if (typeof value.sessionId !== 'string' || value.sessionId.length === 0) return invalid('Missing session id.');
  if (!isRoomId(value.roomId)) return invalid('Unknown room id.');
  if (!isRecord(value.player)) return invalid('Missing player state.');

  if (
    !isFiniteCoordinate(value.player.x) ||
    !isFiniteCoordinate(value.player.y) ||
    (value.player.facing !== 'left' && value.player.facing !== 'right')
  ) {
    return invalid('Invalid player state.');
  }

  if (
    !Array.isArray(value.inventory) ||
    !value.inventory.every((item) => item === BEDROOM_KEY_ID) ||
    new Set(value.inventory).size !== value.inventory.length
  ) {
    return invalid('Invalid inventory.');
  }

  if (!isRecord(value.flags)) return invalid('Invalid flags.');
  const flags: Record<string, boolean> = {};
  for (const [key, flag] of Object.entries(value.flags)) {
    if (!KNOWN_FLAGS.has(key) || typeof flag !== 'boolean') return invalid('Invalid flags.');
    flags[key] = flag;
  }

  const keyCollected = flags.bedroomKeyCollected === true;
  const doorUnlocked = flags.bedroomDoorUnlocked === true;
  const sliceReached = flags.verticalSliceReached === true;
  const carriesKey = value.inventory.includes(BEDROOM_KEY_ID);

  if (carriesKey && (!keyCollected || doorUnlocked)) return invalid('Inconsistent key progression state.');
  if (doorUnlocked && !keyCollected) return invalid('Inconsistent door progression state.');
  if (value.roomId !== 'room-01' && !doorUnlocked) return invalid('Inconsistent room progression state.');
  if (value.roomId === 'room-03' && !sliceReached) return invalid('Inconsistent slice progression state.');

  return {
    status: 'ok',
    gameState: {
      schemaVersion: 1,
      sessionId: value.sessionId,
      roomId: value.roomId,
      player: { x: value.player.x, y: value.player.y, facing: value.player.facing },
      inventory: [...value.inventory],
      flags,
    },
  };
}

function isFiniteCoordinate(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= LOGICAL_SIZE;
}

function invalid(reason: string): DecodeGameStateResult {
  return { status: 'invalid-save', reason };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
