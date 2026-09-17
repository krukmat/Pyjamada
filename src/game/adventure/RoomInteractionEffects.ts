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
  | { type: 'KITCHEN_POWER_REROUTED' }
  | { type: 'BATHROOM_MIRROR_ANOMALY_SEEN' }
  | { type: 'BATHROOM_LIGHT_TESTED' }
  | { type: 'BATHROOM_ROUTE_REVEALED' }
  | { type: 'ATTIC_LOG_INSPECTED' }
  | { type: 'ATTIC_SENSORS_INSPECTED' }
  | { type: 'ATTIC_RECORDER_INCOMPLETE' }
  | { type: 'ATTIC_EXPERIMENT_REVEALED' }
  | { type: 'ATTIC_BASEMENT_ROUTE_REVEALED' }
  | { type: 'BASEMENT_FAULT_TRACED' }
  | { type: 'BASEMENT_RELAY_NEEDS_TRACE' }
  | { type: 'BASEMENT_POWER_STABILIZED' }
  | { type: 'BASEMENT_TERMINAL_OFFLINE' }
  | { type: 'BASEMENT_CONTROL_REVEALED' };

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
    case 'inspect-bathroom-mirror':
      return inspectBathroomMirror(adventure, roomId);
    case 'use-bathroom-light':
      return useBathroomLight(adventure, roomId);
    case 'inspect-attic-log':
      return inspectAtticLog(adventure, roomId);
    case 'inspect-attic-sensors':
      return inspectAtticSensors(adventure, roomId);
    case 'use-attic-recorder':
      return useAtticRecorder(adventure, roomId);
    case 'trace-attic-basement-route':
      return traceAtticBasementRoute(adventure, roomId);
    case 'inspect-basement-conduit':
      return inspectBasementConduit(adventure, roomId);
    case 'use-basement-relay':
      return useBasementRelay(adventure, roomId);
    case 'use-basement-terminal':
      return useBasementTerminal(adventure, roomId);
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

function inspectBathroomMirror(adventure: AdventureState, roomId: RoomId): RoomInteractionEffectResult {
  if (roomId !== 'bathroom') return { adventure, events: [] };

  const bathroom = getRoomState(adventure, 'bathroom');
  const anomalySeen = bathroom.switches['mirror-anomaly-seen'] === true;
  const lightOff = bathroom.switches['bathroom-light-off'] === true;
  const routeRevealed = bathroom.switches['mirror-route-revealed'] === true;

  let next = markRoomInspected(adventure, 'bathroom', 'mirror-mismatch');
  next = markRoomInteraction(next, 'bathroom', 'mirror-inspected');

  if (!anomalySeen) {
    next = setRoomSwitch(next, 'bathroom', 'mirror-anomaly-seen', true);
    return { adventure: next, events: [{ type: 'BATHROOM_MIRROR_ANOMALY_SEEN' }] };
  }

  if (lightOff && !routeRevealed) {
    next = setRoomSwitch(next, 'bathroom', 'mirror-route-revealed', true);
    next = markRoomInteraction(next, 'bathroom', 'mirror-route-confirmed');
    return { adventure: next, events: [{ type: 'BATHROOM_ROUTE_REVEALED' }] };
  }

  return { adventure: next, events: [] };
}

function useBathroomLight(adventure: AdventureState, roomId: RoomId): RoomInteractionEffectResult {
  if (roomId !== 'bathroom') return { adventure, events: [] };

  const bathroom = getRoomState(adventure, 'bathroom');
  if (bathroom.switches['bathroom-light-off'] === true) return { adventure, events: [] };

  let next = markRoomInteraction(adventure, 'bathroom', 'light-switch-tested');
  next = setRoomSwitch(next, 'bathroom', 'bathroom-light-off', true);
  return { adventure: next, events: [{ type: 'BATHROOM_LIGHT_TESTED' }] };
}

function inspectAtticLog(adventure: AdventureState, roomId: RoomId): RoomInteractionEffectResult {
  if (roomId !== 'attic') return { adventure, events: [] };

  const attic = getRoomState(adventure, 'attic');
  const alreadySeen = attic.inspected.includes('attic-experiment-log');
  let next = markRoomInspected(adventure, 'attic', 'attic-experiment-log');
  next = markRoomInteraction(next, 'attic', 'attic-log-inspected');
  next = setRoomSwitch(next, 'attic', 'log-focused', true);
  next = setRoomSwitch(next, 'attic', 'sensors-focused', false);
  next = setRoomSwitch(next, 'attic', 'recorder-focused', false);

  return { adventure: next, events: alreadySeen ? [] : [{ type: 'ATTIC_LOG_INSPECTED' }] };
}

function inspectAtticSensors(adventure: AdventureState, roomId: RoomId): RoomInteractionEffectResult {
  if (roomId !== 'attic') return { adventure, events: [] };

  const attic = getRoomState(adventure, 'attic');
  const alreadySeen = attic.inspected.includes('attic-sensor-map');
  let next = markRoomInspected(adventure, 'attic', 'attic-sensor-map');
  next = markRoomInteraction(next, 'attic', 'attic-sensors-inspected');
  next = setRoomSwitch(next, 'attic', 'log-focused', false);
  next = setRoomSwitch(next, 'attic', 'sensors-focused', true);
  next = setRoomSwitch(next, 'attic', 'recorder-focused', false);

  return { adventure: next, events: alreadySeen ? [] : [{ type: 'ATTIC_SENSORS_INSPECTED' }] };
}

function useAtticRecorder(adventure: AdventureState, roomId: RoomId): RoomInteractionEffectResult {
  if (roomId !== 'attic') return { adventure, events: [] };

  const attic = getRoomState(adventure, 'attic');
  const logSeen = attic.inspected.includes('attic-experiment-log');
  const sensorsSeen = attic.inspected.includes('attic-sensor-map');
  const revealed = attic.switches['experiment-revealed'] === true;
  let next = setRoomSwitch(adventure, 'attic', 'log-focused', false);
  next = setRoomSwitch(next, 'attic', 'sensors-focused', false);
  next = setRoomSwitch(next, 'attic', 'recorder-focused', true);

  if (!logSeen || !sensorsSeen) {
    const alreadyProbed = attic.interactions.includes('attic-recorder-probed');
    next = markRoomInteraction(next, 'attic', 'attic-recorder-probed');
    return { adventure: next, events: alreadyProbed ? [] : [{ type: 'ATTIC_RECORDER_INCOMPLETE' }] };
  }

  if (revealed) return { adventure: next, events: [] };

  next = markRoomInteraction(next, 'attic', 'attic-recording-played');
  next = setRoomSwitch(next, 'attic', 'experiment-revealed', true);
  return { adventure: next, events: [{ type: 'ATTIC_EXPERIMENT_REVEALED' }] };
}

function traceAtticBasementRoute(adventure: AdventureState, roomId: RoomId): RoomInteractionEffectResult {
  if (roomId !== 'attic') return { adventure, events: [] };

  const attic = getRoomState(adventure, 'attic');
  if (attic.switches['experiment-revealed'] !== true || attic.switches['basement-route-revealed'] === true) {
    return { adventure, events: [] };
  }

  let next = markRoomInspected(adventure, 'attic', 'downward-cable-run');
  next = markRoomInteraction(next, 'attic', 'basement-route-traced');
  next = setRoomSwitch(next, 'attic', 'recorder-focused', false);
  next = setRoomSwitch(next, 'attic', 'basement-route-revealed', true);
  return { adventure: next, events: [{ type: 'ATTIC_BASEMENT_ROUTE_REVEALED' }] };
}

function inspectBasementConduit(adventure: AdventureState, roomId: RoomId): RoomInteractionEffectResult {
  if (roomId !== 'basement') return { adventure, events: [] };

  const basement = getRoomState(adventure, 'basement');
  const alreadyTraced = basement.switches['basement-fault-traced'] === true;
  if (basement.switches['basement-power-stabilized'] === true) return { adventure, events: [] };

  let next = markRoomInspected(adventure, 'basement', 'unstable-power-conduit');
  next = markRoomInteraction(next, 'basement', 'basement-fault-traced');
  next = setRoomSwitch(next, 'basement', 'basement-fault-traced', true);
  next = setRoomSwitch(next, 'basement', 'conduit-focused', true);
  next = setRoomSwitch(next, 'basement', 'relay-focused', false);
  next = setRoomSwitch(next, 'basement', 'terminal-focused', false);

  return { adventure: next, events: alreadyTraced ? [] : [{ type: 'BASEMENT_FAULT_TRACED' }] };
}

function useBasementRelay(adventure: AdventureState, roomId: RoomId): RoomInteractionEffectResult {
  if (roomId !== 'basement') return { adventure, events: [] };

  const basement = getRoomState(adventure, 'basement');
  if (basement.switches['basement-power-stabilized'] === true) return { adventure, events: [] };

  const faultTraced = basement.switches['basement-fault-traced'] === true;
  if (!faultTraced) {
    const alreadyProbed = basement.interactions.includes('basement-relay-probed');
    let next = markRoomInteraction(adventure, 'basement', 'basement-relay-probed');
    next = setRoomSwitch(next, 'basement', 'conduit-focused', false);
    next = setRoomSwitch(next, 'basement', 'relay-focused', true);
    next = setRoomSwitch(next, 'basement', 'terminal-focused', false);
    return { adventure: next, events: alreadyProbed ? [] : [{ type: 'BASEMENT_RELAY_NEEDS_TRACE' }] };
  }

  let next = markRoomInteraction(adventure, 'basement', 'basement-relay-stabilized');
  next = setRoomSwitch(next, 'basement', 'conduit-focused', false);
  next = setRoomSwitch(next, 'basement', 'relay-focused', true);
  next = setRoomSwitch(next, 'basement', 'terminal-focused', false);
  next = setRoomSwitch(next, 'basement', 'basement-power-stabilized', true);

  return { adventure: next, events: [{ type: 'BASEMENT_POWER_STABILIZED' }] };
}

function useBasementTerminal(adventure: AdventureState, roomId: RoomId): RoomInteractionEffectResult {
  if (roomId !== 'basement') return { adventure, events: [] };

  const basement = getRoomState(adventure, 'basement');
  const powerStable = basement.switches['basement-power-stabilized'] === true;
  const alreadyRevealed = basement.switches['basement-control-revealed'] === true;
  let next = setRoomSwitch(adventure, 'basement', 'conduit-focused', false);
  next = setRoomSwitch(next, 'basement', 'relay-focused', false);
  next = setRoomSwitch(next, 'basement', 'terminal-focused', true);

  if (!powerStable) {
    const alreadyProbed = basement.interactions.includes('basement-terminal-probed');
    next = markRoomInteraction(next, 'basement', 'basement-terminal-probed');
    return { adventure: next, events: alreadyProbed ? [] : [{ type: 'BASEMENT_TERMINAL_OFFLINE' }] };
  }

  if (alreadyRevealed) return { adventure: next, events: [] };

  next = markRoomInspected(next, 'basement', 'resonance-control-terminal');
  next = markRoomInteraction(next, 'basement', 'basement-control-read');
  next = setRoomSwitch(next, 'basement', 'basement-control-revealed', true);
  return { adventure: next, events: [{ type: 'BASEMENT_CONTROL_REVEALED' }] };
}
