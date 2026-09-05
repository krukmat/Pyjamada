import { resolveAnimationFrame } from './AnimationTypes';
import type { ActiveVisualEvent } from './PresentationRuntime';
import { createSpriteAtlasIndex, requireAtlasClip, requireAtlasFrame, type AtlasFrame } from './atlas/SpriteAtlas';
import { DOMESTIC_FX_ATLAS } from './atlas/manifests';
import { OBJECT_VISUAL_ORIGINS, type VisualOrigin } from './VisualEvent';

const FX_INDEX = createSpriteAtlasIndex(DOMESTIC_FX_ATLAS);

export type FxVisualFrame = {
  key: string;
  clipId: string;
  x: number;
  y: number;
  frame: AtlasFrame;
};

// FINDING-003 / F-04: every FX-capable event either owns a fixed object
// origin or carries the immutable `origin` captured when the mapper created
// it (see VisualEventMapper.actionOrigin). Nothing here re-derives a
// position from the runtime's current/latest gameplay state.
function originFor(entry: ActiveVisualEvent): VisualOrigin {
  const event = entry.event;
  switch (event.type) {
    case 'OBJECT_INTERACT':
    case 'OBJECT_COLLECT':
    case 'EQUIPMENT_CHANGED':
      return OBJECT_VISUAL_ORIGINS[event.objectId];
    case 'WINDOW_OPENED':
      return OBJECT_VISUAL_ORIGINS.window;
    case 'WALLY_STARTLE':
    case 'WALLY_FUMBLE':
    case 'WALLY_RUSH':
    case 'WALLY_MOVE':
    case 'NOISE_BURST':
    case 'ENERGY_GAIN':
    case 'OBJECTIVE_SUCCESS':
    case 'OBJECTIVE_FAILURE':
      return event.origin;
    default:
      return { x: 0, y: 88 };
  }
}

function clipFor(entry: ActiveVisualEvent): string | undefined {
  const event = entry.event;
  switch (event.type) {
    case 'WALLY_STARTLE': return 'shock';
    case 'WALLY_FUMBLE': return 'dust';
    case 'WALLY_RUSH': return 'motion_streak';
    case 'WALLY_MOVE': return event.quiet ? 'quiet_footsteps' : undefined;
    case 'OBJECT_COLLECT': return 'sparkle';
    case 'EQUIPMENT_CHANGED': return 'sparkle';
    case 'WINDOW_OPENED': return 'motion_streak';
    case 'NOISE_BURST': return 'noise';
    case 'ENERGY_GAIN': return 'sparkle';
    case 'OBJECTIVE_SUCCESS': return 'success_pop';
    case 'OBJECTIVE_FAILURE': return 'failure_burst';
    case 'OBJECT_INTERACT': return event.objectId === 'bed' ? 'sleep_z' : event.objectId === 'wardrobe' ? 'clothing_burst' : undefined;
    default: return undefined;
  }
}

export function resolveFxFrames(active: readonly ActiveVisualEvent[], nowMs: number): FxVisualFrame[] {
  return active.flatMap((entry) => {
    const clipId = clipFor(entry);
    if (!clipId) return [];
    const clip = requireAtlasClip(FX_INDEX, clipId);
    const animation = resolveAnimationFrame(clip, Math.max(0, nowMs - entry.startedAtMs));
    if (animation.completed && clip.loop === 'once') return [];
    const origin = originFor(entry);
    const yOffset = clipId === 'quiet_footsteps' ? 14 : clipId === 'sleep_z' ? -8 : clipId === 'shock' ? -9 : 0;
    return [{
      key: `${entry.id}:${clipId}`,
      clipId,
      x: origin.x,
      y: origin.y + yOffset,
      frame: requireAtlasFrame(FX_INDEX, animation.frameId),
    }];
  });
}

export function resolveScreenShake(active: readonly ActiveVisualEvent[], nowMs: number): { x: number; y: number } {
  const strong = [...active].reverse().find((entry) => entry.event.type === 'NOISE_BURST' && entry.event.intensity === 'strong');
  if (!strong) return { x: 0, y: 0 };
  const phase = Math.floor((nowMs - strong.startedAtMs) / 55);
  if (phase > 6) return { x: 0, y: 0 };
  return { x: phase % 2 === 0 ? 1 : -1, y: phase % 3 === 0 ? 1 : 0 };
}
