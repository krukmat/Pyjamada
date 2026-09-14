import type { SystemicUpdate } from '../systemic/SystemicRuntime';
import type { SystemicObjectId, SystemicRunState } from '../systemic/SystemicState';
import { OBJECT_VISUAL_ORIGINS, type VisualEvent, type VisualIntensity, type VisualOrigin, type WallyReactionCause } from './VisualEvent';

function noiseIntensity(amount: number): VisualIntensity {
  if (amount >= 18) return 'strong';
  if (amount >= 8) return 'medium';
  return 'subtle';
}

// FINDING-003 / F-01: the origin of an actor/resource-scale FX is the object
// this exact action targeted, or the player's own position for an action
// with no target (e.g. a move). Captured once from `after`, the state
// produced by this specific update — never re-derived later from whatever
// action happens to be "latest" when the FX is drawn.
function actionOrigin(state: SystemicRunState): VisualOrigin {
  const objectId = state.lastAction?.objectId;
  if (objectId) return OBJECT_VISUAL_ORIGINS[objectId];
  return { x: state.player.x, y: 88 };
}

function wallyReactionCauseForInteraction(objectId: SystemicObjectId, justEquipped: boolean): WallyReactionCause | undefined {
  switch (objectId) {
    case 'bed': return 'bed';
    case 'alarm-clock': return 'alarm-clock';
    case 'wardrobe': return 'wardrobe';
    case 'keys': return 'keys';
    case 'window': return 'window';
    case 'slippers': return justEquipped ? 'slippers' : undefined;
  }
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
        visual.push({ type: 'WALLY_MOVE', direction: event.direction, quiet: after.equipped.includes('slippers'), origin: actionOrigin(after) });
        break;
      case 'OBJECT_INTERACTED': {
        visual.push({ type: 'OBJECT_INTERACT', objectId: event.objectId, count: after.interactionCounts[event.objectId] });
        const justEquipped = !before.equipped.includes(event.objectId) && after.equipped.includes(event.objectId);
        if (!before.collected.includes(event.objectId) && after.collected.includes(event.objectId)) {
          visual.push({ type: 'OBJECT_COLLECT', objectId: event.objectId });
        }
        if (justEquipped) {
          visual.push({ type: 'EQUIPMENT_CHANGED', objectId: event.objectId, equipped: true });
        }
        if (event.objectId === 'window' && before.flags.windowOpen !== after.flags.windowOpen) {
          visual.push({ type: after.flags.windowOpen ? 'WINDOW_OPENED' : 'WINDOW_CLOSED' });
        }
        const cause = wallyReactionCauseForInteraction(event.objectId, justEquipped);
        if (cause) visual.push({ type: 'WALLY_REACT', cause });
        break;
      }
      case 'WALLY_STATE_CHANGED':
        if (event.from === 'sleepy' && event.to === 'normal') visual.push({ type: 'WALLY_WAKE' });
        else if (event.to === 'startled') visual.push({ type: 'WALLY_STARTLE', origin: actionOrigin(after) });
        else if (event.to === 'rushed') visual.push({ type: 'WALLY_RUSH', origin: actionOrigin(after) });
        break;
      case 'OBJECTIVE_COMPLETED':
        visual.push({ type: 'OBJECTIVE_SUCCESS', origin: actionOrigin(after) });
        break;
      case 'OBJECTIVE_FAILED':
        visual.push({ type: 'OBJECTIVE_FAILURE', reason: event.reason, origin: actionOrigin(after) });
        break;
      case 'RUN_RESTARTED':
        visual.push({ type: 'PRESENTATION_RESET' });
        break;
    }
  }

  // Rule IDs terminate here. Renderers consume only semantic events.
  if (update.ruleTrace.includes('startled-fumble')) {
    visual.push({ type: 'WALLY_FUMBLE', origin: actionOrigin(after) });
  }

  const action = after.lastAction;
  if (action && action.kind !== 'restart') {
    if (action.noiseDelta > 0) {
      visual.push({ type: 'NOISE_BURST', amount: action.noiseDelta, intensity: noiseIntensity(action.noiseDelta), origin: actionOrigin(after) });
    }
    if (action.energyDelta > 0) visual.push({ type: 'ENERGY_GAIN', amount: action.energyDelta, origin: actionOrigin(after) });
  }

  return visual;
}
