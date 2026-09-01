import { ManualAnimationClock } from '../src/game/presentation/AnimationClock';
import { resolveAnimationFrame, type AnimationClip } from '../src/game/presentation/AnimationTypes';
import { PresentationRuntime } from '../src/game/presentation/PresentationRuntime';
import { mapSystemicUpdateToVisualEvents } from '../src/game/presentation/VisualEventMapper';
import { createSpriteAtlasIndex, validateSpriteAtlasManifest, type SpriteAtlasManifest } from '../src/game/presentation/atlas/SpriteAtlas';
import { restartSystemicRun, updateSystemicRun } from '../src/game/systemic/SystemicRuntime';
import { createSystemicRun, type SystemicRunState } from '../src/game/systemic/SystemicState';

function equal(actual: unknown, expected: unknown, label: string) { if (actual !== expected) throw new Error(`${label}: ${actual} !== ${expected}`); }
function ok(value: unknown, label: string) { if (!value) throw new Error(label); }

const idleClip: AnimationClip = {
  id: 'idle',
  loop: 'loop',
  frames: [
    { frameId: 'idle-0', durationMs: 100 },
    { frameId: 'idle-1', durationMs: 150 },
  ],
};

equal(resolveAnimationFrame(idleClip, 0).frameId, 'idle-0', 'clip starts first frame');
equal(resolveAnimationFrame(idleClip, 100).frameId, 'idle-1', 'clip advances deterministically');
equal(resolveAnimationFrame(idleClip, 250).frameId, 'idle-0', 'loop wraps exactly');

const manifest: SpriteAtlasManifest = {
  id: 'fixture',
  width: 32,
  height: 16,
  frames: [
    { id: 'idle-0', x: 0, y: 0, width: 8, height: 16, anchorX: 4, anchorY: 15 },
    { id: 'idle-1', x: 8, y: 0, width: 8, height: 16, anchorX: 4, anchorY: 15 },
  ],
  clips: [idleClip],
};

equal(validateSpriteAtlasManifest(manifest).length, 0, 'valid manifest');
equal(createSpriteAtlasIndex(manifest).frameById.size, 2, 'manifest index');
ok(validateSpriteAtlasManifest({ ...manifest, clips: [{ ...idleClip, frames: [{ frameId: 'missing', durationMs: 100 }] }] }).some((error) => error.includes('missing frame')), 'missing frame rejected');
ok(validateSpriteAtlasManifest({ ...manifest, frames: [...manifest.frames, manifest.frames[0]] }).some((error) => error.includes('duplicate frame')), 'duplicate frame rejected');

let state: SystemicRunState = { ...createSystemicRun('visual-efficient'), player: { x: 16, facing: 'left' } };
let before = state;
let update = updateSystemicRun(state, 'action');
let visual = mapSystemicUpdateToVisualEvents(before, update);
state = update.state;
ok(visual.some((event) => event.type === 'WALLY_WAKE'), 'bed maps to wake');
ok(visual.some((event) => event.type === 'ENERGY_GAIN'), 'bed maps energy gain');
ok(visual.some((event) => event.type === 'OBJECT_INTERACT' && event.objectId === 'bed'), 'bed maps interaction');

state = { ...createSystemicRun('visual-alarm'), player: { x: 48, facing: 'right' } };
state = updateSystemicRun(state, 'action').state;
before = state;
update = updateSystemicRun(state, 'action');
visual = mapSystemicUpdateToVisualEvents(before, update);
state = update.state;
ok(visual.some((event) => event.type === 'WALLY_STARTLE'), 'repeated alarm maps startle');
ok(visual.some((event) => event.type === 'NOISE_BURST' && event.intensity === 'strong'), 'repeated alarm maps strong noise');

state = { ...state, player: { x: 68, facing: 'right' } };
before = state;
update = updateSystemicRun(state, 'action');
visual = mapSystemicUpdateToVisualEvents(before, update);
ok(visual.some((event) => event.type === 'WALLY_FUMBLE'), 'rule id terminates in semantic fumble mapping');

state = { ...createSystemicRun('visual-window'), player: { x: 108, facing: 'right' } };
before = state;
update = updateSystemicRun(state, 'action');
visual = mapSystemicUpdateToVisualEvents(before, update);
ok(visual.some((event) => event.type === 'WINDOW_OPENED'), 'window maps open event');

state = { ...createSystemicRun('visual-success'), flags: { dressed: true, windowOpen: false }, player: { x: 88, facing: 'right' } };
before = state;
update = updateSystemicRun(state, 'action');
visual = mapSystemicUpdateToVisualEvents(before, update);
ok(visual.some((event) => event.type === 'OBJECT_COLLECT' && event.objectId === 'keys'), 'keys map collection');
ok(visual.some((event) => event.type === 'OBJECTIVE_SUCCESS'), 'keys complete maps success');

const clock = new ManualAnimationClock(1000);
const presentation = new PresentationRuntime(clock);
presentation.push([{ type: 'NOISE_BURST', amount: 20, intensity: 'strong' }]);
equal(presentation.snapshot().length, 1, 'transient event active');
clock.advanceMs(421);
equal(presentation.snapshot().length, 0, 'transient event expires deterministically');
presentation.push([{ type: 'WALLY_STARTLE' }]);
equal(presentation.snapshot().length, 1, 'runtime accepts second event');
const restart = restartSystemicRun(createSystemicRun('visual-reset'));
presentation.push(mapSystemicUpdateToVisualEvents(createSystemicRun('visual-reset'), restart));
equal(presentation.snapshot().length, 0, 'restart clears presentation runtime');

console.log('presentation tests passed');
