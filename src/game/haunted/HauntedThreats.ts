import type { HauntedCombatState } from './HauntedCombat';
import type { HauntedPlayerPhysicsState } from './PlayerPhysics';
import { nextSeededRandom } from './SeededRng';

export type GhostPhase = 'telegraph' | 'active' | 'dying';

export type HauntedGhostState = {
  id: number;
  x: number;
  y: number;
  phase: GhostPhase;
  phaseUntilMs: number;
};

export type HauntedThreatState = {
  ghosts: HauntedGhostState[];
  nextEnemyId: number;
  nextSpawnAtMs: number;
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
  contactRadiusX: 7,
  contactRadiusY: 12,
  sparkHitRadiusX: 8,
  sparkHitRadiusY: 10,
  edgeSafetyX: 40,
} as const;

const LEFT_SPAWN_X = 6;
const RIGHT_SPAWN_X = 122;
const GHOST_BASE_Y = 82;

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

      const direction = Math.sign(player.x - ghost.x);
      const x = ghost.x + direction * GHOST_RULES.speed * dt;
      const targetY = player.y - 20 + Math.sin((nowMs + ghost.id * 137) / 240) * 3;
      const y = approach(ghost.y, targetY, GHOST_RULES.speed * 0.65 * dt);
      return { ...ghost, x, y };
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

  if (nowMs >= combat.invulnerableUntilMs) {
    const contact = ghosts.find((ghost) =>
      ghost.phase === 'active' &&
      Math.abs(ghost.x - player.x) <= GHOST_RULES.contactRadiusX &&
      Math.abs(ghost.y - (player.y - 18)) <= GHOST_RULES.contactRadiusY,
    );
    if (contact) {
      playerHitDirection = contact.x < player.x ? 1 : -1;
      events.push({ type: 'PLAYER_HIT_BY_GHOST', ghostId: contact.id });
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
