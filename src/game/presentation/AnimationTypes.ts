export type AnimationLoopMode = 'once' | 'loop' | 'hold';

export type AnimationFrameRef = {
  frameId: string;
  durationMs: number;
};

export type AnimationClip = {
  id: string;
  frames: readonly AnimationFrameRef[];
  loop: AnimationLoopMode;
};

export type ResolvedAnimationFrame = {
  frameId: string;
  frameIndex: number;
  elapsedInFrameMs: number;
  completed: boolean;
};

export function animationClipDurationMs(clip: AnimationClip): number {
  return clip.frames.reduce((total, frame) => total + frame.durationMs, 0);
}

export function validateAnimationClip(clip: AnimationClip): string[] {
  const errors: string[] = [];
  if (!clip.id.trim()) errors.push('clip id is required');
  if (clip.frames.length === 0) errors.push(`clip ${clip.id || '<unnamed>'} has no frames`);
  clip.frames.forEach((frame, index) => {
    if (!frame.frameId.trim()) errors.push(`clip ${clip.id}: frame ${index} has no frameId`);
    if (!Number.isInteger(frame.durationMs) || frame.durationMs <= 0) {
      errors.push(`clip ${clip.id}: frame ${frame.frameId || index} has invalid duration`);
    }
  });
  return errors;
}

export function resolveAnimationFrame(clip: AnimationClip, elapsedMs: number): ResolvedAnimationFrame {
  const errors = validateAnimationClip(clip);
  if (errors.length) throw new Error(errors.join('; '));

  const total = animationClipDurationMs(clip);
  const safeElapsed = Math.max(0, Math.floor(elapsedMs));
  const completed = clip.loop !== 'loop' && safeElapsed >= total;
  const timeline = clip.loop === 'loop'
    ? safeElapsed % total
    : Math.min(safeElapsed, Math.max(0, total - 1));

  let cursor = 0;
  for (let index = 0; index < clip.frames.length; index += 1) {
    const frame = clip.frames[index];
    const end = cursor + frame.durationMs;
    if (timeline < end || index === clip.frames.length - 1) {
      return {
        frameId: frame.frameId,
        frameIndex: index,
        elapsedInFrameMs: timeline - cursor,
        completed,
      };
    }
    cursor = end;
  }

  throw new Error(`clip ${clip.id} could not resolve frame`);
}
