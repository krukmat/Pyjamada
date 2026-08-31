export const SYSTEMIC_OBJECT_IDS = ['bed', 'alarm-clock', 'wardrobe', 'slippers', 'window', 'keys'] as const;
export type SystemicObjectId = (typeof SYSTEMIC_OBJECT_IDS)[number];
export type SystemicInput = 'left' | 'right' | 'action';
export type WallyState = 'sleepy' | 'normal' | 'rushed' | 'startled';
export type ObjectiveStatus = 'active' | 'completed' | 'failed';

export type SystemicObjective = {
  id: 'leave-ready';
  status: ObjectiveStatus;
  reason?: 'too-late' | 'house-awake' | 'exhausted';
};

export type SystemicRunState = {
  schemaVersion: 1;
  runId: string;
  player: { x: number; facing: 'left' | 'right' };
  timeSpent: number;
  energy: number;
  noise: number;
  wallyState: WallyState;
  equipped: SystemicObjectId[];
  collected: SystemicObjectId[];
  objectStates: Record<SystemicObjectId, 'idle' | 'used' | 'open' | 'collected' | 'equipped'>;
  interactionCounts: Record<SystemicObjectId, number>;
  flags: {
    dressed: boolean;
    windowOpen: boolean;
  };
  objective: SystemicObjective;
  lastAction?: {
    kind: 'move' | 'interaction' | 'restart';
    objectId?: SystemicObjectId;
    timeDelta: number;
    energyDelta: number;
    noiseDelta: number;
    ruleTrace: string[];
  };
};

export const SYSTEMIC_LIMITS = {
  minEnergy: 0,
  maxEnergy: 100,
  minNoise: 0,
  maxNoise: 100,
  deadline: 50,
  noiseFailure: 85,
} as const;

export function createSystemicRun(runId = 'systemic-run'): SystemicRunState {
  return {
    schemaVersion: 1,
    runId,
    player: { x: 24, facing: 'right' },
    timeSpent: 0,
    energy: 35,
    noise: 0,
    wallyState: 'sleepy',
    equipped: [],
    collected: [],
    objectStates: {
      bed: 'idle',
      'alarm-clock': 'idle',
      wardrobe: 'idle',
      slippers: 'idle',
      window: 'idle',
      keys: 'idle',
    },
    interactionCounts: {
      bed: 0,
      'alarm-clock': 0,
      wardrobe: 0,
      slippers: 0,
      window: 0,
      keys: 0,
    },
    flags: { dressed: false, windowOpen: false },
    objective: { id: 'leave-ready', status: 'active' },
  };
}

export function clampEnergy(value: number): number {
  return Math.max(SYSTEMIC_LIMITS.minEnergy, Math.min(SYSTEMIC_LIMITS.maxEnergy, value));
}

export function clampNoise(value: number): number {
  return Math.max(SYSTEMIC_LIMITS.minNoise, Math.min(SYSTEMIC_LIMITS.maxNoise, value));
}
