# Pyjamada — Haunted House Adventure Plan

## Purpose

This document is the stable roadmap for evolving the Haunted Arcade bedroom vertical slice into a complete haunted-house adventure inspired by late-80s/early-90s adventure structure: one connected house, room-by-room discovery, environmental storytelling, supernatural comedy, and a final confrontation with a mad scientist.

The Bedroom gameplay is Act I and remains the mechanical/narrative regression baseline for the rest of the game.

## Wave status

| Wave | Status | Gate |
|---|---|---|
| W0 — Adventure Foundation | **IMPLEMENTED** | Connected-room architecture, persistence and Bedroom ↔ Hallway foundation |
| W1 — The House Opens | **ACCEPTED** | False escape + altered Bedroom + Hallway + backward-clock anomaly + Living Room threshold |
| W2 — Living Room | **ACCEPTED** | Mystery hook + lab transmission + directional source cue |
| W3A — Kitchen | **ACTIVE — GATE A REVIEW** | Domestic electrical manipulation: overload → reroute → follow pulse |
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
- `docs/W3_KITCHEN_TASKS.md`

## Narrative spine

Wally wakes during the night and tries to leave the house. He dresses, finds the keys, survives the first Ghost and reaches the exit. The escape fails: the house folds back on itself and Wally realizes that the building no longer obeys normal rules.

Exploration reveals that the house is being distorted by a hidden dream experiment. Under the house, Dr. Vesper operates the Resonator, a machine that extracts and amplifies dream energy. Wally is an unusually strong subject, and the experiment has begun materializing nightmares into the physical world.

The game progresses from haunted domestic spaces to increasingly technological spaces until the Basement and Laboratory reveal the full experiment. The final encounter is against Vesper and the Resonator.

## Design pillars

1. **The house is the world.** Rooms form a connected adventure rather than isolated levels.
2. **Domestic object + supernatural distortion = gameplay.** Ordinary household objects become mechanics, hazards, clues or tools.
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
              │
           Kitchen
              │
         future routes
        /             \
   Bathroom          Attic
                       │
                   Basement
                       │
                  Laboratory
```

Exact topology may evolve when gameplay requires it, but the narrative order should remain recognizable.

## Wave plan

### W0 — Adventure Foundation — IMPLEMENTED

**Goal:** support a connected adventure without rewriting Bedroom gameplay.

Delivered:
- `AdventureState` with current room, visited rooms, story flags and local room state;
- declarative room registry with deterministic entries/exits;
- `AdventureSessionCoordinator`;
- v3 top-level save envelope pairing Haunted + Adventure state;
- room-aware `RoomPresentation` seam below `GameCanvas`;
- deterministic adventure/save tests.

### W1 — The House Opens — ACCEPTED

**Goal:** turn the Bedroom slice into Act I and introduce exploration.

Delivered:
- wake → dress → keys → Ghost → escape loop preserved;
- false escape into Adventure progression;
- reusable fade/input lock;
- altered Bedroom;
- production Bedroom ↔ Hallway navigation;
- Hallway presentation;
- backward-clock anomaly;
- Living Room path unlock;
- W1 visual + E2E acceptance.

High/Medium debt closed before W2:
- Adventure owns exploration state;
- exploration HUD/controls are contextual;
- room interactions live in room definitions;
- exit legality and interaction availability share one registry contract;
- legacy W1 exploration saves migrate safely.

### W2 — Living Room / Mystery Hook — ACCEPTED

**Goal:** establish that the haunting is being deliberately observed/driven and provide a reason to continue deeper into the house.

Accepted sequence:

```text
Living Room
 -> TV static
 -> distorted transmission
 -> RESONANCE STABLE... SUBJECT...
 -> FIND THE SOURCE
 -> radio matches the pulse
 -> source-hum-traced
```

Delivered:
- Hallway ↔ Living Room navigation;
- TV OFF/static/transmission presentation;
- explicit `labTransmissionSeen` global knowledge;
- optional photo-reflection anomaly;
- optional radio/static clue;
- directional cable/pulse closeout;
- save/load and idempotence coverage;
- Android evidence 19–22 accepted.

Threat evaluation result: **no Living Room combat escalation**. The room already delivers its discovery purpose without reopening the Haunted combat boundary.

### W3A — Kitchen / Domestic Gameplay Expansion — ACTIVE

**Goal:** prove that a domestic object can generate causal gameplay, not just story inspection.

Chosen Gate A mechanic:

```text
Living Room source cue
 -> Kitchen
 -> TRACE THE POWER
 -> breaker alone gives clue: needs a load
 -> microwave overloads the circuit
 -> lights fail/flicker
 -> CHECK THE BREAKER
 -> breaker reroutes the power
 -> FOLLOW THE PULSE
```

Implemented Gate A scope:
- Kitchen is a real room connected to Living Room only after `source-hum-traced`;
- deterministic Kitchen/Living Room round-trip entries;
- microwave interaction creates `circuit-overloaded`;
- breaker before load only provides a clue;
- breaker after overload clears it and sets `power-rerouted`;
- solved state cannot accidentally reopen;
- Kitchen presentation shows stable, overloaded and rerouted states;
- save/load restores current room and electrical state;
- focused deterministic Android states 23–25.

Gate A does **not** add:
- Bathroom;
- inventory;
- generic puzzle/electrical engine;
- refrigerator/oven mechanics;
- enemies/combat;
- the next room after `FOLLOW THE PULSE`.

**Gate A acceptance target:** player understands through play that creating an electrical load lets them reroute the house's power and continue tracing the same anomalous signal.

After Android review, decide whether Kitchen needs one small secondary mechanic. Do not automatically expand scope.

### W3B — Bathroom / Dream Geometry — PLANNED

**Goal:** introduce non-normal spatial logic and exploration-based progression.

Candidate scope:
- mirror anomaly;
- reflected room differs from real room;
- reflection reveals a clue/route absent in reality;
- limited dream-geometry trick without a generic portal engine.

**Gate:** player discovers progress through an environmental anomaly rather than combat.

### W4 — Attic / Revelation — PLANNED

**Goal:** convert mystery into explicit understanding.

Story objects:
- Dr. Vesper photograph;
- Resonator prototype/plan;
- dream-energy notes;
- `SUBJECT W-01` record;
- phrase: `DREAMS ARE MATTER WAITING FOR INSTRUCTIONS`.

Information remains fragmented across interactions rather than one exposition dump.

**Gate:** player understands that a scientist, machine and Wally's dream signature are connected and that the laboratory must be found.

### W5 — Basement / Mad Science — PLANNED

**Goal:** transition the tone from haunted house to haunted-house-plus-mad-science.

Scope:
- cables, CRTs, energy conduits and machine infrastructure;
- power/door/terminal interactions;
- escalated environmental hazards;
- experimental creature only if room gameplay requires it.

**Gate:** player reaches the Laboratory entrance and understands the experiment is no longer under control.

### W6 — Laboratory / Final Boss — PLANNED

**Goal:** resolve the central story and gameplay arc.

Boss structure:
1. **Vesper** — traps, devices and controlled technology.
2. **The Resonator** — room geometry and earlier objects become distorted.
3. **Vesper Nightmare** — Vesper is transformed by the experiment.

Reuse motifs from Bedroom, Living Room, Bathroom and Attic.

**Gate:** complete end-to-end adventure from Bedroom to boss defeat.

### W7 — Ending and Cohesion — PLANNED

**Goal:** finish the product after the whole adventure is playable.

Scope:
- final awakening sequence;
- physical evidence events were real;
- final small Ghost sting;
- credits/retry/continue;
- audio/animation polish;
- visual consistency;
- accessibility;
- performance and release hardening.

## Cross-cutting architecture

### Adventure state

```text
AdventureGameSessionState (save envelope v3)
├── HauntedSessionState
└── AdventureState
    ├── currentRoom/currentEntry
    ├── visitedRooms
    ├── storyFlags
    └── room-local persistence
```

After false escape, Adventure owns progression. Haunted remains the completed Act-I simulation container while exploration reuses player movement state.

### Room registry

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

Exit interactions reference registered `exitId`s rather than duplicating target routing.

### Interaction effects

```text
AdventureExplorationRuntime
        |
        v
applyRoomInteractionEffect()
        |
        +-- Hallway
        +-- Living Room
        +-- Kitchen
```

The runtime owns movement, target resolution and dispatch. Room-specific mutations/events stay outside it.

W3 does **not** generalize the microwave/breaker relationship into a generic power engine. A second concrete reuse case is required before extracting one.

### Presentation seam

```text
GameCanvas
   ↓
RoomPresentation
   ├── Bedroom
   ├── Hallway
   ├── Living Room
   └── Kitchen
```

Shared Wally/camera/control systems remain above room presentation.

### Story/progression state

Global story flags are reserved for cross-wave knowledge:
- `bedroomEscapeAttempted`;
- `hallwayUnlocked`;
- `labTransmissionSeen`.

Room-local switches/history remain local unless a later wave proves cross-room dependence. Current examples:
- Hallway `living-room-unlocked`;
- Living Room `source-hum-traced`;
- Kitchen `circuit-overloaded` / `power-rerouted`.

### Deterministic review

Accepted W1:

```text
15_altered_bedroom
16_hallway_arrival
17_hallway_clock
18_living_room_door
```

Accepted W2:

```text
19_living_room_arrival
20_living_room_static
21_lab_transmission
22_living_room_source_cue
```

W3A Gate A review:

```text
23_kitchen_arrival
24_kitchen_overload
25_kitchen_power_rerouted
```

The Android flow validates real UI state/text rather than a synthetic renderer-ready gate.

## Development policy

- Work incrementally on `feat/haunted-house-adventure`.
- Do not implement later waves before the current wave gate passes.
- Do not add Goblin/Skull merely because they were previously planned; derive enemy needs from room gameplay/story.
- Preserve Bedroom/Ghost as regression baseline.
- Avoid broad Haunted runtime rewrites without a concrete structural need.
- Prefer small reusable seams over generalized adventure-engine abstractions.
- Android/device validation remains user-run; repository CI covers automated TypeScript/tests/static contracts.

## Current priority

**W3A Gate A — Kitchen Power Loop / Android review.**

Required evidence:

```text
1. Kitchen remains locked until Living Room source-hum-traced
2. Living Room -> Kitchen -> Living Room navigation is deterministic
3. 23_kitchen_arrival reads as a distinct domestic room
4. 24_kitchen_overload clearly communicates the microwave-caused power failure
5. 25_kitchen_power_rerouted clearly communicates a stable redirected pulse
6. breaker-first clue makes the causal relationship understandable
7. solved state survives Continue/save-load
8. W0–W2 regression and repository validation remain green
```

No Bathroom or additional Kitchen system starts before Gate A review.
