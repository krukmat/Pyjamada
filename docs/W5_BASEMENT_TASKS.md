# W5 — Basement / Mad Science

## Status

**ACTIVE — T0–T8 COMPLETE / T9 ANDROID REVIEW NEXT**

W4 Attic remains accepted. W5 gameplay, loss-of-control reveal, Laboratory boundary, persistence and automated closeout coverage are implemented on `feat/haunted-house-adventure`. The remaining acceptance work is the Android visual gate for screenshots 34–37.

## Product goal

Turn the Attic revelation into direct interaction with the experiment's physical infrastructure.

The Basement is the transition from haunted domestic space to unstable mad-science machinery. The player already knows the house is an experiment; W5 lets Wally touch the system, observe that it is failing, survive its instability, and identify a concrete Laboratory boundary.

By the end of W5 the player should understand:

1. the Resonance system is physically distributed through the Basement;
2. the power/control infrastructure is unstable;
3. Wally can manipulate a subsystem rather than merely inspect evidence;
4. the experiment is no longer operating normally;
5. local safeguards cannot stop it;
6. the Laboratory is the next concrete destination.

W5 does **not** implement the Laboratory interior, final boss, complete Dr. Vesper story, or generalized terminal/power/hazard engines.

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
telegraphed electrical pressure
        ↓
TRIP THE FAILSAFE
        ↓
LOCAL CUTOFF REJECTED
        ↓
TRACE THE LAB FEED
        ↓
LABORATORY ROUTE IDENTIFIED
```

Story information is delivered primarily through infrastructure behavior rather than another evidence-inspection loop.

## Visual language

Basement should clearly differ from Attic while remaining part of the same house.

Required motifs:

- masonry/concrete utility walls;
- exposed pipes and old domestic utilities;
- newer cyan resonance conduits crossing them;
- electrical cabinet / isolation relay;
- CRT/control equipment deeper in the room;
- downstream service/feed hatch toward Laboratory;
- local instability expressed through flicker/arcs/pulses, not a new enemy.

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

### W5-T2 — Basement visual identity — COMPLETE CODE / ANDROID REVIEW IN T9

Added `BasementPresentation` through the existing `RoomPresentation` seam.

Implemented visual language:
- dark masonry/utility-room structure;
- exposed old pipes and Attic return ladder;
- cyan resonance feed grafted across domestic utilities;
- unstable fault node with flicker/arcs;
- dedicated isolation relay;
- deeper control terminal;
- downstream Laboratory feed hatch after loss of control;
- visibly different stable, overload, rejected-failsafe and route-revealed states.

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
- repeated stabilization is idempotent;
- stabilized state materially changes the conduit/relay/deeper-feed presentation.

### W5-T4 — Terminal / control reveal — COMPLETE

Added one Basement-specific `CONTROL TERMINAL` interaction. No generic terminal framework was introduced.

Behavior:
- before T3 stabilization the CRT remains unreadable and emits one deterministic `BASEMENT_TERMINAL_OFFLINE` clue;
- after the isolation relay stabilizes the feed, the terminal becomes readable;
- first successful terminal use persists `basement-control-revealed` and emits `BASEMENT_CONTROL_REVEALED` once;
- the reveal changes the room from stable cyan readout to overload language;
- later terminal use is intentionally reused by T6 rather than adding another inspection object.

```text
READ THE CONTROL TERMINAL
        ↓
terminal gauge crosses safe threshold
        ↓
RESONANCE LOAD CRITICAL
```

### W5-T5 — Environmental hazard — COMPLETE

Implemented one Basement-specific periodic electrical discharge on the downstream conduit/feed toward the control area.

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
- first activation is aligned to a deterministic safe boundary;
- unsafe lane is local to the right-side control feed (`x=100..116`);
- telegraph uses floor lane, feed brightening and local charge glow;
- discharge uses a short high-energy electrical arc;
- leaving the lane avoids damage;
- overlap reuses existing HP, invulnerability and knockback contracts;
- zero HP retains existing `haunted` failure semantics;
- the hazard remains active after T6/T7 instead of being solved by the route reveal.

Architecture stays deliberately narrow in `BasementElectricalHazard.ts`; no generic hazard engine or schema migration was introduced.

### W5-T6 — Out-of-control reveal — COMPLETE

The existing control terminal is reused instead of introducing another evidence object.

After `basement-control-revealed`, the objective changes to:

```text
TRIP THE FAILSAFE
```

The next terminal interaction attempts the local cutoff and deterministically fails:

```text
RESONANCE LOAD CRITICAL
        ↓
local failsafe command
        ↓
LOCAL CUTOFF REJECTED
        ↓
safeguards are bypassed
        ↓
control/feed continues downstream
```

Persisted state:

```text
basement-loss-of-control-revealed
basement-failsafe-attempted
```

The terminal presentation changes to a rejected/bypassed state. This establishes loss of control without explaining Vesper's motivation or the full Resonator architecture.

### W5-T7 — Laboratory boundary — COMPLETE

T6 exposes a concrete downstream `LAB FEED HATCH` at the right-side service/feed path.

Properties:
- hidden before the failsafe rejection, so it cannot interfere with T3/T4/T6 interactions;
- becomes actionable only after `basement-loss-of-control-revealed`;
- tracing it persists the route once and is idempotent afterward;
- the player remains in `basement`; Laboratory is not activated as a production room in W5;
- the final W5 objective becomes `LABORATORY ROUTE IDENTIFIED`.

Persisted milestone:

```text
laboratory-route-revealed
```

This is a boundary, not a decorative clue: the feed physically leaves the Basement through the hatch and establishes W6's destination.

### W5-T8 — Persistence / idempotence / tests — COMPLETE

Persistence was extended so Attic and Basement milestones save immediately rather than relying only on later room transitions or menu exit.

Immediate persistence now covers:
- Attic evidence / experiment / Basement-route milestones;
- Basement trace, relay, terminal, failsafe and Laboratory-route milestones;
- electrical discharge hits;
- terminal failure if the hazard reduces HP to zero.

Automated coverage now proves:
- Basement locked before accepted Attic route;
- deterministic Attic ↔ Basement navigation;
- conduit → relay → terminal ordering;
- hazard arming, telegraph, dodge, hit and failure semantics;
- T6 failsafe rejection occurs only after the control reveal;
- T7 hatch is unavailable before T6 and becomes the concrete interaction afterward;
- W5 stops at the Laboratory boundary instead of entering the room;
- T6/T7 state survives save/load;
- room transitions do not erase W5 progression;
- hazard remains active after Laboratory route reveal;
- repeated milestone effects remain idempotent.

Relevant suites:

```text
tests/w5-basement-foundation.test.ts
tests/w5-basement-hazard.test.ts
tests/w5-basement-closeout.test.ts
tests/haunted-screenshot-scenarios.test.ts
```

Current repository validation:

```text
Assets                  PASS
Game/tests              PASS
TypeScript              PASS
Static architecture     PASS
```

### W5-T9 — Android visual gate — READY FOR CAPTURE

Deterministic presets and Maestro assertions are wired for:

```text
34_basement_arrival.png
35_basement_power_fault.png
36_basement_control_reveal.png
37_laboratory_boundary.png
```

The Android screenshot runner now expects exactly screenshots 1–37 and retains the previous published evidence if the new run is incomplete or fails.

T9 remains open until screenshots 34–37 are captured and visually reviewed. Screenshots 1–33 remain regression evidence and must stay materially stable.

## Acceptance gate

W5 is accepted only when Android review confirms primarily from play/world state:

> The experiment's infrastructure runs through the Basement, it is becoming unstable, local safeguards cannot stop it, and the source/control path continues into the Laboratory.

Review criteria:
- Basement is immediately distinct from Attic and domestic rooms;
- unstable versus stabilized power states are visually legible;
- terminal overload and rejected failsafe change understanding, not only caption text;
- electrical hazard telegraph is readable/fair;
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

The conduit/relay/terminal/hazard relationship remains Basement-specific until another room demonstrates a real second reuse case.

## Current implementation slice

**T0–T8 complete. T9 Android visual review is next.**

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
TRIP THE FAILSAFE
    ↓
LOCAL CUTOFF REJECTED
    ↓
TRACE THE LAB FEED
    ↓
LAB FEED HATCH
    ↓
LABORATORY ROUTE IDENTIFIED
```

No further gameplay implementation is required before T9. The next required evidence is the Android screenshot run.