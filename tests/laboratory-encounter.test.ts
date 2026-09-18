import { equal, test } from './assert';
import {
  applyFalseEscape,
  findAdventureInteractionTarget,
  stepAdventureExploration,
  type AdventureExplorationEvent,
} from '../src/game/adventure/AdventureExplorationRuntime';
import { decodeAdventureGameSession, encodeAdventureGameSession } from '../src/game/adventure/AdventureSessionCodec';
import { createAdventureState, setRoomSwitch, type AdventureState } from '../src/game/adventure/AdventureState';
import {
  getLaboratoryEncounterPhase,
  LABORATORY_CHECKPOINT,
  LABORATORY_ENCOUNTER_SWITCHES,
  restoreLaboratoryCheckpoint,
  shouldUseLaboratoryCheckpoint,
} from '../src/game/adventure/LaboratoryEncounter';
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

function at(session: HauntedSessionState, x: number, action: 'interact' | 'attack' = 'interact'): HauntedSessionState {
  return {
    ...session,
    player: { ...session.player, x, y: 104, vx: 0, vy: 0, grounded: true, facing: 'right' },
    domestic: { ...session.domestic, player: { x: Math.round(x), facing: 'right' } },
    input: pressAction(createHauntedInputState(), action),
  };
}

function transitionRequest(events: readonly AdventureExplorationEvent[]) {
  return events.find((event): event is Extract<AdventureExplorationEvent, { type: 'ROOM_TRANSITION_REQUESTED' }> => event.type === 'ROOM_TRANSITION_REQUESTED');
}

function setupLaboratory(runId: string): { session: HauntedSessionState; adventure: AdventureState } {
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
  adventure = setRoomSwitch(basement.state, 'basement', 'basement-loss-of-control-revealed', true);
  adventure = applyRoomInteractionEffect(adventure, 'basement', 'trace-basement-laboratory-route').adventure;

  const laboratory = transitionAdventure(adventure, 'laboratory', 'laboratory-from-basement');
  if (laboratory.status !== 'ok') throw new Error(laboratory.reason);

  const session: HauntedSessionState = {
    ...falseEscape.session,
    player: { ...falseEscape.session.player, x: laboratory.spawn.x, y: laboratory.spawn.y, vx: 0, vy: 0, grounded: true, facing: laboratory.spawn.facing },
    domestic: { ...falseEscape.session.domestic, player: { x: Math.round(laboratory.spawn.x), facing: laboratory.spawn.facing } },
    input: createHauntedInputState(),
  };

  return { session, adventure: laboratory.state };
}

void test('starts the Laboratory encounter from the Resonator exactly once', () => {
  const base = setupLaboratory('start');
  equal(getLaboratoryEncounterPhase(base.adventure), 'dormant', 'Laboratory arrival starts dormant');

  const target = findAdventureInteractionTarget(base.adventure, 76);
  equal(target?.id, 'laboratory-resonator', 'Resonator is the explicit encounter activation target');
  equal(target?.displayLabel, 'RESONATOR', 'activation target has concrete player-facing label');

  const started = stepAdventureExploration(at(base.session, 76), base.adventure, 33);
  equal(getLaboratoryEncounterPhase(started.adventure), 'vesper-control', 'Resonator activation advances to Vesper control phase');
  equal(started.events.some(event => event.type === 'LABORATORY_ENCOUNTER_STARTED'), true, 'activation emits milestone once');

  const repeated = stepAdventureExploration(at(started.session, 76), started.adventure, 33);
  equal(repeated.events.some(event => event.type === 'LABORATORY_ENCOUNTER_STARTED'), false, 'repeated activation cannot duplicate encounter milestone');
  equal(findAdventureInteractionTarget(repeated.adventure, 76)?.id === 'laboratory-resonator', false, 'activation interaction disappears once encounter starts');
});

void test('derives deterministic checkpoints from persisted milestones', () => {
  const base = setupLaboratory('phases');
  let adventure = setRoomSwitch(base.adventure, 'laboratory', LABORATORY_ENCOUNTER_SWITCHES.started, true);
  equal(getLaboratoryEncounterPhase(adventure), 'vesper-control', 'started milestone maps to phase 1');

  adventure = setRoomSwitch(adventure, 'laboratory', LABORATORY_ENCOUNTER_SWITCHES.vesperControlBroken, true);
  equal(getLaboratoryEncounterPhase(adventure), 'resonator', 'Vesper control milestone maps to phase 2');

  adventure = setRoomSwitch(adventure, 'laboratory', LABORATORY_ENCOUNTER_SWITCHES.resonatorDestabilized, true);
  equal(getLaboratoryEncounterPhase(adventure), 'nightmare', 'Resonator milestone maps to phase 3');

  adventure = setRoomSwitch(adventure, 'laboratory', LABORATORY_ENCOUNTER_SWITCHES.nightmareDefeated, true);
  equal(getLaboratoryEncounterPhase(adventure), 'shutdown', 'Nightmare defeat maps to shutdown');

  adventure = setRoomSwitch(adventure, 'laboratory', LABORATORY_ENCOUNTER_SWITCHES.complete, true);
  equal(getLaboratoryEncounterPhase(adventure), 'complete', 'completion milestone dominates all earlier phase switches');
  equal(shouldUseLaboratoryCheckpoint(adventure), false, 'completed encounter no longer uses retry checkpoint');
});

void test('retry restores a safe local attempt without erasing phase progress', () => {
  const base = setupLaboratory('retry');
  let adventure = setRoomSwitch(base.adventure, 'laboratory', LABORATORY_ENCOUNTER_SWITCHES.started, true);
  adventure = setRoomSwitch(adventure, 'laboratory', LABORATORY_ENCOUNTER_SWITCHES.vesperControlBroken, true);

  const failed: HauntedSessionState = {
    ...base.session,
    player: { ...base.session.player, x: 101, y: 93, vx: 22, vy: -10, grounded: false, facing: 'left' },
    input: pressAction(createHauntedInputState(), 'attack'),
    combat: {
      ...base.session.combat,
      hp: 0,
      invulnerableUntilMs: 99_999,
      nextAttackAllowedMs: 99_999,
      projectiles: [{ id: 77, x: 84, y: 76, vx: 76, damage: 1 }],
    },
    objective: { phase: 'failed', reason: 'haunted' },
  };

  equal(shouldUseLaboratoryCheckpoint(adventure), true, 'active Laboratory encounter opts into local checkpoint');
  const restored = restoreLaboratoryCheckpoint(failed, adventure);

  equal(getLaboratoryEncounterPhase(adventure), 'resonator', 'retry preserves the phase milestone');
  equal(restored.combat.hp, restored.combat.maxHp, 'retry restores full HP');
  equal(restored.combat.projectiles.length, 0, 'retry clears transient Dream Sparks');
  equal(restored.player.x, LABORATORY_CHECKPOINT.x, 'retry returns Wally to safe Laboratory checkpoint');
  equal(restored.player.y, LABORATORY_CHECKPOINT.y, 'retry resets Wally to ground');
  equal(restored.player.grounded, true, 'retry resets player physics');
  equal(restored.objective.phase, 'completed', 'retry restores playable exploration objective state');
  equal(restored.input.attackPressed, false, 'retry clears transient attack input');
  equal(restored.combat.invulnerableUntilMs > restored.elapsedMs, true, 'retry grants a short safe-entry invulnerability window');

  const basement = transitionAdventure(adventure, 'basement', 'basement-from-laboratory');
  equal(basement.status, 'ok', 'test can leave Laboratory');
  if (basement.status !== 'ok') return;
  equal(shouldUseLaboratoryCheckpoint(basement.state), false, 'same milestones outside Laboratory do not hijack normal restart semantics');
});

void test('Save/Continue preserves phase but normalizes transient attempt state', () => {
  const base = setupLaboratory('continue');
  let adventure = setRoomSwitch(base.adventure, 'laboratory', LABORATORY_ENCOUNTER_SWITCHES.started, true);
  adventure = setRoomSwitch(adventure, 'laboratory', LABORATORY_ENCOUNTER_SWITCHES.vesperControlBroken, true);

  const dirty: HauntedSessionState = {
    ...base.session,
    player: { ...base.session.player, x: 94, y: 96, vx: 18, vy: -5, grounded: false, facing: 'left' },
    domestic: { ...base.session.domestic, player: { x: 94, facing: 'left' } },
    combat: {
      ...base.session.combat,
      hp: 1,
      projectiles: [{ id: 9, x: 88, y: 70, vx: 76, damage: 1 }],
    },
    objective: { phase: 'failed', reason: 'haunted' },
  };

  const encoded = encodeAdventureGameSession({ schemaVersion: 3, haunted: dirty, adventure });
  const decoded = decodeAdventureGameSession(encoded);
  equal(decoded.status, 'ok', 'existing save envelope accepts Laboratory milestone state without migration');
  if (decoded.status !== 'ok') return;

  equal(getLaboratoryEncounterPhase(decoded.state.adventure), 'resonator', 'Save/Continue preserves phase milestone');
  const normalized = restoreLaboratoryCheckpoint(decoded.state.haunted, decoded.state.adventure);
  equal(normalized.combat.hp, normalized.combat.maxHp, 'Continue normalizes HP to phase checkpoint');
  equal(normalized.combat.projectiles.length, 0, 'Continue discards frame-level projectile state');
  equal(normalized.player.x, LABORATORY_CHECKPOINT.x, 'Continue resumes from safe checkpoint position');
  equal(normalized.objective.phase, 'completed', 'Continue resumes as playable encounter attempt');
});

console.log('Laboratory encounter tests passed');
