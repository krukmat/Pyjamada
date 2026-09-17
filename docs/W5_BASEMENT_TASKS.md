# W5 — Basement / Mad Science

## Status

**APPROVED — T0–T3 IN PROGRESS**

W4 Attic is accepted. W5 is the next production wave on `feat/haunted-house-adventure`.

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
control terminal becomes meaningful
        ↓
SYSTEM OVERLOAD / RESONANCE ESCALATION
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

### W5-T0 — W4 closeout / regression baseline

- Preserve screenshots 1–33 as accepted regression evidence.
- W4 remains `ACCEPTED`.
- Use the accepted Attic floor hatch as the only production entry into Basement.

### W5-T1 — Basement room foundation

- Activate `basement` in `RoomRegistry`.
- Add deterministic Attic → Basement entry and Basement → Attic return path.
- Gate Attic → Basement on Attic room-local `basement-route-revealed`.
- Do not activate Laboratory travel yet.
- Preserve current save envelope and room-local state model.

### W5-T2 — Basement visual identity

- Add `BasementPresentation` through the existing `RoomPresentation` seam.
- Establish masonry, pipes, old utilities, new conduits and electrical cabinets.
- Maintain Wally scale/floor/readability conventions.
- Initial room must visually communicate that the cyan infrastructure continues from Attic and is unstable.

### W5-T3 — Power infrastructure loop

Implement one concrete local subsystem rather than a generic power engine.

Initial interaction set:

1. **Power Conduit** — trace the unstable feed and identify the fault.
2. **Isolation Relay** — ineffective before the fault is traced; after tracing, stabilizes the local feed.

Room-local milestones:

```text
basement-fault-traced
basement-power-stabilized
```

Expected objective progression:

```text
FOLLOW THE POWER
ISOLATE THE FAULT
POWER FEED STABLE
```

The stabilized state should materially change the room presentation so the player sees the effect before explanatory text confirms it.

### W5-T4 — Terminal / control reveal

- Add one local CRT/control terminal.
- Before T3 solution: incomplete/noisy readout.
- After power stabilization: reveal that Resonance load is exceeding expected operating parameters.
- Keep this Basement-specific; no generic terminal framework.

Expected milestone:

```text
basement-control-revealed
```

### W5-T5 — Environmental hazard

Introduce one deterministic environmental pressure mechanic tied to the unstable experiment, for example electrical discharge/arcing conduit.

Constraints:
- no new enemy unless later testing proves it necessary;
- hazard must have readable telegraph and safe response window;
- avoid a global hazard engine unless a second concrete reuse case proves the need.

### W5-T6 — Out-of-control reveal

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

Cover:
- Basement remains locked before Attic route reveal;
- deterministic Attic ↔ Basement navigation;
- fault trace and power stabilization ordering;
- repeated interactions do not duplicate milestones/events;
- save/load preserves Basement and local progression;
- later terminal/hazard/Lab boundary states when implemented.

### W5-T9 — Android visual gate

Extend deterministic review after the implementation stabilizes. Planned evidence:

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
- environmental hazard is readable/fair if implemented;
- Laboratory boundary is concrete rather than decorative;
- screenshots 1–33 remain materially stable.

## Non-goals

Do not add in W5:

- Laboratory interior;
- final boss;
- full Dr. Vesper reveal/motivation;
- generic terminal framework;
- generic electrical simulation/power-grid engine;
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
RoomInteractionEffects
    ↓
Basement room-local persistent state
    ↓
RoomPresentation / BasementPresentation
```

T3's conduit/relay relationship remains Basement-specific until another room demonstrates a real second use case.

## Current implementation slice

**T0–T3 only.**

Deliver before advancing to T4:

```text
W4 accepted baseline
    ↓
Attic → Basement production route
    ↓
Basement presentation
    ↓
Power Conduit trace
    ↓
Isolation Relay stabilization
    ↓
automated navigation/state/save validation
```
