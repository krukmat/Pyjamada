import type { DreamSparkProjectile, HauntedCombatState } from '../haunted/HauntedCombat';
import { getRoomState, setRoomSwitch, type AdventureState } from './AdventureState';
import { getLaboratoryEncounterPhase, LABORATORY_ENCOUNTER_SWITCHES } from './LaboratoryEncounter';

export type VesperNightmareAttackId = 'left-slam' | 'center-rift' | 'right-slam';
export type VesperNightmareAttackPhase = 'idle' | 'telegraph' | 'active' | 'recovery';

export type VesperNightmareState = {
  active: boolean;
  cycleMs: number;
  attack?: VesperNightmareAttackId;
  phase: VesperNightmareAttackPhase;
  minX?: number;
  maxX?: number;
  vulnerable: boolean;
  vulnerabilitySlot?: 1 | 2 | 3;
  hits: number;
};

export type VesperNightmareEvent =
  | { type: 'LABORATORY_NIGHTMARE_HIT_BLOCKED' }
  | { type: 'LABORATORY_NIGHTMARE_HIT_ACCEPTED'; hit: 1 | 2 | 3 }
  | { type: 'LABORATORY_VESPER_NIGHTMARE_DEFEATED' };

export const VESPER_NIGHTMARE_CYCLE_MS = 4_800;

export const VESPER_NIGHTMARE_TARGET = {
  x: 108,
  y: 82,
  hitRadiusX: 11,
  hitRadiusY: 14,
} as const;

export const VESPER_NIGHTMARE_HAZARDS = {
  'left-slam': { minX: 18, maxX: 52 },
  'center-rift': { minX: 54, maxX: 98 },
  'right-slam': { minX: 82, maxX: 116 },
} as const;

export const VESPER_NIGHTMARE_HIT_SWITCHES = [
  'vesper-nightmare-hit-1',
  'vesper-nightmare-hit-2',
  'vesper-nightmare-hit-3',
] as const;

export function getVesperNightmareHitCount(adventure: AdventureState): number {
  const switches = getRoomState(adventure, 'laboratory').switches;
  let hits = 0;
  for (const switchId of VESPER_NIGHTMARE_HIT_SWITCHES) {
    if (switches[switchId] !== true) break;
    hits += 1;
  }
  return hits;
}

export function resolveVesperNightmareState(
  adventure: AdventureState,
  elapsedMs: number,
): VesperNightmareState {
  const hits = getVesperNightmareHitCount(adventure);
  const active = adventure.currentRoom === 'laboratory'
    && getLaboratoryEncounterPhase(adventure) === 'nightmare';
  const cycleMs = positiveModulo(elapsedMs, VESPER_NIGHTMARE_CYCLE_MS);

  if (!active) {
    return {
      active: false,
      cycleMs,
      phase: 'idle',
      vulnerable: false,
      hits,
    };
  }

  if (cycleMs < 400) return attackState(cycleMs, 'left-slam', 'telegraph', 1, hits);
  if (cycleMs < 900) return attackState(cycleMs, 'left-slam', 'active', 1, hits);
  if (cycleMs < 1_400) return attackState(cycleMs, 'left-slam', 'recovery', 1, hits);

  if (cycleMs < 1_800) return attackState(cycleMs, 'center-rift', 'telegraph', 2, hits);
  if (cycleMs < 2_300) return attackState(cycleMs, 'center-rift', 'active', 2, hits);
  if (cycleMs < 2_800) return attackState(cycleMs, 'center-rift', 'recovery', 2, hits);

  if (cycleMs < 3_200) return attackState(cycleMs, 'right-slam', 'telegraph', 3, hits);
  if (cycleMs < 3_700) return attackState(cycleMs, 'right-slam', 'active', 3, hits);
  if (cycleMs < 4_200) return attackState(cycleMs, 'right-slam', 'recovery', 3, hits);

  return {
    active: true,
    cycleMs,
    phase: 'idle',
    vulnerable: false,
    hits,
  };
}

export function isPlayerInsideVesperNightmareAttack(
  playerX: number,
  state: VesperNightmareState,
): boolean {
  return state.active
    && state.phase === 'active'
    && state.minX !== undefined
    && state.maxX !== undefined
    && playerX >= state.minX
    && playerX <= state.maxX;
}

export function resolveVesperNightmareProjectileHits(
  adventure: AdventureState,
  combat: HauntedCombatState,
  elapsedMs: number,
): { adventure: AdventureState; combat: HauntedCombatState; events: VesperNightmareEvent[] } {
  if (adventure.currentRoom !== 'laboratory' || getLaboratoryEncounterPhase(adventure) !== 'nightmare') {
    return { adventure, combat, events: [] };
  }

  let nextAdventure = adventure;
  const events: VesperNightmareEvent[] = [];
  const remaining: DreamSparkProjectile[] = [];

  for (const projectile of combat.projectiles) {
    if (!hitsNightmareTarget(projectile)) {
      remaining.push(projectile);
      continue;
    }

    const state = resolveVesperNightmareState(nextAdventure, elapsedMs);
    const nextHit = (getVesperNightmareHitCount(nextAdventure) + 1) as 1 | 2 | 3 | 4;
    if (
      !state.vulnerable
      || state.vulnerabilitySlot === undefined
      || state.vulnerabilitySlot !== nextHit
      || nextHit > 3
    ) {
      events.push({ type: 'LABORATORY_NIGHTMARE_HIT_BLOCKED' });
      continue;
    }

    const switchId = VESPER_NIGHTMARE_HIT_SWITCHES[nextHit - 1];
    nextAdventure = setRoomSwitch(nextAdventure, 'laboratory', switchId, true);
    events.push({ type: 'LABORATORY_NIGHTMARE_HIT_ACCEPTED', hit: nextHit });

    if (nextHit === 3) {
      nextAdventure = setRoomSwitch(
        nextAdventure,
        'laboratory',
        LABORATORY_ENCOUNTER_SWITCHES.nightmareDefeated,
        true,
      );
      events.push({ type: 'LABORATORY_VESPER_NIGHTMARE_DEFEATED' });
    }
  }

  const defeated = getLaboratoryEncounterPhase(nextAdventure) === 'shutdown';
  const projectiles = defeated ? [] : remaining;
  const nextCombat = projectiles.length === combat.projectiles.length
    && projectiles.every((projectile, index) => projectile === combat.projectiles[index])
    ? combat
    : { ...combat, projectiles };

  return { adventure: nextAdventure, combat: nextCombat, events };
}

function attackState(
  cycleMs: number,
  attack: VesperNightmareAttackId,
  phase: Exclude<VesperNightmareAttackPhase, 'idle'>,
  vulnerabilitySlot: 1 | 2 | 3,
  hits: number,
): VesperNightmareState {
  const bounds = VESPER_NIGHTMARE_HAZARDS[attack];
  const vulnerable = phase === 'recovery' && hits + 1 === vulnerabilitySlot;
  return {
    active: true,
    cycleMs,
    attack,
    phase,
    ...bounds,
    vulnerable,
    vulnerabilitySlot,
    hits,
  };
}

function hitsNightmareTarget(projectile: DreamSparkProjectile): boolean {
  return Math.abs(projectile.x - VESPER_NIGHTMARE_TARGET.x) <= VESPER_NIGHTMARE_TARGET.hitRadiusX
    && Math.abs(projectile.y - VESPER_NIGHTMARE_TARGET.y) <= VESPER_NIGHTMARE_TARGET.hitRadiusY;
}

function positiveModulo(value: number, modulo: number): number {
  return ((value % modulo) + modulo) % modulo;
}
