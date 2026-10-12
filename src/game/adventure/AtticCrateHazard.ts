import { getRoomState, markRoomInteraction, type AdventureState } from './AdventureState';

export type AtticCrateStage = 'shadow' | 'falling' | 'impact' | 'debris';

export type AtticCrateDrop = {
  x: number;
  stage: AtticCrateStage;
  /** 0..1 through the current stage. */
  progress: number;
  dangerous: boolean;
};

export type AtticCrateSnapshot = { active: boolean; drops: AtticCrateDrop[] };

/**
 * Attic room threat: while Wally investigates the observation post (from
 * arrival until the recording reveals the experiment), crates shake loose
 * from the rafters. Each drop is announced by a growing shadow on the floor,
 * then the crate falls and breaks. Jumping does not help; stepping out of the
 * shadow does. Drop positions rotate deterministically and never include the
 * Bathroom stair entry.
 */
export const ATTIC_CRATES = {
  cycleMs: 4_800,
  dropOffsetsMs: [600, 2_000, 3_400],
  positions: [36, 64, 90, 50, 78, 100, 30, 70],
  shadowMs: 700,
  fallMs: 250,
  impactMs: 150,
  debrisMs: 400,
  /** The last part of the fall already hits whoever is underneath. */
  dangerLeadMs: 100,
  halfWidth: 6,
  rafterY: 34,
  floorY: 100,
} as const;

const ARMED_INTERACTION = 'attic-crates-armed';

export function isAtticCratesLive(adventure: AdventureState): boolean {
  return getRoomState(adventure, 'attic').switches['experiment-revealed'] !== true;
}

export function isAtticCratesArmed(adventure: AdventureState): boolean {
  return getRoomState(adventure, 'attic').interactions.includes(ARMED_INTERACTION);
}

export function armAtticCrates(
  adventure: AdventureState,
  elapsedMs: number,
): { adventure: AdventureState; elapsedMs: number } {
  if (adventure.currentRoom !== 'attic' || !isAtticCratesLive(adventure) || isAtticCratesArmed(adventure)) {
    return { adventure, elapsedMs };
  }
  const aligned = Math.ceil(Math.max(0, elapsedMs) / ATTIC_CRATES.cycleMs) * ATTIC_CRATES.cycleMs;
  return { adventure: markRoomInteraction(adventure, 'attic', ARMED_INTERACTION), elapsedMs: aligned };
}

function dropAt(x: number, t: number): AtticCrateDrop | undefined {
  const { shadowMs, fallMs, impactMs, debrisMs, dangerLeadMs } = ATTIC_CRATES;
  if (t < 0) return undefined;
  if (t < shadowMs) return { x, stage: 'shadow', progress: t / shadowMs, dangerous: false };
  const fallT = t - shadowMs;
  if (fallT < fallMs) return { x, stage: 'falling', progress: fallT / fallMs, dangerous: fallT >= fallMs - dangerLeadMs };
  const impactT = fallT - fallMs;
  if (impactT < impactMs) return { x, stage: 'impact', progress: impactT / impactMs, dangerous: true };
  const debrisT = impactT - impactMs;
  if (debrisT < debrisMs) return { x, stage: 'debris', progress: debrisT / debrisMs, dangerous: false };
  return undefined;
}

export function resolveAtticCrates(adventure: AdventureState, elapsedMs: number): AtticCrateSnapshot {
  if (adventure.currentRoom !== 'attic' || !isAtticCratesLive(adventure) || !isAtticCratesArmed(adventure)) {
    return { active: false, drops: [] };
  }
  const { cycleMs, dropOffsetsMs, positions } = ATTIC_CRATES;
  const cycle = Math.floor(elapsedMs / cycleMs);
  const t = elapsedMs - cycle * cycleMs;
  const drops: AtticCrateDrop[] = [];
  dropOffsetsMs.forEach((offset, index) => {
    const x = positions[(cycle * dropOffsetsMs.length + index) % positions.length];
    const drop = dropAt(x, t - offset);
    if (drop) drops.push(drop);
  });
  return { active: true, drops };
}

export function isPlayerHitByAtticCrate(player: { x: number }, crates: AtticCrateSnapshot): boolean {
  return crates.drops.some(drop => drop.dangerous && Math.abs(player.x - drop.x) <= ATTIC_CRATES.halfWidth);
}
