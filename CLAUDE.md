# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Pyjamada is an Android-first React Native/TypeScript project: a room-based adventure game with a deliberately constrained retro visual language. It reimplements gameplay structure without distributing copyrighted Pyjamarama source assets. Current baseline is **V1.1 / v0.6.0** — a visual fidelity pass on top of an unchanged functional V1 (CU-01 New Game, CU-02 Continue, CU-03 vertical-slice gameplay, CU-06 Settings, CU-05 persistence as a supporting capability).

## Commands

```bash
npm install
npx expo start          # dev server
npx expo run:android    # native Android build

npm run typecheck       # tsc --noEmit against tsconfig.json

npm run test:cu01
npm run test:cu02
npm run test:cu03
npm run test:cu06
npm run test:integration
npm run test:visual
npm run test:v1          # runs all of the above in sequence
```

There is no test runner framework — each `test:*` script compiles via `tsconfig.test.json` into `.test-dist/` (CommonJS) and runs the resulting JS directly with `node`. To run a single test file directly after a build:

```bash
rm -rf .test-dist && tsc -p tsconfig.test.json && node .test-dist/tests/cu01.test.js
```

Tests use a minimal custom harness (`tests/assert.ts`: `test`, `equal`, `deepEqual`) — not Jest/Vitest. Each test file's `run()` is invoked at the bottom of the file and exits non-zero on failure.

CI (`.github/workflows/v1-validation.yml`) runs `npm run test:v1` + `npm run typecheck` on push/PR to `main` and `feat/**`. A separate workflow (`.github/workflows/android-emulator-smoke.yml`) builds a release APK and runs it on a Pixel 6 / API 35 emulator, publishing screenshot/logcat evidence as CI artifacts (not a release channel).

## Architecture

The codebase strictly separates game rules from React UI and from persistence, using a ports/use-cases pattern:

```
React Native Shell (App.tsx, src/app/*)
   MainMenu / SettingsScreen / GameScreen — thin, delegate to use cases

TypeScript Game Core (src/game/core)
   GameState (data), World (constants), GameRuntime.updateGame() (pure reducer),
   GameStateCodec (versioned serialize/validate)

Use cases (src/game/usecases, src/settings/usecases)
   StartNewGameUseCase, ContinueSavedGameUseCase,
   LoadGameSettingsUseCase, UpdateGameSettingsUseCase
   — depend on ports (interfaces), never directly on AsyncStorage

Ports (src/game/ports, src/settings/ports)
   GameSavePort, GameSettingsPort — interfaces implemented by platform adapters

Platform adapters (src/platform/storage, src/platform/settings)
   AsyncStorageGameSaveRepository, AsyncStorageGameSettingsRepository
   — the only place AsyncStorage is touched; save data and settings use
     separate storage keys/domains and are never mixed

Visual layer (src/game/render)
   VisualLanguage (pure visual model) → PixelArtKit (reusable pixel primitives)
   → RoomScene (3 composed rooms) + PajamaHero (pose derived from player position)
   GameCanvas renders via React Native Skia at a 128×128 logical resolution,
   integer-scaled by the shell. Skia renders game state; it never owns gameplay logic.
```

Key invariants (violating these breaks the architecture the codebase is built around):

- `GameRuntime.updateGame(state, input)` is a pure function — all gameplay logic lives here, not in components. `App.tsx` calls it and persists the result.
- Sprite/animation pose is *derived* from existing player state (position/facing) — no new presentation-only gameplay state is added for visuals.
- Save-game and settings are separate domains: separate core types, separate codecs, separate ports, separate storage keys.
- Use cases depend on port interfaces, not concrete repositories, so tests substitute `tests/FakeGameSavePort.ts` / `tests/FakeGameSettingsPort.ts`.
- Save/settings payloads are versioned and validated through their `*Codec` before use (see `GameSaveReadResult`'s `'invalid'` status and how `App.tsx`/use cases handle it).
- `App.tsx` keeps refs (`gameStateRef`, `settingsRef`) as the authoritative source read by event handlers, separate from React state used for rendering — this avoids stale reads when rapid input outpaces async persistence. Settings writes are serialized through `settingsQueueRef` for the same reason.
- No original/remake Pyjamarama sprites, maps, audio, or other copyrighted assets — all art is authored from project-owned geometric/pixel primitives (see `docs/VISUAL_BASELINE_V1_1.md`).

### Gameplay slice (three rooms)

`room-01` (bedroom, collect key → unlock door) → `room-02` (hall) → `room-03` (landing, reaching it fires `SLICE_COMPLETED`). Room bounds, transition thresholds, and interaction hitboxes are constants at the top of `src/game/core/GameRuntime.ts`.

## Specs

Use-case behavior is specified in `docs/CU-01.md`, `docs/CU-02.md`, `docs/CU-03.md`, `docs/CU-06.md`; visual rules in `docs/VISUAL_BASELINE_V1_1.md`; architecture review in `docs/V1_REVIEW.md`; Android validation process in `docs/ANDROID_SMOKE_TEST.md`. When changing use-case behavior, check the corresponding `CU-*.md` spec and its test file together.
