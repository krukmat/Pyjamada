import type { HauntedCombatState } from '../haunted/HauntedCombat';
import { getRoomState, markRoomInteraction, type AdventureState } from './AdventureState';

/**
 * Bathroom room threat: once the light is off and until the reflected route is
 * confirmed, Wally's reflection steps out of the mirror and always stands at
 * his mirrored position (2 * mirrorX - playerX). Touching it costs a heart. It
 * blocks the mirror until two Dream Sparks dispel it. Its position is derived
 * from Wally's, so only the hit/dispelled marks are stored, as room
 * interactions.
 */
export const BATHROOM_TWIN = {
  mirrorX: 64,
  contactHalfWidth: 8,
  sparkHitRadius: 6,
} as const;

const HIT_INTERACTION = 'bathroom-twin-hit';
const DISPELLED_INTERACTION = 'bathroom-twin-dispelled';

export type BathroomTwinEvent =
  | { type: 'BATHROOM_TWIN_HIT' }
  | { type: 'BATHROOM_TWIN_DISPELLED' };

export function isBathroomTwinDispelled(adventure: AdventureState): boolean {
  return getRoomState(adventure, 'bathroom').interactions.includes(DISPELLED_INTERACTION);
}

export function isBathroomTwinWounded(adventure: AdventureState): boolean {
  return getRoomState(adventure, 'bathroom').interactions.includes(HIT_INTERACTION);
}

/** True while the reflection is out of the mirror, wherever Wally currently is. */
export function isBathroomTwinLive(adventure: AdventureState): boolean {
  const bathroom = getRoomState(adventure, 'bathroom');
  return bathroom.switches['bathroom-light-off'] === true
    && bathroom.switches['mirror-route-revealed'] !== true
    && !bathroom.interactions.includes(DISPELLED_INTERACTION);
}

export function isBathroomTwinActive(adventure: AdventureState): boolean {
  return adventure.currentRoom === 'bathroom' && isBathroomTwinLive(adventure);
}

export function bathroomTwinX(playerX: number): number {
  return 2 * BATHROOM_TWIN.mirrorX - playerX;
}

export function isPlayerTouchingBathroomTwin(playerX: number): boolean {
  return Math.abs(playerX - bathroomTwinX(playerX)) <= BATHROOM_TWIN.contactHalfWidth;
}

/** Consumes Dream Sparks that reach the reflection: the first wounds it, the second dispels it. */
export function resolveBathroomTwinSparks(
  adventure: AdventureState,
  combat: HauntedCombatState,
  playerX: number,
): { adventure: AdventureState; combat: HauntedCombatState; events: BathroomTwinEvent[] } {
  if (!isBathroomTwinActive(adventure) || combat.projectiles.length === 0) return { adventure, combat, events: [] };
  const twinX = bathroomTwinX(playerX);
  const hit = combat.projectiles.find(projectile => Math.abs(projectile.x - twinX) <= BATHROOM_TWIN.sparkHitRadius);
  if (!hit) return { adventure, combat, events: [] };
  const remaining = { ...combat, projectiles: combat.projectiles.filter(projectile => projectile !== hit) };
  if (!isBathroomTwinWounded(adventure)) {
    return { adventure: markRoomInteraction(adventure, 'bathroom', HIT_INTERACTION), combat: remaining, events: [{ type: 'BATHROOM_TWIN_HIT' }] };
  }
  return {
    adventure: markRoomInteraction(adventure, 'bathroom', DISPELLED_INTERACTION),
    combat: { ...remaining, projectiles: [] },
    events: [{ type: 'BATHROOM_TWIN_DISPELLED' }],
  };
}
