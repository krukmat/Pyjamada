import type { AdventureState } from './AdventureState';

/**
 * Three difficulty levels share one pattern: every room keeps the same threats,
 * telegraphs and bosses, and the level only raises the floor. Level 1 is the
 * base pattern; higher levels warn later (every telegraph that gives Wally
 * time to react is cut to at most reactMs) and hunt harder (hunt scales how far
 * bosses and stalkers bend toward him). The level is chosen at NEW GAME and saved with the
 * run; saves without one are level 1.
 */
export type AdventureDifficulty = 1 | 2 | 3;
export const ADVENTURE_DIFFICULTIES: readonly AdventureDifficulty[] = [1, 2, 3];

export type DifficultyProfile = {
  name: string;
  /** Longest reaction window (telegraph, shadow, warning) the level allows, in ms. */
  reactMs: number;
  /** Multiplier on how far threats bend toward Wally. */
  hunt: number;
  /** Multiplier on how fast charging threats cross the room. */
  rush: number;
  /** How fast (units/s) the Roach crawls toward Wally while it waits; well below his running speed (36). */
  crawlSpeed: number;
  /**
   * Flying bosses pick their target when an attack starts (where Wally stands
   * then) instead of following him: a quick step aside dodges them.
   */
  lockAim: boolean;
  /** Knock-outs the run survives before the house wins; undefined is unlimited. */
  lives?: number;
  /** Vesper's nightmare changes the order of its three attacks every cycle, so its rhythm cannot be learned. */
  vesperShuffle: boolean;
};

export const DIFFICULTY_PROFILES: Readonly<Record<AdventureDifficulty, DifficultyProfile>> = {
  1: { name: 'RESTLESS', reactMs: Infinity, hunt: 1, rush: 1, crawlSpeed: 8, lockAim: false, vesperShuffle: false },
  2: { name: 'HAUNTED', reactMs: 420, hunt: 1.2, rush: 1.15, crawlSpeed: 12, lockAim: false, vesperShuffle: false },
  3: { name: 'NIGHT TERROR', reactMs: 300, hunt: 1.4, rush: 1.4, crawlSpeed: 16, lockAim: true, lives: 3, vesperShuffle: true },
};

export function isAdventureDifficulty(value: unknown): value is AdventureDifficulty {
  return value === 1 || value === 2 || value === 3;
}

export function getAdventureDifficulty(adventure: AdventureState): AdventureDifficulty {
  return adventure.difficulty ?? 1;
}

export function difficultyProfile(adventure: AdventureState): DifficultyProfile {
  return DIFFICULTY_PROFILES[getAdventureDifficulty(adventure)];
}

/** A reaction window of baseMs, cut to the level's longest one. */
export function reactionWindowMs(baseMs: number, level: DifficultyProfile): number {
  return Math.min(baseMs, level.reactMs);
}

/**
 * Whether Wally wakes from this knock-out (at the room door or the Laboratory
 * checkpoint). On a level with lives, the last one ends the run.
 */
export function wakesFromKnockout(adventure: AdventureState): boolean {
  const { lives } = difficultyProfile(adventure);
  return lives === undefined || (adventure.knockouts ?? 0) + 1 < lives;
}

/** Knock-outs left before the one that ends the run; undefined when unlimited. */
export function livesLeft(adventure: AdventureState): number | undefined {
  const { lives } = difficultyProfile(adventure);
  return lives === undefined ? undefined : Math.max(0, lives - 1 - (adventure.knockouts ?? 0));
}
