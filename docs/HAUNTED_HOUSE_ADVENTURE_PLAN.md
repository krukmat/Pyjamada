# Pyjamada — Haunted House Adventure Plan

## Purpose

This document is the stable roadmap for evolving the Haunted Arcade bedroom vertical slice into a complete haunted-house adventure inspired by late-80s/early-90s adventure structure: one connected house, room-by-room discovery, environmental storytelling, supernatural comedy, and a final confrontation with a mad scientist.

The current Bedroom gameplay is not discarded. It is Act I and the mechanical/narrative baseline for the rest of the game.

## Wave status

| Wave | Status | Gate |
|---|---|---|
| W0 — Adventure Foundation | **IMPLEMENTED** | Connected-room architecture, persistence and Bedroom ↔ Hallway foundation |
| W1 — The House Opens | **ACCEPTED** | False escape + altered Bedroom + Hallway + backward-clock anomaly + Living Room threshold |
| W2 — Living Room | **ACTIVE — CLOSEOUT REVIEW** | Mystery hook accepted; final source-cue Android review pending |
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

### W2 — Living Room / Mystery Hook — ACTIVE / CLOSEOUT REVIEW

**Goal:** establish that someone or something is actively causing/observing the haunting, then leave a concrete reason to continue exploring without opening W3 prematurely.

Delivered so far:
- real Hallway ↔ Living Room navigation and deterministic spawns;
- Living Room presentation through the existing room seam;
- small room-effect dispatcher outside `AdventureExplorationRuntime`;
- TV interaction with OFF -> static/interference -> distorted transmission states;
- explicit global story flag `labTransmissionSeen` with save migration;
- Android-accepted mystery hook through `RESONANCE STABLE... SUBJECT...`;
- optional photo-reflection anomaly;
- optional radio/static clue;
- post-transmission radio pulse that reveals a directional source cue;
- cable/pulse presentation pointing deeper into the house;
- automated persistence/idempotence coverage for the closeout state.

Accepted Gate B sequence:

```text
Living Room
 -> TV static
 -> distorted transmission
 -> labTransmissionSeen
 -> FIND THE SOURCE
```

Closeout sequence under final Android review:

```text
FIND THE SOURCE
 -> inspect radio
 -> matching pulse
 -> source-hum-traced
 -> cable/pulse points deeper into house
```

Threat/noise evaluation result: **no Living Room combat escalation in W2**. Gate B worked without evidence that a Ghost encounter would improve the room; reopening the Haunted combat boundary would add complexity without demonstrated value.

**Final W2 gate:** player leaves the Living Room understanding that the haunting is being monitored/driven and that the signal continues deeper into the house, while Kitchen/Bathroom remain unimplemented.

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

W2 uses a small effect boundary:

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

Living Room presentation owns room-specific TV, photo, radio and cable visuals while their state remains in Adventure progression.

### Story state

Use explicit flags/triggers, not hidden inference from arbitrary object state.

Current global progression includes:
- `bedroomEscapeAttempted`;
- `hallwayUnlocked`;
- `labTransmissionSeen`.

Relevant local history/switches include:
- Bedroom interaction `false-escape`;
- Hallway inspection `backward-clock`;
- Hallway switch `living-room-unlocked`;
- Living Room `tv-on` / `tv-transmission`;
- Living Room `photo-reflection`;
- Living Room `radio-static`;
- Living Room `source-hum-traced`.

Do not promote room-local clues into global flags unless a later wave genuinely depends on them.

### Deterministic review

Do not create a full Bedroom-sized screenshot suite for every room.

Accepted W1 review states:

```text
15_altered_bedroom
16_hallway_arrival
17_hallway_clock
18_living_room_door
```

W2 focused states:

```text
19_living_room_arrival
20_living_room_static
21_lab_transmission
22_living_room_source_cue
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

**W2 T11 — final Android closeout acceptance.**

Current required evidence:

```text
1. 19–21 remain visually stable after the closeout changes
2. photo/radio read as secondary clues, not competing quest targets
3. 22_living_room_source_cue clearly communicates a matching pulse deeper in the house
4. cable glow is directional but not over-emphasized
5. touch PHOTO / RADIO interactions feel natural
6. Continue preserves source-hum-traced
7. repository validation remains green
```

If this gate passes, mark W2 `ACCEPTED` and plan W3 without implementing Kitchen/Bathroom during W2 closeout.
