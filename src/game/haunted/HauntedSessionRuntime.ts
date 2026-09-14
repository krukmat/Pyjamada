import { createSystemicRun, type SystemicRunState } from '../systemic/SystemicState';
import {
  applyHauntedClockState,
  applyHauntedMovementNoise,
  hauntedDomesticFailureReason,
  interactHauntedDomestic,
  syncDomesticPlayer,
} from './HauntedDomesticAdapter';
import { consumeTransientActions, createHauntedInputState, type HauntedInputState } from './HauntedInput';
import { createHauntedPlayerPhysics, stepHauntedPlayerPhysics, type HauntedPlayerPhysicsState } from './PlayerPhysics';

export type HauntedObjectivePhase = 'prepare' | 'escape-ready' | 'completed' | 'failed';
export type HauntedFailureReason = 'house-awake' | 'exhausted' | 'too-late' | 'haunted';

export type HauntedSessionState = {
  runtimeVersion: 1;
  runId: string;
  domestic: SystemicRunState;
  player: HauntedPlayerPhysicsState;
  input: HauntedInputState;
  elapsedMs: number;
  penaltyMs: number;
  deadlineMs: number;
  movementNoiseCarry: number;
  combat: {
    hp: number;
    maxHp: number;
    invulnerableUntilMs: number;
  };
  objective: {
    phase: HauntedObjectivePhase;
    reason?: HauntedFailureReason;
  };
};

export type HauntedSessionEvent =
  | { type: 'PLAYER_JUMPED' }
  | { type: 'DOMESTIC_INTERACTION'; objectId?: string; ruleTrace: string[] }
  | { type: 'ESCAPE_READY' }
  | { type: 'ATTACK_REQUESTED' }
  | { type: 'SESSION_FAILED'; reason: HauntedFailureReason };

export type HauntedSessionStep = {
  state: HauntedSessionState;
  events: HauntedSessionEvent[];
};

export const HAUNTED_DEFAULT_DEADLINE_MS = 75_000;

export function createHauntedSession(runId = 'haunted-run'): HauntedSessionState {
  const domestic = createSystemicRun(runId);
  return {
    runtimeVersion: 1,
    runId,
    domestic,
    player: createHauntedPlayerPhysics(domestic.player.x),
    input: createHauntedInputState(),
    elapsedMs: 0,
    penaltyMs: 0,
    deadlineMs: HAUNTED_DEFAULT_DEADLINE_MS,
    movementNoiseCarry: 0,
    combat: { hp: 3, maxHp: 3, invulnerableUntilMs: 0 },
    objective: { phase: 'prepare' },
  };
}

export function stepHauntedSession(state: HauntedSessionState, deltaMs: number): HauntedSessionStep {
  if (state.objective.phase === 'completed' || state.objective.phase === 'failed') return { state, events: [] };

  const dtMs = Math.max(0, deltaMs);
  const dtSeconds = dtMs / 1000;
  const events: HauntedSessionEvent[] = [];
  const wasGrounded = state.player.grounded;
  const previousX = state.player.x;
  const player = stepHauntedPlayerPhysics(state.player, state.input, dtSeconds);
  if (state.input.jumpPressed && wasGrounded && !player.grounded) events.push({ type: 'PLAYER_JUMPED' });
  if (state.input.attackPressed) events.push({ type: 'ATTACK_REQUESTED' });

  let domestic = syncDomesticPlayer(state.domestic, player.x, player.facing);
  const movementNoise = applyHauntedMovementNoise(domestic, Math.abs(player.x - previousX), state.movementNoiseCarry);
  domestic = movementNoise.state;

  let penaltyMs = state.penaltyMs;
  if (state.input.interactPressed) {
    const interaction = interactHauntedDomestic(domestic);
    domestic = interaction.state;
    penaltyMs += interaction.clockPenaltyMs;
    events.push({ type: 'DOMESTIC_INTERACTION', objectId: interaction.objectId, ruleTrace: interaction.ruleTrace });
  }

  const elapsedMs = state.elapsedMs + dtMs;
  const logicalElapsedMs = elapsedMs + penaltyMs;
  domestic = applyHauntedClockState(domestic, logicalElapsedMs, state.deadlineMs);

  let objective = state.objective;
  const failure = state.combat.hp <= 0
    ? 'haunted' as const
    : hauntedDomesticFailureReason(domestic, logicalElapsedMs, state.deadlineMs);

  if (failure) {
    objective = { phase: 'failed', reason: failure };
    events.push({ type: 'SESSION_FAILED', reason: failure });
  } else if (objective.phase === 'prepare' && domestic.flags.dressed && domestic.collected.includes('keys')) {
    objective = { phase: 'escape-ready' };
    events.push({ type: 'ESCAPE_READY' });
  }

  return {
    state: {
      ...state,
      domestic,
      player,
      input: consumeTransientActions(state.input),
      elapsedMs,
      penaltyMs,
      movementNoiseCarry: movementNoise.carry,
      objective,
    },
    events,
  };
}
