import { resolveAnimationFrame, type ResolvedAnimationFrame } from './AnimationTypes';
import type { ActiveVisualEvent } from './PresentationRuntime';
import type { SystemicObjectId, SystemicRunState } from '../systemic/SystemicState';
import { createSpriteAtlasIndex, requireAtlasClip, requireAtlasFrame, type AtlasFrame } from './atlas/SpriteAtlas';
import { BEDROOM_OBJECTS_ATLAS } from './atlas/manifests';

const OBJECT_INDEX = createSpriteAtlasIndex(BEDROOM_OBJECTS_ATLAS);

export type ObjectVisualFrame = {
  objectId: SystemicObjectId;
  clipId: string;
  startedAtMs: number;
  frame: AtlasFrame;
  animation: ResolvedAnimationFrame;
};

function newestForObject(active: readonly ActiveVisualEvent[], objectId: SystemicObjectId): ActiveVisualEvent | undefined {
  return [...active]
    .filter((entry) => {
      const event = entry.event;
      if (event.type === 'OBJECT_INTERACT' || event.type === 'OBJECT_COLLECT' || event.type === 'EQUIPMENT_CHANGED') return event.objectId === objectId;
      if (objectId === 'window') return event.type === 'WINDOW_OPENED' || event.type === 'WINDOW_CLOSED';
      return objectId === 'wardrobe' && event.type === 'WALLY_FUMBLE';
    })
    .sort((a, b) => b.startedAtMs - a.startedAtMs || b.id - a.id)[0];
}

function stableClip(state: SystemicRunState, objectId: SystemicObjectId): string {
  switch (objectId) {
    case 'bed': return 'bed_idle';
    case 'slippers': return state.equipped.includes('slippers') ? 'slippers_empty' : 'slippers_idle';
    case 'alarm-clock': return 'alarm_idle';
    case 'wardrobe': return state.flags.dressed ? 'wardrobe_dressed' : 'wardrobe_closed';
    case 'keys': return state.collected.includes('keys') ? 'keys_empty' : 'keys_pulse';
    case 'window': return state.flags.windowOpen ? 'window_open' : 'window_closed';
  }
}

function reactionClip(state: SystemicRunState, objectId: SystemicObjectId, entry: ActiveVisualEvent): string | undefined {
  const event = entry.event;
  if (event.type === 'WALLY_FUMBLE' && objectId === 'wardrobe') return 'wardrobe_fumble';
  if (event.type === 'WINDOW_OPENED' && objectId === 'window') return 'window_opening';
  if (event.type === 'WINDOW_CLOSED' && objectId === 'window') return 'window_closing';
  if (event.type === 'OBJECT_COLLECT' && objectId === 'keys') return 'keys_collect';
  if (event.type === 'EQUIPMENT_CHANGED' && objectId === 'slippers') return 'slippers_equip';
  if (event.type !== 'OBJECT_INTERACT' || event.objectId !== objectId) return undefined;

  switch (objectId) {
    case 'bed': return 'bed_rest';
    case 'slippers': return 'slippers_equip';
    case 'alarm-clock': return event.count > 1 ? 'alarm_ring_strong' : 'alarm_ring';
    case 'wardrobe': return state.wallyState === 'rushed' ? 'wardrobe_scramble' : state.wallyState === 'startled' ? 'wardrobe_fumble' : 'wardrobe_clothes';
    case 'keys': return 'keys_collect';
    case 'window': return state.flags.windowOpen ? 'window_opening' : 'window_closing';
  }
}

export function resolveObjectVisualFrame(state: SystemicRunState, objectId: SystemicObjectId, active: readonly ActiveVisualEvent[], nowMs: number): ObjectVisualFrame {
  const entry = newestForObject(active, objectId);
  const clipId = entry ? reactionClip(state, objectId, entry) ?? stableClip(state, objectId) : stableClip(state, objectId);
  const startedAtMs = entry ? entry.startedAtMs : 0;
  const clip = requireAtlasClip(OBJECT_INDEX, clipId);
  const elapsed = startedAtMs === 0 ? nowMs : Math.max(0, nowMs - startedAtMs);
  const animation = resolveAnimationFrame(clip, elapsed);
  return {
    objectId,
    clipId,
    startedAtMs,
    animation,
    frame: requireAtlasFrame(OBJECT_INDEX, animation.frameId),
  };
}
