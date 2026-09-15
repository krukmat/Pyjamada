# W2 — Living Room / Mystery Hook

## Status

**ACTIVE**

Current implementation focus: **Gate A — Enter the Living Room**.

W1 is accepted and its High/Medium structural debt is closed. W2 must now prove two things without reopening that debt:

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

### W2-T0 — Close W1 and activate W2 — P0

Update the master roadmap so W1 is `ACCEPTED` and W2 is `ACTIVE`.

Definition of Done:
- master roadmap reflects the accepted W1 gate;
- W1 debt closure remains documented;
- W2 task/DAG document is canonical for this wave.

### W2-T1 — Activate Living Room in the room registry — P0

Add:
- `living-room` presentation id;
- `living-room-from-hallway` entry;
- `hallway-to-living-room` exit;
- `living-room-to-hallway` exit;
- `hallway-from-living-room` return entry;
- real Hallway Living Room door interaction.

The same `living-room-unlocked` Hallway switch that controls the visible door must also gate the registered transition. Interaction availability and transition legality must not diverge.

Definition of Done:
- Living Room cannot be entered before the backward-clock reveal;
- after reveal, Hallway -> Living Room is legal;
- Living Room -> Hallway is legal;
- deterministic spawn/facing is defined in both directions;
- visited room tracking remains correct.

### W2-T2 — Extract room-effect dispatch seam — P0

Room interactions remain data in `RoomRegistry`, but effect execution must not grow directly inside `AdventureExplorationRuntime`.

Target direction:

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
        +-- Living Room effects (W2-T4+)
```

This is deliberately a small dispatcher, not a scripting engine.

Definition of Done:
- `AdventureExplorationRuntime` resolves target + exit/effect category;
- effect-specific mutation/events live outside the runtime;
- existing backward-clock behavior remains deterministic and tested.

### W2-T3 — Living Room base presentation — P0

Create the base room through the existing `RoomPresentation` seam.

Initial visual hierarchy:
1. Wally;
2. television;
3. Hallway door;
4. sofa/furniture supporting room identity.

The TV may exist visually during Gate A but is not yet an interactive story beat.

Definition of Done:
- Living Room has a distinct readable presentation;
- top-level `GameCanvas` is not duplicated;
- shared Wally/camera/exploration controls still work;
- HUD remains contextual exploration HUD;
- room can be entered and exited normally.

## Gate A — Enter the Living Room

Required path:

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

Required persistence:

```text
Living Room
  -> save
  -> continue
  -> Living Room restored
```

Automated acceptance:
- registry availability and direct transition are both locked before clock reveal;
- both become valid after reveal;
- round-trip spawn points are deterministic;
- visited rooms include Bedroom, Hallway, Living Room;
- save/load restores Living Room;
- existing W1 end-to-end remains green.

Gate A deliberately contains no TV interaction or transmission.

### W2-T4 — Television interaction — P0

Add the TV as room content and the central interaction target.

Minimum state progression:

```text
TV OFF
 -> INTERACT
STATIC / INTERFERENCE
```

Persist activation/inspection locally in Living Room state.

Do not add long dialogue or a generic media/cutscene engine.

### W2-T5 — Distorted laboratory transmission — P0

After TV activation, deliver a short, fragmented transmission such as:

```text
RESONANCE STABLE...
...SUBJECT STILL...
[SIGNAL LOST]
```

The player should infer deliberate observation without learning the entire experiment.

Do not name/explain Dr. Vesper in full here.

### W2-T6 — Story state and persistence — P0

Introduce an explicit global story flag when the transmission becomes meaningful, provisionally:

`labTransmissionSeen`

Room-local state records the TV interaction; global story state records narrative knowledge required by later waves.

Definition of Done:
- first transmission sets the story flag exactly once;
- room-local TV state persists;
- save/load restores both;
- leaving and re-entering Living Room does not incorrectly replay first-discovery semantics.

## Gate B — Mystery Hook

Required path:

```text
Living Room
 -> discover TV
 -> activate TV
 -> interference
 -> distorted lab transmission
 -> labTransmissionSeen
```

Player takeaway:

> The haunting is not random. Something is monitoring or driving it.

### W2-T7 — Secondary environmental storytelling — P1

Only after the TV beat works, add at most 2–3 supporting details, e.g.:
- photo/frame anomaly;
- radio/static;
- impossible cable routing or electrical artifact.

These must reinforce the TV mystery, not compete with it.

### W2-T8 — Threat/noise evaluation — P1 conditional

Do **not** re-enable Ghost/combat in Living Room by default.

After playtest, ask whether the room lacks arcade pressure. Only if evidence supports it should W2 introduce a deliberate room threat capability.

Avoid coupling exploration to Haunted combat again merely because the TV is electrical/noisy.

### W2-T9 — Hook toward W3 — P1

After the transmission, provide a small forward cue such as an electrical sound elsewhere or a new objective (`FIND THE SOURCE`).

Do not implement Kitchen in W2.

### W2-T10 — Deterministic review + E2E — P0

Target focused review states:
- `19_living_room_arrival`
- `20_tv_static`
- `21_lab_transmission`
- `22_post_transmission`

Target continuous E2E:

```text
Hallway
 -> Living Room
 -> TV
 -> transmission
 -> story flag
 -> save/load
 -> Living Room restored
```

Also cover Living Room -> Hallway -> Living Room without losing progression.

### W2-T11 — Android acceptance — Gate

User-run local Android review validates:
- room readability;
- TV discoverability;
- transmission readability/timing;
- touch navigation between Hallway and Living Room;
- Continue behavior;
- whether W2 needs any threat/noise escalation.

## Dependency DAG

```text
T0 Close W1 / activate W2
 |
 v
T1 Living Room registry
 |
 +----------------+
 v                v
T2 effect seam    T3 base presentation
 |                |
 +-------+--------+
         v
       Gate A
         |
         v
       T4 TV
         |
         v
 T5 transmission
         |
         v
   T6 story state
      /      \
     v        v
    T7       T9
 environment hook
      \      /
       v    v
 T8 threat evaluation (conditional)
         |
         v
       T10 tests
         |
         v
       T11 Android
```

## Critical path

```text
T1
 -> T2/T3
 -> T4
 -> T5
 -> T6
 -> T10
 -> T11
```

## Current checkpoint

T0–T3 are the first implementation block. Work stops at Gate A before TV behavior begins.

Gate A is complete only when code, tests and repository validation are green. Android screenshots for the Living Room are not required until the W2 review scenarios are added later, but a manual navigation check is useful if available.
