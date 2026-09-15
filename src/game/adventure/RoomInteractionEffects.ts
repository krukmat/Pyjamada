import {
  getRoomState,
  markRoomInspected,
  markRoomInteraction,
  setRoomSwitch,
  setStoryFlag,
  type AdventureState,
  type RoomId,
} from './AdventureState';
import type { RoomInteractionEffect } from './RoomRegistry';

export type RoomInteractionEffectEvent =
  | { type: 'HALLWAY_CLOCK_INSPECTED' }
  | { type: 'LIVING_ROOM_PATH_REVEALED' }
  | { type: 'LIVING_ROOM_TV_ACTIVATED' }
  | { type: 'LAB_TRANSMISSION_SEEN' };

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
    case 'use-living-room-tv':
      return useLivingRoomTv(adventure, roomId);
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

function useLivingRoomTv(adventure: AdventureState, roomId: RoomId): RoomInteractionEffectResult {
  if (roomId !== 'living-room') return { adventure, events: [] };

  const livingRoom = getRoomState(adventure, 'living-room');
  const tvOn = livingRoom.switches['tv-on'] === true;
  if (!tvOn) {
    let next = setRoomSwitch(adventure, 'living-room', 'tv-on', true);
    next = markRoomInteraction(next, 'living-room', 'tv-activated');
    return { adventure: next, events: [{ type: 'LIVING_ROOM_TV_ACTIVATED' }] };
  }

  if (!adventure.storyFlags.labTransmissionSeen) {
    let next = markRoomInspected(adventure, 'living-room', 'television');
    next = markRoomInteraction(next, 'living-room', 'tv-transmission');
    next = setStoryFlag(next, 'labTransmissionSeen', true);
    return { adventure: next, events: [{ type: 'LAB_TRANSMISSION_SEEN' }] };
  }

  return { adventure, events: [] };
}
