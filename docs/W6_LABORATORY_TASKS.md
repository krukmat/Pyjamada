# W6 — Laboratory / Final Boss

## Status

**ACTIVE — T0–T6 COMPLETE / T7 NEXT**

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

### W6-T0 — Contract / W5 closeout sync — COMPLETE

- mark W5 accepted in the stable adventure roadmap;
- freeze W6 T0–T9 scope;
- preserve W7 boundary;
- explicitly forbid generic boss-engine work in the foundation block.

Acceptance:
- roadmap and W6 task document agree on W5/W6 status and scope.

### W6-T1 — Laboratory room foundation — COMPLETE

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

### W6-T2 — Laboratory visual identity — COMPLETE

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

### W6-T3 — Laboratory-only Dream Spark bridge — COMPLETE

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

### W6-T4 — Encounter state / checkpoint / retry — COMPLETE

Delivered:
- Laboratory-specific `LaboratoryEncounter` module with deterministic derived phases:
  `dormant -> vesper-control -> resonator -> nightmare -> shutdown -> complete`;
- explicit `RESONATOR` interaction starts the encounter exactly once;
- phase progress is represented by room-local boolean milestones, not a duplicated persisted enum;
- local retry checkpoint restores full HP, clean input/projectiles, safe player position and short invulnerability while preserving phase milestones;
- `RETRY PHASE` replaces full-game restart only for an active Laboratory encounter;
- Continue from an active encounter normalizes to the current clean checkpoint instead of restoring a frame-level projectile/damage state;
- existing AdventureState v1, AdventureGameSession v3 and HauntedSession v2 schemas remain unchanged;
- future T5–T8 milestones are reserved by the encounter contract but are not implemented as gameplay yet.

Acceptance:
- Resonator activation is idempotent and emits one persisted milestone;
- Save/Continue preserves phase while clearing transient attempt state;
- retry never erases completed phase milestones;
- encounter completion disables checkpoint interception;
- restart semantics outside an active Laboratory encounter remain unchanged.

### W6-T5 — Phase 1: Vesper / controlled technology — COMPLETE

Objective: `BREAK VESPER'S CONTROL`.

Delivered:
- the two existing Laboratory coil towers are the concrete Vesper control devices; no secondary enemy roster or disconnected boss object was introduced;
- each control has deterministic `sealed -> telegraph -> vulnerable -> disabled` presentation state;
- vulnerability windows alternate on a 3-second deterministic cycle;
- Vesper projects an opposite-lane pressure field with a visible telegraph followed by a damaging active window;
- Dream Sparks hitting a sealed control are consumed and rejected;
- one valid Dream Spark during the correct vulnerability window disables that control;
- each disabled control persists immediately as a Laboratory room-local milestone;
- disabling both persists `vesper-control-broken`, clears transient Dream Sparks and advances the derived encounter phase to `resonator`;
- pressure damage reuses existing HP, invulnerability and knockback semantics;
- active pressure hits are persisted like the Basement electrical hazard;
- partial progress survives retry/Continue through the T4 checkpoint contract;
- Resonator activation now clears pre-encounter Dream Sparks and gives a short safe-entry grace period.

Acceptance:
- sealed hits cannot progress the phase;
- both vulnerability windows are deterministic and readable;
- pressure only damages the active telegraphed lane;
- a disabled control remains disabled across retry;
- both disabled controls transition exactly once to the Resonator phase;
- T5 does not implement Resonator weak points, Nightmare behavior or final defeat.

### W6-T6 — Phase 2: Resonator instability — COMPLETE

Objective: `DESTABILIZE THE RESONATOR`.

Delivered:
- two concrete Resonator nodes at the machine core; no generic HP bar or boss-health abstraction;
- deterministic `sealed -> telegraph -> vulnerable -> disabled` windows for each node;
- a Bathroom-inspired central distortion zone that visibly telegraphs and reverses horizontal input only while Wally is inside the active zone;
- Basement-inspired electrical surge lanes with separate telegraph and damage windows;
- electrical damage reuses existing HP, invulnerability and knockback semantics;
- Dream Sparks hitting sealed nodes are consumed and rejected;
- one valid Dream Spark during each node's vulnerability window disables that node;
- each disabled node persists independently as Laboratory room-local state;
- retry and Save/Continue preserve partial node progress through the existing T4 checkpoint/save contract;
- disabling both nodes persists `resonator-destabilized`, clears transient Dream Sparks and advances the derived encounter phase exactly to `nightmare`;
- transition into T6 and handoff into T7 both receive a short safe-entry grace window;
- no Vesper Nightmare attack behavior, transformation gameplay or final defeat logic is implemented in T6.

Acceptance:
- distortion affects controls only inside its active central zone;
- electrical pressure damages only its active lane;
- sealed weak-point hits cannot progress the phase;
- both vulnerability windows are deterministic and readable;
- partial weak-point progress survives retry and Save/Continue;
- both disabled nodes transition exactly once to `nightmare`.

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

## T0–T3 implementation checkpoint

Delivered:
- W5 roadmap synchronized to accepted/closed;
- `laboratory` activated in the production room registry;
- Basement trace hatch deterministically changes into a Laboratory entry only after `laboratory-route-revealed`;
- Laboratory ↔ Basement round-trip and save/load work under existing envelope v3;
- dedicated `LaboratoryPresentation` establishes a purpose-built source room with incoming Basement feed, central Resonator and operator station;
- HUD identifies Laboratory and guides the player toward the Resonator;
- ATTACK/Dream Spark is enabled only in Laboratory exploration;
- existing projectile cooldown/cap/motion are reused;
- no Ghost spawning, domestic noise or Bedroom deadline logic is reactivated;
- transient Laboratory projectiles are cleared after leaving the combat room;
- Basement electrical discharge is now explicitly room-scoped and cannot leak into Laboratory;
- W5 screenshot 37 contract now expects the newly actionable `INTERACT · LABORATORY` boundary.

Automated coverage:
```text
tests/w6-laboratory-foundation.test.ts
```

Repository validation:
```text
Assets                         PASS
Game/settings/presentation     PASS
TypeScript                     PASS
Static architecture audit      PASS
```

RRI checkpoint:
- aggregate T0–T3 actual scope: 12 files;
- base score 48;
- final RRI 56 / Complex due external-write and gameplay-semantics floor;
- decomposition requirement satisfied through separate T0, T1, T2 and T3 commits;
- local developer: ineligible for the aggregate architecture/gameplay block;
- required independent model reviewers were unavailable in this tool surface; no independent PASS is claimed.

## T4 implementation checkpoint

Delivered files:
- `src/game/adventure/LaboratoryEncounter.ts`;
- Laboratory Resonator activation in `RoomRegistry` / `RoomInteractionEffects`;
- retry/Continue orchestration in `App.tsx`;
- phase-aware HUD/retry copy in `HauntedGameScreen.tsx`;
- `tests/w6-laboratory-encounter.test.ts`.

Automated coverage confirms:
- dormant -> encounter activation;
- idempotent start;
- deterministic phase derivation;
- local retry at an intermediate phase;
- HP/input/projectile normalization;
- Save/Continue under existing save envelope;
- no checkpoint hijack outside Laboratory;
- completed encounter no longer uses local retry semantics.

Repository validation:
```text
Assets                         PASS
Game/settings/presentation     PASS
W6 encounter tests             PASS
TypeScript                     PASS
Static architecture audit      PASS
```

One failed CI attempt exposed an invalid test fixture where Haunted and domestic player positions diverged. The fixture was corrected; no production implementation change was required.

## T5 implementation checkpoint

Delivered files:
- `src/game/adventure/LaboratoryVesperControl.ts`;
- T5 integration in `AdventureExplorationRuntime.ts`;
- Laboratory pressure/control-state presentation in `LaboratoryPresentation.tsx`;
- milestone/hit persistence integration in `App.tsx`;
- `tests/w6-vesper-control.test.ts`.

Gameplay loop:
```text
BREAK VESPER'S CONTROL
        ↓
read lane telegraph
        ↓
move into safe lane
        ↓
opposite control opens
        ↓
Dream Spark
        ↓
disable control A / B
        ↓
both disabled
        ↓
vesper-control-broken
        ↓
DESTABILIZE THE RESONATOR
```

Automated coverage confirms:
- clean encounter activation;
- alternating deterministic telegraph/vulnerability windows;
- blocked hits outside valid windows;
- Dream Spark collision against both controls;
- Vesper lane-pressure damage and safe-lane avoidance;
- partial-progress retry persistence;
- exact phase advancement to `resonator`.

Repository validation:
```text
Assets                         PASS
Game/settings/presentation     PASS
W6 Vesper control tests        PASS
TypeScript                     PASS
Static architecture audit      PASS
```

One CI attempt failed before tests because the new test fixture inferred `collected` as `string[]`; the fixture was typed explicitly as `HauntedSessionState`. No production behavior changed for that correction.

## T6 implementation checkpoint

Delivered files:
- `src/game/adventure/LaboratoryResonatorInstability.ts`;
- T6 integration in `AdventureExplorationRuntime.ts`;
- Resonator runaway / distortion / surge / weak-point presentation in `LaboratoryPresentation.tsx`;
- milestone/surge persistence integration in `App.tsx`;
- `tests/w6-resonator-instability.test.ts`.

Gameplay loop:
```text
DESTABILIZE THE RESONATOR
        ↓
read distortion / surge telegraph
        ↓
move through changing safe space
        ↓
weak point opens
        ↓
Dream Spark
        ↓
disable node A / B
        ↓
both disabled
        ↓
resonator-destabilized
        ↓
DEFEAT VESPER NIGHTMARE
```

Automated coverage confirms:
- deterministic weak-point windows;
- central distortion telegraph and horizontal-control inversion;
- unaffected controls outside the distortion zone;
- electrical surge damage and opposite-lane safety;
- blocked hits against sealed nodes;
- valid Dream Spark collision against both nodes;
- partial-progress retry persistence;
- Save/Continue under existing envelope v3;
- exact phase handoff to `nightmare`.

Repository validation:
```text
Assets                              PASS
Game/settings/presentation          PASS
W6 Resonator instability tests      PASS
TypeScript                          PASS
Static architecture audit           PASS
```

Current execution boundary: **T7 next — implement only Vesper Nightmare / `DEFEAT VESPER NIGHTMARE`.**
