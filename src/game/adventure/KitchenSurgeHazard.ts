import { getRoomState, markRoomInteraction, type AdventureState } from './AdventureState';

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
 * a floor surge leaves the breaker outlet and runs toward the Living Room door.
 * Grounded players in its path take a hit; jumping clears it. It follows the
 * Basement hazard pattern (deterministic cycle, aligned arming) but stays local.
 * The surge dies before the door so the entry spawn, the microwave save point
 * and the breaker are never inside its path.
 */
export const KITCHEN_SURGE = {
  cycleMs: 2_600,
  safeMs: 900,
  telegraphMs: 700,
  travelMs: 1_000,
  sourceX: 102,
  targetX: 22,
  halfWidth: 4,
} as const;

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
  // Start on a cycle boundary so the first surge is always fully telegraphed.
  const alignedElapsedMs = Math.ceil(Math.max(0, elapsedMs) / KITCHEN_SURGE.cycleMs) * KITCHEN_SURGE.cycleMs;
  return { adventure: markRoomInteraction(adventure, 'kitchen', ARMED_INTERACTION), elapsedMs: alignedElapsedMs };
}

export function resolveKitchenSurge(adventure: AdventureState, elapsedMs: number): KitchenSurgeSnapshot {
  if (adventure.currentRoom !== 'kitchen' || !isKitchenSurgeLive(adventure) || !isKitchenSurgeArmed(adventure)) {
    return { phase: 'inactive', dangerous: false, progress: 0 };
  }
  const { cycleMs, safeMs, telegraphMs, travelMs, sourceX, targetX } = KITCHEN_SURGE;
  const t = ((elapsedMs % cycleMs) + cycleMs) % cycleMs;
  if (t < safeMs) return { phase: 'safe', dangerous: false, progress: t / safeMs };
  if (t < safeMs + telegraphMs) return { phase: 'telegraph', dangerous: false, progress: (t - safeMs) / telegraphMs };
  const progress = Math.min(1, (t - safeMs - telegraphMs) / travelMs);
  return { phase: 'surge', dangerous: true, progress, frontX: sourceX + (targetX - sourceX) * progress };
}

export function isPlayerHitByKitchenSurge(player: { x: number; grounded: boolean }, surge: KitchenSurgeSnapshot): boolean {
  return surge.dangerous
    && surge.frontX !== undefined
    && player.grounded
    && Math.abs(player.x - surge.frontX) <= KITCHEN_SURGE.halfWidth;
}
