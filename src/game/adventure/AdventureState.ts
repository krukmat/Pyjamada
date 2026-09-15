export const ROOM_IDS = [
  'bedroom',
  'hallway',
  'living-room',
  'kitchen',
  'bathroom',
  'attic',
  'basement',
  'laboratory',
] as const;

export type RoomId = (typeof ROOM_IDS)[number];

export const STORY_FLAGS = [
  'bedroomEscapeAttempted',
  'hallwayUnlocked',
] as const;

export type StoryFlag = (typeof STORY_FLAGS)[number];

export type RoomPersistentState = {
  inspected: string[];
  interactions: string[];
  switches: Record<string, boolean>;
};

export type AdventureState = {
  schemaVersion: 1;
  currentRoom: RoomId;
  currentEntry: string;
  visitedRooms: RoomId[];
  storyFlags: Record<StoryFlag, boolean>;
  rooms: Partial<Record<RoomId, RoomPersistentState>>;
};

export function createRoomPersistentState(): RoomPersistentState {
  return { inspected: [], interactions: [], switches: {} };
}

export function createAdventureState(): AdventureState {
  return {
    schemaVersion: 1,
    currentRoom: 'bedroom',
    currentEntry: 'bedroom-default',
    visitedRooms: ['bedroom'],
    storyFlags: {
      bedroomEscapeAttempted: false,
      hallwayUnlocked: false,
    },
    rooms: { bedroom: createRoomPersistentState() },
  };
}

export function hasStoryFlag(state: AdventureState, flag: StoryFlag): boolean {
  return state.storyFlags[flag];
}

export function setStoryFlag(state: AdventureState, flag: StoryFlag, value = true): AdventureState {
  if (state.storyFlags[flag] === value) return state;
  return {
    ...state,
    storyFlags: { ...state.storyFlags, [flag]: value },
  };
}

export function getRoomState(state: AdventureState, roomId: RoomId): RoomPersistentState {
  return state.rooms[roomId] ?? createRoomPersistentState();
}

export function updateRoomState(
  state: AdventureState,
  roomId: RoomId,
  update: (room: RoomPersistentState) => RoomPersistentState,
): AdventureState {
  const current = getRoomState(state, roomId);
  const next = update(current);
  if (next === current) return state;
  return {
    ...state,
    rooms: { ...state.rooms, [roomId]: next },
  };
}

export function markRoomInspected(state: AdventureState, roomId: RoomId, anomalyId: string): AdventureState {
  return updateRoomState(state, roomId, room => room.inspected.includes(anomalyId)
    ? room
    : { ...room, inspected: [...room.inspected, anomalyId] });
}

export function markRoomInteraction(state: AdventureState, roomId: RoomId, interactionId: string): AdventureState {
  return updateRoomState(state, roomId, room => room.interactions.includes(interactionId)
    ? room
    : { ...room, interactions: [...room.interactions, interactionId] });
}

export function setRoomSwitch(state: AdventureState, roomId: RoomId, switchId: string, value: boolean): AdventureState {
  return updateRoomState(state, roomId, room => room.switches[switchId] === value
    ? room
    : { ...room, switches: { ...room.switches, [switchId]: value } });
}
