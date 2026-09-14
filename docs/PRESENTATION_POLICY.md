# Presentation Runtime Policy

This document defines the AR-10 contract between deterministic gameplay and transient arcade presentation.

## Boundary

`SystemicRuntime` owns gameplay truth. `VisualEventMapper` converts completed gameplay updates into semantic presentation events. `PresentationRuntime` owns transient visual state only. Renderers never mutate gameplay state and never interpret rule IDs directly.

## Input and interruption

Gameplay input is never blocked for decorative animation. A new input is applied immediately to the current gameplay state.

Presentation uses channels to resolve visual interruption:

- Wally actor reactions share `actor:wally`; a newer actor event supersedes the older actor beat.
- Object reactions use `object:<id>`; a newer reaction for the same object supersedes the previous one.
- Objective success/failure uses a dedicated objective channel and visually outranks ordinary Wally reactions in the animator.
- Energy feedback uses one resource channel.
- Noise bursts remain additive so rapid noisy actions can create layered physical-comedy feedback.
- Short FX are derived from semantic events and expire deterministically.

There is no gameplay input queue and no animation frame is persisted.

## Restart

`RUN_RESTARTED` maps to `PRESENTATION_RESET`. The presentation runtime immediately clears all active reactions, FX and sequence state. Stable Wally/object visuals are then re-derived from the restarted gameplay state.

## New game and continue

Starting or continuing a run explicitly resets transient presentation state. Stable visuals are selected entirely from the loaded gameplay state:

- Wally idle comes from `wallyState`.
- slippers derive from `equipped`.
- keys derive from `collected`.
- wardrobe derives from `flags.dressed`.
- window derives from `flags.windowOpen`.

This keeps the save format free of animation timestamps, clip IDs or frame indexes.

## Background / foreground

Transient events use wall-clock expiry. If the app spends longer than an event lifetime in the background, the event naturally expires and the renderer returns to stable state when foregrounded. Gameplay itself does not advance because presentation time has advanced.

## Animation cadence

At Gate C the game uses one low-frequency screen-level ticker to refresh presentation frames. Leaf sprites contain no timers and gameplay state contains no animation clocks. This is tracked as `INC-004`; AR-11 must profile or replace the ticker before Gate D.

## F-01: visual origin contract

`VisualOrigin` (`src/game/presentation/VisualEvent.ts`) is a presentation-only
`{ x, y }` point. It is captured exactly once, by `VisualEventMapper`, from
the specific gameplay update that produced the event — never recomputed later
from whatever the runtime's current/latest state happens to be when an FX
actually renders. This is what prevents a queued reaction from silently
"teleporting" to a different object if further input arrives before it plays.

There are exactly two ways an origin is resolved, and every origin-carrying
event uses exactly one of them:

- **Fixed object origin** — `OBJECT_VISUAL_ORIGINS[objectId]`, a static table
  of the six object anchor points. Used when the event is inherently about
  one named object.
- **Action origin** — `actionOrigin(after)`: the object this exact action
  targeted (`after.lastAction.objectId`) if there was one, otherwise the
  player's own position (`{ x: after.player.x, y: 88 }`) for an untargeted
  action such as a move. Used when the event is about the actor or a
  resource/objective consequence of the actor's last action, not a specific
  object.

| Visual event | Origin rule | Source |
|---|---|---|
| `WALLY_MOVE` | Action origin | player position (untargeted) |
| `WALLY_STARTLE` | Action origin | last action's object, or player position |
| `WALLY_RUSH` | Action origin | last action's object, or player position |
| `WALLY_FUMBLE` | Action origin | last action's object, or player position |
| `NOISE_BURST` | Action origin | last action's object, or player position |
| `ENERGY_GAIN` | Action origin | last action's object, or player position |
| `OBJECTIVE_SUCCESS` | Action origin | last action's object, or player position |
| `OBJECTIVE_FAILURE` | Action origin | last action's object, or player position |
| `OBJECT_INTERACT` | Fixed object origin | the interacted object's anchor |
| `OBJECT_COLLECT` | Fixed object origin | the collected object's anchor |
| `EQUIPMENT_CHANGED` | Fixed object origin | the equipped object's anchor |
| `WINDOW_OPENED` / `WINDOW_CLOSED` | Fixed object origin | the window anchor |
| `WALLY_WAKE`, `WALLY_REACT`, `PRESENTATION_RESET` | No origin (not FX-positioned) | n/a |

Every event that carries FX (`FxSystem.originFor`) resolves through one of
these two rules with no default/fallback case for an origin-carrying event —
`FxSystem`'s catch-all `{ x: 0, y: 88 }` branch only serves the
non-origin-carrying event types listed above, which never request an FX
position in the first place. This is the single unambiguous origin rule per
event family required by F-01; F-02 adds regression coverage against
cross-object actions, successive movement, and restart re-deriving these
origins incorrectly.

## Invariants

1. Presentation cannot alter time, energy, noise, inventory, Wally gameplay state or objective state.
2. Rapid input cannot leave stable visuals inconsistent with gameplay state.
3. Restart and continue reconstruct visuals without persisted transient data.
4. Rule IDs terminate at `VisualEventMapper`; animation code consumes semantic events.
5. Original sprite assets and atlas manifests are replaceable without gameplay changes.
