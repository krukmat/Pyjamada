import { createRoomPersistentState, type AdventureState, type RoomId, type StoryFlag } from './AdventureState';

export type RoomPresentationId = 'bedroom' | 'hallway';

export type RoomEntryPoint = {
  id: string;
  x: number;
  y: number;
  facing: 'left' | 'right';
};

export type RoomExit = {
  id: string;
  targetRoom: RoomId;
  targetEntry: string;
  requiresStoryFlag?: StoryFlag;
};

export type RoomDefinition = {
  id: RoomId;
  presentationId: RoomPresentationId;
  entries: readonly RoomEntryPoint[];
  exits: readonly RoomExit[];
};

export const ACTIVE_ROOM_IDS = ['bedroom', 'hallway'] as const satisfies readonly RoomId[];

export const ROOM_REGISTRY: Readonly<Record<(typeof ACTIVE_ROOM_IDS)[number], RoomDefinition>> = {
  bedroom: {
    id: 'bedroom',
    presentationId: 'bedroom',
    entries: [
      { id: 'bedroom-default', x: 12, y: 104, facing: 'right' },
      { id: 'bedroom-from-hallway', x: 108, y: 104, facing: 'left' },
    ],
    exits: [
      {
        id: 'bedroom-to-hallway',
        targetRoom: 'hallway',
        targetEntry: 'hallway-from-bedroom',
        requiresStoryFlag: 'hallwayUnlocked',
      },
    ],
  },
  hallway: {
    id: 'hallway',
    presentationId: 'hallway',
    entries: [
      { id: 'hallway-from-bedroom', x: 14, y: 104, facing: 'right' },
    ],
    exits: [
      { id: 'hallway-to-bedroom', targetRoom: 'bedroom', targetEntry: 'bedroom-from-hallway' },
    ],
  },
};

export type AdventureTransitionResult =
  | { status: 'ok'; state: AdventureState; spawn: RoomEntryPoint }
  | { status: 'invalid'; reason: string };

export function findActiveRoom(roomId: RoomId): RoomDefinition | undefined {
  return ACTIVE_ROOM_IDS.includes(roomId as (typeof ACTIVE_ROOM_IDS)[number])
    ? ROOM_REGISTRY[roomId as (typeof ACTIVE_ROOM_IDS)[number]]
    : undefined;
}

export function getRoomEntry(roomId: RoomId, entryId: string): RoomEntryPoint | undefined {
  return findActiveRoom(roomId)?.entries.find(entry => entry.id === entryId);
}

export function transitionAdventure(
  state: AdventureState,
  targetRoom: RoomId,
  targetEntry: string,
): AdventureTransitionResult {
  const source = findActiveRoom(state.currentRoom);
  if (!source) return { status: 'invalid', reason: `Current room is not active: ${state.currentRoom}.` };

  const allowed = source.exits.find(exit => exit.targetRoom === targetRoom && exit.targetEntry === targetEntry);
  if (!allowed) {
    return {
      status: 'invalid',
      reason: `Transition ${state.currentRoom} -> ${targetRoom}:${targetEntry} is not registered.`,
    };
  }
  if (allowed.requiresStoryFlag && !state.storyFlags[allowed.requiresStoryFlag]) {
    return {
      status: 'invalid',
      reason: `Transition ${allowed.id} requires story flag ${allowed.requiresStoryFlag}.`,
    };
  }

  const spawn = getRoomEntry(targetRoom, targetEntry);
  if (!spawn) return { status: 'invalid', reason: `Unknown entry ${targetRoom}:${targetEntry}.` };

  const visitedRooms = state.visitedRooms.includes(targetRoom)
    ? state.visitedRooms
    : [...state.visitedRooms, targetRoom];

  return {
    status: 'ok',
    spawn,
    state: {
      ...state,
      currentRoom: targetRoom,
      currentEntry: targetEntry,
      visitedRooms,
      rooms: state.rooms[targetRoom]
        ? state.rooms
        : { ...state.rooms, [targetRoom]: createRoomPersistentState() },
    },
  };
}
