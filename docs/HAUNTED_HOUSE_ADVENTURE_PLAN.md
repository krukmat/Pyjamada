# Pyjamada — Haunted House Adventure Plan

## Purpose

This document is the stable roadmap for evolving the current Haunted Arcade bedroom vertical slice into a complete haunted-house adventure inspired by late-80s/early-90s adventure structure: one connected house, room-by-room discovery, environmental storytelling, supernatural comedy, and a final confrontation with a mad scientist.

The current bedroom gameplay is not discarded. It becomes Act I and the mechanical/narrative baseline for the rest of the game.

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

### W0 — Adventure Foundation

**Goal:** make the current single-room runtime capable of supporting a connected adventure without changing the bedroom gameplay yet.

Deliverables:
- Room identity and room registry.
- Adventure/session state with current room, visited rooms and story flags.
- Room transition contract and deterministic spawn points.
- Per-room persistent state contract.
- Story trigger/flag infrastructure.
- Save schema evolution for adventure data.
- Room-aware presentation seam so `GameCanvas` does not become a switchboard of room-specific conditions.
- Deterministic tests for Bedroom -> placeholder Hallway -> Bedroom navigation and persistence.

**Gate:** programmatic round trip Bedroom -> Hallway -> Bedroom works while preserving session state.

### W1 — The House Opens

**Goal:** turn the existing bedroom slice into the real Act I and introduce the first explorable room.

Scope:
- Preserve current wake -> dress -> keys -> Ghost -> escape loop.
- Replace terminal success at the door with the false escape twist.
- Fade/transition and return to an altered Bedroom.
- Open the path to Hallway.
- Implement Hallway as the first real additional room.
- Add the first environmental anomaly: reverse clock / altered pictures / impossible sound.
- Prepare but do not complete Living Room access.

**Gate:** the player can complete the current bedroom loop, experience the false escape, enter Hallway, inspect the anomaly and reach the Living Room door.

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

Keep narrative/progression state separate from immediate combat/physics state.

Expected responsibilities:

```text
AdventureState
├── currentRoom
├── visitedRooms
├── storyFlags
├── roomStates
└── progression
```

### Room registry

Rooms should be data/config driven where practical:

```text
RoomDefinition
├── id
├── exits
├── spawnPoints
├── interactables
├── objective
├── atmosphere/presentation id
└── story triggers
```

Avoid large room-specific condition trees in `GameCanvas`.

### Presentation seam

Preferred direction:

```text
GameCanvas
   ↓
RoomPresentation
   ↓
room-specific renderer
```

Shared systems remain above room presentation:
- Wally
- enemies
- projectiles
- combat FX
- HUD
- camera

### Story state

Use explicit flags/triggers, not hidden inference from arbitrary object state.

Examples:

```text
bedroomEscapeAttempted
hallwayUnlocked
tvTransmissionSeen
mirrorSecretFound
vesperIdentityKnown
basementUnlocked
resonatorDiscovered
```

### Deterministic review

Do not create 14 screenshots for every room. Add only representative deterministic states, typically 3–5 per room or wave, covering:
- room arrival;
- central interaction/anomaly;
- gameplay pressure state;
- narrative reveal when relevant.

## Development policy

- Work incrementally on `feat/haunted-house-adventure`.
- Do not implement later waves before the current wave gate passes.
- Do not add Goblin/Skull merely because they were previously planned; derive enemy needs from room gameplay and story.
- Preserve the current Bedroom/Ghost slice as a regression baseline.
- No broad rewrite of Haunted runtime unless W0 proves an explicit structural limitation.
- Prefer small reusable seams over generalized adventure-engine abstractions.
- Android/device visual validation remains a local user-run gate; automated TypeScript/tests/architecture checks remain repository gates.

## Current priority

The active scope is **W0 — Adventure Foundation** only.

The next milestone after W0 is **M1 — The House Opens**, covering the false escape and Hallway. No Living Room, Kitchen, new enemy or boss work starts before that milestone is deliberately entered.
