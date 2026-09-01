import { ManualAnimationClock } from '../src/game/presentation/AnimationClock';
import { resolveAnimationFrame, type AnimationClip } from '../src/game/presentation/AnimationTypes';
import { resolveFxFrames } from '../src/game/presentation/FxSystem';
import { resolveObjectVisualFrame } from '../src/game/presentation/ObjectAnimator';
import { PresentationRuntime } from '../src/game/presentation/PresentationRuntime';
import { mapSystemicUpdateToVisualEvents } from '../src/game/presentation/VisualEventMapper';
import { resolveWallyVisualFrame } from '../src/game/presentation/WallyAnimator';
import { createSpriteAtlasIndex, validateSpriteAtlasManifest, type SpriteAtlasManifest } from '../src/game/presentation/atlas/SpriteAtlas';
import { ALL_GAME_ATLASES } from '../src/game/presentation/atlas/manifests';
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
ALL_GAME_ATLASES.forEach((atlas) => equal(validateSpriteAtlasManifest(atlas).length, 0, `${atlas.id} production manifest valid`));

const clock = new ManualAnimationClock(1000);
const presentation = new PresentationRuntime(clock);
let state: SystemicRunState = { ...createSystemicRun('visual-efficient'), player: { x: 16, facing: 'left' } };
let before = state;
let update = updateSystemicRun(state, 'action');
let visual = mapSystemicUpdateToVisualEvents(before, update);
state = update.state;
ok(visual.some((event) => event.type === 'WALLY_WAKE'), 'bed maps to wake');
ok(visual.some((event) => event.type === 'ENERGY_GAIN'), 'bed maps energy gain');
ok(visual.some((event) => event.type === 'OBJECT_INTERACT' && event.objectId === 'bed'), 'bed maps interaction');
presentation.push(visual);
equal(resolveWallyVisualFrame(state, presentation.snapshot(), clock.nowMs()).clipId, 'wake', 'bed selects wake clip');
equal(resolveObjectVisualFrame(state, 'bed', presentation.snapshot(), clock.nowMs()).clipId, 'bed_rest', 'bed selects reaction clip');
ok(resolveFxFrames(state, presentation.snapshot(), clock.nowMs()).some((fx) => fx.clipId === 'sleep_z'), 'bed emits sleep fx');
clock.advanceMs(500);
equal(resolveWallyVisualFrame(state, presentation.snapshot(), clock.nowMs()).clipId, 'idle_normal', 'wake resolves to normal idle');

state = { ...createSystemicRun('visual-alarm'), player: { x: 48, facing: 'right' } };
state = updateSystemicRun(state, 'action').state;
before = state;
update = updateSystemicRun(state, 'action');
visual = mapSystemicUpdateToVisualEvents(before, update);
state = update.state;
ok(visual.some((event) => event.type === 'WALLY_STARTLE'), 'repeated alarm maps startle');
ok(visual.some((event) => event.type === 'NOISE_BURST' && event.intensity === 'strong'), 'repeated alarm maps strong noise');
presentation.reset();
presentation.push(visual);
equal(resolveWallyVisualFrame(state, presentation.snapshot(), clock.nowMs()).clipId, 'alarm_recoil', 'startle selects recoil');
equal(resolveObjectVisualFrame(state, 'alarm-clock', presentation.snapshot(), clock.nowMs()).clipId, 'alarm_ring_strong', 'repeated alarm selects strong ring');
ok(resolveFxFrames(state, presentation.snapshot(), clock.nowMs()).some((fx) => fx.clipId === 'shock'), 'startle emits shock fx');

state = { ...state, player: { x: 68, facing: 'right' } };
before = state;
update = updateSystemicRun(state, 'action');
visual = mapSystemicUpdateToVisualEvents(before, update);
ok(visual.some((event) => event.type === 'WALLY_FUMBLE'), 'rule id terminates in semantic fumble mapping');
presentation.reset();
presentation.push(visual);
equal(resolveObjectVisualFrame(update.state, 'wardrobe', presentation.snapshot(), clock.nowMs()).clipId, 'wardrobe_fumble', 'startled wardrobe selects fumble reaction');

state = { ...createSystemicRun('visual-window'), player: { x: 108, facing: 'right' } };
before = state;
update = updateSystemicRun(state, 'action');
visual = mapSystemicUpdateToVisualEvents(before, update);
ok(visual.some((event) => event.type === 'WINDOW_OPENED'), 'window maps open event');
presentation.reset();
presentation.push(visual);
equal(resolveObjectVisualFrame(update.state, 'window', presentation.snapshot(), clock.nowMs()).clipId, 'window_opening', 'window opening has reaction clip');

const successBase = createSystemicRun('visual-success');
state = { ...successBase, flags: { dressed: true, windowOpen: false }, objectStates: { ...successBase.objectStates, wardrobe: 'used' }, player: { x: 88, facing: 'right' } };
before = state;
update = updateSystemicRun(state, 'action');
visual = mapSystemicUpdateToVisualEvents(before, update);
ok(visual.some((event) => event.type === 'OBJECT_COLLECT' && event.objectId === 'keys'), 'keys map collection');
ok(visual.some((event) => event.type === 'OBJECTIVE_SUCCESS'), 'keys complete maps success');
presentation.reset();
presentation.push(visual);
equal(resolveWallyVisualFrame(update.state, presentation.snapshot(), clock.nowMs()).clipId, 'success', 'objective success overrides actor clip');

const restoreBase = createSystemicRun('stable-restore');
const restored: SystemicRunState = {
  ...restoreBase,
  equipped: ['slippers'],
  collected: ['keys'],
  objectStates: { ...restoreBase.objectStates, slippers: 'equipped', keys: 'collected', window: 'open' },
  flags: { dressed: true, windowOpen: true },
};
equal(resolveObjectVisualFrame(restored, 'slippers', [], clock.nowMs()).clipId, 'slippers_empty', 'restore derives equipped slippers visual');
equal(resolveObjectVisualFrame(restored, 'keys', [], clock.nowMs()).clipId, 'keys_empty', 'restore derives collected keys visual');
equal(resolveObjectVisualFrame(restored, 'window', [], clock.nowMs()).clipId, 'window_open', 'restore derives open window visual');

presentation.reset();
presentation.push([{ type: 'WALLY_WAKE' }]);
presentation.push([{ type: 'WALLY_MOVE', direction: 'right', quiet: false }]);
equal(presentation.snapshot().filter((entry) => entry.event.type.startsWith('WALLY_')).length, 1, 'new actor event supersedes old actor channel');
presentation.push([{ type: 'NOISE_BURST', amount: 20, intensity: 'strong' }]);
equal(presentation.snapshot().filter((entry) => entry.event.type === 'NOISE_BURST').length, 1, 'noise fx remains additive');
clock.advanceMs(500);
equal(presentation.snapshot().length, 0, 'transient events expire deterministically');

presentation.push([{ type: 'WALLY_STARTLE' }]);
equal(presentation.snapshot().length, 1, 'runtime accepts second event');
const restartBefore = createSystemicRun('visual-reset');
const restart = restartSystemicRun(restartBefore);
presentation.push(mapSystemicUpdateToVisualEvents(restartBefore, restart));
equal(presentation.snapshot().length, 0, 'restart clears presentation runtime');

console.log('presentation tests passed');
