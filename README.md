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
- **TypeScript owns the game rules and state.**
- **Skia owns the pixels.**
- **AsyncStorage owns persistence.**
- **Maestro owns the Android visual tour.**

The goal is to see how much emergent gameplay can come from a very small deterministic model before adding more rooms, progression or monetization.

## The current game

The bedroom contains six interactive objects:

`bed · slippers · alarm clock · wardrobe · keys · window`

Wally can be `sleepy`, `normal`, `rushed` or `startled`. Ten ordered rules connect those states with object interactions and movement, producing different routes through the same room: efficient escapes, near misses and full domestic chaos.

The objective is simple:

> **Get dressed + find the keys before the house wakes up, Wally runs out of energy, or time runs out.**

There is one active gameplay path and one save model.

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
                              input ────────┼──────── render
                                           │
                         ┌─────────────────┴─────────────────┐
                         ▼                                   ▼
                 SystemicRuntime                         GameCanvas
                  pure TypeScript                           Skia
                         │
              ┌──────────┼──────────┐
              ▼          ▼          ▼
           Objects      Rules    Objectives
              └──────────┼──────────┘
                         ▼
                       State
                         │
                 ┌───────┴────────┐
                 ▼                ▼
             Persistence       Telemetry
```

The `systemic` folder describes the architecture of the gameplay engine; it is not a separate game mode.

## Stack

- React Native 0.86 + Expo 57
- TypeScript
- React Native Skia
- AsyncStorage
- Maestro
- Android-first development

Gameplay logic is UI-independent and deterministic, which keeps the interesting behavior testable without rendering a frame.

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

```bash
npm run test:all
npm run typecheck
```

The test suite covers the game rules, object interactions, success / near-miss / chaos paths, restart behavior, persistence validation, telemetry and settings.

## Generate the Android visual tour

With an Android emulator running and Maestro installed:

```bash
npm run screenshots:android
```

If the release APK is already built:

```bash
SKIP_BUILD=1 npm run screenshots:android
```

The tour exercises the real game flow and writes its screenshots to:

```text
artifacts/android-screenshots/
```

## Useful entry points

```text
App.tsx                         application composition + navigation
src/app/GameScreen.tsx          HUD, feedback and touch controls
src/game/systemic/              state, objects, rules, runtime and telemetry
src/game/render/GameCanvas.tsx  Skia bedroom renderer
src/platform/storage/           game persistence
src/settings/                   settings domain
maestro/screenshots.yaml        Android screenshot journey
tests/game.test.ts              deterministic gameplay coverage
```

## Current scope

Pyjamada is intentionally small. The current question is not **“how much content can we add?”** but **“does this tiny room make players curious enough to experiment and retry?”**

The next expansion gate is human playtesting: objective comprehension, understandable cause/effect, at least one unexpected-but-logical consequence, and voluntary retry.

See [`docs/GAMEPLAY.md`](docs/GAMEPLAY.md) for the active gameplay contract and [`docs/ANDROID_SMOKE_TEST.md`](docs/ANDROID_SMOKE_TEST.md) for device validation.
