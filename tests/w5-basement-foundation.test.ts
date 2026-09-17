import { equal, test } from './assert';
import {
  applyFalseEscape,
  isBasementFaultTraced,
  isBasementPowerStabilized,
  stepAdventureExploration,
  type AdventureExplorationEvent,
} from '../src/game/adventure/AdventureExplorationRuntime';
import { decodeAdventureGameSession, encodeAdventureGameSession } from '../src/game/adventure/AdventureSessionCodec';
import { createAdventureState, setRoomSwitch } from '../src/game/adventure/AdventureState';
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

function setupAttic(runId: string) {
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

  const session = {
    ...falseEscape.session,
    player: { ...falseEscape.session.player, x: attic.spawn.x, y: attic.spawn.y, vx: 0, vy: 0, grounded: true, facing: attic.spawn.facing },
    domestic: { ...falseEscape.session.domestic, player: { x: Math.round(attic.spawn.x), facing: attic.spawn.facing } },
    input: createHauntedInputState(),
  };

  return { session, adventure: attic.state };
}

void test('W5 keeps Basement locked until the accepted Attic route is revealed', () => {
  const attic = setupAttic('w5-basement-lock');
  const premature = transitionAdventure(attic.adventure, 'basement', 'basement-from-attic');
  equal(premature.status, 'invalid', 'Basement remains locked before Attic route reveal');

  const revealed = setRoomSwitch(attic.adventure, 'attic', 'basement-route-revealed', true);
  const exitStep = stepAdventureExploration(at(attic.session, 122), revealed, 33);
  const request = transitionRequest(exitStep.events);
  equal(request?.targetRoom, 'basement', 'Attic hatch targets Basement');
  equal(request?.targetEntry, 'basement-from-attic', 'Basement uses deterministic Attic entry');

  if (!request) return;
  const basement = transitionAdventure(exitStep.adventure, request.targetRoom, request.targetEntry);
  equal(basement.status, 'ok', 'Basement transition is legal after route reveal');
  if (basement.status !== 'ok') return;
  equal(basement.spawn.x, 14, 'Basement spawn is deterministic');
  equal(basement.state.currentRoom, 'basement', 'player enters Basement');
  equal(basement.state.visitedRooms.includes('basement'), true, 'Basement becomes visited');

  const returnStep = stepAdventureExploration(at(exitStep.session, 10), basement.state, 33);
  const returnRequest = transitionRequest(returnStep.events);
  equal(returnRequest?.targetRoom, 'attic', 'Basement keeps a production return route to Attic');
});

void test('W5 requires tracing the conduit before the isolation relay can stabilize power', () => {
  const attic = setupAttic('w5-basement-power');
  const revealed = setRoomSwitch(attic.adventure, 'attic', 'basement-route-revealed', true);
  const basement = transitionAdventure(revealed, 'basement', 'basement-from-attic');
  if (basement.status !== 'ok') throw new Error(basement.reason);

  let session: HauntedSessionState = {
    ...attic.session,
    player: { ...attic.session.player, x: basement.spawn.x, y: basement.spawn.y, vx: 0, vy: 0, grounded: true, facing: basement.spawn.facing },
    domestic: { ...attic.session.domestic, player: { x: Math.round(basement.spawn.x), facing: basement.spawn.facing } },
    input: createHauntedInputState(),
  };

  const prematureRelay = stepAdventureExploration(at(session, 92), basement.state, 33);
  equal(isBasementPowerStabilized(prematureRelay.adventure), false, 'relay cannot stabilize an untraced fault');
  equal(prematureRelay.events.some(event => event.type === 'BASEMENT_RELAY_NEEDS_TRACE'), true, 'premature relay use gives one deterministic clue');

  const trace = stepAdventureExploration(at(prematureRelay.session, 54), prematureRelay.adventure, 33);
  equal(isBasementFaultTraced(trace.adventure), true, 'conduit inspection persists the fault trace');
  equal(trace.events.some(event => event.type === 'BASEMENT_FAULT_TRACED'), true, 'fault trace emits one deterministic event');
  equal(isBasementPowerStabilized(trace.adventure), false, 'tracing alone does not solve the power subsystem');

  const stabilize = stepAdventureExploration(at(trace.session, 92), trace.adventure, 33);
  equal(isBasementPowerStabilized(stabilize.adventure), true, 'relay stabilizes the feed after fault trace');
  equal(stabilize.events.some(event => event.type === 'BASEMENT_POWER_STABILIZED'), true, 'stabilization emits one deterministic event');

  const repeated = stepAdventureExploration(at(stabilize.session, 92), stabilize.adventure, 33);
  equal(repeated.events.some(event => event.type === 'BASEMENT_POWER_STABILIZED'), false, 'stabilized relay is idempotent');

  const encoded = encodeAdventureGameSession({ schemaVersion: 3, haunted: repeated.session, adventure: repeated.adventure });
  const restored = decodeAdventureGameSession(encoded);
  equal(restored.status, 'ok', 'Basement progression survives save/load');
  if (restored.status !== 'ok') return;
  equal(restored.state.adventure.currentRoom, 'basement', 'Continue restores Basement');
  equal(isBasementFaultTraced(restored.state.adventure), true, 'fault trace survives Continue');
  equal(isBasementPowerStabilized(restored.state.adventure), true, 'stabilized feed survives Continue');
});

console.log('W5 Basement foundation tests passed');
