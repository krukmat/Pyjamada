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
    case 'WALLY_MOVE': return 140;
    case 'WALLY_WAKE': return 420;
    case 'WALLY_STARTLE': return 420;
    case 'WALLY_RUSH': return 260;
    case 'WALLY_FUMBLE': return 360;
    case 'WALLY_STATE_STABLE': return 0;
    case 'OBJECT_INTERACT': return 280;
    case 'OBJECT_COLLECT': return 360;
    case 'EQUIPMENT_CHANGED': return 320;
    case 'WINDOW_OPENED':
    case 'WINDOW_CLOSED': return 320;
    case 'NOISE_BURST': return event.intensity === 'strong' ? 420 : event.intensity === 'medium' ? 300 : 180;
    case 'ENERGY_GAIN':
    case 'ENERGY_LOSS': return 260;
    case 'OBJECTIVE_SUCCESS': return 850;
    case 'OBJECTIVE_FAILURE': return 850;
    case 'NO_TARGET': return 160;
    case 'PRESENTATION_RESET': return 0;
  }
}
