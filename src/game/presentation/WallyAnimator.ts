import { resolveAnimationFrame, type ResolvedAnimationFrame } from './AnimationTypes';
import type { ActiveVisualEvent } from './PresentationRuntime';
import type { SystemicRunState } from '../systemic/SystemicState';
import { createSpriteAtlasIndex, requireAtlasClip, requireAtlasFrame, type AtlasFrame } from './atlas/SpriteAtlas';
import { WALLY_ATLAS } from './atlas/manifests';

const WALLY_INDEX = createSpriteAtlasIndex(WALLY_ATLAS);

type WallyVisualSelection = {
  clipId: string;
  startedAtMs: number;
};

export type WallyVisualFrame = WallyVisualSelection & {
  frame: AtlasFrame;
  animation: ResolvedAnimationFrame;
};

function newest(events: readonly ActiveVisualEvent[], types: readonly ActiveVisualEvent['event']['type'][]): ActiveVisualEvent | undefined {
  return [...events]
    .filter((entry) => types.includes(entry.event.type))
    .sort((a, b) => b.startedAtMs - a.startedAtMs || b.id - a.id)[0];
}

function idleClip(state: SystemicRunState): string {
  return `idle_${state.wallyState}`;
}

function movementClip(state: SystemicRunState): string {
  return `walk_${state.wallyState}`;
}

export function selectWallyVisual(state: SystemicRunState, active: readonly ActiveVisualEvent[], nowMs: number): WallyVisualSelection {
  const objective = newest(active, ['OBJECTIVE_SUCCESS', 'OBJECTIVE_FAILURE']);
  if (objective?.event.type === 'OBJECTIVE_SUCCESS') return { clipId: 'success', startedAtMs: objective.startedAtMs };
  if (objective?.event.type === 'OBJECTIVE_FAILURE') {
    const clipId = objective.event.reason === 'house-awake'
      ? 'fail_noise'
      : objective.event.reason === 'exhausted'
        ? 'fail_exhausted'
        : 'fail_late';
    return { clipId, startedAtMs: objective.startedAtMs };
  }

  const reaction = newest(active, ['WALLY_FUMBLE', 'WALLY_STARTLE', 'WALLY_WAKE', 'EQUIPMENT_CHANGED', 'OBJECT_COLLECT', 'WINDOW_OPENED', 'WINDOW_CLOSED', 'OBJECT_INTERACT']);
  if (reaction) {
    const event = reaction.event;
    if (event.type === 'WALLY_FUMBLE') return { clipId: 'fumble', startedAtMs: reaction.startedAtMs };
    if (event.type === 'WALLY_STARTLE') return { clipId: 'alarm_recoil', startedAtMs: reaction.startedAtMs };
    if (event.type === 'WALLY_WAKE') return { clipId: 'wake', startedAtMs: reaction.startedAtMs };
    if (event.type === 'EQUIPMENT_CHANGED' && event.objectId === 'slippers') return { clipId: 'equip_slippers', startedAtMs: reaction.startedAtMs };
    if (event.type === 'OBJECT_COLLECT' && event.objectId === 'keys') return { clipId: 'collect_keys', startedAtMs: reaction.startedAtMs };
    if (event.type === 'WINDOW_OPENED' || event.type === 'WINDOW_CLOSED') return { clipId: 'window_react', startedAtMs: reaction.startedAtMs };
    if (event.type === 'OBJECT_INTERACT') {
      if (event.objectId === 'bed') return { clipId: 'rest', startedAtMs: reaction.startedAtMs };
      if (event.objectId === 'alarm-clock') return { clipId: 'alarm_recoil', startedAtMs: reaction.startedAtMs };
      if (event.objectId === 'wardrobe') return { clipId: 'wardrobe_change', startedAtMs: reaction.startedAtMs };
      if (event.objectId === 'keys') return { clipId: 'collect_keys', startedAtMs: reaction.startedAtMs };
      if (event.objectId === 'window') return { clipId: 'window_react', startedAtMs: reaction.startedAtMs };
    }
  }

  const move = newest(active, ['WALLY_MOVE']);
  if (move) return { clipId: movementClip(state), startedAtMs: move.startedAtMs };

  return { clipId: idleClip(state), startedAtMs: 0 };
}

export function resolveWallyVisualFrame(state: SystemicRunState, active: readonly ActiveVisualEvent[], nowMs: number): WallyVisualFrame {
  const selection = selectWallyVisual(state, active, nowMs);
  const clip = requireAtlasClip(WALLY_INDEX, selection.clipId);
  const elapsed = selection.startedAtMs === 0 ? nowMs : Math.max(0, nowMs - selection.startedAtMs);
  const animation = resolveAnimationFrame(clip, elapsed);
  return {
    ...selection,
    animation,
    frame: requireAtlasFrame(WALLY_INDEX, animation.frameId),
  };
}
