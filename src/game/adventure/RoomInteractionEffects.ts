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
  | { type: 'LAB_TRANSMISSION_SEEN' }
  | { type: 'LIVING_ROOM_PHOTO_INSPECTED' }
  | { type: 'LIVING_ROOM_RADIO_INSPECTED' }
  | { type: 'LIVING_ROOM_SOURCE_CUE_REVEALED' }
  | { type: 'KITCHEN_CIRCUIT_OVERLOADED' }
  | { type: 'KITCHEN_BREAKER_INSPECTED' }
  | { type: 'KITCHEN_POWER_REROUTED' };

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
    case 'inspect-living-room-photo':
      return inspectLivingRoomPhoto(adventure, roomId);
    case 'inspect-living-room-radio':
      return inspectLivingRoomRadio(adventure, roomId);
    case 'use-kitchen-microwave':
      return useKitchenMicrowave(adventure, roomId);
    case 'use-kitchen-breaker':
      return useKitchenBreaker(adventure, roomId);
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
    next = setRoomSwitch(next, 'living-room', 'photo-focused', false);
    next = setRoomSwitch(next, 'living-room', 'radio-focused', false);
    next = markRoomInteraction(next, 'living-room', 'tv-activated');
    return { adventure: next, events: [{ type: 'LIVING_ROOM_TV_ACTIVATED' }] };
  }

  if (!adventure.storyFlags.labTransmissionSeen) {
    let next = markRoomInspected(adventure, 'living-room', 'television');
    next = markRoomInteraction(next, 'living-room', 'tv-transmission');
    next = setRoomSwitch(next, 'living-room', 'photo-focused', false);
    next = setRoomSwitch(next, 'living-room', 'radio-focused', false);
    next = setStoryFlag(next, 'labTransmissionSeen', true);
    return { adventure: next, events: [{ type: 'LAB_TRANSMISSION_SEEN' }] };
  }

  return { adventure, events: [] };
}

function inspectLivingRoomPhoto(adventure: AdventureState, roomId: RoomId): RoomInteractionEffectResult {
  if (roomId !== 'living-room') return { adventure, events: [] };

  const livingRoom = getRoomState(adventure, 'living-room');
  const wasInspected = livingRoom.inspected.includes('photo-reflection');
  let next = markRoomInspected(adventure, 'living-room', 'photo-reflection');
  next = markRoomInteraction(next, 'living-room', 'photo-inspected');
  next = setRoomSwitch(next, 'living-room', 'photo-focused', true);
  next = setRoomSwitch(next, 'living-room', 'radio-focused', false);

  return {
    adventure: next,
    events: wasInspected ? [] : [{ type: 'LIVING_ROOM_PHOTO_INSPECTED' }],
  };
}

function inspectLivingRoomRadio(adventure: AdventureState, roomId: RoomId): RoomInteractionEffectResult {
  if (roomId !== 'living-room') return { adventure, events: [] };

  const livingRoom = getRoomState(adventure, 'living-room');
  const wasInspected = livingRoom.inspected.includes('radio-static');
  const sourceAlreadyRevealed = livingRoom.switches['source-hum-traced'] === true;
  let next = markRoomInspected(adventure, 'living-room', 'radio-static');
  next = markRoomInteraction(next, 'living-room', 'radio-inspected');
  next = setRoomSwitch(next, 'living-room', 'photo-focused', false);
  next = setRoomSwitch(next, 'living-room', 'radio-focused', true);

  const events: RoomInteractionEffectEvent[] = wasInspected
    ? []
    : [{ type: 'LIVING_ROOM_RADIO_INSPECTED' }];

  if (adventure.storyFlags.labTransmissionSeen && !sourceAlreadyRevealed) {
    next = setRoomSwitch(next, 'living-room', 'source-hum-traced', true);
    next = markRoomInteraction(next, 'living-room', 'source-hum-traced');
    events.push({ type: 'LIVING_ROOM_SOURCE_CUE_REVEALED' });
  }

  return { adventure: next, events };
}

function useKitchenMicrowave(adventure: AdventureState, roomId: RoomId): RoomInteractionEffectResult {
  if (roomId !== 'kitchen') return { adventure, events: [] };

  const kitchen = getRoomState(adventure, 'kitchen');
  if (kitchen.switches['power-rerouted'] === true || kitchen.switches['circuit-overloaded'] === true) {
    return { adventure, events: [] };
  }

  let next = markRoomInspected(adventure, 'kitchen', 'microwave');
  next = markRoomInteraction(next, 'kitchen', 'microwave-overload');
  next = setRoomSwitch(next, 'kitchen', 'microwave-on', true);
  next = setRoomSwitch(next, 'kitchen', 'circuit-overloaded', true);
  next = setRoomSwitch(next, 'kitchen', 'breaker-focused', false);

  return { adventure: next, events: [{ type: 'KITCHEN_CIRCUIT_OVERLOADED' }] };
}

function useKitchenBreaker(adventure: AdventureState, roomId: RoomId): RoomInteractionEffectResult {
  if (roomId !== 'kitchen') return { adventure, events: [] };

  const kitchen = getRoomState(adventure, 'kitchen');
  if (kitchen.switches['power-rerouted'] === true) return { adventure, events: [] };

  const wasInspected = kitchen.inspected.includes('breaker-panel');
  const overloaded = kitchen.switches['circuit-overloaded'] === true;
  let next = markRoomInspected(adventure, 'kitchen', 'breaker-panel');
  next = markRoomInteraction(next, 'kitchen', 'breaker-inspected');

  if (!overloaded) {
    next = setRoomSwitch(next, 'kitchen', 'breaker-focused', true);
    return {
      adventure: next,
      events: wasInspected ? [] : [{ type: 'KITCHEN_BREAKER_INSPECTED' }],
    };
  }

  next = setRoomSwitch(next, 'kitchen', 'breaker-focused', false);
  next = setRoomSwitch(next, 'kitchen', 'circuit-overloaded', false);
  next = setRoomSwitch(next, 'kitchen', 'microwave-on', false);
  next = setRoomSwitch(next, 'kitchen', 'power-rerouted', true);
  next = markRoomInteraction(next, 'kitchen', 'power-rerouted');

  return { adventure: next, events: [{ type: 'KITCHEN_POWER_REROUTED' }] };
}
