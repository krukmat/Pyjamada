# W3B — Bathroom / Reflection Geometry

## Status

**REFINED — NOT STARTED**

W3B follows the Kitchen electrical loop but validates a different gameplay idea: the house can expose useful information through impossible spatial relationships, not only through electrical cause/effect.

No Bathroom code is implemented by this plan.

## Product goal

Bathroom should move the player from:

> I can manipulate the house.

into:

> The house is showing me space that does not exist normally.

The room must communicate its anomaly visually before explanatory text does. Kitchen review showed that world-state changes are stronger when the player can infer them directly from lighting, objects and environment rather than relying on the reaction caption.

## Player loop

```text
Kitchen power rerouted
 -> FOLLOW THE PULSE
 -> Bathroom
 -> pulse appears to stop
 -> reflection shows the pulse continuing somewhere impossible
 -> inspect/understand the mismatch
 -> manipulate one ordinary Bathroom element
 -> real room partially adopts the reflected geometry
 -> reveal the route toward Attic progression
```

The intended realization is:

> The mirror is not reflecting this room. It is showing another valid version of it.

## Chosen core mechanic

### Mirror mismatch + light-state reveal

The mirror is the primary mechanic. The light switch is the only supporting interaction needed for the first implementation.

Initial state:
- Bathroom reads as a normal small domestic room;
- the rerouted cyan pulse from Kitchen enters the room and appears to terminate;
- the mirror reflection contains a continuation of that pulse and a faint route/door seam that is absent from the real wall;
- the mismatch should be visible enough to notice without a caption explicitly saying what is wrong.

Interaction sequence:

```text
MIRROR
 -> player notices reflected route absent in reality
 -> objective becomes TEST THE REFLECTION

LIGHT SWITCH
 -> real room darkens
 -> reflected room remains unnaturally lit / cyan
 -> reflected route becomes unmistakable

MIRROR / reflected route confirmation
 -> persist mirror-route-seen
 -> real wall gains a restrained distortion/seam
 -> route toward Attic progression becomes available/revealed
```

The mirror does not become a free-form portal. Wally does not walk through arbitrary reflections.

## Why this mechanic

It extends the progression cleanly:

```text
Living Room  -> someone is observing this
Kitchen      -> I can manipulate the system
Bathroom     -> reality itself has alternate geometry
Attic        -> I learn what the experiment actually is
```

It also satisfies the project pillar:

`domestic object + supernatural distortion = gameplay`

without adding combat, inventory or another electrical puzzle.

## Lessons carried forward from Kitchen review

1. **Visual state first, caption second.**
   - The reflected pulse/route must be visible before text explains it.
   - Reaction text should confirm the player's inference, not carry the mechanic.

2. **No contradictory lighting language.**
   - If the room is described as dark/dead, the presentation must actually look dark/dead.
   - The mirror remaining illuminated when the real light is off is deliberate and must be visually obvious.

3. **Deterministic screenshots must demonstrate one state clearly.**
   - Wally should be positioned near the interaction relevant to each validation state.
   - Avoid a screenshot whose objective points to one object while the prompt highlights another unrelated one.

4. **The final hook should produce actionable progression.**
   - Unlike Kitchen Gate A's temporary `FOLLOW THE PULSE` edge, W3B should reveal a concrete route toward the Attic boundary.
   - W4 Attic interior remains out of scope, but the player should understand exactly where progression continues.

## Scope guardrails

In W3B Gate A:
- Bathroom becomes a connected room reached from the Kitchen progression path;
- a distinct Bathroom presentation;
- mirror reflection differs materially from the real room;
- one supporting light-switch interaction;
- mirror/light relationship reveals the hidden route;
- room-local state survives save/load;
- deterministic visual evidence covers before/after geometry.

Out of W3B Gate A:
- generic mirror/portal engine;
- arbitrary teleportation;
- ray-traced or physically accurate reflection system;
- inventory/key-item puzzle;
- Bathroom combat or new enemies;
- multiple faucet/toilet/shower mechanics;
- Attic interior/content;
- Vesper or W-01 explicit reveal.

## Proposed room-local state

Keep state local unless W4 proves a cross-room dependency is necessary.

Candidate switches/history:
- `mirror-anomaly-seen`;
- `bathroom-light-off`;
- `mirror-route-revealed`;
- inspected `mirror-mismatch`;
- interaction `light-switch-tested`;
- interaction `mirror-route-confirmed`.

Do not introduce a new global story flag merely to represent Bathroom completion.

## Tasks

### W3B-T0 — Accept/close W3A

Before Bathroom implementation:
- resolve the Kitchen arrival lighting contradiction;
- improve overload screenshot framing;
- accept W3A Gate A if Android evidence remains clean.

### W3B-T1 — Activate Bathroom route

Define deterministic Kitchen/Bathroom connectivity after `power-rerouted`.

The Kitchen solved state should unlock the Bathroom interaction/route through existing room-local gating rather than a new quest system.

### W3B-T2 — Bathroom base presentation

Required anchors:
- entry/return door;
- sink/vanity;
- large mirror;
- light fixture/switch;
- restrained domestic props;
- real-room pulse termination point.

The mirror must have enough visual weight to become the room's focal object without needing an overlay.

### W3B-T3 — Reflection mismatch

Render a deliberately different reflected layer/state:
- continuing cyan pulse;
- route/door seam that does not exist in real geometry;
- subtle enough to invite observation, clear enough to survive screenshot review.

This should be a Bathroom-specific presentation technique, not a reusable reflection engine yet.

### W3B-T4 — Light-state interaction

The light switch creates the decisive contrast:
- real room becomes dark;
- mirror remains lit or electrically active;
- reflected route becomes substantially clearer.

This is the player's deliberate action, preventing the Bathroom from becoming another inspect-only story room.

### W3B-T5 — Route reveal

After the player has observed/tested the anomaly:
- persist `mirror-route-revealed`;
- real wall gains a restrained distortion/seam matching the reflection;
- reveal the concrete next route toward the Attic boundary;
- do not enter or implement Attic content yet.

### W3B-T6 — Persistence + deterministic evidence

Automated coverage should prove:
- Bathroom route locked before Kitchen `power-rerouted`;
- Kitchen -> Bathroom -> Kitchen navigation;
- mirror mismatch is initially present;
- light switch changes geometry presentation state;
- route cannot be revealed accidentally before required observation/action;
- solved state is idempotent;
- save/load preserves current room and mirror progression.

## Gate A — Dream Geometry

Required player path:

```text
Kitchen solved
 -> Bathroom
 -> pulse appears to stop
 -> inspect mirror mismatch
 -> switch off real light
 -> reflected route remains visible
 -> confirm anomaly
 -> real room reveals corresponding route
 -> Attic boundary exposed
```

Definition of Done:
1. Bathroom is inaccessible before Kitchen power reroute.
2. Bathroom visually reads as distinct from Kitchen/Living Room.
3. The player can notice the mirror mismatch without relying on reaction text.
4. Light manipulation materially changes the room and strengthens the reflected clue.
5. Progress comes from interpreting geometry, not combat or item collection.
6. No generic portal/reflection engine is introduced.
7. Route reveal is stable and survives save/load.
8. The end state points to a concrete Attic boundary rather than another unexplained dead-end.
9. W0–W3A regressions remain green.
10. Focused Android screenshots make normal, mismatch and revealed-route states legible.

## Proposed deterministic evidence

Keep this small:

```text
26_bathroom_arrival
27_bathroom_mirror_mismatch
28_bathroom_reflected_route
29_bathroom_route_revealed
```

Exact numbering is provisional until W3A screenshot closeout is final.

## Architecture checkpoint

Reuse the existing seams:

```text
RoomRegistry
 -> Bathroom interactions
 -> RoomInteractionEffects
 -> Bathroom room-local state
 -> BathroomPresentation
```

The reflection is a presentation/state feature, not a new navigation model. Only extract reusable dream-geometry infrastructure if a later room demonstrates a second concrete need.

## W3B acceptance question

At the end of the wave the player should be able to answer, through play rather than exposition:

> Why did the pulse disappear in the real room but continue in the mirror?

The useful answer is not lore yet. It is mechanical:

> Because the reflection exposes a version of the house that the normal room is hiding.
