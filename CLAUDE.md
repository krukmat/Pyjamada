# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with this repository.

## Project

Pyjamada is an Android-first React Native/TypeScript room-based adventure with a deliberately constrained retro visual language. It reimplements gameplay structure without distributing copyrighted Pyjamarama source assets.

Current implementation baseline is **V1.1 restrained polish / v0.8.0**. Classic V1 semantics remain CU-01 New Game, CU-02 Continue, CU-03 vertical-slice gameplay, CU-06 Settings, with CU-05 persistence as a supporting capability. A separate Systemic Bedroom Prototype explores short deterministic runs with Time/Energy/Noise/Wally-state consequences without replacing the Classic path.

## Commands

```bash
npm install
npx expo start
npx expo run:android

npm run typecheck
npm run test:v1
npm run test:systemic
npm run test:all

npm run screenshots:android
npm run screenshots:systemic:android
```

Tests use the custom harness in `tests/assert.ts` rather than Jest/Vitest. `test:*` scripts compile through `tsconfig.test.json` into `.test-dist/` and execute the generated CommonJS with Node.

CI (`.github/workflows/v1-validation.yml`) runs Classic regression, Systemic tests and TypeScript validation on `main` and `feat/**`. Android emulator smoke is separate and publishes device evidence; local screenshot tours remain the preferred visual-review workflow.

## Architecture

The repository separates game rules, presentation and persistence:

```text
React Native shell
  App.tsx / src/app/*
  MainMenu / SettingsScreen / GameScreen / SystemicGameScreen

Classic TypeScript core
  src/game/core/*
  GameState + GameRuntime + codecs

Systemic TypeScript core
  src/game/systemic/*
  deterministic resources, rules, objectives and run lifecycle

Use cases + ports
  src/game/usecases/*
  src/settings/usecases/*
  src/game/ports/*
  src/settings/ports/*

Platform adapters
  src/platform/*
  AsyncStorage repositories with separate Classic/Systemic/settings keys

Visual layer
  VisualLanguage -> PixelArtKit -> RoomScene / SystemicCanvas
  RN chrome shares RetroUiKit primitives
```

### Key invariants

- Gameplay reducers stay pure; React components do not own game rules.
- Presentation-only animation/state must never be added to persisted game state.
- Classic saves, Systemic runs and settings remain separate storage domains.
- Hitboxes and room transitions remain in the core, independent of room artwork.
- Visual changes preserve the 128×128 authored coordinate system and integer scaling.
- Classic and Systemic should share one restrained visual vocabulary: authored shade tokens, pixel shadows, key treatment and panel/control language.
- Do not use original/remake Pyjamarama sprites, maps, audio or protected artwork.

### Classic slice

`room-01` Bedroom (key -> door) -> `room-02` Hall -> `room-03` Landing (`SLICE_COMPLETED`).

### Systemic prototype

One Bedroom-based run with six interactive objects, deterministic Time/Energy/Noise resources, four Wally states, reusable rule consequences and explicit success/failure/restart outcomes. It is a product experiment, not a replacement for Classic V1.

## Visual baseline

`docs/VISUAL_BASELINE_V1_1.md` remains authoritative. The v0.8.0 restrained-polish addendum allows one explicit darker shade per major object, sparse atmosphere/floor detail, a low-cost collectible halo and contact shadows while retaining the original limited-palette/readability rules.

The UI/UX implementation rationale and scope reconciliation are documented in `docs/UI_UX_IMPLEMENTATION_REPORT.md`.

## Specs

- `docs/CU-01.md`, `CU-02.md`, `CU-03.md`, `CU-06.md`
- `docs/VISUAL_BASELINE_V1_1.md`
- `docs/SYSTEMIC_GAMEPLAY_PLAN.md`
- `docs/SYSTEMIC_GAMEPLAY_IMPLEMENTATION.md`
- `docs/UI_UX_IMPROVEMENT_PLAN.md`
- `docs/UI_UX_IMPLEMENTATION_REPORT.md`
- `docs/ANDROID_SMOKE_TEST.md`

When changing behavior, update the matching spec and test together. Presentation-only work must not create hidden gameplay semantics.
