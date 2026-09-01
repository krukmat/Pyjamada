import type { SystemicUpdate } from '../systemic/SystemicRuntime';
import type { SystemicRunState } from '../systemic/SystemicState';
import type { VisualEvent, VisualIntensity } from './VisualEvent';

function noiseIntensity(amount: number): VisualIntensity {
  if (amount >= 18) return 'strong';
  if (amount >= 8) return 'medium';
  return 'subtle';
}

export function mapSystemicUpdateToVisualEvents(
  before: SystemicRunState,
  update: SystemicUpdate,
): VisualEvent[] {
  const after = update.state;
  const visual: VisualEvent[] = [];

  for (const event of update.events) {
    switch (event.type) {
      case 'MOVED':
        visual.push({ type: 'WALLY_MOVE', direction: event.direction, quiet: after.equipped.includes('slippers') });
        break;
      case 'OBJECT_INTERACTED':
        visual.push({ type: 'OBJECT_INTERACT', objectId: event.objectId, count: after.interactionCounts[event.objectId] });
        if (!before.collected.includes(event.objectId) && after.collected.includes(event.objectId)) {
          visual.push({ type: 'OBJECT_COLLECT', objectId: event.objectId });
        }
        if (!before.equipped.includes(event.objectId) && after.equipped.includes(event.objectId)) {
          visual.push({ type: 'EQUIPMENT_CHANGED', objectId: event.objectId, equipped: true });
        }
        if (event.objectId === 'window' && before.flags.windowOpen !== after.flags.windowOpen) {
          visual.push({ type: after.flags.windowOpen ? 'WINDOW_OPENED' : 'WINDOW_CLOSED' });
        }
        break;
      case 'WALLY_STATE_CHANGED':
        if (event.from === 'sleepy' && event.to === 'normal') visual.push({ type: 'WALLY_WAKE' });
        else if (event.to === 'startled') visual.push({ type: 'WALLY_STARTLE' });
        else if (event.to === 'rushed') visual.push({ type: 'WALLY_RUSH' });
        visual.push({ type: 'WALLY_STATE_STABLE', state: event.to });
        break;
      case 'OBJECTIVE_COMPLETED':
        visual.push({ type: 'OBJECTIVE_SUCCESS' });
        break;
      case 'OBJECTIVE_FAILED':
        visual.push({ type: 'OBJECTIVE_FAILURE', reason: event.reason });
        break;
      case 'NO_TARGET':
        visual.push({ type: 'NO_TARGET' });
        break;
      case 'RUN_RESTARTED':
        visual.push({ type: 'PRESENTATION_RESET' });
        break;
    }
  }

  // Rule IDs terminate here. Renderers consume only semantic events.
  if (update.ruleTrace.includes('startled-fumble')) {
    visual.push({ type: 'WALLY_FUMBLE' });
  }

  const action = after.lastAction;
  if (action && action.kind !== 'restart') {
    if (action.noiseDelta > 0) {
      visual.push({ type: 'NOISE_BURST', amount: action.noiseDelta, intensity: noiseIntensity(action.noiseDelta) });
    }
    if (action.energyDelta > 0) visual.push({ type: 'ENERGY_GAIN', amount: action.energyDelta });
    if (action.energyDelta < 0) visual.push({ type: 'ENERGY_LOSS', amount: Math.abs(action.energyDelta) });
  }

  return visual;
}
