import { deepEqual, equal, test } from './assert';
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
import { transitionAdventure } from '../src/game/adventure/RoomRegistry';
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

void test('registered Bedroom and Hallway transitions are deterministic', () => {
  const state = createAdventureState();
  const hallway = transitionAdventure(state, 'hallway', 'hallway-from-bedroom');
  if (hallway.status !== 'ok') throw new Error(hallway.reason);
  equal(hallway.state.currentRoom, 'hallway', 'entered hallway');
  deepEqual(hallway.state.visitedRooms, ['bedroom', 'hallway'], 'hallway marked visited');
  equal(hallway.spawn.x, 12, 'hallway spawn x');

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

void test('coordinator preserves story and room-local state across round trip', () => {
  const coordinator = new AdventureSessionCoordinator();
  coordinator.setStoryFlag('hallwayUnlocked');

  const hallway = coordinator.transition('hallway', 'hallway-from-bedroom');
  if (hallway.status !== 'ok') throw new Error(hallway.reason);
  coordinator.markInspected('hallway', 'backward-clock');
  coordinator.markInteraction('hallway', 'bedroom-door');
  coordinator.setRoomSwitch('hallway', 'debug-light', true);

  const bedroom = coordinator.transition('bedroom', 'bedroom-from-hallway');
  if (bedroom.status !== 'ok') throw new Error(bedroom.reason);
  const returnTrip = coordinator.transition('hallway', 'hallway-from-bedroom');
  if (returnTrip.status !== 'ok') throw new Error(returnTrip.reason);

  const state = coordinator.snapshot();
  equal(state.currentRoom, 'hallway', 'round trip returns to hallway');
  equal(hasStoryFlag(state, 'hallwayUnlocked'), true, 'story flag survived transitions');
  const hallwayState = getRoomState(state, 'hallway');
  deepEqual(hallwayState.inspected, ['backward-clock'], 'inspected anomaly persisted');
  deepEqual(hallwayState.interactions, ['bedroom-door'], 'interaction persisted');
  equal(hallwayState.switches['debug-light'], true, 'local switch persisted');
});

void test('v3 save roundtrip restores room, story and local room state', () => {
  const base = createAdventureGameSession('adventure-codec');
  const coordinator = new AdventureSessionCoordinator(base.adventure);
  coordinator.setStoryFlag('hallwayUnlocked');
  const hallway = coordinator.transition('hallway', 'hallway-from-bedroom');
  if (hallway.status !== 'ok') throw new Error(hallway.reason);
  coordinator.markInspected('hallway', 'backward-clock');
  coordinator.setRoomSwitch('hallway', 'debug-light', true);

  const encoded = encodeAdventureGameSession({ ...base, adventure: coordinator.snapshot() });
  const decoded = decodeAdventureGameSession(encoded);
  equal(decoded.status, 'ok', 'adventure codec roundtrip');
  if (decoded.status !== 'ok') return;
  equal(decoded.state.schemaVersion, 3, 'v3 envelope restored');
  equal(decoded.state.adventure.currentRoom, 'hallway', 'current room restored');
  equal(decoded.state.adventure.storyFlags.hallwayUnlocked, true, 'story flag restored');
  equal(getRoomState(decoded.state.adventure, 'hallway').switches['debug-light'], true, 'room switch restored');
  equal(decoded.state.haunted.runId, 'adventure-codec', 'haunted session remains paired with adventure');
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
