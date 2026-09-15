# W0 — Adventure Foundation Tasks

## Objective

Prepare Pyjamada to support multiple connected rooms and narrative progression while preserving the current Haunted Bedroom gameplay exactly as the reference slice.

W0 is infrastructure-first. It does **not** implement the real Hallway art/content, Living Room, new enemies, or story scenes.

## Success gate

A deterministic test must prove:

```text
Bedroom
  -> transition to placeholder Hallway
  -> mutate/persist adventure + room state
  -> return to Bedroom
  -> Bedroom/game session state remains valid
```

The existing Haunted Bedroom/Ghost tests must remain green.

---

## W0-T1 — Define adventure domain model

**Priority:** P0

Create the minimum domain types for connected-room progression.

Expected concepts:
- `RoomId`
- `AdventureState`
- `StoryFlag`
- `RoomState`
- visited-room tracking
- current-room tracking

Initial room ids may include the complete roadmap for type stability, but only `bedroom` and a placeholder `hallway` are active in W0.

**Constraints**
- No React/Skia dependencies in the domain model.
- No enemy state embedded into story flags.
- Do not duplicate Haunted combat/physics state.

**DoD**
- Type-safe initial state factory.
- Pure tests for initial/current/visited room semantics.

---

## W0-T2 — Add room registry and transition contracts

**Priority:** P0

Create a small declarative room registry.

Minimum contract:
- room id
- supported exits
- deterministic entry/spawn points
- presentation id/type

Create a pure transition function/service that validates target room + entry point and returns the next adventure state.

**Constraints**
- No generic graph engine.
- No dynamic scripting language.
- No room-specific `if` chain in `GameCanvas`.

**DoD**
- Bedroom -> Hallway and Hallway -> Bedroom valid.
- Invalid room/entry combinations fail deterministically.
- Transition preserves unrelated adventure state.

---

## W0-T3 — Introduce explicit story flags

**Priority:** P0

Create explicit narrative flags instead of inferring story progression from unrelated gameplay state.

Seed the contract with flags needed by the roadmap, while only activating those required for W0/W1.

Candidate early flags:
- `bedroomEscapeAttempted`
- `hallwayUnlocked`

Future/reserved flags can remain documented rather than implemented if they add no current value.

**DoD**
- Pure helpers to read/set flags without mutation.
- Tests prove idempotent flag setting and persistence across room changes.

---

## W0-T4 — Per-room persistent state seam

**Priority:** P0

Define how room-specific state survives leaving and re-entering a room.

W0 should support small serializable room state, for example:
- inspected anomaly ids
- used room interactions
- local switches/doors

Do not migrate existing Bedroom systems wholesale into this structure unless required. The goal is a seam for future rooms, not a rewrite of `SystemicRuntime`.

**DoD**
- Hallway placeholder can store one deterministic local value.
- Value survives Hallway -> Bedroom -> Hallway.
- Bedroom Haunted session behavior remains unchanged.

---

## W0-T5 — Adventure session coordinator

**Priority:** P0

Introduce the orchestration layer that owns adventure progression without absorbing low-level Haunted responsibilities.

Expected responsibility split:

```text
Adventure coordinator
  -> current room / story / room persistence

HauntedSessionRuntime
  -> physics / combat / threats / current gameplay state

SystemicRuntime
  -> domestic interaction rules
```

The coordinator should expose the minimum operations needed by W1, such as:
- enter/transition room
- set story flag
- update room-local state

**DoD**
- No cyclic dependencies between adventure and Haunted runtime.
- Deterministic round-trip test works through the coordinator.

---

## W0-T6 — Save schema evolution

**Priority:** P0

Extend persistence to include AdventureState.

Requirements:
- explicit schema version bump if needed;
- encode/decode current room;
- visited rooms;
- story flags;
- room-local state;
- deterministic handling of malformed/unknown room ids.

Preserve the existing policy that old incompatible POC saves may be rejected rather than supported indefinitely, but failure must be explicit and tested.

**DoD**
- Adventure round-trip codec test.
- Save/load after a room transition restores the same room/progression.
- Existing relevant save tests remain green or are deliberately migrated.

---

## W0-T7 — Room-aware presentation seam

**Priority:** P1

Refactor only enough presentation code to allow the current room to select a room renderer/presentation without turning `GameCanvas` into a multi-room switchboard.

Target direction:

```text
GameCanvas
  -> RoomPresentation
       -> Bedroom presentation
       -> Placeholder Hallway presentation
```

W0 Hallway may be visually minimal/debug-grade. It exists to validate the seam, not to establish final art.

Shared layers should stay shared where possible:
- player
- enemy layer
- projectiles
- FX
- camera/HUD responsibilities

**DoD**
- Existing Bedroom presentation is visually/structurally preserved.
- Placeholder Hallway can render through the same top-level gameplay screen.
- No broad duplicate canvas implementation.

---

## W0-T8 — Application integration / transition state

**Priority:** P1

Connect the adventure coordinator to `HauntedGameScreen` (or a narrow parent controller) so room changes are representable at application level.

W0 may use an internal/test-only trigger for the placeholder transition; the real exit interaction belongs to W1.

Introduce a reusable transition state contract suitable for later fade/door transitions, but do not spend time polishing animation yet.

**DoD**
- UI/runtime can move Bedroom -> placeholder Hallway -> Bedroom.
- No terminal success semantics are changed yet in normal gameplay.

---

## W0-T9 — Deterministic scenario + regression tests

**Priority:** P0/P1

Add tests covering the new architecture and protect the existing slice.

Required coverage:
1. initial adventure state starts in Bedroom;
2. Bedroom -> Hallway transition;
3. Hallway -> Bedroom transition;
4. visited rooms update correctly;
5. story flags survive transitions;
6. room-local state survives transitions;
7. save/load preserves adventure progression;
8. invalid transition is rejected;
9. existing Haunted combat/playthrough/presentation tests remain green.

Add at most one or two placeholder deterministic screenshot/test scenarios if useful for the presentation seam. Do not expand the screenshot suite unnecessarily in W0.

---

## W0-T10 — Architecture/docs checkpoint

**Priority:** P1

At W0 completion, update this document with actual implementation paths and decisions.

Document:
- final AdventureState shape;
- final room registry seam;
- save version decision;
- presentation boundary;
- known debt intentionally deferred to W1.

**DoD**
- Repository documentation matches implementation.
- No speculative abstraction remains documented as if implemented.

---

## Execution order

```text
T1 Domain model
   |
   +--> T2 Room registry/transitions
   |      |
   |      +--> T5 Adventure coordinator
   |
   +--> T3 Story flags
   |
   +--> T4 Room persistence
             |
             +--> T5

T1-T5
   |
   +--> T6 Save schema
   +--> T7 Presentation seam
            |
            +--> T8 App integration

T2-T8
   |
   +--> T9 Full deterministic/regression gate
             |
             +--> T10 Documentation checkpoint
```

## Scope guardrails

Explicitly out of W0:
- final Hallway art;
- false-escape story event;
- changing current success/exit gameplay;
- Living Room;
- TV transmission;
- Kitchen/Bathroom/Attic/Basement/Lab;
- Goblin, Skull or any new enemy;
- boss systems;
- dialogue system;
- generic quest engine;
- generic scripting engine;
- full cinematic framework.

## W0 Definition of Done

W0 is complete only when:

- [ ] adventure state exists independently from combat/physics;
- [ ] room registry exists;
- [ ] Bedroom <-> placeholder Hallway transition works;
- [ ] visited rooms, story flags and local room state persist;
- [ ] adventure state survives save/load;
- [ ] room-aware presentation seam is operational;
- [ ] no current Bedroom gameplay behavior is intentionally changed;
- [ ] automated validation is green;
- [ ] architecture documentation reflects the implementation;
- [ ] W1 can implement the false escape + real Hallway without another foundational rewrite.
