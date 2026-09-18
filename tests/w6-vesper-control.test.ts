import { equal, test } from './assert';
import { stepAdventureExploration } from '../src/game/adventure/AdventureExplorationRuntime';
import { createAdventureState, setRoomSwitch, type AdventureState } from '../src/game/adventure/AdventureState';
import {
  getLaboratoryEncounterPhase,
  LABORATORY_ENCOUNTER_SWITCHES,
  restoreLaboratoryCheckpoint,
} from '../src/game/adventure/LaboratoryEncounter';
import {
  isVesperControlDeviceDisabled,
  resolveVesperControlState,
  VESPER_CONTROL_DEVICES,
} from '../src/game/adventure/LaboratoryVesperControl';
import { transitionAdventure } from '../src/game/adventure/RoomRegistry';
import { applyFalseEscape } from '../src/game/adventure/AdventureExplorationRuntime';
import { createHauntedInputState } from '../src/game/haunted/HauntedInput';
import { createHauntedSession, type HauntedSessionState } from '../src/game/haunted/HauntedSessionRuntime';

function setupLaboratory(runId: string): { session: HauntedSessionState; adventure: AdventureState } {
  const base = createHauntedSession(runId);
  const prepared = {
    ...base,
    domestic: {
      ...base.domestic,
      wallyState: 'normal' as const,
      flags: { ...base.domestic.flags, dressed: true },
      collected: ['keys'],
      objectStates: { ...base.domestic.objectStates, wardrobe: 'used' as const, keys: 'collected' as const },
      interactionCounts: { ...base.domestic.interactionCounts, wardrobe: 1, keys: 1 },
    },
    objective: { phase: 'completed' as const },
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

  const session: HauntedSessionState = {
    ...escaped.session,
    player: { ...escaped.session.player, x: 70, y: 104, vx: 0, vy: 0, grounded: true, facing: 'right' },
    domestic: { ...escaped.session.domestic, player: { x: 70, facing: 'right' } },
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
        id: 99,
        x: targetX - 76 * dtSeconds,
        y: 84,
        vx: 76,
        damage: 1,
      }],
    },
  };
}

void test('W6 T5 exposes alternating deterministic Vesper control windows', () => {
  const base = setupLaboratory('w6-t5-windows');

  const early = resolveVesperControlState(base.adventure, 200);
  equal(early.devices.right, 'telegraph', 'right control telegraphs first');
  equal(early.pressure.phase, 'telegraph', 'left pressure lane telegraphs before becoming dangerous');

  const rightWindow = resolveVesperControlState(base.adventure, 700);
  equal(rightWindow.devices.right, 'vulnerable', 'right control opens during first attack window');
  equal(rightWindow.pressure.phase, 'active', 'left pressure lane is active opposite the exposed right control');
  equal(rightWindow.pressure.lane, 'left', 'first active pressure lane is left');

  const leftWindow = resolveVesperControlState(base.adventure, 2_200);
  equal(leftWindow.devices.left, 'vulnerable', 'left control opens during second attack window');
  equal(leftWindow.pressure.phase, 'active', 'right pressure lane is active opposite the exposed left control');
  equal(leftWindow.pressure.lane, 'right', 'second active pressure lane is right');
});

void test('W6 T5 blocks sealed hits and consumes the Dream Spark', () => {
  const base = setupLaboratory('w6-t5-blocked');
  const target = VESPER_CONTROL_DEVICES.right;
  const session = withProjectile(base.session, 1_200, target.x);
  const stepped = stepAdventureExploration(session, base.adventure, 33);

  equal(isVesperControlDeviceDisabled(stepped.adventure, 'right'), false, 'sealed control ignores damage');
  equal(stepped.session.combat.projectiles.length, 0, 'blocked projectile is consumed by the control shield');
  equal(
    stepped.events.some(event => event.type === 'LABORATORY_CONTROL_DEVICE_BLOCKED' && event.deviceId === 'right'),
    true,
    'blocked hit emits explicit feedback event',
  );
});

void test('W6 T5 disables both controls only in valid windows and advances to Resonator phase', () => {
  const base = setupLaboratory('w6-t5-complete');

  const rightShot = withProjectile(
    { ...base.session, player: { ...base.session.player, x: 90 }, domestic: { ...base.session.domestic, player: { x: 90, facing: 'right' } } },
    700,
    VESPER_CONTROL_DEVICES.right.x,
  );
  const right = stepAdventureExploration(rightShot, base.adventure, 33);
  equal(isVesperControlDeviceDisabled(right.adventure, 'right'), true, 'right control disables in its vulnerability window');
  equal(getLaboratoryEncounterPhase(right.adventure), 'vesper-control', 'one disabled control does not prematurely advance the phase');
  equal(right.events.some(event => event.type === 'LABORATORY_CONTROL_DEVICE_DISABLED' && event.deviceId === 'right'), true, 'right disable emits milestone event');

  const leftShot = withProjectile(
    {
      ...right.session,
      player: { ...right.session.player, x: 40, facing: 'right' },
      domestic: { ...right.session.domestic, player: { x: 40, facing: 'right' } },
      combat: { ...right.session.combat, projectiles: [] },
    },
    2_200,
    VESPER_CONTROL_DEVICES.left.x,
  );
  const left = stepAdventureExploration(leftShot, right.adventure, 33);

  equal(isVesperControlDeviceDisabled(left.adventure, 'left'), true, 'left control disables in its vulnerability window');
  equal(getLaboratoryEncounterPhase(left.adventure), 'resonator', 'two disabled controls persist vesper-control-broken and advance to T6 phase');
  equal(left.events.some(event => event.type === 'LABORATORY_VESPER_CONTROL_BROKEN'), true, 'phase transition emits explicit milestone');
  equal(left.session.combat.projectiles.length, 0, 'phase transition clears stale Dream Sparks');
});

void test('W6 T5 Vesper pressure damages only the active telegraphed lane', () => {
  const base = setupLaboratory('w6-t5-pressure');
  const exposed: HauntedSessionState = {
    ...base.session,
    elapsedMs: 700,
    player: { ...base.session.player, x: 40, y: 104, vx: 0, vy: 0, grounded: true, facing: 'right' },
    domestic: { ...base.session.domestic, player: { x: 40, facing: 'right' } },
  };
  const hit = stepAdventureExploration(exposed, base.adventure, 33);
  equal(hit.session.combat.hp, base.session.combat.hp - 1, 'active pressure lane reuses Haunted HP damage');
  equal(hit.events.some(event => event.type === 'LABORATORY_VESPER_PULSE_HIT'), true, 'pressure hit emits Laboratory-specific event');

  const safe: HauntedSessionState = {
    ...base.session,
    elapsedMs: 700,
    player: { ...base.session.player, x: 92, y: 104, vx: 0, vy: 0, grounded: true, facing: 'left' },
    domestic: { ...base.session.domestic, player: { x: 92, facing: 'left' } },
  };
  const avoided = stepAdventureExploration(safe, base.adventure, 33);
  equal(avoided.session.combat.hp, base.session.combat.hp, 'opposite lane remains safe during Vesper pressure');
});

void test('W6 T5 retry preserves a disabled control milestone', () => {
  const base = setupLaboratory('w6-t5-retry');
  const adventure = setRoomSwitch(base.adventure, 'laboratory', VESPER_CONTROL_DEVICES.right.switchId, true);
  const failed: HauntedSessionState = {
    ...base.session,
    combat: { ...base.session.combat, hp: 0 },
    objective: { phase: 'failed', reason: 'haunted' },
  };
  const restored = restoreLaboratoryCheckpoint(failed, adventure);

  equal(isVesperControlDeviceDisabled(adventure, 'right'), true, 'retry does not erase already disabled control');
  equal(restored.combat.hp, restored.combat.maxHp, 'retry still restores full HP');
  equal(getLaboratoryEncounterPhase(adventure), 'vesper-control', 'partial T5 progress remains in phase 1');
});

console.log('W6 Vesper control tests passed');
