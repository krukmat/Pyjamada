import { createHauntedInputState } from '../haunted/HauntedInput';
import type { HauntedSessionState } from '../haunted/HauntedSessionRuntime';
import { getRoomState, type AdventureState } from './AdventureState';

export type LaboratoryEncounterPhase =
  | 'dormant'
  | 'vesper-control'
  | 'resonator'
  | 'nightmare'
  | 'shutdown'
  | 'complete';

export const LABORATORY_ENCOUNTER_SWITCHES = {
  started: 'laboratory-encounter-started',
  vesperControlBroken: 'vesper-control-broken',
  resonatorDestabilized: 'resonator-destabilized',
  nightmareDefeated: 'vesper-nightmare-defeated',
  complete: 'laboratory-encounter-complete',
} as const;

export const LABORATORY_CHECKPOINT = {
  x: 28,
  y: 104,
  facing: 'right' as const,
  invulnerabilityMs: 600,
} as const;

export function getLaboratoryEncounterPhase(adventure: AdventureState): LaboratoryEncounterPhase {
  const switches = getRoomState(adventure, 'laboratory').switches;
  if (switches[LABORATORY_ENCOUNTER_SWITCHES.complete] === true) return 'complete';
  if (switches[LABORATORY_ENCOUNTER_SWITCHES.nightmareDefeated] === true) return 'shutdown';
  if (switches[LABORATORY_ENCOUNTER_SWITCHES.resonatorDestabilized] === true) return 'nightmare';
  if (switches[LABORATORY_ENCOUNTER_SWITCHES.vesperControlBroken] === true) return 'resonator';
  if (switches[LABORATORY_ENCOUNTER_SWITCHES.started] === true) return 'vesper-control';
  return 'dormant';
}

export function isLaboratoryEncounterActive(adventure: AdventureState): boolean {
  const phase = getLaboratoryEncounterPhase(adventure);
  return phase !== 'dormant' && phase !== 'complete';
}

export function shouldUseLaboratoryCheckpoint(adventure: AdventureState): boolean {
  return adventure.currentRoom === 'laboratory' && isLaboratoryEncounterActive(adventure);
}

export function restoreLaboratoryCheckpoint(
  session: HauntedSessionState,
  adventure: AdventureState,
): HauntedSessionState {
  if (!shouldUseLaboratoryCheckpoint(adventure)) return session;

  const player = {
    ...session.player,
    x: LABORATORY_CHECKPOINT.x,
    y: LABORATORY_CHECKPOINT.y,
    vx: 0,
    vy: 0,
    grounded: true,
    facing: LABORATORY_CHECKPOINT.facing,
  };

  return {
    ...session,
    player,
    input: createHauntedInputState(),
    domestic: {
      ...session.domestic,
      player: { x: LABORATORY_CHECKPOINT.x, facing: LABORATORY_CHECKPOINT.facing },
    },
    combat: {
      ...session.combat,
      hp: session.combat.maxHp,
      invulnerableUntilMs: session.elapsedMs + LABORATORY_CHECKPOINT.invulnerabilityMs,
      nextAttackAllowedMs: session.elapsedMs,
      projectiles: [],
    },
    threats: {
      ...session.threats,
      ghosts: [],
    },
    objective: { phase: 'completed' },
  };
}
