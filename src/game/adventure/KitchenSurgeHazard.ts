import { getRoomState, markRoomInteraction, type AdventureState } from './AdventureState';
import {
  alignFloorWaveStart,
  isPlayerHitByFloorWave,
  resolveFloorWave,
  type FloorWaveConfig,
} from './FloorWaveHazard';

export type KitchenSurgePhase = 'inactive' | 'safe' | 'telegraph' | 'surge';

export type KitchenSurgeSnapshot = {
  phase: KitchenSurgePhase;
  dangerous: boolean;
  /** 0..1 through the current phase. */
  progress: number;
  /** Stage x of the travelling surge front while dangerous. */
  frontX?: number;
};

/**
 * Kitchen room threat: while the circuit is overloaded and not yet rerouted,
 * a floor surge leaves the outlet beside the breaker and runs toward the
 * microwave. Grounded players in its path take a hit; jumping clears it. Its
 * path lies between the microwave's reach (54..74) and the breaker's (99..116),
 * so both can be read safely and the surge is crossed on the way between them.
 * The first cycle opens with its quiet window.
 */
export const KITCHEN_SURGE = {
  cycleMs: 2_600,
  safeMs: 900,
  telegraphMs: 700,
  travelMs: 600,
  waveOffsetsMs: [0],
  sourceX: 94,
  targetX: 79,
  halfWidth: 4.5,
} as const satisfies FloorWaveConfig;

const ARMED_INTERACTION = 'kitchen-surge-armed';

export function isKitchenSurgeLive(adventure: AdventureState): boolean {
  const kitchen = getRoomState(adventure, 'kitchen');
  return kitchen.switches['circuit-overloaded'] === true && kitchen.switches['power-rerouted'] !== true;
}

export function isKitchenSurgeArmed(adventure: AdventureState): boolean {
  return getRoomState(adventure, 'kitchen').interactions.includes(ARMED_INTERACTION);
}

export function armKitchenSurge(
  adventure: AdventureState,
  elapsedMs: number,
): { adventure: AdventureState; elapsedMs: number } {
  if (adventure.currentRoom !== 'kitchen' || !isKitchenSurgeLive(adventure) || isKitchenSurgeArmed(adventure)) {
    return { adventure, elapsedMs };
  }
  return { adventure: markRoomInteraction(adventure, 'kitchen', ARMED_INTERACTION), elapsedMs: alignFloorWaveStart(KITCHEN_SURGE, elapsedMs) };
}

export function resolveKitchenSurge(adventure: AdventureState, elapsedMs: number): KitchenSurgeSnapshot {
  if (adventure.currentRoom !== 'kitchen' || !isKitchenSurgeLive(adventure) || !isKitchenSurgeArmed(adventure)) {
    return { phase: 'inactive', dangerous: false, progress: 0 };
  }
  const wave = resolveFloorWave(KITCHEN_SURGE, elapsedMs);
  if (wave.phase === 'wave') return { phase: 'surge', dangerous: wave.dangerous, progress: wave.progress, frontX: wave.fronts[0] };
  return { phase: wave.phase, dangerous: false, progress: wave.progress };
}

export function isPlayerHitByKitchenSurge(player: { x: number; grounded: boolean }, surge: KitchenSurgeSnapshot): boolean {
  const fronts = surge.frontX === undefined ? [] : [surge.frontX];
  return isPlayerHitByFloorWave(KITCHEN_SURGE, player, { phase: 'wave', dangerous: surge.dangerous, progress: surge.progress, fronts });
}
