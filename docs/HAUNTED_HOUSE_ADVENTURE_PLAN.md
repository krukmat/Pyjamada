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
| W3B — Bathroom | **ACCEPTED** | Mirror mismatch + light-state reveal + concrete Attic boundary |
| W4 — Attic | **ACCEPTED** | Connected evidence + W-01 revelation + concrete Basement boundary |
| W5 — Basement | **PLANNED — UNBLOCKED** | Mad-science transition |
| W6 — Laboratory | Planned | Final boss |
| W7 — Ending/Cohesion | Planned | Product hardening |

Implementation/task checkpoints:
- `docs/W0_ADVENTURE_FOUNDATION_TASKS.md`
- `docs/W1_THE_HOUSE_OPENS_TASKS.md`
- `docs/W1_DEBT_CLOSURE.md`
- `docs/W2_LIVING_ROOM_TASKS.md`
- `docs/W3_KITCHEN_TASKS.md`
- `docs/W3_BATHROOM_TASKS.md`
- `docs/W4_ATTIC_REVELATION_TASKS.md`

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
           Attic
              │
      Basement boundary
              │
          Basement
              │
         Laboratory
```

W3B turns Kitchen's signal into Bathroom dream-geometry progression. W4 then turns the reflected Attic route into explicit experiment knowledge and a concrete Basement destination.

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
- Android evidence 23–25 accepted.

The Android review identified two small presentation debts, both closed before W3B:
- initial overhead light no longer contradicts the dead-appliance state;
- deterministic overload framing points Wally at the Breaker/next action.

The rerouted state exposes a concrete Bathroom boundary, removing the temporary `FOLLOW THE PULSE` dead-end.

Detailed closeout: `docs/W3_KITCHEN_TASKS.md`.

### W3B — Bathroom / Reflection Geometry — ACCEPTED

**Goal:** introduce useful impossible spatial logic while making environmental state carry the mechanic before explanatory text.

Accepted sequence:

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

Delivered:
- Kitchen ↔ Bathroom production navigation gated by Kitchen `power-rerouted`;
- distinct Bathroom renderer with sink, mirror, light switch and stopped real pulse;
- reflected continuation and route seam absent from normal geometry;
- deliberate light-state experiment: real room darkens while mirror remains illuminated;
- room-local `mirror-anomaly-seen`, `bathroom-light-off`, `mirror-route-revealed` progression;
- route cannot be revealed by repeated mirror inspection before the light test;
- route reveal is idempotent and survives save/load;
- final real-wall seam exposes an actionable Attic boundary;
- no generic portal/reflection engine, inventory, combat, or extra Bathroom fixtures;
- Android evidence 26–29 accepted.

**Accepted gate:** the player understands through visual state and one deliberate room manipulation that the reflection exposes geometry hidden from the normal house.

Detailed closeout: `docs/W3_BATHROOM_TASKS.md`.

### W4 — Attic / Revelation — ACCEPTED

**Goal:** convert accumulated mystery into explicit understanding without fully revealing Vesper or the Resonator.

Accepted sequence:

```text
Bathroom route revealed
 -> Attic
 -> SEARCH THE ATTIC
 -> experiment log + sensor crate
 -> CONNECT THE EVIDENCE
 -> PLAY THE RECORDING
 -> SUBJECT W-01 / RESONANCE EXTRACTION
 -> FIND THE MACHINE
 -> trace recorder output downward
 -> concrete Basement hatch / shaft revealed
```

Delivered:
- production Bathroom ↔ Attic navigation gated by `mirror-route-revealed`;
- dedicated `AtticPresentation` through the existing room presentation seam;
- rafters/storage plus newer observation equipment and cabling;
- two evidence interactions tied back to prior rooms;
- recorder remains incomplete before evidence context and becomes meaningful afterward;
- room-local `experiment-revealed` milestone;
- concrete downward cable/hatch state via `basement-route-revealed`;
- save/load and idempotence coverage in `tests/w4-attic-gate-a.test.ts`;
- no full Vesper reveal, Basement interior, clue engine, inventory, dialogue system or new enemy;
- Android evidence 30–33 accepted.

The W4 reveal answers:
- the anomalies are connected;
- they are instrumented deliberately;
- Wally is `SUBJECT W-01`;
- resonance extraction is involved;
- the active machine is below the house.

It intentionally preserves for later:
- Dr. Vesper's complete identity/motivation;
- full Resonator architecture;
- why Wally is unusually compatible;
- whether the experiment is still under deliberate control.

Android closeout:
- 30 reads as old storage converted into an observation post;
- 31 establishes the evidence state;
- 32 makes the recorder the focal point and communicates the W-01/resonance revelation;
- final polish on 33 replaces the ambiguous cable-only read with an explicit open floor hatch/shaft, visible downward continuation and rungs while keeping Wally clear enough not to obscure the destination;
- screenshots 1–29 remain regression baseline.

**Accepted gate:** the player can infer that the house is instrumented as an experiment, Wally is one of its subjects, and the machinery driving it is below the house.

Detailed closeout: `docs/W4_ATTIC_REVELATION_TASKS.md`.

### W5 — Basement / Mad Science — PLANNED — UNBLOCKED

**Goal:** transition the tone from haunted house to haunted-house-plus-mad-science.

Initial scope:
- activate a real Attic → Basement transition from the accepted W4 hatch;
- cables, CRTs, energy conduits and machine infrastructure;
- power/door/terminal interactions only where they serve a concrete room loop;
- escalated environmental hazards;
- experimental creature only if room gameplay requires it;
- establish that the experiment is no longer safely contained;
- expose a concrete Laboratory boundary without implementing the final boss early.

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
        +-- Attic
```

The runtime owns movement, target resolution and dispatch. Room-specific mutations/events stay outside it.

W3 does **not** generalize the microwave/breaker relationship into a generic power engine, nor the Bathroom reflection into a generic portal engine. W4 likewise keeps evidence/recorder behavior local rather than introducing a clue or terminal framework. A second concrete reuse case is required before extracting those abstractions.

### Presentation seam

```text
GameCanvas
   ↓
RoomPresentation
   ├── Bedroom
   ├── Hallway
   ├── Living Room
   ├── Kitchen
   ├── Bathroom
   └── Attic
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
- Bathroom `mirror-anomaly-seen` / `bathroom-light-off` / `mirror-route-revealed`;
- Attic `experiment-revealed` / `basement-route-revealed` plus evidence inspection history.

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

Accepted W3A:

```text
23_kitchen_arrival
24_kitchen_overload
25_kitchen_power_rerouted
```

Accepted W3B:

```text
26_bathroom_arrival
27_bathroom_mirror_mismatch
28_bathroom_reflected_route
29_bathroom_route_revealed
```

Accepted W4:

```text
30_attic_arrival
31_attic_evidence
32_attic_recording
33_basement_route_revealed
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

**W5 — Basement / Mad Science planning.**

W4 is accepted. W5 may now start from the concrete Basement hatch established by screenshot 33.

Before implementation, define a focused Basement loop that:

```text
1. makes the technological layer materially stronger than Attic
2. reuses the established resonance/electrical language without duplicating Kitchen
3. introduces environmental danger only where it adds gameplay value
4. reveals loss of control through play/environment rather than exposition
5. ends at a concrete Laboratory boundary
6. does not prematurely implement the final boss or full Vesper reveal
```
