import type { HauntedPlayerPhysicsState } from './PlayerPhysics';

export type DreamSparkProjectile = {
  id: number;
  x: number;
  y: number;
  vx: number;
  damage: 1;
};

export type HauntedCombatState = {
  hp: number;
  maxHp: number;
  invulnerableUntilMs: number;
  nextAttackAllowedMs: number;
  nextProjectileId: number;
  projectiles: DreamSparkProjectile[];
};

export const DREAM_SPARK = {
  cooldownMs: 325,
  maxProjectiles: 2,
  speed: 76,
  noisePerShot: 1,
  spawnOffsetX: 8,
  spawnOffsetY: -18,
} as const;

const PROJECTILE_MIN_X = -4;
const PROJECTILE_MAX_X = 132;

export function createHauntedCombatState(): HauntedCombatState {
  return {
    hp: 3,
    maxHp: 3,
    invulnerableUntilMs: 0,
    nextAttackAllowedMs: 0,
    nextProjectileId: 1,
    projectiles: [],
  };
}

export function tryFireDreamSpark(
  combat: HauntedCombatState,
  player: HauntedPlayerPhysicsState,
  nowMs: number,
): { combat: HauntedCombatState; projectile?: DreamSparkProjectile } {
  if (nowMs < combat.nextAttackAllowedMs) return { combat };
  if (combat.projectiles.length >= DREAM_SPARK.maxProjectiles) return { combat };

  const direction = player.facing === 'left' ? -1 : 1;
  const projectile: DreamSparkProjectile = {
    id: combat.nextProjectileId,
    x: player.x + DREAM_SPARK.spawnOffsetX * direction,
    y: player.y + DREAM_SPARK.spawnOffsetY,
    vx: DREAM_SPARK.speed * direction,
    damage: 1,
  };
  return {
    projectile,
    combat: {
      ...combat,
      nextProjectileId: combat.nextProjectileId + 1,
      nextAttackAllowedMs: nowMs + DREAM_SPARK.cooldownMs,
      projectiles: [...combat.projectiles, projectile],
    },
  };
}

export function stepDreamSparks(combat: HauntedCombatState, deltaSeconds: number): HauntedCombatState {
  if (combat.projectiles.length === 0) return combat;
  const dt = Math.max(0, deltaSeconds);
  const projectiles = combat.projectiles
    .map((projectile) => ({ ...projectile, x: projectile.x + projectile.vx * dt }))
    .filter((projectile) => projectile.x >= PROJECTILE_MIN_X && projectile.x <= PROJECTILE_MAX_X);
  return projectiles.length === combat.projectiles.length && projectiles.every((item, index) => item.x === combat.projectiles[index]?.x)
    ? combat
    : { ...combat, projectiles };
}
