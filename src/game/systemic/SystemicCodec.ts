import { SYSTEMIC_OBJECT_IDS, SYSTEMIC_LIMITS, type SystemicObjectId, type SystemicRunState, type WallyState } from './SystemicState';

export type DecodeSystemicRunResult = { status: 'ok'; state: SystemicRunState } | { status: 'invalid'; reason: string };

const WALLY_STATES: readonly WallyState[] = ['sleepy', 'normal', 'rushed', 'startled'];
const OBJECT_STATES = ['idle', 'used', 'open', 'collected', 'equipped'] as const;
const OBJECTIVE_STATUSES = ['active', 'completed', 'failed'] as const;
const OBJECTIVE_REASONS = ['too-late', 'house-awake', 'exhausted'] as const;
const PLAYER_MIN_X = 8;
const PLAYER_MAX_X = 116;

export function encodeSystemicRun(state: SystemicRunState): string {
  const validated = validateSystemicRun(state);
  if (validated.status === 'invalid') throw new Error(validated.reason);
  return JSON.stringify(state);
}

export function decodeSystemicRun(raw: string): DecodeSystemicRunResult {
  let value: unknown;
  try { value = JSON.parse(raw); } catch { return invalid('Prototype save is not valid JSON.'); }
  return validateSystemicRun(value);
}

export function validateSystemicRun(value: unknown): DecodeSystemicRunResult {
  if (!isRecord(value)) return invalid('Prototype save root must be an object.');
  if (value.schemaVersion !== 1) return invalid('Unsupported prototype save version.');
  if (typeof value.runId !== 'string' || value.runId.trim().length === 0) return invalid('Missing run id.');
  if (!isRecord(value.player) || !isBoundedInteger(value.player.x, PLAYER_MIN_X, PLAYER_MAX_X) || (value.player.facing !== 'left' && value.player.facing !== 'right')) return invalid('Invalid player state.');
  if (!isBoundedInteger(value.timeSpent, 0, 10000)) return invalid('Invalid time resource.');
  if (!isBoundedInteger(value.energy, SYSTEMIC_LIMITS.minEnergy, SYSTEMIC_LIMITS.maxEnergy)) return invalid('Invalid energy resource.');
  if (!isBoundedInteger(value.noise, SYSTEMIC_LIMITS.minNoise, SYSTEMIC_LIMITS.maxNoise)) return invalid('Invalid noise resource.');
  if (!WALLY_STATES.includes(value.wallyState as WallyState)) return invalid('Invalid Wally state.');

  if (!isAllowedObjectIdArray(value.equipped, ['slippers'])) return invalid('Invalid equipment state.');
  if (!isAllowedObjectIdArray(value.collected, ['keys'])) return invalid('Invalid collection state.');
  const equipped = value.equipped as SystemicObjectId[];
  const collected = value.collected as SystemicObjectId[];

  if (!isRecord(value.flags) || typeof value.flags.dressed !== 'boolean' || typeof value.flags.windowOpen !== 'boolean') return invalid('Invalid flags.');
  const dressed = value.flags.dressed;
  const windowOpen = value.flags.windowOpen;

  if (!isRecord(value.objective) || value.objective.id !== 'leave-ready' || !OBJECTIVE_STATUSES.includes(value.objective.status as typeof OBJECTIVE_STATUSES[number])) return invalid('Invalid objective.');
  const objectiveStatus = value.objective.status as typeof OBJECTIVE_STATUSES[number];
  const objectiveReason = value.objective.reason;
  if (objectiveStatus === 'failed') {
    if (!OBJECTIVE_REASONS.includes(objectiveReason as typeof OBJECTIVE_REASONS[number])) return invalid('Failed objective requires a valid reason.');
  } else if (objectiveReason !== undefined) {
    return invalid('Only failed objectives may have a reason.');
  }

  if (!isExactObjectRecord(value.objectStates)) return invalid('Invalid object states.');
  const objectStates = value.objectStates;
  if (!SYSTEMIC_OBJECT_IDS.every((id) => OBJECT_STATES.includes(objectStates[id] as typeof OBJECT_STATES[number]))) return invalid('Invalid object states.');

  if (!isExactObjectRecord(value.interactionCounts)) return invalid('Invalid interaction counts.');
  const interactionCounts = value.interactionCounts;
  if (!SYSTEMIC_OBJECT_IDS.every((id) => Number.isInteger(interactionCounts[id]) && (interactionCounts[id] as number) >= 0)) return invalid('Invalid interaction counts.');

  for (const id of SYSTEMIC_OBJECT_IDS) {
    const count = interactionCounts[id] as number;
    const state = objectStates[id];
    if (count === 0 && state !== 'idle') return invalid(`Object ${id} cannot change state before interaction.`);
    if (count > 0 && state === 'idle') return invalid(`Object ${id} cannot remain idle after interaction.`);
  }

  const hasSlippers = equipped.includes('slippers');
  const hasKeys = collected.includes('keys');
  if (hasSlippers !== (objectStates.slippers === 'equipped')) return invalid('Inconsistent slippers state.');
  if (hasKeys !== (objectStates.keys === 'collected')) return invalid('Inconsistent keys state.');
  if (windowOpen !== (objectStates.window === 'open')) return invalid('Inconsistent window state.');
  if (dressed !== ((interactionCounts.wardrobe as number) > 0)) return invalid('Inconsistent wardrobe state.');

  if (objectiveStatus === 'completed' && (!dressed || !hasKeys)) return invalid('Completed objective requires dressed Wally and collected keys.');
  if (objectiveStatus === 'active' && dressed && hasKeys) return invalid('Active objective already satisfies completion conditions.');
  if (objectiveStatus === 'active' && (value.noise >= SYSTEMIC_LIMITS.noiseFailure || value.energy <= SYSTEMIC_LIMITS.minEnergy || value.timeSpent > SYSTEMIC_LIMITS.deadline)) return invalid('Active objective already satisfies failure conditions.');
  if (objectiveStatus === 'failed') {
    if (dressed && hasKeys) return invalid('Failed objective cannot also satisfy completion conditions.');
    if (objectiveReason === 'house-awake' && value.noise < SYSTEMIC_LIMITS.noiseFailure) return invalid('House-awake failure requires the noise threshold.');
    if (objectiveReason === 'exhausted' && value.energy > SYSTEMIC_LIMITS.minEnergy) return invalid('Exhausted failure requires minimum energy.');
    if (objectiveReason === 'too-late' && value.timeSpent <= SYSTEMIC_LIMITS.deadline) return invalid('Too-late failure requires the deadline to be exceeded.');
  }

  if (value.lastAction !== undefined && !isValidLastAction(value.lastAction)) return invalid('Invalid last action.');

  return { status: 'ok', state: value as unknown as SystemicRunState };
}

function isAllowedObjectIdArray(value: unknown, allowed: readonly SystemicObjectId[]): value is SystemicObjectId[] {
  return Array.isArray(value)
    && value.every((item) => typeof item === 'string' && allowed.includes(item as SystemicObjectId))
    && new Set(value).size === value.length;
}

function isExactObjectRecord(value: unknown): value is Record<string, unknown> {
  if (!isRecord(value)) return false;
  const keys = Object.keys(value);
  return keys.length === SYSTEMIC_OBJECT_IDS.length && keys.every((key) => (SYSTEMIC_OBJECT_IDS as readonly string[]).includes(key));
}

function isValidLastAction(value: unknown): boolean {
  if (!isRecord(value) || !['move', 'interaction', 'restart'].includes(String(value.kind))) return false;
  if (!Number.isInteger(value.timeDelta) || !Number.isInteger(value.energyDelta) || !Number.isInteger(value.noiseDelta)) return false;
  if (!Array.isArray(value.ruleTrace) || !value.ruleTrace.every((entry) => typeof entry === 'string')) return false;

  if (value.kind === 'interaction') {
    return typeof value.objectId === 'string' && (SYSTEMIC_OBJECT_IDS as readonly string[]).includes(value.objectId);
  }
  return value.objectId === undefined;
}

function isBoundedInteger(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function invalid(reason: string): DecodeSystemicRunResult { return { status: 'invalid', reason }; }
