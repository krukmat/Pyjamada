import { equal, test } from './assert';
import {
  applyFalseEscape,
  isAtticBasementRouteRevealed,
  isAtticExperimentRevealed,
  isAtticLogInspected,
  isAtticSensorsInspected,
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

function setupBathroom(runId: string) {
  const falseEscape = applyFalseEscape(preparedCompletedSession(runId), createAdventureState());
  const hallway = transitionAdventure(falseEscape.adventure, 'hallway', 'hallway-from-bedroom');
  if (hallway.status !== 'ok') throw new Error(hallway.reason);

  const clock = stepAdventureExploration(at(falseEscape.session, 64), hallway.state, 33);
  const livingRequestStep = stepAdventureExploration(at(clock.session, 114), clock.adventure, 33);
  const livingRequest = transitionRequest(livingRequestStep.events);
  if (!livingRequest) throw new Error('Living Room transition was not requested.');
  const living = transitionAdventure(livingRequestStep.adventure, livingRequest.targetRoom, livingRequest.targetEntry);
  if (living.status !== 'ok') throw new Error(living.reason);

  let session: HauntedSessionState = {
    ...livingRequestStep.session,
    player: { ...livingRequestStep.session.player, x: living.spawn.x, y: living.spawn.y, vx: 0, vy: 0, grounded: true, facing: living.spawn.facing },
    domestic: { ...livingRequestStep.session.domestic, player: { x: Math.round(living.spawn.x), facing: living.spawn.facing } },
    input: createHauntedInputState(),
  };

  const tvStatic = stepAdventureExploration(at(session, 109), living.state, 33);
  const transmission = stepAdventureExploration(at(tvStatic.session, 109), tvStatic.adventure, 33);
  const source = stepAdventureExploration(at(transmission.session, 84), transmission.adventure, 33);
  const kitchen = transitionAdventure(source.adventure, 'kitchen', 'kitchen-from-living-room');
  if (kitchen.status !== 'ok') throw new Error(kitchen.reason);

  session = {
    ...source.session,
    player: { ...source.session.player, x: kitchen.spawn.x, y: kitchen.spawn.y, vx: 0, vy: 0, grounded: true, facing: kitchen.spawn.facing },
    domestic: { ...source.session.domestic, player: { x: Math.round(kitchen.spawn.x), facing: kitchen.spawn.facing } },
    input: createHauntedInputState(),
  };

  const overload = stepAdventureExploration(at(session, 64), kitchen.state, 33);
  const reroute = stepAdventureExploration(at(overload.session, 108), overload.adventure, 33);
  const bathroom = transitionAdventure(reroute.adventure, 'bathroom', 'bathroom-from-kitchen');
  if (bathroom.status !== 'ok') throw new Error(bathroom.reason);

  session = {
    ...reroute.session,
    player: { ...reroute.session.player, x: bathroom.spawn.x, y: bathroom.spawn.y, vx: 0, vy: 0, grounded: true, facing: bathroom.spawn.facing },
    domestic: { ...reroute.session.domestic, player: { x: Math.round(bathroom.spawn.x), facing: bathroom.spawn.facing } },
    input: createHauntedInputState(),
  };

  return { session, adventure: bathroom.state };
}

function solveBathroom(runId: string) {
  const bathroom = setupBathroom(runId);
  const mirror = stepAdventureExploration(at(bathroom.session, 64), bathroom.adventure, 33);
  const light = stepAdventureExploration(at(mirror.session, 99), mirror.adventure, 33);
  const confirm = stepAdventureExploration(at(light.session, 64), light.adventure, 33);
  return { session: confirm.session, adventure: confirm.adventure };
}

void test('W4 keeps Attic locked until Bathroom reflection route is revealed', () => {
  const bathroom = setupBathroom('w4-attic-gate');

  const premature = transitionAdventure(bathroom.adventure, 'attic', 'attic-from-bathroom');
  equal(premature.status, 'invalid', 'Attic direct transition remains locked before Bathroom reveal');

  const solved = solveBathroom('w4-attic-open');
  const atticDoor = stepAdventureExploration(at(solved.session, 116), solved.adventure, 33);
  const request = transitionRequest(atticDoor.events);
  equal(request?.targetRoom, 'attic', 'revealed Bathroom seam points to Attic');
  equal(request?.targetEntry, 'attic-from-bathroom', 'Attic uses deterministic Bathroom entry');

  if (!request) return;
  const attic = transitionAdventure(atticDoor.adventure, request.targetRoom, request.targetEntry);
  equal(attic.status, 'ok', 'Attic transition becomes legal after Bathroom solution');
  if (attic.status !== 'ok') return;
  equal(attic.spawn.x, 14, 'Attic spawn is deterministic');
  equal(attic.state.currentRoom, 'attic', 'player enters Attic');
  equal(attic.state.visitedRooms.includes('attic'), true, 'Attic is tracked as visited');
});

void test('W4 reconstructs evidence before revealing the experiment and Basement boundary', () => {
  const solved = solveBathroom('w4-evidence-loop');
  const attic = transitionAdventure(solved.adventure, 'attic', 'attic-from-bathroom');
  if (attic.status !== 'ok') throw new Error(attic.reason);

  let session: HauntedSessionState = {
    ...solved.session,
    player: { ...solved.session.player, x: attic.spawn.x, y: attic.spawn.y, vx: 0, vy: 0, grounded: true, facing: attic.spawn.facing },
    domestic: { ...solved.session.domestic, player: { x: Math.round(attic.spawn.x), facing: attic.spawn.facing } },
    input: createHauntedInputState(),
  };

  const prematureRecorder = stepAdventureExploration(at(session, 98), attic.state, 33);
  equal(isAtticExperimentRevealed(prematureRecorder.adventure), false, 'Recorder cannot explain the experiment without evidence context');
  equal(prematureRecorder.events.some(event => event.type === 'ATTIC_RECORDER_INCOMPLETE'), true, 'premature recorder use emits one incomplete event');

  const log = stepAdventureExploration(at(prematureRecorder.session, 42), prematureRecorder.adventure, 33);
  equal(isAtticLogInspected(log.adventure), true, 'experiment log persists as evidence');
  equal(isAtticSensorsInspected(log.adventure), false, 'one clue is insufficient');
  equal(log.events.some(event => event.type === 'ATTIC_LOG_INSPECTED'), true, 'log discovery emits a deterministic event');

  const sensors = stepAdventureExploration(at(log.session, 70), log.adventure, 33);
  equal(isAtticSensorsInspected(sensors.adventure), true, 'sensor map persists as second evidence');
  equal(sensors.events.some(event => event.type === 'ATTIC_SENSORS_INSPECTED'), true, 'sensor discovery emits a deterministic event');
  equal(isAtticExperimentRevealed(sensors.adventure), false, 'evidence alone does not auto-play the revelation');

  const recording = stepAdventureExploration(at(sensors.session, 98), sensors.adventure, 33);
  equal(isAtticExperimentRevealed(recording.adventure), true, 'recorder becomes meaningful after both clues');
  equal(recording.events.some(event => event.type === 'ATTIC_EXPERIMENT_REVEALED'), true, 'main revelation emits one event');
  equal(isAtticBasementRouteRevealed(recording.adventure), false, 'recording does not fabricate a Basement transition automatically');

  const route = stepAdventureExploration(at(recording.session, 117), recording.adventure, 33);
  equal(isAtticBasementRouteRevealed(route.adventure), true, 'following the recorder cable reveals the Basement boundary');
  equal(route.events.some(event => event.type === 'ATTIC_BASEMENT_ROUTE_REVEALED'), true, 'Basement boundary emits one deterministic event');
  equal(getRoomState(route.adventure, 'attic').interactions.includes('basement-route-traced'), true, 'route trace persists in room history');

  const repeated = stepAdventureExploration(at(route.session, 117), route.adventure, 33);
  equal(repeated.events.some(event => event.type === 'ATTIC_BASEMENT_ROUTE_REVEALED'), false, 'revealed Basement boundary is idempotent');

  const encoded = encodeAdventureGameSession({ schemaVersion: 3, haunted: repeated.session, adventure: repeated.adventure });
  const restored = decodeAdventureGameSession(encoded);
  equal(restored.status, 'ok', 'Attic progression survives save/load');
  if (restored.status !== 'ok') return;
  equal(restored.state.adventure.currentRoom, 'attic', 'Continue restores Attic');
  equal(isAtticLogInspected(restored.state.adventure), true, 'log evidence survives Continue');
  equal(isAtticSensorsInspected(restored.state.adventure), true, 'sensor evidence survives Continue');
  equal(isAtticExperimentRevealed(restored.state.adventure), true, 'experiment reveal survives Continue');
  equal(isAtticBasementRouteRevealed(restored.state.adventure), true, 'Basement boundary survives Continue');

  const returnStep = stepAdventureExploration(at(restored.state.haunted, 10), restored.state.adventure, 33);
  const returnRequest = transitionRequest(returnStep.events);
  equal(returnRequest?.targetRoom, 'bathroom', 'Attic retains a production return path');
});

console.log('W4 Attic Gate A tests passed');
