import { equal, test } from './assert';
import {
  applyFalseEscape,
  isKitchenBreakerInspected,
  isKitchenCircuitOverloaded,
  isKitchenPowerRerouted,
  stepAdventureExploration,
  type AdventureExplorationEvent,
} from '../src/game/adventure/AdventureExplorationRuntime';
import { decodeAdventureGameSession, encodeAdventureGameSession } from '../src/game/adventure/AdventureSessionCodec';
import { createAdventureState, getRoomState } from '../src/game/adventure/AdventureState';
import { transitionAdventure } from '../src/game/adventure/RoomRegistry';
import { createHauntedInputState, pressAction } from '../src/game/haunted/HauntedInput';
import { createHauntedSession, type HauntedSessionState } from '../src/game/haunted/HauntedSessionRuntime';

function preparedCompletedSession(runId: string): HauntedSessionState {
  const base = createHauntedSession(runId);
  return {
    ...base,
    domestic: {
      ...base.domestic,
      wallyState: 'normal',
      flags: { ...base.domestic.flags, dressed: true },
      collected: ['keys'],
      interactionCounts: { ...base.domestic.interactionCounts, wardrobe: 1, keys: 1 },
      objectStates: { ...base.domestic.objectStates, wardrobe: 'used', keys: 'collected' },
    },
    objective: { phase: 'completed' },
  };
}

function at(session: HauntedSessionState, x: number): HauntedSessionState {
  return {
    ...session,
    player: { ...session.player, x, y: 104, vx: 0, vy: 0, grounded: true, facing: 'right' },
    domestic: { ...session.domestic, player: { x: Math.round(x), facing: 'right' } },
    input: pressAction(createHauntedInputState(), 'interact'),
  };
}

function transitionRequest(events: readonly AdventureExplorationEvent[]) {
  return events.find((event): event is Extract<AdventureExplorationEvent, { type: 'ROOM_TRANSITION_REQUESTED' }> => event.type === 'ROOM_TRANSITION_REQUESTED');
}

function setupLivingRoom(runId: string) {
  const falseEscape = applyFalseEscape(preparedCompletedSession(runId), createAdventureState());
  const hallway = transitionAdventure(falseEscape.adventure, 'hallway', 'hallway-from-bedroom');
  if (hallway.status !== 'ok') throw new Error(hallway.reason);

  const clock = stepAdventureExploration(at(falseEscape.session, 64), hallway.state, 33);
  const livingDoor = stepAdventureExploration(at(clock.session, 114), clock.adventure, 33);
  const request = transitionRequest(livingDoor.events);
  if (!request) throw new Error('Living Room transition was not requested.');
  const living = transitionAdventure(livingDoor.adventure, request.targetRoom, request.targetEntry);
  if (living.status !== 'ok') throw new Error(living.reason);

  return {
    session: {
      ...livingDoor.session,
      player: { ...livingDoor.session.player, x: living.spawn.x, y: living.spawn.y, vx: 0, vy: 0, grounded: true, facing: living.spawn.facing },
      domestic: { ...livingDoor.session.domestic, player: { x: Math.round(living.spawn.x), facing: living.spawn.facing } },
      input: createHauntedInputState(),
    },
    adventure: living.state,
  };
}

void test('W3 Gate A unlocks Kitchen only after tracing the Living Room source cue', () => {
  const living = setupLivingRoom('w3-kitchen-route');

  const tvStatic = stepAdventureExploration(at(living.session, 109), living.adventure, 33);
  const transmission = stepAdventureExploration(at(tvStatic.session, 109), tvStatic.adventure, 33);

  const prematureDirect = transitionAdventure(transmission.adventure, 'kitchen', 'kitchen-from-living-room');
  equal(prematureDirect.status, 'invalid', 'Kitchen direct transition stays locked before source cue');

  const prematureDoor = stepAdventureExploration(at(transmission.session, 116), transmission.adventure, 33);
  equal(transitionRequest(prematureDoor.events), undefined, 'Kitchen interaction does not request transition before source cue');

  const source = stepAdventureExploration(at(transmission.session, 84), transmission.adventure, 33);
  equal(getRoomState(source.adventure, 'living-room').switches['source-hum-traced'], true, 'radio trace unlocks Kitchen route');

  const kitchenDoor = stepAdventureExploration(at(source.session, 116), source.adventure, 33);
  const request = transitionRequest(kitchenDoor.events);
  equal(request?.targetRoom, 'kitchen', 'source cue makes Kitchen the next real room');
  equal(request?.targetEntry, 'kitchen-from-living-room', 'Kitchen uses its production Living Room entry');

  if (!request) return;
  const kitchen = transitionAdventure(kitchenDoor.adventure, request.targetRoom, request.targetEntry);
  equal(kitchen.status, 'ok', 'Kitchen transition becomes legal after source cue');
  if (kitchen.status !== 'ok') return;
  equal(kitchen.state.currentRoom, 'kitchen', 'player enters Kitchen');
  equal(kitchen.spawn.x, 14, 'Kitchen spawn is deterministic');
  equal(kitchen.state.visitedRooms.includes('kitchen'), true, 'Kitchen is tracked as visited');
});

void test('W3 Gate A uses microwave load to expose the breaker and reroute the power', () => {
  const living = setupLivingRoom('w3-kitchen-power');
  const tvStatic = stepAdventureExploration(at(living.session, 109), living.adventure, 33);
  const transmission = stepAdventureExploration(at(tvStatic.session, 109), tvStatic.adventure, 33);
  const source = stepAdventureExploration(at(transmission.session, 84), transmission.adventure, 33);
  const kitchen = transitionAdventure(source.adventure, 'kitchen', 'kitchen-from-living-room');
  if (kitchen.status !== 'ok') throw new Error(kitchen.reason);

  const kitchenSession = {
    ...source.session,
    player: { ...source.session.player, x: kitchen.spawn.x, y: kitchen.spawn.y, vx: 0, vy: 0, grounded: true, facing: kitchen.spawn.facing },
    domestic: { ...source.session.domestic, player: { x: Math.round(kitchen.spawn.x), facing: kitchen.spawn.facing } },
    input: createHauntedInputState(),
  };

  equal(isKitchenCircuitOverloaded(kitchen.state), false, 'Kitchen circuit starts stable');
  equal(isKitchenPowerRerouted(kitchen.state), false, 'Kitchen power starts unrouted');

  const breakerFirst = stepAdventureExploration(at(kitchenSession, 108), kitchen.state, 33);
  equal(isKitchenBreakerInspected(breakerFirst.adventure), true, 'breaker can be inspected before a useful load exists');
  equal(isKitchenPowerRerouted(breakerFirst.adventure), false, 'breaker alone cannot solve the room');
  equal(breakerFirst.events.some(event => event.type === 'KITCHEN_BREAKER_INSPECTED'), true, 'first breaker inspection emits a clue event');

  const overload = stepAdventureExploration(at(breakerFirst.session, 64), breakerFirst.adventure, 33);
  equal(isKitchenCircuitOverloaded(overload.adventure), true, 'microwave creates the required electrical overload');
  equal(getRoomState(overload.adventure, 'kitchen').switches['microwave-on'], true, 'microwave power state persists');
  equal(overload.events.some(event => event.type === 'KITCHEN_CIRCUIT_OVERLOADED'), true, 'overload emits a deterministic event');

  const reroute = stepAdventureExploration(at(overload.session, 108), overload.adventure, 33);
  equal(isKitchenCircuitOverloaded(reroute.adventure), false, 'breaker clears the overload');
  equal(isKitchenPowerRerouted(reroute.adventure), true, 'breaker reroutes the circuit after overload');
  equal(getRoomState(reroute.adventure, 'kitchen').switches['microwave-on'], false, 'microwave shuts down after reroute');
  equal(getRoomState(reroute.adventure, 'kitchen').interactions.includes('power-rerouted'), true, 'solution persists as room history');
  equal(reroute.events.some(event => event.type === 'KITCHEN_POWER_REROUTED'), true, 'solution emits one progression event');

  const repeatedMicrowave = stepAdventureExploration(at(reroute.session, 64), reroute.adventure, 33);
  equal(repeatedMicrowave.events.some(event => event.type === 'KITCHEN_CIRCUIT_OVERLOADED'), false, 'solved Kitchen cannot accidentally re-open the overload');
  equal(isKitchenPowerRerouted(repeatedMicrowave.adventure), true, 'solved power state remains stable');

  const encoded = encodeAdventureGameSession({ schemaVersion: 3, haunted: repeatedMicrowave.session, adventure: repeatedMicrowave.adventure });
  const restored = decodeAdventureGameSession(encoded);
  equal(restored.status, 'ok', 'Kitchen solution survives save/load');
  if (restored.status !== 'ok') return;
  equal(restored.state.adventure.currentRoom, 'kitchen', 'Continue restores Kitchen');
  equal(getRoomState(restored.state.adventure, 'kitchen').switches['power-rerouted'], true, 'rerouted circuit survives Continue');
  equal(getRoomState(restored.state.adventure, 'kitchen').switches['circuit-overloaded'], false, 'resolved overload remains resolved');

  const returnStep = stepAdventureExploration(at(restored.state.haunted, 10), restored.state.adventure, 33);
  const returnRequest = transitionRequest(returnStep.events);
  equal(returnRequest?.targetRoom, 'living-room', 'Kitchen retains a production return path');
});

console.log('W3 Kitchen Gate A tests passed');
