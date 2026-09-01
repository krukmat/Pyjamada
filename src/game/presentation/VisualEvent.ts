import type { SystemicObjectId, WallyState } from '../systemic/SystemicState';

export type VisualIntensity = 'subtle' | 'medium' | 'strong';

export type VisualEvent =
  | { type: 'WALLY_MOVE'; direction: 'left' | 'right'; quiet: boolean }
  | { type: 'WALLY_WAKE' }
  | { type: 'WALLY_STARTLE' }
  | { type: 'WALLY_RUSH' }
  | { type: 'WALLY_FUMBLE' }
  | { type: 'WALLY_STATE_STABLE'; state: WallyState }
  | { type: 'OBJECT_INTERACT'; objectId: SystemicObjectId; count: number }
  | { type: 'OBJECT_COLLECT'; objectId: SystemicObjectId }
  | { type: 'EQUIPMENT_CHANGED'; objectId: SystemicObjectId; equipped: boolean }
  | { type: 'WINDOW_OPENED' }
  | { type: 'WINDOW_CLOSED' }
  | { type: 'NOISE_BURST'; amount: number; intensity: VisualIntensity }
  | { type: 'ENERGY_GAIN'; amount: number }
  | { type: 'ENERGY_LOSS'; amount: number }
  | { type: 'OBJECTIVE_SUCCESS' }
  | { type: 'OBJECTIVE_FAILURE'; reason: 'too-late' | 'house-awake' | 'exhausted' }
  | { type: 'NO_TARGET' }
  | { type: 'PRESENTATION_RESET' };

export function visualEventLifetimeMs(event: VisualEvent): number {
  switch (event.type) {
    case 'WALLY_MOVE': return 220;
    case 'WALLY_WAKE': return 440;
    case 'WALLY_STARTLE': return 440;
    case 'WALLY_RUSH': return 300;
    case 'WALLY_FUMBLE': return 400;
    case 'WALLY_STATE_STABLE': return 0;
    case 'OBJECT_INTERACT': return event.objectId === 'alarm-clock' ? 420 : 360;
    case 'OBJECT_COLLECT': return 420;
    case 'EQUIPMENT_CHANGED': return 360;
    case 'WINDOW_OPENED':
    case 'WINDOW_CLOSED': return 360;
    case 'NOISE_BURST': return event.intensity === 'strong' ? 440 : event.intensity === 'medium' ? 320 : 200;
    case 'ENERGY_GAIN':
    case 'ENERGY_LOSS': return 280;
    case 'OBJECTIVE_SUCCESS': return 900;
    case 'OBJECTIVE_FAILURE': return 900;
    case 'NO_TARGET': return 180;
    case 'PRESENTATION_RESET': return 0;
  }
}

export function visualEventChannel(event: VisualEvent): string | undefined {
  switch (event.type) {
    case 'WALLY_MOVE':
    case 'WALLY_WAKE':
    case 'WALLY_STARTLE':
    case 'WALLY_RUSH':
    case 'WALLY_FUMBLE':
      return 'actor:wally';
    case 'OBJECT_INTERACT':
    case 'OBJECT_COLLECT':
    case 'EQUIPMENT_CHANGED':
      return `object:${event.objectId}`;
    case 'WINDOW_OPENED':
    case 'WINDOW_CLOSED':
      return 'object:window';
    case 'OBJECTIVE_SUCCESS':
    case 'OBJECTIVE_FAILURE':
      return 'objective';
    case 'NO_TARGET':
      return 'interaction-prompt';
    case 'ENERGY_GAIN':
    case 'ENERGY_LOSS':
      return 'resource:energy';
    case 'WALLY_STATE_STABLE':
    case 'NOISE_BURST':
    case 'PRESENTATION_RESET':
      return undefined;
  }
}

export function visualEventSupersedesChannel(event: VisualEvent): boolean {
  return visualEventChannel(event) !== undefined;
}
