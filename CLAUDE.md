# CLAUDE.md

## Project

Pyjamada is an Android-first React Native/TypeScript game experiment. The active product has a single gameplay path: the systemic bedroom run. The old Classic V1 three-room slice was intentionally removed; Git history is the archive.

Current product baseline: **v0.9.0**.

The branch `feat/expressive-arcade-visual-refactor` introduces the expressive arcade presentation architecture and is intentionally held for team audit before any merge.

## Commands

```bash
npm install
npm start
npm run android
npm run test:all
npm run typecheck
npm run audit:premerge
npm run screenshots:android
```

## Architecture

```text
React Native shell
  App.tsx
  ├── MainMenu
  ├── SettingsScreen
  └── GameScreen
       ├── presentation cadence / HUD / controls
       └── GameCanvas (Skia)

Pure TypeScript gameplay
  src/game/systemic/
  ├── SystemicState
  ├── SystemicContent
  ├── SystemicRuleEngine
  ├── SystemicRuntime
  ├── SystemicCodec
  └── SystemicTelemetry

Presentation boundary
  SystemicRuntime update
       ↓
  VisualEventMapper
       ↓
  PresentationRuntime
  ├── WallyAnimator
  ├── ObjectAnimator
  ├── FxSystem
  └── atlas manifests / frame lookup
       ↓
  GameCanvas / Skia

Persistence
  GameSavePort
  AsyncStorageGameSaveRepository
  key: pyjamada:game:v1:run

Settings remain a separate persistence domain.
```

`systemic` is an architectural/domain term. It no longer denotes an experimental alternative mode.

## Invariants

- Gameplay updates are deterministic and live in pure TypeScript.
- `src/game/systemic` must not import presentation/render code.
- React/Skia and presentation modules cannot implement or mutate game rules/state.
- Rule IDs terminate at `VisualEventMapper`; animator APIs are semantic events.
- Transient presentation state is not persisted.
- Restart clears presentation; continue reconstructs stable visual state from the loaded game state.
- The active room has six objects: bed, alarm clock, wardrobe, slippers, window and keys.
- The rule engine has ten ordered reusable rules.
- Objective completion requires dressed + keys.
- Failure conditions are excessive noise, exhaustion or exceeding the time deadline.
- Save payloads are versioned and validated before use.
- Settings and game save use separate storage domains.
- Do not reintroduce a Classic/Systemic product split.
- Do not use protected/original Pyjamarama or third-party game assets.

## Validation

`npm run audit:premerge` is the canonical pre-audit/pre-merge evidence command. It runs game/settings/presentation tests, TypeScript typecheck and static architecture checks.

Android screenshots and device performance are **manual/local evidence**. Do not claim they passed unless `npm run screenshots:android` and any performance checks were actually run on an Android target.

## Audit handoff

Start with:

- `docs/AUDIT_READINESS.md`
- `docs/AUDIT_REVIEW_GUIDE.md`
- `docs/AUDIT_FINDING_TEMPLATE.md`
- `docs/VISUAL_REFACTOR_INCIDENTS.md`
- `docs/PERFORMANCE_REVIEW_NOTES.md`
- `docs/PRESENTATION_POLICY.md`

The audit should end with one recommendation: merge, merge after fixes, or do not merge.
