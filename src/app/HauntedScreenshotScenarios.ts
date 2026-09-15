import { PLAYER_GROUND_Y } from '../game/core/World';
import { createHauntedSession, type HauntedSessionState } from '../game/haunted/HauntedSessionRuntime';
import type { HauntedGhostState } from '../game/haunted/HauntedThreats';

export const HAUNTED_SCREENSHOT_SCENARIOS = [
  'sleepy',
  'wake',
  'ghost-telegraph',
  'ghost-active',
  'jump',
  'attack',
  'ghost-defeated',
  'hit',
  'dressed',
  'escape-ready',
  'success',
  'haunted-fail',
] as const;

export type HauntedScreenshotScenario = (typeof HAUNTED_SCREENSHOT_SCENARIOS)[number];

const FROZEN_SPAWN_MS = 999_999;

export function createHauntedScreenshotScenario(scenario: HauntedScreenshotScenario): HauntedSessionState {
  const base = awakeBase(scenario);

  switch (scenario) {
    case 'sleepy':
      return {
        ...createHauntedSession('screenshot-sleepy'),
        threats: { ...createHauntedSession('screenshot-sleepy').threats, nextSpawnAtMs: FROZEN_SPAWN_MS },
      };

    case 'wake':
      return withPlayer({
        ...base,
        domestic: {
          ...base.domestic,
          energy: 65,
          objectStates: { ...base.domestic.objectStates, bed: 'used' },
          interactionCounts: { ...base.domestic.interactionCounts, bed: 1 },
        },
      }, 20);

    case 'ghost-telegraph':
      return {
        ...withPlayer(base, 42),
        elapsedMs: 9_000,
        threats: withGhost(base, ghost(1, 108, 82, 'telegraph', 9_400)),
      };

    case 'ghost-active':
      return {
        ...withPlayer(base, 46),
        elapsedMs: 11_000,
        threats: withGhost(base, ghost(1, 82, 80, 'active')),
      };

    case 'jump': {
      const next = withPlayer(base, 52);
      return {
        ...next,
        elapsedMs: 12_000,
        player: { ...next.player, y: 76, vy: -18, grounded: false },
        threats: withGhost(base, ghost(1, 96, 78, 'active')),
      };
    }

    case 'attack': {
      const next = withPlayer(base, 50);
      return {
        ...next,
        elapsedMs: 13_000,
        combat: {
          ...next.combat,
          nextAttackAllowedMs: 13_325,
          nextProjectileId: 2,
          projectiles: [{ id: 1, x: 62, y: PLAYER_GROUND_Y - 18, vx: 76, damage: 1 }],
        },
        threats: withGhost(base, ghost(1, 88, 80, 'active')),
      };
    }

    case 'ghost-defeated':
      return {
        ...withPlayer(base, 58),
        elapsedMs: 14_000,
        // Freeze halfway through the 220 ms defeat window so the screenshot
        // captures fragmentation rather than a transient first/last atlas frame.
        threats: withGhost(base, ghost(1, 78, 80, 'dying', 14_110)),
      };

    case 'hit': {
      const next = withPlayer(base, 62);
      return {
        ...next,
        elapsedMs: 15_000,
        // Capture a true post-contact frame: Wally has separated from the
        // Ghost and is still travelling through knockback/invulnerability.
        player: { ...next.player, x: 62, y: 92, vx: -24, vy: -18, grounded: false },
        domestic: { ...next.domestic, player: { ...next.domestic.player, x: 62, facing: 'right' } },
        combat: { ...next.combat, hp: 2, invulnerableUntilMs: 15_700 },
        threats: withGhost(base, ghost(1, 82, 82, 'active')),
      };
    }

    case 'dressed': {
      const next = withPlayer(base, 70);
      return {
        ...next,
        elapsedMs: 20_000,
        domestic: {
          ...next.domestic,
          flags: { ...next.domestic.flags, dressed: true },
          objectStates: { ...next.domestic.objectStates, wardrobe: 'used' },
          interactionCounts: { ...next.domestic.interactionCounts, wardrobe: 1 },
        },
        threats: withGhost(base, ghost(1, 99, 79, 'active')),
      };
    }

    case 'escape-ready': {
      const next = withPlayer(base, 91);
      return {
        ...next,
        elapsedMs: 28_000,
        domestic: preparedDomestic(next),
        objective: { phase: 'escape-ready' },
        threats: withGhost(base, ghost(1, 108, 82, 'telegraph', 28_420)),
      };
    }

    case 'success': {
      const next = withPlayer(base, 114);
      return {
        ...next,
        elapsedMs: 31_000,
        domestic: preparedDomestic(next),
        objective: { phase: 'completed' },
        threats: { ...next.threats, ghosts: [], nextSpawnAtMs: FROZEN_SPAWN_MS },
      };
    }

    case 'haunted-fail': {
      const next = withPlayer(base, 76);
      return {
        ...next,
        elapsedMs: 34_000,
        combat: { ...next.combat, hp: 0 },
        objective: { phase: 'failed', reason: 'haunted' },
        threats: withGhost(base, ghost(1, 80, 82, 'active')),
      };
    }
  }
}

function awakeBase(scenario: HauntedScreenshotScenario): HauntedSessionState {
  const base = createHauntedSession(`screenshot-${scenario}`);
  return {
    ...base,
    domestic: {
      ...base.domestic,
      wallyState: 'normal',
      energy: 62,
      objectStates: { ...base.domestic.objectStates, bed: 'used' },
      interactionCounts: { ...base.domestic.interactionCounts, bed: 1 },
    },
    threats: { ...base.threats, nextSpawnAtMs: FROZEN_SPAWN_MS },
  };
}

function withPlayer(session: HauntedSessionState, x: number): HauntedSessionState {
  return {
    ...session,
    player: { ...session.player, x, y: PLAYER_GROUND_Y, vx: 0, vy: 0, grounded: true, facing: 'right' },
    domestic: { ...session.domestic, player: { ...session.domestic.player, x: Math.round(x), facing: 'right' } },
  };
}

function withGhost(session: HauntedSessionState, item: HauntedGhostState): HauntedSessionState['threats'] {
  return { ...session.threats, ghosts: [item], nextEnemyId: 2, nextSpawnAtMs: FROZEN_SPAWN_MS };
}

function ghost(id: number, x: number, y: number, phase: HauntedGhostState['phase'], phaseUntilMs = 0): HauntedGhostState {
  return { id, x, y, phase, phaseUntilMs };
}

function preparedDomestic(session: HauntedSessionState): HauntedSessionState['domestic'] {
  return {
    ...session.domestic,
    flags: { ...session.domestic.flags, dressed: true },
    collected: ['keys'],
    objectStates: { ...session.domestic.objectStates, wardrobe: 'used', keys: 'collected' },
    interactionCounts: { ...session.domestic.interactionCounts, wardrobe: 1, keys: 1 },
  };
}
