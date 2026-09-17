# W4 — Attic / Revelation

## Status

**CODE COMPLETE — ANDROID REVIEW PENDING**

W3A Kitchen and W3B Bathroom are accepted. W4 is implemented on `feat/haunted-house-adventure`; the remaining gate is Android visual acceptance for screenshots 30–33.

## Product goal

Turn the anomalies accumulated across Bedroom, Living Room, Kitchen and Bathroom into explicit understanding without collapsing the mystery into an exposition dump.

By the end of W4 the player should be able to infer:

1. the house anomalies are connected;
2. they are being produced deliberately;
3. Wally is an observed/selected subject;
4. the active machinery/source is below the house;
5. the next concrete destination is Basement.

W4 must **not** fully reveal Dr. Vesper, explain the complete Resonator architecture, implement Basement interior, or introduce a generic clue/inventory/dialogue system.

## Implemented narrative sequence

```text
Bathroom route revealed
        ↓
Attic
        ↓
SEARCH THE ATTIC
        ↓
inspect experiment log + sensor crate
        ↓
CONNECT THE EVIDENCE
        ↓
PLAY THE RECORDING
        ↓
SUBJECT W-01 / RESONANCE EXTRACTION
        ↓
FIND THE MACHINE
        ↓
trace recorder output cable downward
        ↓
Basement boundary revealed
```

The revelation answers **what kind of situation this is** before answering **who is responsible**.

## Information budget

### W4 reveals

- Bedroom, Living Room, Kitchen and Bathroom readings belong to one experiment.
- The experiment tracks resonance/dream-energy behavior.
- Wally is identified as `SUBJECT W-01`.
- Energy/control infrastructure continues downward.
- The machine responsible is below the house.

### W4 preserves for later waves

- Dr. Vesper's complete identity/motivation.
- Full Resonator purpose and architecture.
- Why Wally is unusually compatible with the experiment.
- Whether the experiment is still under deliberate control.

## Visual language

Attic is intentionally denser than Hallway/Living Room/Kitchen/Bathroom while still reading as part of the same house.

Implemented motifs:

- rafters / sloped roof;
- stacked domestic boxes and displaced household objects;
- newer cables crossing older construction;
- improvised observation equipment;
- one central recorder/monitor with clear visual hierarchy;
- a downward cable/hatch seam exposed after the revelation.

The room should initially read as storage secretly converted into an observation station.

## Gameplay loop

W4 remains a **light evidence reconstruction**, not a new puzzle engine.

Concrete interactions:

1. **Experiment log** — connects resonance readings to rooms already visited.
2. **Sensor crate / wiring map** — proves the anomalies are instrumented rather than random.
3. **Recorder / monitor** — incomplete before both evidence interactions; meaningful afterward.
4. **Downward cable** — traceable only after the main revelation; exposes the Basement boundary.

All progression remains room-local state rather than a generalized clue graph.

## Tasks

### W4-T0 — Formal W3 closeout — COMPLETE

- W3A Kitchen `ACCEPTED`.
- W3B Bathroom `ACCEPTED` after Android 26–29 review.
- Screenshots 1–29 remain the regression baseline.

### W4-T1 — Attic room foundation — COMPLETE

- `attic` activated in `RoomRegistry`.
- Deterministic Bathroom → Attic entry and Attic → Bathroom return path.
- Bathroom → Attic gated on `mirror-route-revealed`.
- Basement travel intentionally remains inactive.

### W4-T2 — Attic presentation — COMPLETE

- Added `AtticPresentation` through the existing `RoomPresentation` seam.
- Storage/rafters/observation-station visual identity established.
- Wally scale, floor baseline and interaction readability reuse existing room conventions.

### W4-T3 — Evidence interactions — COMPLETE

Implemented two focused evidence interactions:

```text
attic-experiment-log
attic-sensor-map
```

Both are idempotent and persist through save/load.

### W4-T4 — Central recording / main revelation — COMPLETE

- Recorder/monitor interaction implemented.
- Before sufficient evidence it yields only incomplete context.
- After both evidence interactions it reveals `SUBJECT W-01` / resonance extraction language.
- Full Vesper identity remains unrevealed.

Room-local milestone:

```text
experiment-revealed
```

### W4-T5 — Objective progression — COMPLETE

Implemented objective sequence:

```text
SEARCH THE ATTIC
CONNECT THE EVIDENCE
PLAY THE RECORDING
FIND THE MACHINE
```

World state changes accompany the objective transitions.

### W4-T6 — Basement hook — COMPLETE

After the main recording:

- recorder output visibly continues downward;
- tracing the downward cable exposes a Basement hatch/boundary;
- Basement interior and transition gameplay remain outside W4.

Room-local milestone:

```text
basement-route-revealed
```

### W4-T7 — Persistence and idempotence — COMPLETE

Covered by `tests/w4-attic-gate-a.test.ts`:

- individual evidence inspection;
- incomplete recorder state;
- completed revelation;
- Basement boundary state;
- repeated interactions do not duplicate milestones/events;
- Continue restores Attic and revelation state;
- Attic retains a production return path to Bathroom.

### W4-T8 — Deterministic Android review — PENDING USER RUN

Screenshot contract now contains 33 screenshots:

```text
30_attic_arrival.png
31_attic_evidence.png
32_attic_recording.png
33_basement_route_revealed.png
```

Screenshots 1–29 remain regression evidence.

## Acceptance gate

W4 is accepted only when a player can infer, primarily from room state and short interactions:

> The house is being instrumented as an experiment, Wally is one of its subjects, and the machinery driving it is below the house.

Android review must confirm:

- Attic reads immediately as storage converted into an observation space.
- Evidence is visually related to previous rooms.
- `31 → 32` changes understanding, not merely caption text.
- Recorder/monitor is the revelation focal point.
- `32 → 33` creates a concrete downward destination.
- Basement boundary does not look like generic decoration.

## Non-goals

Not added in W4:

- Basement interior;
- new enemy/combat escalation;
- inventory system;
- clue graph / quest framework;
- dialogue system;
- full Dr. Vesper reveal;
- generic recorder/terminal framework;
- broad save-schema rewrite.

## Architecture constraint

The implementation continues the established pattern:

```text
RoomRegistry
    ↓
AdventureExplorationRuntime
    ↓
RoomInteractionEffects
    ↓
room-local persistent state
    ↓
RoomPresentation / AtticPresentation
```

No broader evidence/terminal abstraction was extracted because W4 provides only the first concrete recorder use case.

## Current gate

Run locally:

```bash
git pull
npm run screenshots:android
```

Expected total: **33 screenshots**. Review 30–33 specifically before marking W4 `ACCEPTED`.
