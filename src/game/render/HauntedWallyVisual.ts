import { PLAYER_HIT_RULES } from '../haunted/HauntedCombat';
import type { HauntedSessionState } from '../haunted/HauntedSessionRuntime';

export type HauntedWallyPose = 'idle' | 'guard' | 'walk' | 'advance' | 'jump' | 'attack' | 'hit' | 'interact' | 'sleepy' | 'startled' | 'success' | 'fail';

export function selectHauntedWallyPose(
  session: HauntedSessionState,
  options: { honorTerminalObjective?: boolean; combat?: boolean } = {},
): HauntedWallyPose {
  const honorTerminalObjective = options.honorTerminalObjective ?? true;
  if (honorTerminalObjective && session.objective.phase === 'completed') return 'success';
  if (honorTerminalObjective && session.objective.phase === 'failed') return 'fail';
  if (isHauntedWallyStaggered(session)) return 'hit';
  if (hauntedWallyAttackDistance(session) !== undefined) return 'attack';
  if (!session.player.grounded) return 'jump';
  if (session.input.interactPressed) return 'interact';
  if (session.domestic.wallyState === 'sleepy') return 'sleepy';
  if (session.domestic.wallyState === 'startled') return 'startled';
  if (Math.abs(session.player.vx) > 4) return options.combat ? 'advance' : 'walk';
  return options.combat ? 'guard' : 'idle';
}

// Wally flinches for the first part of the invulnerability window only; the
// rest is shown by the blink, so he can visibly walk and attack again while
// still protected. Derived from the combat timer, never stored.
export const HAUNTED_HIT_POSE_MS = 600;

export function isHauntedWallyStaggered(session: HauntedSessionState): boolean {
  const remainingMs = session.combat.invulnerableUntilMs - session.elapsedMs;
  return remainingMs > 0 && remainingMs > PLAYER_HIT_RULES.invulnerabilityMs - HAUNTED_HIT_POSE_MS;
}

// The punch is timed from the newest Dream Spark: it spawns 8 units ahead of
// Wally and flies at 76 units/s, so its distance tells how long ago he struck.
// Each phase spans at least one ~80ms render tick.
const ATTACK_POSE_MAX_DISTANCE = 28;

export function hauntedWallyAttackDistance(session: HauntedSessionState): number | undefined {
  const distances = session.combat.projectiles
    .map((projectile) => Math.abs(projectile.x - session.player.x))
    .filter((distance) => distance <= ATTACK_POSE_MAX_DISTANCE);
  return distances.length > 0 ? Math.min(...distances) : undefined;
}

export function hauntedWallyFrameIndex(pose: HauntedWallyPose, nowMs: number, attackDistance?: number): number {
  const phase2 = Math.floor(nowMs / 170) % 2;
  const phase4 = Math.floor(nowMs / 95) % 4;
  switch (pose) {
    case 'idle': return phase2;
    case 'guard': return 19 + phase2;
    case 'advance': return 21 + (Math.floor(nowMs / 120) % 2);
    case 'walk': return 2 + phase4;
    case 'jump': return 6;
    case 'attack':
      if (attackDistance === undefined) return 10 + phase4;
      if (attackDistance < 14) return 11;
      return attackDistance < 21 ? 12 : 13;
    case 'hit': return 17 + phase2;
    case 'interact': return 14;
    case 'sleepy': return 15 + phase2;
    case 'startled': return 17 + phase2;
    case 'success': return 23;
    case 'fail': return 24;
  }
}
