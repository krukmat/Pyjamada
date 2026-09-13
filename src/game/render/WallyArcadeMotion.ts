import type { SystemicRunState } from '../systemic/SystemicState';

export type ArcadeEyeMode = 'normal' | 'sleepy' | 'wide' | 'squint';
export type ArcadeMouthMode = 'neutral' | 'smile' | 'gasp' | 'frown';
export type ArcadeArmMode = 'down' | 'forward' | 'up' | 'wide' | 'ears' | 'hips';

export type WallyArcadeMotion = {
  bobY?: number;
  bodyX?: number;
  headX?: number;
  headY?: number;
  crouch?: number;
  eyeMode?: ArcadeEyeMode;
  mouthMode?: ArcadeMouthMode;
  armMode?: ArcadeArmMode;
  step?: number;
};

function at<T>(frames: readonly T[], frameIndex: number): T {
  return frames[Math.min(Math.max(frameIndex, 0), frames.length - 1)];
}

/**
 * Presentation-only key-pose choreography.
 *
 * The manifest still owns clip identity/timing and WallyAnimator still owns
 * semantic selection. This layer only makes each resolved frame read like a
 * deliberate 80s arcade key pose: anticipation, impact and recovery instead
 * of several nearly-identical procedural drawings.
 */
export function resolveWallyArcadeMotion(
  clipId: string,
  frameIndex: number,
  state: SystemicRunState['wallyState'],
): WallyArcadeMotion {
  if (clipId === 'walk_sleepy') {
    return at([
      { bobY: 0, bodyX: -0.8, headX: -1.4, headY: 2.4, step: -1.6, eyeMode: 'sleepy', mouthMode: 'neutral', armMode: 'down' },
      { bobY: 0.8, bodyX: 0, headX: -0.8, headY: 3, crouch: 0.8, step: 0, eyeMode: 'sleepy', mouthMode: 'neutral', armMode: 'down' },
      { bobY: -0.6, bodyX: 0.7, headX: -0.3, headY: 2.1, step: 1.6, eyeMode: 'sleepy', mouthMode: 'neutral', armMode: 'down' },
    ] as const, frameIndex);
  }

  if (clipId === 'walk_normal') {
    return at([
      { bobY: 0, bodyX: -0.5, headX: -0.3, step: -1.8, eyeMode: 'normal', mouthMode: 'smile', armMode: 'forward' },
      { bobY: -1.5, bodyX: 0.2, headY: -0.8, step: 0, eyeMode: 'normal', mouthMode: 'smile', armMode: 'down' },
      { bobY: 0, bodyX: 0.7, headX: 0.5, step: 1.8, eyeMode: 'normal', mouthMode: 'smile', armMode: 'forward' },
    ] as const, frameIndex);
  }

  if (clipId === 'walk_rushed') {
    return at([
      { bobY: 0, bodyX: 2.2, headX: 3, step: -2, eyeMode: 'squint', mouthMode: 'frown', armMode: 'forward' },
      { bobY: -1.8, bodyX: 3, headX: 3.7, headY: -0.8, crouch: 0.6, step: 0, eyeMode: 'squint', mouthMode: 'frown', armMode: 'forward' },
      { bobY: 0, bodyX: 2.5, headX: 3.1, step: 2, eyeMode: 'squint', mouthMode: 'frown', armMode: 'forward' },
    ] as const, frameIndex);
  }

  if (clipId === 'walk_startled') {
    return at([
      { bobY: -1, bodyX: -1, headX: -1.5, headY: -1, step: -1.5, eyeMode: 'wide', mouthMode: 'gasp', armMode: 'wide' },
      { bobY: 0.5, bodyX: 1.2, headX: 1.8, crouch: 1, step: 1.5, eyeMode: 'wide', mouthMode: 'gasp', armMode: 'up' },
    ] as const, frameIndex);
  }

  if (clipId === 'wake') {
    return at([
      { bobY: 0, crouch: 4.2, headY: 3.5, eyeMode: 'sleepy', mouthMode: 'neutral', armMode: 'down' },
      { bobY: -2.2, crouch: 1, headY: -1.5, eyeMode: 'wide', mouthMode: 'gasp', armMode: 'wide' },
      { bobY: -0.8, crouch: 0, headY: -0.4, eyeMode: 'normal', mouthMode: 'smile', armMode: 'hips' },
    ] as const, frameIndex);
  }

  if (clipId === 'alarm_recoil') {
    return at([
      { bobY: 0, bodyX: 0, headX: 0.5, eyeMode: 'wide', mouthMode: 'gasp', armMode: 'down', step: 0 },
      { bobY: -2.5, bodyX: -3.2, headX: -4.2, headY: -1.4, eyeMode: 'wide', mouthMode: 'gasp', armMode: 'up', step: 1.8 },
      { bobY: -0.8, bodyX: -1.4, headX: -2.2, crouch: 1, eyeMode: 'wide', mouthMode: 'gasp', armMode: 'ears', step: 0.7 },
    ] as const, frameIndex);
  }

  if (clipId === 'fumble') {
    return at([
      { bodyX: 1, headX: 1.5, crouch: 1, eyeMode: 'wide', mouthMode: 'gasp', armMode: 'forward', step: -0.8 },
      { bobY: 1, bodyX: 3.7, headX: 4.4, headY: 2, crouch: 4, eyeMode: 'wide', mouthMode: 'gasp', armMode: 'forward', step: 2 },
      { bobY: -0.5, bodyX: 1.3, headX: 1.8, crouch: 2, eyeMode: 'wide', mouthMode: 'frown', armMode: 'wide', step: 0.5 },
    ] as const, frameIndex);
  }

  if (clipId === 'equip_slippers') {
    return at([
      { crouch: 2.2, headY: 2, eyeMode: 'normal', mouthMode: 'neutral', armMode: 'forward' },
      { crouch: 5.2, headY: 4.4, bodyX: 1, eyeMode: 'normal', mouthMode: 'neutral', armMode: 'forward' },
      { crouch: 2.5, headY: 1.2, bobY: -0.8, eyeMode: 'normal', mouthMode: 'smile', armMode: 'hips' },
    ] as const, frameIndex);
  }

  if (clipId === 'wardrobe_change') {
    return at([
      { bodyX: -1.2, step: -1.4, eyeMode: 'wide', mouthMode: 'neutral', armMode: 'wide' },
      { bobY: -2, bodyX: 1.5, headX: 1.5, step: 1.4, eyeMode: 'wide', mouthMode: 'gasp', armMode: 'wide' },
      { bobY: -0.8, bodyX: 0, headY: -0.5, step: 0, eyeMode: 'normal', mouthMode: 'smile', armMode: 'hips' },
      { bobY: 0, bodyX: 0, headY: -0.4, step: 0, eyeMode: 'normal', mouthMode: 'smile', armMode: 'hips' },
    ] as const, frameIndex);
  }

  if (clipId === 'collect_keys') {
    return at([
      { bodyX: 1, headX: 1.5, eyeMode: 'normal', mouthMode: 'neutral', armMode: 'forward' },
      { bobY: -2, bodyX: 1.8, headX: 2.2, headY: -1, eyeMode: 'wide', mouthMode: 'smile', armMode: 'forward' },
      { bobY: -0.5, bodyX: 0, headY: -0.5, eyeMode: 'normal', mouthMode: 'smile', armMode: 'hips' },
    ] as const, frameIndex);
  }

  if (clipId === 'window_react') {
    return at([
      { bodyX: 1, headX: 1.7, eyeMode: 'normal', mouthMode: 'neutral', armMode: 'forward' },
      { bobY: -1.2, bodyX: 0, headX: 1, eyeMode: 'wide', mouthMode: 'gasp', armMode: 'wide' },
      { bodyX: 0, headX: 0.5, eyeMode: 'normal', mouthMode: 'smile', armMode: 'hips' },
    ] as const, frameIndex);
  }

  if (clipId === 'rest') {
    return at([
      { crouch: 3, headY: 2.8, headX: -0.5, eyeMode: 'sleepy', mouthMode: 'neutral', armMode: 'down' },
      { crouch: 6, headY: 5.5, headX: -1.8, bodyX: -1, eyeMode: 'sleepy', mouthMode: 'neutral', armMode: 'down' },
      { crouch: 4.5, headY: 3.5, headX: -0.8, eyeMode: 'sleepy', mouthMode: 'smile', armMode: 'down' },
    ] as const, frameIndex);
  }

  if (clipId === 'success') {
    return at([
      { crouch: 2.2, bobY: 0.5, headY: 1, eyeMode: 'normal', mouthMode: 'smile', armMode: 'hips', step: 0 },
      { crouch: 0, bobY: -5.2, headY: -1.5, eyeMode: 'wide', mouthMode: 'smile', armMode: 'up', step: -1.4 },
      { crouch: 0, bobY: -7.2, headY: -2, eyeMode: 'wide', mouthMode: 'smile', armMode: 'up', step: 1.4 },
      { crouch: 0.5, bobY: -0.8, headY: -0.5, eyeMode: 'normal', mouthMode: 'smile', armMode: 'hips', step: 0 },
    ] as const, frameIndex);
  }

  if (clipId === 'fail_noise') {
    return at([
      { bobY: -0.8, bodyX: -0.8, headX: -1.2, eyeMode: 'wide', mouthMode: 'gasp', armMode: 'wide' },
      { bobY: -1.8, crouch: 0.8, headY: -1.4, eyeMode: 'wide', mouthMode: 'gasp', armMode: 'ears' },
      { bobY: 0, crouch: 1.5, headY: 0.4, eyeMode: 'wide', mouthMode: 'frown', armMode: 'ears' },
    ] as const, frameIndex);
  }

  if (clipId === 'fail_exhausted') {
    return at([
      { crouch: 2.4, headY: 2.4, headX: -0.5, eyeMode: 'sleepy', mouthMode: 'frown', armMode: 'down' },
      { crouch: 5.2, headY: 4.8, headX: -1.5, bodyX: -0.8, eyeMode: 'sleepy', mouthMode: 'frown', armMode: 'down' },
      { crouch: 7, headY: 6.5, headX: -2.5, bodyX: -1.8, bobY: 1, eyeMode: 'sleepy', mouthMode: 'frown', armMode: 'down' },
    ] as const, frameIndex);
  }

  if (clipId === 'fail_late') {
    return at([
      { bodyX: 0, headX: 0, eyeMode: 'squint', mouthMode: 'frown', armMode: 'hips', step: 0 },
      { bobY: -1.5, bodyX: -1.2, headX: -1.8, eyeMode: 'wide', mouthMode: 'gasp', armMode: 'wide', step: -1 },
      { bodyX: 3, headX: 3.5, crouch: 1, eyeMode: 'squint', mouthMode: 'frown', armMode: 'forward', step: 1.2 },
    ] as const, frameIndex);
  }

  if (clipId === 'idle_sleepy') {
    return frameIndex % 2 === 0
      ? { bodyX: -0.7, headX: -1.8, headY: 2.4, crouch: 1, eyeMode: 'sleepy', mouthMode: 'neutral', armMode: 'down' }
      : { bobY: 0.5, bodyX: -0.9, headX: -2, headY: 3.2, crouch: 1.4, eyeMode: 'sleepy', mouthMode: 'neutral', armMode: 'down' };
  }

  if (clipId === 'idle_normal') {
    return frameIndex % 2 === 0
      ? { headY: -0.4, eyeMode: 'normal', mouthMode: 'smile', armMode: 'hips' }
      : { bobY: -0.5, headY: -0.8, eyeMode: 'normal', mouthMode: 'smile', armMode: 'hips' };
  }

  if (clipId === 'idle_rushed') {
    return frameIndex % 2 === 0
      ? { bodyX: 1.5, headX: 2.4, bobY: 0, eyeMode: 'squint', mouthMode: 'frown', armMode: 'forward', step: -0.4 }
      : { bodyX: 2, headX: 2.8, bobY: -1.2, headY: -0.7, eyeMode: 'squint', mouthMode: 'frown', armMode: 'forward', step: 0.6 };
  }

  if (clipId === 'idle_startled') {
    return frameIndex % 2 === 0
      ? { bobY: -1, headY: -1, eyeMode: 'wide', mouthMode: 'gasp', armMode: 'wide' }
      : { bobY: 0, crouch: 0.8, headY: 0, eyeMode: 'wide', mouthMode: 'gasp', armMode: 'up' };
  }

  if (state === 'rushed') return { bodyX: 1.3, headX: 2, eyeMode: 'squint', mouthMode: 'frown' };
  if (state === 'startled') return { bobY: -0.8, eyeMode: 'wide', mouthMode: 'gasp', armMode: 'wide' };
  return {};
}
