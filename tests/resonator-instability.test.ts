import { equal, test } from './assert';
import { applyFalseEscape, stepAdventureExploration } from '../src/game/adventure/AdventureExplorationRuntime';
import { createAdventureState, setRoomSwitch, type AdventureState } from '../src/game/adventure/AdventureState';
import {
  getLaboratoryEncounterPhase,
  LABORATORY_ENCOUNTER_SWITCHES,
  restoreLaboratoryCheckpoint,
} from '../src/game/adventure/LaboratoryEncounter';
import {
  isResonatorWeakPointDisabled,
  resolveResonatorInstabilityState,
  RESONATOR_WEAK_POINTS,
} from '../src/game/adventure/LaboratoryResonatorInstability';
import { decodeAdventureGameSession, encodeAdventureGameSession } from '../src/game/adventure/AdventureSessionCodec';
import { transitionAdventure } from '../src/game/adventure/RoomRegistry';
import { createHauntedInputState } from '../src/game/haunted/HauntedInput';
import { createHauntedSession, type HauntedSessionState } from '../src/game/haunted/HauntedSessionRuntime';

function setupResonator(runId: string): { session: HauntedSessionState; adventure: AdventureState } {
  const base = createHauntedSession(runId);
  const prepared: HauntedSessionState = {
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
  const escaped = applyFalseEscape(prepared, createAdventureState());
  let adventure = escaped.adventure;

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

  adventure = setRoomSwitch(laboratory.state, 'laboratory', LABORATORY_ENCOUNTER_SWITCHES.started, true);
  adventure = setRoomSwitch(adventure, 'laboratory', LABORATORY_ENCOUNTER_SWITCHES.vesperControlBroken, true);

  const session: HauntedSessionState = {
    ...escaped.session,
    player: { ...escaped.session.player, x: 40, y: 104, vx: 0, vy: 0, grounded: true, facing: 'right' },
    domestic: { ...escaped.session.domestic, player: { x: 40, facing: 'right' } },
    input: createHauntedInputState(),
  };
  return { session, adventure };
}

function withProjectile(
  session: HauntedSessionState,
  elapsedMs: number,
  targetX: number,
): HauntedSessionState {
  const dtSeconds = 33 / 1000;
  return {
    ...session,
    elapsedMs,
    combat: {
      ...session.combat,
      projectiles: [{
        id: 199,
        x: targetX - 76 * dtSeconds,
        y: 84,
        vx: 76,
        damage: 1,
      }],
    },
  };
}

void test('exposes deterministic weak-point, distortion and electrical windows', () => {
  const base = setupResonator('windows');

  const leftTelegraph = resolveResonatorInstabilityState(base.adventure, 150);
  equal(leftTelegraph.weakPoints.left, 'telegraph', 'left node telegraphs first');
  equal(leftTelegraph.distortion.phase, 'telegraph', 'central distortion telegraphs with the left node');

  const leftWindow = resolveResonatorInstabilityState(base.adventure, 600);
  equal(leftWindow.weakPoints.left, 'vulnerable', 'left node opens during first window');
  equal(leftWindow.distortion.phase, 'active', 'central control inversion is active during weak-point window');

  const leftSurge = resolveResonatorInstabilityState(base.adventure, 1_500);
  equal(leftSurge.electrical.phase, 'active', 'left electrical lane becomes dangerous after first weak-point window');
  equal(leftSurge.electrical.lane, 'left', 'first electrical surge is on the left');

  const rightWindow = resolveResonatorInstabilityState(base.adventure, 2_400);
  equal(rightWindow.weakPoints.right, 'vulnerable', 'right node opens during second window');
  equal(rightWindow.distortion.phase, 'active', 'distortion returns during second weak-point window');

  const rightSurge = resolveResonatorInstabilityState(base.adventure, 3_300);
  equal(rightSurge.electrical.phase, 'active', 'right electrical lane becomes dangerous after second weak-point window');
  equal(rightSurge.electrical.lane, 'right', 'second electrical surge is on the right');
});

void test('spatial distortion reverses horizontal control only inside the active central zone', () => {
  const base = setupResonator('distortion');
  const input = { ...createHauntedInputState(), right: true };

  const inside: HauntedSessionState = {
    ...base.session,
    elapsedMs: 500,
    player: { ...base.session.player, x: 76, vx: 0 },
    domestic: { ...base.session.domestic, player: { x: 76, facing: 'right' } },
    input,
  };
  const distorted = stepAdventureExploration(inside, base.adventure, 33);
  equal(distorted.session.player.x < 76, true, 'right input moves Wally left inside active distortion');

  const outside: HauntedSessionState = {
    ...base.session,
    elapsedMs: 500,
    player: { ...base.session.player, x: 40, vx: 0 },
    domestic: { ...base.session.domestic, player: { x: 40, facing: 'right' } },
    input,
  };
  const normal = stepAdventureExploration(outside, base.adventure, 33);
  equal(normal.session.player.x > 40, true, 'same input remains normal outside distortion zone');
});

void test('blocks sealed weak-point hits and consumes the projectile', () => {
  const base = setupResonator('blocked');
  const shot = withProjectile(base.session, 1_100, RESONATOR_WEAK_POINTS.left.x);
  const stepped = stepAdventureExploration(shot, base.adventure, 33);

  equal(isResonatorWeakPointDisabled(stepped.adventure, 'left'), false, 'sealed Resonator node ignores damage');
  equal(stepped.session.combat.projectiles.length, 0, 'blocked Dream Spark is consumed');
  equal(
    stepped.events.some(event => event.type === 'LABORATORY_RESONATOR_NODE_BLOCKED' && event.nodeId === 'left'),
    true,
    'blocked node hit emits explicit feedback',
  );
});

void test('disables both nodes in valid windows and advances exactly to Nightmare', () => {
  const base = setupResonator('complete');

  const leftShot = withProjectile(base.session, 500, RESONATOR_WEAK_POINTS.left.x);
  const left = stepAdventureExploration(leftShot, base.adventure, 33);
  equal(isResonatorWeakPointDisabled(left.adventure, 'left'), true, 'left node disables during its vulnerability window');
  equal(getLaboratoryEncounterPhase(left.adventure), 'resonator', 'one node keeps encounter in Resonator phase');

  const rightShot = withProjectile(
    { ...left.session, combat: { ...left.session.combat, projectiles: [] } },
    2_300,
    RESONATOR_WEAK_POINTS.right.x,
  );
  const right = stepAdventureExploration(rightShot, left.adventure, 33);

  equal(isResonatorWeakPointDisabled(right.adventure, 'right'), true, 'right node disables during its vulnerability window');
  equal(getLaboratoryEncounterPhase(right.adventure), 'nightmare', 'two disabled nodes persist resonator-destabilized and hand off to Nightmare');
  equal(right.events.some(event => event.type === 'LABORATORY_RESONATOR_DESTABILIZED'), true, 'phase transition emits Nightmare boundary milestone');
  equal(right.session.combat.projectiles.length, 0, 'handoff clears transient Dream Sparks');
  equal(right.session.combat.invulnerableUntilMs > right.session.elapsedMs, true, 'handoff grants a short safe-entry grace period');
});

void test('electrical surge damages only the active lane', () => {
  const base = setupResonator('surge');

  const exposed: HauntedSessionState = {
    ...base.session,
    elapsedMs: 1_400,
    player: { ...base.session.player, x: 40, y: 104, vx: 0, vy: 0, grounded: true },
    domestic: { ...base.session.domestic, player: { x: 40, facing: 'right' } },
  };
  const hit = stepAdventureExploration(exposed, base.adventure, 33);
  equal(hit.session.combat.hp, base.session.combat.hp - 1, 'active Resonator surge reuses Haunted HP damage');
  equal(hit.events.some(event => event.type === 'LABORATORY_RESONATOR_SURGE_HIT'), true, 'surge hit emits Laboratory-specific event');

  const safe: HauntedSessionState = {
    ...base.session,
    elapsedMs: 1_400,
    player: { ...base.session.player, x: 90, y: 104, vx: 0, vy: 0, grounded: true },
    domestic: { ...base.session.domestic, player: { x: 90, facing: 'right' } },
  };
  const avoided = stepAdventureExploration(safe, base.adventure, 33);
  equal(avoided.session.combat.hp, base.session.combat.hp, 'opposite lane remains safe during electrical surge');
});

void test('retry and Save/Continue preserve a disabled Resonator node', () => {
  const base = setupResonator('persistence');
  const adventure = setRoomSwitch(base.adventure, 'laboratory', RESONATOR_WEAK_POINTS.left.switchId, true);

  const failed: HauntedSessionState = {
    ...base.session,
    combat: { ...base.session.combat, hp: 0 },
    objective: { phase: 'failed', reason: 'haunted' },
  };
  const restored = restoreLaboratoryCheckpoint(failed, adventure);
  equal(isResonatorWeakPointDisabled(adventure, 'left'), true, 'retry preserves disabled Resonator node');
  equal(restored.combat.hp, restored.combat.maxHp, 'retry restores full HP');
  equal(getLaboratoryEncounterPhase(adventure), 'resonator', 'partial node progress remains in Resonator phase');

  const encoded = encodeAdventureGameSession({ schemaVersion: 3, haunted: restored, adventure });
  const decoded = decodeAdventureGameSession(encoded);
  equal(decoded.status, 'ok', 'existing save envelope accepts partial Resonator progress');
  if (decoded.status !== 'ok') return;
  equal(isResonatorWeakPointDisabled(decoded.state.adventure, 'left'), true, 'Continue preserves disabled Resonator node');
  equal(getLaboratoryEncounterPhase(decoded.state.adventure), 'resonator', 'Continue restores the same encounter phase');
});

console.log('Resonator instability tests passed');
