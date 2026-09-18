import { equal, test } from './assert';
import {
  applyFalseEscape,
  findAdventureInteractionTarget,
  isBasementControlRevealed,
  isBasementLaboratoryRouteRevealed,
  isBasementLossOfControlRevealed,
  stepAdventureExploration,
  type AdventureExplorationEvent,
} from '../src/game/adventure/AdventureExplorationRuntime';
import { decodeAdventureGameSession, encodeAdventureGameSession } from '../src/game/adventure/AdventureSessionCodec';
import { createAdventureState, setRoomSwitch } from '../src/game/adventure/AdventureState';
import { resolveBasementElectricalHazard } from '../src/game/adventure/BasementElectricalHazard';
import { applyRoomInteractionEffect } from '../src/game/adventure/RoomInteractionEffects';
import { transitionAdventure } from '../src/game/adventure/RoomRegistry';
import { createHauntedInputState, pressAction } from '../src/game/haunted/HauntedInput';
import { createHauntedSession, type HauntedSessionState } from '../src/game/haunted/HauntedSessionRuntime';

function preparedSession(runId: string): HauntedSessionState {
  const base = createHauntedSession(runId);
  return {
    ...base,
    domestic: {
      ...base.domestic,
      wallyState: 'normal',
      flags: { ...base.domestic.flags, dressed: true },
      collected: ['keys'],
      objectStates: { ...base.domestic.objectStates, wardrobe: 'used', keys: 'collected' },
      interactionCounts: { ...base.domestic.interactionCounts, wardrobe: 1, keys: 1 },
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

function setupBasement(runId: string) {
  const falseEscape = applyFalseEscape(preparedSession(runId), createAdventureState());
  let adventure = falseEscape.adventure;

  const hallway = transitionAdventure(adventure, 'hallway', 'hallway-from-bedroom');
  if (hallway.status !== 'ok') throw new Error(hallway.reason);
  adventure = setRoomSwitch(hallway.state, 'hallway', 'living-room-unlocked', true);

  const living = transitionAdventure(adventure, 'living-room', 'living-room-from-hallway');
  if (living.status !== 'ok') throw new Error(living.reason);
  adventure = setRoomSwitch(living.state, 'living-room', 'source-hum-traced', true);

  const kitchen = transitionAdventure(adventure, 'kitchen', 'kitchen-from-living-room');
  if (kitchen.status !== 'ok') throw new Error(kitchen.reason);
  adventure = setRoomSwitch(kitchen.state, 'kitchen', 'power-rerouted', true);

  const bathroom = transitionAdventure(adventure, 'bathroom', 'bathroom-from-kitchen');
  if (bathroom.status !== 'ok') throw new Error(bathroom.reason);
  adventure = setRoomSwitch(bathroom.state, 'bathroom', 'mirror-route-revealed', true);

  const attic = transitionAdventure(adventure, 'attic', 'attic-from-bathroom');
  if (attic.status !== 'ok') throw new Error(attic.reason);
  adventure = setRoomSwitch(attic.state, 'attic', 'basement-route-revealed', true);

  const basement = transitionAdventure(adventure, 'basement', 'basement-from-attic');
  if (basement.status !== 'ok') throw new Error(basement.reason);

  const session: HauntedSessionState = {
    ...falseEscape.session,
    player: { ...falseEscape.session.player, x: basement.spawn.x, y: basement.spawn.y, vx: 0, vy: 0, grounded: true, facing: basement.spawn.facing },
    domestic: { ...falseEscape.session.domestic, player: { x: Math.round(basement.spawn.x), facing: basement.spawn.facing } },
    input: createHauntedInputState(),
  };

  return { session, adventure: basement.state };
}

function reachControlReveal(runId: string) {
  const basement = setupBasement(runId);
  const trace = stepAdventureExploration(at(basement.session, 54), basement.adventure, 33);
  const stabilize = stepAdventureExploration(at(trace.session, 92), trace.adventure, 33);
  const reveal = stepAdventureExploration(at(stabilize.session, 116), stabilize.adventure, 33);
  equal(isBasementControlRevealed(reveal.adventure), true, 'control terminal reveals the critical resonance load');
  return reveal;
}

void test('W5 T6 turns the existing control terminal into a rejected local failsafe', () => {
  const reveal = reachControlReveal('w5-loss-control');
  equal(isBasementLossOfControlRevealed(reveal.adventure), false, 'T4 reveal does not skip the T6 failsafe attempt');

  const failsafe = stepAdventureExploration(at(reveal.session, 116), reveal.adventure, 33);
  equal(isBasementLossOfControlRevealed(failsafe.adventure), true, 'second terminal use persists loss of local control');
  equal(failsafe.events.some(event => event.type === 'BASEMENT_FAILSAFE_REJECTED'), true, 'rejected failsafe emits one deterministic milestone');

  const repeated = stepAdventureExploration(at(failsafe.session, 116), failsafe.adventure, 33);
  equal(repeated.events.some(event => event.type === 'BASEMENT_FAILSAFE_REJECTED'), false, 'failsafe rejection is idempotent');
});

void test('W5 T7 exposes a Laboratory feed boundary only after the failsafe is rejected', () => {
  const reveal = reachControlReveal('w5-lab-boundary');
  const before = findAdventureInteractionTarget(reveal.adventure, 116);
  equal(before?.id, 'basement-control-terminal', 'Laboratory hatch does not compete with the terminal before T6');

  const premature = applyRoomInteractionEffect(reveal.adventure, 'basement', 'trace-basement-laboratory-route');
  equal(isBasementLaboratoryRouteRevealed(premature.adventure), false, 'Laboratory route cannot be traced before loss of control');
  equal(premature.events.length, 0, 'premature route trace is a no-op');

  const failsafe = stepAdventureExploration(at(reveal.session, 116), reveal.adventure, 33);
  const hatch = findAdventureInteractionTarget(failsafe.adventure, 116);
  equal(hatch?.id, 'basement-laboratory-feed-hatch', 'rejected failsafe exposes the LAB FEED HATCH interaction');
  equal(hatch?.displayLabel, 'LAB FEED HATCH', 'boundary has a concrete player-facing label');

  const route = stepAdventureExploration(at(failsafe.session, 116), failsafe.adventure, 33);
  equal(isBasementLaboratoryRouteRevealed(route.adventure), true, 'hatch inspection persists the Laboratory boundary');
  equal(route.events.some(event => event.type === 'BASEMENT_LABORATORY_ROUTE_REVEALED'), true, 'route reveal emits one deterministic milestone');
  equal(route.adventure.currentRoom, 'basement', 'T7 stops at the Laboratory boundary instead of implementing the room');

  const repeated = stepAdventureExploration(at(route.session, 116), route.adventure, 33);
  equal(repeated.events.some(event => event.type === 'BASEMENT_LABORATORY_ROUTE_REVEALED'), false, 'Laboratory boundary reveal is idempotent');
});

void test('W5 T8 preserves T6/T7 progression, hazard pressure and the Attic return path across save/load', () => {
  const reveal = reachControlReveal('w5-persistence');
  const failsafe = stepAdventureExploration(at(reveal.session, 116), reveal.adventure, 33);
  const route = stepAdventureExploration(at(failsafe.session, 116), failsafe.adventure, 33);

  const hazard = resolveBasementElectricalHazard(route.adventure, route.session.elapsedMs);
  equal(hazard.phase === 'inactive', false, 'revealing the Laboratory route does not disable the Basement hazard');

  const encoded = encodeAdventureGameSession({ schemaVersion: 3, haunted: route.session, adventure: route.adventure });
  const restored = decodeAdventureGameSession(encoded);
  equal(restored.status, 'ok', 'W5 closeout state survives save/load');
  if (restored.status !== 'ok') return;

  equal(restored.state.adventure.currentRoom, 'basement', 'Continue resumes in Basement');
  equal(isBasementControlRevealed(restored.state.adventure), true, 'critical control reveal survives Continue');
  equal(isBasementLossOfControlRevealed(restored.state.adventure), true, 'failsafe rejection survives Continue');
  equal(isBasementLaboratoryRouteRevealed(restored.state.adventure), true, 'Laboratory boundary survives Continue');

  const returnStep = stepAdventureExploration(at(restored.state.haunted, 10), restored.state.adventure, 33);
  const request = transitionRequest(returnStep.events);
  equal(request?.targetRoom, 'attic', 'Basement retains the return route after T7');
  if (!request) return;

  const attic = transitionAdventure(returnStep.adventure, request.targetRoom, request.targetEntry);
  equal(attic.status, 'ok', 'Attic return transition remains valid');
  if (attic.status !== 'ok') return;
  equal(isBasementLaboratoryRouteRevealed(attic.state), true, 'room transition does not erase Basement closeout state');
});

console.log('W5 Basement closeout tests passed');
