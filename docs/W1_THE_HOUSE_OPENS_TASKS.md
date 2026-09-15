# W1 — The House Opens

## Objective

Turn the existing Haunted Bedroom vertical slice into the real Act I of Pyjamada and prove that the W0 adventure foundation supports a connected, story-driven house.

W1 ends at the Living Room threshold. It does **not** implement the Living Room itself, the TV transmission, or any new enemy.

## Player-facing flow

```text
Wake
  -> dress
  -> keys
  -> Ghost / Dream Spark
  -> escape ready
  -> reach exit
  -> FALSE ESCAPE
  -> altered Bedroom
  -> find another way out
  -> Hallway
  -> inspect backward clock
  -> Living Room path revealed
  -> reach Living Room door
```

The central narrative statement of W1 is:

> Leaving the Bedroom did not end the game. Wally has discovered that the house itself is wrong.

## Dependency DAG

```text
T1 False escape semantics
        |
        +------> T3 Altered Bedroom
        |            |
T2 Transition fade   +------> T4 Bedroom -> Hallway
        |                         |
        +-------------------------+
                                  |
                                  v
                             T5 Hallway
                                  |
                                  v
                           T6 Clock anomaly
                                  |
                                  v
                         T7 Living Room hook

T1 + T4 ---------------------> T8 Persistence hardening
T2 + T3 + T5 + T6 + T7 -----> T9 Deterministic review
T1..T9 ----------------------> T10 End-to-end gate
```

## Internal gates

### Gate A — The house opens

- T1 false escape
- T2 reusable fade
- T3 altered Bedroom
- T4 real Bedroom -> Hallway navigation

**Gate:** the existing Bedroom loop reaches the exit, transitions into the false-escape state, and Wally can enter Hallway through normal gameplay.

### Gate B — Hallway story beat

- T5 real Hallway presentation
- T6 backward-clock anomaly
- T7 Living Room boundary

**Gate:** the Hallway is a real explorable room, inspecting the clock reveals the Living Room path, and W1 stops at the Living Room threshold without implementing W2.

### Gate C — Persistence and evidence

- T8 persistence hardening
- T9 deterministic scenarios / screenshot contract
- T10 end-to-end deterministic playthrough

**Gate:** the complete W1 progression survives save/load and all automated repository gates remain green. Android visual acceptance remains a local device review.

---

## Task status and implementation

### W1-T1 — False escape semantics

**Status:** IMPLEMENTED

Normal gameplay still uses the original Haunted Bedroom mechanics until `SESSION_COMPLETED`. The application intercepts that completion seam and applies the false-escape transformation rather than leaving the run in terminal victory.

Implementation:
- `src/game/adventure/AdventureExplorationRuntime.ts`
  - `applyFalseEscape(...)`
- `App.tsx`
  - `beginFalseEscape(...)`

Result:
- `bedroomEscapeAttempted = true`
- `hallwayUnlocked = true`
- Wally rematerializes inside Bedroom
- active Ghost/projectile combat residue is cleared
- Haunted objective becomes `exploration`
- Bedroom records the `false-escape` interaction

### W1-T2 — Reusable room transition fade

**Status:** IMPLEMENTED

Implementation:
- `src/app/RoomTransitionOverlay.tsx`
- `App.tsx`
  - `runRoomFade(...)`
  - transition input lock

The transition is deliberately small: fade out -> state/spawn switch -> fade in. There is no generalized cinematic framework.

### W1-T3 — Altered Bedroom

**Status:** IMPLEMENTED

Implementation:
- `src/game/render/RoomPresentation.tsx`
- `src/app/HauntedGameScreen.tsx`

Changes after the false escape:
- colder/stranger overlay and small anomaly cues;
- combat pressure removed;
- new objective: `FIND ANOTHER WAY OUT`;
- domestic-object interaction focus no longer drives the phase;
- Hallway door becomes the meaningful interaction.

The Bedroom layout and Act-I gameplay remain the regression baseline before the false escape.

### W1-T4 — Real Bedroom -> Hallway navigation

**Status:** IMPLEMENTED

Implementation:
- `src/game/adventure/AdventureExplorationRuntime.ts`
- `src/game/adventure/RoomRegistry.ts`
- `App.tsx`

The Bedroom-to-Hallway exit now requires the `hallwayUnlocked` story flag. The W0 debug transition is no longer the only way to enter Hallway; normal interaction emits `ROOM_TRANSITION_REQUESTED` and uses the room coordinator/spawn contract.

### W1-T5 — Hallway room

**Status:** IMPLEMENTED

Implementation:
- `src/game/render/RoomPresentation.tsx`

The W0 placeholder is replaced by a real W1 presentation containing:
- haunted-house wall/floor language;
- Bedroom door;
- Living Room door;
- framed portraits;
- central clock;
- room-specific lighting/readability treatment.

No new enemy was introduced because W1's Hallway purpose is exploration and mystery, not combat variety.

### W1-T6 — Backward-clock anomaly

**Status:** IMPLEMENTED

Implementation:
- `src/game/adventure/AdventureExplorationRuntime.ts`
- `src/game/render/RoomPresentation.tsx`

Inspection persists:
- `hallway.inspected += backward-clock`
- `hallway.switches[living-room-unlocked] = true`

It emits:
- `HALLWAY_CLOCK_INSPECTED`
- `LIVING_ROOM_PATH_REVEALED`

The clock is visually presented with hands moving in the wrong direction.

### W1-T7 — Living Room hook

**Status:** IMPLEMENTED

The Living Room itself remains outside W1.

Before the clock reveal, its Hallway door reads as sealed. After the anomaly is inspected, the door becomes visually active. Interacting at the threshold stores `living-room-door` and emits `LIVING_ROOM_DOOR_REACHED` without transitioning to `living-room`.

This is the explicit W1 -> W2 boundary.

### W1-T8 — Persistence hardening

**Status:** IMPLEMENTED

The existing v3 adventure save envelope persists:
- Haunted exploration objective;
- false-escape flags;
- current room / entry;
- visited rooms;
- Hallway anomaly state;
- Living Room unlock state;
- Living Room threshold interaction.

Save/load coverage is in:
- `tests/adventure-runtime.test.ts`
- `tests/w1-house-opens-playthrough.test.ts`

### W1-T9 — Deterministic review scenarios

**Status:** IMPLEMENTED; DEVICE REVIEW PENDING

Four W1 scenario fixtures were added without multiplying the Bedroom suite:

```text
15_altered_bedroom
16_hallway_arrival
17_hallway_clock
18_living_room_door
```

Implementation:
- `src/app/HauntedScreenshotScenarios.ts`
- `tests/haunted-screenshot-scenarios.test.ts`
- `maestro/screenshots.yaml`
- `scripts/android-screenshots.sh`
- `scripts/android-screenshots.test.mjs`

The Maestro flow continues to wait on real UI state/text. It does not use `haunted-render-ready` as a gate.

The Android capture itself must be executed locally by the user with:

```bash
npm run screenshots:android
```

### W1-T10 — End-to-end W1 gate

**Status:** AUTOMATED PASS; DEVICE REVIEW PENDING

`tests/w1-house-opens-playthrough.test.ts` proves one continuous deterministic path:

```text
escape-ready Bedroom
  -> interact at exit
  -> Haunted SESSION_COMPLETED seam
  -> false escape
  -> altered Bedroom
  -> Hallway transition request
  -> Hallway entry
  -> backward-clock inspection
  -> Living Room reveal
  -> Living Room threshold
  -> save/load roundtrip
```

The test deliberately verifies that W1 stops in Hallway and does not enter W2.

Repository validation is green through the full automated stack:
- asset validation;
- game/settings/presentation/adventure tests;
- W1 end-to-end playthrough;
- TypeScript typecheck;
- static architecture audit.

---

## Scope deliberately deferred

Not part of W1:
- Living Room renderer/content;
- TV transmission / `Resonance stable...`;
- Dr. Vesper reveal;
- new enemies;
- Kitchen;
- Bathroom;
- Attic;
- Basement;
- Laboratory;
- generic quest engine;
- generic cinematic framework.

## W1 Definition of Done

- [x] existing Haunted Bedroom loop remains the Act-I entry path;
- [x] exit becomes false escape in normal gameplay;
- [x] reusable fade transition exists;
- [x] altered Bedroom communicates that the world changed;
- [x] Bedroom -> Hallway works through normal interaction;
- [x] Hallway placeholder is replaced by a real explorable presentation;
- [x] backward clock is inspectable and persistent;
- [x] clock reveal unlocks the Living Room path;
- [x] W1 stops at the Living Room boundary rather than leaking into W2;
- [x] save/load preserves W1 progression;
- [x] deterministic W1 screenshot fixtures exist;
- [x] deterministic end-to-end W1 playthrough exists;
- [x] repository CI is green through the final W1 implementation and master-plan checkpoint;
- [ ] local Android screenshot/playtest gate has been reviewed.

W1 is **code-complete and automated-gate complete, but not yet visually accepted on device**. W2 must not start before the local Android review passes.
