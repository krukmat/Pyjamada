export const HAUNTED_STAGE_TOKENS = {
  atmosphere: {
    washRgb: '15,27,69',
    washAlphaCalm: 0.135,
    washAlphaPressure: 0.19,
    edgeLeftRgb: '12,18,45',
    edgeRightRgb: '18,18,50',
    edgeAlphaCalm: 0.09,
    edgeAlphaPressure: 0.13,
    floorShade: 'rgba(9,15,39,0.14)',
    coldWindowGlow: 'rgba(91,238,255,0.075)',
    coldWindowInnerGlow: 'rgba(155,222,255,0.040)',
    exitLaneGlow: 'rgba(91,238,255,0.075)',
    pixelTextureRgb: '173,220,238',
    pixelTextureAlpha: 0.032,
  },
  player: {
    backing: 'rgba(7,16,38,0.18)',
    warmRim: 'rgba(255,228,92,0.035)',
    groundShadow: 'rgba(5,12,29,0.42)',
    groundAccent: 'rgba(91,238,255,0.10)',
  },
  exit: {
    frameReady: '#15365f',
    frameIdle: '#25203d',
    panelReady: '#1f6e8d',
    panelIdle: '#352c4c',
    coreReady: '#5beeff',
    coreIdle: '#493b5c',
    knobReady: '#ffe45c',
    knobIdle: '#776d7c',
  },
  projectile: {
    outerGlow: 'rgba(91,238,255,0.08)',
    glow: 'rgba(255,228,92,0.18)',
    trail: '#84ece3',
    trailAccent: '#f1d75c',
    core: '#fffdf0',
    edge: '#5beeff',
    spark: '#fff4a8',
  },
  hit: {
    backing: 'rgba(5,12,29,0.24)',
    outerGlow: 'rgba(255,123,130,0.10)',
    glow: 'rgba(255,228,92,0.16)',
    core: '#fffdf0',
    horizontalWarm: '#ffe45c',
    horizontalCold: '#5beeff',
    verticalDanger: '#ff7b82',
    verticalWarm: '#fff4b0',
    pushTrail: 'rgba(132,236,227,0.72)',
  },
} as const;

// This is the stable composition contract for Haunted Morning. New enemy
// families may add content inside `enemies`, but they must not reorder the
// scene to win contrast by drawing over the player/projectiles/impact feedback.
export const HAUNTED_LAYER_ORDER = [
  'bedroom',
  'domestic-objects',
  'stage-treatment',
  'player-readability',
  'enemies',
  'player',
  'projectiles',
  'domestic-fx',
  'combat-feedback',
] as const;

export type HauntedLayer = (typeof HAUNTED_LAYER_ORDER)[number];

export const HAUNTED_VISUAL_PRIORITY = {
  environment: 1,
  domesticObjects: 2,
  interactiveFocus: 3,
  enemies: 4,
  player: 5,
  projectile: 6,
  combatFeedback: 7,
} as const;

export const HAUNTED_STAGE_RULES = {
  // Environment treatment stays intentionally restrained so actor palettes
  // remain the dominant saturated elements.
  maxAtmosphereAlpha: 0.20,
  maxPixelTextureAlpha: 0.05,
  playerBackingRadius: 16,
  playerBackingYOffset: 23,
  playerShadowWidth: 18,
  exitLaneStartX: 87,
  exitLaneWidth: 40,
  coldWindowX: 108,
  coldWindowY: 55,
  coldWindowRadius: 33,
  projectileOuterGlowRadius: 6,
  projectileInnerGlowRadius: 4.5,
} as const;

export function hauntedPressureLevel(enemyCount: number): 'calm' | 'pressure' {
  return enemyCount > 0 ? 'pressure' : 'calm';
}

export function hauntedWashAlpha(enemyCount: number): number {
  return hauntedPressureLevel(enemyCount) === 'pressure'
    ? HAUNTED_STAGE_TOKENS.atmosphere.washAlphaPressure
    : HAUNTED_STAGE_TOKENS.atmosphere.washAlphaCalm;
}

export function hauntedEdgeAlpha(enemyCount: number): number {
  return hauntedPressureLevel(enemyCount) === 'pressure'
    ? HAUNTED_STAGE_TOKENS.atmosphere.edgeAlphaPressure
    : HAUNTED_STAGE_TOKENS.atmosphere.edgeAlphaCalm;
}

export function validateHauntedStageLanguage(): string[] {
  const problems: string[] = [];
  const order = HAUNTED_LAYER_ORDER as readonly string[];
  if (new Set(order).size !== order.length) problems.push('layer order must not contain duplicates');

  const requiredOrder: Array<[HauntedLayer, HauntedLayer]> = [
    ['stage-treatment', 'enemies'],
    ['player-readability', 'player'],
    ['enemies', 'player'],
    ['player', 'projectiles'],
    ['projectiles', 'combat-feedback'],
  ];
  for (const [before, after] of requiredOrder) {
    if (order.indexOf(before) >= order.indexOf(after)) {
      problems.push(`${before} must render before ${after}`);
    }
  }

  const atmosphereAlphas = [
    HAUNTED_STAGE_TOKENS.atmosphere.washAlphaCalm,
    HAUNTED_STAGE_TOKENS.atmosphere.washAlphaPressure,
    HAUNTED_STAGE_TOKENS.atmosphere.edgeAlphaCalm,
    HAUNTED_STAGE_TOKENS.atmosphere.edgeAlphaPressure,
  ];
  if (atmosphereAlphas.some((alpha) => alpha < 0 || alpha > HAUNTED_STAGE_RULES.maxAtmosphereAlpha)) {
    problems.push('atmosphere alpha exceeds the actor-readability budget');
  }
  if (
    HAUNTED_STAGE_TOKENS.atmosphere.pixelTextureAlpha < 0 ||
    HAUNTED_STAGE_TOKENS.atmosphere.pixelTextureAlpha > HAUNTED_STAGE_RULES.maxPixelTextureAlpha
  ) {
    problems.push('pixel texture exceeds the background-integration budget');
  }

  const priorities = Object.values(HAUNTED_VISUAL_PRIORITY);
  if (new Set(priorities).size !== priorities.length) problems.push('visual priorities must be unique');
  if (!(HAUNTED_VISUAL_PRIORITY.environment < HAUNTED_VISUAL_PRIORITY.enemies &&
        HAUNTED_VISUAL_PRIORITY.enemies < HAUNTED_VISUAL_PRIORITY.player &&
        HAUNTED_VISUAL_PRIORITY.player < HAUNTED_VISUAL_PRIORITY.projectile &&
        HAUNTED_VISUAL_PRIORITY.projectile < HAUNTED_VISUAL_PRIORITY.combatFeedback)) {
    problems.push('visual priorities must preserve environment < enemy < player < projectile < combat feedback');
  }

  return problems;
}
