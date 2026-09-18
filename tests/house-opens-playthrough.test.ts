import { deepEqual, equal, test } from './assert';
import {
  applyFalseEscape,
  findAdventureInteractionTarget,
  isHallwayClockInspected,
  isLivingRoomPathRevealed,
  stepAdventureExploration,
  type AdventureExplorationEvent,
} from '../src/game/adventure/AdventureExplorationRuntime';
import { decodeAdventureGameSession, encodeAdventureGameSession } from '../src/game/adventure/AdventureSessionCodec';
import { createAdventureState, getRoomState } from '../src/game/adventure/AdventureState';
import { transitionAdventure } from '../src/game/adventure/RoomRegistry';
import { createHauntedInputState, pressAction } from '../src/game/haunted/HauntedInput';
import { createHauntedSession, stepHauntedSession, type HauntedSessionState } from '../src/game/haunted/HauntedSessionRuntime';
import { selectHauntedWallyPose } from '../src/game/render/HauntedWallyVisual';

function preparedAtExit(runId: string): HauntedSessionState {
  const base = createHauntedSession(runId);
  return {
    ...base,
    player: { ...base.player, x: 114, y: 104, vx: 0, vy: 0, grounded: true, facing: 'right' },
    domestic: {
      ...base.domestic,
      wallyState: 'normal',
      flags: { ...base.domestic.flags, dressed: true },
      collected: ['keys'],
      player: { x: 114, facing: 'right' },
      interactionCounts: { ...base.domestic.interactionCounts, wardrobe: 1, keys: 1 },
      objectStates: { ...base.domestic.objectStates, wardrobe: 'used', keys: 'collected' },
    },
    threats: { ...base.threats, ghosts: [], nextSpawnAtMs: 999_999 },
    objective: { phase: 'escape-ready' },
    input: pressAction(createHauntedInputState(), 'interact'),
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

void test('end-to-end opens the house and exposes the Living Room boundary', () => {
  const runId = 'house-opens';
  const initialAdventure = createAdventureState();

  const escaped = stepHauntedSession(preparedAtExit(runId), 33);
  equal(escaped.state.objective.phase, 'completed', 'Bedroom exit reaches legacy completion seam');
  equal(escaped.events.some(event => event.type === 'SESSION_COMPLETED'), true, 'exit interaction emits completion event');

  const falseEscape = applyFalseEscape(escaped.state, initialAdventure);
  equal(falseEscape.session.objective.phase, 'completed', 'Haunted objective stays completed after false escape');
  equal(falseEscape.adventure.currentRoom, 'bedroom', 'Wally rematerializes in Bedroom');
  equal(falseEscape.adventure.storyFlags.bedroomEscapeAttempted, true, 'Adventure state owns the false-escape progression');
  equal(falseEscape.adventure.storyFlags.hallwayUnlocked, true, 'Hallway is opened by the twist');
  equal(selectHauntedWallyPose(falseEscape.session, { honorTerminalObjective: false }), 'idle', 'adventure rendering suppresses Haunted victory pose');
  deepEqual(falseEscape.adventure.visitedRooms, ['bedroom'], 'Hallway is not visited until Wally actually crosses the door');

  const bedroomDoor = stepAdventureExploration(at(falseEscape.session, 112), falseEscape.adventure, 33);
  const hallwayRequest = transitionRequest(bedroomDoor.events);
  if (!hallwayRequest) throw new Error('Altered Bedroom did not request Hallway transition.');
  equal(hallwayRequest.targetRoom, 'hallway', 'Bedroom door targets Hallway');

  const hallwayTransition = transitionAdventure(bedroomDoor.adventure, hallwayRequest.targetRoom, hallwayRequest.targetEntry);
  if (hallwayTransition.status !== 'ok') throw new Error(hallwayTransition.reason);
  equal(hallwayTransition.state.currentRoom, 'hallway', 'player enters Hallway');
  deepEqual(hallwayTransition.state.visitedRooms, ['bedroom', 'hallway'], 'Hallway becomes visited');

  const hallwaySession = {
    ...bedroomDoor.session,
    player: {
      ...bedroomDoor.session.player,
      x: hallwayTransition.spawn.x,
      y: hallwayTransition.spawn.y,
      vx: 0,
      vy: 0,
      grounded: true,
      facing: hallwayTransition.spawn.facing,
    },
    domestic: {
      ...bedroomDoor.session.domestic,
      player: { x: Math.round(hallwayTransition.spawn.x), facing: hallwayTransition.spawn.facing },
    },
    input: createHauntedInputState(),
  };

  const clock = stepAdventureExploration(at(hallwaySession, 64), hallwayTransition.state, 33);
  equal(isHallwayClockInspected(clock.adventure), true, 'backward clock is persisted');
  equal(isLivingRoomPathRevealed(clock.adventure), true, 'clock reveals Living Room path');
  equal(clock.events.some(event => event.type === 'HALLWAY_CLOCK_INSPECTED'), true, 'clock inspection emits narrative event');
  equal(clock.events.some(event => event.type === 'LIVING_ROOM_PATH_REVEALED'), true, 'Living Room reveal emits narrative event');

  const livingDoor = findAdventureInteractionTarget(clock.adventure, 114);
  equal(livingDoor?.id, 'living-room-door', 'Living Room boundary is discoverable');
  equal(livingDoor?.available, true, 'Living Room boundary is unlocked by ');
  equal(livingDoor?.displayLabel, 'LIVING ROOM', 'ends with a clear Living Room hook');

  const encoded = encodeAdventureGameSession({
    schemaVersion: 3,
    haunted: clock.session,
    adventure: clock.adventure,
  });
  const restored = decodeAdventureGameSession(encoded);
  equal(restored.status, 'ok', 'state round-trips through save codec');
  if (restored.status !== 'ok') return;
  equal(restored.state.haunted.objective.phase, 'completed', 'Haunted completion remains stable across save/load');
  equal(restored.state.adventure.currentRoom, 'hallway', 'Hallway restored');
  equal(restored.state.adventure.storyFlags.bedroomEscapeAttempted, true, 'false escape restored');
  equal(restored.state.adventure.storyFlags.hallwayUnlocked, true, 'Hallway unlock restored');
  equal(getRoomState(restored.state.adventure, 'hallway').inspected.includes('backward-clock'), true, 'clock discovery restored');
  equal(getRoomState(restored.state.adventure, 'hallway').switches['living-room-unlocked'], true, 'Living Room reveal restored');
});

console.log('house-opens playthrough passed');
