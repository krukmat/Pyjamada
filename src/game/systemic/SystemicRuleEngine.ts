import { clampEnergy, clampNoise, type SystemicObjectId, type SystemicRunState } from './SystemicState';

export type RuleContext = {
  kind: 'move' | 'interaction';
  objectId?: SystemicObjectId;
  preState: SystemicRunState;
};

type Rule = {
  id: string;
  priority: number;
  matches: (state: SystemicRunState, context: RuleContext) => boolean;
  apply: (state: SystemicRunState, context: RuleContext) => SystemicRunState;
};

const RULES: readonly Rule[] = [
  {
    id: 'sleepy-action-tax',
    priority: 10,
    matches: (_, context) => context.kind === 'interaction' && context.preState.wallyState === 'sleepy' && context.objectId !== 'bed' && context.objectId !== 'alarm-clock',
    apply: (state) => mutate(state, { time: 2, energy: -2 }),
  },
  {
    id: 'slippers-quiet-step',
    priority: 20,
    matches: (state, context) => context.kind === 'move' && state.equipped.includes('slippers'),
    apply: (state) => mutate(state, { noise: -2 }),
  },
  {
    id: 'bed-wakes-wally',
    priority: 30,
    matches: (_, context) => context.kind === 'interaction' && context.objectId === 'bed' && context.preState.wallyState === 'sleepy',
    apply: (state) => ({ ...state, wallyState: 'normal' }),
  },
  {
    id: 'alarm-wakes-wally',
    priority: 31,
    matches: (state, context) => context.kind === 'interaction' && context.objectId === 'alarm-clock' && context.preState.wallyState === 'sleepy' && state.interactionCounts['alarm-clock'] === 1,
    apply: (state) => ({ ...state, wallyState: 'normal' }),
  },
  {
    id: 'repeated-alarm-startle',
    priority: 40,
    matches: (state, context) => context.kind === 'interaction' && context.objectId === 'alarm-clock' && state.interactionCounts['alarm-clock'] >= 2,
    apply: (state) => ({ ...mutate(state, { noise: 10 }), wallyState: 'startled' }),
  },
  {
    id: 'open-window-echo',
    priority: 50,
    matches: (state, context) => context.preState.flags.windowOpen && state.noise > context.preState.noise && context.objectId !== 'window',
    apply: (state) => mutate(state, { noise: 3 }),
  },
  {
    id: 'rushed-threshold',
    priority: 60,
    matches: (state) => state.timeSpent >= 22 && state.wallyState === 'normal',
    apply: (state) => ({ ...state, wallyState: 'rushed' }),
  },
  {
    id: 'startled-fumble',
    priority: 70,
    matches: (_, context) => context.kind === 'interaction' && context.preState.wallyState === 'startled' && context.objectId !== 'bed',
    apply: (state) => mutate(state, { time: 1, energy: -4, noise: 6 }),
  },
  {
    id: 'rushed-wardrobe-scramble',
    priority: 80,
    matches: (state, context) => context.kind === 'interaction' && context.objectId === 'wardrobe' && (context.preState.wallyState === 'rushed' || state.wallyState === 'rushed'),
    apply: (state) => mutate(state, { time: -1, noise: 8 }),
  },
  {
    id: 'high-noise-startle',
    priority: 90,
    matches: (state) => state.noise >= 60 && state.wallyState !== 'startled',
    apply: (state) => ({ ...state, wallyState: 'startled' }),
  },
] as const;

export function applySystemicRules(state: SystemicRunState, context: RuleContext): { state: SystemicRunState; trace: string[] } {
  let next = state;
  const trace: string[] = [];
  for (const rule of [...RULES].sort((a, b) => a.priority - b.priority)) {
    if (!rule.matches(next, context)) continue;
    next = rule.apply(next, context);
    trace.push(rule.id);
  }
  return { state: next, trace };
}

function mutate(state: SystemicRunState, delta: { time?: number; energy?: number; noise?: number }): SystemicRunState {
  return {
    ...state,
    timeSpent: Math.max(0, state.timeSpent + (delta.time ?? 0)),
    energy: clampEnergy(state.energy + (delta.energy ?? 0)),
    noise: clampNoise(state.noise + (delta.noise ?? 0)),
  };
}

export const SYSTEMIC_RULE_IDS = RULES.map((rule) => rule.id);
