import type { HumanBotOptions } from './HumanBot';

/**
 * HumanBot skill profiles: reflexes, tapping and reading speed, and how much
 * of the rooms' rhythm the player has learned. They measure the difficulty
 * levels (tests/adventure-difficulty.test.ts) and drive the DEMO.
 */
export type HumanProfileId = 'casual' | 'average' | 'expert';
export const HUMAN_PROFILE_IDS: readonly HumanProfileId[] = ['casual', 'average', 'expert'];
export const DEFAULT_DEMO_PROFILE: HumanProfileId = 'average';

export const HUMAN_PROFILES: Readonly<Record<HumanProfileId, HumanBotOptions>> = {
  casual: { reactionMs: 350, latencyMs: 120, tapIntervalMs: 260, tapJitterMs: 200, readMs: 1_800 },
  average: { anticipateMs: 250 },
  expert: { reactionMs: 170, latencyMs: 70, tapIntervalMs: 140, tapJitterMs: 80, readMs: 800, anticipateMs: 600 },
};
