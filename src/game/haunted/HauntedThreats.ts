import type { HauntedCombatState } from './HauntedCombat';
import type { HauntedPlayerPhysicsState } from './PlayerPhysics';
import { nextSeededRandom } from './SeededRng';

export type GhostPhase = 'telegraph' | 'active' | 'dying';
/**
 * Phase as gameplay and presentation read it. 'recoil' is derived, never
 * stored: it is an active Ghost whose `phaseUntilMs` is still ahead (an active
 * Ghost otherwise keeps `phaseUntilMs` at 0), so saves keep their shape.
 */
export type ResolvedGhostPhase = GhostPhase | 'recoil';

export type HauntedGhostState = {
  id: number;
  x: number;
  y: number;
  phase: GhostPhase;
  /** End of the telegraph/dying window, or of the recoil window for an active Ghost (0 when not recoiling). */
  phaseUntilMs: number;
};

export type HauntedThreatState = {
  ghosts: HauntedGhostState[];
  nextEnemyId: number;
  nextSpawnAtMs: number;
  /** The Roach's crawl this leg (see RoomBossHazard); transient, exploration only. */
  roomBossChase?: { leg: string; crawl: number };
  /** The altered Bedroom's current reaper (see BedroomReaperHazard); transient, exploration only. */
  bedroomReaper?: { cycle: number; x: number; dispelled: boolean; dispelledAtMs?: number };
};

export type HauntedThreatEvent =
  | { type: 'GHOST_TELEGRAPHED'; ghostId: number }
  | { type: 'GHOST_SPAWNED'; ghostId: number }
  | { type: 'GHOST_DEFEATED'; ghostId: number }
  | { type: 'PLAYER_HIT_BY_GHOST'; ghostId: number };

export const GHOST_RULES = {
  graceMs: 8_000,
  telegraphMs: 520,
  dyingMs: 220,
  speed: 12,
  maxActive: 2,
  /** Drawn body half width (about 6.9 world units) plus Wally's (3.7), less one unit of forgiveness. */
  contactRadiusX: 9.5,
  contactRadiusY: 12,
  sparkHitRadiusX: 8,
  sparkHitRadiusY: 10,
  edgeSafetyX: 40,
  /**
   * A Ghost that lands a hit is flung away from Wally and cannot touch him
   * again until the recoil ends, so one touch costs one heart instead of
   * chaining through every invulnerability window.
   */
  recoilMs: 1_200,
  recoilPushDistance: 28,
  recoilPushMs: 200,
  /** Recoil may carry a Ghost just past the stage edge (the save accepts -16..144). */
  recoilMinX: -12,
  recoilMaxX: 140,
  /**
   * The run's first Ghost is a lesson: it closes to this distance and hovers
   * there until Wally fires his first Dream Spark (it still hurts if he walks
   * into it). It only hovers on stage, so a recoil past the edge cannot park
   * it out of sight and out of reach. Derived from the Ghost id and the
   * projectile sequence, so it needs no stored flag.
   */
  firstGhostHoverDistance: 24,
} as const;

const LEFT_SPAWN_X = 6;
const RIGHT_SPAWN_X = 122;
const GHOST_BASE_Y = 82;

export function isGhostRecoiling(ghost: HauntedGhostState, nowMs: number): boolean {
  return ghost.phase === 'active' && nowMs < ghost.phaseUntilMs;
}

export function resolveGhostPhase(ghost: HauntedGhostState, nowMs: number): ResolvedGhostPhase {
  return isGhostRecoiling(ghost, nowMs) ? 'recoil' : ghost.phase;
}

/** The run's first Ghost waits for Wally's first Dream Spark before it closes in. */
export function isGhostWaitingForFirstSpark(ghost: HauntedGhostState, combat: HauntedCombatState): boolean {
  return ghost.id === 1 && combat.nextProjectileId <= 1;
}

/** A Ghost that can hurt Wally on contact right now. */
export function isGhostDangerous(ghost: HauntedGhostState, nowMs: number): boolean {
  return ghost.phase === 'active' && !isGhostRecoiling(ghost, nowMs);
}

export function createHauntedThreatState(): HauntedThreatState {
  return { ghosts: [], nextEnemyId: 1, nextSpawnAtMs: GHOST_RULES.graceMs };
}

export function queueGhostTelegraphAt(
  threats: HauntedThreatState,
  nowMs: number,
  x: number,
): { threats: HauntedThreatState; event?: HauntedThreatEvent } {
  const present = threats.ghosts.filter((ghost) => ghost.phase !== 'dying').length;
  if (present >= GHOST_RULES.maxActive) return { threats };
  const ghostId = threats.nextEnemyId;
  const ghost: HauntedGhostState = {
    id: ghostId,
    x: clamp(x, LEFT_SPAWN_X, RIGHT_SPAWN_X),
    y: GHOST_BASE_Y,
    phase: 'telegraph',
    phaseUntilMs: nowMs + GHOST_RULES.telegraphMs,
  };
  return {
    threats: {
      ...threats,
      ghosts: [...threats.ghosts, ghost],
      nextEnemyId: ghostId + 1,
    },
    event: { type: 'GHOST_TELEGRAPHED', ghostId },
  };
}

export type StepHauntedThreatsResult = {
  threats: HauntedThreatState;
  combat: HauntedCombatState;
  rngState: number;
  playerHitDirection: -1 | 0 | 1;
  events: HauntedThreatEvent[];
};

export function stepHauntedThreats(
  threats: HauntedThreatState,
  combat: HauntedCombatState,
  player: HauntedPlayerPhysicsState,
  nowMs: number,
  deltaSeconds: number,
  noise: number,
  rngState: number,
): StepHauntedThreatsResult {
  const events: HauntedThreatEvent[] = [];
  const dt = Math.max(0, deltaSeconds);
  let nextRngState = rngState;
  let nextEnemyId = threats.nextEnemyId;
  let nextSpawnAtMs = threats.nextSpawnAtMs;
  let projectiles = combat.projectiles;
  let playerHitDirection: -1 | 0 | 1 = 0;

  let ghosts = threats.ghosts
    .filter((ghost) => ghost.phase !== 'dying' || nowMs < ghost.phaseUntilMs)
    .map((ghost) => {
      if (ghost.phase === 'telegraph' && nowMs >= ghost.phaseUntilMs) {
        events.push({ type: 'GHOST_SPAWNED', ghostId: ghost.id });
        return { ...ghost, phase: 'active' as const, phaseUntilMs: 0 };
      }
      if (ghost.phase !== 'active') return ghost;

      const targetY = player.y - 20 + Math.sin((nowMs + ghost.id * 137) / 240) * 3;
      const y = approach(ghost.y, targetY, GHOST_RULES.speed * 0.65 * dt);
      if (isGhostRecoiling(ghost, nowMs)) {
        return { ...ghost, x: recoilX(ghost, player.x, nowMs, dt * 1000), y };
      }

      const direction = Math.sign(player.x - ghost.x);
      const reach = isGhostWaitingForFirstSpark(ghost, combat) && isOnStage(ghost.x)
        ? clamp(Math.abs(player.x - ghost.x) - GHOST_RULES.firstGhostHoverDistance, 0, GHOST_RULES.speed * dt)
        : GHOST_RULES.speed * dt;
      const x = ghost.x + direction * reach;
      return { ...ghost, x, y, phaseUntilMs: 0 };
    });

  // Dream Spark resolves before contact damage so a well-timed shot can save Wally.
  // Telegraphing Ghosts are deliberately vulnerable: the warning is also the
  // player's reaction window, not an unexplained invulnerable state.
  const consumedProjectileIds = new Set<number>();
  ghosts = ghosts.map((ghost) => {
    if (ghost.phase !== 'active' && ghost.phase !== 'telegraph') return ghost;
    const projectile = projectiles.find((spark) =>
      !consumedProjectileIds.has(spark.id) &&
      Math.abs(spark.x - ghost.x) <= GHOST_RULES.sparkHitRadiusX &&
      Math.abs(spark.y - ghost.y) <= GHOST_RULES.sparkHitRadiusY,
    );
    if (!projectile) return ghost;
    consumedProjectileIds.add(projectile.id);
    events.push({ type: 'GHOST_DEFEATED', ghostId: ghost.id });
    return { ...ghost, phase: 'dying' as const, phaseUntilMs: nowMs + GHOST_RULES.dyingMs };
  });
  if (consumedProjectileIds.size > 0) {
    projectiles = projectiles.filter((projectile) => !consumedProjectileIds.has(projectile.id));
  }

  // Contact only resolves outside invulnerability, exactly when the session
  // accepts the hit (applyHauntedPlayerHit), so every Ghost touching Wally then
  // recoils: the hit clears them off him instead of letting them sit on him.
  if (nowMs >= combat.invulnerableUntilMs) {
    const touching = (ghost: HauntedGhostState) =>
      isGhostDangerous(ghost, nowMs) &&
      Math.abs(ghost.x - player.x) <= GHOST_RULES.contactRadiusX &&
      Math.abs(ghost.y - (player.y - 18)) <= GHOST_RULES.contactRadiusY;
    const contact = ghosts.find(touching);
    if (contact) {
      playerHitDirection = contact.x < player.x ? 1 : -1;
      events.push({ type: 'PLAYER_HIT_BY_GHOST', ghostId: contact.id });
      ghosts = ghosts.map((ghost) => (touching(ghost) ? { ...ghost, phaseUntilMs: nowMs + GHOST_RULES.recoilMs } : ghost));
    }
  }

  const present = ghosts.filter((ghost) => ghost.phase !== 'dying').length;
  if (nowMs >= nextSpawnAtMs && present < GHOST_RULES.maxActive) {
    const random = nextSeededRandom(nextRngState);
    nextRngState = random.state;
    const spawnOnLeft = chooseSpawnOnLeft(player.x, random.value);
    const queued = queueGhostTelegraphAt(
      { ghosts, nextEnemyId, nextSpawnAtMs },
      nowMs,
      spawnOnLeft ? LEFT_SPAWN_X : RIGHT_SPAWN_X,
    );
    ghosts = queued.threats.ghosts;
    nextEnemyId = queued.threats.nextEnemyId;
    if (queued.event) events.push(queued.event);
    nextSpawnAtMs = nowMs + spawnIntervalMs(noise);
  }

  return {
    threats: { ghosts, nextEnemyId, nextSpawnAtMs },
    combat: projectiles === combat.projectiles ? combat : { ...combat, projectiles },
    rngState: nextRngState,
    playerHitDirection,
    events,
  };
}

/**
 * Recoil pushes the Ghost straight away from Wally for the first
 * `recoilPushMs`, then it hovers in place until the recoil ends. The push is
 * integrated over the part of this step inside the push window, so the total
 * is `recoilPushDistance` whatever the step size.
 */
function recoilX(ghost: HauntedGhostState, playerX: number, nowMs: number, dtMs: number): number {
  const startedAtMs = ghost.phaseUntilMs - GHOST_RULES.recoilMs;
  const pushedBy = (atMs: number) => clamp(atMs - startedAtMs, 0, GHOST_RULES.recoilPushMs);
  const pushedMs = pushedBy(nowMs) - pushedBy(nowMs - dtMs);
  if (pushedMs <= 0) return ghost.x;
  const away = ghost.x >= playerX ? 1 : -1;
  const distance = (GHOST_RULES.recoilPushDistance * pushedMs) / GHOST_RULES.recoilPushMs;
  return clamp(ghost.x + away * distance, GHOST_RULES.recoilMinX, GHOST_RULES.recoilMaxX);
}

function isOnStage(x: number): boolean {
  return x >= LEFT_SPAWN_X && x <= RIGHT_SPAWN_X;
}

function chooseSpawnOnLeft(playerX: number, randomValue: number): boolean {
  if (playerX <= GHOST_RULES.edgeSafetyX) return false;
  if (playerX >= 128 - GHOST_RULES.edgeSafetyX) return true;
  return randomValue < 0.5;
}

function spawnIntervalMs(noise: number): number {
  return Math.max(2_600, 6_400 - Math.max(0, Math.min(100, noise)) * 34);
}

function approach(value: number, target: number, amount: number): number {
  if (value < target) return Math.min(value + amount, target);
  if (value > target) return Math.max(value - amount, target);
  return value;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
