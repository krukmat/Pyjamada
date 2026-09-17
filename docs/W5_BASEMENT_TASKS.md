# W5 — Basement / Mad Science

## Status

**ACTIVE — T0–T5 COMPLETE / T6 NEXT**

W4 Attic is accepted. W5 foundation, power loop, control-terminal reveal and environmental pressure are implemented and repository validation is green on `feat/haunted-house-adventure`.

## Product goal

Turn the Attic revelation into direct interaction with the experiment's physical infrastructure.

The Basement is the transition from haunted domestic space to unstable mad-science machinery. The player already knows the house is an experiment; W5 must let Wally touch the system, observe that it is failing, and reach a concrete Laboratory boundary.

By the end of W5 the player should understand:

1. the Resonance system is physically distributed through the Basement;
2. the power/control infrastructure is unstable;
3. Wally can manipulate a subsystem rather than merely inspect evidence;
4. the experiment is no longer operating normally;
5. the Laboratory is the next concrete destination.

W5 must **not** implement the final boss, reveal the complete Dr. Vesper story, or introduce generalized terminal/power/hazard engines.

## Target sequence

```text
Attic Basement hatch
        ↓
Basement
        ↓
FOLLOW THE POWER
        ↓
trace unstable conduit
        ↓
ISOLATE THE FAULT
        ↓
operate local isolation relay
        ↓
power feed stabilizes
        ↓
READ THE CONTROL TERMINAL
        ↓
RESONANCE LOAD CRITICAL
        ↓
environmental hazard pressure
        ↓
Laboratory boundary revealed
```

W5 should feel more mechanical and dangerous than W4. Story information is now delivered through infrastructure behavior rather than evidence reconstruction.

## Visual language

Basement should clearly differ from Attic while remaining part of the same house.

Required motifs:

- masonry/concrete utility walls;
- exposed pipes and old domestic utilities;
- newer cyan resonance conduits crossing them;
- electrical cabinets / isolation relay;
- CRT/control equipment deeper in the room;
- cable trunks descending/continuing toward Laboratory;
- local instability expressed through flicker/arcs/pulses, not a new enemy by default.

The visual transition should read:

```text
Attic = observation station hidden in storage
Basement = experiment infrastructure invading house utilities
Laboratory = purpose-built source (W6)
```

## Tasks

### W5-T0 — W4 closeout / regression baseline — COMPLETE

- Screenshots 1–33 remain the accepted regression baseline.
- W4 remains `ACCEPTED`.
- The accepted Attic floor hatch is the only production entry into Basement.

### W5-T1 — Basement room foundation — COMPLETE

Implemented:
- `basement` activated in `RoomRegistry`;
- deterministic Attic → Basement entry and Basement → Attic return path;
- Attic → Basement gated by Attic room-local `basement-route-revealed`;
- Laboratory travel remains inactive;
- existing save envelope and room-local persistence retained.

The Attic exit interaction is intentionally separate from the accepted `DOWNWARD CABLE` evidence interaction, so screenshot 33 remains readable while the player can move slightly left to enter the revealed hatch.

### W5-T2 — Basement visual identity — COMPLETE CODE / ANDROID REVIEW DEFERRED TO T9

Added `BasementPresentation` through the existing `RoomPresentation` seam.

Implemented visual language:
- dark masonry/utility-room structure;
- exposed old pipes and Attic return ladder;
- cyan resonance feed grafted across domestic utilities;
- unstable fault node with flicker/arcs;
- dedicated isolation relay;
- deeper control terminal;
- visibly steadier cyan feed after T3 stabilization.

No generic power renderer or new enemy was introduced.

### W5-T3 — Power infrastructure loop — COMPLETE

Implemented one Basement-specific subsystem:

1. **Power Conduit** — trace the unstable feed and identify the fault.
2. **Isolation Relay** — cannot solve the fault before it has been traced; afterward it stabilizes the local feed.

Persisted room-local milestones:

```text
basement-fault-traced
basement-power-stabilized
```

Objective progression:

```text
FOLLOW THE POWER
ISOLATE THE FAULT
READ THE CONTROL TERMINAL
```

Behavior:
- probing the relay first gives a deterministic clue but does not solve the room;
- tracing the conduit records the fault;
- operating the relay afterward stabilizes the feed;
- repeated interactions are idempotent;
- stabilized state materially changes the conduit/relay/deeper-feed presentation.

### W5-T4 — Terminal / control reveal — COMPLETE

Added one Basement-specific `CONTROL TERMINAL` interaction. No generic terminal framework was introduced.

Behavior:
- before T3 stabilization the CRT remains unreadable and emits one deterministic `BASEMENT_TERMINAL_OFFLINE` clue;
- after the isolation relay stabilizes the feed, the terminal becomes readable;
- interacting with it persists `basement-control-revealed` and emits `BASEMENT_CONTROL_REVEALED` once;
- repeated terminal reads are idempotent;
- save/load preserves the revealed control state.

The reveal is expressed both through UI/narrative state and room presentation:

```text
READ THE CONTROL TERMINAL
        ↓
terminal gauge crosses its safe threshold
        ↓
red overload language replaces stable cyan-only readout
        ↓
RESONANCE LOAD CRITICAL
```

The player now has the first explicit evidence that the infrastructure is not merely damaged: Resonance demand itself is above safe operating parameters and still climbing.

Automated coverage in `tests/w5-basement-foundation.test.ts` proves:
- terminal remains unreadable before stable power;
- stable power is required before reveal;
- reveal event is emitted exactly once;
- `basement-control-revealed` survives Continue.

### W5-T5 — Environmental hazard — COMPLETE

Implemented one Basement-specific periodic electrical discharge on the downstream conduit/feed toward the control area.

The mechanic begins only after `basement-control-revealed`, so the T4 reveal is the cause of the new environmental pressure rather than another inspection interaction.

Cycle:

```text
RESONANCE LOAD CRITICAL
        ↓
400 ms safe lead
        ↓
1200 ms visible telegraph
        ↓
360 ms electrical discharge
        ↓
recovery / safe interval
        ↓
cycle repeats
```

Behavior:
- first activation is aligned to a deterministic safe cycle boundary, so reading the terminal can never cause an immediate untelegraphed hit;
- the unsafe lane is local to the right-side control feed (`x=100..116`), leaving the rest of the Basement traversable;
- telegraph is visible through a pulsing floor lane, feed brightening and local charge glow;
- discharge is represented by a short high-energy electrical arc through the control feed;
- leaving the marked lane before discharge avoids all damage;
- remaining inside during discharge reuses the existing combat contract: one HP damage, existing invulnerability window and knockback away from the control area;
- repeated contacts during the same discharge cannot multi-hit because the existing 900 ms invulnerability window is longer than the 360 ms discharge;
- zero HP retains the existing `haunted` failure semantics;
- leaving/re-entering Basement pauses/resumes the hazard clock rather than advancing unrelated exploration time.

Architecture:
- added `BasementElectricalHazard.ts` as a narrow room-specific timing/collision rule;
- no `HazardEngine`, new enemy, generic electrical simulation or save-schema version was introduced;
- arming uses the existing room-local interaction collection;
- cycle timing reuses `HauntedSessionState.elapsedMs` only while the revealed Basement overload is active;
- presentation derives telegraph/discharge state from the same deterministic resolver used by gameplay.

Automated coverage in `tests/w5-basement-hazard.test.ts` proves:
- hazard is inactive before T4;
- first activation always starts safe;
- telegraph supplies a real response window;
- leaving the unsafe lane avoids damage;
- unsafe overlap causes one hit and knockback;
- existing invulnerability prevents duplicate same-window hits;
- repeated failure to react can terminate the run.

Repository validation after T5:

```text
Assets                  PASS
Game/tests              PASS
TypeScript              PASS
Static architecture     PASS
```

### W5-T6 — Out-of-control reveal — NEXT

Use infrastructure state/terminal output to establish that the experiment is no longer operating normally.

Reveal may establish:
- Resonance load escalating;
- safeguards bypassed/failing;
- control signal continues into Laboratory.

Do not fully explain Vesper's motivation or Resonator architecture.

### W5-T7 — Laboratory boundary

- Make the Laboratory route visually concrete and actionable after W5 progression.
- Do not implement Laboratory interior in W5.

Expected milestone:

```text
laboratory-route-revealed
```

### W5-T8 — Persistence / idempotence / tests

Already covered through T5:
- Basement locked before Attic route reveal;
- deterministic Attic ↔ Basement navigation;
- fault trace and power stabilization ordering;
- repeated stabilization does not duplicate milestones/events;
- terminal gating and idempotence;
- save/load preserves Basement power and control progression;
- T5 hazard activation is deterministic and cannot begin with an untelegraphed discharge;
- T5 discharge cannot multi-hit within one active window.

Extend persistence/closeout coverage after T6–T7 are implemented.

### W5-T9 — Android visual gate

Extend deterministic review after W5 implementation stabilizes. Planned evidence:

```text
34_basement_arrival.png
35_basement_power_fault.png
36_basement_control_reveal.png
37_laboratory_boundary.png
```

Exact screenshots may be refined before Gate A, but 1–33 remain unchanged regression evidence.

## Acceptance gate

W5 is accepted only when the player can infer primarily from play and world state:

> The experiment's infrastructure runs through the Basement, it is becoming unstable, and the source/control path continues into the Laboratory.

Android review must confirm:

- Basement is immediately distinct from Attic and domestic rooms;
- unstable versus stabilized power states are visually legible;
- terminal/reveal changes understanding, not only caption text;
- environmental hazard is readable/fair;
- Laboratory boundary is concrete rather than decorative;
- screenshots 1–33 remain materially stable.

## Non-goals

Do not add in W5:

- Laboratory interior;
- final boss;
- full Dr. Vesper reveal/motivation;
- generic terminal framework;
- generic electrical simulation/power-grid engine;
- generic hazard engine without a second concrete reuse case;
- inventory system;
- dialogue system;
- new creature solely to increase difficulty;
- broad save-schema rewrite.

## Architecture constraint

Continue the established path:

```text
RoomRegistry
    ↓
AdventureExplorationRuntime
    ↓
RoomInteractionEffects / BasementElectricalHazard
    ↓
Basement room-local persistent state
    ↓
RoomPresentation / BasementPresentation
```

The conduit/relay/terminal/hazard relationship remains Basement-specific until another room demonstrates a real second use case.

## Current implementation slice

**T0–T5 complete. T6 is next.**

Current production progression:

```text
W4 accepted Basement hatch
    ↓
Attic → Basement
    ↓
FOLLOW THE POWER
    ↓
Power Conduit / fault trace
    ↓
ISOLATE THE FAULT
    ↓
Isolation Relay
    ↓
READ THE CONTROL TERMINAL
    ↓
RESONANCE LOAD CRITICAL
    ↓
telegraphed control-feed discharge
    ↓
player clears unsafe lane or takes damage
    ↓
system remains out of control
```

The next increment is T6: turn the repeated instability into an explicit loss-of-control reveal that points the causal/control path toward Laboratory without explaining the final story.
