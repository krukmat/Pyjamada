import type { HauntedSessionState } from '../haunted/HauntedSessionRuntime';

export type HauntedWallyPose = 'idle' | 'walk' | 'jump' | 'attack' | 'hit' | 'interact' | 'sleepy' | 'startled' | 'success' | 'fail';

export function selectHauntedWallyPose(
  session: HauntedSessionState,
  options: { honorTerminalObjective?: boolean } = {},
): HauntedWallyPose {
  const honorTerminalObjective = options.honorTerminalObjective ?? true;
  if (honorTerminalObjective && session.objective.phase === 'completed') return 'success';
  if (honorTerminalObjective && session.objective.phase === 'failed') return 'fail';
  if (session.combat.invulnerableUntilMs > session.elapsedMs) return 'hit';
  if (session.combat.projectiles.some((projectile) => Math.abs(projectile.x - session.player.x) <= 22)) return 'attack';
  if (!session.player.grounded) return 'jump';
  if (session.input.interactPressed) return 'interact';
  if (session.domestic.wallyState === 'sleepy') return 'sleepy';
  if (session.domestic.wallyState === 'startled') return 'startled';
  if (Math.abs(session.player.vx) > 4) return 'walk';
  return 'idle';
}

export function hauntedWallyFrameIndex(pose: HauntedWallyPose, nowMs: number): number {
  const phase2 = Math.floor(nowMs / 170) % 2;
  const phase4 = Math.floor(nowMs / 95) % 4;
  switch (pose) {
    case 'idle': return phase2;
    case 'walk': return 2 + phase4;
    case 'jump': return 6;
    case 'attack': return 10 + phase4;
    case 'hit': return 17 + phase2;
    case 'interact': return 14;
    case 'sleepy': return 15 + phase2;
    case 'startled': return 17 + phase2;
    case 'success': return 23;
    case 'fail': return 24;
  }
}
