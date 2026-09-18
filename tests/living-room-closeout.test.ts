import { equal, test } from './assert';
import {
  applyFalseEscape,
  hasLabTransmissionBeenSeen,
  isLivingRoomPhotoInspected,
  isLivingRoomRadioInspected,
  isLivingRoomSourceCueRevealed,
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

void test('closeout keeps environmental clues optional and traces the source only after the lab transmission', () => {
  const living = setupLivingRoom('closeout');

  const photo = stepAdventureExploration(at(living.session, 55), living.adventure, 33);
  equal(isLivingRoomPhotoInspected(photo.adventure), true, 'photo anomaly persists after inspection');
  equal(photo.events.some(event => event.type === 'LIVING_ROOM_PHOTO_INSPECTED'), true, 'photo discovery emits one clue event');
  equal(getRoomState(photo.adventure, 'living-room').switches['photo-focused'], true, 'photo receives interaction feedback focus');

  const radioBeforeTransmission = stepAdventureExploration(at(photo.session, 84), photo.adventure, 33);
  equal(isLivingRoomRadioInspected(radioBeforeTransmission.adventure), true, 'radio static persists after inspection');
  equal(radioBeforeTransmission.events.some(event => event.type === 'LIVING_ROOM_RADIO_INSPECTED'), true, 'radio discovery emits one clue event');
  equal(isLivingRoomSourceCueRevealed(radioBeforeTransmission.adventure), false, 'radio cannot reveal the source before the lab transmission');

  const staticStep = stepAdventureExploration(at(radioBeforeTransmission.session, 109), radioBeforeTransmission.adventure, 33);
  const transmissionStep = stepAdventureExploration(at(staticStep.session, 109), staticStep.adventure, 33);
  equal(hasLabTransmissionBeenSeen(transmissionStep.adventure), true, 'TV still owns the global mystery reveal');
  equal(isLivingRoomSourceCueRevealed(transmissionStep.adventure), false, 'transmission alone does not fabricate a directional clue');

  const source = stepAdventureExploration(at(transmissionStep.session, 84), transmissionStep.adventure, 33);
  equal(isLivingRoomSourceCueRevealed(source.adventure), true, 'radio traces the matching pulse after transmission');
  equal(source.events.some(event => event.type === 'LIVING_ROOM_SOURCE_CUE_REVEALED'), true, 'source cue emits a milestone event');
  equal(getRoomState(source.adventure, 'living-room').interactions.includes('source-hum-traced'), true, 'source clue persists locally');

  const repeated = stepAdventureExploration(at(source.session, 84), source.adventure, 33);
  equal(repeated.events.some(event => event.type === 'LIVING_ROOM_SOURCE_CUE_REVEALED'), false, 'source cue milestone is idempotent');

  const encoded = encodeAdventureGameSession({ schemaVersion: 3, haunted: repeated.session, adventure: repeated.adventure });
  const restored = decodeAdventureGameSession(encoded);
  equal(restored.status, 'ok', 'closeout state survives save/load');
  if (restored.status !== 'ok') return;
  equal(isLivingRoomPhotoInspected(restored.state.adventure), true, 'photo clue restores');
  equal(isLivingRoomRadioInspected(restored.state.adventure), true, 'radio clue restores');
  equal(isLivingRoomSourceCueRevealed(restored.state.adventure), true, 'directional source cue restores');
  equal(restored.state.adventure.currentRoom, 'living-room', 'closeout does not open or enter ');
});

console.log('Living Room closeout tests passed');
