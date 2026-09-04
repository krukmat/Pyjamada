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
- **Skia owns rendering and sprite atlases.**
- **AsyncStorage owns persistence.**
- **Maestro owns the Android visual tour.**

The goal is to see how much emergent gameplay and visual causality can come from a very small deterministic model before adding more rooms, progression or monetization.

## The current game

The bedroom contains six interactive objects:

`bed · slippers · alarm clock · wardrobe · keys · window`

Wally can be `sleepy`, `normal`, `rushed` or `startled`. Ten ordered rules connect those states with object interactions and movement, producing efficient escapes, near misses and full domestic chaos.

> **Get dressed + find the keys before the house wakes up, Wally runs out of energy, or time runs out.**

There is one active gameplay path and one save model.

## Expressive arcade presentation

The active visual direction uses original arcade-inspired pixel assets without copying any existing game's characters, sprite sheets or compositions. The design principle is:

> **Restrained world + expressive actors + exaggerated consequences.**

Wally, all six objects and reusable domestic FX are rendered from sprite atlases with deterministic animation clips. Gameplay does not wait for decorative animation and presentation state is never persisted.

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
                                     GameCanvas / Skia
                                           │
                                    sprite atlases +
                                  procedural environment

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

That command adds static architecture checks for the gameplay→presentation boundary, legacy-renderer removal and screenshot-tour contract.

## Generate the Android visual tour

With an Android emulator running and Maestro installed:

```bash
npm run screenshots:android
```

If the release APK is already built:

```bash
SKIP_BUILD=1 npm run screenshots:android
```

The prepared expressive-arcade tour writes eleven checkpoints to:

```text
artifacts/android-screenshots/
```

The GitHub execution environment does **not** claim to have performed the visual review; screenshots/device performance remain local audit evidence.

## Useful entry points

```text
App.tsx                                  application composition + navigation
src/app/GameScreen.tsx                   HUD, feedback, controls + presentation cadence
src/game/systemic/                       deterministic gameplay domain
src/game/presentation/                   visual events, runtime, animators and FX
src/game/presentation/atlas/             atlas contracts/manifests/renderer
src/game/render/GameCanvas.tsx            Skia room composition
assets/game/                              original Wally/object/FX sprite sheets
src/platform/storage/                    game persistence
maestro/screenshots.yaml                 eleven-step Android visual journey
tests/game.test.ts                        gameplay coverage
tests/presentation.test.ts                presentation/restore/atlas coverage
docs/workflow/AGENT_WORKFLOW_GUIDE.md     AI task workflow, RRI/HITL and model routing
scripts/rri.mjs                           deterministic RRI v2 calculator
scripts/sync-agent-instructions.mjs       Codex/Claude startup instruction projection
scripts/audit-static.sh                   architecture invariants
```

## Audit status

The expressive arcade refactor is maintained on `feat/expressive-arcade-visual-refactor` until team audit disposition. Start with:

- `docs/AUDIT_READINESS.md`
- `docs/AUDIT_REVIEW_GUIDE.md`
- `docs/VISUAL_REFACTOR_INCIDENTS.md`
- `docs/PERFORMANCE_REVIEW_NOTES.md`

CI success is necessary but not sufficient for merge approval; Android visual quality and the known presentation-cadence performance question require explicit human disposition.

## Current scope

Pyjamada is intentionally small. The current question is not **“how much content can we add?”** but **“does this tiny room make players curious enough to experiment and retry?”**

The next product-expansion gate remains human playtesting: objective comprehension, understandable cause/effect, at least one unexpected-but-logical consequence, and voluntary retry.

See `docs/GAMEPLAY.md` for the gameplay contract and `docs/ANDROID_SMOKE_TEST.md` for device validation.
