import { resolveAnimationFrame, type ResolvedAnimationFrame } from './AnimationTypes';
import type { ActiveVisualEvent } from './PresentationRuntime';
import type { SystemicRunState } from '../systemic/SystemicState';
import { createSpriteAtlasIndex, requireAtlasClip, requireAtlasFrame, type AtlasFrame } from './atlas/SpriteAtlas';
import { WALLY_ATLAS } from './atlas/manifests';
import { ACTOR_WALLY_CHANNEL, OBJECTIVE_CHANNEL, visualEventChannel } from './VisualEvent';

const WALLY_INDEX = createSpriteAtlasIndex(WALLY_ATLAS);

type WallyVisualSelection = {
  clipId: string;
  startedAtMs: number;
};

export type WallyVisualFrame = WallyVisualSelection & {
  frame: AtlasFrame;
  animation: ResolvedAnimationFrame;
};

function newestOnChannel(events: readonly ActiveVisualEvent[], channel: string): ActiveVisualEvent | undefined {
  return [...events]
    .filter((entry) => visualEventChannel(entry.event) === channel)
    .sort((a, b) => b.startedAtMs - a.startedAtMs || b.id - a.id)[0];
}

function idleClip(state: SystemicRunState): string {
  return `idle_${state.wallyState}`;
}

function movementClip(state: SystemicRunState): string {
  return `walk_${state.wallyState}`;
}

function reactionClip(cause: 'bed' | 'alarm-clock' | 'wardrobe' | 'keys' | 'window' | 'slippers'): string {
  switch (cause) {
    case 'bed': return 'rest';
    case 'alarm-clock': return 'alarm_recoil';
    case 'wardrobe': return 'wardrobe_change';
    case 'keys': return 'collect_keys';
    case 'window': return 'window_react';
    case 'slippers': return 'equip_slippers';
  }
}

export function selectWallyVisual(state: SystemicRunState, active: readonly ActiveVisualEvent[], nowMs: number): WallyVisualSelection {
  const objective = newestOnChannel(active, OBJECTIVE_CHANNEL);
  if (objective?.event.type === 'OBJECTIVE_SUCCESS') return { clipId: 'success', startedAtMs: objective.startedAtMs };
  if (objective?.event.type === 'OBJECTIVE_FAILURE') {
    const clipId = objective.event.reason === 'house-awake'
      ? 'fail_noise'
      : objective.event.reason === 'exhausted'
        ? 'fail_exhausted'
        : 'fail_late';
    return { clipId, startedAtMs: objective.startedAtMs };
  }

  const actor = newestOnChannel(active, ACTOR_WALLY_CHANNEL);
  if (actor) {
    const event = actor.event;
    if (event.type === 'WALLY_FUMBLE') return { clipId: 'fumble', startedAtMs: actor.startedAtMs };
    if (event.type === 'WALLY_STARTLE') return { clipId: 'alarm_recoil', startedAtMs: actor.startedAtMs };
    if (event.type === 'WALLY_WAKE') return { clipId: 'wake', startedAtMs: actor.startedAtMs };
    if (event.type === 'WALLY_REACT') return { clipId: reactionClip(event.cause), startedAtMs: actor.startedAtMs };
    if (event.type === 'WALLY_MOVE') return { clipId: movementClip(state), startedAtMs: actor.startedAtMs };
  }

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
