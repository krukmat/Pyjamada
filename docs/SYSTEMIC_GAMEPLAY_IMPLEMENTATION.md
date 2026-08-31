# Systemic Bedroom Prototype — Implementation Notes

Branch: `feat/systemic-room-prototype`  
Target release: `v0.7.0`  
Plan: [`SYSTEMIC_GAMEPLAY_PLAN.md`](SYSTEMIC_GAMEPLAY_PLAN.md)

## Status

The technical implementation for the **Systemic Room Prototype** covers the approved work through SG-13 and prepares SG-14. The external human fun gate is intentionally **not claimed as passed**.

Classic V1.1 remains available as a separate regression path. The systemic experiment is exposed independently from the main menu and uses a separate persistence key.

## Implemented product slice

The systemic prototype keeps the same deliberately small input vocabulary:

- move left;
- move right;
- interact.

The Bedroom contains six shared objects:

1. Bed
2. Slippers
3. Alarm clock
4. Wardrobe
5. Keys
6. Window

The run objective is:

> **Get dressed and find the keys before Wally's morning routine collapses into noise, delay or exhaustion.**

The prototype uses four deterministic gameplay dimensions:

- logical time;
- energy;
- noise;
- Wally state (`sleepy`, `normal`, `rushed`, `startled`).

There is no fixed-step physics loop. Every result is reproducible from the same state and input sequence.

## Architecture delivered

```text
React Native shell
      |
      +-- Classic V1.1 ------------------------------+
      |                                              |
      |   GameRuntime -> GameState -> V1 save        |
      |                                              |
      +-- Systemic Prototype ------------------------+
          |
          +-- SystemicRuntime
          |     +-- SystemicContent (6 objects)
          |     +-- SystemicRuleEngine (10 rules)
          |     +-- Objective / run lifecycle
          |     +-- deterministic restart
          |
          +-- SystemicCanvas / SystemicGameScreen
          |
          +-- SystemicRunPort
          |     +-- AsyncStorageSystemicRunRepository
          |
          +-- SystemicTelemetryPort
```

The systemic save key is isolated as:

```text
pyjamada:systemic:v1:run
```

The existing Classic V1 save format and key are not migrated or overwritten by the prototype.

## Rule model

The implementation currently contains ten ordered rules:

1. `sleepy-action-tax`
2. `slippers-quiet-step`
3. `bed-wakes-wally`
4. `alarm-wakes-wally`
5. `repeated-alarm-startle`
6. `open-window-echo`
7. `rushed-threshold`
8. `startled-fumble`
9. `rushed-wardrobe-scramble`
10. `high-noise-startle`

Rules execute once per input in deterministic priority order. They do not recursively trigger themselves. The runtime returns an inspectable rule trace so tests and prototype UI can explain why an outcome occurred.

The important design constraint is that generic conditions own consequences. Wally, resources and environmental state interact without embedding a scripted branch for each desired scene.

## Canonical validation scenarios

### 1. Efficient success

A quiet route demonstrates that the room can be solved intentionally:

```text
Bed -> Slippers -> Wardrobe -> Keys -> SUCCESS
```

Expected characteristics:

- Wally transitions out of `sleepy`;
- slippers reduce movement noise;
- Wally gets dressed;
- keys complete the objective;
- final noise remains comparatively low.

### 2. Near miss

Repeatedly using the alarm puts Wally into `startled`, making subsequent interactions more expensive and noisy. The causal trace explains the failure rather than presenting an arbitrary fail state.

Expected player takeaway:

> "The alarm worked, but hitting it again made the rest of the routine much harder."

### 3. Chaos run

Opening the window and then generating noise demonstrates an environmental modifier: noisy interactions propagate extra noise while the window is open. Repeated alarm use can then cascade into a house-awake failure.

Expected player takeaway:

> "That was avoidable, but the consequences made sense."

## Presentation / Wally reaction layer

The presentation layer makes systemic state legible without owning gameplay rules:

- compact Time / Energy / Noise HUD;
- current Wally state;
- nearest interactable object;
- immediate resource deltas;
- short Wally reaction copy;
- diagnostic rule trace;
- state-dependent Wally colour during the prototype;
- visible object-state changes where practical.

Removing the reaction copy or visual treatment does not change simulation results.

## Telemetry boundary

`SystemicTelemetryPort` keeps prototype measurement independent from Firebase, Google Analytics or any external SDK.

The current local telemetry model can record:

- run start;
- inputs;
- object interactions;
- rule triggers;
- run completion;
- run failure;
- retries.

This is deliberately sufficient for prototype diagnosis without introducing a backend or production analytics dependency.

## Automated validation

Run:

```bash
npm run typecheck
npm run test:v1
npm run test:systemic
```

Or:

```bash
npm run test:all
```

The V1 regression suite and systemic suite are intentionally separate CI steps.

### Android / Maestro

The systemic Android flow is:

```bash
maestro test maestro/systemic.yaml
```

It validates:

```text
Menu
 -> Systemic Prototype
 -> deterministic noisy failure
 -> TRY AGAIN
 -> clean run restart
 -> Menu
```

The flow also captures reproducible screenshots for run start, noise failure and restarted state.

## SG-14 — Human playtest protocol

This gate must be performed with people interacting with the build. Do not explain the mechanics before observing the first run.

| Signal | What to observe |
| --- | --- |
| Objective comprehension | Does the player understand "get dressed + find keys" quickly? |
| First curiosity action | What object do they voluntarily investigate first? |
| Causality | Can they explain why a major consequence occurred? |
| Surprise | Did an interaction produce an unexpected but logical result? |
| Voluntary retry | Do they press Try Again without prompting? |
| Next hypothesis | Can they name a concrete different strategy or object interaction they want to try? |

### Fun gate

The prototype is allowed to expand only when manual observation supports all four statements:

1. the objective is understood without a long tutorial;
2. cause and effect are understood;
3. at least one surprising but logical consequence is discovered;
4. the player wants an immediate retry or can state a specific next experiment.

If this gate fails, change rules, balancing or feedback **before adding another room**.

## Deliberately not claimed

The implementation does **not** claim that the gameplay hypothesis has already succeeded commercially or that retention has been demonstrated. Automated tests can prove determinism, architecture and scenario coverage; they cannot prove that a person finds the loop fun.

Therefore the following remain blocked until SG-14 produces evidence:

- Bathroom / second-room expansion;
- broader content production;
- persistent discovery notebook;
- cosmetic progression;
- external analytics SDKs;
- monetization;
- live operations;
- iOS.

## Next decision

After CI and Android validation are green, install the prototype build and perform the SG-14 protocol. The next product decision should be based on observed retry/curiosity behaviour, not on additional implementation volume.
