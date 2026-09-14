import { findSystemicObject, getSystemicObject, type SystemicCommand } from '../systemic/SystemicContent';
import { clampEnergy, clampNoise, SYSTEMIC_LIMITS, type SystemicObjectId, type SystemicRunState } from '../systemic/SystemicState';

export type HauntedDomesticInteraction = {
  state: SystemicRunState;
  objectId?: SystemicObjectId;
  clockPenaltyMs: number;
  ruleTrace: string[];
};

export type HauntedMovementNoiseResult = {
  state: SystemicRunState;
  carry: number;
};

const BASE_MOVEMENT_NOISE_PER_UNIT = 0.125;
const SLIPPERS_MOVEMENT_NOISE_PER_UNIT = 0.025;

export function syncDomesticPlayer(state: SystemicRunState, x: number, facing: 'left' | 'right'): SystemicRunState {
  return { ...state, player: { x: Math.round(x), facing } };
}

export function applyHauntedMovementNoise(
  state: SystemicRunState,
  movedDistance: number,
  carry: number,
): HauntedMovementNoiseResult {
  const rate = state.equipped.includes('slippers') ? SLIPPERS_MOVEMENT_NOISE_PER_UNIT : BASE_MOVEMENT_NOISE_PER_UNIT;
  const total = Math.max(0, carry) + Math.abs(movedDistance) * rate;
  const wholeNoise = Math.floor(total);
  const next = wholeNoise > 0 ? withHighNoiseState({ ...state, noise: clampNoise(state.noise + wholeNoise) }) : state;
  return { state: next, carry: total - wholeNoise };
}

export function applyHauntedClockState(state: SystemicRunState, elapsedWithPenaltyMs: number, deadlineMs: number): SystemicRunState {
  const timeSpent = Math.floor(Math.max(0, elapsedWithPenaltyMs) / 1000);
  let next = { ...state, timeSpent };
  const remainingMs = Math.max(0, deadlineMs - elapsedWithPenaltyMs);
  if (remainingMs <= 25_000 && next.wallyState === 'normal') next = { ...next, wallyState: 'rushed' };
  return next;
}

export function interactHauntedDomestic(state: SystemicRunState): HauntedDomesticInteraction {
  const object = findSystemicObject(state.player.x);
  if (!object) return { state, clockPenaltyMs: 0, ruleTrace: [] };

  const pre = state;
  const trace: string[] = [];
  let penaltyMs = object.baseEffect.time * 1000;
  let next: SystemicRunState = {
    ...state,
    energy: clampEnergy(state.energy + object.baseEffect.energy),
    noise: clampNoise(state.noise + object.baseEffect.noise),
    interactionCounts: { ...state.interactionCounts, [object.id]: state.interactionCounts[object.id] + 1 },
  };
  next = applyCommands(next, object.commands);
  next = markObjectState(next, object.id);

  if (pre.wallyState === 'sleepy' && object.id !== 'bed' && object.id !== 'alarm-clock') {
    penaltyMs += 2000;
    next = { ...next, energy: clampEnergy(next.energy - 2) };
    trace.push('sleepy-action-tax');
  }
  if (object.id === 'bed' && pre.wallyState === 'sleepy') {
    next = { ...next, wallyState: 'normal' };
    trace.push('bed-wakes-wally');
  }
  if (object.id === 'alarm-clock' && pre.wallyState === 'sleepy' && next.interactionCounts['alarm-clock'] === 1) {
    next = { ...next, wallyState: 'normal' };
    trace.push('alarm-wakes-wally');
  }
  if (object.id === 'alarm-clock' && next.interactionCounts['alarm-clock'] >= 2) {
    next = { ...next, noise: clampNoise(next.noise + 10), wallyState: 'startled' };
    trace.push('repeated-alarm-startle');
  }
  if (pre.flags.windowOpen && next.noise > pre.noise && object.id !== 'window') {
    next = { ...next, noise: clampNoise(next.noise + 3) };
    trace.push('open-window-echo');
  }
  if (pre.wallyState === 'startled' && object.id !== 'bed') {
    penaltyMs += 1000;
    next = {
      ...next,
      energy: clampEnergy(next.energy - 4),
      noise: clampNoise(next.noise + 6),
    };
    trace.push('startled-fumble');
  }
  if (object.id === 'wardrobe' && (pre.wallyState === 'rushed' || next.wallyState === 'rushed')) {
    penaltyMs = Math.max(0, penaltyMs - 1000);
    next = { ...next, noise: clampNoise(next.noise + 8) };
    trace.push('rushed-wardrobe-scramble');
  }

  next = withHighNoiseState(next, trace);
  return { state: next, objectId: object.id, clockPenaltyMs: penaltyMs, ruleTrace: trace };
}

export function hauntedDomesticFailureReason(state: SystemicRunState, elapsedWithPenaltyMs: number, deadlineMs: number): 'house-awake' | 'exhausted' | 'too-late' | undefined {
  if (state.noise >= SYSTEMIC_LIMITS.noiseFailure) return 'house-awake';
  if (state.energy <= SYSTEMIC_LIMITS.minEnergy) return 'exhausted';
  if (elapsedWithPenaltyMs >= deadlineMs) return 'too-late';
  return undefined;
}

function withHighNoiseState(state: SystemicRunState, trace?: string[]): SystemicRunState {
  if (state.noise >= 60 && state.wallyState !== 'startled') {
    trace?.push('high-noise-startle');
    return { ...state, wallyState: 'startled' };
  }
  return state;
}

function applyCommands(state: SystemicRunState, commands: readonly SystemicCommand[]): SystemicRunState {
  return commands.reduce((current, command) => {
    switch (command.type) {
      case 'SET_DRESSED':
        return { ...current, flags: { ...current.flags, dressed: true } };
      case 'EQUIP':
        return current.equipped.includes(command.itemId) ? current : { ...current, equipped: [...current.equipped, command.itemId] };
      case 'COLLECT':
        return current.collected.includes(command.itemId) ? current : { ...current, collected: [...current.collected, command.itemId] };
      case 'TOGGLE_WINDOW':
        return { ...current, flags: { ...current.flags, windowOpen: !current.flags.windowOpen } };
    }
  }, state);
}

function markObjectState(state: SystemicRunState, objectId: SystemicObjectId): SystemicRunState {
  let objectState: SystemicRunState['objectStates'][SystemicObjectId] = 'used';
  if (objectId === 'window' && state.flags.windowOpen) objectState = 'open';
  if (objectId === 'slippers' && state.equipped.includes('slippers')) objectState = 'equipped';
  if (objectId === 'keys' && state.collected.includes('keys')) objectState = 'collected';
  return { ...state, objectStates: { ...state.objectStates, [objectId]: objectState } };
}

export function hauntedObjectClockPenaltyMs(objectId: SystemicObjectId): number {
  return getSystemicObject(objectId).baseEffect.time * 1000;
}
