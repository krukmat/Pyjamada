import type { AnimationClip } from '../AnimationTypes';
import { validateAnimationClip } from '../AnimationTypes';

export type AtlasFrame = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  anchorX: number;
  anchorY: number;
};

export type SpriteAtlasManifest = {
  id: string;
  width: number;
  height: number;
  frames: readonly AtlasFrame[];
  clips: readonly AnimationClip[];
};

export type SpriteAtlasIndex = {
  manifest: SpriteAtlasManifest;
  frameById: ReadonlyMap<string, AtlasFrame>;
  clipById: ReadonlyMap<string, AnimationClip>;
};

function isInteger(value: number): boolean {
  return Number.isInteger(value);
}

export function validateSpriteAtlasManifest(manifest: SpriteAtlasManifest): string[] {
  const errors: string[] = [];
  if (!manifest.id.trim()) errors.push('atlas id is required');
  if (!isInteger(manifest.width) || manifest.width <= 0) errors.push(`atlas ${manifest.id}: invalid width`);
  if (!isInteger(manifest.height) || manifest.height <= 0) errors.push(`atlas ${manifest.id}: invalid height`);

  const frameIds = new Set<string>();
  manifest.frames.forEach((frame) => {
    if (!frame.id.trim()) errors.push(`atlas ${manifest.id}: frame id is required`);
    if (frameIds.has(frame.id)) errors.push(`atlas ${manifest.id}: duplicate frame ${frame.id}`);
    frameIds.add(frame.id);

    const integerFields = [frame.x, frame.y, frame.width, frame.height, frame.anchorX, frame.anchorY];
    if (integerFields.some((value) => !isInteger(value))) {
      errors.push(`atlas ${manifest.id}: frame ${frame.id} must use integer coordinates`);
    }
    if (frame.width <= 0 || frame.height <= 0) errors.push(`atlas ${manifest.id}: frame ${frame.id} has invalid dimensions`);
    if (frame.x < 0 || frame.y < 0 || frame.x + frame.width > manifest.width || frame.y + frame.height > manifest.height) {
      errors.push(`atlas ${manifest.id}: frame ${frame.id} is outside atlas bounds`);
    }
  });

  const clipIds = new Set<string>();
  manifest.clips.forEach((clip) => {
    if (clipIds.has(clip.id)) errors.push(`atlas ${manifest.id}: duplicate clip ${clip.id}`);
    clipIds.add(clip.id);
    validateAnimationClip(clip).forEach((error) => errors.push(`atlas ${manifest.id}: ${error}`));
    clip.frames.forEach((frame) => {
      if (!frameIds.has(frame.frameId)) errors.push(`atlas ${manifest.id}: clip ${clip.id} references missing frame ${frame.frameId}`);
    });
  });

  return errors;
}

export function createSpriteAtlasIndex(manifest: SpriteAtlasManifest): SpriteAtlasIndex {
  const errors = validateSpriteAtlasManifest(manifest);
  if (errors.length) throw new Error(errors.join('; '));
  return {
    manifest,
    frameById: new Map(manifest.frames.map((frame) => [frame.id, frame])),
    clipById: new Map(manifest.clips.map((clip) => [clip.id, clip])),
  };
}

export function requireAtlasFrame(index: SpriteAtlasIndex, frameId: string): AtlasFrame {
  const frame = index.frameById.get(frameId);
  if (!frame) throw new Error(`atlas ${index.manifest.id}: missing frame ${frameId}`);
  return frame;
}

export function requireAtlasClip(index: SpriteAtlasIndex, clipId: string): AnimationClip {
  const clip = index.clipById.get(clipId);
  if (!clip) throw new Error(`atlas ${index.manifest.id}: missing clip ${clipId}`);
  return clip;
}
