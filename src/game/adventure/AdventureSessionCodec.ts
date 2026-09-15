import { decodeHauntedSession, encodeHauntedSession } from '../haunted/HauntedSessionCodec';
import {
  ROOM_IDS,
  STORY_FLAGS,
  type AdventureState,
  type RoomId,
  type StoryFlag,
} from './AdventureState';
import type { AdventureGameSessionState } from './AdventureGameSession';
import { getRoomEntry } from './RoomRegistry';

export type DecodeAdventureGameSessionResult =
  | { status: 'ok'; state: AdventureGameSessionState }
  | { status: 'invalid'; reason: string };

export function encodeAdventureGameSession(state: AdventureGameSessionState): string {
  const haunted = JSON.parse(encodeHauntedSession(state.haunted)) as unknown;
  const adventureError = validateAdventureState(state.adventure);
  if (adventureError) throw new Error(adventureError);
  return JSON.stringify({ schemaVersion: 3, haunted, adventure: state.adventure });
}

export function decodeAdventureGameSession(raw: string): DecodeAdventureGameSessionResult {
  let value: unknown;
  try { value = JSON.parse(raw); } catch { return invalid('Adventure save is not valid JSON.'); }
  if (!isRecord(value)) return invalid('Adventure save root must be an object.');
  if (value.schemaVersion !== 3) return invalid('Unsupported adventure save version.');
  if (!isRecord(value.haunted)) return invalid('Missing haunted session in adventure save.');
  if (!isRecord(value.adventure)) return invalid('Missing adventure state in save.');

  const haunted = decodeHauntedSession(JSON.stringify(value.haunted));
  if (haunted.status === 'invalid') return invalid(`Invalid haunted session: ${haunted.reason}`);

  const adventureError = validateAdventureState(value.adventure);
  if (adventureError) return invalid(adventureError);
  const adventure = value.adventure as unknown as AdventureState;

  return {
    status: 'ok',
    state: {
      schemaVersion: 3,
      haunted: haunted.state,
      adventure,
    },
  };
}

function validateAdventureState(value: unknown): string | null {
  if (!isRecord(value)) return 'Adventure state must be an object.';
  if (value.schemaVersion !== 1) return 'Unsupported adventure state version.';
  if (!isRoomId(value.currentRoom)) return 'Invalid adventure current room.';
  if (typeof value.currentEntry !== 'string' || value.currentEntry.length === 0) return 'Invalid adventure current entry.';
  if (!getRoomEntry(value.currentRoom, value.currentEntry)) return 'Current adventure room/entry is not active or registered.';

  if (!Array.isArray(value.visitedRooms) || value.visitedRooms.length === 0) return 'Invalid visited room list.';
  const visited = value.visitedRooms;
  if (!visited.every(isRoomId)) return 'Visited room list contains an unknown room.';
  if (new Set(visited).size !== visited.length) return 'Visited room list contains duplicates.';
  if (!visited.includes(value.currentRoom)) return 'Current room must be included in visited rooms.';
  if (!visited.includes('bedroom')) return 'Adventure must retain Bedroom as the origin room.';

  if (!isRecord(value.storyFlags)) return 'Invalid story flags.';
  for (const flag of STORY_FLAGS) {
    if (typeof value.storyFlags[flag] !== 'boolean') return `Invalid story flag: ${flag}.`;
  }
  for (const key of Object.keys(value.storyFlags)) {
    if (!STORY_FLAGS.includes(key as StoryFlag)) return `Unknown story flag: ${key}.`;
  }

  if (!isRecord(value.rooms)) return 'Invalid room persistence map.';
  for (const [roomId, roomValue] of Object.entries(value.rooms)) {
    if (!isRoomId(roomId)) return `Unknown persisted room: ${roomId}.`;
    const roomError = validateRoomState(roomValue);
    if (roomError) return `${roomId}: ${roomError}`;
  }
  if (!value.rooms[value.currentRoom]) return 'Current room must have persisted room state.';

  return null;
}

function validateRoomState(value: unknown): string | null {
  if (!isRecord(value)) return 'Room state must be an object.';
  if (!uniqueStringArray(value.inspected)) return 'Invalid inspected ids.';
  if (!uniqueStringArray(value.interactions)) return 'Invalid interaction ids.';
  if (!isRecord(value.switches)) return 'Invalid room switches.';
  for (const switchValue of Object.values(value.switches)) {
    if (typeof switchValue !== 'boolean') return 'Room switches must be boolean.';
  }
  return null;
}

function isRoomId(value: unknown): value is RoomId {
  return typeof value === 'string' && ROOM_IDS.includes(value as RoomId);
}

function uniqueStringArray(value: unknown): value is string[] {
  return Array.isArray(value)
    && value.every(item => typeof item === 'string' && item.length > 0)
    && new Set(value).size === value.length;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function invalid(reason: string): { status: 'invalid'; reason: string } {
  return { status: 'invalid', reason };
}
