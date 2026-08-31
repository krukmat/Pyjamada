# Repository Guidelines

## Project Structure & Module Organization

- `App.tsx` is the React Native application shell and coordinates menu, settings, gameplay, and persistence use cases.
- `src/game/core/` contains framework-independent game state, world rules, movement, progression, and save codecs.
- `src/game/render/` contains the Skia canvas and project-owned pixel-art visual primitives.
- `src/app/` contains React Native screens and HUD components.
- `src/settings/` defines settings models, codecs, ports, and use cases; `src/platform/` provides AsyncStorage adapters.
- `tests/` contains the TypeScript domain and integration tests; `docs/` contains CU specifications, visual rules, and Android smoke criteria.
- `.github/` contains CI workflows and the Android emulator smoke script; visuals are authored in source.

## Build, Test, and Development Commands

Run `npm install` with Node.js `>=22.13.0` before development.

- `npm run start` — start the Expo development server.
- `npm run android` — build and launch the native Android app.
- `npm run typecheck` — run strict TypeScript checking without emitting files.
- `npm run test:v1` — compile and run the complete CU-01/CU-02/CU-03/CU-06, integration, and visual suites.
- `npm run test:cu03` (or another `test:*` script) — run one focused suite.

## Coding Style & Naming Conventions

Use strict TypeScript, two-space indentation, semicolons, and single-quoted imports/strings. Name React components and types in PascalCase, functions and variables in camelCase, and constants in `UPPER_SNAKE_CASE` where appropriate. Keep game rules outside React components and renderers presentation-only. No formatter or linter is configured; preserve surrounding style.

## Testing Guidelines

Tests are plain TypeScript files under `tests/`, compiled with `tsconfig.test.json` and executed with Node. Name files `*.test.ts` and keep assertions focused on the relevant use case. Run `npm run typecheck` and `npm run test:v1` for core changes; native or visual changes should also follow `docs/ANDROID_SMOKE_TEST.md`. No coverage threshold is defined.

## Commit & Pull Request Guidelines

Use concise, imperative, prefixed commit subjects such as `feat:`, `fix:`, `docs:`, or `ci:` (for example, `fix: preserve rapid input order`). PRs should explain the behavior or scope changed, list validation commands, link relevant documentation or issues, and include Android screenshots or emulator evidence for UI/native changes. Keep work within the approved V1 scope and do not add copyrighted Pyjamarama assets.

## Architecture and Scope Rules

Preserve separate ports/codecs for game saves and settings. Use cases should depend on ports rather than AsyncStorage directly. Do not expand beyond the three-room vertical slice, local single-slot persistence, or deferred audio/gameplay scope without an explicit product decision.
