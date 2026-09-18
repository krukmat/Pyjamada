import { equal, test } from './assert';
import {
  applyFalseEscape,
  isBathroomLightOff,
  isBathroomMirrorAnomalySeen,
  isBathroomRouteRevealed,
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

function setupKitchen(runId: string) {
  const falseEscape = applyFalseEscape(preparedCompletedSession(runId), createAdventureState());
  const hallway = transitionAdventure(falseEscape.adventure, 'hallway', 'hallway-from-bedroom');
  if (hallway.status !== 'ok') throw new Error(hallway.reason);

  const clock = stepAdventureExploration(at(falseEscape.session, 64), hallway.state, 33);
  const livingRequestStep = stepAdventureExploration(at(clock.session, 114), clock.adventure, 33);
  const livingRequest = transitionRequest(livingRequestStep.events);
  if (!livingRequest) throw new Error('Living Room transition was not requested.');
  const living = transitionAdventure(livingRequestStep.adventure, livingRequest.targetRoom, livingRequest.targetEntry);
  if (living.status !== 'ok') throw new Error(living.reason);

  const livingSession = {
    ...livingRequestStep.session,
    player: { ...livingRequestStep.session.player, x: living.spawn.x, y: living.spawn.y, vx: 0, vy: 0, grounded: true, facing: living.spawn.facing },
    domestic: { ...livingRequestStep.session.domestic, player: { x: Math.round(living.spawn.x), facing: living.spawn.facing } },
    input: createHauntedInputState(),
  };

  const tvStatic = stepAdventureExploration(at(livingSession, 109), living.state, 33);
  const transmission = stepAdventureExploration(at(tvStatic.session, 109), tvStatic.adventure, 33);
  const source = stepAdventureExploration(at(transmission.session, 84), transmission.adventure, 33);
  const kitchen = transitionAdventure(source.adventure, 'kitchen', 'kitchen-from-living-room');
  if (kitchen.status !== 'ok') throw new Error(kitchen.reason);

  return {
    session: {
      ...source.session,
      player: { ...source.session.player, x: kitchen.spawn.x, y: kitchen.spawn.y, vx: 0, vy: 0, grounded: true, facing: kitchen.spawn.facing },
      domestic: { ...source.session.domestic, player: { x: Math.round(kitchen.spawn.x), facing: kitchen.spawn.facing } },
      input: createHauntedInputState(),
    },
    adventure: kitchen.state,
  };
}

void test('keeps Bathroom locked until Kitchen power is rerouted', () => {
  const kitchen = setupKitchen('route-gate');

  const prematureDirect = transitionAdventure(kitchen.adventure, 'bathroom', 'bathroom-from-kitchen');
  equal(prematureDirect.status, 'invalid', 'Bathroom direct transition stays locked before Kitchen solution');

  const prematureDoor = stepAdventureExploration(at(kitchen.session, 116), kitchen.adventure, 33);
  equal(transitionRequest(prematureDoor.events), undefined, 'Bathroom door cannot request a transition before reroute');

  const overload = stepAdventureExploration(at(kitchen.session, 64), kitchen.adventure, 33);
  const reroute = stepAdventureExploration(at(overload.session, 108), overload.adventure, 33);
  equal(isKitchenPowerRerouted(reroute.adventure), true, 'Kitchen solution unlocks deeper progression');

  const bathroomDoor = stepAdventureExploration(at(reroute.session, 116), reroute.adventure, 33);
  const request = transitionRequest(bathroomDoor.events);
  equal(request?.targetRoom, 'bathroom', 'solved Kitchen points to Bathroom');
  equal(request?.targetEntry, 'bathroom-from-kitchen', 'Bathroom uses production Kitchen entry');

  if (!request) return;
  const bathroom = transitionAdventure(bathroomDoor.adventure, request.targetRoom, request.targetEntry);
  equal(bathroom.status, 'ok', 'Bathroom transition becomes legal after reroute');
  if (bathroom.status !== 'ok') return;
  equal(bathroom.state.currentRoom, 'bathroom', 'player enters Bathroom');
  equal(bathroom.spawn.x, 14, 'Bathroom spawn is deterministic');
  equal(bathroom.state.visitedRooms.includes('bathroom'), true, 'Bathroom is tracked as visited');
});

void test('requires observing the mirror, testing the light, then confirming the route', () => {
  const kitchen = setupKitchen('reflection-loop');
  const overload = stepAdventureExploration(at(kitchen.session, 64), kitchen.adventure, 33);
  const reroute = stepAdventureExploration(at(overload.session, 108), overload.adventure, 33);
  const bathroom = transitionAdventure(reroute.adventure, 'bathroom', 'bathroom-from-kitchen');
  if (bathroom.status !== 'ok') throw new Error(bathroom.reason);

  const bathroomSession = {
    ...reroute.session,
    player: { ...reroute.session.player, x: bathroom.spawn.x, y: bathroom.spawn.y, vx: 0, vy: 0, grounded: true, facing: bathroom.spawn.facing },
    domestic: { ...reroute.session.domestic, player: { x: Math.round(bathroom.spawn.x), facing: bathroom.spawn.facing } },
    input: createHauntedInputState(),
  };

  equal(isBathroomMirrorAnomalySeen(bathroom.state), false, 'Bathroom starts before explicit mirror inspection');
  equal(isBathroomLightOff(bathroom.state), false, 'real Bathroom light starts on');
  equal(isBathroomRouteRevealed(bathroom.state), false, 'Attic boundary starts hidden in real geometry');

  const mirror = stepAdventureExploration(at(bathroomSession, 64), bathroom.state, 33);
  equal(isBathroomMirrorAnomalySeen(mirror.adventure), true, 'first mirror interaction records the spatial mismatch');
  equal(mirror.events.some(event => event.type === 'BATHROOM_MIRROR_ANOMALY_SEEN'), true, 'mirror discovery emits a deterministic event');
  equal(isBathroomRouteRevealed(mirror.adventure), false, 'mirror observation alone does not materialize the route');

  const prematureConfirm = stepAdventureExploration(at(mirror.session, 64), mirror.adventure, 33);
  equal(isBathroomRouteRevealed(prematureConfirm.adventure), false, 'rechecking the lit mirror cannot skip the light experiment');
  equal(prematureConfirm.events.some(event => event.type === 'BATHROOM_ROUTE_REVEALED'), false, 'no route event occurs before the light test');

  const light = stepAdventureExploration(at(prematureConfirm.session, 99), prematureConfirm.adventure, 33);
  equal(isBathroomLightOff(light.adventure), true, 'light switch darkens the real room');
  equal(getRoomState(light.adventure, 'bathroom').interactions.includes('light-switch-tested'), true, 'light experiment persists in room history');
  equal(light.events.some(event => event.type === 'BATHROOM_LIGHT_TESTED'), true, 'light test emits a deterministic event');
  equal(isBathroomRouteRevealed(light.adventure), false, 'light contrast still requires mirror confirmation');

  const confirm = stepAdventureExploration(at(light.session, 64), light.adventure, 33);
  equal(isBathroomRouteRevealed(confirm.adventure), true, 'mirror confirmation after darkness reveals the hidden route');
  equal(getRoomState(confirm.adventure, 'bathroom').interactions.includes('mirror-route-confirmed'), true, 'route confirmation persists as room history');
  equal(confirm.events.some(event => event.type === 'BATHROOM_ROUTE_REVEALED'), true, 'route reveal emits one progression event');

  const repeated = stepAdventureExploration(at(confirm.session, 64), confirm.adventure, 33);
  equal(repeated.events.some(event => event.type === 'BATHROOM_ROUTE_REVEALED'), false, 'solved mirror state is idempotent');
  equal(isBathroomRouteRevealed(repeated.adventure), true, 'revealed geometry remains stable');

  const encoded = encodeAdventureGameSession({ schemaVersion: 3, haunted: repeated.session, adventure: repeated.adventure });
  const restored = decodeAdventureGameSession(encoded);
  equal(restored.status, 'ok', 'Bathroom progression survives save/load');
  if (restored.status !== 'ok') return;
  equal(restored.state.adventure.currentRoom, 'bathroom', 'Continue restores Bathroom');
  equal(isBathroomMirrorAnomalySeen(restored.state.adventure), true, 'mirror discovery survives Continue');
  equal(isBathroomLightOff(restored.state.adventure), true, 'light state survives Continue');
  equal(isBathroomRouteRevealed(restored.state.adventure), true, 'route reveal survives Continue');

  const returnStep = stepAdventureExploration(at(restored.state.haunted, 10), restored.state.adventure, 33);
  const returnRequest = transitionRequest(returnStep.events);
  equal(returnRequest?.targetRoom, 'kitchen', 'Bathroom retains a production return path');
});

console.log('Bathroom Gate A tests passed');
