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
| W3A — Kitchen | **ACCEPTED** | Domestic electrical manipulation: overload → reroute → Bathroom boundary |
| W3B — Bathroom | **ACTIVE — GATE A REVIEW** | Mirror mismatch + light-state reveal + concrete Attic boundary |
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
- `docs/W3_BATHROOM_TASKS.md`

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
          Bathroom
              │
        Attic boundary
              │
           Attic
              │
          Basement
              │
         Laboratory
```

The topology may evolve when gameplay proves a better route, but W3B deliberately turns Kitchen's signal into Bathroom dream-geometry progression and then a concrete Attic boundary.

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

### W3A — Kitchen / Domestic Gameplay Expansion — ACCEPTED

**Goal:** prove that a domestic object can generate causal gameplay, not just story inspection.

Accepted loop:

```text
Living Room source cue
 -> Kitchen
 -> TRACE THE POWER
 -> breaker alone gives clue: needs a load
 -> microwave overloads circuit
 -> lights fail/flicker
 -> CHECK THE BREAKER
 -> breaker reroutes power
 -> FOLLOW THE PULSE
 -> Bathroom boundary activates
```

Delivered:
- Living Room ↔ Kitchen production route after `source-hum-traced`;
- Microwave overload + Breaker reroute causal loop;
- persistent room-local electrical state;
- solved-state idempotence and save/load coverage;
- distinct normal/overload/rerouted presentation;
- no extra appliance mechanic or combat;
- Android evidence 23–25 established the mechanic.

The Android review identified two small presentation debts, both closed before W3B:
- initial overhead light no longer contradicts the dead-appliance state;
- deterministic overload framing now points Wally at the Breaker/next action.

The rerouted state now exposes a concrete Bathroom boundary, removing the temporary `FOLLOW THE PULSE` dead-end.

Detailed closeout: `docs/W3_KITCHEN_TASKS.md`.

### W3B — Bathroom / Reflection Geometry — ACTIVE

**Goal:** introduce useful impossible spatial logic while making environmental state carry the mechanic before explanatory text.

Implemented Gate A sequence:

```text
Kitchen power rerouted
 -> Bathroom
 -> real pulse stops at sink
 -> mirror shows pulse continuing through impossible geometry
 -> inspect mismatch
 -> TEST THE REFLECTION
 -> switch off real light
 -> reflection remains unnaturally lit / cyan
 -> CHECK THE MIRROR
 -> confirm reflected route
 -> real wall adopts matching cyan seam
 -> ATTIC ACCESS REVEALED
```

Delivered code scope:
- Kitchen ↔ Bathroom production navigation gated by Kitchen `power-rerouted`;
- distinct Bathroom renderer with sink, mirror, light switch and stopped real pulse;
- reflected continuation and route seam absent from normal geometry;
- deliberate light-state experiment: real room darkens while mirror remains illuminated;
- room-local `mirror-anomaly-seen`, `bathroom-light-off`, `mirror-route-revealed` progression;
- route cannot be revealed by repeated mirror inspection before the light test;
- route reveal is idempotent and survives save/load;
- final real-wall seam exposes an Attic boundary without implementing Attic interior;
- no generic portal/reflection engine, inventory, combat, or extra Bathroom fixtures.

Android Gate A evidence pending review:

```text
26_bathroom_arrival
27_bathroom_mirror_mismatch
28_bathroom_reflected_route
29_bathroom_route_revealed
```

The same refreshed tour revalidates corrected Kitchen evidence 23–25.

**Gate:** the player should understand through visual state and one deliberate room manipulation that the reflection exposes geometry hidden from the normal house.

Detailed checkpoint: `docs/W3_BATHROOM_TASKS.md`.

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
        +-- Bathroom
```

The runtime owns movement, target resolution and dispatch. Room-specific mutations/events stay outside it.

W3 does **not** generalize the microwave/breaker relationship into a generic power engine, nor the Bathroom reflection into a generic portal engine. A second concrete reuse case is required before extracting either abstraction.

### Presentation seam

```text
GameCanvas
   ↓
RoomPresentation
   ├── Bedroom
   ├── Hallway
   ├── Living Room
   ├── Kitchen
   └── Bathroom
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
- Kitchen `circuit-overloaded` / `power-rerouted`;
- Bathroom `mirror-anomaly-seen` / `bathroom-light-off` / `mirror-route-revealed`.

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

W3A accepted gameplay evidence / refreshed polish validation:

```text
23_kitchen_arrival
24_kitchen_overload
25_kitchen_power_rerouted
```

W3B Gate A review:

```text
26_bathroom_arrival
27_bathroom_mirror_mismatch
28_bathroom_reflected_route
29_bathroom_route_revealed
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

**W3B Gate A — Bathroom Dream Geometry / Android review.**

Required evidence:

```text
1. 23 Kitchen arrival now reads electrically dead without contradictory warm ceiling light
2. 24 Kitchen overload frames Breaker as the next action
3. 25 Kitchen rerouted exposes an actionable Bathroom boundary
4. 26 Bathroom arrival clearly shows real pulse terminating
5. 27 mirror mismatch is discoverable without depending on caption text
6. 28 real room becomes materially dark while mirror remains visibly active
7. 29 the real-wall seam reads as concrete Attic access, not decorative glow
8. W0–W3A automated regression remains green
```

Do not implement Attic interior until this gate passes.
