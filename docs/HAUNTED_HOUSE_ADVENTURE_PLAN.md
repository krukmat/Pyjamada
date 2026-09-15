# Pyjamada — Haunted House Adventure Plan

## Purpose

This document is the stable roadmap for evolving the Haunted Arcade bedroom vertical slice into a complete haunted-house adventure inspired by late-80s/early-90s adventure structure: one connected house, room-by-room discovery, environmental storytelling, supernatural comedy, and a final confrontation with a mad scientist.

The current Bedroom gameplay is not discarded. It is Act I and the mechanical/narrative baseline for the rest of the game.

## Wave status

| Wave | Status | Gate |
|---|---|---|
| W0 — Adventure Foundation | **IMPLEMENTED** | Connected-room architecture, persistence and Bedroom ↔ Hallway foundation |
| W1 — The House Opens | **ACCEPTED** | False escape + altered Bedroom + Hallway + backward-clock anomaly + Living Room threshold |
| W2 — Living Room | **ACTIVE** | Mystery hook / lab transmission |
| W3A — Kitchen | Planned | Domestic mechanic expansion |
| W3B — Bathroom | Planned | Dream geometry |
| W4 — Attic | Planned | Vesper/W-01 revelation |
| W5 — Basement | Planned | Mad-science transition |
| W6 — Laboratory | Planned | Final boss |
| W7 — Ending/Cohesion | Planned | Product hardening |

Implementation/task checkpoints:
- `docs/W0_ADVENTURE_FOUNDATION_TASKS.md`
- `docs/W1_THE_HOUSE_OPENS_TASKS.md`
- `docs/W1_DEBT_CLOSURE.md`
- `docs/W2_LIVING_ROOM_TASKS.md`

## Narrative spine

Wally wakes during the night and tries to leave the house. He dresses, finds the keys, survives the first Ghost and reaches the exit. The escape fails: the house folds back on itself and Wally realizes that the building no longer obeys normal rules.

Exploration reveals that the house is being distorted by a hidden dream experiment. Under the house, Dr. Vesper operates the Resonator, a machine that extracts and amplifies dream energy. Wally is an unusually strong subject, and the experiment has begun materializing nightmares into the physical world.

The game progresses from haunted domestic spaces to increasingly technological spaces until the Basement and Laboratory reveal the full experiment. The final encounter is against Vesper and the Resonator.

## Design pillars

1. **The house is the world.** Rooms form a connected adventure rather than isolated levels.
2. **Domestic object + supernatural distortion = gameplay.** Ordinary household objects should become mechanics, hazards, clues, or tools.
3. **Arcade first, adventure second.** Exploration and story must not turn the game into a slow point-and-click clone.
4. **Story through play and environment.** Prefer short reactions, objects, screens and environmental clues over long dialogue.
5. **Enemies must have narrative and mechanical purpose.** Do not add enemies only to increase count.
6. **Reuse the Haunted Arcade foundations.** Wally, Ghost, Dream Spark, threat pressure, Stage Language and deterministic screenshot infrastructure remain the baseline.
7. **Each wave must be independently testable.** Do not build the full house in one pass.

## Target house map

```text
Bedroom
   │
Hallway ── Living Room
   │          │
   ├── Kitchen
   ├── Bathroom
   └── Attic access / progression
              │
           Attic
              │
          Basement
              │
         Laboratory
```

The exact topology may evolve when gameplay requires it, but the narrative order should remain recognizable.

## Wave plan

### W0 — Adventure Foundation — IMPLEMENTED

**Goal:** make the current single-room runtime capable of supporting a connected adventure without changing Bedroom gameplay yet.

Delivered:
- `AdventureState` with current room, visited rooms, story flags and local room state.
- declarative room registry with deterministic spawn entries and legal exits;
- `AdventureSessionCoordinator` for progression orchestration;
- v3 top-level save envelope pairing Haunted simulation with Adventure progression;
- room-aware `RoomPresentation` seam below `GameCanvas`;
- deterministic adventure/save tests integrated into `test:all`.

**Gate:** Bedroom -> Hallway -> Bedroom works while story and room-local state survive navigation/save-load.

### W1 — The House Opens — ACCEPTED

**Goal:** turn the existing Bedroom slice into the real Act I and introduce the first explorable room.

Delivered:
- original wake -> dress -> keys -> Ghost -> escape loop preserved until the exit seam;
- false escape transforms terminal Bedroom success into Adventure progression;
- reusable fade transition with input lock;
- altered Bedroom with `FIND ANOTHER WAY OUT` objective;
- production Bedroom -> Hallway interaction;
- real Hallway presentation;
- backward-clock environmental anomaly;
- Living Room path unlock;
- W1 deterministic review states and end-to-end progression/save tests;
- Android visual acceptance completed.

High/Medium debt closed before W2:
- Adventure owns exploration state instead of adding an `exploration` phase to Haunted;
- exploration HUD/controls are contextual and do not expose inactive combat systems;
- room interactions live in room definitions;
- exit legality and interaction availability use the same registry contract;
- legacy W1 exploration saves are migrated.

The accepted W1 endpoint is the unlocked Living Room threshold. W2 owns crossing that threshold and all Living Room content.

### W2 — Living Room / Mystery Hook — ACTIVE

**Goal:** establish that someone or something is actively causing/observing the haunting.

Planned scope:
- Living Room room data and presentation;
- Hallway ↔ Living Room navigation;
- television as central interaction;
- distorted laboratory transmission (`RESONANCE STABLE...`);
- explicit narrative knowledge flag for the transmission;
- limited environmental storytelling through furniture/electrical clues;
- threat/noise escalation only if playtest evidence shows it adds value.

Current implementation block: **T0–T3 / Gate A**.

Implemented in this block:
- `living-room` activated in the room registry;
- Hallway -> Living Room transition uses the existing `living-room-unlocked` switch as a real exit gate;
- deterministic Living Room -> Hallway return entry;
- room-effect execution extracted behind `applyRoomInteractionEffect()` so future TV effects do not expand `AdventureExplorationRuntime` directly;
- base Living Room presentation added through the existing `RoomPresentation` seam;
- focused Gate A tests cover lock/unlock, round-trip navigation, visited rooms and save/load.

**Gate A:** Hallway -> Living Room -> Hallway works through production interactions, Living Room can be restored from save, and repository validation remains green.

**Final W2 gate:** player leaves the Living Room with the clear question: **Who is observing or controlling the house?**

Full W2 task/DAG checkpoint: `docs/W2_LIVING_ROOM_TASKS.md`.

### W3A — Kitchen / Domestic Gameplay Expansion

**Goal:** prove that room-specific domestic mechanics can generate gameplay, not just scenery.

Candidate mechanics:
- Refrigerator -> cold hazard.
- Stove/oven -> heat hazard.
- Microwave -> temporary overload or electrical interaction.
- Lighting -> visibility/threat interaction.

Only introduce a new enemy if the room requires a new threat pattern that Ghost cannot provide.

**Gate:** at least one reusable household-object gameplay mechanic is validated.

### W3B — Bathroom / Dream Geometry

**Goal:** introduce non-normal spatial logic and exploration-based progression.

Scope:
- mirror anomaly;
- reflected room differs from real room;
- reflection reveals route/clue that does not exist normally;
- limited dream-geometry trick without building a generic portal engine.

**Gate:** player discovers a new route using an environmental anomaly rather than combat.

### W4 — Attic / Revelation

**Goal:** convert mystery into explicit understanding.

Story objects:
- Dr. Vesper photograph;
- Resonator prototype/plan;
- dream-energy notes;
- `SUBJECT W-01` record.

Information should be fragmented across interactions rather than delivered as one exposition dump.

**Gate:** player understands that a scientist, a machine and Wally's dream signature are connected and that the laboratory must be found.

### W5 — Basement / Mad Science

**Goal:** transition the tone from haunted house to haunted-house-plus-mad-science.

Scope:
- cables, CRTs, energy conduits and machine infrastructure;
- power/door/terminal interactions;
- escalated environmental hazards;
- first explicitly experimental creature only if supported by room gameplay.

**Gate:** player reaches the Laboratory entrance and understands that the experiment is no longer under control.

### W6 — Laboratory / Final Boss

**Goal:** resolve the central story and gameplay arc.

Boss structure:
1. **Vesper** — traps, devices and controlled technology.
2. **The Resonator** — room geometry and earlier objects become distorted.
3. **Vesper Nightmare** — Vesper is transformed by the experiment.

Reuse visual/memory motifs from Bedroom, Living Room, Bathroom and Attic.

**Gate:** complete end-to-end adventure from Bedroom to boss defeat.

### W7 — Ending and Cohesion

**Goal:** finish the product after the whole adventure is playable.

Scope:
- final awakening sequence;
- physical evidence that events were real;
- final small Ghost sting;
- credits/retry/continue;
- audio polish;
- animation polish;
- visual consistency;
- accessibility;
- performance and release hardening.

## Cross-cutting architecture

### Adventure state

Narrative/progression state stays separate from immediate Haunted combat/physics state.

```text
AdventureGameSessionState (save envelope v3)
├── HauntedSessionState
└── AdventureState
    ├── currentRoom/currentEntry
    ├── visitedRooms
    ├── storyFlags
    └── room-local persistence
```

After the false escape, Adventure state owns progression. Haunted remains the completed Act-I simulation container while player movement state is reused by exploration.

### Room registry

Room connectivity and interaction discovery are declarative and intentionally small:

```text
RoomDefinition
├── id
├── presentationId
├── entries / spawn points
├── exits
│   ├── optional story-flag gate
│   └── optional room-switch gate
└── interactions
    ├── exit reference
    └── effect reference
```

An exit interaction references a registered `exitId`; it does not duplicate the target room/entry. Availability and actual transition legality therefore share one contract.

Do not replace this with a generic graph/scripting engine unless later gameplay proves a concrete need.

### Interaction effects

W2 adds a small effect boundary:

```text
AdventureExplorationRuntime
        |
        v
applyRoomInteractionEffect()
```

The runtime remains responsible for movement, target resolution and deciding between exit/effect interactions. Effect-specific narrative mutations/events live outside it.

This is intentionally a dispatcher seam, not a quest scripting system.

### Presentation seam

Current direction:

```text
GameCanvas
   ↓
RoomPresentation
   ├── Bedroom
   ├── Hallway
   └── Living Room
```

Shared systems stay above room presentation:
- Wally;
- camera;
- exploration controls;
- Haunted enemies/projectiles/FX when that mode is active.

The Living Room base presentation contains its major visual anchors but TV interaction/transmission belongs to later W2 tasks.

### Story state

Use explicit flags/triggers, not hidden inference from arbitrary object state.

Current progression includes:
- `bedroomEscapeAttempted`;
- `hallwayUnlocked`;
- Bedroom history: `false-escape`;
- Hallway inspection: `backward-clock`;
- Hallway switch: `living-room-unlocked`.

W2 will add a global transmission-knowledge flag only when the transmission actually exists.

### Deterministic review

Do not create a full Bedroom-sized screenshot suite for every room.

Accepted W1 review states:

```text
15_altered_bedroom
16_hallway_arrival
17_hallway_clock
18_living_room_door
```

Planned W2 focused states:

```text
19_living_room_arrival
20_tv_static
21_lab_transmission
22_post_transmission
```

The Android screenshot flow continues to validate real UI state/text rather than a synthetic renderer-ready gate.

## Development policy

- Work incrementally on `feat/haunted-house-adventure`.
- Do not implement later waves before the current wave gate passes.
- Do not add Goblin/Skull merely because they were previously planned; derive enemy needs from room gameplay and story.
- Preserve the Bedroom/Ghost slice as a regression baseline.
- No broad rewrite of Haunted runtime unless a wave proves an explicit structural limitation.
- Prefer small reusable seams over generalized adventure-engine abstractions.
- Android/device visual validation remains a local user-run gate; automated TypeScript/tests/architecture checks remain repository gates.

## Current priority

**W2 Gate A — Enter the Living Room.**

Current required evidence:

```text
1. Hallway -> Living Room is blocked before backward-clock reveal
2. clock reveal unlocks both interaction and actual transition
3. Hallway -> Living Room -> Hallway uses deterministic entries/spawns
4. Living Room is tracked in visited rooms
5. save/load can restore currentRoom = living-room
6. W1 regression and repository validation remain green
```

Once Gate A is green, the next implementation block is:

```text
W2-T4 TV interaction
  -> W2-T5 distorted transmission
  -> W2-T6 labTransmissionSeen + persistence
```

No Kitchen, new enemy or Living Room combat work starts as part of Gate A.
