import { equal, test } from './assert';
import {
  applyFalseEscape,
  hasLabTransmissionBeenSeen,
  isLivingRoomTvActivated,
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
  const door = stepAdventureExploration(at(clock.session, 114), clock.adventure, 33);
  const request = transitionRequest(door.events);
  if (!request) throw new Error('Living Room transition was not requested.');

  const living = transitionAdventure(door.adventure, request.targetRoom, request.targetEntry);
  if (living.status !== 'ok') throw new Error(living.reason);

  return {
    session: {
      ...door.session,
      player: { ...door.session.player, x: living.spawn.x, y: living.spawn.y, vx: 0, vy: 0, grounded: true, facing: living.spawn.facing },
      domestic: { ...door.session.domestic, player: { x: Math.round(living.spawn.x), facing: living.spawn.facing } },
      input: createHauntedInputState(),
    },
    adventure: living.state,
  };
}

void test('Gate B turns on the TV, reveals the lab transmission and persists the discovery', () => {
  const living = setupLivingRoom('gate-b');
  equal(isLivingRoomTvActivated(living.adventure), false, 'TV starts off');
  equal(hasLabTransmissionBeenSeen(living.adventure), false, 'lab transmission starts unseen');

  const staticStep = stepAdventureExploration(at(living.session, 109), living.adventure, 33);
  equal(isLivingRoomTvActivated(staticStep.adventure), true, 'first TV interaction turns it on');
  equal(hasLabTransmissionBeenSeen(staticStep.adventure), false, 'static does not reveal the lab yet');
  equal(staticStep.events.some(event => event.type === 'LIVING_ROOM_TV_ACTIVATED'), true, 'TV activation event emitted');
  equal(getRoomState(staticStep.adventure, 'living-room').interactions.includes('tv-activated'), true, 'TV activation persists locally');

  const transmissionStep = stepAdventureExploration(at(staticStep.session, 109), staticStep.adventure, 33);
  equal(hasLabTransmissionBeenSeen(transmissionStep.adventure), true, 'second TV interaction reveals transmission');
  equal(transmissionStep.events.some(event => event.type === 'LAB_TRANSMISSION_SEEN'), true, 'global transmission milestone emitted');
  equal(getRoomState(transmissionStep.adventure, 'living-room').inspected.includes('television'), true, 'TV discovery persists as inspection');
  equal(getRoomState(transmissionStep.adventure, 'living-room').interactions.includes('tv-transmission'), true, 'transmission interaction persists locally');

  const repeated = stepAdventureExploration(at(transmissionStep.session, 109), transmissionStep.adventure, 33);
  equal(repeated.events.some(event => event.type === 'LAB_TRANSMISSION_SEEN'), false, 'transmission milestone is idempotent');

  const encoded = encodeAdventureGameSession({ schemaVersion: 3, haunted: repeated.session, adventure: repeated.adventure });
  const restored = decodeAdventureGameSession(encoded);
  equal(restored.status, 'ok', 'Gate B state survives save/load');
  if (restored.status !== 'ok') return;
  equal(restored.state.adventure.currentRoom, 'living-room', 'Continue restores Living Room');
  equal(restored.state.adventure.storyFlags.labTransmissionSeen, true, 'global transmission flag restored');
  equal(getRoomState(restored.state.adventure, 'living-room').switches['tv-on'], true, 'TV power state restored');
  equal(getRoomState(restored.state.adventure, 'living-room').interactions.includes('tv-transmission'), true, 'local transmission history restored');
});

void test('pre-Gate-B v3 saves migrate labTransmissionSeen to false', () => {
  const living = setupLivingRoom('save-migration');
  const encoded = encodeAdventureGameSession({ schemaVersion: 3, haunted: living.session, adventure: living.adventure });
  const payload = JSON.parse(encoded) as { adventure: { storyFlags: Record<string, boolean> } };
  delete payload.adventure.storyFlags.labTransmissionSeen;

  const decoded = decodeAdventureGameSession(JSON.stringify(payload));
  equal(decoded.status, 'ok', 'pre-Gate-B save remains readable');
  if (decoded.status !== 'ok') return;
  equal(decoded.state.adventure.storyFlags.labTransmissionSeen, false, 'missing flag defaults to false');
});

console.log('Living Room Gate B tests passed');
