# V1 Integrated Review — v0.5

## Decision

**Architecture: conditional GO.**

The approved V1 scope (CU-01, CU-02, CU-03, CU-06, with CU-05 as an internal capability) is coherent enough to continue **after an Android runtime/device smoke test**. No broader game-port scope should be approved solely from domain tests.

## What was reviewed

- functional scope and CU boundaries;
- React Native shell vs TypeScript domain separation;
- CU-03 state transitions and vertical-slice progression;
- save and settings persistence boundaries;
- save/settings codecs;
- rapid-input and rapid-settings-update behavior;
- V1 test coverage;
- deferred-scope leakage.

## Corrections made in v0.5

### 1. Serialized game-save writes
Previous behavior could issue multiple AsyncStorage writes concurrently when controls were pressed quickly. Completion order was not guaranteed.

`AsyncStorageGameSaveRepository` now serializes writes and waits for pending writes before reads.

### 2. Removed stale-state input risk
Gameplay input handlers now advance from an authoritative in-memory ref rather than a possibly stale React render closure. Rapid taps therefore preserve input order before persistence.

### 3. Compatible-save availability
`CONTINUE` is now enabled only when the stored save decodes as a compatible V1 state. A corrupt/incompatible key no longer appears as resumable merely because it exists.

### 4. Safer New Game replacement
Confirmed `New Game` now overwrites in one save operation rather than `clear -> save`. This removes the data-loss window between delete and replacement write.

### 5. Stronger save validation
The save codec now rejects:
- non-finite/out-of-viewport coordinates;
- unknown/duplicated inventory entries;
- unknown/non-boolean progression flags;
- inconsistent key/door/room/slice progression states.

### 6. Serialized settings updates
Rapid settings changes are queued. Music/SFX buttons now submit deltas so repeated taps cannot collapse into the same stale absolute value.

### 7. Integrated V1 test
Added a domain integration path:

```text
New Game -> CU-03 progression -> persist -> Continue -> exact state restored
```

A second integration check confirms CU-06 settings do not mutate the game save.

## Strengths after review

- Game rules are isolated from React Native/Skia/AsyncStorage.
- Renderer remains presentation-only.
- CU-05 remains an internal capability, not a product-level CU.
- Game save and settings use separate models, ports, keys and codecs.
- V1 gameplay is intentionally small and deterministic.
- Deferred commerce/iOS/full-game scope has not leaked into implementation.
- Placeholder geometry avoids importing unapproved copyrighted assets.

## Residual risks / gaps

### R1 — Real Android execution not yet proven
Domain/static validation cannot prove native dependency compatibility, touch ergonomics, Skia behavior, lifecycle behavior or AsyncStorage behavior on a device.

**Gate:** run on at least one representative Android device/emulator before expanding the port.

### R2 — Fidelity is architectural, not content-complete
The current rooms and geometry are placeholders. The V1 proves the pipeline shape, not source-faithful room/sprite/audio reproduction.

**Gate for broader port:** select one authorized/reference room and run a measured fidelity pass before scaling asset/content extraction.

### R3 — No fixed-step continuous game loop yet
The slice is input-step driven, which is sufficient for the current movement/puzzle validation but not for a complete action game with continuous physics/timers/enemies.

**Recommendation:** do not build the full loop until the next approved scope requires time-based mechanics. When required, add it in the TypeScript core rather than React render state.

### R4 — Audio settings have no runtime audio behavior
CU-06 persists audio preferences, but source-faithful playback remains deferred by design.

### R5 — Persistence is single-slot/local only
Correct for V1. Cloud saves, accounts and multiple slots remain out of scope.

## Go / No-Go criteria

### GO for next evaluation phase if
- Android app installs/starts successfully;
- Skia renders the 128x128 viewport correctly;
- rapid touch controls behave as domain tests predict;
- app restart + Continue restores state;
- settings survive restart;
- no native crashes/storage errors appear during a short smoke session.

### NO-GO / fix V1 first if
- native dependency versions fail to build together;
- input ordering differs on-device;
- save/settings persistence is unreliable;
- viewport scaling is visibly unsuitable on target devices;
- the architecture requires React UI state to implement the next gameplay mechanics.

## Recommended next step

Do **not** add another use case yet. Perform an Android runtime smoke test and then make a go/no-go decision on a broader fidelity/content phase.

## Stack compatibility verification — 2026-08-31

Checked against current official documentation:
- Expo SDK 57 targets React Native 0.86 and React 19.2.3, with Node.js 22.13.x minimum.
- Expo currently recommends `@shopify/react-native-skia` 2.6.2.
- Expo currently recommends `@react-native-async-storage/async-storage` 2.2.0.
- React Native Skia requires React Native >=0.79 and React >=19, so the declared V1 stack is within its supported baseline.

This reduces version-selection risk but does not replace an Android native build/device test.

The executable/manual gate checklist is in [`ANDROID_SMOKE_TEST.md`](ANDROID_SMOKE_TEST.md).
