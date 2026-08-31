import { SYSTEMIC_OBJECT_IDS, SYSTEMIC_LIMITS, type SystemicObjectId, type SystemicRunState, type WallyState } from './SystemicState';

export type DecodeSystemicRunResult = { status: 'ok'; state: SystemicRunState } | { status: 'invalid'; reason: string };

const WALLY_STATES: readonly WallyState[] = ['sleepy', 'normal', 'rushed', 'startled'];
const OBJECT_STATES = ['idle', 'used', 'open', 'collected', 'equipped'] as const;

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
  if (typeof value.runId !== 'string' || value.runId.length === 0) return invalid('Missing run id.');
  if (!isRecord(value.player) || !isBoundedNumber(value.player.x, 0, 128) || (value.player.facing !== 'left' && value.player.facing !== 'right')) return invalid('Invalid player state.');
  if (!isBoundedNumber(value.timeSpent, 0, 10000)) return invalid('Invalid time resource.');
  if (!isBoundedNumber(value.energy, SYSTEMIC_LIMITS.minEnergy, SYSTEMIC_LIMITS.maxEnergy)) return invalid('Invalid energy resource.');
  if (!isBoundedNumber(value.noise, SYSTEMIC_LIMITS.minNoise, SYSTEMIC_LIMITS.maxNoise)) return invalid('Invalid noise resource.');
  if (!WALLY_STATES.includes(value.wallyState as WallyState)) return invalid('Invalid Wally state.');
  if (!isObjectIdArray(value.equipped) || !isObjectIdArray(value.collected)) return invalid('Invalid equipment/collection state.');
  if (!isRecord(value.flags) || typeof value.flags.dressed !== 'boolean' || typeof value.flags.windowOpen !== 'boolean') return invalid('Invalid flags.');
  if (!isRecord(value.objective) || value.objective.id !== 'leave-ready' || !['active', 'completed', 'failed'].includes(String(value.objective.status))) return invalid('Invalid objective.');
  if (!isRecord(value.objectStates)) return invalid('Invalid object states.');
  const objectStates = value.objectStates;
  if (!SYSTEMIC_OBJECT_IDS.every((id) => OBJECT_STATES.includes(objectStates[id] as typeof OBJECT_STATES[number]))) return invalid('Invalid object states.');
  if (!isRecord(value.interactionCounts)) return invalid('Invalid interaction counts.');
  const interactionCounts = value.interactionCounts;
  if (!SYSTEMIC_OBJECT_IDS.every((id) => Number.isInteger(interactionCounts[id]) && (interactionCounts[id] as number) >= 0)) return invalid('Invalid interaction counts.');
  return { status: 'ok', state: value as unknown as SystemicRunState };
}

function isObjectIdArray(value: unknown): value is SystemicObjectId[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string' && (SYSTEMIC_OBJECT_IDS as readonly string[]).includes(item)) && new Set(value).size === value.length;
}

function isBoundedNumber(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function invalid(reason: string): DecodeSystemicRunResult { return { status: 'invalid', reason }; }
