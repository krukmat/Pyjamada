import { equal, test } from './assert';
import { stepAdventureExploration } from '../src/game/adventure/AdventureExplorationRuntime';
import { createAdventureState, setRoomSwitch, type AdventureState } from '../src/game/adventure/AdventureState';
import {
  getLaboratoryEncounterPhase,
  LABORATORY_ENCOUNTER_SWITCHES,
  restoreLaboratoryCheckpoint,
} from '../src/game/adventure/LaboratoryEncounter';
import {
  getVesperNightmareHitCount,
  resolveVesperNightmareState,
  VESPER_NIGHTMARE_HIT_SWITCHES,
  VESPER_NIGHTMARE_TARGET,
} from '../src/game/adventure/LaboratoryVesperNightmare';
import { decodeAdventureGameSession, encodeAdventureGameSession } from '../src/game/adventure/AdventureSessionCodec';
import { createHauntedInputState } from '../src/game/haunted/HauntedInput';
import { createHauntedSession, type HauntedSessionState } from '../src/game/haunted/HauntedSessionRuntime';

function setupNightmare(runId: string): { session: HauntedSessionState; adventure: AdventureState } {
  let adventure = createAdventureState();
  adventure = {
    ...adventure,
    currentRoom: 'laboratory',
    currentEntry: 'laboratory-from-basement',
    visitedRooms: ['bedroom', 'hallway', 'living-room', 'kitchen', 'bathroom', 'attic', 'basement', 'laboratory'],
    storyFlags: {
      ...adventure.storyFlags,
      bedroomEscapeAttempted: true,
      hallwayUnlocked: true,
      labTransmissionSeen: true,
    },
  };
  adventure = setRoomSwitch(adventure, 'laboratory', LABORATORY_ENCOUNTER_SWITCHES.started, true);
  adventure = setRoomSwitch(adventure, 'laboratory', LABORATORY_ENCOUNTER_SWITCHES.vesperControlBroken, true);
  adventure = setRoomSwitch(adventure, 'laboratory', LABORATORY_ENCOUNTER_SWITCHES.resonatorDestabilized, true);
  adventure = setRoomSwitch(adventure, 'laboratory', 'vesper-control-left-disabled', true);
  adventure = setRoomSwitch(adventure, 'laboratory', 'vesper-control-right-disabled', true);
  adventure = setRoomSwitch(adventure, 'laboratory', 'resonator-node-left-disabled', true);
  adventure = setRoomSwitch(adventure, 'laboratory', 'resonator-node-right-disabled', true);

  const base = createHauntedSession(runId);
  const session: HauntedSessionState = {
    ...base,
    player: { ...base.player, x: 70, y: 104, vx: 0, vy: 0, grounded: true, facing: 'right' },
    domestic: {
      ...base.domestic,
      player: { x: 70, facing: 'right' },
      wallyState: 'normal',
      flags: { ...base.domestic.flags, dressed: true },
      collected: ['keys'],
      objectStates: { ...base.domestic.objectStates, wardrobe: 'used', keys: 'collected' },
      interactionCounts: { ...base.domestic.interactionCounts, wardrobe: 1, keys: 1 },
    },
    input: createHauntedInputState(),
    objective: { phase: 'completed' },
  };

  return { session, adventure };
}

function withProjectile(session: HauntedSessionState, elapsedMs: number): HauntedSessionState {
  const dtSeconds = 33 / 1000;
  return {
    ...session,
    elapsedMs,
    combat: {
      ...session.combat,
      projectiles: [{
        id: 299,
        x: VESPER_NIGHTMARE_TARGET.x - 76 * dtSeconds,
        y: VESPER_NIGHTMARE_TARGET.y,
        vx: 76,
        damage: 1,
      }],
    },
  };
}

void test('W6 T7 exposes three deterministic telegraph, attack and recovery patterns', () => {
  const base = setupNightmare('w6-t7-patterns');

  const leftTelegraph = resolveVesperNightmareState(base.adventure, 200);
  equal(leftTelegraph.attack, 'left-slam', 'first pattern is left slam');
  equal(leftTelegraph.phase, 'telegraph', 'left slam telegraphs before damage');

  const leftAttack = resolveVesperNightmareState(base.adventure, 600);
  equal(leftAttack.phase, 'active', 'left slam becomes active');

  const leftRecovery = resolveVesperNightmareState(base.adventure, 1_100);
  equal(leftRecovery.phase, 'recovery', 'left slam has explicit recovery');
  equal(leftRecovery.vulnerable, true, 'first recovery is the first valid vulnerability window');

  const center = resolveVesperNightmareState(base.adventure, 2_000);
  equal(center.attack, 'center-rift', 'second deterministic pattern is center rift');
  equal(center.phase, 'active', 'center rift has an active damage phase');

  const right = resolveVesperNightmareState(base.adventure, 3_400);
  equal(right.attack, 'right-slam', 'third deterministic pattern is right slam');
  equal(right.phase, 'active', 'right slam has an active damage phase');
});

void test('W6 T7 active Nightmare attack damages only its telegraphed zone', () => {
  const base = setupNightmare('w6-t7-damage');

  const exposed: HauntedSessionState = {
    ...base.session,
    elapsedMs: 500,
    player: { ...base.session.player, x: 40, vx: 0, vy: 0, grounded: true },
    domestic: { ...base.session.domestic, player: { x: 40, facing: 'right' } },
  };
  const hit = stepAdventureExploration(exposed, base.adventure, 33);
  equal(hit.session.combat.hp, base.session.combat.hp - 1, 'left slam damages Wally inside active left zone');
  equal(hit.events.some(event => event.type === 'LABORATORY_NIGHTMARE_ATTACK_HIT'), true, 'Nightmare attack emits explicit hit event');

  const safe: HauntedSessionState = {
    ...base.session,
    elapsedMs: 500,
    player: { ...base.session.player, x: 90, vx: 0, vy: 0, grounded: true },
    domestic: { ...base.session.domestic, player: { x: 90, facing: 'right' } },
  };
  const avoided = stepAdventureExploration(safe, base.adventure, 33);
  equal(avoided.session.combat.hp, base.session.combat.hp, 'same attack leaves the opposite side safe');
});

void test('W6 T7 blocks Dream Sparks outside the correct recovery window', () => {
  const base = setupNightmare('w6-t7-blocked');
  const attackShot = withProjectile(base.session, 600);
  const blocked = stepAdventureExploration(attackShot, base.adventure, 33);

  equal(getVesperNightmareHitCount(blocked.adventure), 0, 'active attack window cannot damage Nightmare');
  equal(blocked.session.combat.projectiles.length, 0, 'blocked Dream Spark is consumed');
  equal(blocked.events.some(event => event.type === 'LABORATORY_NIGHTMARE_HIT_BLOCKED'), true, 'blocked shot emits feedback event');
});

void test('W6 T7 accepts exactly one meaningful hit per ordered recovery and hands off to shutdown', () => {
  const base = setupNightmare('w6-t7-complete');

  const first = stepAdventureExploration(withProjectile(base.session, 1_000), base.adventure, 33);
  equal(getVesperNightmareHitCount(first.adventure), 1, 'first recovery persists first meaningful hit');
  equal(first.events.some(event => event.type === 'LABORATORY_NIGHTMARE_HIT_ACCEPTED' && event.hit === 1), true, 'first hit emits ordered milestone');

  const duplicate = stepAdventureExploration(
    withProjectile({ ...first.session, combat: { ...first.session.combat, projectiles: [] } }, 1_100),
    first.adventure,
    33,
  );
  equal(getVesperNightmareHitCount(duplicate.adventure), 1, 'same recovery cannot award a second hit');
  equal(duplicate.events.some(event => event.type === 'LABORATORY_NIGHTMARE_HIT_BLOCKED'), true, 'duplicate same-window shot is rejected');

  const second = stepAdventureExploration(
    withProjectile({ ...duplicate.session, combat: { ...duplicate.session.combat, projectiles: [] } }, 2_400),
    duplicate.adventure,
    33,
  );
  equal(getVesperNightmareHitCount(second.adventure), 2, 'second recovery persists second meaningful hit');

  const third = stepAdventureExploration(
    withProjectile({ ...second.session, combat: { ...second.session.combat, projectiles: [] } }, 3_800),
    second.adventure,
    33,
  );
  equal(getVesperNightmareHitCount(third.adventure), 3, 'third recovery persists final meaningful hit');
  equal(getLaboratoryEncounterPhase(third.adventure), 'shutdown', 'third hit advances exactly to shutdown');
  equal(third.events.some(event => event.type === 'LABORATORY_VESPER_NIGHTMARE_DEFEATED'), true, 'defeat emits T8 boundary event');
  equal(third.session.combat.projectiles.length, 0, 'defeat clears transient Dream Sparks');
  equal(third.session.combat.invulnerableUntilMs > third.session.elapsedMs, true, 'shutdown handoff receives safe-entry grace period');
});

void test('W6 T7 retry and Save/Continue preserve Nightmare hit progress', () => {
  const base = setupNightmare('w6-t7-persistence');
  let adventure = setRoomSwitch(base.adventure, 'laboratory', VESPER_NIGHTMARE_HIT_SWITCHES[0], true);
  adventure = setRoomSwitch(adventure, 'laboratory', VESPER_NIGHTMARE_HIT_SWITCHES[1], true);

  const failed: HauntedSessionState = {
    ...base.session,
    combat: { ...base.session.combat, hp: 0 },
    objective: { phase: 'failed', reason: 'haunted' },
  };
  const restored = restoreLaboratoryCheckpoint(failed, adventure);
  equal(getVesperNightmareHitCount(adventure), 2, 'retry preserves two completed Nightmare hits');
  equal(restored.combat.hp, restored.combat.maxHp, 'retry restores full HP');
  equal(getLaboratoryEncounterPhase(adventure), 'nightmare', 'partial Nightmare progress stays in phase 3');

  const encoded = encodeAdventureGameSession({ schemaVersion: 3, haunted: restored, adventure });
  const decoded = decodeAdventureGameSession(encoded);
  equal(decoded.status, 'ok', 'existing save envelope accepts Nightmare progress');
  if (decoded.status !== 'ok') return;
  equal(getVesperNightmareHitCount(decoded.state.adventure), 2, 'Continue preserves Nightmare hit milestones');
  equal(getLaboratoryEncounterPhase(decoded.state.adventure), 'nightmare', 'Continue resumes Nightmare phase');
});

console.log('W6 Vesper Nightmare tests passed');
