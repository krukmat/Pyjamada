export type EnemyTelegraphStyle = 'materialize' | 'ground-spawn' | 'bone-burst';

export type EnemyVisualProfile = {
  id: 'ghost' | 'goblin' | 'skull';
  telegraphStyle: EnemyTelegraphStyle;
  primaryRgb: string;
  secondaryRgb: string;
  accentRgb: string;
  outlineRgb: string;
  centerYOffset: number;
  presenceGlowRadius: number;
  shadowWidth: number;
  telegraphRadius: number;
  bodyWidth: number;
  bodyHeight: number;
  eyeOffsetX: number;
};

export const GHOST_VISUAL_PROFILE: EnemyVisualProfile = {
  id: 'ghost',
  telegraphStyle: 'materialize',
  primaryRgb: '190,248,255',
  secondaryRgb: '91,218,237',
  accentRgb: '255,232,92',
  outlineRgb: '8,16,38',
  centerYOffset: 18,
  presenceGlowRadius: 13,
  shadowWidth: 18,
  telegraphRadius: 16,
  bodyWidth: 14,
  bodyHeight: 20,
  eyeOffsetX: 3,
};

// Reserved visual contracts for the next two enemy slices. They define the
// readability language before gameplay/art implementation starts, preventing
// each new enemy from inventing a one-off telegraph and contrast treatment.
export const GOBLIN_VISUAL_PROFILE: EnemyVisualProfile = {
  id: 'goblin',
  telegraphStyle: 'ground-spawn',
  primaryRgb: '121,219,83',
  secondaryRgb: '83,154,70',
  accentRgb: '197,115,255',
  outlineRgb: '18,24,38',
  centerYOffset: 13,
  presenceGlowRadius: 11,
  shadowWidth: 20,
  telegraphRadius: 13,
  bodyWidth: 16,
  bodyHeight: 18,
  eyeOffsetX: 3,
};

export const SKULL_VISUAL_PROFILE: EnemyVisualProfile = {
  id: 'skull',
  telegraphStyle: 'bone-burst',
  primaryRgb: '244,236,208',
  secondaryRgb: '189,185,169',
  accentRgb: '255,154,71',
  outlineRgb: '28,22,37',
  centerYOffset: 16,
  presenceGlowRadius: 10,
  shadowWidth: 14,
  telegraphRadius: 14,
  bodyWidth: 13,
  bodyHeight: 15,
  eyeOffsetX: 3,
};

export const HAUNTED_ENEMY_VISUAL_PROFILES = [
  GHOST_VISUAL_PROFILE,
  GOBLIN_VISUAL_PROFILE,
  SKULL_VISUAL_PROFILE,
] as const;

export function rgba(rgb: string, alpha: number): string {
  return `rgba(${rgb},${Math.max(0, Math.min(1, alpha))})`;
}

export function validateEnemyVisualProfile(profile: EnemyVisualProfile): string[] {
  const problems: string[] = [];
  if (!profile.id) problems.push('id is required');
  if (!profile.primaryRgb || !profile.secondaryRgb || !profile.accentRgb || !profile.outlineRgb) {
    problems.push('complete palette is required');
  }
  for (const [key, value] of Object.entries({
    centerYOffset: profile.centerYOffset,
    presenceGlowRadius: profile.presenceGlowRadius,
    shadowWidth: profile.shadowWidth,
    telegraphRadius: profile.telegraphRadius,
    bodyWidth: profile.bodyWidth,
    bodyHeight: profile.bodyHeight,
    eyeOffsetX: profile.eyeOffsetX,
  })) {
    if (!Number.isFinite(value) || value <= 0) problems.push(`${key} must be finite and positive`);
  }
  return problems;
}
