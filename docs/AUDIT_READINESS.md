# Expressive Arcade Refactor — Audit Readiness

## Status

**Ready for team audit. Not approved for merge yet.**

- Branch: `feat/expressive-arcade-visual-refactor`
- Base: consolidated `main` at `2d53246bec1c34458c389928691a8fc23a1dbb6c`
- Scope: complete visual/presentation refactor of the single active Pyjamada game path
- Gameplay contract: six objects, ten ordered rules, deterministic resources/objective/persistence semantics preserved
- Android screenshots: automation prepared; execution and visual judgement require a local Android emulator/device

This document is the entry point for reviewers. It intentionally separates implementation evidence from decisions that still require human audit.

## What changed

The refactor replaces the procedural actor/object rendering path with an original sprite-atlas presentation architecture:

```text
SystemicRuntime (gameplay truth)
        │
        ▼
VisualEventMapper
        │
        ▼
PresentationRuntime
 ├── WallyAnimator
 ├── ObjectAnimator
 ├── FxSystem
 └── animation/event channels
        │
        ▼
Atlas + Skia renderer
```

Application chrome was also refactored so menu, settings, HUD, touch controls and outcome states share the same expressive-arcade visual language.

## Invariants reviewers should treat as requirements

1. `src/game/systemic` remains pure gameplay and must not import presentation/render modules.
2. Presentation events cannot change gameplay time, energy, noise, inventory, objective or Wally gameplay state.
3. Rule IDs terminate at `VisualEventMapper`; renderers/animators consume semantic events.
4. Restart clears transient presentation immediately.
5. Continue/save restore derives stable visuals from gameplay state; animation frames/timestamps are never persisted.
6. Sprite placement remains integer-aligned in the 128 logical-pixel world.
7. Atlas metadata failures must be test-visible, not silent rendering failures.
8. No legacy Classic/product split may be reintroduced.
9. Assets in this refactor are original project assets; no protected Pyjamarama or third-party game sprite sheets are used.

## Automated evidence

Run the complete pre-merge evidence package with:

```bash
npm install
npm run audit:premerge
```

`audit:premerge` executes:

- deterministic gameplay/settings/presentation tests;
- TypeScript typecheck over the React Native/Skia shell;
- static architecture checks that reject gameplay→presentation imports and legacy renderer compatibility residue;
- screenshot-tour contract checks for menu, success, restart and continue/restore coverage.

CI executes the same static architectural contract in addition to the normal tests and typecheck.

## External/manual evidence

These checks cannot be truthfully completed in the GitHub-only execution environment and must be performed by the team before a merge decision if they are considered release gates:

### Android visual tour

```bash
npm run screenshots:android
```

or, with an existing build:

```bash
SKIP_BUILD=1 npm run screenshots:android
```

The prepared tour produces eleven checkpoints:

1. main menu
2. settings
3. run start / sleepy baseline
4. bed wake
5. slippers
6. alarm
7. startled reaction
8. wardrobe/fumble
9. success
10. restart
11. continue/restore

### Performance/frame pacing

The branch deliberately leaves the screen-level presentation ticker as an explicit audit topic (`INC-004`). Reviewers should measure Android frame pacing/input responsiveness before deciding whether to accept it or migrate the animation clock closer to Skia/Reanimated.

See `docs/PERFORMANCE_REVIEW_NOTES.md`.

## Known implementation incidents

Canonical source: `docs/VISUAL_REFACTOR_INCIDENTS.md`.

Current categories:

- Android screenshot/visual evidence is external.
- Binary asset delivery was resolved through real Git blobs + typed manifests.
- `Systemic*` remains internal gameplay terminology by deliberate scope decision.
- presentation cadence/performance remains a measured audit decision, not an inferred success.

There are no intentionally hidden issues. Auditors should add new findings independently rather than editing history out of the incident log.

## Recommended review order

1. **Domain boundary:** `SystemicRuntime` → `VisualEventMapper` → `PresentationRuntime`.
2. **Lifecycle correctness:** rapid input, superseding channels, restart, continue, background/foreground expiry.
3. **Atlas correctness:** manifests, anchors, frame lookup, nearest-neighbour rendering.
4. **Rendering/performance:** `GameCanvas`, `AtlasSprite`, React ticker, allocation/churn hotspots.
5. **UX/art direction:** Wally state readability, object recognizability, HUD information hierarchy, FX causality.
6. **Persistence/regression:** no animation state in saves; deterministic gameplay unchanged.
7. **Tooling/QA:** tests, static audit checks, Maestro tour.
8. **Documentation/maintainability:** architecture names, comments, removal of obsolete paths.

## Merge decision criteria

The branch should not merge merely because CI is green. Recommended conditions for approval:

- no unresolved Critical/High audit findings;
- no unresolved S1/S2 incidents;
- `npm run audit:premerge` green on the reviewed HEAD;
- audit disposition recorded for every Medium finding (fix / accepted debt / follow-up);
- explicit team decision on `INC-004` performance strategy;
- Android visual tour executed and reviewed if visual QA is required for this merge;
- no gameplay semantic change discovered during review unless separately approved and tested.

## Supporting documents

- `docs/EXPRESSIVE_ARCADE_VISUAL_REFACTOR_PLAN.md` — original execution plan
- `docs/PRESENTATION_POLICY.md` — lifecycle/interruption contract
- `docs/VISUAL_REFACTOR_INCIDENTS.md` — incident/deviation log
- `docs/VISUAL_REFACTOR_BASELINE.md` — pre-refactor baseline contract
- `docs/PERFORMANCE_REVIEW_NOTES.md` — focused performance review material
- `docs/AUDIT_REVIEW_GUIDE.md` — reviewer checklist/severity model
- `docs/AUDIT_FINDING_TEMPLATE.md` — normalized finding format
