import {
  createRoomPersistentState,
  getRoomState,
  type AdventureState,
  type RoomId,
  type StoryFlag,
} from './AdventureState';

export type RoomPresentationId = 'bedroom' | 'hallway' | 'living-room' | 'kitchen' | 'bathroom' | 'attic' | 'basement';

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

export type RoomInteractionEffect =
  | 'inspect-backward-clock'
  | 'use-living-room-tv'
  | 'inspect-living-room-photo'
  | 'inspect-living-room-radio'
  | 'use-kitchen-microwave'
  | 'use-kitchen-breaker'
  | 'inspect-bathroom-mirror'
  | 'use-bathroom-light'
  | 'inspect-attic-log'
  | 'inspect-attic-sensors'
  | 'use-attic-recorder'
  | 'trace-attic-basement-route'
  | 'inspect-basement-conduit'
  | 'use-basement-relay';

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

export const ACTIVE_ROOM_IDS = ['bedroom', 'hallway', 'living-room', 'kitchen', 'bathroom', 'attic', 'basement'] as const satisfies readonly RoomId[];

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
      { id: 'living-room-from-kitchen', x: 110, y: 104, facing: 'left' },
    ],
    exits: [
      { id: 'living-room-to-hallway', targetRoom: 'hallway', targetEntry: 'hallway-from-living-room' },
      {
        id: 'living-room-to-kitchen',
        targetRoom: 'kitchen',
        targetEntry: 'kitchen-from-living-room',
        requiresRoomSwitch: 'source-hum-traced',
      },
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
        id: 'living-room-photo',
        label: 'PHOTO',
        x: 55,
        radius: 8,
        behavior: { type: 'effect', effect: 'inspect-living-room-photo' },
      },
      {
        id: 'living-room-radio',
        label: 'RADIO',
        x: 84,
        radius: 8,
        behavior: { type: 'effect', effect: 'inspect-living-room-radio' },
      },
      {
        id: 'living-room-tv',
        label: 'TELEVISION',
        x: 109,
        radius: 12,
        behavior: { type: 'effect', effect: 'use-living-room-tv' },
      },
      {
        id: 'living-room-kitchen-door',
        label: 'KITCHEN',
        unavailableLabel: 'KITCHEN · NO SIGNAL',
        x: 116,
        radius: 6,
        behavior: { type: 'exit', exitId: 'living-room-to-kitchen' },
      },
    ],
  },
  kitchen: {
    id: 'kitchen',
    presentationId: 'kitchen',
    entries: [
      { id: 'kitchen-from-living-room', x: 14, y: 104, facing: 'right' },
      { id: 'kitchen-from-bathroom', x: 110, y: 104, facing: 'left' },
    ],
    exits: [
      { id: 'kitchen-to-living-room', targetRoom: 'living-room', targetEntry: 'living-room-from-kitchen' },
      {
        id: 'kitchen-to-bathroom',
        targetRoom: 'bathroom',
        targetEntry: 'bathroom-from-kitchen',
        requiresRoomSwitch: 'power-rerouted',
      },
    ],
    interactions: [
      {
        id: 'kitchen-living-room-door',
        label: 'LIVING ROOM',
        x: 10,
        radius: 8,
        behavior: { type: 'exit', exitId: 'kitchen-to-living-room' },
      },
      {
        id: 'kitchen-microwave',
        label: 'MICROWAVE',
        x: 64,
        radius: 10,
        behavior: { type: 'effect', effect: 'use-kitchen-microwave' },
      },
      {
        id: 'kitchen-breaker',
        label: 'BREAKER',
        x: 108,
        radius: 9,
        behavior: { type: 'effect', effect: 'use-kitchen-breaker' },
      },
      {
        id: 'kitchen-bathroom-door',
        label: 'BATHROOM',
        unavailableLabel: 'DARK DOOR',
        x: 122,
        radius: 8,
        behavior: { type: 'exit', exitId: 'kitchen-to-bathroom' },
      },
    ],
  },
  bathroom: {
    id: 'bathroom',
    presentationId: 'bathroom',
    entries: [
      { id: 'bathroom-from-kitchen', x: 14, y: 104, facing: 'right' },
      { id: 'bathroom-from-attic', x: 110, y: 104, facing: 'left' },
    ],
    exits: [
      { id: 'bathroom-to-kitchen', targetRoom: 'kitchen', targetEntry: 'kitchen-from-bathroom' },
      {
        id: 'bathroom-to-attic',
        targetRoom: 'attic',
        targetEntry: 'attic-from-bathroom',
        requiresRoomSwitch: 'mirror-route-revealed',
      },
    ],
    interactions: [
      {
        id: 'bathroom-kitchen-door',
        label: 'KITCHEN',
        x: 10,
        radius: 8,
        behavior: { type: 'exit', exitId: 'bathroom-to-kitchen' },
      },
      {
        id: 'bathroom-mirror',
        label: 'MIRROR',
        x: 64,
        radius: 11,
        behavior: { type: 'effect', effect: 'inspect-bathroom-mirror' },
      },
      {
        id: 'bathroom-light-switch',
        label: 'LIGHT SWITCH',
        x: 99,
        radius: 8,
        behavior: { type: 'effect', effect: 'use-bathroom-light' },
      },
      {
        id: 'bathroom-attic-route',
        label: 'ATTIC',
        unavailableLabel: 'HIDDEN SEAM',
        x: 116,
        radius: 8,
        behavior: { type: 'exit', exitId: 'bathroom-to-attic' },
      },
    ],
  },
  attic: {
    id: 'attic',
    presentationId: 'attic',
    entries: [
      { id: 'attic-from-bathroom', x: 14, y: 104, facing: 'right' },
      { id: 'attic-from-basement', x: 110, y: 104, facing: 'left' },
    ],
    exits: [
      { id: 'attic-to-bathroom', targetRoom: 'bathroom', targetEntry: 'bathroom-from-attic' },
      {
        id: 'attic-to-basement',
        targetRoom: 'basement',
        targetEntry: 'basement-from-attic',
        requiresRoomSwitch: 'basement-route-revealed',
      },
    ],
    interactions: [
      {
        id: 'attic-bathroom-stair',
        label: 'BATHROOM',
        x: 10,
        radius: 8,
        behavior: { type: 'exit', exitId: 'attic-to-bathroom' },
      },
      {
        id: 'attic-experiment-log',
        label: 'EXPERIMENT LOG',
        x: 42,
        radius: 9,
        behavior: { type: 'effect', effect: 'inspect-attic-log' },
      },
      {
        id: 'attic-sensor-crate',
        label: 'SENSOR CRATE',
        x: 70,
        radius: 9,
        behavior: { type: 'effect', effect: 'inspect-attic-sensors' },
      },
      {
        id: 'attic-recorder',
        label: 'RECORDER',
        x: 98,
        radius: 10,
        behavior: { type: 'effect', effect: 'use-attic-recorder' },
      },
      {
        id: 'attic-downward-cable',
        label: 'DOWNWARD CABLE',
        x: 117,
        radius: 8,
        behavior: { type: 'effect', effect: 'trace-attic-basement-route' },
      },
      {
        id: 'attic-basement-hatch',
        label: 'BASEMENT',
        unavailableLabel: 'SEALED HATCH',
        x: 122,
        radius: 8,
        behavior: { type: 'exit', exitId: 'attic-to-basement' },
      },
    ],
  },
  basement: {
    id: 'basement',
    presentationId: 'basement',
    entries: [
      { id: 'basement-from-attic', x: 14, y: 104, facing: 'right' },
    ],
    exits: [
      { id: 'basement-to-attic', targetRoom: 'attic', targetEntry: 'attic-from-basement' },
    ],
    interactions: [
      {
        id: 'basement-attic-ladder',
        label: 'ATTIC',
        x: 10,
        radius: 8,
        behavior: { type: 'exit', exitId: 'basement-to-attic' },
      },
      {
        id: 'basement-power-conduit',
        label: 'POWER CONDUIT',
        x: 54,
        radius: 10,
        behavior: { type: 'effect', effect: 'inspect-basement-conduit' },
      },
      {
        id: 'basement-isolation-relay',
        label: 'ISOLATION RELAY',
        x: 92,
        radius: 10,
        behavior: { type: 'effect', effect: 'use-basement-relay' },
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
