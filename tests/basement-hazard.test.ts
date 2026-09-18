import { equal, test } from './assert';
import {
  applyFalseEscape,
  stepAdventureExploration,
} from '../src/game/adventure/AdventureExplorationRuntime';
import {
  createAdventureState,
  createRoomPersistentState,
  setRoomSwitch,
  type AdventureState,
} from '../src/game/adventure/AdventureState';
import {
  BASEMENT_ELECTRICAL_HAZARD,
  isBasementElectricalHazardArmed,
  resolveBasementElectricalHazard,
} from '../src/game/adventure/BasementElectricalHazard';
import { createHauntedInputState } from '../src/game/haunted/HauntedInput';
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

function basementSetup(runId: string, controlRevealed: boolean) {
  const escaped = applyFalseEscape(preparedSession(runId), createAdventureState());
  let adventure: AdventureState = {
    ...escaped.adventure,
    currentRoom: 'basement',
    currentEntry: 'basement-from-attic',
    visitedRooms: [...escaped.adventure.visitedRooms, 'basement'],
    rooms: {
      ...escaped.adventure.rooms,
      basement: createRoomPersistentState(),
    },
  };
  adventure = setRoomSwitch(adventure, 'basement', 'basement-power-stabilized', true);
  if (controlRevealed) adventure = setRoomSwitch(adventure, 'basement', 'basement-control-revealed', true);

  const session: HauntedSessionState = {
    ...escaped.session,
    player: { ...escaped.session.player, x: 110, y: 104, vx: 0, vy: 0, grounded: true, facing: 'right' },
    domestic: { ...escaped.session.domestic, player: { x: 110, facing: 'right' } },
    input: createHauntedInputState(),
  };
  return { session, adventure };
}

function moveTo(session: HauntedSessionState, x: number): HauntedSessionState {
  return {
    ...session,
    player: { ...session.player, x, y: 104, vx: 0, vy: 0, grounded: true },
    domestic: { ...session.domestic, player: { ...session.domestic.player, x: Math.round(x) } },
    input: createHauntedInputState(),
  };
}

void test('remains inactive before the resonance control reveal', () => {
  const setup = basementSetup('hazard-inactive', false);
  const stepped = stepAdventureExploration(setup.session, setup.adventure, 5_000);

  equal(isBasementElectricalHazardArmed(stepped.adventure), false, 'hazard does not arm before control reveal');
  equal(stepped.session.elapsedMs, setup.session.elapsedMs, 'exploration clock stays frozen before hazard activation');
  equal(stepped.session.combat.hp, setup.session.combat.hp, 'inactive hazard cannot damage Wally');
  equal(resolveBasementElectricalHazard(stepped.adventure, stepped.session.elapsedMs).phase, 'inactive', 'hazard reports inactive');
});

void test('arms on a safe boundary and exposes a full telegraph window', () => {
  const setup = basementSetup('hazard-telegraph', true);
  const withOffset = { ...setup.session, elapsedMs: 1_234 };
  const armed = stepAdventureExploration(withOffset, setup.adventure, 16);

  equal(isBasementElectricalHazardArmed(armed.adventure), true, 'control reveal arms the local electrical hazard');
  equal(armed.session.elapsedMs, BASEMENT_ELECTRICAL_HAZARD.cycleMs, 'first cycle aligns to a deterministic safe boundary');
  equal(resolveBasementElectricalHazard(armed.adventure, armed.session.elapsedMs).phase, 'safe', 'arming never starts inside a discharge');

  const telegraph = stepAdventureExploration(armed.session, armed.adventure, 500);
  const snapshot = resolveBasementElectricalHazard(telegraph.adventure, telegraph.session.elapsedMs);
  equal(snapshot.phase, 'telegraph', 'control-feed instability visibly telegraphs before discharge');
  equal(snapshot.responseWindowMs, 1_100, 'telegraph leaves a meaningful response window');
  equal(telegraph.session.combat.hp, 3, 'telegraph itself is non-damaging');
});

void test('lets the player clear the unsafe control-feed lane before discharge', () => {
  const setup = basementSetup('hazard-avoid', true);
  const armed = stepAdventureExploration(setup.session, setup.adventure, 16);
  const telegraph = stepAdventureExploration(armed.session, armed.adventure, 500);
  const safeSession = moveTo(telegraph.session, BASEMENT_ELECTRICAL_HAZARD.zoneMinX - 5);
  const discharge = stepAdventureExploration(safeSession, telegraph.adventure, 1_200);

  equal(resolveBasementElectricalHazard(discharge.adventure, discharge.session.elapsedMs).phase, 'discharge', 'test reaches active discharge window');
  equal(discharge.session.combat.hp, 3, 'clearing the marked lane avoids damage');
  equal(discharge.events.some(event => event.type === 'BASEMENT_DISCHARGE_HIT'), false, 'safe response produces no hit event');
});

void test('discharge damages and knocks Wally away without repeated same-window hits', () => {
  const setup = basementSetup('hazard-hit', true);
  const armed = stepAdventureExploration(setup.session, setup.adventure, 16);
  const discharge = stepAdventureExploration(moveTo(armed.session, 110), armed.adventure, 1_600);

  equal(resolveBasementElectricalHazard(discharge.adventure, discharge.session.elapsedMs).phase, 'discharge', 'test reaches active discharge');
  equal(discharge.session.combat.hp, 2, 'unsafe lane costs one existing HP');
  equal(discharge.session.player.vx < 0, true, 'electrical hit knocks Wally away from the control area');
  equal(discharge.events.some(event => event.type === 'BASEMENT_DISCHARGE_HIT'), true, 'accepted contact emits one hazard hit event');

  const repeated = stepAdventureExploration(moveTo(discharge.session, 110), discharge.adventure, 100);
  equal(repeated.session.combat.hp, 2, 'existing invulnerability prevents repeated damage in the same discharge');
  equal(repeated.events.some(event => event.type === 'BASEMENT_DISCHARGE_HIT'), false, 'invulnerable overlap emits no duplicate hit event');
});

void test('can fail the run if the player repeatedly ignores the unsafe lane', () => {
  const setup = basementSetup('hazard-fatal', true);
  const oneHp = { ...setup.session, combat: { ...setup.session.combat, hp: 1 } };
  const armed = stepAdventureExploration(oneHp, setup.adventure, 16);
  const discharge = stepAdventureExploration(moveTo(armed.session, 110), armed.adventure, 1_600);

  equal(discharge.session.combat.hp, 0, 'discharge uses the existing combat damage contract');
  equal(discharge.session.objective.phase, 'failed', 'zero HP remains a real gameplay failure');
  equal(discharge.session.objective.reason, 'haunted', 'hazard failure reuses the existing haunted failure reason');
});

console.log('Basement hazard tests passed');
