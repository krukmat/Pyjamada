import { deepEqual, equal, test } from './assert';
import {
  applyFalseEscape,
  stepAdventureExploration,
  type AdventureExplorationEvent,
} from '../src/game/adventure/AdventureExplorationRuntime';
import { decodeAdventureGameSession, encodeAdventureGameSession } from '../src/game/adventure/AdventureSessionCodec';
import { createAdventureState } from '../src/game/adventure/AdventureState';
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

void test('W2 Gate A navigates Hallway to Living Room and back with persistence', () => {
  const falseEscape = applyFalseEscape(preparedCompletedSession('w2-gate-a'), createAdventureState());
  const hallway = transitionAdventure(falseEscape.adventure, 'hallway', 'hallway-from-bedroom');
  if (hallway.status !== 'ok') throw new Error(hallway.reason);

  const clock = stepAdventureExploration(at(falseEscape.session, 64), hallway.state, 33);
  const livingDoorStep = stepAdventureExploration(at(clock.session, 114), clock.adventure, 33);
  const livingRequest = transitionRequest(livingDoorStep.events);
  if (!livingRequest) throw new Error('Living Room door did not request a room transition.');
  equal(livingRequest.targetRoom, 'living-room', 'Hallway door targets Living Room');
  equal(livingRequest.targetEntry, 'living-room-from-hallway', 'Living Room entry is deterministic');

  const living = transitionAdventure(livingDoorStep.adventure, livingRequest.targetRoom, livingRequest.targetEntry);
  if (living.status !== 'ok') throw new Error(living.reason);
  equal(living.state.currentRoom, 'living-room', 'Living Room becomes current room');
  deepEqual(living.state.visitedRooms, ['bedroom', 'hallway', 'living-room'], 'Living Room is tracked as visited');
  equal(living.spawn.x, 14, 'Living Room spawn x is stable');
  equal(living.spawn.facing, 'right', 'Living Room spawn faces inward');

  const livingSession = {
    ...livingDoorStep.session,
    player: {
      ...livingDoorStep.session.player,
      x: living.spawn.x,
      y: living.spawn.y,
      vx: 0,
      vy: 0,
      grounded: true,
      facing: living.spawn.facing,
    },
    domestic: {
      ...livingDoorStep.session.domestic,
      player: { x: Math.round(living.spawn.x), facing: living.spawn.facing },
    },
    input: createHauntedInputState(),
  };

  const encoded = encodeAdventureGameSession({ schemaVersion: 3, haunted: livingSession, adventure: living.state });
  const restored = decodeAdventureGameSession(encoded);
  equal(restored.status, 'ok', 'Living Room state survives save/load');
  if (restored.status !== 'ok') return;
  equal(restored.state.adventure.currentRoom, 'living-room', 'Continue restores Living Room');
  deepEqual(restored.state.adventure.visitedRooms, ['bedroom', 'hallway', 'living-room'], 'visited rooms survive continue');

  const returnStep = stepAdventureExploration(at(restored.state.haunted, 10), restored.state.adventure, 33);
  const hallwayRequest = transitionRequest(returnStep.events);
  if (!hallwayRequest) throw new Error('Living Room return door did not request Hallway transition.');
  equal(hallwayRequest.targetRoom, 'hallway', 'Living Room return targets Hallway');
  equal(hallwayRequest.targetEntry, 'hallway-from-living-room', 'Hallway return entry is deterministic');

  const back = transitionAdventure(returnStep.adventure, hallwayRequest.targetRoom, hallwayRequest.targetEntry);
  if (back.status !== 'ok') throw new Error(back.reason);
  equal(back.state.currentRoom, 'hallway', 'round trip returns to Hallway');
  equal(back.spawn.x, 108, 'Hallway return spawn is stable');
  equal(back.spawn.facing, 'left', 'Hallway return spawn faces inward');
});

console.log('W2 Living Room Gate A tests passed');
