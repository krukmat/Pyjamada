import { equal, test } from './assert';
import {
  ADVENTURE_ENDING_SWITCHES,
  beginAdventureEnding,
  completeAdventureEnding,
  getAdventureEndingPhase,
  isAdventureEndingActive,
  isAdventureEndingComplete,
  shouldBeginAdventureEnding,
} from '../src/game/adventure/AdventureEnding';
import { createAdventureGameSession } from '../src/game/adventure/AdventureGameSession';
import { decodeAdventureGameSession, encodeAdventureGameSession } from '../src/game/adventure/AdventureSessionCodec';
import {
  createAdventureState,
  createRoomPersistentState,
  getRoomState,
  setRoomSwitch,
  type AdventureState,
} from '../src/game/adventure/AdventureState';
import { LABORATORY_ENCOUNTER_SWITCHES } from '../src/game/adventure/LaboratoryEncounter';
import { applyRoomInteractionEffect } from '../src/game/adventure/RoomInteractionEffects';
import { resolveRoomInteractionTarget } from '../src/game/adventure/RoomRegistry';
import { createHauntedSession } from '../src/game/haunted/HauntedSessionRuntime';

function completedLaboratory(): AdventureState {
  const base = createAdventureState();
  let adventure: AdventureState = {
    ...base,
    currentRoom: 'laboratory',
    currentEntry: 'laboratory-from-basement',
    visitedRooms: ['bedroom', 'hallway', 'living-room', 'kitchen', 'bathroom', 'attic', 'basement', 'laboratory'],
    storyFlags: {
      bedroomEscapeAttempted: true,
      hallwayUnlocked: true,
      labTransmissionSeen: true,
    },
    rooms: {
      bedroom: createRoomPersistentState(),
      hallway: createRoomPersistentState(),
      'living-room': createRoomPersistentState(),
      kitchen: createRoomPersistentState(),
      bathroom: createRoomPersistentState(),
      attic: createRoomPersistentState(),
      basement: createRoomPersistentState(),
      laboratory: createRoomPersistentState(),
    },
  };
  adventure = setRoomSwitch(adventure, 'laboratory', LABORATORY_ENCOUNTER_SWITCHES.complete, true);
  return adventure;
}

void test('ending remains locked until the Laboratory encounter is complete', () => {
  const adventure = createAdventureState();
  equal(getAdventureEndingPhase(adventure), 'locked', 'fresh run has no ending');
  equal(shouldBeginAdventureEnding(adventure), false, 'fresh run cannot enter ending');
});

void test('completed Laboratory exposes one idempotent morning-after transition', () => {
  const adventure = completedLaboratory();
  equal(getAdventureEndingPhase(adventure), 'ready', 'completed Laboratory exposes ending boundary');
  equal(shouldBeginAdventureEnding(adventure), true, 'ending boundary requests transition');

  const dirty = createHauntedSession('ending-start');
  const session = {
    ...dirty,
    player: { ...dirty.player, x: 90, y: 80, vx: 20, vy: -10, grounded: false, facing: 'left' as const },
    combat: {
      ...dirty.combat,
      hp: 1,
      projectiles: [{ id: 1, x: 70, y: 70, vx: 76, damage: 1 }],
      invulnerableUntilMs: 999,
    },
    threats: {
      ...dirty.threats,
      ghosts: [{ id: 1, x: 80, y: 82, phase: 'active' as const, phaseUntilMs: 0 }],
    },
  };

  const started = beginAdventureEnding(session, adventure);
  equal(started.adventure.currentRoom, 'bedroom', 'ending returns to Bedroom');
  equal(started.adventure.currentEntry, 'bedroom-default', 'ending uses stable Bedroom spawn');
  equal(getAdventureEndingPhase(started.adventure), 'awakening', 'ending starts at awakening');
  equal(started.session.player.x, 16, 'Wally wakes beside the bed');
  equal(started.session.combat.hp, started.session.combat.maxHp, 'ending restores safe presentation health');
  equal(started.session.combat.projectiles.length, 0, 'ending clears Dream Sparks');
  equal(started.session.threats.ghosts.length, 0, 'ending starts without combat Ghosts');
  equal(started.session.input.attackPressed, false, 'ending clears transient attack input');

  const duplicate = beginAdventureEnding(started.session, started.adventure);
  equal(duplicate.adventure, started.adventure, 'ending transition is idempotent after awakening starts');
  equal(duplicate.session, started.session, 'idempotent transition leaves normalized session untouched');
});

void test('morning-after interactions require physical evidence before the final Ghost sting', () => {
  const started = beginAdventureEnding(createHauntedSession('ending-flow'), completedLaboratory());
  equal(isAdventureEndingActive(started.adventure), true, 'awakening is an active ending phase');

  const evidenceTarget = resolveRoomInteractionTarget(started.adventure, 56);
  equal(evidenceTarget?.id, 'ending-burned-sensor-tag', 'burned sensor tag is the first ending interaction');
  equal(evidenceTarget?.displayLabel, 'BURNED SENSOR TAG', 'physical evidence has explicit player-facing label');

  const evidence = applyRoomInteractionEffect(started.adventure, 'bedroom', 'inspect-ending-evidence');
  equal(evidence.events.some(event => event.type === 'ENDING_EVIDENCE_CONFIRMED'), true, 'evidence emits a persistent milestone');
  equal(getAdventureEndingPhase(evidence.adventure), 'evidence', 'evidence advances ending exactly once');
  equal(getRoomState(evidence.adventure, 'bedroom').inspected.includes('burned-sensor-tag'), true, 'physical evidence is persisted');

  const ghostTarget = resolveRoomInteractionTarget(evidence.adventure, 108);
  equal(ghostTarget?.id, 'ending-window', 'window becomes the next ending interaction');
  equal(ghostTarget?.displayLabel, 'WINDOW', 'Ghost sting target remains ordinary household geometry');

  const sting = applyRoomInteractionEffect(evidence.adventure, 'bedroom', 'reveal-ending-ghost-sting');
  equal(sting.events.some(event => event.type === 'ENDING_GHOST_STING_REVEALED'), true, 'Ghost sting emits a persistent milestone');
  equal(getAdventureEndingPhase(sting.adventure), 'ghost-sting', 'Ghost sting is a distinct final beat');
  equal(resolveRoomInteractionTarget(sting.adventure, 108)?.id === 'ending-window', false, 'Ghost sting cannot be replayed');
});

void test('terminal ending can complete only after the Ghost sting and persists in save envelope v3', () => {
  const started = beginAdventureEnding(createHauntedSession('ending-save'), completedLaboratory());
  const evidence = applyRoomInteractionEffect(started.adventure, 'bedroom', 'inspect-ending-evidence');
  equal(completeAdventureEnding(evidence.adventure), evidence.adventure, 'ending cannot finish before Ghost sting');

  const sting = applyRoomInteractionEffect(evidence.adventure, 'bedroom', 'reveal-ending-ghost-sting');
  const complete = completeAdventureEnding(sting.adventure);
  equal(getAdventureEndingPhase(complete), 'complete', 'ending reaches terminal complete phase');
  equal(isAdventureEndingComplete(complete), true, 'terminal helper recognizes completed run');
  equal(getRoomState(complete, 'bedroom').switches[ADVENTURE_ENDING_SWITCHES.complete], true, 'terminal ending persists room-local completion');

  const encoded = encodeAdventureGameSession({ schemaVersion: 3, haunted: started.session, adventure: complete });
  const decoded = decodeAdventureGameSession(encoded);
  equal(decoded.status, 'ok', 'existing save envelope accepts completed ending');
  if (decoded.status !== 'ok') return;
  equal(getAdventureEndingPhase(decoded.state.adventure), 'complete', 'Continue restores terminal ending without schema migration');
});

void test('a new game contains no ending progress', () => {
  const fresh = createAdventureGameSession('fresh-after-ending');
  equal(getAdventureEndingPhase(fresh.adventure), 'locked', 'new game resets ending progression');
  equal(getRoomState(fresh.adventure, 'bedroom').switches[ADVENTURE_ENDING_SWITCHES.started], undefined, 'new run has no ending switches');
});

console.log('adventure ending tests passed');
