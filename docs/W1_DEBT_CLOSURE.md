# W1 — High/Medium Debt Closure

## Scope

This checkpoint pays the High and Medium debts identified after W1 visual acceptance without opening W2 content.

It deliberately does **not** polish the Hallway, alter the false-escape cinematic, add audio, change the altered Bedroom art, or start the Living Room.

## Closed debts

### HIGH — Adventure progression leaked into `HauntedObjectivePhase`

**Status: CLOSED**

`HauntedObjectivePhase` is again limited to the Haunted Bedroom slice:

```text
prepare
escape-ready
completed
failed
```

The false escape no longer changes the Haunted objective to an `exploration` phase. Haunted remains `completed`; Adventure state owns the fact that the player has moved into house exploration through `bedroomEscapeAttempted` and room/story state.

Rendering explicitly suppresses the Haunted terminal victory pose while Adventure exploration is active, so the completed Haunted slice can coexist with normal Wally movement in the house.

Legacy W1 saves that contain the temporary Haunted `exploration` phase are migrated to Haunted `completed` when decoded rather than being silently invalidated.

### HIGH — Haunted HUD remained visible during exploration

**Status: CLOSED**

The screen now has context-aware presentation:

- Haunted Bedroom gameplay shows TIME, HP, ENERGY and NOISE.
- House exploration shows the room/objective presentation without stale/frozen Haunted meters.

This keeps the HUD aligned with the systems that are actually active.

### HIGH — ATTACK was visible but inactive during exploration

**Status: CLOSED**

During house exploration:

- ATTACK is not rendered.
- application input also rejects an Adventure-mode attack action defensively.
- movement, jump and INTERACT remain active.

The control surface therefore no longer advertises a mechanic that the exploration runtime does not execute.

### MEDIUM — W1 interactions were hard-coded inside `AdventureExplorationRuntime`

**Status: CLOSED**

Interaction geometry and behavior declarations now live with room content in `RoomRegistry` / `RoomDefinition`.

A room owns:

```text
entries
exits
interactions
```

W1 interactions are declarative definitions for:

- Bedroom -> Hallway door;
- Hallway -> Bedroom door;
- backward clock;
- Living Room boundary.

`AdventureExplorationRuntime` now resolves the current room interaction and executes its declared exit/effect rather than maintaining a second list of interaction coordinates and IDs.

### MEDIUM — Connectivity and interactions could diverge

**Status: CLOSED**

Door interactions that represent navigation refer to a registered `exitId` instead of duplicating target room/entry information.

Availability is resolved through the same room definition:

- exit story requirements are checked by the registered exit;
- local room-switch requirements are checked by the interaction definition;
- unavailable labels such as `SEALED DOOR` come from room content rather than UI-specific ID checks.

This creates a small W2-ready seam without introducing a generic quest or scripting engine.

## Compatibility

The top-level adventure save schema remains v3 and Adventure state remains v1.

The removed Haunted `exploration` phase was an internal W1 coupling rather than a new durable domain state. Decoder migration maps existing Haunted v2 payloads with:

```text
objective.phase = exploration
```

to:

```text
objective.phase = completed
```

Adventure flags/room persistence continue to determine whether the player is actually exploring the house.

## Automated gate

Repository validation after the debt closure passes:

- PNG asset validation;
- game/settings/presentation tests;
- TypeScript typecheck;
- static architecture audit.

W1 end-to-end tests continue to prove:

```text
Bedroom exit
-> false escape
-> altered Bedroom
-> Hallway
-> backward clock
-> Living Room threshold
-> save/load
```

with Haunted remaining terminal and Adventure owning progression.

## Remaining Medium validation debt

### Full touch/game-feel playthrough

**Status: MANUAL GATE — OPEN**

This cannot be honestly closed by repository tests or static screenshots.

Run W1 on Android and verify in one continuous playthrough:

1. false escape feels understandable rather than like a restart;
2. movement and jump remain responsive after the false escape;
3. ATTACK disappears when exploration starts;
4. stale TIME/HP/ENERGY/NOISE information is not shown in Hallway exploration;
5. Bedroom -> Hallway fade/input lock feels clean;
6. clock inspection and Living Room unlock are discoverable without accidental interaction;
7. Hallway -> Bedroom -> Hallway round trip remains natural;
8. Continue/save restores the same exploration state.

This manual gate does not block W1 code quality, but it should be checked before W2 grows enough to make interaction-feel regressions expensive.

## Deferred low-severity polish

Still deliberately deferred:

- wording leak around `THE SIGNAL CONTINUES BEYOND THIS DOOR`;
- stronger visual differentiation for altered Bedroom;
- additional Hallway environmental density;
- richer false-escape cinematic/audio treatment.

These are not architectural prerequisites for W2.
