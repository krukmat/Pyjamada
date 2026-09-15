# W0 — Adventure Foundation Tasks

## Status

**IMPLEMENTED — repository validation required on the final documentation commit.**

W0 prepares Pyjamada for connected-room progression while preserving the Haunted Bedroom as the reference gameplay slice. It intentionally does not implement the real Hallway content, the false-escape event, Living Room, new enemies, or story scenes.

## Gate

The implemented deterministic contract is:

```text
Bedroom
  -> placeholder Hallway
  -> mutate/persist story + room-local state
  -> Bedroom
  -> Hallway
  -> state is still present
```

The application also contains a test-hook-only room toggle so the room-aware presentation seam can be exercised without changing normal Bedroom gameplay.

---

## W0-T1 — Adventure domain model ✅

Implemented in `src/game/adventure/AdventureState.ts`.

Final state shape:

```text
AdventureState
├── schemaVersion: 1
├── currentRoom
├── currentEntry
├── visitedRooms[]
├── storyFlags
└── rooms
    └── RoomPersistentState
        ├── inspected[]
        ├── interactions[]
        └── switches{}
```

`RoomId` reserves the roadmap rooms (`bedroom`, `hallway`, `living-room`, `kitchen`, `bathroom`, `attic`, `basement`, `laboratory`) for type stability, while W0 activates only Bedroom and Hallway.

No React, Skia, combat, physics, or enemy state is embedded in this model.

---

## W0-T2 — Room registry + transition contract ✅

Implemented in `src/game/adventure/RoomRegistry.ts`.

The registry owns:
- room id;
- presentation id;
- deterministic entry/spawn points;
- legal exits.

Active W0 transitions:

```text
bedroom:bedroom-default
    -> hallway:hallway-from-bedroom

hallway:hallway-from-bedroom
    -> bedroom:bedroom-from-hallway
```

`transitionAdventure()` rejects unregistered target/entry combinations and preserves unrelated adventure state.

No generic graph engine or scripting layer was introduced.

---

## W0-T3 — Explicit story flags ✅

Implemented in `AdventureState.ts`.

Active flags:
- `bedroomEscapeAttempted`
- `hallwayUnlocked`

Helpers are immutable and idempotent. Later-story flags remain in the master roadmap rather than being prematurely added to runtime state.

---

## W0-T4 — Per-room persistence seam ✅

Implemented through `RoomPersistentState` plus immutable helpers in `AdventureState.ts`.

W0 proves persistence for:
- inspected anomalies;
- interaction ids;
- boolean local switches.

The existing Bedroom `SystemicRuntime` was **not** migrated into this structure. That is deliberate: room persistence is a seam for future rooms, not a rewrite of the validated Bedroom systems.

---

## W0-T5 — Adventure coordinator ✅

Implemented in `src/game/adventure/AdventureSessionCoordinator.ts`.

Responsibility boundary:

```text
AdventureSessionCoordinator
  -> room / story / local-room persistence

HauntedSessionRuntime
  -> physics / combat / threats / Bedroom objective

SystemicRuntime
  -> domestic interactions
```

The coordinator supports transition, restore, story flags, inspected state, interactions and local switches without importing Haunted runtime internals.

---

## W0-T6 — Save schema evolution ✅

The new top-level save envelope is `AdventureGameSessionState` in `src/game/adventure/AdventureGameSession.ts`:

```text
AdventureGameSessionState (schemaVersion 3)
├── haunted: HauntedSessionState (schemaVersion 2)
└── adventure: AdventureState (schemaVersion 1)
```

Implementation:
- `src/game/adventure/AdventureSessionCodec.ts`
- `src/game/adventure/AdventureSaveCoordinator.ts`
- `src/game/ports/AdventureGameSavePort.ts`
- `src/platform/storage/AsyncStorageAdventureGameSaveRepository.ts`

Storage key: `pyjamada:game:v3:haunted-house-adventure`.

The v2 Haunted POC save remains intentionally incompatible. Malformed/unknown rooms, invalid entries, duplicated visited rooms, invalid story flags and malformed room-local state are rejected deterministically.

The original Haunted codec remains intact as the validated sub-codec for the Haunted portion of the v3 envelope.

---

## W0-T7 — Room-aware presentation seam ✅

Implemented in `src/game/render/RoomPresentation.tsx`.

Current boundary:

```text
GameCanvas
   ↓
RoomPresentation
   ├── BedroomPresentation
   └── PlaceholderHallwayPresentation
```

`GameCanvas` keeps shared layers above room presentation:
- enemies;
- Wally;
- projectiles;
- FX;
- combat feedback;
- camera.

Bedroom rendering retains the existing object animator and Haunted treatment. The Hallway is intentionally debug-grade and is not W1 art.

---

## W0-T8 — Application integration ✅

`App.tsx` now owns the paired Haunted + Adventure session through the v3 save envelope and supplies `AdventureState` to `HauntedGameScreen`.

Behavior:
- normal production flow still starts and plays in Bedroom;
- the placeholder Hallway does not run Bedroom domestic simulation;
- room transitions reposition Wally using the registry spawn point;
- transition persistence is immediate (`room-transition` save reason);
- a transparent test-hook-only `AdventureDebugController` can toggle Bedroom ↔ Hallway;
- normal exit-completion semantics are unchanged in W0.

The real false-escape trigger belongs to W1.

---

## W0-T9 — Deterministic + regression gate ✅

`tests/adventure-runtime.test.ts` covers:
1. initial Bedroom/current-entry state;
2. Bedroom -> Hallway;
3. Hallway -> Bedroom;
4. visited rooms;
5. idempotent story flags;
6. persistent inspected/interactions/switches;
7. invalid transition rejection;
8. v3 save/load round trip;
9. malformed/legacy save rejection;
10. save throttling vs room-transition persistence.

`package.json` includes the adventure test in `test:all`, so the existing Haunted/game/presentation suite remains part of the same validation gate.

No Android/device validation is claimed by W0; device visual review remains user-run when a visual wave requires it.

---

## W0-T10 — Architecture checkpoint ✅

### Decisions frozen for W1

- Adventure progression remains separate from Haunted simulation.
- Save composition happens at the top-level v3 session envelope rather than embedding adventure fields inside `HauntedSessionState`.
- Room topology is explicit and small; no general graph engine.
- Room-specific visuals are selected below `GameCanvas` through `RoomPresentation`.
- Bedroom remains the regression baseline.
- Hallway gameplay remains intentionally paused/debug-grade until W1.

### Deliberately deferred debt

W1 owns:
- false escape;
- actual transition/fade treatment;
- altered Bedroom after the loop;
- production navigation trigger;
- real Hallway art/layout;
- Hallway anomaly interactions;
- production Hallway gameplay rules;
- Living Room door setup.

Unused legacy v2 Haunted storage classes remain in the repository for now. They are isolated and no longer used by `App.tsx`; removal can be done separately if it provides value, rather than mixing cleanup with W0 architecture.

---

## W0 Definition of Done

- [x] adventure state exists independently from combat/physics;
- [x] room registry exists;
- [x] Bedroom <-> placeholder Hallway transition works deterministically;
- [x] visited rooms, story flags and local room state persist;
- [x] adventure state survives save/load;
- [x] room-aware presentation seam is operational;
- [x] normal Bedroom gameplay semantics are intentionally unchanged;
- [x] adventure tests are included in the repository validation gate;
- [x] architecture documentation reflects the implementation;
- [x] W1 can implement false escape + real Hallway without another foundational rewrite.

## Next wave

Once final repository validation is green, W0 is closed and the next allowed scope is **W1 — The House Opens**. No Living Room, Kitchen, new enemy, or boss work should bypass W1.
