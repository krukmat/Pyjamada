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
};

export const DIFFICULTY_PROFILES: Readonly<Record<AdventureDifficulty, DifficultyProfile>> = {
  1: { name: 'RESTLESS', reactMs: Infinity, hunt: 1, rush: 1 },
  2: { name: 'HAUNTED', reactMs: 420, hunt: 1.2, rush: 1.15 },
  3: { name: 'NIGHT TERROR', reactMs: 300, hunt: 1.4, rush: 1.4 },
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
