import type { AnimationLoopMode } from '../AnimationTypes';
import type { SpriteAtlasManifest } from './SpriteAtlas';

type ClipSpec = {
  id: string;
  count: number;
  durations: readonly number[];
  loop: AnimationLoopMode;
};

function uniform(count: number, durationMs: number): number[] {
  return Array.from({ length: count }, () => durationMs);
}

function buildGridAtlas(
  id: string,
  width: number,
  height: number,
  frameWidth: number,
  frameHeight: number,
  columns: number,
  anchorX: number,
  anchorY: number,
  specs: readonly ClipSpec[],
): SpriteAtlasManifest {
  let cursor = 0;
  const frames: SpriteAtlasManifest['frames'][number][] = [];
  const clips: SpriteAtlasManifest['clips'][number][] = [];

  specs.forEach((spec) => {
    if (spec.durations.length !== spec.count) throw new Error(`clip ${spec.id} duration count mismatch`);
    const clipFrames = Array.from({ length: spec.count }, (_, index) => {
      const frameId = `${spec.id}_${index}`;
      const frameIndex = cursor++;
      frames.push({
        id: frameId,
        x: (frameIndex % columns) * frameWidth,
        y: Math.floor(frameIndex / columns) * frameHeight,
        width: frameWidth,
        height: frameHeight,
        anchorX,
        anchorY,
      });
      return { frameId, durationMs: spec.durations[index] };
    });
    clips.push({ id: spec.id, loop: spec.loop, frames: clipFrames });
  });

  return { id, width, height, frames, clips };
}

const WALLY_CLIPS: readonly ClipSpec[] = [
  { id: 'idle_sleepy', count: 2, durations: [520, 560], loop: 'loop' },
  { id: 'idle_normal', count: 2, durations: [420, 460], loop: 'loop' },
  { id: 'idle_rushed', count: 2, durations: [180, 180], loop: 'loop' },
  { id: 'idle_startled', count: 2, durations: [160, 180], loop: 'loop' },
  { id: 'walk_sleepy', count: 3, durations: uniform(3, 180), loop: 'loop' },
  { id: 'walk_normal', count: 3, durations: uniform(3, 130), loop: 'loop' },
  { id: 'walk_rushed', count: 3, durations: uniform(3, 90), loop: 'loop' },
  { id: 'walk_startled', count: 2, durations: uniform(2, 110), loop: 'loop' },
  { id: 'wake', count: 3, durations: [120, 140, 180], loop: 'hold' },
  { id: 'alarm_recoil', count: 3, durations: [100, 120, 180], loop: 'hold' },
  { id: 'fumble', count: 3, durations: [100, 120, 160], loop: 'hold' },
  { id: 'equip_slippers', count: 3, durations: [100, 140, 180], loop: 'hold' },
  { id: 'wardrobe_change', count: 4, durations: [100, 120, 140, 220], loop: 'hold' },
  { id: 'collect_keys', count: 3, durations: [90, 120, 180], loop: 'hold' },
  { id: 'window_react', count: 3, durations: [100, 140, 180], loop: 'hold' },
  { id: 'rest', count: 3, durations: [180, 240, 220], loop: 'hold' },
  { id: 'success', count: 4, durations: [110, 130, 160, 300], loop: 'hold' },
  { id: 'fail_noise', count: 3, durations: [100, 120, 220], loop: 'hold' },
  { id: 'fail_exhausted', count: 3, durations: [160, 180, 260], loop: 'hold' },
  { id: 'fail_late', count: 3, durations: [100, 110, 220], loop: 'hold' },
];

const OBJECT_CLIPS: readonly ClipSpec[] = [
  { id: 'bed_idle', count: 1, durations: [1000], loop: 'hold' },
  { id: 'bed_rest', count: 3, durations: uniform(3, 140), loop: 'hold' },
  { id: 'slippers_idle', count: 1, durations: [1000], loop: 'hold' },
  { id: 'slippers_equip', count: 3, durations: [100, 120, 180], loop: 'hold' },
  { id: 'slippers_empty', count: 1, durations: [1000], loop: 'hold' },
  { id: 'alarm_idle', count: 1, durations: [1000], loop: 'hold' },
  { id: 'alarm_ring', count: 3, durations: uniform(3, 90), loop: 'loop' },
  { id: 'alarm_ring_strong', count: 3, durations: uniform(3, 80), loop: 'loop' },
  { id: 'wardrobe_closed', count: 1, durations: [1000], loop: 'hold' },
  { id: 'wardrobe_opening', count: 3, durations: uniform(3, 100), loop: 'hold' },
  { id: 'wardrobe_open', count: 1, durations: [1000], loop: 'hold' },
  { id: 'wardrobe_clothes', count: 3, durations: uniform(3, 120), loop: 'hold' },
  { id: 'wardrobe_dressed', count: 1, durations: [1000], loop: 'hold' },
  { id: 'wardrobe_scramble', count: 3, durations: uniform(3, 100), loop: 'hold' },
  { id: 'wardrobe_fumble', count: 3, durations: uniform(3, 100), loop: 'hold' },
  { id: 'keys_idle', count: 1, durations: [1000], loop: 'hold' },
  { id: 'keys_pulse', count: 2, durations: [420, 420], loop: 'loop' },
  { id: 'keys_collect', count: 3, durations: [90, 110, 160], loop: 'hold' },
  { id: 'keys_empty', count: 1, durations: [1000], loop: 'hold' },
  { id: 'window_closed', count: 1, durations: [1000], loop: 'hold' },
  { id: 'window_opening', count: 3, durations: uniform(3, 100), loop: 'hold' },
  { id: 'window_open', count: 1, durations: [1000], loop: 'hold' },
  { id: 'window_closing', count: 3, durations: uniform(3, 100), loop: 'hold' },
];

const FX_CLIPS: readonly ClipSpec[] = [
  { id: 'shock', count: 3, durations: uniform(3, 90), loop: 'once' },
  { id: 'noise', count: 3, durations: uniform(3, 90), loop: 'once' },
  { id: 'dust', count: 3, durations: uniform(3, 90), loop: 'once' },
  { id: 'quiet_footsteps', count: 2, durations: uniform(2, 100), loop: 'once' },
  { id: 'sparkle', count: 3, durations: uniform(3, 90), loop: 'once' },
  { id: 'sleep_z', count: 3, durations: uniform(3, 140), loop: 'once' },
  { id: 'motion_streak', count: 3, durations: uniform(3, 80), loop: 'once' },
  { id: 'clothing_burst', count: 3, durations: uniform(3, 100), loop: 'once' },
  { id: 'success_pop', count: 3, durations: uniform(3, 120), loop: 'once' },
  { id: 'failure_burst', count: 3, durations: uniform(3, 120), loop: 'once' },
];

export const WALLY_ATLAS = buildGridAtlas('wally', 240, 168, 24, 28, 10, 12, 27, WALLY_CLIPS);
export const BEDROOM_OBJECTS_ATLAS = buildGridAtlas('bedroom-objects', 256, 192, 32, 32, 8, 16, 31, OBJECT_CLIPS);
export const DOMESTIC_FX_ATLAS = buildGridAtlas('domestic-fx', 128, 64, 16, 16, 8, 8, 8, FX_CLIPS);

export const ALL_GAME_ATLASES = [WALLY_ATLAS, BEDROOM_OBJECTS_ATLAS, DOMESTIC_FX_ATLAS] as const;
