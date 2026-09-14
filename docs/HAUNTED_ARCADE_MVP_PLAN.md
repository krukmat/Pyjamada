# Pyjamada — Haunted Arcade MVP

Status: ACTIVE
Branch: `feat/haunted-arcade-mvp`
Base: `feat/expressive-arcade-visual-refactor`

## Product thesis

Pyjamada becomes a short supernatural arcade run without losing the domestic-system identity that makes it distinctive:

> Wake up, move fast, survive the haunting, get dressed, find the keys and reach the bedroom exit before time, noise, exhaustion or monsters end the run.

Target run length: **60–90 seconds**.

The design is inspired by transferable principles from classic 80s arcade action games — pressure, readable enemies, short patterns, vulnerability, retryability — but all characters, art, layouts, monsters, weapons and rules remain original Pyjamada work.

## Non-negotiable identity

Keep:

- the six canonical domestic objects: bed, slippers, alarm-clock, wardrobe, keys, window;
- time, energy and noise as meaningful resources;
- dressed + keys as prerequisites for escape;
- deterministic/replayable gameplay;
- gameplay -> semantic event -> presentation separation;
- save/continue and deterministic restart;
- bedroom as the initial arena;
- domestic comedy as the tone.

Do not turn the MVP into a generic run-and-gun, long platformer, weapon inventory game, boss game or content-heavy roguelite.

## HA-T01 — Haunted arcade design contract

### Core loop

```text
MOVE / JUMP / ATTACK
        ->
INTERACT WITH BEDROOM
        ->
TIME / ENERGY / NOISE CONSEQUENCES
        ->
SUPERNATURAL PRESSURE
        ->
FIGHT / EVADE / REPOSITION
        ->
DRESSED + KEYS
        ->
REACH EXIT + INTERACT
```

### First vertical slice

The decision MVP contains only:

- Wally;
- the six domestic objects;
- one bedroom arena;
- Dream Spark;
- Ghost;
- 3 HP;
- real-time clock;
- noise-driven threat;
- final exit interaction.

Goblin and Skull are blocked behind the Ghost fun gate.

## HA-T02 — Pixel-art technical contract

The approved art direction is **modern 80s arcade pixel art** rather than smooth procedural character illustration.

### Frame targets

| Actor | Base frame |
|---|---:|
| Wally | 32x48 |
| Ghost | 32x40 |
| Goblin | 28x32 |
| Skull | 20x20 |
| Zombie (post-MVP) | 32x44 |
| Skeleton (post-MVP) | 28x42 |

### Shared rules

- nearest-neighbour rendering;
- no antialiasing inside actor sprites;
- 1–2 px dark outline;
- 2–3 shade levels per material;
- roughly 12–18 colors per major actor;
- explicit ground/origin/hitbox anchors in manifests;
- large readable eyes/hands/faces;
- one signature accent color per monster;
- 3–6 strong frames per action preferred over soft interpolation.

Skia remains the compositor for stage, lighting, camera, shake and selected glow/flash effects. Sprite atlases become the primary art path for Wally, monsters and complex props.

## HA-T03 — Real-time contract

Gameplay simulation uses a deterministic fixed step:

```text
simulation step: 1000 / 30 ms (30 Hz)
render: independent/device cadence
max catch-up steps per frame: 5
large foreground/background resume deltas: clamped
```

Simulation must never derive game outcomes from render frame count.

Same initial state + same RNG seed + same ordered input timeline must produce the same simulation result.

## HA-T04 — Controls contract

MVP controls:

```text
LEFT / RIGHT     held movement
JUMP             edge-triggered
ATTACK           edge-triggered Dream Spark
INTERACT         edge-triggered domestic/exit interaction
```

Attack and interact are deliberately separate. A nearby object must never steal an attack input and an enemy must never steal an interaction input.

No dodge button in the first MVP; movement + jump + knockback provide the initial evasion vocabulary.

## HA-T05 — Combat contract

### Wally

```text
HP:                 3
hit damage:         1
post-hit immunity:  900 ms
hit response:       deterministic horizontal knockback
energy:             separate from HP
```

### Dream Spark

Wally's permanent iconic weapon is a short/medium-range star-like dream-energy projectile emitted from the pajama motif.

```text
damage:                1
cooldown:               325 ms
max player projectiles: 2
noise per shot:         +1
travel:                 physical projectile, not hitscan
```

The strategic hook is intentional: firing solves immediate monster pressure but produces noise that can increase later haunting pressure.

Temporary domestic attack modifiers are deferred until after the Ghost gate.

## HA-T06 — Escape objective contract

`dressed + keys` no longer completes the run.

Objective phases:

```text
PREPARE
  -> dressed + keys
ESCAPE_READY
  -> reach bedroom exit + INTERACT
COMPLETED
```

The exit is a dedicated zone/door, not a seventh systemic object.

Failure precedence for the haunted MVP:

1. combat HP reaches 0 -> `haunted`;
2. noise threshold -> `house-awake`;
3. energy reaches 0 -> `exhausted`;
4. real-time deadline expires -> `too-late`.

Exact balance values may change after playtesting; precedence and semantics are contractual.

## Real-time domestic reinterpretation

The original ten rules remain product intent, but event/time semantics may change.

Important translations:

- walking no longer costs one logical second per tap;
- movement noise is distance/rate based;
- slippers reduce movement noise continuously;
- `rushed-threshold` derives from remaining real time;
- object `baseEffect.time` becomes a clock penalty in seconds;
- open-window noise amplification remains systemic;
- high-noise/startled behavior remains visible;
- completion is delegated to the haunted objective resolver.

Initial object time penalties remain:

| Object | Clock penalty |
|---|---:|
| Bed | +5 s |
| Slippers | +1 s |
| Alarm | +1 s |
| Wardrobe | +4 s |
| Keys | +1 s |
| Window | +2 s |

## Threat fairness contract

No enemy may spawn directly on Wally.

Initial constraints:

- spawn telegraph: 400–600 ms;
- minimum spawn distance from player;
- max total active enemies in MVP: 3;
- max active Ghosts before bestiary expansion: 2;
- seeded RNG only; no gameplay `Math.random()`;
- ThreatDirector selects bounded patterns, not arbitrary chaos.

## Ghost hard gate

Stop bestiary production after the Ghost vertical slice and evaluate a 45–60 second run.

Required questions:

- Is movement satisfying?
- Is jumping useful and readable?
- Does Dream Spark feel responsive?
- Does firing/noise create a real trade-off?
- Is Ghost pressure fair rather than annoying?
- Are domestic interactions still understandable under pressure?
- Does the player want to retry?

Do not implement Goblin/Skull production work until this gate is explicitly passed.

## Execution backlog

### Wave B — real-time kernel

- HA-T07 FixedStepClock
- HA-T08 InputState
- HA-T09 PlayerPhysics
- HA-T10 RealTimeClock
- HA-T11 DomesticRuleAdapter
- HA-T12 GameSessionRuntime

Gate: original domestic loop is playable through the new deterministic real-time session without monsters.

### Wave C — state and persistence

- HA-T13 SeededRng
- HA-T14 SessionState v2
- HA-T15 Save codec v2
- HA-T16 checkpoint/debounced persistence

Gate: deterministic continue/restart without per-tick storage writes.

### Wave D — Wally + weapon

- HA-T17 pixel Wally atlas
- HA-T18 Dream Spark gameplay
- HA-T19 Dream Spark visuals
- HA-T20 pixel interaction/combat FX

Gate: Wally run/jump/fire screenshot and short capture already read as the approved arcade style.

### Wave E — Ghost vertical slice

- HA-T21 Enemy domain
- HA-T22 collision model
- HA-T23 player damage
- HA-T24 Ghost sprite
- HA-T25 Ghost behavior
- HA-T26 spawn telegraph
- HA-T27 ThreatDirector v1
- HA-T28 noise/Ghost coupling

Gate: mandatory Ghost playtest before additional bestiary.

### Wave F — haunted domestic integration

- HA-T29 exit door
- HA-T30 escape pressure
- HA-T31 object/threat integrations
- HA-T32 noise economy rebalance

### Wave G — gated bestiary

- HA-T33 Goblin art
- HA-T34 Goblin behavior
- HA-T35 Skull art
- HA-T36 Skull behavior
- HA-T37 ThreatDirector v2

### Wave H — visual production

- HA-T38 object sprite conversion
- HA-T39 bedroom pixel pass
- HA-T40 monster FX consistency

### Wave I — performance

- HA-T41 remove React 80 ms gameplay/presentation dependency
- HA-T42 entity budgets
- HA-T43 Android profiling

### Wave J — validation

- HA-T44 deterministic simulation tests
- HA-T45 screenshot tour v2
- HA-T46 short gameplay capture
- HA-T47 haunted vertical-slice playtest

## Current delivery rule

Automated CI success proves code/test contracts only. Android rendering, frame pacing and the Ghost fun gate require explicit device/human evidence and must never be inferred from CI.
