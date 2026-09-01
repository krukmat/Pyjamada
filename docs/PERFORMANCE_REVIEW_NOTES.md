# Expressive Arcade Refactor — Performance Review Notes

This is a focused audit aid, not a claim that performance has been profiled on Android.

## Current rendering cadence

`GameScreen` advances visual presentation with one screen-level `setInterval` at 80 ms (~12.5 Hz). The ticker updates `nowMs`, causing the game screen/canvas path to re-render while mounted. Leaf sprites contain no timers, and gameplay state contains no animation time.

This design was chosen to establish a deterministic presentation boundary quickly and is tracked as `INC-004` for explicit review.

## Work performed per presentation refresh

At a high level:

1. `PresentationRuntime.snapshot()` prunes expired events.
2. `GameCanvas` resolves Wally's current clip/frame.
3. six object visual frames are resolved from stable state + relevant transient event.
4. FX frames are resolved for currently active semantic events.
5. screen shake is derived from the latest strong noise burst.
6. Skia renders three cached image sources plus procedural background/shadow rectangles.

Atlas indexes are constructed at module load and reused. Gameplay state is not mutated by this process.

## Static strengths

- Only one presentation ticker exists; no per-object/per-sprite timers.
- Atlas frame/clip indexes are module-level caches.
- Only three sprite images are loaded by `useImage`.
- FX lifetimes are bounded and pruned.
- The logical world remains 128 px, limiting sprite/object count and layout complexity.
- Stable presentation is reconstructible from gameplay state; no animation-history replay is required.

## Static concerns to measure

### P1 — React-level cadence

The 80 ms state update re-renders `GameScreen`, not only Skia-derived animation values. Determine whether this creates material JS-thread work on the Android target.

### P2 — Per-refresh temporary allocations

`GameCanvas` creates the six-object mapping and FX result arrays each refresh. `AtlasSprite` constructs sprite/transform arrays for each render. At the current scene size this may be trivial, but it should be measured rather than assumed.

### P3 — Event stacking

Noise bursts are intentionally additive. Repeated rapid actions can increase active FX entries until their short lifetimes expire. Validate that the bounded lifetimes prevent visible frame pacing degradation during the chaos route.

### P4 — Image readiness

`useImage` returns `null` while loading. Verify on cold launch that the room does not produce an unacceptable actor/object blank interval or layout/readability problem.

### P5 — Input responsiveness

Gameplay input is applied immediately and does not wait for animation. Validate that JS/render work does not create perceived touch latency during repeated movement/action sequences.

## Candidate strategies

### Option A — Keep current ticker

Accept if Android measurements show stable frame pacing and no material touch latency. Lowest complexity and easiest deterministic test model.

### Option B — Move animation time to Skia/Reanimated

React Native Skia exposes `useClock`, and the project already has Reanimated 4.x. A deeper renderer pass could derive frames/transforms on the UI thread/shared values rather than React state. This potentially reduces JS churn but increases integration complexity because current frame resolution is pure TypeScript and returns atlas-frame metadata.

Do not choose this option solely because it sounds more optimized; measure first.

### Option C — Hybrid

Keep semantic event creation/lifetimes in the existing pure TypeScript presentation runtime, but move only continuously advancing visual values (clock, frame selection, shake transform) to Skia/Reanimated. This preserves the gameplay/presentation boundary while reducing React cadence.

## Suggested local measurements

Record at minimum:

- device/emulator model and Android version;
- debug vs release build;
- normal idle scene;
- continuous left/right movement;
- first alarm interaction;
- repeated alarm + wardrobe/fumble chaos sequence;
- success beat;
- whether touch latency is perceptible;
- frame pacing/jank evidence from Android Studio profiler, Perfetto, React Native performance tooling or equivalent.

The audit should compare options based on observed cost and maintainability, not generic FPS targets detached from this small scene.

## Decision requested from audit

Resolve `INC-004` with one of:

- **ACCEPT:** current cadence is adequate for the project/target.
- **FIX BEFORE MERGE:** measured issue justifies a targeted optimization.
- **FOLLOW-UP:** current cadence is acceptable for this merge but a UI-thread animation migration should be tracked separately.
