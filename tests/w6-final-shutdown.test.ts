import { equal, test } from './assert';
import {
  applyFalseEscape,
  findAdventureInteractionTarget,
  isLaboratoryCombatEnabled,
  stepAdventureExploration,
} from '../src/game/adventure/AdventureExplorationRuntime';
import { decodeAdventureGameSession, encodeAdventureGameSession } from '../src/game/adventure/AdventureSessionCodec';
import { createAdventureState, setRoomSwitch, type AdventureState } from '../src/game/adventure/AdventureState';
import {
  getLaboratoryEncounterPhase,
  LABORATORY_ENCOUNTER_SWITCHES,
  shouldUseLaboratoryCheckpoint,
} from '../src/game/adventure/LaboratoryEncounter';
import { VESPER_CONTROL_DEVICES } from '../src/game/adventure/LaboratoryVesperControl';
import { RESONATOR_WEAK_POINTS } from '../src/game/adventure/LaboratoryResonatorInstability';
import { VESPER_NIGHTMARE_TARGET } from '../src/game/adventure/LaboratoryVesperNightmare';
import { transitionAdventure } from '../src/game/adventure/RoomRegistry';
import { createHauntedInputState, pressAction } from '../src/game/haunted/HauntedInput';
import { createHauntedSession, type HauntedSessionState } from '../src/game/haunted/HauntedSessionRuntime';

function preparedBedroom(runId: string): HauntedSessionState {
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

function enterLaboratory(runId: string): { session: HauntedSessionState; adventure: AdventureState } {
  const falseEscape = applyFalseEscape(preparedBedroom(runId), createAdventureState());
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
  adventure = setRoomSwitch(basement.state, 'basement', 'laboratory-route-revealed', true);

  const laboratory = transitionAdventure(adventure, 'laboratory', 'laboratory-from-basement');
  if (laboratory.status !== 'ok') throw new Error(laboratory.reason);

  const session: HauntedSessionState = {
    ...falseEscape.session,
    player: {
      ...falseEscape.session.player,
      x: laboratory.spawn.x,
      y: laboratory.spawn.y,
      vx: 0,
      vy: 0,
      grounded: true,
      facing: laboratory.spawn.facing,
    },
    domestic: {
      ...falseEscape.session.domestic,
      player: { x: Math.round(laboratory.spawn.x), facing: laboratory.spawn.facing },
    },
    input: createHauntedInputState(),
  };

  return { session, adventure: laboratory.state };
}

function at(
  session: HauntedSessionState,
  x: number,
  action: 'interact' | 'attack' = 'interact',
): HauntedSessionState {
  return {
    ...session,
    player: { ...session.player, x, y: 104, vx: 0, vy: 0, grounded: true, facing: 'right' },
    domestic: { ...session.domestic, player: { x: Math.round(x), facing: 'right' } },
    input: pressAction(createHauntedInputState(), action),
  };
}

function withProjectile(
  session: HauntedSessionState,
  elapsedMs: number,
  targetX: number,
  targetY: number,
  playerX: number,
): HauntedSessionState {
  const dtSeconds = 33 / 1000;
  return {
    ...session,
    elapsedMs,
    player: { ...session.player, x: playerX, y: 104, vx: 0, vy: 0, grounded: true, facing: 'right' },
    domestic: { ...session.domestic, player: { x: Math.round(playerX), facing: 'right' } },
    input: createHauntedInputState(),
    combat: {
      ...session.combat,
      projectiles: [{
        id: Math.round(elapsedMs),
        x: targetX - 76 * dtSeconds,
        y: targetY,
        vx: 76,
        damage: 1,
      }],
    },
  };
}

function completeW6(runId: string): { session: HauntedSessionState; adventure: AdventureState } {
  const entered = enterLaboratory(runId);

  const started = stepAdventureExploration(at(entered.session, 76), entered.adventure, 33);
  equal(getLaboratoryEncounterPhase(started.adventure), 'vesper-control', 'W6 integration starts at Vesper control');

  const rightControl = stepAdventureExploration(
    withProjectile(started.session, 700, VESPER_CONTROL_DEVICES.right.x, VESPER_CONTROL_DEVICES.right.y, 90),
    started.adventure,
    33,
  );
  const leftControl = stepAdventureExploration(
    withProjectile(rightControl.session, 2_200, VESPER_CONTROL_DEVICES.left.x, VESPER_CONTROL_DEVICES.left.y, 40),
    rightControl.adventure,
    33,
  );
  equal(getLaboratoryEncounterPhase(leftControl.adventure), 'resonator', 'T5 hands integration to Resonator');

  const leftNode = stepAdventureExploration(
    withProjectile(leftControl.session, 500, RESONATOR_WEAK_POINTS.left.x, RESONATOR_WEAK_POINTS.left.y, 40),
    leftControl.adventure,
    33,
  );
  const rightNode = stepAdventureExploration(
    withProjectile(leftNode.session, 2_300, RESONATOR_WEAK_POINTS.right.x, RESONATOR_WEAK_POINTS.right.y, 40),
    leftNode.adventure,
    33,
  );
  equal(getLaboratoryEncounterPhase(rightNode.adventure), 'nightmare', 'T6 hands integration to Nightmare');

  const hit1 = stepAdventureExploration(
    withProjectile(rightNode.session, 1_000, VESPER_NIGHTMARE_TARGET.x, VESPER_NIGHTMARE_TARGET.y, 70),
    rightNode.adventure,
    33,
  );
  const hit2 = stepAdventureExploration(
    withProjectile(hit1.session, 2_400, VESPER_NIGHTMARE_TARGET.x, VESPER_NIGHTMARE_TARGET.y, 70),
    hit1.adventure,
    33,
  );
  const hit3 = stepAdventureExploration(
    withProjectile(hit2.session, 3_800, VESPER_NIGHTMARE_TARGET.x, VESPER_NIGHTMARE_TARGET.y, 70),
    hit2.adventure,
    33,
  );
  equal(getLaboratoryEncounterPhase(hit3.adventure), 'shutdown', 'T7 hands integration to shutdown');

  const shutdownTarget = findAdventureInteractionTarget(hit3.adventure, 76);
  equal(shutdownTarget?.id, 'laboratory-resonator-shutdown', 'shutdown exposes one explicit Resonator action');
  equal(shutdownTarget?.displayLabel, 'SHUT DOWN RESONATOR', 'shutdown action has final player-facing label');

  const completed = stepAdventureExploration(at(hit3.session, 76), hit3.adventure, 33);
  equal(getLaboratoryEncounterPhase(completed.adventure), 'complete', 'final Resonator action completes W6');
  equal(
    completed.events.some(event => event.type === 'LABORATORY_ENCOUNTER_COMPLETED'),
    true,
    'completion emits the persistent W7 boundary milestone',
  );

  return { session: completed.session, adventure: completed.adventure };
}

void test('W6 T8 shutdown cannot be triggered before Nightmare defeat and is idempotent after completion', () => {
  const entered = enterLaboratory('w6-t8-gating');
  equal(findAdventureInteractionTarget(entered.adventure, 76)?.id, 'laboratory-resonator', 'arrival exposes encounter start, not shutdown');

  let shutdown = setRoomSwitch(entered.adventure, 'laboratory', LABORATORY_ENCOUNTER_SWITCHES.started, true);
  shutdown = setRoomSwitch(shutdown, 'laboratory', LABORATORY_ENCOUNTER_SWITCHES.vesperControlBroken, true);
  shutdown = setRoomSwitch(shutdown, 'laboratory', LABORATORY_ENCOUNTER_SWITCHES.resonatorDestabilized, true);
  equal(findAdventureInteractionTarget(shutdown, 76)?.id === 'laboratory-resonator-shutdown', false, 'Nightmare phase does not expose premature shutdown');

  shutdown = setRoomSwitch(shutdown, 'laboratory', LABORATORY_ENCOUNTER_SWITCHES.nightmareDefeated, true);
  equal(findAdventureInteractionTarget(shutdown, 76)?.id, 'laboratory-resonator-shutdown', 'defeated Nightmare exposes shutdown action');

  shutdown = setRoomSwitch(shutdown, 'laboratory', LABORATORY_ENCOUNTER_SWITCHES.complete, true);
  equal(findAdventureInteractionTarget(shutdown, 76)?.id === 'laboratory-resonator-shutdown', false, 'completed encounter hides shutdown action');
});

void test('W6 T8 integrates Laboratory entry through all three phases to persistent completion', () => {
  const completed = completeW6('w6-t8-integration');

  equal(completed.adventure.currentRoom, 'laboratory', 'W6 closes in Laboratory');
  equal(completed.adventure.rooms.laboratory?.switches[LABORATORY_ENCOUNTER_SWITCHES.complete], true, 'completion switch persists');
  equal(completed.session.combat.projectiles.length, 0, 'completion clears Dream Sparks');
  equal(completed.session.input.attackPressed, false, 'completion consumes transient attack input');
  equal(completed.session.input.interactPressed, false, 'completion consumes transient interact input');
  equal(isLaboratoryCombatEnabled(completed.adventure), false, 'completed Laboratory no longer accepts combat');
  equal(shouldUseLaboratoryCheckpoint(completed.adventure), false, 'completed Laboratory no longer intercepts restart/Continue with boss checkpoint');
  equal(findAdventureInteractionTarget(completed.adventure, 76)?.id === 'laboratory-resonator-shutdown', false, 'final action cannot repeat');
});

void test('W6 T8 completed Laboratory cannot reactivate attacks, hazards or transient projectiles', () => {
  const completed = completeW6('w6-t8-clean');
  const dirty: HauntedSessionState = {
    ...completed.session,
    elapsedMs: 3_300,
    player: { ...completed.session.player, x: 40, y: 104, vx: 0, vy: 0, grounded: true, facing: 'right' },
    domestic: { ...completed.session.domestic, player: { x: 40, facing: 'right' } },
    input: pressAction(createHauntedInputState(), 'attack'),
    combat: {
      ...completed.session.combat,
      projectiles: [{ id: 999, x: 76, y: 84, vx: 76, damage: 1 }],
    },
  };

  const stepped = stepAdventureExploration(dirty, completed.adventure, 33);
  equal(stepped.session.combat.hp, dirty.combat.hp, 'resolved Laboratory cannot deal encounter damage');
  equal(stepped.session.combat.projectiles.length, 0, 'resolved Laboratory strips stale projectiles');
  equal(stepped.session.elapsedMs, dirty.elapsedMs, 'resolved Laboratory freezes the combat clock');
  equal(
    stepped.events.some(event =>
      event.type === 'LABORATORY_VESPER_PULSE_HIT'
      || event.type === 'LABORATORY_RESONATOR_SURGE_HIT'
      || event.type === 'LABORATORY_NIGHTMARE_ATTACK_HIT'
    ),
    false,
    'resolved Laboratory emits no encounter hazard hits',
  );
});

void test('W6 T8 Save/Continue restores the completed W7 boundary without checkpoint normalization', () => {
  const completed = completeW6('w6-t8-save');
  const encoded = encodeAdventureGameSession({
    schemaVersion: 3,
    haunted: completed.session,
    adventure: completed.adventure,
  });
  const decoded = decodeAdventureGameSession(encoded);

  equal(decoded.status, 'ok', 'existing save envelope accepts completed Laboratory encounter');
  if (decoded.status !== 'ok') return;
  equal(getLaboratoryEncounterPhase(decoded.state.adventure), 'complete', 'Continue restores complete encounter phase');
  equal(decoded.state.adventure.rooms.laboratory?.switches[LABORATORY_ENCOUNTER_SWITCHES.complete], true, 'Continue preserves W7 boundary milestone');
  equal(shouldUseLaboratoryCheckpoint(decoded.state.adventure), false, 'Continue does not normalize completed encounter back into a boss phase');
  equal(decoded.state.haunted.combat.projectiles.length, 0, 'saved W7 boundary contains no transient Dream Sparks');
});

console.log('W6 final shutdown integration tests passed');
