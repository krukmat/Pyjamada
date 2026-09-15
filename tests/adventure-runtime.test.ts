import { deepEqual, equal, test } from './assert';
import {
  applyFalseEscape,
  findAdventureInteractionTarget,
  isHallwayClockInspected,
  isLivingRoomDoorReached,
  isLivingRoomPathRevealed,
  stepAdventureExploration,
} from '../src/game/adventure/AdventureExplorationRuntime';
import { AdventureSaveCoordinator } from '../src/game/adventure/AdventureSaveCoordinator';
import { createAdventureGameSession, type AdventureGameSessionState } from '../src/game/adventure/AdventureGameSession';
import { AdventureSessionCoordinator } from '../src/game/adventure/AdventureSessionCoordinator';
import { decodeAdventureGameSession, encodeAdventureGameSession } from '../src/game/adventure/AdventureSessionCodec';
import {
  createAdventureState,
  getRoomState,
  hasStoryFlag,
  setStoryFlag,
} from '../src/game/adventure/AdventureState';
import { getRoomInteraction, transitionAdventure } from '../src/game/adventure/RoomRegistry';
import { pressAction } from '../src/game/haunted/HauntedInput';
import { createHauntedSession, type HauntedSessionState } from '../src/game/haunted/HauntedSessionRuntime';
import type { AdventureGameSavePort, AdventureGameSaveReadResult } from '../src/game/ports/AdventureGameSavePort';

class FakeAdventureSavePort implements AdventureGameSavePort {
  saveCount = 0;
  state: AdventureGameSessionState | null = null;

  async read(): Promise<AdventureGameSaveReadResult> {
    return this.state ? { status: 'ok', state: this.state } : { status: 'none' };
  }

  async save(state: AdventureGameSessionState): Promise<void> {
    this.saveCount += 1;
    this.state = state;
  }

  async clear(): Promise<void> {
    this.state = null;
  }
}

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

void test('adventure starts in Bedroom with only Bedroom visited', () => {
  const state = createAdventureState();
  equal(state.currentRoom, 'bedroom', 'initial room');
  equal(state.currentEntry, 'bedroom-default', 'initial entry');
  deepEqual(state.visitedRooms, ['bedroom'], 'initial visited rooms');
  equal(hasStoryFlag(state, 'bedroomEscapeAttempted'), false, 'escape flag starts clear');
});

void test('story flag setting is immutable and idempotent', () => {
  const state = createAdventureState();
  const flagged = setStoryFlag(state, 'hallwayUnlocked');
  equal(hasStoryFlag(flagged, 'hallwayUnlocked'), true, 'hallway flag set');
  equal(hasStoryFlag(state, 'hallwayUnlocked'), false, 'source state unchanged');
  equal(setStoryFlag(flagged, 'hallwayUnlocked'), flagged, 'repeated set reuses state');
});

void test('room registry owns W1 interaction and exit definitions', () => {
  const bedroomDoor = getRoomInteraction('bedroom', 'bedroom-hallway-door');
  equal(bedroomDoor?.behavior.type, 'exit', 'Bedroom Hallway interaction is an exit definition');
  if (bedroomDoor?.behavior.type === 'exit') equal(bedroomDoor.behavior.exitId, 'bedroom-to-hallway', 'interaction points to registered exit');

  const clock = getRoomInteraction('hallway', 'backward-clock');
  equal(clock?.behavior.type, 'effect', 'Hallway clock is declarative room content');
  if (clock?.behavior.type === 'effect') equal(clock.behavior.effect, 'inspect-backward-clock', 'clock effect is explicit');
});

void test('Bedroom to Hallway is locked until the false escape opens the house', () => {
  const state = createAdventureState();
  const blocked = transitionAdventure(state, 'hallway', 'hallway-from-bedroom');
  equal(blocked.status, 'invalid', 'hallway is locked before story flag');

  const unlocked = setStoryFlag(state, 'hallwayUnlocked');
  const hallway = transitionAdventure(unlocked, 'hallway', 'hallway-from-bedroom');
  if (hallway.status !== 'ok') throw new Error(hallway.reason);
  equal(hallway.state.currentRoom, 'hallway', 'entered hallway');
  deepEqual(hallway.state.visitedRooms, ['bedroom', 'hallway'], 'hallway marked visited');
  equal(hallway.spawn.x, 14, 'hallway spawn x');

  const bedroom = transitionAdventure(hallway.state, 'bedroom', 'bedroom-from-hallway');
  if (bedroom.status !== 'ok') throw new Error(bedroom.reason);
  equal(bedroom.state.currentRoom, 'bedroom', 'returned to bedroom');
  deepEqual(bedroom.state.visitedRooms, ['bedroom', 'hallway'], 'visited rooms remain stable');
  equal(bedroom.spawn.facing, 'left', 'bedroom return facing');
});

void test('invalid transition is rejected without changing source state', () => {
  const state = createAdventureState();
  const result = transitionAdventure(state, 'kitchen', 'kitchen-default');
  equal(result.status, 'invalid', 'unregistered transition rejected');
  equal(state.currentRoom, 'bedroom', 'source room unchanged');
  deepEqual(state.visitedRooms, ['bedroom'], 'source visited rooms unchanged');
});

void test('false escape keeps Haunted terminal state while Adventure takes over progression', () => {
  const session = preparedCompletedSession('false-escape');
  const result = applyFalseEscape(session, createAdventureState());
  equal(result.session.objective.phase, 'completed', 'Haunted slice stays completed');
  equal(result.adventure.storyFlags.bedroomEscapeAttempted, true, 'escape attempt remembered by Adventure');
  equal(result.adventure.storyFlags.hallwayUnlocked, true, 'hallway unlocked');
  equal(result.session.player.x, 24, 'Wally rematerializes inside Bedroom');
  equal(result.session.threats.ghosts.length, 0, 'act-I threats are cleared');
  equal(getRoomState(result.adventure, 'bedroom').interactions.includes('false-escape'), true, 'false escape persists as room history');
});

void test('altered Bedroom interaction requests the registered Hallway transition', () => {
  const falseEscape = applyFalseEscape(preparedCompletedSession('bedroom-door'), createAdventureState());
  const positioned = {
    ...falseEscape.session,
    player: { ...falseEscape.session.player, x: 112 },
    input: pressAction(falseEscape.session.input, 'interact'),
  };
  const stepped = stepAdventureExploration(positioned, falseEscape.adventure, 33);
  equal(stepped.events.some(event => event.type === 'ROOM_TRANSITION_REQUESTED' && event.targetRoom === 'hallway'), true, 'door requests Hallway');
});

void test('Hallway clock reveals Living Room path and persists the anomaly', () => {
  const falseEscape = applyFalseEscape(preparedCompletedSession('clock'), createAdventureState());
  const hallway = transitionAdventure(falseEscape.adventure, 'hallway', 'hallway-from-bedroom');
  if (hallway.status !== 'ok') throw new Error(hallway.reason);

  const livingBefore = findAdventureInteractionTarget(hallway.state, 114);
  equal(livingBefore?.available, false, 'Living Room door starts sealed');
  equal(livingBefore?.displayLabel, 'SEALED DOOR', 'sealed presentation comes from room definition');

  const atClock = {
    ...falseEscape.session,
    player: { ...falseEscape.session.player, x: 64 },
    input: pressAction(falseEscape.session.input, 'interact'),
  };
  const inspected = stepAdventureExploration(atClock, hallway.state, 33);
  equal(isHallwayClockInspected(inspected.adventure), true, 'backward clock recorded');
  equal(isLivingRoomPathRevealed(inspected.adventure), true, 'clock reveals Living Room path');
  equal(inspected.events.some(event => event.type === 'HALLWAY_CLOCK_INSPECTED'), true, 'clock reveal event emitted');
  equal(inspected.events.some(event => event.type === 'LIVING_ROOM_PATH_REVEALED'), true, 'door reveal event emitted');

  const livingAfter = findAdventureInteractionTarget(inspected.adventure, 114);
  equal(livingAfter?.available, true, 'Living Room door becomes available after clock');
  equal(livingAfter?.displayLabel, 'LIVING ROOM', 'unlocked label comes from room definition');
});

void test('reaching the Living Room door closes the W1 progression gate without entering W2', () => {
  const falseEscape = applyFalseEscape(preparedCompletedSession('living-door'), createAdventureState());
  const hallway = transitionAdventure(falseEscape.adventure, 'hallway', 'hallway-from-bedroom');
  if (hallway.status !== 'ok') throw new Error(hallway.reason);

  const clockSession = {
    ...falseEscape.session,
    player: { ...falseEscape.session.player, x: 64 },
    input: pressAction(falseEscape.session.input, 'interact'),
  };
  const inspected = stepAdventureExploration(clockSession, hallway.state, 33);
  const doorSession = {
    ...inspected.session,
    player: { ...inspected.session.player, x: 114 },
    input: pressAction(inspected.session.input, 'interact'),
  };
  const reached = stepAdventureExploration(doorSession, inspected.adventure, 33);
  equal(isLivingRoomDoorReached(reached.adventure), true, 'Living Room door reached');
  equal(reached.adventure.currentRoom, 'hallway', 'W1 stops in Hallway rather than entering Living Room');
  equal(reached.events.some(event => event.type === 'LIVING_ROOM_DOOR_REACHED'), true, 'W1 completion event emitted');
});

void test('coordinator preserves story and room-local state across round trip', () => {
  const coordinator = new AdventureSessionCoordinator();
  coordinator.setStoryFlag('hallwayUnlocked');

  const hallway = coordinator.transition('hallway', 'hallway-from-bedroom');
  if (hallway.status !== 'ok') throw new Error(hallway.reason);
  coordinator.markInspected('hallway', 'backward-clock');
  coordinator.markInteraction('hallway', 'living-room-door');
  coordinator.setRoomSwitch('hallway', 'living-room-unlocked', true);

  const bedroom = coordinator.transition('bedroom', 'bedroom-from-hallway');
  if (bedroom.status !== 'ok') throw new Error(bedroom.reason);
  const returnTrip = coordinator.transition('hallway', 'hallway-from-bedroom');
  if (returnTrip.status !== 'ok') throw new Error(returnTrip.reason);

  const state = coordinator.snapshot();
  equal(state.currentRoom, 'hallway', 'round trip returns to hallway');
  equal(hasStoryFlag(state, 'hallwayUnlocked'), true, 'story flag survived transitions');
  const hallwayState = getRoomState(state, 'hallway');
  deepEqual(hallwayState.inspected, ['backward-clock'], 'inspected anomaly persisted');
  deepEqual(hallwayState.interactions, ['living-room-door'], 'interaction persisted');
  equal(hallwayState.switches['living-room-unlocked'], true, 'local switch persisted');
});

void test('v3 save roundtrip restores W1 exploration progression from Adventure state', () => {
  const base = createAdventureGameSession('adventure-codec');
  const falseEscape = applyFalseEscape(preparedCompletedSession(base.haunted.runId), base.adventure);
  const hallway = transitionAdventure(falseEscape.adventure, 'hallway', 'hallway-from-bedroom');
  if (hallway.status !== 'ok') throw new Error(hallway.reason);
  const coordinator = new AdventureSessionCoordinator(hallway.state);
  coordinator.markInspected('hallway', 'backward-clock');
  coordinator.setRoomSwitch('hallway', 'living-room-unlocked', true);

  const encoded = encodeAdventureGameSession({
    schemaVersion: 3,
    haunted: falseEscape.session,
    adventure: coordinator.snapshot(),
  });
  const decoded = decodeAdventureGameSession(encoded);
  equal(decoded.status, 'ok', 'adventure codec roundtrip');
  if (decoded.status !== 'ok') return;
  equal(decoded.state.schemaVersion, 3, 'v3 envelope restored');
  equal(decoded.state.haunted.objective.phase, 'completed', 'Haunted objective remains terminal');
  equal(decoded.state.adventure.currentRoom, 'hallway', 'current room restored');
  equal(decoded.state.adventure.storyFlags.bedroomEscapeAttempted, true, 'false escape restored');
  equal(decoded.state.adventure.storyFlags.hallwayUnlocked, true, 'hallway unlock restored');
  equal(getRoomState(decoded.state.adventure, 'hallway').switches['living-room-unlocked'], true, 'Living Room path restored');
});

void test('adventure codec rejects legacy and malformed room state', () => {
  equal(decodeAdventureGameSession(JSON.stringify({ schemaVersion: 2 })).status, 'invalid', 'legacy envelope rejected');
  const base = createAdventureGameSession('invalid-room');
  const payload = JSON.parse(encodeAdventureGameSession(base)) as { adventure: Record<string, unknown> };
  payload.adventure.currentRoom = 'garage';
  equal(decodeAdventureGameSession(JSON.stringify(payload)).status, 'invalid', 'unknown room rejected');
});

void test('adventure save coordinator throttles only periodic writes', async () => {
  const port = new FakeAdventureSavePort();
  const coordinator = new AdventureSaveCoordinator(port);
  const base = createAdventureGameSession('adventure-save');
  let saved = await coordinator.persist(base, 'periodic');
  equal(saved, true, 'first periodic save persists');

  const later = { ...base, haunted: { ...base.haunted, elapsedMs: 1000 } };
  saved = await coordinator.persist(later, 'periodic');
  equal(saved, false, 'rapid periodic save is throttled');
  saved = await coordinator.persist(later, 'room-transition');
  equal(saved, true, 'room transition bypasses throttle');
  equal(port.saveCount, 2, 'only meaningful writes reached storage');
});

console.log('adventure runtime tests passed');
