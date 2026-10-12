// Shared timing for room threats that send waves along the floor from a fixed
// source (Kitchen surge, Living Room static). Each room keeps its own arming
// rules, safe zones and presentation; this module only resolves the
// deterministic cycle and the hit test.

export type FloorWavePhase = 'inactive' | 'safe' | 'telegraph' | 'wave';

export type FloorWaveConfig = {
  readonly cycleMs: number;
  readonly safeMs: number;
  readonly telegraphMs: number;
  /** Time each wave takes from sourceX to targetX. */
  readonly travelMs: number;
  /** Start offsets of the waves after the telegraph ends. */
  readonly waveOffsetsMs: readonly number[];
  readonly sourceX: number;
  readonly targetX: number;
  readonly halfWidth: number;
};

export type FloorWaveSnapshot = {
  phase: FloorWavePhase;
  dangerous: boolean;
  /** 0..1 through the safe or telegraph phase; 0..1 of the first wave during waves. */
  progress: number;
  /** Stage x of every wave currently on the floor. */
  fronts: number[];
};

export const INACTIVE_FLOOR_WAVE: FloorWaveSnapshot = { phase: 'inactive', dangerous: false, progress: 0, fronts: [] };

export function alignFloorWaveStart(config: FloorWaveConfig, elapsedMs: number): number {
  // Start on a cycle boundary so the first wave is always fully telegraphed.
  return Math.ceil(Math.max(0, elapsedMs) / config.cycleMs) * config.cycleMs;
}

export function resolveFloorWave(config: FloorWaveConfig, elapsedMs: number): FloorWaveSnapshot {
  const t = ((elapsedMs % config.cycleMs) + config.cycleMs) % config.cycleMs;
  if (t < config.safeMs) return { phase: 'safe', dangerous: false, progress: t / config.safeMs, fronts: [] };
  const telegraphEnd = config.safeMs + config.telegraphMs;
  if (t < telegraphEnd) return { phase: 'telegraph', dangerous: false, progress: (t - config.safeMs) / config.telegraphMs, fronts: [] };
  const fronts: number[] = [];
  for (const offset of config.waveOffsetsMs) {
    const waveT = t - telegraphEnd - offset;
    if (waveT < 0 || waveT > config.travelMs) continue;
    fronts.push(config.sourceX + (config.targetX - config.sourceX) * (waveT / config.travelMs));
  }
  const progress = Math.min(1, Math.max(0, (t - telegraphEnd) / config.travelMs));
  return { phase: 'wave', dangerous: fronts.length > 0, progress, fronts };
}

export function isPlayerHitByFloorWave(
  config: FloorWaveConfig,
  player: { x: number; grounded: boolean },
  wave: FloorWaveSnapshot,
): boolean {
  return wave.dangerous && player.grounded && wave.fronts.some(front => Math.abs(player.x - front) <= config.halfWidth);
}
