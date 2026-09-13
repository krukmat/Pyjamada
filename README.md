# Pyjamada

**A tiny domestic adventure where getting ready in the morning can become a complete disaster.**

Pyjamada is an Android-first React Native game experiment built around a deliberately small systemic sandbox. Wally needs to get dressed and find his keys, but every action costs **time**, **energy** or **noise** — and simple objects can combine into surprisingly bad decisions.

Six objects. Ten deterministic rules. One bedroom. No game engine hiding the interesting parts.

```text
move → interact → consequence → adapt → succeed / fail → retry
```

## Why this repo exists

Pyjamada is also a compact game-architecture playground:

- **React Native owns the app shell.**
- **TypeScript owns deterministic gameplay.**
- **A semantic presentation layer owns transient reactions.**
- **Skia owns the illustrated gameplay renderer.**
- **AsyncStorage owns persistence.**
- **Maestro owns the Android visual tour.**

The goal is to see how much emergent gameplay and visual causality can come from a very small deterministic model before adding more rooms, progression or monetization.

## The current game

The bedroom contains six interactive objects:

`bed · slippers · alarm clock · wardrobe · keys · window`

Wally can be `sleepy`, `normal`, `rushed` or `startled`. Ten ordered rules connect those states with object interactions and movement, producing efficient escapes, near misses and full domestic chaos.

> **Get dressed + find the keys before the house wakes up, Wally runs out of energy, or time runs out.**

There is one active gameplay path and one save model.

## Modern 80s arcade presentation

The active gameplay direction is **arcade-first, Wonder-Boy-flavored and modernized for mobile**. It borrows transferable principles — immediate readability, strong silhouettes, horizontal stage rhythm, warm color, layered depth and expressive consequences — without copying any existing game's characters, layouts, art, sprites or UI.

The current visual principle is:

> **Charming layered world + expressive actors + exaggerated consequences.**

Wally, the six gameplay objects and semantic FX are now drawn as original procedural Skia illustration. `WallyAnimator`, `ObjectAnimator`, `FxSystem` and the existing clip manifests still provide deterministic semantic selection and timing; the historical PNG atlases remain validated assets/contracts but are no longer the primary gameplay artwork.

The gameplay viewport is a presentation-only panoramic stage. Logical gameplay coordinates, hit radii, rules and persistence remain unchanged.

## Architecture

```text
                         PYJAMADA
                            │
                    React Native shell
                            │
             ┌──────────────┼──────────────┐
             ▼              ▼              ▼
         MainMenu      SettingsScreen   GameScreen
                                           │
                                           ▼
                                    SystemicRuntime
                                      pure TypeScript
                                           │
                                  completed state/update
                                           │
                                           ▼
                                    VisualEventMapper
                                           │
                                           ▼
                                  PresentationRuntime
                              ┌────────────┼────────────┐
                              ▼            ▼            ▼
                        WallyAnimator ObjectAnimator  FxSystem
                              └────────────┼────────────┘
                                           ▼
                                  presentation clip/frame
                                           │
                                           ▼
                                     GameCanvas / Skia
                              ┌────────────┼─────────────┐
                              ▼            ▼             ▼
                       illustrated Wally  objects   semantic FX
                              │            │             │
                              └────────────┼─────────────┘
                                           ▼
                         layered bedroom + lighting + camera

Persistence stores gameplay state only; transient presentation is rebuilt from state/events.
```

The `systemic` folder describes the gameplay architecture; it is not a second game mode.

## Stack

- React Native 0.86 + Expo 57
- TypeScript
- React Native Skia 2.6
- React Native Reanimated 4.5
- AsyncStorage
- Maestro
- Android-first development

## Run it

Requirements: Node.js `>=22.13`, Android tooling and Java 17.

```bash
npm install
npm run android
```

For the Expo development server separately:

```bash
npm start
```

## Validate it

Normal validation:

```bash
npm run test:all
npm run typecheck
```

Pre-merge/audit evidence package:

```bash
npm run audit:premerge
```

That command adds strict PNG validation plus static architecture checks for the gameplay→presentation boundary, legacy-renderer removal and screenshot-tour contract.

## Generate the Android visual tour

With an Android emulator running and Maestro installed:

```bash
npm run screenshots:android
```

If the release APK is already built:

```bash
SKIP_BUILD=1 npm run screenshots:android
```

The tour writes fourteen local checkpoints to:

```text
artifacts/android-screenshots/
```

It covers the main menu and settings, sleepy run start, bed/slippers/alarm/wardrobe interactions, success and restart, restored continue state, and the `HOUSE AWAKE!`, `OUT OF ENERGY!` and `TOO LATE!` failure outcomes.

The generated local files are ignored evidence; rerun the command whenever the renderer changes. The GitHub execution environment does **not** claim to have performed Android visual review or performance profiling.

A curated six-shot gallery is checked in under `docs/screenshots/`, selected from the latest generated tour to show the game's strongest beats without repeating near-identical states. It remains a visual checkpoint: after a substantial renderer change, run the tour again before making aesthetic or performance claims about the new code.

### A morning in Pyjamada

From the mission briefing to a barely controlled escape, the room turns every small choice into a visible consequence.

<p align="center">
  <img src="docs/screenshots/01_main_menu.png" alt="Pyjamada main menu and morning mission" width="30%" />
  <img src="docs/screenshots/03_run_start_sleepy.png" alt="Wally starting the morning sleepy in the bedroom" width="30%" />
  <img src="docs/screenshots/07_startled.png" alt="Wally startled after making too much noise with the alarm" width="30%" />
</p>
<p align="center"><sub>Pick the mission · Wake up in the bedroom · Discover that noise has consequences</sub></p>

<p align="center">
  <img src="docs/screenshots/08_wardrobe_fumble.png" alt="Wally dressed after a clumsy wardrobe interaction" width="30%" />
  <img src="docs/screenshots/09_success.png" alt="Successful Pyjamada run with clothes and keys" width="30%" />
  <img src="docs/screenshots/12_fail_house_awake.png" alt="Failed Pyjamada run after waking the house" width="30%" />
</p>
<p align="center"><sub>Get dressed, coordination optional · Find the clean route · Or wake the whole house</sub></p>

## Useful entry points

```text
App.tsx                                  application composition + navigation
src/app/GameScreen.tsx                   minimal gameplay HUD, feedback and controls
src/game/systemic/                       deterministic gameplay domain
src/game/presentation/                   visual events, runtime and semantic animators
src/game/presentation/atlas/             clip/frame manifests + legacy asset contracts
src/game/render/GameCanvas.tsx            gameplay-stage composition
src/game/render/IllustratedWally.tsx      original procedural Wally renderer
src/game/render/WallyArcadeMotion.ts      anticipation/impact/recovery key poses
src/game/render/IllustratedObject.tsx     six procedural interactive-object renderers
src/game/render/IllustratedFx.tsx         semantic modern-arcade FX renderer
src/game/render/IllustratedBedroomScene.tsx layered bedroom/stage composition
src/game/render/ArcadeStageLighting.tsx   hero-first light/value hierarchy
src/game/render/StageViewport.ts          presentation-only projection + camera
assets/game/                              validated historical atlas assets/contracts
src/platform/storage/                    gameplay persistence
maestro/screenshots.yaml                 fourteen-step Android visual journey
artifacts/android-screenshots/            generated local Android screenshot evidence
docs/screenshots/                         versioned Android visual checkpoint
tests/game.test.ts                        gameplay coverage
tests/presentation.test.ts                presentation/restore/manifest coverage
docs/workflow/AGENT_WORKFLOW_GUIDE.md     AI task workflow, RRI/HITL and model routing
scripts/audit-static.sh                   architecture invariants
```

## Audit status

The visual refactor is maintained on `feat/expressive-arcade-visual-refactor` until team audit disposition. Start with:

- `docs/AUDIT_READINESS.md`
- `docs/AUDIT_REVIEW_GUIDE.md`
- `docs/VISUAL_REFACTOR_INCIDENTS.md`
- `docs/PERFORMANCE_REVIEW_NOTES.md`
- `docs/WONDER_BOY_VISUAL_REWORK_PLAN.md`

CI success is necessary but not sufficient for merge approval. Android visual quality, the known presentation-cadence question around the React 80 ms ticker, and the human gameplay/fun gate require explicit external disposition.

## Current scope

Pyjamada is intentionally small. The current question is not **“how much content can we add?”** but **“does this tiny room make players curious enough to experiment and retry?”**

The next product-expansion gate remains human playtesting: objective comprehension, understandable cause/effect, at least one unexpected-but-logical consequence, and voluntary retry.

See `docs/GAMEPLAY.md` for the gameplay contract and `docs/ANDROID_SMOKE_TEST.md` for device validation.
