# W3A — Kitchen / Domestic Gameplay Expansion

## Status

**ACCEPTED**

W3A moves the adventure from passive discovery into deliberate manipulation of the house through a small causal electrical puzzle.

## Product goal

Kitchen proves that an ordinary domestic object can become gameplay rather than another inspect-only story prop.

```text
Living Room source cue
 -> Kitchen
 -> TRACE THE POWER
 -> microwave overload
 -> CHECK THE BREAKER
 -> reroute circuit
 -> FOLLOW THE PULSE
 -> Bathroom boundary
```

The intended realization is:

> I can manipulate the system causing the house to behave this way.

## Accepted scope

Delivered:
- real Living Room <-> Kitchen connectivity after `source-hum-traced`;
- Microwave as deliberate electrical load;
- Breaker that behaves differently before/after overload;
- persistent `microwave-on`, `circuit-overloaded`, and `power-rerouted` room state;
- stable/idempotent solved state;
- save/load coverage;
- distinct stable, overload, and rerouted presentation;
- concrete Bathroom boundary after reroute.

Explicitly not added:
- generic puzzle/electrical engine;
- refrigerator or oven mechanics;
- inventory;
- enemies/combat.

## Accepted gameplay loop

```text
breaker first
 -> clue: circuit needs a load

microwave
 -> overload
 -> room visibly loses power
 -> breaker becomes meaningful

breaker after overload
 -> clears overload
 -> reroutes power
 -> cyan pulse reaches Bathroom boundary
```

## Android review closeout

The first 25-screen Android review validated the core room and mechanic. Two non-blocking presentation issues were identified and subsequently corrected:

1. **Arrival lighting**
   - initial overhead fixture no longer contradicts the dead-appliance state;
   - copy now reads `The appliances are dead. Something in the wall is still drawing power.`

2. **Deterministic framing**
   - overload evidence now positions Wally at the Breaker so `CHECK THE BREAKER` and the interaction prompt agree;
   - rerouted evidence now positions Wally at the Bathroom boundary so `FOLLOW THE PULSE` leads to an actionable route.

Focused evidence remains:
- `23_kitchen_arrival`
- `24_kitchen_overload`
- `25_kitchen_power_rerouted`

The refreshed W3B Android tour will revalidate these states together with Bathroom screenshots 26–29.

## Acceptance result

```text
Room identity              PASS
Cause/effect gameplay      PASS
Overload feedback          PASS
Power reroute feedback     PASS
Persistence/idempotence    PASS
W0-W2 regression           PASS
Initial-light mismatch     FIXED
Overload framing           FIXED
Forward route              FIXED via Bathroom boundary
```

**W3A Gate A = ACCEPTED.**

## Architecture checkpoint

W3A continues to use the existing narrow seams:

```text
RoomRegistry
  -> interaction effect id
  -> AdventureExplorationRuntime dispatch
  -> RoomInteractionEffects
  -> Kitchen room-local state
  -> KitchenPresentation
```

No generic electrical/puzzle engine was extracted. A later concrete reuse case is still required before introducing such an abstraction.

## Next

W3B Bathroom owns the next active gate. Kitchen should not receive more appliances, enemies, or secondary mechanics unless later playtesting demonstrates a concrete need.
