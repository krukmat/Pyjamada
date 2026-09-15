# W3A — Kitchen / Domestic Gameplay Expansion

## Status

**ACTIVE — GATE A CODE COMPLETE / ANDROID REVIEW PENDING**

W2 Living Room is accepted. W3A moves the adventure from passive discovery into deliberate manipulation of the house through a small causal electrical puzzle.

## Product goal

Kitchen must prove that an ordinary domestic object can become a reusable gameplay mechanic rather than another inspect-only story prop.

Player progression:

```text
Living Room source cue
 -> Kitchen
 -> TRACE THE POWER
 -> experiment with appliances
 -> create a useful electrical overload
 -> CHECK THE BREAKER
 -> reroute the circuit
 -> FOLLOW THE PULSE
```

The intended player realization is:

> I can manipulate the system causing the house to behave this way.

## Scope guardrails

In Gate A:
- Kitchen becomes a real connected room after the Living Room source cue;
- microwave provides the deliberate electrical load/overload;
- breaker panel reacts differently before and after that load exists;
- solving the relationship reroutes power and exposes the continuing pulse;
- room-local state survives save/load;
- focused deterministic screenshot states are available.

Out of Gate A:
- Bathroom implementation;
- new enemies or Kitchen combat;
- inventory/key-item system;
- generic puzzle engine;
- generic electrical simulation;
- refrigerator cold or oven heat mechanics;
- opening the next room after `FOLLOW THE PULSE`.

## Tasks

### W3-T0 — Close W2 formally — COMPLETE

W2 Android closeout is accepted. Living Room remains the narrative discovery room and its no-combat decision is preserved.

### W3-T1 — Define Kitchen gameplay loop — COMPLETE

Chosen loop:

```text
breaker first
 -> clue only: it needs a load

microwave
 -> overload circuit
 -> lights fail/flicker
 -> breaker becomes meaningful

breaker after overload
 -> clears overload
 -> reroutes power
 -> pulse moves deeper into house
```

This is causal environmental gameplay rather than a hidden-item puzzle.

### W3-T2 — Activate Kitchen in RoomRegistry — COMPLETE

Connectivity:

```text
Living Room <-> Kitchen
```

Living Room -> Kitchen is gated by the accepted W2 room-local switch:

`source-hum-traced`

Kitchen defines deterministic entry/return spawns plus real Microwave and Breaker interactions.

### W3-T3 — Kitchen base presentation — COMPLETE

Kitchen is rendered through the existing `RoomPresentation` seam.

Visual anchors:
- Living Room return door;
- refrigerator/cabinets/counter;
- microwave;
- breaker panel;
- overhead light;
- electrical conduit/pulse toward the deeper house.

State feedback:
- normal room: low-power/stable presentation;
- overload: dim/flickering room, hot microwave, breaker sparks;
- rerouted: stable cyan pulse through the conduit.

### W3-T4 — Electrical manipulation mechanic — COMPLETE

Room-local switches/history:
- `microwave-on`;
- `circuit-overloaded`;
- `power-rerouted`;
- inspected `microwave`;
- inspected `breaker-panel`;
- interaction `microwave-overload`;
- interaction `power-rerouted`.

Rules:
- breaker before overload provides a clue but cannot solve the room;
- microwave creates the required load once;
- breaker after overload resolves and reroutes the circuit;
- solved state cannot accidentally reopen the overload.

No new global story flag is introduced because no later implemented wave depends on Kitchen completion yet.

### W3-T5 — Persistence + deterministic evidence — COMPLETE AUTOMATED

Automated tests cover:
- Kitchen locked before `source-hum-traced`;
- direct and interaction transition become legal after the source cue;
- deterministic Kitchen spawn/visited-room tracking;
- breaker-before-load behavior;
- microwave overload;
- breaker reroute;
- solved-state idempotence;
- save/load restores current Kitchen and electrical state;
- Kitchen -> Living Room return path.

Application save coordinator persists Kitchen electrical milestones immediately.

Focused Android states:
- `23_kitchen_arrival`
- `24_kitchen_overload`
- `25_kitchen_power_rerouted`

## Gate A — Kitchen Power Loop

Required player path:

```text
Living Room
 -> trace radio/source cue
 -> enter Kitchen
 -> inspect/experiment
 -> microwave overload
 -> breaker reroute
 -> FOLLOW THE PULSE
```

Definition of Done:
1. Kitchen is inaccessible before the W2 source cue.
2. Living Room -> Kitchen -> Living Room navigation is deterministic.
3. Kitchen visually reads as a distinct domestic room.
4. Breaker alone does not solve the puzzle.
5. Microwave creates a clear environmental consequence.
6. Breaker resolves that consequence and reroutes power.
7. Solved state is stable/idempotent.
8. Save/load restores Kitchen and the solved electrical state.
9. W0–W2 regression suite remains green.
10. Android screenshots 23–25 make arrival, overload and reroute legible.

## Architecture checkpoint

W3 deliberately reuses the existing seams:

```text
RoomRegistry
  -> interaction effect id
  -> AdventureExplorationRuntime dispatch
  -> RoomInteractionEffects
  -> Kitchen room-local state
  -> KitchenPresentation
```

Do not generalize this into a power/puzzle engine until another room demonstrates a concrete reusable need.

## Next decision after Gate A

After Android review, decide whether Kitchen already delivers enough gameplay variety or genuinely needs one small secondary domestic mechanic. Do not start Bathroom automatically as part of Gate A closeout.
