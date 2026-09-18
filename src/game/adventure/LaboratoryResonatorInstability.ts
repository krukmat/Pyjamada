import type { DreamSparkProjectile, HauntedCombatState } from '../haunted/HauntedCombat';
import type { HauntedInputState } from '../haunted/HauntedInput';
import { getRoomState, setRoomSwitch, type AdventureState } from './AdventureState';
import { getLaboratoryEncounterPhase, LABORATORY_ENCOUNTER_SWITCHES } from './LaboratoryEncounter';

export type ResonatorWeakPointId = 'left' | 'right';
export type ResonatorWeakPointState = 'sealed' | 'telegraph' | 'vulnerable' | 'disabled';
export type ResonatorHazardPhase = 'idle' | 'telegraph' | 'active';

export type ResonatorWeakPoint = {
  id: ResonatorWeakPointId;
  x: number;
  y: number;
  switchId: string;
};

export type ResonatorDistortionState = {
  phase: ResonatorHazardPhase;
  minX?: number;
  maxX?: number;
};

export type ResonatorElectricalState = {
  phase: ResonatorHazardPhase;
  lane?: 'left' | 'right';
  minX?: number;
  maxX?: number;
};

export type ResonatorInstabilityState = {
  active: boolean;
  cycleMs: number;
  weakPoints: Record<ResonatorWeakPointId, ResonatorWeakPointState>;
  distortion: ResonatorDistortionState;
  electrical: ResonatorElectricalState;
};

export type ResonatorInstabilityEvent =
  | { type: 'LABORATORY_RESONATOR_NODE_BLOCKED'; nodeId: ResonatorWeakPointId }
  | { type: 'LABORATORY_RESONATOR_NODE_DISABLED'; nodeId: ResonatorWeakPointId }
  | { type: 'LABORATORY_RESONATOR_DESTABILIZED' };

export const RESONATOR_INSTABILITY_CYCLE_MS = 3_600;

export const RESONATOR_WEAK_POINTS: Readonly<Record<ResonatorWeakPointId, ResonatorWeakPoint>> = {
  left: {
    id: 'left',
    x: 66,
    y: 84,
    switchId: 'resonator-node-left-disabled',
  },
  right: {
    id: 'right',
    x: 86,
    y: 84,
    switchId: 'resonator-node-right-disabled',
  },
};

export const RESONATOR_DISTORTION_ZONE = { minX: 56, maxX: 96 } as const;
export const RESONATOR_ELECTRICAL_LANES = {
  left: { minX: 18, maxX: 55 },
  right: { minX: 97, maxX: 116 },
} as const;

const NODE_HIT_RADIUS_X = 6;
const NODE_HIT_RADIUS_Y = 9;

export function resolveResonatorInstabilityState(
  adventure: AdventureState,
  elapsedMs: number,
): ResonatorInstabilityState {
  const active = adventure.currentRoom === 'laboratory'
    && getLaboratoryEncounterPhase(adventure) === 'resonator';
  const cycleMs = positiveModulo(elapsedMs, RESONATOR_INSTABILITY_CYCLE_MS);

  if (!active) {
    return {
      active: false,
      cycleMs,
      weakPoints: {
        left: isResonatorWeakPointDisabled(adventure, 'left') ? 'disabled' : 'sealed',
        right: isResonatorWeakPointDisabled(adventure, 'right') ? 'disabled' : 'sealed',
      },
      distortion: { phase: 'idle' },
      electrical: { phase: 'idle' },
    };
  }

  return {
    active: true,
    cycleMs,
    weakPoints: {
      left: resolveWeakPointState(adventure, 'left', cycleMs),
      right: resolveWeakPointState(adventure, 'right', cycleMs),
    },
    distortion: resolveDistortionState(cycleMs),
    electrical: resolveElectricalState(cycleMs),
  };
}

export function isResonatorWeakPointDisabled(
  adventure: AdventureState,
  nodeId: ResonatorWeakPointId,
): boolean {
  return getRoomState(adventure, 'laboratory').switches[RESONATOR_WEAK_POINTS[nodeId].switchId] === true;
}

export function applyResonatorDistortionInput(
  input: HauntedInputState,
  playerX: number,
  distortion: ResonatorDistortionState,
): HauntedInputState {
  if (
    distortion.phase !== 'active'
    || distortion.minX === undefined
    || distortion.maxX === undefined
    || playerX < distortion.minX
    || playerX > distortion.maxX
  ) {
    return input;
  }

  if (input.left === input.right) return input;
  return { ...input, left: input.right, right: input.left };
}

export function isPlayerInsideResonatorElectricalPressure(
  playerX: number,
  electrical: ResonatorElectricalState,
): boolean {
  return electrical.phase === 'active'
    && electrical.minX !== undefined
    && electrical.maxX !== undefined
    && playerX >= electrical.minX
    && playerX <= electrical.maxX;
}

export function resolveResonatorProjectileHits(
  adventure: AdventureState,
  combat: HauntedCombatState,
  elapsedMs: number,
): { adventure: AdventureState; combat: HauntedCombatState; events: ResonatorInstabilityEvent[] } {
  if (adventure.currentRoom !== 'laboratory' || getLaboratoryEncounterPhase(adventure) !== 'resonator') {
    return { adventure, combat, events: [] };
  }

  let nextAdventure = adventure;
  const events: ResonatorInstabilityEvent[] = [];
  const remaining: DreamSparkProjectile[] = [];

  for (const projectile of combat.projectiles) {
    const node = findProjectileNodeHit(nextAdventure, projectile);
    if (!node) {
      remaining.push(projectile);
      continue;
    }

    const state = resolveResonatorInstabilityState(nextAdventure, elapsedMs).weakPoints[node.id];
    if (state !== 'vulnerable') {
      events.push({ type: 'LABORATORY_RESONATOR_NODE_BLOCKED', nodeId: node.id });
      continue;
    }

    nextAdventure = setRoomSwitch(nextAdventure, 'laboratory', node.switchId, true);
    events.push({ type: 'LABORATORY_RESONATOR_NODE_DISABLED', nodeId: node.id });
  }

  const bothDisabled = isResonatorWeakPointDisabled(nextAdventure, 'left')
    && isResonatorWeakPointDisabled(nextAdventure, 'right');
  if (
    bothDisabled
    && getRoomState(nextAdventure, 'laboratory').switches[LABORATORY_ENCOUNTER_SWITCHES.resonatorDestabilized] !== true
  ) {
    nextAdventure = setRoomSwitch(
      nextAdventure,
      'laboratory',
      LABORATORY_ENCOUNTER_SWITCHES.resonatorDestabilized,
      true,
    );
    events.push({ type: 'LABORATORY_RESONATOR_DESTABILIZED' });
  }

  const projectiles = bothDisabled ? [] : remaining;
  const nextCombat = projectiles.length === combat.projectiles.length
    && projectiles.every((projectile, index) => projectile === combat.projectiles[index])
    ? combat
    : { ...combat, projectiles };

  return { adventure: nextAdventure, combat: nextCombat, events };
}

function findProjectileNodeHit(
  adventure: AdventureState,
  projectile: DreamSparkProjectile,
): ResonatorWeakPoint | undefined {
  return (Object.values(RESONATOR_WEAK_POINTS) as ResonatorWeakPoint[])
    .filter(node => !isResonatorWeakPointDisabled(adventure, node.id))
    .filter(node => Math.abs(projectile.x - node.x) <= NODE_HIT_RADIUS_X)
    .filter(node => Math.abs(projectile.y - node.y) <= NODE_HIT_RADIUS_Y)
    .sort((a, b) => Math.abs(projectile.x - a.x) - Math.abs(projectile.x - b.x))[0];
}

function resolveWeakPointState(
  adventure: AdventureState,
  nodeId: ResonatorWeakPointId,
  cycleMs: number,
): ResonatorWeakPointState {
  if (isResonatorWeakPointDisabled(adventure, nodeId)) return 'disabled';

  if (nodeId === 'left') {
    if (cycleMs < 300) return 'telegraph';
    if (cycleMs < 1_000) return 'vulnerable';
    return 'sealed';
  }

  if (cycleMs >= 1_800 && cycleMs < 2_100) return 'telegraph';
  if (cycleMs >= 2_100 && cycleMs < 2_800) return 'vulnerable';
  return 'sealed';
}

function resolveDistortionState(cycleMs: number): ResonatorDistortionState {
  if (cycleMs < 300 || (cycleMs >= 1_800 && cycleMs < 2_100)) {
    return { phase: 'telegraph', ...RESONATOR_DISTORTION_ZONE };
  }
  if ((cycleMs >= 300 && cycleMs < 1_000) || (cycleMs >= 2_100 && cycleMs < 2_800)) {
    return { phase: 'active', ...RESONATOR_DISTORTION_ZONE };
  }
  return { phase: 'idle' };
}

function resolveElectricalState(cycleMs: number): ResonatorElectricalState {
  if (cycleMs >= 1_000 && cycleMs < 1_300) {
    return { phase: 'telegraph', lane: 'left', ...RESONATOR_ELECTRICAL_LANES.left };
  }
  if (cycleMs >= 1_300 && cycleMs < 1_750) {
    return { phase: 'active', lane: 'left', ...RESONATOR_ELECTRICAL_LANES.left };
  }
  if (cycleMs >= 2_800 && cycleMs < 3_100) {
    return { phase: 'telegraph', lane: 'right', ...RESONATOR_ELECTRICAL_LANES.right };
  }
  if (cycleMs >= 3_100 && cycleMs < 3_550) {
    return { phase: 'active', lane: 'right', ...RESONATOR_ELECTRICAL_LANES.right };
  }
  return { phase: 'idle' };
}

function positiveModulo(value: number, modulo: number): number {
  return ((value % modulo) + modulo) % modulo;
}
