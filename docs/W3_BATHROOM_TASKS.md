# W3B — Bathroom / Reflection Geometry

## Status

**ACCEPTED**

W3A Kitchen and W3B Bathroom are both accepted. W3B validates a different gameplay idea: the house can expose useful information through impossible spatial relationships, not only through electrical cause/effect.

## Product goal

Bathroom moves the player from:

> I can manipulate the house.

into:

> The house is showing me space that does not exist normally.

The anomaly must read visually before reaction text explains it.

## Accepted player loop

```text
Kitchen power rerouted
 -> FOLLOW THE PULSE
 -> Bathroom
 -> real pulse stops at sink
 -> mirror shows pulse continuing through impossible geometry
 -> inspect MIRROR
 -> TEST THE REFLECTION
 -> switch real LIGHT off
 -> mirror remains unnaturally illuminated
 -> CHECK THE MIRROR
 -> confirm reflected route
 -> real wall adopts matching cyan seam
 -> ATTIC ACCESS REVEALED
```

The accepted realization is:

> The mirror is not reflecting this room. It is showing another valid version of it.

## Scope guardrails

Delivered:
- Kitchen <-> Bathroom production navigation after Kitchen `power-rerouted`;
- distinct Bathroom presentation;
- real pulse termination around the sink;
- mirror with a materially different reflected pulse/route;
- one Light Switch supporting interaction;
- real-room darkness versus persistent mirror illumination;
- corresponding real-wall seam after confirmation;
- room-local persistence and deterministic tests/evidence.

Not introduced in W3B:
- generic mirror/portal engine;
- arbitrary teleportation;
- inventory/key-item puzzle;
- Bathroom combat or new enemies;
- faucet/toilet/shower mechanics;
- Vesper/W-01 reveal.

Attic interior remained outside W3B and is handled by W4.

## Room-local state

Implemented without a new global story flag:
- `mirror-anomaly-seen`;
- `bathroom-light-off`;
- `mirror-route-revealed`;
- inspected `mirror-mismatch`;
- interaction `mirror-inspected`;
- interaction `light-switch-tested`;
- interaction `mirror-route-confirmed`.

## Tasks

### W3B-T0 — Accept/close W3A — COMPLETE

Kitchen review findings were resolved:
- dead-appliance state and overhead-light presentation agree;
- overload deterministic framing points to the Breaker;
- rerouted state exposes an actionable Bathroom boundary.

W3A is accepted.

### W3B-T1 — Activate Bathroom route — COMPLETE

Production connectivity:

```text
Kitchen <-> Bathroom
```

Kitchen -> Bathroom is gated by Kitchen room-local switch `power-rerouted`. No quest/global flag was added.

### W3B-T2 — Bathroom base presentation — COMPLETE

Implemented anchors:
- Kitchen return door;
- sink/vanity;
- large central mirror;
- light fixture and switch;
- restrained domestic geometry;
- real cyan pulse stopping near the sink.

### W3B-T3 — Reflection mismatch — COMPLETE

The mirror deliberately disagrees with the real room:
- reflected cyan pulse continues beyond the real termination point;
- reflected vertical route/seam exists before the real wall adopts it;
- contrast increases after the anomaly is explicitly inspected.

This remains Bathroom-specific rendering, not reusable reflection infrastructure.

### W3B-T4 — Light-state interaction — COMPLETE

The Light Switch provides the deliberate manipulation step:
- real room darkens;
- mirror remains visibly cyan-lit;
- reflected route becomes substantially clearer.

The route cannot be solved merely by inspecting the mirror repeatedly while the real light remains on.

### W3B-T5 — Route reveal — COMPLETE

After mirror observation + light test, confirming the mirror:
- sets `mirror-route-revealed`;
- records `mirror-route-confirmed`;
- draws a corresponding cyan seam on the real right wall;
- exposes a concrete Attic boundary.

HUD endpoint:

`ATTIC ACCESS REVEALED`

### W3B-T6 — Persistence + deterministic evidence — COMPLETE

Automated coverage proves:
- Bathroom stays locked before Kitchen reroute;
- Kitchen -> Bathroom and Bathroom -> Kitchen are production transitions;
- deterministic Bathroom spawn and visited-room tracking;
- mirror observation alone cannot solve the room;
- light manipulation alone cannot solve the room;
- mirror confirmation after the light test reveals the route;
- solved state is idempotent;
- save/load preserves current Bathroom plus all reflection progression.

Repository validation passes TypeScript, automated tests, assets, and static architecture checks.

## Gate A — Dream Geometry — ACCEPTED

Accepted player path:

```text
Kitchen solved
 -> Bathroom
 -> pulse stops in reality
 -> inspect mirror mismatch
 -> turn off real light
 -> reflection stays illuminated
 -> confirm reflected route
 -> real wall reveals matching route
 -> Attic boundary exposed
```

Definition of Done:
1. Bathroom inaccessible before Kitchen power reroute. **PASS**
2. Bathroom visually distinct from Kitchen/Living Room. **PASS**
3. Mirror mismatch noticeable without relying on reaction text. **PASS**
4. Light manipulation materially strengthens the reflected clue. **PASS**
5. Progress comes from geometry, not combat/item collection. **PASS**
6. No generic portal/reflection engine. **PASS**
7. Route reveal stable and survives save/load. **PASS**
8. End state exposes concrete Attic boundary. **PASS**
9. W0–W3A regressions remain green. **PASS**
10. Focused Android evidence is legible. **PASS**

## Accepted Android evidence

W3B was accepted from the refreshed 29-screen Android tour. Focus screens:

```text
26_bathroom_arrival
27_bathroom_mirror_mismatch
28_bathroom_reflected_route
29_bathroom_route_revealed
```

Accepted reading:
- **26:** real pulse visibly stops while mirror continuation is discoverable;
- **27:** mirror mismatch becomes the focal clue;
- **28:** real room is materially dark while mirror remains illuminated;
- **29:** real-wall seam reads as concrete forward/Attic access rather than decorative glow.

The same review revalidated corrected Kitchen screens 23–25.

## Architecture checkpoint

```text
RoomRegistry
 -> Bathroom interactions
 -> AdventureExplorationRuntime generic dispatch
 -> RoomInteractionEffects
 -> Bathroom room-local state
 -> BathroomPresentation
```

Reflection remains a presentation/state feature rather than a new navigation model. Reusable dream-geometry infrastructure should only be extracted if another later room demonstrates a second concrete need.

## Closeout

W3B is closed. W4 Attic is the active wave.
