import { decodeSystemicRun } from '../systemic/SystemicCodec';
import { SYSTEMIC_LIMITS, type SystemicRunState } from '../systemic/SystemicState';
import { createHauntedInputState } from './HauntedInput';
import type { HauntedFailureReason, HauntedObjectivePhase, HauntedSessionState } from './HauntedSessionRuntime';
import { HAUNTED_PLAYER_BOUNDS } from './PlayerPhysics';

export type HauntedSaveState = Omit<HauntedSessionState, 'input'>;
export type DecodeHauntedSessionResult = { status: 'ok'; state: HauntedSessionState } | { status: 'invalid'; reason: string };

const PHASES: readonly HauntedObjectivePhase[] = ['prepare', 'escape-ready', 'exploration', 'completed', 'failed'];
const REASONS: readonly HauntedFailureReason[] = ['house-awake', 'exhausted', 'too-late', 'haunted'];
const GHOST_PHASES = ['telegraph', 'active', 'dying'] as const;

export function encodeHauntedSession(state: HauntedSessionState): string {
  const { input: _input, ...save } = state;
  const validated = validateSave(save);
  if (validated.status === 'invalid') throw new Error(validated.reason);
  return JSON.stringify(save);
}

export function decodeHauntedSession(raw: string): DecodeHauntedSessionResult {
  let value: unknown;
  try { value = JSON.parse(raw); } catch { return invalid('Haunted save is not valid JSON.'); }
  const validated = validateSave(value);
  if (validated.status === 'invalid') return validated;
  return { status: 'ok', state: { ...validated.state, input: createHauntedInputState() } };
}

function validateSave(value: unknown): { status: 'ok'; state: HauntedSaveState } | { status: 'invalid'; reason: string } {
  if (!isRecord(value)) return invalid('Haunted save root must be an object.');
  if (value.schemaVersion !== 2) return invalid('Unsupported haunted save version.');
  if (typeof value.runId !== 'string' || value.runId.length === 0) return invalid('Missing haunted run id.');
  if (!isUint32(value.rngState) || value.rngState === 0) return invalid('Invalid haunted RNG state.');
  if (!isRecord(value.domestic)) return invalid('Missing haunted domestic state.');

  const domestic = value.domestic as unknown as SystemicRunState;
  const domesticError = validateDomestic(domestic);
  if (domesticError) return invalid(domesticError);
  if (domestic.runId !== value.runId) return invalid('Domestic run id mismatch.');

  if (!isRecord(value.player)) return invalid('Invalid haunted player state.');
  if (!finite(value.player.x) || value.player.x < HAUNTED_PLAYER_BOUNDS.minX || value.player.x > HAUNTED_PLAYER_BOUNDS.maxX) return invalid('Invalid haunted player x.');
  if (!finite(value.player.y) || value.player.y < -256 || value.player.y > 104.001) return invalid('Invalid haunted player y.');
  if (!finite(value.player.vx) || !finite(value.player.vy)) return invalid('Invalid haunted player velocity.');
  if (typeof value.player.grounded !== 'boolean') return invalid('Invalid haunted grounded state.');
  if (value.player.facing !== 'left' && value.player.facing !== 'right') return invalid('Invalid haunted facing.');
  if (Math.abs(value.player.x - domestic.player.x) > 1.01) return invalid('Haunted and domestic player positions diverged.');

  if (!nonNegative(value.elapsedMs) || !nonNegative(value.penaltyMs)) return invalid('Invalid haunted clock state.');
  if (!finite(value.deadlineMs) || value.deadlineMs <= 0) return invalid('Invalid haunted deadline.');
  if (!finite(value.movementNoiseCarry) || value.movementNoiseCarry < 0 || value.movementNoiseCarry >= 1.000001) return invalid('Invalid movement-noise carry.');

  if (!isRecord(value.combat)) return invalid('Invalid haunted combat state.');
  if (!positiveInt(value.combat.maxHp) || !Number.isInteger(value.combat.hp) || (value.combat.hp as number) < 0 || (value.combat.hp as number) > value.combat.maxHp) return invalid('Invalid haunted HP state.');
  if (!nonNegative(value.combat.invulnerableUntilMs) || !nonNegative(value.combat.nextAttackAllowedMs)) return invalid('Invalid haunted combat timing.');
  if (!positiveInt(value.combat.nextProjectileId)) return invalid('Invalid haunted projectile id sequence.');
  if (!Array.isArray(value.combat.projectiles) || value.combat.projectiles.length > 2) return invalid('Invalid haunted projectile list.');
  for (const projectile of value.combat.projectiles) {
    if (!isRecord(projectile)) return invalid('Invalid Dream Spark projectile.');
    if (!positiveInt(projectile.id) || !finite(projectile.x) || !finite(projectile.y) || !finite(projectile.vx) || projectile.damage !== 1) return invalid('Invalid Dream Spark projectile.');
  }

  if (!isRecord(value.threats)) return invalid('Invalid haunted threat state.');
  if (!positiveInt(value.threats.nextEnemyId) || !nonNegative(value.threats.nextSpawnAtMs)) return invalid('Invalid haunted threat sequence.');
  if (!Array.isArray(value.threats.ghosts) || value.threats.ghosts.length > 4) return invalid('Invalid haunted Ghost list.');
  const ghostIds = new Set<number>();
  for (const ghost of value.threats.ghosts) {
    if (!isRecord(ghost)) return invalid('Invalid Ghost state.');
    if (!positiveInt(ghost.id) || ghostIds.has(ghost.id)) return invalid('Invalid Ghost id.');
    ghostIds.add(ghost.id);
    if (!finite(ghost.x) || ghost.x < -16 || ghost.x > 144 || !finite(ghost.y) || ghost.y < -64 || ghost.y > 128) return invalid('Invalid Ghost position.');
    if (!GHOST_PHASES.includes(ghost.phase as typeof GHOST_PHASES[number])) return invalid('Invalid Ghost phase.');
    if (!nonNegative(ghost.phaseUntilMs)) return invalid('Invalid Ghost timing.');
  }

  if (!isRecord(value.objective) || !PHASES.includes(value.objective.phase as HauntedObjectivePhase)) return invalid('Invalid haunted objective phase.');
  const phase = value.objective.phase as HauntedObjectivePhase;
  if (phase === 'failed') {
    if (!REASONS.includes(value.objective.reason as HauntedFailureReason)) return invalid('Failed haunted objective requires a valid reason.');
  } else if (value.objective.reason !== undefined) return invalid('Only failed haunted objectives may have a reason.');

  const prepared = domestic.flags.dressed && domestic.collected.includes('keys');
  if ((phase === 'escape-ready' || phase === 'completed' || phase === 'exploration') && !prepared) {
    return invalid('Escape-ready and exploration states require clothes and keys.');
  }
  if (phase === 'prepare' && prepared) return invalid('Prepared state must advance to escape-ready.');

  return { status: 'ok', state: value as unknown as HauntedSaveState };
}

function validateDomestic(state: SystemicRunState): string | null {
  if (!isRecord(state)) return 'Invalid embedded domestic state.';
  const hasKeys = Array.isArray(state.collected) && state.collected.includes('keys');
  let objective: SystemicRunState['objective'];
  if (state.flags?.dressed && hasKeys) objective = { id: 'leave-ready', status: 'completed' };
  else if (state.noise >= SYSTEMIC_LIMITS.noiseFailure) objective = { id: 'leave-ready', status: 'failed', reason: 'house-awake' };
  else if (state.energy <= SYSTEMIC_LIMITS.minEnergy) objective = { id: 'leave-ready', status: 'failed', reason: 'exhausted' };
  else if (state.timeSpent > SYSTEMIC_LIMITS.deadline) objective = { id: 'leave-ready', status: 'failed', reason: 'too-late' };
  else objective = { id: 'leave-ready', status: 'active' };
  const decoded = decodeSystemicRun(JSON.stringify({ ...state, objective }));
  return decoded.status === 'ok' ? null : decoded.reason;
}

function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
function finite(value: unknown): value is number { return typeof value === 'number' && Number.isFinite(value); }
function nonNegative(value: unknown): value is number { return finite(value) && value >= 0; }
function positiveInt(value: unknown): value is number { return typeof value === 'number' && Number.isInteger(value) && value > 0; }
function isUint32(value: unknown): value is number { return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 0xffffffff; }
function invalid(reason: string): { status: 'invalid'; reason: string } { return { status: 'invalid', reason }; }
