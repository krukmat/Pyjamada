# W2 — Living Room / Mystery Hook

## Status

**ACTIVE — CLOSEOUT CODE COMPLETE / FINAL ANDROID REVIEW PENDING**

Completed:
- **Gate A — Enter the Living Room** ✅
- **Gate B — Mystery Hook** ✅ accepted on Android
- **T7 — Secondary environmental storytelling** ✅
- **T8 — Threat/noise evaluation** ✅ no escalation required in W2
- **T9 — Hook toward W3** ✅
- **T10 — Deterministic review + E2E** ✅ automated

Remaining gate:
- **T11 — Android closeout acceptance** ⏳

W1 is accepted and its High/Medium structural debt remains closed. W2 keeps the same separation: Adventure owns room/story progression while the Haunted slice remains the completed Act-I simulation container.

## Product goal

The Living Room changes the player's question from:

> Why is the house wrong?

into:

> Who or what is actively observing or controlling this?

The television remains the central beat. Secondary clues reinforce it without competing with it or opening W3 content early.

## Scope guardrails

In W2:
- Hallway <-> Living Room production navigation;
- TV static/interference and distorted laboratory transmission;
- explicit `labTransmissionSeen` narrative knowledge;
- at most a few supporting environmental clues;
- a clear directional reason to continue exploring;
- persistence and deterministic evidence.

Out of W2:
- Kitchen or Bathroom implementation;
- Dr. Vesper physical reveal;
- `SUBJECT W-01` reveal;
- new enemy types;
- generic dialogue/cutscene/scripting engines;
- Living Room combat/threat mode.

## Task status

### W2-T0 — Close W1 and activate W2 — COMPLETE

Master roadmap treats W1 as accepted and W2 as active.

### W2-T1 — Activate Living Room in the room registry — COMPLETE

Production connectivity:

```text
Hallway <-> Living Room
```

The same Hallway switch `living-room-unlocked` gates both interaction availability and transition legality. Spawn/facing and visited-room persistence are deterministic.

### W2-T2 — Extract room-effect dispatch seam — COMPLETE

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

Room-specific mutations/events remain outside `AdventureExplorationRuntime`.

### W2-T3 — Living Room base presentation — COMPLETE

Base room uses the existing `RoomPresentation` seam with:
- Hallway return door;
- sofa/furniture;
- TV as dominant focal object;
- contextual exploration HUD/controls.

## Gate A — Enter the Living Room — ACCEPTED

```text
Hallway
 -> backward clock
 -> Living Room unlock
 -> Living Room
 -> save/load
 -> Hallway return
```

Navigation, persistence and Android visual identity are accepted.

### W2-T4 — Television interaction — COMPLETE

First TV interaction:

```text
TV OFF
 -> INTERACT
STATIC / INTERFERENCE
```

Persists:
- `tv-on = true`;
- `tv-activated`;
- `LIVING_ROOM_TV_ACTIVATED` milestone.

### W2-T5 — Distorted laboratory transmission — COMPLETE

Second TV interaction exposes only a fragment:

```text
RESONANCE STABLE...
SUBJECT...
static
```

Vesper and the Resonator remain unrevealed. The intended inference is deliberate monitoring/experimentation rather than random haunting.

### W2-T6 — Story state and persistence — COMPLETE

Global narrative knowledge:

`labTransmissionSeen`

Local evidence:
- inspected `television`;
- interaction `tv-transmission`;
- TV power state.

Save/load restores both. Older v3 saves missing the W2 flag migrate it to `false`.

## Gate B — Mystery Hook — ACCEPTED

Accepted Android sequence:

```text
Living Room arrival
 -> TV static
 -> distorted transmission
 -> labTransmissionSeen
 -> FIND THE SOURCE
```

Accepted evidence:
- `19_living_room_arrival`
- `20_living_room_static`
- `21_lab_transmission`

The room communicates that the haunting is being driven or observed without over-explaining the experiment.

### W2-T7 — Secondary environmental storytelling — COMPLETE

Added only two optional interactive clues plus one supporting visual cue:

1. **Photo anomaly**
   - interaction: `PHOTO`;
   - inspected id: `photo-reflection`;
   - visual reflection changes after inspection;
   - reaction: `The glass reflects a room that is not here.`

2. **Radio/static**
   - interaction: `RADIO`;
   - inspected id: `radio-static`;
   - local static/pulse presentation;
   - reaction before the transmission: `No station. Just a pulse under the static.`

3. **Impossible TV cable**
   - remains a supporting visual detail;
   - becomes a stronger directional cue only after the radio matches the laboratory pulse.

The TV remains the primary story object.

### W2-T8 — Threat/noise evaluation — COMPLETE: NO ESCALATION

Gate B passed visually without evidence that the Living Room needs combat pressure. W2 therefore does **not** re-enable Ghost/noise/threat systems.

Reason:
- the room's purpose is discovery and narrative escalation;
- adding combat here would reopen the Adventure/Haunted boundary without demonstrated gameplay value;
- later rooms can introduce deliberate threat capability when mechanics justify it.

### W2-T9 — Hook toward W3 — COMPLETE

After `labTransmissionSeen`, interacting with the radio can match the same pulse and persist:

`source-hum-traced = true`

This emits `LIVING_ROOM_SOURCE_CUE_REVEALED` once and changes the environmental read:

```text
TV transmission
 -> FIND THE SOURCE
 -> radio catches matching pulse
 -> cable/pulse points deeper into the house
```

Reaction:

`The radio catches the same pulse. Stronger through the wall.`

This provides direction without creating a Kitchen route or implementing W3.

### W2-T10 — Deterministic review + E2E — COMPLETE

Automated coverage now includes:
- Gate A navigation/save/load;
- Gate B TV static -> transmission -> story flag -> save/load;
- optional photo/radio clues;
- radio cannot reveal source before the lab transmission;
- post-transmission source cue is idempotent;
- photo, radio and source cue survive save/load;
- current room remains Living Room: W3 is not entered.

Deterministic Android review states:
- `19_living_room_arrival`
- `20_living_room_static`
- `21_lab_transmission`
- `22_living_room_source_cue`

### W2-T11 — Android closeout acceptance — NEXT GATE

Final user-run review should validate:
- photo/radio remain secondary to the TV;
- `22_living_room_source_cue` reads as a directional clue rather than a new objective system;
- glowing cable/pulse is visible but not over-emphasized;
- touch interaction with photo/radio feels natural;
- no combat is needed to make the room engaging;
- Continue preserves closeout state.

## Dependency closeout

```text
Gate A navigation           ACCEPTED
        |
        v
Gate B TV mystery hook      ACCEPTED
        |
        v
T7 environmental clues      COMPLETE
        |
        +------ T8 threat evaluation -> NO ESCALATION
        |
        v
T9 source direction         COMPLETE
        |
        v
T10 automated evidence      COMPLETE
        |
        v
T11 Android closeout        PENDING
```

## Current checkpoint

W2 code is complete through the narrative closeout. Do not add Ghost/combat, Kitchen, Vesper reveal or more environmental objects before the final Android review of screenshot `22_living_room_source_cue` and the optional touch flow.
