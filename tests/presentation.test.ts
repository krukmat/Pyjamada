import { ManualAnimationClock } from '../src/game/presentation/AnimationClock';
import { resolveAnimationFrame, type AnimationClip } from '../src/game/presentation/AnimationTypes';
import { resolveFxFrames } from '../src/game/presentation/FxSystem';
import { resolveObjectVisualFrame } from '../src/game/presentation/ObjectAnimator';
import { PresentationRuntime } from '../src/game/presentation/PresentationRuntime';
import { mapSystemicUpdateToVisualEvents } from '../src/game/presentation/VisualEventMapper';
import { resolveWallyVisualFrame } from '../src/game/presentation/WallyAnimator';
import { createSpriteAtlasIndex, validateSpriteAtlasManifest, type SpriteAtlasManifest } from '../src/game/presentation/atlas/SpriteAtlas';
import { ALL_GAME_ATLASES } from '../src/game/presentation/atlas/manifests';
import { OBJECT_VISUAL_ORIGINS } from '../src/game/presentation/VisualEvent';
import { restartSystemicRun, updateSystemicRun } from '../src/game/systemic/SystemicRuntime';
import { createSystemicRun, type SystemicRunState } from '../src/game/systemic/SystemicState';

function equal(actual: unknown, expected: unknown, label: string) { if (actual !== expected) throw new Error(`${label}: ${actual} !== ${expected}`); }
function ok(value: unknown, label: string) { if (!value) throw new Error(label); }

const FIXTURE_ORIGIN = { x: 0, y: 88 };

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
ok(resolveFxFrames(presentation.snapshot(), clock.nowMs()).some((fx) => fx.clipId === 'sleep_z'), 'bed emits sleep fx');
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
ok(resolveFxFrames(presentation.snapshot(), clock.nowMs()).some((fx) => fx.clipId === 'shock'), 'startle emits shock fx');

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
presentation.push([{ type: 'WALLY_MOVE', direction: 'right', quiet: false, origin: FIXTURE_ORIGIN }]);
equal(presentation.snapshot().filter((entry) => entry.event.type.startsWith('WALLY_')).length, 1, 'new actor event supersedes old actor channel');
presentation.push([{ type: 'NOISE_BURST', amount: 20, intensity: 'strong', origin: FIXTURE_ORIGIN }]);
equal(presentation.snapshot().filter((entry) => entry.event.type === 'NOISE_BURST').length, 1, 'noise fx remains additive');
clock.advanceMs(500);
equal(presentation.snapshot().length, 0, 'transient events expire deterministically');

presentation.push([{ type: 'WALLY_STARTLE', origin: FIXTURE_ORIGIN }]);
equal(presentation.snapshot().length, 1, 'runtime accepts second event');
const restartBefore = createSystemicRun('visual-reset');
const restart = restartSystemicRun(restartBefore);
presentation.push(mapSystemicUpdateToVisualEvents(restartBefore, restart));
equal(presentation.snapshot().length, 0, 'restart clears presentation runtime');

// FINDING-002 regression (E-01/E-02): actor-channel move interruption.
// Before the fix, WallyAnimator read OBJECT_INTERACT directly, so a later
// WALLY_MOVE (which only superseded the actor channel) could not interrupt
// a still-active object-channel reaction; Wally kept the stale pose.
presentation.reset();
let moveState: SystemicRunState = createSystemicRun('visual-channel-move');
presentation.push([{ type: 'OBJECT_INTERACT', objectId: 'alarm-clock', count: 1 }, { type: 'WALLY_REACT', cause: 'alarm-clock' }]);
equal(resolveWallyVisualFrame(moveState, presentation.snapshot(), clock.nowMs()).clipId, 'alarm_recoil', 'wally shows the alarm reaction pose');
presentation.push([{ type: 'WALLY_MOVE', direction: 'right', quiet: false, origin: FIXTURE_ORIGIN }]);
let afterMove = presentation.snapshot();
ok(!afterMove.some((entry) => entry.event.type === 'WALLY_REACT'), 'move supersedes the stale actor reaction on the same channel');
equal(resolveWallyVisualFrame(moveState, afterMove, clock.nowMs()).clipId, 'walk_sleepy', 'wally switches to the walk clip immediately after moving away from a reaction');
ok(afterMove.some((entry) => entry.event.type === 'OBJECT_INTERACT' && entry.event.objectId === 'alarm-clock'), 'the object-owned event is untouched by the actor-channel move');
equal(resolveObjectVisualFrame(moveState, 'alarm-clock', afterMove, clock.nowMs()).clipId, 'alarm_ring', 'alarm clock keeps its own reaction after wally moves away');

// FINDING-002 regression (E-02): unrelated-object fumble ownership.
// Before the fix, ObjectAnimator treated every actor-channel WALLY_FUMBLE as
// a wardrobe event, so any non-bed startled interaction animated the
// wardrobe even when it was never touched.
let fumbleState: SystemicRunState = { ...createSystemicRun('visual-channel-fumble'), player: { x: 48, facing: 'right' } };
fumbleState = updateSystemicRun(fumbleState, 'action').state;
fumbleState = updateSystemicRun(fumbleState, 'action').state;
equal(fumbleState.wallyState, 'startled', 'setup: wally is startled before the fumble-ownership regression');
for (const target of ['alarm-clock', 'slippers', 'keys', 'window'] as const) {
  let probeState: SystemicRunState = { ...fumbleState, player: { x: fumbleState.player.x, facing: 'right' } };
  const targetX = { 'alarm-clock': 48, slippers: 32, keys: 88, window: 108 }[target];
  probeState = { ...probeState, player: { x: targetX, facing: 'right' } };
  const probeBefore = probeState;
  const probeUpdate = updateSystemicRun(probeState, 'action');
  const probeVisual = mapSystemicUpdateToVisualEvents(probeBefore, probeUpdate);
  ok(probeUpdate.ruleTrace.includes('startled-fumble'), `setup: startled ${target} interaction triggers the fumble rule`);
  presentation.reset();
  presentation.push(probeVisual);
  const probeActive = presentation.snapshot();
  equal(resolveWallyVisualFrame(probeUpdate.state, probeActive, clock.nowMs()).clipId, 'fumble', `wally shows fumble for startled ${target} interaction`);
  equal(resolveObjectVisualFrame(probeUpdate.state, 'wardrobe', probeActive, clock.nowMs()).clipId, 'wardrobe_closed', `untouched wardrobe stays stable when ${target} causes the startled fumble`);
}

// FINDING-002 regression (E-02): per-object coexistence and same-object replacement.
presentation.reset();
presentation.push([
  { type: 'OBJECT_INTERACT', objectId: 'bed', count: 1 },
  { type: 'OBJECT_INTERACT', objectId: 'wardrobe', count: 1 },
]);
let coexist = presentation.snapshot();
ok(coexist.some((entry) => entry.event.type === 'OBJECT_INTERACT' && entry.event.objectId === 'bed'), 'bed and wardrobe object events coexist on separate channels (bed)');
ok(coexist.some((entry) => entry.event.type === 'OBJECT_INTERACT' && entry.event.objectId === 'wardrobe'), 'bed and wardrobe object events coexist on separate channels (wardrobe)');
presentation.push([{ type: 'OBJECT_INTERACT', objectId: 'wardrobe', count: 2 }]);
let replaced = presentation.snapshot();
equal(replaced.filter((entry) => entry.event.type === 'OBJECT_INTERACT' && entry.event.objectId === 'wardrobe').length, 1, 'a new wardrobe event replaces only the wardrobe channel');
ok(replaced.some((entry) => entry.event.type === 'OBJECT_INTERACT' && entry.event.objectId === 'bed'), 'same-object replacement does not disturb the unrelated bed channel');

// FINDING-003 regression (F-02): FX origin is captured once at mapping time
// from the action that produced the event, and never re-derived later from
// whatever action happens to be "current" when the FX is drawn.
presentation.reset();
let originState: SystemicRunState = { ...createSystemicRun('visual-origin-alarm'), player: { x: 48, facing: 'right' } };
originState = updateSystemicRun(originState, 'action').state;
let originBefore = originState;
let originUpdate = updateSystemicRun(originState, 'action');
let originVisual = mapSystemicUpdateToVisualEvents(originBefore, originUpdate);
originState = originUpdate.state;
ok(originVisual.some((event) => event.type === 'NOISE_BURST' && event.origin.x === OBJECT_VISUAL_ORIGINS['alarm-clock'].x), 'alarm noise burst origin matches the alarm-clock object origin');
presentation.push(originVisual);
ok(resolveFxFrames(presentation.snapshot(), clock.nowMs()).some((fx) => fx.clipId === 'noise' && fx.x === OBJECT_VISUAL_ORIGINS['alarm-clock'].x), 'noise fx renders at the alarm-clock origin');

// Cross-object non-interference: an unrelated later interaction must not move
// or replace the already-active fx; NOISE_BURST has no channel, so the two
// bursts coexist additively rather than the second overwriting the first.
originBefore = { ...originState, player: { x: 68, facing: 'right' } };
originUpdate = updateSystemicRun(originBefore, 'action');
originVisual = mapSystemicUpdateToVisualEvents(originBefore, originUpdate);
ok(originVisual.some((event) => event.type === 'NOISE_BURST' && event.origin.x === OBJECT_VISUAL_ORIGINS.wardrobe.x), 'setup: the wardrobe interaction maps its own noise burst at the wardrobe origin');
presentation.push(originVisual);
const crossObjectNoiseFx = resolveFxFrames(presentation.snapshot(), clock.nowMs()).filter((fx) => fx.clipId === 'noise');
ok(crossObjectNoiseFx.some((fx) => fx.x === OBJECT_VISUAL_ORIGINS['alarm-clock'].x), 'the alarm noise fx keeps its original origin after an unrelated wardrobe interaction');
ok(crossObjectNoiseFx.some((fx) => fx.x === OBJECT_VISUAL_ORIGINS.wardrobe.x), 'the wardrobe interaction produces its own, separate noise fx rather than moving the alarm one');

// Successive movement fx: each move carries its own post-move origin rather
// than a shared or stale one from an earlier move.
presentation.reset();
let moveOriginState: SystemicRunState = { ...createSystemicRun('visual-origin-move'), player: { x: 32, facing: 'right' } };
moveOriginState = updateSystemicRun(moveOriginState, 'action').state;
ok(moveOriginState.equipped.includes('slippers'), 'setup: slippers are equipped before the movement-fx regression');

let moveOriginBefore = moveOriginState;
let moveOriginUpdate = updateSystemicRun(moveOriginState, 'right');
let moveOriginVisual = mapSystemicUpdateToVisualEvents(moveOriginBefore, moveOriginUpdate);
moveOriginState = moveOriginUpdate.state;
equal(moveOriginState.player.x, 36, 'setup: first quiet move advances the player by one step');
ok(moveOriginVisual.some((event) => event.type === 'WALLY_MOVE' && event.quiet && event.origin.x === 36), 'first quiet move carries the post-move player position as its origin');
presentation.push(moveOriginVisual);
const firstMoveFx = resolveFxFrames(presentation.snapshot(), clock.nowMs()).find((fx) => fx.clipId === 'quiet_footsteps');
equal(firstMoveFx?.x, 36, 'first move renders quiet footsteps fx at the new player position');

moveOriginBefore = moveOriginState;
moveOriginUpdate = updateSystemicRun(moveOriginState, 'right');
moveOriginVisual = mapSystemicUpdateToVisualEvents(moveOriginBefore, moveOriginUpdate);
moveOriginState = moveOriginUpdate.state;
equal(moveOriginState.player.x, 40, 'setup: second quiet move advances the player by another step');
ok(moveOriginVisual.some((event) => event.type === 'WALLY_MOVE' && event.quiet && event.origin.x === 40), 'second quiet move carries its own post-move player position as its origin');
presentation.push(moveOriginVisual);
const secondMoveFx = resolveFxFrames(presentation.snapshot(), clock.nowMs()).find((fx) => fx.clipId === 'quiet_footsteps');
equal(secondMoveFx?.x, 40, 'second move renders quiet footsteps fx at its own new position');
ok(firstMoveFx?.x !== secondMoveFx?.x, 'successive moves capture distinct origins rather than reusing a stale one');

// Restart clears active fx, not just tracked events.
presentation.reset();
presentation.push([{ type: 'NOISE_BURST', amount: 20, intensity: 'strong', origin: OBJECT_VISUAL_ORIGINS['alarm-clock'] }]);
ok(resolveFxFrames(presentation.snapshot(), clock.nowMs()).some((fx) => fx.clipId === 'noise'), 'setup: a noise fx is active before restart');
const fxRestartBefore = createSystemicRun('visual-origin-restart');
const fxRestart = restartSystemicRun(fxRestartBefore);
presentation.push(mapSystemicUpdateToVisualEvents(fxRestartBefore, fxRestart));
equal(resolveFxFrames(presentation.snapshot(), clock.nowMs()).length, 0, 'restart clears all active fx, not just tracked events');

// F-05: a once-loop fx clip finishes its own animation independently of, and
// always before, its entry's ttl. The entry (and its channel ownership)
// survives until the ttl prunes it, even once the clip stops rendering.
presentation.reset();
presentation.push([{ type: 'WALLY_STARTLE', origin: OBJECT_VISUAL_ORIGINS['alarm-clock'] }]);
ok(resolveFxFrames(presentation.snapshot(), clock.nowMs()).some((fx) => fx.clipId === 'shock'), 'shock fx renders immediately after the startle');
clock.advanceMs(269);
ok(resolveFxFrames(presentation.snapshot(), clock.nowMs()).some((fx) => fx.clipId === 'shock'), 'shock fx still renders one tick before its once-clip animation (270ms) completes');
clock.advanceMs(1);
equal(presentation.snapshot().length, 1, 'the startle entry is still active (440ms ttl not yet reached) once its clip animation completes');
equal(resolveFxFrames(presentation.snapshot(), clock.nowMs()).length, 0, 'a completed once-loop clip stops rendering fx even while its entry is still active');
clock.advanceMs(170);
equal(presentation.snapshot().length, 0, "the entry itself is pruned once its own ttl elapses, independent of the clip's own completion");

// F-05: maximum active cardinality. Channel-owned events are always capped at
// one entry per channel no matter how many times that channel is pushed to;
// channel-less events have no such owner and accumulate additively instead.
presentation.reset();
const cardinalityObjects = ['bed', 'slippers', 'alarm-clock', 'wardrobe', 'keys', 'window'] as const;
presentation.push(cardinalityObjects.map((objectId) => ({ type: 'OBJECT_INTERACT' as const, objectId, count: 1 })));
presentation.push([{ type: 'WALLY_MOVE', direction: 'right', quiet: false, origin: FIXTURE_ORIGIN }]);
presentation.push([{ type: 'OBJECTIVE_SUCCESS', origin: FIXTURE_ORIGIN }]);
equal(presentation.snapshot().length, cardinalityObjects.length + 2, 'one entry survives per distinct channel: six objects, the actor, and the objective');
presentation.push(cardinalityObjects.map((objectId) => ({ type: 'OBJECT_INTERACT' as const, objectId, count: 2 })));
presentation.push([{ type: 'WALLY_MOVE', direction: 'left', quiet: false, origin: FIXTURE_ORIGIN }]);
presentation.push([{ type: 'OBJECTIVE_SUCCESS', origin: FIXTURE_ORIGIN }]);
equal(presentation.snapshot().length, cardinalityObjects.length + 2, 'repeated pushes to the same channels never exceed one entry per channel');

presentation.reset();
const cardinalityNoiseOrigins = [OBJECT_VISUAL_ORIGINS.bed, OBJECT_VISUAL_ORIGINS.slippers, OBJECT_VISUAL_ORIGINS['alarm-clock'], OBJECT_VISUAL_ORIGINS.wardrobe, OBJECT_VISUAL_ORIGINS.keys];
cardinalityNoiseOrigins.forEach((origin) => presentation.push([{ type: 'NOISE_BURST', amount: 5, intensity: 'subtle', origin }]));
equal(presentation.snapshot().length, cardinalityNoiseOrigins.length, 'channel-less events accumulate additively with no artificial cardinality cap');
presentation.reset();
equal(presentation.snapshot().length, 0, 'reset clears an unbounded accumulation of channel-less events just as it clears channel-owned ones');

// Q-01: too-late, house-awake, and exhausted objective failures each select
// their own actor clip while sharing the same failure fx and objective
// channel/lifetime.
const FAILURE_SCENARIOS: { reason: 'house-awake' | 'exhausted' | 'too-late'; overrides: Partial<SystemicRunState>; clipId: string }[] = [
  { reason: 'house-awake', overrides: { noise: 90 }, clipId: 'fail_noise' },
  { reason: 'exhausted', overrides: { energy: 0 }, clipId: 'fail_exhausted' },
  { reason: 'too-late', overrides: { timeSpent: 60 }, clipId: 'fail_late' },
];
for (const scenario of FAILURE_SCENARIOS) {
  presentation.reset();
  const failureBefore: SystemicRunState = { ...createSystemicRun(`visual-failure-${scenario.reason}`), ...scenario.overrides };
  const failureUpdate = updateSystemicRun(failureBefore, 'right');
  ok(failureUpdate.events.some((event) => event.type === 'OBJECTIVE_FAILED' && event.reason === scenario.reason), `setup: the ${scenario.reason} fixture actually triggers that failure reason`);
  const failureVisual = mapSystemicUpdateToVisualEvents(failureBefore, failureUpdate);
  presentation.push(failureVisual);
  const failureActive = presentation.snapshot();
  equal(resolveWallyVisualFrame(failureUpdate.state, failureActive, clock.nowMs()).clipId, scenario.clipId, `${scenario.reason} selects its own actor clip (${scenario.clipId})`);
  ok(resolveFxFrames(failureActive, clock.nowMs()).some((fx) => fx.clipId === 'failure_burst'), `${scenario.reason} emits the shared failure fx`);
  ok(failureActive.some((entry) => entry.event.type === 'OBJECTIVE_FAILURE' && entry.event.reason === scenario.reason), `${scenario.reason} pushes its own reason onto the objective channel`);
}

// Q-02: stable reconstruction (no active/transient events) for every Wally
// state and all six objects, derived purely from gameplay state.
for (const reconstructWallyState of ['sleepy', 'normal', 'rushed', 'startled'] as const) {
  const reconstructState: SystemicRunState = { ...createSystemicRun('stable-wally'), wallyState: reconstructWallyState };
  equal(resolveWallyVisualFrame(reconstructState, [], clock.nowMs()).clipId, `idle_${reconstructWallyState}`, `wally reconstructs the idle clip for wallyState ${reconstructWallyState} with no active events`);
}

const stableObjectsState = createSystemicRun('stable-objects');
equal(resolveObjectVisualFrame(stableObjectsState, 'bed', [], clock.nowMs()).clipId, 'bed_idle', 'bed reconstructs its stable idle clip');
equal(resolveObjectVisualFrame(stableObjectsState, 'alarm-clock', [], clock.nowMs()).clipId, 'alarm_idle', 'alarm clock reconstructs its stable idle clip');
equal(resolveObjectVisualFrame(stableObjectsState, 'wardrobe', [], clock.nowMs()).clipId, 'wardrobe_closed', 'wardrobe reconstructs the closed clip before dressing');
const stableDressedState: SystemicRunState = { ...stableObjectsState, flags: { ...stableObjectsState.flags, dressed: true } };
equal(resolveObjectVisualFrame(stableDressedState, 'wardrobe', [], clock.nowMs()).clipId, 'wardrobe_dressed', 'wardrobe reconstructs the dressed clip once dressed');
equal(resolveObjectVisualFrame(stableObjectsState, 'slippers', [], clock.nowMs()).clipId, 'slippers_idle', 'slippers reconstruct the idle clip before being equipped');
equal(resolveObjectVisualFrame(stableObjectsState, 'keys', [], clock.nowMs()).clipId, 'keys_pulse', 'keys reconstruct the pulse clip before collection');
equal(resolveObjectVisualFrame(stableObjectsState, 'window', [], clock.nowMs()).clipId, 'window_closed', 'window reconstructs the closed clip before opening');
// (slippers/keys/window's post-interaction stable variants are covered above by the `restored` fixture.)

// Q-03: same-timestamp collisions, a fresh new-game/continue runtime, and a
// stacked-fx lifecycle with several concurrently active fx-producing events.
presentation.reset();
presentation.push([
  { type: 'OBJECT_INTERACT', objectId: 'bed', count: 1 },
  { type: 'OBJECT_INTERACT', objectId: 'bed', count: 2 },
]);
const collisionActive = presentation.snapshot();
equal(collisionActive.filter((entry) => entry.event.type === 'OBJECT_INTERACT' && entry.event.objectId === 'bed').length, 1, 'same-channel events sharing one push and timestamp still collapse to a single entry');
ok(collisionActive.some((entry) => entry.event.type === 'OBJECT_INTERACT' && entry.event.objectId === 'bed' && entry.event.count === 2), 'the later same-timestamp event in array order wins the channel deterministically');

// "new game" and "continue" both start a fresh runtime from gameplay state
// alone; Q-02 above already proves stable reconstruction with no active
// events, and this confirms a brand-new runtime instance carries no residual
// presentation state at all.
equal(new PresentationRuntime(clock).snapshot().length, 0, 'a freshly constructed runtime (new game/continue) starts with no active presentation state');

presentation.reset();
presentation.push([
  { type: 'OBJECT_INTERACT', objectId: 'bed', count: 1 },
  { type: 'OBJECT_COLLECT', objectId: 'keys' },
  { type: 'WALLY_STARTLE', origin: OBJECT_VISUAL_ORIGINS['alarm-clock'] },
]);
const stackedFx = resolveFxFrames(presentation.snapshot(), clock.nowMs());
ok(stackedFx.some((fx) => fx.clipId === 'sleep_z'), 'stacked fx: bed sleep_z is present alongside the others');
ok(stackedFx.some((fx) => fx.clipId === 'sparkle'), 'stacked fx: keys sparkle is present alongside the others');
ok(stackedFx.some((fx) => fx.clipId === 'shock'), 'stacked fx: startle shock is present alongside the others');
equal(new Set(stackedFx.map((fx) => fx.key)).size, stackedFx.length, 'each stacked fx entry keeps a unique key even with several concurrently active');

// C-03: event-consumer/clip-reachability validation surfaced one live but
// untested path — the `rushed-threshold` rule (timeSpent >= 22 while
// `normal`) maps to WALLY_RUSH, which FxSystem consumes for motion_streak
// fx but WallyAnimator does not special-case; the actor pose instead comes
// from the wallyState-driven idle/walk clip, exactly like an ordinary
// `rushed` idle would. This closes the gap rather than deleting the event.
presentation.reset();
const rushedBefore: SystemicRunState = { ...createSystemicRun('visual-rushed'), wallyState: 'normal', timeSpent: 22, player: { x: 88, facing: 'right' } };
const rushedUpdate = updateSystemicRun(rushedBefore, 'action');
ok(rushedUpdate.events.some((event) => event.type === 'WALLY_STATE_CHANGED' && event.from === 'normal' && event.to === 'rushed'), 'setup: the fixture actually crosses the rushed-threshold rule');
const rushedVisual = mapSystemicUpdateToVisualEvents(rushedBefore, rushedUpdate);
ok(rushedVisual.some((event) => event.type === 'WALLY_RUSH' && event.origin.x === OBJECT_VISUAL_ORIGINS.keys.x), 'crossing the rushed threshold during a keys interaction maps a WALLY_RUSH event at the keys origin');
presentation.push(rushedVisual);
const rushedActive = presentation.snapshot();
equal(resolveWallyVisualFrame(rushedUpdate.state, rushedActive, clock.nowMs()).clipId, 'idle_rushed', 'wally falls back to the wallyState-driven idle_rushed pose; WALLY_RUSH has no dedicated actor clip of its own');
ok(resolveFxFrames(rushedActive, clock.nowMs()).some((fx) => fx.clipId === 'motion_streak' && fx.x === OBJECT_VISUAL_ORIGINS.keys.x), 'WALLY_RUSH still drives its own motion_streak fx at the captured origin');

console.log('presentation tests passed');
