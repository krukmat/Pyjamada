import type { HauntedCombatState } from '../haunted/HauntedCombat';
import { difficultyProfile, reactionWindowMs } from './AdventureDifficulty';
import { getRoomState, type AdventureState } from './AdventureState';

/**
 * The altered Bedroom after the false escape: reapers keep coming, like the
 * ghosts of the first night, until Wally leaves through the Hallway door.
 *
 * Each cycle one reaper rises at the wall farther from Wally, glides toward
 * him, raises its scythe (the warning), sweeps it along the floor (jump it)
 * and stands spent for a moment: a Dream Spark then dispels it. Sparks at any
 * other time pass through its smoke. The next reaper follows whatever happens;
 * there is no last one.
 *
 * The cycle is derived from the room clock; only the reaper's position, which
 * follows Wally, and whether it was dispelled are carried between steps.
 */
export const BEDROOM_REAPER = {
  gapMs: 900,
  riseMs: 500,
  glideMs: 1_400,
  telegraphMs: 900,
  sweepMs: 300,
  recoveryMs: 800,
  fadeMs: 400,
  /** Glide speed toward Wally, stage units per second, scaled by the level's hunt. */
  glideSpeed: 45,
  /** The reaper stops gliding this close to Wally. */
  stopDistance: 6,
  /** The sweep reaches this far to either side of the reaper, along the floor. */
  reach: 14,
  sparkHitRadius: 9,
  leftSpawnX: 12,
  rightSpawnX: 116,
} as const;

export type BedroomReaperPhase = 'gap' | 'rise' | 'glide' | 'telegraph' | 'sweep' | 'recovery' | 'fade';

/** Carried in the session's threats between steps; transient, never needed to resume a save. */
export type BedroomReaperState = { cycle: number; x: number; dispelled: boolean };

export type BedroomReaperSnapshot = {
  phase: BedroomReaperPhase;
  x: number;
  /** 0..1 through the current phase. */
  progress: number;
  dispelled: boolean;
  /** The sweep is on the floor right now. */
  dangerous: boolean;
  vulnerable: boolean;
  /** Faces Wally: +1 right, -1 left. */
  facing: 1 | -1;
};

export type BedroomReaperEvent = { type: 'BEDROOM_REAPER_DISPELLED' };

export function isBedroomReaperLive(adventure: AdventureState): boolean {
  return adventure.currentRoom === 'bedroom' && getRoomState(adventure, 'bedroom').interactions.includes('false-escape');
}

function phases(adventure: AdventureState): [BedroomReaperPhase, number][] {
  const r = BEDROOM_REAPER;
  return [
    ['gap', r.gapMs],
    ['rise', r.riseMs],
    ['glide', r.glideMs],
    ['telegraph', reactionWindowMs(r.telegraphMs, difficultyProfile(adventure))],
    ['sweep', r.sweepMs],
    ['recovery', r.recoveryMs],
    ['fade', r.fadeMs],
  ];
}

export function bedroomReaperCycleMs(adventure: AdventureState): number {
  return phases(adventure).reduce((total, [, ms]) => total + ms, 0);
}

function phaseAt(adventure: AdventureState, elapsedMs: number): { cycle: number; phase: BedroomReaperPhase; progress: number } {
  const cycleMs = bedroomReaperCycleMs(adventure);
  const clock = Math.max(0, elapsedMs);
  const cycle = Math.floor(clock / cycleMs);
  let t = clock - cycle * cycleMs;
  for (const [phase, ms] of phases(adventure)) {
    if (t < ms) return { cycle, phase, progress: t / ms };
    t -= ms;
  }
  return { cycle, phase: 'fade', progress: 1 };
}

/** Which reaper of the endless line is out at elapsedMs (0 for the first). */
export function bedroomReaperCycle(adventure: AdventureState, elapsedMs: number): number {
  return phaseAt(adventure, elapsedMs).cycle;
}

/** The reaper after dtMs more of the room clock; undefined outside the altered Bedroom. */
export function stepBedroomReaper(
  adventure: AdventureState,
  elapsedMs: number,
  playerX: number,
  previous: BedroomReaperState | undefined,
  dtMs: number,
): BedroomReaperState | undefined {
  if (!isBedroomReaperLive(adventure)) return undefined;
  const { cycle, phase } = phaseAt(adventure, elapsedMs);
  if (!previous || previous.cycle !== cycle) {
    // A new reaper rises at the wall farther from Wally.
    const x = playerX < (BEDROOM_REAPER.leftSpawnX + BEDROOM_REAPER.rightSpawnX) / 2 ? BEDROOM_REAPER.rightSpawnX : BEDROOM_REAPER.leftSpawnX;
    return { cycle, x, dispelled: false };
  }
  if (phase !== 'glide' || previous.dispelled) return previous;
  const gap = playerX - previous.x;
  if (Math.abs(gap) <= BEDROOM_REAPER.stopDistance) return previous;
  const step = Math.min(Math.abs(gap) - BEDROOM_REAPER.stopDistance, (BEDROOM_REAPER.glideSpeed * difficultyProfile(adventure).hunt * dtMs) / 1000);
  return { ...previous, x: previous.x + Math.sign(gap) * step };
}

export function resolveBedroomReaper(
  adventure: AdventureState,
  elapsedMs: number,
  state: BedroomReaperState | undefined,
  playerX: number,
): BedroomReaperSnapshot | undefined {
  if (!isBedroomReaperLive(adventure) || !state) return undefined;
  const { cycle, phase, progress } = phaseAt(adventure, elapsedMs);
  if (cycle !== state.cycle) return undefined;
  const alive = !state.dispelled;
  return {
    phase,
    x: state.x,
    progress,
    dispelled: state.dispelled,
    dangerous: alive && phase === 'sweep',
    vulnerable: alive && phase === 'recovery',
    facing: playerX >= state.x ? 1 : -1,
  };
}

/** Whether a reaper is on screen: hidden between reapers and once its dispel fade is over. */
export function isBedroomReaperVisible(reaper: BedroomReaperSnapshot | undefined): reaper is BedroomReaperSnapshot {
  return reaper !== undefined && reaper.phase !== 'gap' && !(reaper.dispelled && reaper.phase === 'fade');
}

export function isPlayerHitByBedroomReaper(player: { x: number; grounded: boolean }, reaper: BedroomReaperSnapshot | undefined): boolean {
  return Boolean(reaper?.dangerous && player.grounded && Math.abs(player.x - reaper.x) <= BEDROOM_REAPER.reach);
}

/** A spark that reaches a spent reaper dispels it; other sparks pass through. */
export function resolveBedroomReaperSparks(
  combat: HauntedCombatState,
  reaper: BedroomReaperSnapshot | undefined,
  state: BedroomReaperState | undefined,
): { combat: HauntedCombatState; state: BedroomReaperState | undefined; events: BedroomReaperEvent[] } {
  if (!reaper?.vulnerable || !state || combat.projectiles.length === 0) return { combat, state, events: [] };
  const hit = combat.projectiles.find(projectile => Math.abs(projectile.x - reaper.x) <= BEDROOM_REAPER.sparkHitRadius);
  if (!hit) return { combat, state, events: [] };
  return {
    combat: { ...combat, projectiles: combat.projectiles.filter(projectile => projectile !== hit) },
    state: { ...state, dispelled: true },
    events: [{ type: 'BEDROOM_REAPER_DISPELLED' }],
  };
}
