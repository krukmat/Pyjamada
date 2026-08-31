import { V1_BEDROOM_DOOR, V1_BEDROOM_KEY } from '../content/objects';
import { BEDROOM_KEY_ID, type GameState } from './GameState';
import { canReachInteraction } from './InteractionEngine';
import { MOVE_STEP, PLAYER_GROUND_Y, type RoomId } from './World';

export type GameInput = 'left' | 'right' | 'action';
export type GameEvent =
  | { type: 'ITEM_PICKED'; itemId: string }
  | { type: 'DOOR_UNLOCKED'; doorId: 'bedroom-door' }
  | { type: 'ROOM_CHANGED'; roomId: RoomId }
  | { type: 'SLICE_COMPLETED' };

export type GameUpdate = { state: GameState; events: readonly GameEvent[] };

const LEFT_BOUND = 8;
const RIGHT_BOUND = 112;
const LOCKED_DOOR_X = V1_BEDROOM_DOOR.x;

export function updateGame(state: GameState, input: GameInput): GameUpdate {
  let next = state;
  const events: GameEvent[] = [];

  if (input === 'action') {
    const result = interact(next);
    next = result.state;
    events.push(...result.events);
    return { state: next, events };
  }

  next = moveHorizontally(next, input);

  const pickup = pickupBedroomKey(next);
  next = pickup.state;
  events.push(...pickup.events);

  const transition = transitionRoom(next);
  next = transition.state;
  events.push(...transition.events);

  return { state: next, events };
}

function moveHorizontally(state: GameState, direction: 'left' | 'right'): GameState {
  const delta = direction === 'left' ? -MOVE_STEP : MOVE_STEP;
  let nextX = state.player.x + delta;

  if (state.roomId === 'room-01' && !state.flags.bedroomDoorUnlocked) {
    nextX = Math.min(nextX, LOCKED_DOOR_X - 8);
  }

  nextX = Math.max(LEFT_BOUND, Math.min(RIGHT_BOUND, nextX));

  return {
    ...state,
    player: { ...state.player, x: nextX, y: PLAYER_GROUND_Y, facing: direction },
  };
}

function pickupBedroomKey(state: GameState): GameUpdate {
  if (state.flags.bedroomKeyCollected) return { state, events: [] };
  if (!canReachInteraction(
    { roomId: state.roomId, playerX: state.player.x, kind: 'proximity' },
    V1_BEDROOM_KEY,
  )) return { state, events: [] };

  return {
    state: {
      ...state,
      inventory: [...state.inventory, BEDROOM_KEY_ID],
      flags: { ...state.flags, bedroomKeyCollected: true },
    },
    events: [{ type: 'ITEM_PICKED', itemId: BEDROOM_KEY_ID }],
  };
}

function interact(state: GameState): GameUpdate {
  if (
    !state.flags.bedroomDoorUnlocked
    && state.inventory.includes(BEDROOM_KEY_ID)
    && canReachInteraction(
      { roomId: state.roomId, playerX: state.player.x, kind: 'action' },
      V1_BEDROOM_DOOR,
    )
  ) {
    return {
      state: {
        ...state,
        inventory: state.inventory.filter((item) => item !== BEDROOM_KEY_ID),
        flags: { ...state.flags, bedroomDoorUnlocked: true },
      },
      events: [{ type: 'DOOR_UNLOCKED', doorId: 'bedroom-door' }],
    };
  }

  return { state, events: [] };
}

function transitionRoom(state: GameState): GameUpdate {
  if (state.roomId === 'room-01' && state.flags.bedroomDoorUnlocked && state.player.x >= RIGHT_BOUND) {
    return roomChange(state, 'room-02', LEFT_BOUND, false);
  }

  if (state.roomId === 'room-02' && state.player.x >= RIGHT_BOUND) {
    return roomChange(state, 'room-03', LEFT_BOUND, true);
  }

  if (state.roomId === 'room-02' && state.player.x <= LEFT_BOUND && state.player.facing === 'left') {
    return roomChange(state, 'room-01', RIGHT_BOUND - 4, false);
  }

  if (state.roomId === 'room-03' && state.player.x <= LEFT_BOUND && state.player.facing === 'left') {
    return roomChange(state, 'room-02', RIGHT_BOUND - 4, false);
  }

  return { state, events: [] };
}

function roomChange(state: GameState, roomId: RoomId, x: number, completeSlice: boolean): GameUpdate {
  const flags = completeSlice && !state.flags.verticalSliceReached
    ? { ...state.flags, verticalSliceReached: true }
    : state.flags;
  const events: GameEvent[] = [{ type: 'ROOM_CHANGED', roomId }];
  if (completeSlice && !state.flags.verticalSliceReached) events.push({ type: 'SLICE_COMPLETED' });

  return {
    state: { ...state, roomId, flags, player: { ...state.player, x, y: PLAYER_GROUND_Y } },
    events,
  };
}
