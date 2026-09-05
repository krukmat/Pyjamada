import type { SystemicObjectId } from '../systemic/SystemicState';

export type VisualIntensity = 'subtle' | 'medium' | 'strong';

export type WallyReactionCause = 'bed' | 'alarm-clock' | 'wardrobe' | 'keys' | 'window' | 'slippers';

// FINDING-003 / F-01: presentation-only immutable FX origin. Captured once,
// by the mapper, from the exact gameplay state that created the event; never
// recomputed later from the runtime's current/latest state.
export type VisualOrigin = { x: number; y: number };

export const OBJECT_VISUAL_ORIGINS: Record<SystemicObjectId, VisualOrigin> = {
  bed: { x: 16, y: 87 },
  slippers: { x: 32, y: 101 },
  'alarm-clock': { x: 48, y: 87 },
  wardrobe: { x: 68, y: 74 },
  keys: { x: 88, y: 91 },
  window: { x: 108, y: 48 },
};

export type VisualEvent =
  | { type: 'WALLY_MOVE'; direction: 'left' | 'right'; quiet: boolean; origin: VisualOrigin }
  | { type: 'WALLY_WAKE' }
  | { type: 'WALLY_STARTLE'; origin: VisualOrigin }
  | { type: 'WALLY_RUSH'; origin: VisualOrigin }
  | { type: 'WALLY_FUMBLE'; origin: VisualOrigin }
  | { type: 'WALLY_REACT'; cause: WallyReactionCause }
  | { type: 'OBJECT_INTERACT'; objectId: SystemicObjectId; count: number }
  | { type: 'OBJECT_COLLECT'; objectId: SystemicObjectId }
  | { type: 'EQUIPMENT_CHANGED'; objectId: SystemicObjectId; equipped: boolean }
  | { type: 'WINDOW_OPENED' }
  | { type: 'WINDOW_CLOSED' }
  | { type: 'NOISE_BURST'; amount: number; intensity: VisualIntensity; origin: VisualOrigin }
  | { type: 'ENERGY_GAIN'; amount: number; origin: VisualOrigin }
  | { type: 'OBJECTIVE_SUCCESS'; origin: VisualOrigin }
  | { type: 'OBJECTIVE_FAILURE'; reason: 'too-late' | 'house-awake' | 'exhausted'; origin: VisualOrigin }
  | { type: 'PRESENTATION_RESET' };

export function visualEventLifetimeMs(event: VisualEvent): number {
  switch (event.type) {
    case 'WALLY_MOVE': return 220;
    case 'WALLY_WAKE': return 440;
    case 'WALLY_STARTLE': return 440;
    case 'WALLY_RUSH': return 300;
    case 'WALLY_FUMBLE': return 400;
    case 'WALLY_REACT': return event.cause === 'alarm-clock' ? 420 : 360;
    case 'OBJECT_INTERACT': return event.objectId === 'alarm-clock' ? 420 : 360;
    case 'OBJECT_COLLECT': return 420;
    case 'EQUIPMENT_CHANGED': return 360;
    case 'WINDOW_OPENED':
    case 'WINDOW_CLOSED': return 360;
    case 'NOISE_BURST': return event.intensity === 'strong' ? 440 : event.intensity === 'medium' ? 320 : 200;
    case 'ENERGY_GAIN': return 280;
    case 'OBJECTIVE_SUCCESS': return 900;
    case 'OBJECTIVE_FAILURE': return 900;
    case 'PRESENTATION_RESET': return 0;
  }
}

export const ACTOR_WALLY_CHANNEL = 'actor:wally';
export const OBJECTIVE_CHANNEL = 'objective';

export function objectChannel(objectId: SystemicObjectId): string {
  return `object:${objectId}`;
}

export function visualEventChannel(event: VisualEvent): string | undefined {
  switch (event.type) {
    case 'WALLY_MOVE':
    case 'WALLY_WAKE':
    case 'WALLY_STARTLE':
    case 'WALLY_RUSH':
    case 'WALLY_FUMBLE':
    case 'WALLY_REACT':
      return ACTOR_WALLY_CHANNEL;
    case 'OBJECT_INTERACT':
    case 'OBJECT_COLLECT':
    case 'EQUIPMENT_CHANGED':
      return objectChannel(event.objectId);
    case 'WINDOW_OPENED':
    case 'WINDOW_CLOSED':
      return objectChannel('window');
    case 'OBJECTIVE_SUCCESS':
    case 'OBJECTIVE_FAILURE':
      return OBJECTIVE_CHANNEL;
    case 'ENERGY_GAIN':
      return 'resource:energy';
    case 'NOISE_BURST':
    case 'PRESENTATION_RESET':
      return undefined;
  }
}
