# W2 — Living Room / Mystery Hook

## Status

**ACCEPTED**

Completed and accepted:
- **Gate A — Enter the Living Room** ✅
- **Gate B — Mystery Hook** ✅
- **T7 — Secondary environmental storytelling** ✅
- **T8 — Threat/noise evaluation** ✅ no escalation required
- **T9 — Hook toward W3** ✅
- **T10 — Deterministic review + E2E** ✅
- **T11 — Android closeout acceptance** ✅

W1 High/Medium structural debt remains closed. Adventure owns room/story progression while the Haunted slice remains the completed Act-I simulation container.

## Product result

The Living Room changes the player's question from:

> Why is the house wrong?

into:

> Who or what is actively observing or controlling this?

The television remains the central beat. Secondary clues reinforce it without competing with it.

## Accepted scope

Delivered:
- Hallway <-> Living Room production navigation;
- TV static/interference and distorted laboratory transmission;
- explicit `labTransmissionSeen` narrative knowledge;
- optional photo-reflection anomaly;
- optional radio/static clue;
- post-transmission directional source cue;
- persistence/idempotence coverage;
- Android visual evidence.

Deliberately not added:
- Living Room combat/threat mode;
- Dr. Vesper physical reveal;
- `SUBJECT W-01` reveal;
- new enemies;
- generic dialogue/cutscene/quest systems.

## Gate A — Enter the Living Room — ACCEPTED

```text
Hallway
 -> backward clock
 -> Living Room unlock
 -> Living Room
 -> save/load
 -> Hallway return
```

Navigation, persistence and room identity passed automated and Android review.

## Gate B — Mystery Hook — ACCEPTED

```text
Living Room
 -> TV OFF
 -> STATIC / INTERFERENCE
 -> distorted lab transmission
 -> labTransmissionSeen
 -> FIND THE SOURCE
```

Transmission remains intentionally fragmented:

```text
RESONANCE STABLE...
SUBJECT...
static
```

Vesper and the Resonator remain unrevealed at this stage.

Accepted evidence:
- `19_living_room_arrival`
- `20_living_room_static`
- `21_lab_transmission`

## Environmental closeout — ACCEPTED

Supporting clues:

1. **Photo anomaly**
   - interaction `PHOTO`;
   - inspected `photo-reflection`;
   - reaction: `The glass reflects a room that is not here.`

2. **Radio/static**
   - interaction `RADIO`;
   - inspected `radio-static`;
   - pre-transmission reaction: `No station. Just a pulse under the static.`

3. **Directional source cue**
   - after `labTransmissionSeen`, radio can persist `source-hum-traced`;
   - reaction: `The radio catches the same pulse. Stronger through the wall.`
   - cable/pulse points deeper into the house.

Accepted closeout evidence:
- `22_living_room_source_cue`

The final Android review confirmed the TV remains the primary focal object, the radio/photo remain secondary, and the cable/pulse reads as direction rather than a new quest system.

## Threat evaluation — NO ESCALATION

No Ghost/noise/combat was added to Living Room.

Reason:
- the room already works as discovery/narrative escalation;
- adding combat would reopen the Adventure/Haunted boundary without demonstrated value;
- later rooms may introduce threats only when mechanics justify them.

## Persistence and regression

Automated coverage validates:
- room navigation and deterministic spawns;
- TV static/transmission progression;
- global `labTransmissionSeen` persistence;
- optional photo/radio clues;
- source cue cannot resolve before the transmission;
- source cue is idempotent;
- closeout state survives save/load;
- W1 regression remains green.

## Final W2 state

```text
Gate A navigation           ACCEPTED
        |
        v
Gate B mystery hook         ACCEPTED
        |
        v
environmental clues         ACCEPTED
        |
        +------ threat evaluation -> NO ESCALATION
        |
        v
source direction            ACCEPTED
        |
        v
Android closeout            ACCEPTED
```

W2 is closed. Kitchen/Bathroom implementation belongs to W3 and later waves.
