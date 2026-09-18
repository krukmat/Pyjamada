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
| W5 — Basement | **ACCEPTED** | Unstable infrastructure + rejected failsafe + concrete Laboratory boundary |
| W6 — Laboratory | **CLOSED — T0–T9 COMPLETE** | Gameplay and Android visual acceptance complete |
| W7 — Ending/Cohesion | Planned | Product hardening |

Implementation/task checkpoints:
- `docs/W0_ADVENTURE_FOUNDATION_TASKS.md`
- `docs/W1_THE_HOUSE_OPENS_TASKS.md`
- `docs/W1_DEBT_CLOSURE.md`
- `docs/W2_LIVING_ROOM_TASKS.md`
- `docs/W3_KITCHEN_TASKS.md`
- `docs/W3_BATHROOM_TASKS.md`
- `docs/W4_ATTIC_REVELATION_TASKS.md`
- `docs/W5_BASEMENT_TASKS.md`
- `docs/W6_LABORATORY_TASKS.md`

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
          Basement
              │
    Laboratory boundary
              │
         Laboratory
```

W3B turns Kitchen's signal into Bathroom dream-geometry progression. W4 turns the reflected Attic route into explicit experiment knowledge and a concrete Basement destination. W5 now turns that destination into direct manipulation of the experiment's physical infrastructure.

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
- save/load and idempotence coverage in `tests/attic-gate-a.test.ts`;
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

### W5 — Basement / Mad Science — ACCEPTED

**Goal:** transition the tone from haunted-house investigation to direct interaction with unstable experiment infrastructure.

Accepted sequence:

```text
Attic hatch
 -> Basement
 -> FOLLOW THE POWER
 -> trace unstable Power Conduit
 -> ISOLATE THE FAULT
 -> stabilize via Isolation Relay
 -> READ THE CONTROL TERMINAL
 -> RESONANCE LOAD CRITICAL
 -> telegraphed electrical pressure
 -> TRIP THE FAILSAFE
 -> LOCAL CUTOFF REJECTED
 -> TRACE THE LAB FEED
 -> LABORATORY ROUTE IDENTIFIED
```

Delivered:
- production Attic ↔ Basement navigation;
- distinct Basement infrastructure presentation;
- conduit → relay → terminal causal loop;
- periodic telegraphed electrical hazard with existing HP/invulnerability semantics;
- rejected local failsafe establishing loss of control;
- concrete Laboratory feed hatch / route boundary;
- persistence, idempotence and save/load coverage;
- Android evidence 34–37 accepted.

**Accepted gate:** the player reaches a concrete Laboratory boundary and understands that the experiment is no longer under local control.

Detailed closeout: `docs/W5_BASEMENT_TASKS.md`.

### W6 — Laboratory / Final Boss — ACTIVE

**Goal:** resolve the central gameplay conflict while preserving W7 for ending/cohesion work.

Confirmed encounter spine:

```text
LABORATORY ROUTE IDENTIFIED
 -> ENTER THE LABORATORY
 -> identify the Resonator / operator
 -> BREAK VESPER'S CONTROL
 -> Resonator runaway
 -> DESTABILIZE THE RESONATOR
 -> Vesper transforms
 -> DEFEAT VESPER NIGHTMARE
 -> RESONATOR SHUT DOWN
 -> W7 ending boundary
```

Implementation is deliberately decomposed:
- T0 contract / W5 roadmap sync;
- T1 Laboratory room foundation and W5-gated navigation;
- T2 purpose-built Laboratory presentation;
- T3 Laboratory-only Dream Spark combat bridge;
- T4 encounter state, checkpoint/retry and persistence contract;
- T5 Vesper controlled-technology phase;
- T6 Resonator instability phase;
- T7 Vesper Nightmare phase;
- T8 defeat/integration/W7 boundary;
- T9 Android visual acceptance.

Architecture constraints:
- no generic boss engine before a second concrete reuse case;
- no reactivation of Bedroom Ghost spawning, noise pressure or deadline in Laboratory;
- Dream Spark/HP/knockback are reused rather than duplicated;
- encounter progression stays Laboratory-specific;
- save envelope v3 remains unchanged unless a later task proves a schema change necessary;
- W7 owns awakening, credits, final Ghost sting and product hardening.

**Gate:** from an accepted W5 state, the player can enter the Laboratory, complete the three-phase encounter, survive/save/retry under the W6 contract, and reach a persistent `RESONATOR SHUT DOWN` boundary.

Detailed checkpoint: `docs/W6_LABORATORY_TASKS.md`.

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
        +-- Basement
```

The runtime owns movement, target resolution and dispatch. Room-specific mutations/events stay outside it.

W3 does **not** generalize the microwave/breaker relationship into a generic power engine, nor the Bathroom reflection into a generic portal engine. W4 keeps evidence/recorder behavior local rather than introducing a clue or terminal framework. W5 likewise keeps the Power Conduit/Isolation Relay relationship Basement-specific until a second concrete reuse proves an abstraction necessary.

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
   ├── Attic
   ├── Basement
   └── Laboratory
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
- Attic `experiment-revealed` / `basement-route-revealed` plus evidence inspection history;
- Basement `basement-fault-traced` / `basement-power-stabilized`.

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

W5 screenshot expansion is deliberately deferred until the complete Basement loop stabilizes; current plan targets 34–37.

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

**W7 — Ending / post-Laboratory resolution.**

W6 is closed after Android acceptance of the complete Laboratory arc:

```text
Laboratory arrival
        ↓
Vesper control
        ↓
Resonator runaway
        ↓
Vesper Nightmare
        ↓
Resonator shutdown
```

Accepted Android evidence:
- `38_laboratory_arrival.png`
- `39_vesper_control.png`
- `40_resonator_runaway.png`
- `41_vesper_nightmare.png`
- `42_resonator_shutdown.png`

W7 may now begin from the persisted `laboratory-encounter-complete` boundary.
