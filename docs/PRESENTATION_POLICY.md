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

## Invariants

1. Presentation cannot alter time, energy, noise, inventory, Wally gameplay state or objective state.
2. Rapid input cannot leave stable visuals inconsistent with gameplay state.
3. Restart and continue reconstruct visuals without persisted transient data.
4. Rule IDs terminate at `VisualEventMapper`; animation code consumes semantic events.
5. Original sprite assets and atlas manifests are replaceable without gameplay changes.
