# W6 — Laboratory / Final Boss

## Status

**ACTIVE — T0 CONTRACT CONFIRMED**

W5 is accepted and closed. W6 begins at the persisted Basement `laboratory-route-revealed` boundary.

## Product goal

Turn the experiment's revealed source into a short arcade finale that resolves the central conflict without turning the project into a generic boss framework.

W6 owns:
- entering the Laboratory;
- revealing the Resonator and Dr. Vesper;
- a three-phase encounter;
- Laboratory-specific retry/persistence;
- boss defeat and `RESONATOR SHUT DOWN`.

W7, not W6, owns the final awakening, credits/retry presentation, final Ghost sting, audio polish, accessibility and release hardening.

## Confirmed sequence

```text
LABORATORY ROUTE IDENTIFIED
        ↓
ENTER THE LABORATORY
        ↓
APPROACH THE RESONATOR
        ↓
BREAK VESPER'S CONTROL
        ↓
Resonator runaway
        ↓
DESTABILIZE THE RESONATOR
        ↓
Vesper transformed
        ↓
DEFEAT VESPER NIGHTMARE
        ↓
RESONATOR SHUT DOWN
        ↓
W7 ending boundary
```

## Architecture decision

W6 reuses the existing player, Dream Spark, HP, invulnerability, knockback, deterministic fixed step, room registry, room-local persistence and screenshot infrastructure.

It does **not** introduce a generic boss engine.

Preferred ownership:

```text
RoomRegistry
    ↓
AdventureExplorationRuntime
    ↓
LaboratoryEncounter (T4+ only)
    ↓
Laboratory room-local persistent state
    ↓
LaboratoryPresentation
```

T0–T3 stop before `LaboratoryEncounter` exists.

## Tasks

### W6-T0 — Contract / W5 closeout sync — IN PROGRESS

- mark W5 accepted in the stable adventure roadmap;
- freeze W6 T0–T9 scope;
- preserve W7 boundary;
- explicitly forbid generic boss-engine work in the foundation block.

Acceptance:
- roadmap and W6 task document agree on W5/W6 status and scope.

### W6-T1 — Laboratory room foundation — PLANNED

Activate the already-declared `laboratory` RoomId.

Required:
- Laboratory entry from Basement only after `laboratory-route-revealed`;
- deterministic Laboratory → Basement return route;
- the accepted W5 hatch remains the trace interaction before route reveal;
- after route reveal the same physical boundary exposes an ENTER LABORATORY interaction without competing with the old trace target;
- save/load from Laboratory remains valid under envelope v3;
- no boss state yet.

Acceptance:
- premature Laboratory transition is rejected;
- W5 route reveal exposes the production Laboratory transition;
- round-trip navigation and save/load pass.

### W6-T2 — Laboratory visual identity — PLANNED

Add `LaboratoryPresentation` through the existing RoomPresentation seam.

Visual language:
- purpose-built machine room rather than converted domestic infrastructure;
- Basement feed terminates visibly inside the room;
- central Resonator dominates composition;
- operator/control station is visible;
- stronger symmetry, containment structure and energized cyan/magenta accents distinguish the room from Basement;
- no final boss animation or damage state yet.

Acceptance:
- room reads as the source of the experiment without relying on caption text;
- Basement and Laboratory are immediately distinguishable.

### W6-T3 — Laboratory-only Dream Spark bridge — PLANNED

Exploration currently disables ATTACK and does not advance Dream Sparks. W6 must bridge that gap narrowly.

Required:
- ATTACK visible/accepted only when exploration room is Laboratory;
- Dream Spark cooldown/projectile stepping works in Laboratory;
- Laboratory advances the combat clock needed for cooldowns but does not reactivate Bedroom deadline/noise/Ghost spawning;
- leaving Laboratory clears or safely prevents stale projectiles outside the combat room;
- existing Bedroom combat behavior is unchanged.

Acceptance:
- attack input outside Laboratory exploration remains ignored;
- attack in Laboratory creates and advances a Dream Spark;
- cooldown/cap rules are reused;
- no Ghosts spawn and no domestic noise is added.

### W6-T4 — Encounter state / checkpoint / retry — PLANNED

Create a Laboratory-specific encounter state machine with deterministic persisted milestones.

Must define:
- encounter activation;
- phase;
- discrete phase health/weak-point state;
- local retry checkpoint;
- death/retry semantics;
- save/continue behavior.

Prefer room-local switches/interactions where practical. Do not change save schema unless impossible under the validated generic room-local format.

### W6-T5 — Phase 1: Vesper / controlled technology — PLANNED

Objective: `BREAK VESPER'S CONTROL`.

Use a small number of concrete devices/defenses with readable telegraphs and Dream Spark windows. No secondary enemy roster.

### W6-T6 — Phase 2: Resonator instability — PLANNED

Objective: `DESTABILIZE THE RESONATOR`.

Reuse selected motifs, not every prior mechanic:
- spatial distortion inspired by Bathroom;
- electrical pressure inspired by Basement;
- two concrete Resonator weak points.

### W6-T7 — Phase 3: Vesper Nightmare — PLANNED

Objective: `DEFEAT VESPER NIGHTMARE`.

Use deterministic attack patterns, explicit telegraphs and a small number of meaningful vulnerability windows rather than a generic large HP sponge.

### W6-T8 — Defeat / integration / W7 boundary — PLANNED

Persist `laboratory-encounter-complete`, stop encounter hazards, clean transient combat state and expose `RESONATOR SHUT DOWN`.

Integration must cover Bedroom → Laboratory → defeat while preserving prior-wave regression.

### W6-T9 — Android visual gate — PLANNED

Target evidence after W6 gameplay stabilizes:
- Laboratory arrival;
- Vesper controlled-technology phase;
- Resonator runaway;
- Vesper Nightmare;
- boss defeated / Resonator shut down.

Visual acceptance must be based primarily on world state, not captions.

## Foundation-block non-goals

T0–T3 must not add:
- boss HP/state machine;
- Vesper attacks;
- Resonator weak points;
- Nightmare transformation;
- checkpoint/retry logic;
- new enemies;
- save schema migration;
- new dependency;
- W7 ending content.

## W6 acceptance gate

W6 is accepted only when an accepted W5 save can enter Laboratory, complete all three encounter phases with movement + Dream Spark, recover reasonably from failure, survive Save/Continue, and reach a persistent `RESONATOR SHUT DOWN` state.

Current execution boundary: **T0–T3 only.**
