import {
  markRoomInspected,
  setRoomSwitch,
  type AdventureState,
  type RoomId,
} from './AdventureState';
import type { RoomInteractionEffect } from './RoomRegistry';

export type RoomInteractionEffectEvent =
  | { type: 'HALLWAY_CLOCK_INSPECTED' }
  | { type: 'LIVING_ROOM_PATH_REVEALED' };

export type RoomInteractionEffectResult = {
  adventure: AdventureState;
  events: RoomInteractionEffectEvent[];
};

export function applyRoomInteractionEffect(
  adventure: AdventureState,
  roomId: RoomId,
  effect: RoomInteractionEffect,
): RoomInteractionEffectResult {
  switch (effect) {
    case 'inspect-backward-clock':
      return inspectBackwardClock(adventure, roomId);
  }
}

function inspectBackwardClock(adventure: AdventureState, roomId: RoomId): RoomInteractionEffectResult {
  if (roomId !== 'hallway') return { adventure, events: [] };

  const wasInspected = adventure.rooms.hallway?.inspected.includes('backward-clock') === true;
  let next = markRoomInspected(adventure, 'hallway', 'backward-clock');
  next = setRoomSwitch(next, 'hallway', 'living-room-unlocked', true);

  return {
    adventure: next,
    events: wasInspected
      ? []
      : [{ type: 'HALLWAY_CLOCK_INSPECTED' }, { type: 'LIVING_ROOM_PATH_REVEALED' }],
  };
}
