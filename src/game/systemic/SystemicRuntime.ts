import { findSystemicObject, type SystemicCommand, type SystemicObjectDefinition } from './SystemicContent';
import { applySystemicRules } from './SystemicRuleEngine';
import { clampEnergy, clampNoise, createSystemicRun, SYSTEMIC_LIMITS, type SystemicInput, type SystemicObjectId, type SystemicRunState } from './SystemicState';

export type SystemicEvent =
  | { type: 'MOVED'; direction: 'left' | 'right' }
  | { type: 'OBJECT_INTERACTED'; objectId: SystemicObjectId }
  | { type: 'WALLY_STATE_CHANGED'; from: SystemicRunState['wallyState']; to: SystemicRunState['wallyState'] }
  | { type: 'OBJECTIVE_COMPLETED' }
  | { type: 'OBJECTIVE_FAILED'; reason: NonNullable<SystemicRunState['objective']['reason']> }
  | { type: 'NO_TARGET' }
  | { type: 'RUN_RESTARTED' };

export type SystemicUpdate = {
  state: SystemicRunState;
  events: SystemicEvent[];
  ruleTrace: string[];
};

const LEFT_BOUND = 8;
const RIGHT_BOUND = 116;
const MOVE_STEP = 4;

export function updateSystemicRun(state: SystemicRunState, input: SystemicInput): SystemicUpdate {
  if (state.objective.status !== 'active') return { state, events: [], ruleTrace: [] };
  return input === 'action' ? interact(state) : move(state, input);
}

export function restartSystemicRun(state: SystemicRunState): SystemicUpdate {
  const restarted = createSystemicRun(state.runId);
  restarted.lastAction = { kind: 'restart', timeDelta: 0, energyDelta: 0, noiseDelta: 0, ruleTrace: [] };
  return { state: restarted, events: [{ type: 'RUN_RESTARTED' }], ruleTrace: [] };
}

function move(state: SystemicRunState, direction: 'left' | 'right'): SystemicUpdate {
  const preState = state;
  const delta = direction === 'left' ? -MOVE_STEP : MOVE_STEP;
  const x = Math.max(LEFT_BOUND, Math.min(RIGHT_BOUND, state.player.x + delta));
  let next: SystemicRunState = {
    ...state,
    player: { x, facing: direction },
    timeSpent: state.timeSpent + 1,
    noise: clampNoise(state.noise + 2),
  };
  const rules = applySystemicRules(next, { kind: 'move', preState });
  next = resolveObjective(rules.state);
  const events: SystemicEvent[] = [{ type: 'MOVED', direction }];
  appendStateAndObjectiveEvents(preState, next, events);
  next = withLastAction(next, preState, 'move', undefined, rules.trace);
  return { state: next, events, ruleTrace: rules.trace };
}

function interact(state: SystemicRunState): SystemicUpdate {
  const object = findSystemicObject(state.player.x);
  if (!object) {
    return {
      state: { ...state, lastAction: { kind: 'interaction', timeDelta: 0, energyDelta: 0, noiseDelta: 0, ruleTrace: [] } },
      events: [{ type: 'NO_TARGET' }],
      ruleTrace: [],
    };
  }

  const preState = state;
  let next = applyBaseEffect(state, object);
  next = incrementInteraction(next, object.id);
  next = applyCommands(next, object.commands);
  next = markObjectState(next, object.id);

  const rules = applySystemicRules(next, { kind: 'interaction', objectId: object.id, preState });
  next = resolveObjective(rules.state);

  const events: SystemicEvent[] = [{ type: 'OBJECT_INTERACTED', objectId: object.id }];
  appendStateAndObjectiveEvents(preState, next, events);
  next = withLastAction(next, preState, 'interaction', object.id, rules.trace);
  return { state: next, events, ruleTrace: rules.trace };
}

function applyBaseEffect(state: SystemicRunState, object: SystemicObjectDefinition): SystemicRunState {
  return {
    ...state,
    timeSpent: state.timeSpent + object.baseEffect.time,
    energy: clampEnergy(state.energy + object.baseEffect.energy),
    noise: clampNoise(state.noise + object.baseEffect.noise),
  };
}

function incrementInteraction(state: SystemicRunState, objectId: SystemicObjectId): SystemicRunState {
  return {
    ...state,
    interactionCounts: { ...state.interactionCounts, [objectId]: state.interactionCounts[objectId] + 1 },
  };
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

function resolveObjective(state: SystemicRunState): SystemicRunState {
  if (state.objective.status !== 'active') return state;
  if (state.collected.includes('keys') && state.flags.dressed) {
    return { ...state, objective: { id: 'leave-ready', status: 'completed' } };
  }
  if (state.noise >= SYSTEMIC_LIMITS.noiseFailure) {
    return { ...state, objective: { id: 'leave-ready', status: 'failed', reason: 'house-awake' } };
  }
  if (state.energy <= SYSTEMIC_LIMITS.minEnergy) {
    return { ...state, objective: { id: 'leave-ready', status: 'failed', reason: 'exhausted' } };
  }
  if (state.timeSpent > SYSTEMIC_LIMITS.deadline) {
    return { ...state, objective: { id: 'leave-ready', status: 'failed', reason: 'too-late' } };
  }
  return state;
}

function appendStateAndObjectiveEvents(before: SystemicRunState, after: SystemicRunState, events: SystemicEvent[]) {
  if (before.wallyState !== after.wallyState) events.push({ type: 'WALLY_STATE_CHANGED', from: before.wallyState, to: after.wallyState });
  if (before.objective.status === 'active' && after.objective.status === 'completed') events.push({ type: 'OBJECTIVE_COMPLETED' });
  if (before.objective.status === 'active' && after.objective.status === 'failed' && after.objective.reason) {
    events.push({ type: 'OBJECTIVE_FAILED', reason: after.objective.reason });
  }
}

function withLastAction(
  state: SystemicRunState,
  before: SystemicRunState,
  kind: 'move' | 'interaction',
  objectId: SystemicObjectId | undefined,
  ruleTrace: string[],
): SystemicRunState {
  return {
    ...state,
    lastAction: {
      kind,
      objectId,
      timeDelta: state.timeSpent - before.timeSpent,
      energyDelta: state.energy - before.energy,
      noiseDelta: state.noise - before.noise,
      ruleTrace,
    },
  };
}
