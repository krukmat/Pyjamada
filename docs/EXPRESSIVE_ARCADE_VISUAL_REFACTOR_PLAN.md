# Pyjamada — Expressive Arcade Visual Refactor Plan

## Status

- **Branch:** `feat/expressive-arcade-visual-refactor`
- **Baseline:** consolidated single-game `main` at `2d53246bec1c34458c389928691a8fc23a1dbb6c`
- **Scope:** full visual/presentation refactor, not a proof of concept
- **Gameplay semantics:** preserve the current six objects, ten ordered rules, objective conditions, resource math, persistence contract and deterministic runs unless a visual requirement exposes a genuine gameplay defect.

## 1. Direction

Pyjamada should move from restrained retro blocks toward **expressive 1990s-style arcade pixel animation**: highly readable silhouettes, strong pose language, physical comedy, exaggerated reactions, object motion and short FX bursts. The domestic setting remains cleaner and less visually dense than a run-and-gun arcade game.

Reference principle:

> **Restrained world + expressive actors + exaggerated consequences.**

The goal is not to reproduce any existing game's assets, characters, compositions or exact style. All assets must be original. The useful reference is the animation language: anticipation, impact, recoil, overshoot, settle, readable silhouettes and environmental reactivity.

## 2. Product goals

The refactor succeeds when a player can understand most state changes by watching the room before reading the explanatory text.

Primary goals:

1. Wally visually communicates `sleepy`, `normal`, `rushed` and `startled`.
2. All six systemic objects look like intentional actors, not interaction hotspots.
3. Important rules have reusable visual consequences rather than bespoke per-rule animations.
4. Time, energy and noise remain readable while textual HUD dependence is reduced.
5. Interaction feedback becomes primarily visual; prose becomes secondary flavor/debug support.
6. The entire app — game, menu, settings, success/failure and controls — belongs to one coherent arcade-pixel art direction.
7. Rendering remains deterministic enough to test and capture reliably.
8. The pure TypeScript gameplay engine remains independent of animation/render timing.

## 3. Non-goals

- Do not add rooms, progression, monetization or new gameplay systems as part of this refactor.
- Do not change rule outcomes merely to support animation.
- Do not couple React/Skia animation state into `SystemicRuntime`.
- Do not create one animation implementation per gameplay rule.
- Do not copy copyrighted sprite sheets, UI layouts or character designs.
- Do not preserve the existing PixelBlocks implementation merely for compatibility if the new pipeline makes it redundant.

## 4. Target visual architecture

```text
GameRuntime (pure TS)
      │
      ├── state transition
      └── semantic gameplay events
               │
               ▼
        VisualEventMapper
               │
       ┌───────┼─────────┐
       ▼       ▼         ▼
   ActorState ObjectState FxEvents
       │       │         │
       └───────┼─────────┘
               ▼
        PresentationRuntime
        ├── AnimationClock
        ├── WallyAnimator
        ├── ObjectAnimator
        ├── FxSystem
        └── Camera/Screen feedback
               │
               ▼
            Skia
        ├── Background
        ├── Props
        ├── Actors
        ├── FX
        └── foreground/lighting
```

### Required boundary

Gameplay continues to emit deterministic state/events. Presentation may interpolate, delay, shake, flash or sequence visual reactions, but it must not alter gameplay outcomes.

## 5. Asset/rendering strategy

The current `GameCanvas.tsx` draws most room content and Wally through rectangular `PixelBlock` arrays. That is efficient for prototyping but becomes expensive and brittle for richer character animation.

Target approach:

- Keep **Skia** as the renderer.
- Keep procedural primitives where they are advantageous: background planes, shadows, simple particles, meters and screen-space FX.
- Migrate Wally and high-expression interactive objects toward **original sprite sheets / sprite atlas entries** with nearest-neighbor rendering.
- Store sprite metadata separately from gameplay logic.
- Use explicit logical pixel dimensions and integer frame placement.
- Prefer a small number of excellent key poses over excessive frame counts.
- No smoothing/interpolation that blurs pixel edges.

Proposed structure:

```text
assets/game/
├── wally/
│   ├── wally.png
│   └── wally.atlas.json
├── objects/
│   ├── bedroom-objects.png
│   └── bedroom-objects.atlas.json
├── fx/
│   ├── domestic-fx.png
│   └── domestic-fx.atlas.json
└── ui/
    ├── icons.png
    └── ui.atlas.json

src/game/presentation/
├── AnimationClock.ts
├── AnimationTypes.ts
├── VisualEvent.ts
├── VisualEventMapper.ts
├── PresentationRuntime.ts
├── WallyAnimator.ts
├── ObjectAnimator.ts
├── FxSystem.ts
└── atlas/
    ├── SpriteAtlas.ts
    └── manifests.ts
```

Final filenames may change during implementation, but the separation of gameplay, presentation runtime and assets is mandatory.

## 6. Animation language

All actor animation should use the same grammar:

```text
anticipation → action → impact/overshoot → settle
```

Not every interaction needs all four stages, but animation timing should visibly communicate weight and cause/effect.

### Timing bands

- micro feedback: ~80–160 ms
- object reaction: ~150–350 ms
- Wally reaction: ~180–450 ms
- success/failure punctuation: ~400–900 ms

Do not make the player wait for decorative animation before continuing unless sequencing is required for clarity. Input buffering/visual interruption behavior must be explicit.

---

# Execution Plan

## AR-00 — Freeze and instrument baseline

### Tasks

- Capture the current nine-screen Android visual tour as historical baseline.
- Record current game-frame logical dimensions and viewport scaling behavior.
- Inventory current test IDs and Maestro dependencies.
- Document current Skia render tree and expensive/repeated allocations.
- Add a visual-refactor checklist to the branch docs.

### Acceptance criteria

- Current `test:all` and `typecheck` are green.
- Baseline screenshots are available locally for side-by-side comparison; they do not need to be committed.
- No gameplay change.

---

## AR-01 — Art-direction foundation

### Tasks

Define the visual constitution in code/docs:

- palette families: environment, actor skin/pajamas, interactive highlight, danger/noise, success, shadow;
- value hierarchy: background < props < interactables < Wally/FX;
- outline policy;
- highlight/shadow ramps;
- sprite logical scale;
- allowed sub-pixel behavior: none for sprite placement;
- FX grammar: shock, noise, dust, sparkle, sleep, motion streak, impact;
- UI frame language;
- minimum contrast rules for interactive objects.

Refactor `VisualLanguage.ts` into a richer token set rather than one flat palette bag.

### Acceptance criteria

- Environment can stay quiet while Wally and interactive events remain visually dominant.
- No object depends only on hue to communicate interactivity/state.
- Tokens are reusable by menu/settings/game.

---

## AR-02 — Sprite atlas and animation infrastructure

### Tasks

- Introduce atlas manifest types and frame lookup.
- Implement nearest-neighbor sprite rendering in Skia.
- Implement `AnimationClip`, frame duration and looping modes.
- Implement deterministic `AnimationClock` abstraction.
- Add fake/manual clock support for tests.
- Define actor layer ordering and anchor points (feet/ground anchor for Wally, base anchors for props).
- Support horizontal facing without duplicated gameplay assets when safe.
- Add asset-manifest validation tests: dimensions, frame names, duplicate IDs, missing clips.

### Acceptance criteria

- A sprite clip can be advanced deterministically in unit tests.
- Rendering uses integer logical coordinates.
- Atlas metadata errors fail tests rather than silently rendering nothing.
- No gameplay module imports presentation/asset modules.

---

## AR-03 — Semantic visual-event layer

The current runtime already returns gameplay events and `lastAction` deltas. Formalize a presentation mapping layer rather than reading every gameplay field directly from every renderer.

### Tasks

Create semantic visual events such as:

- `WALLY_WAKE`
- `WALLY_STARTLE`
- `WALLY_RUSH`
- `WALLY_FUMBLE`
- `OBJECT_INTERACT`
- `OBJECT_COLLECT`
- `EQUIPMENT_CHANGED`
- `WINDOW_OPENED/CLOSED`
- `NOISE_BURST`
- `ENERGY_GAIN/LOSS`
- `OBJECTIVE_SUCCESS`
- `OBJECTIVE_FAILURE`

Map reusable gameplay facts/rules to those events. Multiple gameplay rules may produce the same semantic visual event.

### Acceptance criteria

- No renderer checks rule IDs to decide bespoke animations.
- Rule IDs remain available for debug telemetry but are not the animation API.
- Mapping is unit-tested for the current efficient, near-miss and chaos runs.

---

## AR-04 — Wally complete redesign

Wally becomes the primary state-communication channel.

### Required clip families

#### Core locomotion

- `idle_sleepy`
- `idle_normal`
- `idle_rushed`
- `idle_startled`
- `walk_sleepy`
- `walk_normal`
- `walk_rushed`
- startled movement variant or additive reaction if visually superior

#### Reactions

- wake/stretch
- alarm recoil/startle
- generic fumble
- equip slippers
- wardrobe/change-clothes transition
- collect keys
- window reaction
- energy recovery/rest
- success
- failure: noise/house-awake
- failure: exhausted
- failure: too-late

### Design requirements

- Increase Wally's visual footprint enough that head, face, torso, arms, pajamas and feet read at the current logical resolution.
- Maintain clear ground anchor and collision-independent visual size.
- State must be readable from silhouette/pose even in grayscale/value terms.
- Facing changes cannot cause positional jumps.
- Avoid continuous animation noise; idle animation should feel alive, not distracting.

### Acceptance criteria

- A screenshot should make `sleepy`, `rushed` and `startled` distinguishable without the WALLY text label.
- Wally remains readable against every background region.
- Movement remains responsive while animation plays.

---

## AR-05 — Six-object complete actor pass

All six current objects receive an original sprite treatment, state variants and reactions.

### Bed

States/reactions:
- idle
- sleep/rest interaction
- blanket/pillow secondary motion
- optional sleep FX (`Z`, breath, settling)

### Slippers

States/reactions:
- floor idle
- interaction/equip burst
- disappear/empty floor state after equip or clear equipped representation
- quiet-footstep FX integration

### Alarm clock

States/reactions:
- idle
- first ring/shake
- repeated/strong ring
- red/danger escalation
- vibration/motion lines

### Wardrobe

States/reactions:
- idle closed
- opening
- clothing motion
- dressed resolution
- rushed scramble
- startled/fumble-compatible reaction

### Keys

States/reactions:
- idle/highlight
- subtle pulse independent from React timers
- collect arc/pop
- removal from world
- success punctuation when requirements complete

### Window

States/reactions:
- closed
- opening
- open
- closing
- environmental airflow/echo cues

### Acceptance criteria

- All six objects are recognizable without labels at normal viewport size.
- Object visual state matches gameplay state after restart/save restore.
- Objects reuse common animation primitives where possible.
- No `setInterval`-driven sprite pulse inside leaf React components.

---

## AR-06 — Bedroom environmental rebuild

The room is not a flat container; it becomes a readable domestic stage while remaining restrained relative to actors.

### Tasks

- Recompose bedroom perspective/layout without changing logical object interaction positions unless gameplay tests are deliberately updated.
- Add coherent wall/floor value separation.
- Add richer bed/wardrobe/window integration and contact shadows.
- Add secondary props that do not compete with gameplay objects.
- Add restrained ambient motion: curtains/light/moon/clock cues only where useful.
- Add foreground occlusion only if it improves depth without hiding interactions.
- Establish lighting/shadow consistency.
- Ensure open-window state visibly affects the environment.

### Acceptance criteria

- Player can visually scan all interactive object regions quickly.
- Background never has stronger contrast than Wally or key interaction FX.
- No decorative prop is easily mistaken for an interactable.

---

## AR-07 — FX system and physical comedy

### Reusable FX vocabulary

- shock marks
- vibration lines
- noise burst/rings
- dust/puff
- quiet footsteps
- sparkle/collect
- sleep `Z`
- motion streak
- clothing burst
- success pop
- failure/chaos burst

### Tasks

- Implement pooled/transient FX state in the presentation runtime.
- FX are triggered by semantic visual events.
- Add simple screen shake for selected high-noise moments with strict magnitude limits.
- Add flash/hit-stop only if it improves clarity and does not block input.
- Ensure FX lifetime is deterministic under fake clock.

### Acceptance criteria

- FX never mutate gameplay state.
- Near-miss and chaos runs look meaningfully different.
- Effects support causality rather than becoming constant visual noise.

---

## AR-08 — HUD and feedback redesign

The current screen exposes `TIME / ENERGY / NOISE / WALLY`, nearby-object text, reaction prose, numeric deltas and rule traces simultaneously. This is appropriate for a prototype but too diagnostic for the intended art direction.

### Tasks

- Redesign Time, Energy and Noise as compact arcade-style indicators/icons/meters.
- Remove the persistent textual `WALLY: STATE` once Wally's pose passes readability acceptance.
- Replace/soften `NEAR: OBJECT` with contextual interaction affordance where possible.
- Move rule traces behind a development/debug flag or remove from production UI.
- Reduce numeric delta prominence; show transient +/- feedback near relevant meters/actors.
- Keep reaction prose as flavor, but make it shorter and less structurally necessary.
- Design success/failure presentation as explicit visual beats rather than only text/buttons.
- Preserve accessibility/testability with stable IDs and meaningful labels.

### Acceptance criteria

- Core resources remain understandable.
- State comprehension does not depend on reading the Wally-state label.
- Screenshot composition has substantially less diagnostic text than baseline.
- Debug information remains available without contaminating default presentation.

---

## AR-09 — Controls, menu and settings visual integration

A complete art refactor must include the app shell.

### Main menu

- expressive Pyjamada title treatment;
- consistent arcade-panel/button framing;
- NEW GAME / CONTINUE / SETTINGS hierarchy;
- optional small Wally/room vignette using original assets;
- remove residual generic prototype aesthetics.

### Settings

- reuse the same tokens, icons, panel edges and pressed-state language;
- improve audio/control-layout affordances;
- retain functional simplicity.

### Touch controls

- preserve current standard/mirrored behavior;
- redesign buttons with stronger pressed/readability feedback;
- do not make controls visually compete with gameplay.

### Acceptance criteria

- Main menu, settings and gameplay look like the same game.
- Existing control layout setting continues to work.
- Menu test IDs remain stable unless Maestro is updated in the same commit.

---

## AR-10 — Presentation/runtime integration and interruption policy

### Tasks

Define how visual animation coexists with rapid input:

- which animations are interruptible;
- which are layered/additive;
- whether input is buffered during 100–300 ms reaction beats;
- how a new semantic event supersedes an older one;
- restart behavior: all presentation state resets immediately and deterministically;
- save restore behavior: transient FX are not persisted; visual state is derived from game state;
- app background/foreground behavior does not advance into impossible animation states.

### Acceptance criteria

- Mashing movement/action cannot desynchronize visuals and game state.
- Restart returns to exact baseline visual state.
- Save/continue reconstructs correct stable actor/object states without persisting animation frames.

---

## AR-11 — Performance and Skia cleanup

### Tasks

- Remove obsolete large `PixelBlock` arrays once sprite equivalents land.
- Avoid creating large arrays/functions every React render where possible.
- Cache atlas/frame metadata.
- Keep transient animation state outside gameplay state.
- Verify no per-frame React state churn is required for basic sprite animation.
- Profile Android emulator/device for obvious frame pacing regressions.
- Maintain logical 128-based world coordinates unless evidence justifies changing them.

### Gate

Target smooth visual behavior on the current Android baseline device/emulator. No refactor phase is accepted if animation richness introduces obvious control latency or sustained jank.

---

## AR-12 — Test architecture

Keep existing game semantics tests unchanged where possible.

Add tests for:

- atlas/manifest integrity;
- animation clip frame progression with fake clock;
- visual-event mapping;
- Wally stable state selection;
- object stable state selection;
- transient event expiry;
- restart clears presentation state;
- save restore derives correct presentation state;
- no gameplay module imports presentation modules.

Do not snapshot raw pixel output in unit tests unless a stable, low-maintenance mechanism exists. Android screenshot tours remain the principal visual regression evidence.

### Required gate

```bash
npm run test:all
npm run typecheck
```

must remain green throughout the branch.

---

## AR-13 — Screenshot tour redesign

The current nine-shot tour is useful but assumes textual state labels. Rewrite it around visual beats.

Target evidence set:

1. main menu
2. run start / sleepy Wally
3. bed wake transition/resolved normal state
4. slippers equipped + quiet movement cue
5. first alarm reaction
6. repeated alarm / startled state
7. wardrobe interaction / dressed state
8. keys + success presentation
9. chaos/failure visual
10. restart exact baseline
11. settings screen

Where a transient frame matters, add deterministic wait timing or a presentation debug hook rather than relying on flaky arbitrary sleeps.

### Acceptance criteria

- `npm run screenshots:android` is the only screenshot command.
- Flow proves the new visual grammar, not merely text assertions.
- Screenshots are stable enough for manual side-by-side review.

---

## AR-14 — Documentation and repository presentation

### Tasks

- Update `README.md` with new screenshots only after final visual direction stabilizes.
- Update `docs/GAMEPLAY.md` only where presentation contract changes.
- Add a concise art-direction section or dedicated `docs/ART_DIRECTION.md` distilled from this plan.
- Document asset pipeline and how to add a new animation/object state.
- Update `AGENTS.md` / `CLAUDE.md` with presentation boundaries so future agents do not leak animation concerns into gameplay logic.

### Acceptance criteria

A new developer can answer:

- where gameplay state lives;
- where visual events are derived;
- where animation state lives;
- how an atlas frame is added;
- how an object gets a new reaction;
- how to run visual regression.

---

# Work order

The expected dependency chain is:

```text
AR-00 Baseline
   ↓
AR-01 Art direction
   ↓
AR-02 Atlas/animation infrastructure
   ↓
AR-03 Semantic visual events
   ↓
AR-04 Wally redesign ────────┐
AR-05 Object actor pass ─────┼── parallel after AR-03
AR-06 Environment rebuild ───┘
   ↓
AR-07 FX system
   ↓
AR-08 HUD/feedback
   ↓
AR-09 Menu/settings/controls
   ↓
AR-10 Integration/interruption policy
   ↓
AR-11 Performance cleanup
   ↓
AR-12 Test hardening
   ↓
AR-13 Screenshot regression
   ↓
AR-14 Documentation/final polish
```

AR-10/11/12 are not strictly end-only tasks; their requirements must be enforced continuously. The diagram marks the final consolidation pass.

# Milestone gates

## Gate A — Rendering foundation

After AR-03:

- atlas + deterministic animation clock work;
- semantic visual-event boundary exists;
- gameplay tests unchanged and green.

No large-scale asset conversion should proceed if this boundary is weak.

## Gate B — Expressive room complete

After AR-07:

- Wally all four states implemented;
- all six objects implemented;
- bedroom rebuilt;
- reusable FX active;
- efficient, near-miss and chaos runs visually distinct.

This is the real visual-direction gate, not a POC gate: the entire room is expected to be complete.

## Gate C — Product integration

After AR-10:

- HUD, feedback, controls, menu and settings match the new direction;
- input interruption policy works;
- continue/restart work cleanly.

## Gate D — Release candidate

After AR-14:

- tests/typecheck green;
- Android screenshots reviewed;
- no obsolete dual rendering path remains;
- obsolete PixelBlocks are removed where superseded;
- docs describe the final architecture;
- no new gameplay scope was accidentally introduced.

# Design acceptance checklist

A final review should answer **yes** to all of these:

- Can Wally's four states be distinguished without reading a state label?
- Does every object have a recognizable silhouette and a meaningful interaction reaction?
- Does the player visually understand why noise increased?
- Does a repeated alarm look materially more dangerous than the first alarm?
- Do slippers visibly communicate quieter movement?
- Does the open window visibly change the room/environmental behavior?
- Does wardrobe interaction feel different when Wally is rushed/startled?
- Does success feel like a visual payoff?
- Does failure feel causal rather than arbitrary?
- Are background details subordinate to interactive actors?
- Is text supporting the game rather than explaining what animation failed to show?
- Does the UI still read clearly on the target Android viewport?
- Can the renderer animate without changing deterministic gameplay results?

# Implementation philosophy

This branch is authorized as a **full visual refactor**. Avoid preserving weak presentation code solely because it already exists. Preserve the gameplay model and application behavior; replace presentation architecture where that produces a cleaner, more expressive and maintainable result.

The intended end state is not “Pyjamada with more detailed PixelBlocks.” It is a coherent arcade-pixel presentation system in which **Wally, objects and consequences visibly perform the systemic game**.