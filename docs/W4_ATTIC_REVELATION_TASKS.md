# W4 — Attic / Revelation

## Status

**APPROVED — IMPLEMENTATION READY**

W3A Kitchen and W3B Bathroom are accepted. W4 is the next production wave on `feat/haunted-house-adventure`.

## Product goal

Turn the anomalies accumulated across Bedroom, Living Room, Kitchen and Bathroom into explicit understanding without collapsing the mystery into an exposition dump.

By the end of W4 the player should be able to infer:

1. the house anomalies are connected;
2. they are being produced deliberately;
3. Wally is an observed/selected subject;
4. the active machinery/source is below the house;
5. the next concrete destination is Basement.

W4 must **not** fully reveal Dr. Vesper, explain the complete Resonator architecture, implement Basement interior, or introduce a generic clue/inventory/dialogue system.

## Narrative sequence

```text
Bathroom route revealed
        ↓
Attic
        ↓
SEARCH THE ATTIC
        ↓
inspect experiment evidence
        ↓
connect prior rooms to one experiment
        ↓
central recorder/monitor becomes meaningful
        ↓
partial recording: RESONANCE / SUBJECT / extraction clues
        ↓
player concludes someone is running the house
        ↓
FIND THE MACHINE
        ↓
Basement boundary becomes concrete
```

The revelation should answer **what kind of situation this is** before answering **who is responsible**.

## Information budget

### W4 may reveal

- Bedroom, Living Room, Kitchen and Bathroom readings belong to one experiment.
- The experiment tracks resonance/dream-energy behavior.
- Wally is a subject, e.g. `SUBJECT W-01` or equivalent partial identifier.
- Energy/control infrastructure continues downward.
- The machine responsible is below the house.

### W4 must preserve for later waves

- Dr. Vesper's complete identity/motivation.
- Full Resonator purpose and architecture.
- Why Wally is unusually compatible with the experiment.
- Whether the experiment is still under deliberate control.

## Visual language

Attic should be visually denser than Hallway/Living Room/Kitchen/Bathroom while still reading as part of the same house.

Required motifs:

- rafters / sloped roof;
- stacked domestic boxes and displaced household objects;
- newer cables crossing older construction;
- improvised observation equipment;
- one central recorder/monitor with clear visual hierarchy;
- a downward cable/hatch/seam used only after the revelation.

The room should initially look like storage that has been secretly converted into an observation station.

## Gameplay loop

W4 is a **light evidence reconstruction**, not a new puzzle engine.

Recommended concrete interaction set:

1. **Experiment log / chart** — connects readings to rooms already visited.
2. **Sensor crate / wiring map** — proves the anomalies are instrumented rather than random.
3. **Recorder / monitor** — initially ambiguous; becomes meaningful after evidence is inspected.

A central interaction may require the evidence context, but this must remain room-local state rather than introducing a generalized clue graph.

## Tasks

### W4-T0 — Formal W3 closeout

- Mark W3A Kitchen `ACCEPTED`.
- Mark W3B Bathroom `ACCEPTED` after Android 26–29 review.
- Preserve 1–29 screenshot tour as regression baseline.

### W4-T1 — Attic room foundation

- Activate `attic` in `RoomRegistry`.
- Add deterministic Bathroom → Attic entry and Attic → Bathroom return path.
- Gate Bathroom → Attic on the accepted `mirror-route-revealed` state.
- Do not activate Basement travel yet.

### W4-T2 — Attic presentation

- Add `AtticPresentation` through the existing `RoomPresentation` seam.
- Establish storage/rafters/observation-station identity.
- Keep Wally scale, floor baseline and interaction readability consistent with prior rooms.

### W4-T3 — Evidence interactions

Implement 2 focused evidence interactions that refer back to prior gameplay rather than adding unrelated lore.

Expected local state examples:

```text
attic-log-inspected
attic-sensors-inspected
```

Both must be idempotent and persist through save/load.

### W4-T4 — Central recording / main revelation

- Central recorder/monitor interaction.
- Before sufficient evidence: ambiguous/incomplete output only.
- After evidence: reveal resonance/subject/extraction language.
- No full Vesper reveal.

Expected room-local milestone:

```text
experiment-revealed
```

### W4-T5 — Objective progression

Target objective sequence:

```text
SEARCH THE ATTIC
CONNECT THE EVIDENCE
PLAY THE RECORDING
FIND THE MACHINE
```

World state should communicate each transition before reaction text explains it.

### W4-T6 — Basement hook

After the main recording:

- power/signal path visibly turns downward;
- a Basement hatch/seam/boundary becomes clear;
- W4 does **not** implement Basement interior or transition gameplay.

Expected room-local state:

```text
basement-route-revealed
```

### W4-T7 — Persistence and idempotence

Cover:

- individual evidence inspection;
- incomplete recorder state;
- completed revelation;
- Basement boundary state;
- repeated interactions do not duplicate milestones/events;
- Continue restores Attic and revelation state correctly.

### W4-T8 — Deterministic Android review

Extend the screenshot contract with:

```text
30_attic_arrival.png
31_attic_evidence.png
32_attic_recording.png
33_basement_route_revealed.png
```

The first 29 screenshots remain regression evidence.

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

Do not add in W4:

- Basement interior;
- new enemy/combat escalation;
- inventory system;
- clue graph / quest framework;
- dialogue system;
- full Dr. Vesper reveal;
- generic recorder/terminal framework;
- broad save-schema rewrite.

## Architecture constraint

Continue the established pattern:

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

Only extract a broader evidence/terminal abstraction if a second concrete later-wave use proves it necessary.
