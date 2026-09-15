# W2 — Living Room / Mystery Hook

## Status

**ACTIVE — GATE B CODE COMPLETE / ANDROID REVIEW PENDING**

Completed implementation blocks:
- **Gate A — Enter the Living Room** ✅
- **Gate B — Mystery Hook** ✅ code/test implementation

Next acceptance evidence is the local Android review of the Living Room TV states.

W1 is accepted and its High/Medium structural debt is closed. W2 proves two things without reopening that debt:

1. a third room can be added cheaply through the room registry/presentation seams;
2. interactive mystery content can grow without turning `AdventureExplorationRuntime` back into a room-specific `if/else` chain.

## Product goal

The Living Room is the first room that changes the player's question from:

> Why is the house wrong?

into:

> Who or what is actively observing or controlling this?

The central W2 beat is the television. Arrival and room navigation are foundation only; W2 does not deliver its narrative value until the TV produces the distorted laboratory transmission.

## Scope guardrails

In W2:
- Living Room becomes a real connected room.
- Hallway <-> Living Room navigation is production gameplay.
- TV becomes the central interaction.
- A short distorted transmission establishes deliberate observation/experimentation.
- Story/progression persists through save/load.
- Secondary environmental storytelling remains small and subordinate to the TV beat.

Out of W2:
- Kitchen implementation.
- Bathroom implementation.
- Dr. Vesper physical reveal.
- `SUBJECT W-01` reveal.
- new enemy types.
- generic dialogue/cutscene/scripting engines.
- combat/threat mode in Living Room unless playtest evidence demonstrates that the room is too passive.

## Task plan

### W2-T0 — Close W1 and activate W2 — P0 — COMPLETE

Master roadmap now treats W1 as accepted and W2 as active.

### W2-T1 — Activate Living Room in the room registry — P0 — COMPLETE

Implemented:
- `living-room` presentation id;
- `living-room-from-hallway` entry;
- `hallway-to-living-room` exit;
- `living-room-to-hallway` exit;
- `hallway-from-living-room` return entry;
- real Hallway Living Room door interaction.

The same `living-room-unlocked` Hallway switch gates both interaction availability and transition legality.

### W2-T2 — Extract room-effect dispatch seam — P0 — COMPLETE

Implemented direction:

```text
RoomDefinition.interactions
        |
        v
AdventureExplorationRuntime
        |
        v
applyRoomInteractionEffect()
        |
        +-- Hallway effects
        +-- Living Room effects
```

Effect-specific mutation/events live in `RoomInteractionEffects.ts`; the runtime stays responsible for movement, target resolution and dispatch only.

### W2-T3 — Living Room base presentation — P0 — COMPLETE

Implemented through the existing `RoomPresentation` seam with:
- Hallway return door;
- sofa/furniture;
- television as the dominant future interaction;
- contextual exploration HUD and controls.

## Gate A — Enter the Living Room — COMPLETE

Validated path:

```text
Hallway
  -> inspect backward clock
  -> Living Room door unlocks
  -> INTERACT Living Room
  -> room transition/fade
  -> Living Room
  -> INTERACT Hallway door
  -> Hallway
```

Persistence covers restoring Living Room after save/load and deterministic round-trip spawn points.

### W2-T4 — Television interaction — P0 — COMPLETE

The TV is registered as real Living Room content at the room-definition layer.

State progression:

```text
TV OFF
 -> INTERACT
STATIC / INTERFERENCE
```

First interaction persists:
- Living Room switch `tv-on = true`;
- room interaction `tv-activated`;
- event `LIVING_ROOM_TV_ACTIVATED`.

The milestone is persisted immediately by the application save coordinator.

### W2-T5 — Distorted laboratory transmission — P0 — COMPLETE

A second TV interaction cuts through the static and exposes the first deliberately technological clue:

```text
RESONANCE STABLE...
SUBJECT...
static
```

The UI deliberately avoids naming Dr. Vesper or explaining the Resonator. The intended inference is that the haunting is being observed or driven by an experiment.

The Living Room renderer distinguishes:
- TV off;
- static/interference;
- distorted transmission residue.

### W2-T6 — Story state and persistence — P0 — COMPLETE

Implemented explicit global story flag:

`labTransmissionSeen`

First meaningful transmission sets it once and also persists local evidence:
- inspected id `television`;
- interaction `tv-transmission`;
- TV power state.

Save/load restores the global flag and local TV state. Pre-Gate-B v3 saves that do not contain `labTransmissionSeen` migrate it to `false` rather than becoming incompatible.

## Gate B — Mystery Hook — CODE COMPLETE

Required path now exists:

```text
Living Room
 -> discover TV
 -> activate TV
 -> interference
 -> interact again
 -> distorted lab transmission
 -> labTransmissionSeen
 -> FIND THE SOURCE
```

Player takeaway:

> The haunting is not random. Something is monitoring or driving it.

Automated Gate B coverage validates:
- TV starts off;
- first interaction produces static and does not prematurely reveal the lab;
- second interaction sets the global story milestone;
- repeated interaction does not replay first-discovery semantics;
- local TV state and global story state survive save/load;
- pre-Gate-B saves migrate safely.

Focused Android review states now are:
- `19_living_room_arrival`
- `20_living_room_static`
- `21_lab_transmission`

`22_post_transmission` remains available for Gate C only if a separate post-signal visual state proves useful; it is not required merely to increase screenshot count.

### W2-T7 — Secondary environmental storytelling — P1 — NEXT AFTER GATE B REVIEW

Only after the TV beat is visually accepted, add at most 2–3 supporting details, e.g.:
- photo/frame anomaly;
- radio/static;
- impossible cable routing or electrical artifact.

These must reinforce the TV mystery, not compete with it.

### W2-T8 — Threat/noise evaluation — P1 conditional

Do **not** re-enable Ghost/combat in Living Room by default.

After playtest, ask whether the room lacks arcade pressure. Only if evidence supports it should W2 introduce a deliberate room threat capability.

Avoid coupling exploration to Haunted combat again merely because the TV is electrical/noisy.

### W2-T9 — Hook toward W3 — P1

Gate B already introduces `FIND THE SOURCE` as the forward objective. A small environmental cue can be added after review, but Kitchen remains outside W2.

### W2-T10 — Deterministic review + E2E — IN PROGRESS

Implemented continuous automated coverage:

```text
Hallway
 -> Living Room
 -> TV static
 -> transmission
 -> story flag
 -> save/load
 -> Living Room restored
```

Current deterministic review states:
- `19_living_room_arrival`
- `20_living_room_static`
- `21_lab_transmission`

### W2-T11 — Android acceptance — NEXT GATE

User-run local Android review validates:
- room readability;
- TV discoverability;
- static/interference readability;
- transmission readability;
- touch navigation between Hallway and Living Room;
- whether W2 needs any threat/noise escalation.

## Dependency DAG

```text
T0 Close W1 / activate W2       COMPLETE
 |
 v
T1 Living Room registry         COMPLETE
 |
 +----------------+
 v                v
T2 effect seam    T3 presentation
 COMPLETE          COMPLETE
 |                |
 +-------+--------+
         v
       Gate A                 COMPLETE
         |
         v
       T4 TV                  COMPLETE
         |
         v
 T5 transmission              COMPLETE
         |
         v
   T6 story state             COMPLETE
         |
         v
       Gate B                 CODE COMPLETE
         |
         v
 Android review               NEXT
      /       \
     v         v
 T7/T9       T8 evaluation
         |
         v
       T10/T11
```

## Current checkpoint

Gate B implementation is complete. Do not add Ghost/combat, Kitchen, Vesper reveal or broad environmental content before reviewing the two new TV evidence states on Android.
