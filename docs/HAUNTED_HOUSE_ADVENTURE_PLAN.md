# Pyjamada — Haunted House Adventure Plan

## Purpose

This document is the stable roadmap for evolving the Haunted Arcade bedroom vertical slice into a complete haunted-house adventure inspired by late-80s/early-90s adventure structure: one connected house, room-by-room discovery, environmental storytelling, supernatural comedy, and a final confrontation with a mad scientist.

The current bedroom gameplay is not discarded. It becomes Act I and the mechanical/narrative baseline for the rest of the game.

## Wave status

| Wave | Status | Gate |
|---|---|---|
| W0 — Adventure Foundation | **IMPLEMENTED** | Connected-room architecture, persistence and Bedroom ↔ Hallway foundation |
| W1 — The House Opens | **CODE-COMPLETE / ACCEPTANCE PENDING** | False escape + altered Bedroom + Hallway + first anomaly + Living Room threshold |
| W2 — Living Room | **BLOCKED BY W1 ACCEPTANCE** | Mystery hook / lab transmission |
| W3A — Kitchen | Planned | Domestic mechanic expansion |
| W3B — Bathroom | Planned | Dream geometry |
| W4 — Attic | Planned | Vesper/W-01 revelation |
| W5 — Basement | Planned | Mad-science transition |
| W6 — Laboratory | Planned | Final boss |
| W7 — Ending/Cohesion | Planned | Product hardening |

Implementation detail lives in:
- `docs/W0_ADVENTURE_FOUNDATION_TASKS.md`
- `docs/W1_THE_HOUSE_OPENS_TASKS.md`

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

**Goal:** make the current single-room runtime capable of supporting a connected adventure without changing the bedroom gameplay yet.

Delivered:
- `AdventureState` with current room, visited rooms, story flags and local room state.
- Declarative Bedroom/Hallway registry with deterministic spawn entries and legal exits.
- `AdventureSessionCoordinator` for progression orchestration.
- v3 top-level save envelope pairing Haunted v2 simulation with Adventure v1 progression.
- room-aware `RoomPresentation` seam below `GameCanvas`.
- placeholder Hallway presentation and test-only navigation hook.
- deterministic adventure/save tests integrated into `test:all`.

**Gate:** Bedroom -> placeholder Hallway -> Bedroom works while story and room-local state survive navigation/save-load. Full implementation checkpoint: `docs/W0_ADVENTURE_FOUNDATION_TASKS.md`.

### W1 — The House Opens — CODE-COMPLETE / ACCEPTANCE PENDING

**Goal:** turn the existing bedroom slice into the real Act I and introduce the first explorable room.

Implemented:
- The original wake -> dress -> keys -> Ghost -> escape loop remains intact until the exit seam.
- Terminal Bedroom success is intercepted by the false-escape story event.
- Reusable short fade transition with input lock.
- Altered Bedroom state with `FIND ANOTHER WAY OUT` objective.
- Production Bedroom -> Hallway interaction using the W0 room registry/coordinator.
- W0 placeholder replaced by the real W1 Hallway presentation.
- Backward-clock environmental anomaly with persisted inspection state.
- Clock reveal unlocks the Living Room path.
- W1 stops at the Living Room door and deliberately does not enter W2.
- Exploration progression survives the v3 save/load envelope.
- Four focused W1 deterministic review states were added: altered Bedroom, Hallway arrival, backward clock, Living Room threshold.
- One continuous deterministic W1 playthrough test covers the full story path and save/load roundtrip.

**Gate:** automated repository validation must be green and the local Android screenshot/playtest review must confirm the false escape, altered Bedroom, Hallway, clock anomaly and Living Room threshold are readable in the actual app. W2 remains blocked until that review passes.

Full task/DAG checkpoint: `docs/W1_THE_HOUSE_OPENS_TASKS.md`.

### W2 — Living Room / Mystery Hook

**Goal:** establish that someone or something is actively causing the haunting.

Scope:
- Living Room renderer and room data.
- Television as central interaction.
- Distorted lab transmission (`Resonance stable...`).
- Connect TV usage to threat/noise where appropriate.
- Environmental storytelling through furniture, radio, photos and TV interference.

**Gate:** player leaves the room with the clear question: "Who is observing or controlling the house?"

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
- Mirror anomaly.
- Reflected room differs from real room.
- Reflection reveals route/clue that does not exist normally.
- Limited dream-geometry trick without building a generic portal engine.

**Gate:** the player discovers a new route using an environmental anomaly rather than combat.

### W4 — Attic / Revelation

**Goal:** convert mystery into explicit understanding.

Story objects:
- Dr. Vesper photograph.
- Resonator prototype/plan.
- Dream-energy notes.
- `SUBJECT W-01` record.

Information should be fragmented across interactions rather than delivered as one exposition dump.

**Gate:** player understands that a scientist, a machine and Wally's dream signature are connected and that the laboratory must be found.

### W5 — Basement / Mad Science

**Goal:** transition the tone from haunted house to haunted-house-plus-mad-science.

Scope:
- Cables, CRTs, energy conduits and machine infrastructure.
- Power/door/terminal interactions.
- Escalated environmental hazards.
- First explicitly experimental creature only if supported by room gameplay.

**Gate:** player reaches the laboratory entrance and understands that the experiment is no longer under control.

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
- Final awakening sequence.
- Physical evidence that events were real.
- Final small Ghost sting.
- Credits/retry/continue.
- Audio polish.
- Animation polish.
- Visual consistency.
- Accessibility.
- Performance and release hardening.

## Cross-cutting architecture

### Adventure state

Narrative/progression state stays separate from immediate combat/physics state.

Implemented boundary:

```text
AdventureGameSessionState (save envelope v3)
├── HauntedSessionState (simulation v2)
└── AdventureState (progression v1)
    ├── currentRoom/currentEntry
    ├── visitedRooms
    ├── storyFlags
    └── room-local persistence
```

W1 adds a narrow `AdventureExplorationRuntime` after the false escape. It reuses player movement/input but does not restart the Bedroom threat/domestic simulation.

### Room registry

Room connectivity is declarative and intentionally small:

```text
RoomDefinition
├── id
├── presentationId
├── entries/spawn points
└── exits (+ optional story-flag gate)
```

Do not replace this with a generic graph/scripting engine unless later gameplay demonstrates a concrete need.

### Presentation seam

Implemented direction:

```text
GameCanvas
   ↓
RoomPresentation
   ├── Bedroom
   └── Hallway
```

Shared systems stay above room presentation:
- Wally;
- enemies;
- projectiles;
- combat FX;
- camera.

During W1 exploration, combat/enemy/projectile layers are deliberately suppressed; W1's Hallway beat is an exploration/mystery beat rather than a combat-content expansion.

HUD remains application-level.

### Story state

Use explicit flags/triggers, not hidden inference from arbitrary object state.

Implemented W1 progression uses:
- `bedroomEscapeAttempted`;
- `hallwayUnlocked`;
- Bedroom room history: `false-escape`;
- Hallway inspection: `backward-clock`;
- Hallway switch: `living-room-unlocked`;
- Hallway interaction: `living-room-door`.

Future flags should be introduced only when their wave needs them.

### Deterministic review

Do not create a full Bedroom-sized screenshot suite for every room. W1 adds only four representative states:

```text
15_altered_bedroom
16_hallway_arrival
17_hallway_clock
18_living_room_door
```

The Android screenshot flow continues to validate real UI state/text rather than using a synthetic renderer-ready gate.

## Development policy

- Work incrementally on `feat/haunted-house-adventure`.
- Do not implement later waves before the current wave gate passes.
- Do not add Goblin/Skull merely because they were previously planned; derive enemy needs from room gameplay and story.
- Preserve the current Bedroom/Ghost slice as a regression baseline.
- No broad rewrite of Haunted runtime unless a wave proves an explicit structural limitation.
- Prefer small reusable seams over generalized adventure-engine abstractions.
- Android/device visual validation remains a local user-run gate; automated TypeScript/tests/architecture checks remain repository gates.

## Current priority

**W1 acceptance gate.** The implementation is complete; W2 is intentionally blocked until two conditions are satisfied:

```text
1. repository CI green on final W1 HEAD
2. local Android review of screenshots / playthrough
```

The local evidence command is:

```bash
npm run screenshots:android
```

Review should focus especially on:
- whether the false escape reads as an intentional story twist rather than a reset;
- whether the altered Bedroom is recognizably the same room but clearly wrong;
- whether Hallway reads as a new connected room;
- whether the backward clock is visually discoverable;
- whether the Living Room door reveal provides a clear W2 hook.

No Living Room interior, Kitchen, new enemy or boss work starts before this W1 acceptance gate deliberately passes.
