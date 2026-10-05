/**
 * Phase 1 / step 4 of docs/ARCADE_PIXEL_ART_DIRECTION.md — Wally, redrawn as
 * committed pixel data.
 *
 * Original art. The reference games inform the principles only: a small
 * palette, wide value separation, a selective outline that is dark but not
 * pure black, and three value steps per material so a form reads as solid.
 *
 * ## Geometry
 *
 * The frame is 24x28 with the anchor at (12, 27): horizontally centred, one
 * pixel above the bottom edge, where Wally's feet plant. He is drawn about 22px
 * tall, leaving headroom for frames that stretch upward and side room for the
 * ones that lean. Rows shorter than 24 characters are padded with transparent
 * by the generator, so only the drawn part of each row appears here.
 *
 * ## Character
 *
 * A boy in blue striped pyjamas, brown hair, red slippers. The silhouette is
 * built to read at a glance: a round head roughly a third of the body height,
 * a clear neck break, and arms that separate from the torso rather than merging
 * into it. Poses move a limb away from the body so they stay legible in
 * silhouette, without relying on colour.
 *
 * ## Scope of this step
 *
 * The user scoped step 4 to four hand-drawn clips — the ones a static
 * screenshot exercises — with the remaining sixteen derived so all twenty still
 * resolve. Derived clips are honest placeholders: they reuse hand-drawn frames
 * under the correct clip ids and frame counts, so clip resolution, frame counts
 * and timing are all real, but they do not yet carry their own drawing.
 * `DERIVED_CLIPS` records exactly which those are.
 *
 * Legend, from ArcadePalette's flattened warm-pole layout:
 *
 *   .  transparent   F  ink (outline)
 *   1234  skin        5678  hair
 *   9abc  cloth — blue pyjamas
 *   defg  clothAccent — red slippers and trim
 */

import { arcadePalette, paletteColors } from './ArcadePalette';
import type { PixelFrame, SpriteSource } from './index';

/**
 * Wally is a warm-pole character: he is drawn at the bedroom's register. The
 * gothic pole applies to the rooms he walks into later, not to his own source.
 */
export const WALLY_PALETTE: readonly string[] = paletteColors(arcadePalette(0));

export const FRAME_WIDTH = 24;
export const FRAME_HEIGHT = 28;

// Standing at rest, weight even, arms down. This is the reference pose; every
// other frame is a deliberate departure from it.
const IDLE_NORMAL_0: readonly string[] = [
  '',
  '',
  '',
  '',
  '',
  '........FFFFFFFF',
  '.......F56777765F',
  '......F5677777776F',
  '......F56777777776F',
  '......F1F3444443F1F',
  '......F13444444431F',
  '......F13F44444F43F',
  '......F13444444431F',
  '......F11344444331F',
  '.......F11333331F',
  '.........FFFFFF',
  '.......FF9bccb9FF',
  '......F19bcbbcb91F',
  '.....F13F9bccb9F31F',
  '.....F13F9bbbb9F31F',
  '.....F11FF9bb9FF11F',
  '......F..F9bb9F..F',
  '.........F9F9F',
  '........F9b9F9b9F',
  '........F9b9F9b9F',
  '.......Fdefg.Fdefg',
  '.......FFFFF..FFFFF',
  '',
];

// Idle breath: shoulders drop one pixel, head settles. The two-frame loop reads
// as breathing rather than as a jitter because only the torso moves.
const IDLE_NORMAL_1: readonly string[] = [
  '',
  '',
  '',
  '',
  '',
  '',
  '........FFFFFFFF',
  '.......F56777765F',
  '......F5677777776F',
  '......F56777777776F',
  '......F1F3444443F1F',
  '......F13444444431F',
  '......F13F44444F43F',
  '......F13444444431F',
  '......F11344444331F',
  '.......F11333331F',
  '.........FFFFFF',
  '.......FF9bccb9FF',
  '......F19bcbbcb91F',
  '.....F13F9bccb9F31F',
  '.....F11FF9bb9FF11F',
  '......F..F9bb9F..F',
  '.........F9F9F',
  '........F9b9F9b9F',
  '........F9b9F9b9F',
  '.......Fdefg.Fdefg',
  '.......FFFFF..FFFFF',
  '',
];

// Sleepy idle: head tilts, eyes are closed to a line, shoulders slump forward.
// The closed eye is the single clearest read of the state at this size.
const IDLE_SLEEPY_0: readonly string[] = [
  '',
  '',
  '',
  '',
  '',
  '',
  '........FFFFFFFF',
  '.......F56777765F',
  '......F5677777776F',
  '......F56777777776F',
  '......F1F3444443F1F',
  '......F13444444431F',
  '......F134FF4FF443F',
  '......F13444444431F',
  '......F11344444331F',
  '.......F11333331F',
  '.........FFFFFF',
  '.......FF9bccb9FF',
  '......F19bcbbcb91F',
  '.....F13F9bccb9F31F',
  '.....F13F9bbbb9F31F',
  '.....F11FF9bb9FF11F',
  '......F..F9bb9F..F',
  '.........F9F9F',
  '........F9b9F9b9F',
  '........F9b9F9b9F',
  '.......Fdefg.Fdefg',
  '.......FFFFF..FFFFF',
];

// Deeper slump: the whole figure sinks a pixel and the head tips further.
const IDLE_SLEEPY_1: readonly string[] = [
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '........FFFFFFFF',
  '.......F56777765F',
  '......F5677777776F',
  '......F56777777776F',
  '......F1F3444443F1F',
  '......F13444444431F',
  '......F134FF4FF443F',
  '......F13444444431F',
  '......F11344444331F',
  '.......F11333331F',
  '.........FFFFFF',
  '.......FF9bccb9FF',
  '......F19bcbbcb91F',
  '.....F13F9bccb9F31F',
  '.....F11FF9bb9FF11F',
  '......F..F9bb9F..F',
  '.........F9F9F',
  '........F9b9F9b9F',
  '........F9b9F9b9F',
  '.......Fdefg.Fdefg',
  '.......FFFFF..FFFFF',
];

// Walk, contact pose: legs scissored wide, leading arm forward. The widest
// silhouette of the cycle.
const WALK_NORMAL_0: readonly string[] = [
  '',
  '',
  '',
  '',
  '',
  '........FFFFFFFF',
  '.......F56777765F',
  '......F5677777776F',
  '......F56777777776F',
  '......F1F3444443F1F',
  '......F13444444431F',
  '......F13F44444F43F',
  '......F13444444431F',
  '......F11344444331F',
  '.......F11333331F',
  '.........FFFFFF',
  '....F13FF9bccb9FF31F',
  '....F134F9bcbbcb9F1F',
  '.....F1F9bccb9F31F',
  '......FF9bbbb9FF',
  '.......F9bb9b9F',
  '......F9b9F.F9b9F',
  '.....F9b9F...F9b9F',
  '....F9b9F.....F9b9F',
  '...Fdefg.......Fdefg',
  '...FFFFF.......FFFFF',
  '',
  '',
];

// Walk, passing pose: legs together under the body, figure lifts a pixel.
const WALK_NORMAL_1: readonly string[] = [
  '',
  '',
  '',
  '',
  '........FFFFFFFF',
  '.......F56777765F',
  '......F5677777776F',
  '......F56777777776F',
  '......F1F3444443F1F',
  '......F13444444431F',
  '......F13F44444F43F',
  '......F13444444431F',
  '......F11344444331F',
  '.......F11333331F',
  '.........FFFFFF',
  '.......FF9bccb9FF',
  '......F19bcbbcb91F',
  '.....F13F9bccb9F31F',
  '.....F13F9bbbb9F31F',
  '.....F11FF9bb9FF11F',
  '..........F9bb9F',
  '.........F9b99b9F',
  '.........F9b9F9b9F',
  '.........F9b9F9b9F',
  '........Fdefg.Fdefg',
  '........FFFFF.FFFFF',
  '',
  '',
];

// Walk, opposite contact: the mirror of the stride, trailing arm forward.
const WALK_NORMAL_2: readonly string[] = [
  '',
  '',
  '',
  '',
  '',
  '........FFFFFFFF',
  '.......F56777765F',
  '......F5677777776F',
  '......F56777777776F',
  '......F1F3444443F1F',
  '......F13444444431F',
  '......F13F44444F43F',
  '......F13444444431F',
  '......F11344444331F',
  '.......F11333331F',
  '.........FFFFFF',
  '....F13FF9bccb9FF31F',
  '....F1F9bcbbcb9F431F',
  '......F13F9bccb9F1F',
  '......FF9bbbb9FF',
  '.......F9b9bb9F',
  '......F9b9F.F9b9F',
  '.....F9b9F...F9b9F',
  '....F9b9F.....F9b9F',
  '...Fdefg.......Fdefg',
  '...FFFFF.......FFFFF',
  '',
  '',
];

// Collecting the keys: Wally crouches and reaches down and forward. The reach
// is what makes the pose read — the arm leaves the torso silhouette entirely.
const COLLECT_KEYS_0: readonly string[] = [
  '',
  '',
  '',
  '',
  '',
  '',
  '.........FFFFFFFF',
  '........F56777765F',
  '.......F5677777776F',
  '.......F56777777776F',
  '.......F1F3444443F1F',
  '.......F13444444431F',
  '.......F13F44444F43F',
  '.......F13444444431F',
  '.......F11344444331F',
  '........F11333331F',
  '..........FFFFFF',
  '........FF9bccb9FF',
  '.......F19bcbbcb91F',
  '......F13F9bccb9F31F',
  '.....F134F9bbbb9F31F',
  '....F134FFF9bb9FF1F',
  '...F134F..F9bb9F9b9F',
  '...F14F...F9b9F.F9b9',
  '..........Fdef..Fdef',
  '..........FFFF..FFFF',
  '',
  '',
];

// Mid-grab: the hand closes at the floor, body drops lower.
const COLLECT_KEYS_1: readonly string[] = [
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '.........FFFFFFFF',
  '........F56777765F',
  '.......F5677777776F',
  '.......F56777777776F',
  '.......F1F3444443F1F',
  '.......F13444444431F',
  '.......F13F44444F43F',
  '.......F13444444431F',
  '.......F11344444331F',
  '........F11333331F',
  '..........FFFFFF',
  '........FF9bccb9FF',
  '.......F19bcbbcb91F',
  '......F13F9bccb9F31F',
  '.....F134F9bbbb9F31F',
  '....F134FFF9bb9FF1F',
  '...F134F..F9bb9F9b9F',
  '...F14F...F9b9F.F9b9',
  '..........Fdef..Fdef',
  '',
  '',
];

// Rising with the keys: Wally straightens, the raised hand holds them clear of
// the body so the pickup is unmistakable.
const COLLECT_KEYS_2: readonly string[] = [
  '',
  '',
  '..............FBEBF',
  '..............FEDEF',
  '..............FBEBF',
  '.............F134F',
  '........FFFFFF134F',
  '.......F5677776534F',
  '......F56777777763F',
  '......F56777777776F',
  '......F1F3444443F1F',
  '......F13444444431F',
  '......F13F44444F43F',
  '......F13444444431F',
  '......F11344444331F',
  '.......F11333331F',
  '.........FFFFFF',
  '.......FF9bccb9FF',
  '......F19bcbbcb91F',
  '.....F13F9bccb9F31F',
  '.....F13F9bbbb9F31F',
  '.....F11FF9bb9FF11F',
  '......F..F9bb9F..F',
  '.........F9F9F',
  '........F9b9F9b9F',
  '.......Fdefg.Fdefg',
  '.......FFFFF..FFFFF',
  '',
];

/**
 * The hand-drawn vocabulary. Every frame the atlas emits is one of these; the
 * derived clips below select from this set rather than inventing art.
 */
const DRAWN = {
  idleA: IDLE_NORMAL_0,
  idleB: IDLE_NORMAL_1,
  sleepyA: IDLE_SLEEPY_0,
  sleepyB: IDLE_SLEEPY_1,
  walkA: WALK_NORMAL_0,
  walkB: WALK_NORMAL_1,
  walkC: WALK_NORMAL_2,
  keysA: COLLECT_KEYS_0,
  keysB: COLLECT_KEYS_1,
  keysC: COLLECT_KEYS_2,
} as const;

type DrawnName = keyof typeof DRAWN;

/**
 * Clip layout, in the exact order WALLY_CLIPS declares in ../manifests.ts. The
 * frame count of every entry must match its manifest clip, or the atlas frames
 * would shift and every later clip would resolve to the wrong art.
 */
const CLIP_LAYOUT: readonly { readonly id: string; readonly frames: readonly DrawnName[] }[] = [
  { id: 'idle_sleepy', frames: ['sleepyA', 'sleepyB'] },
  { id: 'idle_normal', frames: ['idleA', 'idleB'] },
  { id: 'idle_rushed', frames: ['idleB', 'idleA'] },
  { id: 'idle_startled', frames: ['idleA', 'idleB'] },
  { id: 'walk_sleepy', frames: ['walkA', 'walkB', 'walkC'] },
  { id: 'walk_normal', frames: ['walkA', 'walkB', 'walkC'] },
  { id: 'walk_rushed', frames: ['walkA', 'walkB', 'walkC'] },
  { id: 'walk_startled', frames: ['walkA', 'walkC'] },
  { id: 'wake', frames: ['sleepyB', 'sleepyA', 'idleA'] },
  { id: 'alarm_recoil', frames: ['idleA', 'idleB', 'idleA'] },
  { id: 'fumble', frames: ['keysA', 'keysB', 'idleA'] },
  { id: 'equip_slippers', frames: ['keysA', 'keysB', 'keysC'] },
  { id: 'wardrobe_change', frames: ['idleA', 'idleB', 'idleA', 'idleB'] },
  { id: 'collect_keys', frames: ['keysA', 'keysB', 'keysC'] },
  { id: 'window_react', frames: ['idleA', 'keysC', 'idleA'] },
  { id: 'rest', frames: ['idleB', 'sleepyA', 'sleepyB'] },
  { id: 'success', frames: ['idleA', 'keysC', 'keysC', 'idleA'] },
  { id: 'fail_noise', frames: ['idleA', 'idleB', 'idleA'] },
  { id: 'fail_exhausted', frames: ['sleepyA', 'sleepyB', 'sleepyB'] },
  { id: 'fail_late', frames: ['idleB', 'sleepyA', 'sleepyB'] },
];

/**
 * Clips whose art is hand-drawn for their own pose. Everything else in
 * CLIP_LAYOUT reuses these frames as a placeholder and is listed in
 * DERIVED_CLIPS, so no caller mistakes a placeholder for finished art.
 */
export const HAND_DRAWN_CLIPS: readonly string[] = [
  'idle_normal',
  'walk_normal',
  'idle_sleepy',
  'collect_keys',
];

export const DERIVED_CLIPS: readonly string[] = CLIP_LAYOUT.map((clip) => clip.id).filter(
  (id) => !HAND_DRAWN_CLIPS.includes(id),
);

function buildFrames(): PixelFrame[] {
  const frames: PixelFrame[] = [];
  CLIP_LAYOUT.forEach((clip) => {
    clip.frames.forEach((name, index) => {
      frames.push({ id: `${clip.id}_${index}`, rows: DRAWN[name] });
    });
  });
  return frames;
}

export const WALLY_FRAMES: readonly PixelFrame[] = buildFrames();

export const WALLY_SOURCE: SpriteSource = {
  output: 'assets/game/wally/wally.png',
  width: 240,
  height: 168,
  frameWidth: FRAME_WIDTH,
  frameHeight: FRAME_HEIGHT,
  columns: 10,
  palette: WALLY_PALETTE,
  frames: WALLY_FRAMES,
};
