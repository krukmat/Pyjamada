import {
  createRoomPersistentState,
  getRoomState,
  type AdventureState,
  type RoomId,
  type StoryFlag,
} from './AdventureState';

export type RoomPresentationId = 'bedroom' | 'hallway' | 'living-room';

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
  requiresRoomSwitch?: string;
};

export type RoomInteractionEffect = 'inspect-backward-clock' | 'use-living-room-tv';

export type RoomInteractionBehavior =
  | { type: 'exit'; exitId: string }
  | { type: 'effect'; effect: RoomInteractionEffect };

export type RoomInteractionDefinition = {
  id: string;
  label: string;
  unavailableLabel?: string;
  x: number;
  radius: number;
  behavior: RoomInteractionBehavior;
};

export type ResolvedRoomInteractionTarget = RoomInteractionDefinition & {
  available: boolean;
  displayLabel: string;
};

export type RoomDefinition = {
  id: RoomId;
  presentationId: RoomPresentationId;
  entries: readonly RoomEntryPoint[];
  exits: readonly RoomExit[];
  interactions: readonly RoomInteractionDefinition[];
};

export const ACTIVE_ROOM_IDS = ['bedroom', 'hallway', 'living-room'] as const satisfies readonly RoomId[];

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
    interactions: [
      {
        id: 'bedroom-hallway-door',
        label: 'HALLWAY',
        x: 112,
        radius: 8,
        behavior: { type: 'exit', exitId: 'bedroom-to-hallway' },
      },
    ],
  },
  hallway: {
    id: 'hallway',
    presentationId: 'hallway',
    entries: [
      { id: 'hallway-from-bedroom', x: 14, y: 104, facing: 'right' },
      { id: 'hallway-from-living-room', x: 108, y: 104, facing: 'left' },
    ],
    exits: [
      { id: 'hallway-to-bedroom', targetRoom: 'bedroom', targetEntry: 'bedroom-from-hallway' },
      {
        id: 'hallway-to-living-room',
        targetRoom: 'living-room',
        targetEntry: 'living-room-from-hallway',
        requiresRoomSwitch: 'living-room-unlocked',
      },
    ],
    interactions: [
      {
        id: 'hallway-bedroom-door',
        label: 'BEDROOM',
        x: 10,
        radius: 8,
        behavior: { type: 'exit', exitId: 'hallway-to-bedroom' },
      },
      {
        id: 'backward-clock',
        label: 'STRANGE CLOCK',
        x: 64,
        radius: 9,
        behavior: { type: 'effect', effect: 'inspect-backward-clock' },
      },
      {
        id: 'living-room-door',
        label: 'LIVING ROOM',
        unavailableLabel: 'SEALED DOOR',
        x: 114,
        radius: 8,
        behavior: { type: 'exit', exitId: 'hallway-to-living-room' },
      },
    ],
  },
  'living-room': {
    id: 'living-room',
    presentationId: 'living-room',
    entries: [
      { id: 'living-room-from-hallway', x: 14, y: 104, facing: 'right' },
    ],
    exits: [
      { id: 'living-room-to-hallway', targetRoom: 'hallway', targetEntry: 'hallway-from-living-room' },
    ],
    interactions: [
      {
        id: 'living-room-hallway-door',
        label: 'HALLWAY',
        x: 10,
        radius: 8,
        behavior: { type: 'exit', exitId: 'living-room-to-hallway' },
      },
      {
        id: 'living-room-tv',
        label: 'TELEVISION',
        x: 109,
        radius: 12,
        behavior: { type: 'effect', effect: 'use-living-room-tv' },
      },
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

export function getRoomExit(roomId: RoomId, exitId: string): RoomExit | undefined {
  return findActiveRoom(roomId)?.exits.find(exit => exit.id === exitId);
}

export function getRoomInteraction(roomId: RoomId, interactionId: string): RoomInteractionDefinition | undefined {
  return findActiveRoom(roomId)?.interactions.find(interaction => interaction.id === interactionId);
}

export function isRoomExitAvailable(state: AdventureState, roomId: RoomId, exit: RoomExit): boolean {
  if (exit.requiresStoryFlag && !state.storyFlags[exit.requiresStoryFlag]) return false;
  if (exit.requiresRoomSwitch && getRoomState(state, roomId).switches[exit.requiresRoomSwitch] !== true) return false;
  return true;
}

export function isRoomInteractionAvailable(
  state: AdventureState,
  roomId: RoomId,
  interaction: RoomInteractionDefinition,
): boolean {
  if (interaction.behavior.type !== 'exit') return true;
  const exit = getRoomExit(roomId, interaction.behavior.exitId);
  return Boolean(exit && isRoomExitAvailable(state, roomId, exit));
}

export function resolveRoomInteractionTarget(
  state: AdventureState,
  playerX: number,
): ResolvedRoomInteractionTarget | undefined {
  const room = findActiveRoom(state.currentRoom);
  if (!room) return undefined;

  return room.interactions
    .map(interaction => {
      const available = isRoomInteractionAvailable(state, room.id, interaction);
      return {
        ...interaction,
        available,
        displayLabel: available ? interaction.label : interaction.unavailableLabel ?? interaction.label,
        distance: Math.abs(playerX - interaction.x),
      };
    })
    .filter(target => target.distance <= target.radius)
    .sort((a, b) => a.distance - b.distance || a.x - b.x)
    .map(({ distance: _distance, ...target }) => target)[0];
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
  if (!isRoomExitAvailable(state, source.id, allowed)) {
    const requirement = allowed.requiresStoryFlag ?? allowed.requiresRoomSwitch ?? 'unknown requirement';
    return {
      status: 'invalid',
      reason: `Transition ${allowed.id} requires ${requirement}.`,
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
