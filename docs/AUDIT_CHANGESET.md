# Expressive Arcade Refactor — Audit Changeset Map

This file groups the branch diff by responsibility so reviewers can audit by subsystem rather than by commit history.

## 1. Gameplay integration boundary

Files:

- `App.tsx`
- `src/game/presentation/VisualEvent.ts`
- `src/game/presentation/VisualEventMapper.ts`
- `src/game/presentation/PresentationRuntime.ts`
- `docs/PRESENTATION_POLICY.md`

Expected behavior:

- gameplay updates remain authoritative;
- visual events are created only after gameplay transitions complete;
- presentation channels may supersede visual beats but never gameplay inputs;
- restart/continue clear transient presentation and derive stable visuals from state.

Audit priority: **high**.

## 2. Animation and atlas infrastructure

Files:

- `src/game/presentation/AnimationClock.ts`
- `src/game/presentation/AnimationTypes.ts`
- `src/game/presentation/atlas/SpriteAtlas.ts`
- `src/game/presentation/atlas/AtlasSprite.tsx`
- `src/game/presentation/atlas/manifests.ts`
- `src/game/presentation/AssetSources.ts`

Expected behavior:

- deterministic frame progression;
- manifest validation for bounds/IDs/clips;
- integer logical placement;
- nearest-neighbour sprite sampling;
- horizontal facing without gameplay duplication.

Audit priority: **high**.

## 3. Actor/object/FX presentation

Files:

- `src/game/presentation/WallyAnimator.ts`
- `src/game/presentation/ObjectAnimator.ts`
- `src/game/presentation/FxSystem.ts`
- `assets/game/wally/wally.png`
- `assets/game/objects/bedroom-objects.png`
- `assets/game/fx/domestic-fx.png`

Expected behavior:

- Wally state/interaction clips selected semantically;
- all six objects derive stable visual state from gameplay;
- transient FX are bounded and presentation-only;
- strong noise may produce small screen shake;
- original assets are replaceable without changing gameplay.

Audit priority: **high for lifecycle**, **medium for art implementation**.

## 4. Skia room renderer

Files:

- `src/game/render/GameCanvas.tsx`
- `src/game/render/VisualLanguage.ts`
- `src/game/core/World.ts`
- removed: `src/game/render/PixelArtKit.tsx`

Expected behavior:

- sprite actors/objects replace obsolete large procedural block arrays;
- environment remains procedural where efficient;
- 128 logical-pixel world remains authoritative;
- visual hierarchy is environment < objects < Wally/FX.

Audit priority: **high for anchors/performance**, **medium for composition**.

## 5. Product UI

Files:

- `src/app/GameScreen.tsx`
- `src/app/MainMenu.tsx`
- `src/app/SettingsScreen.tsx`
- `src/app/RetroUiKit.tsx`

Expected behavior:

- persistent Wally-state diagnostic label removed;
- time/energy/noise remain readable;
- nearby action prompt is contextual;
- reaction prose is flavor, not required to understand gameplay;
- touch layout semantics and settings persistence remain unchanged.

Audit priority: **medium**, with Android visual evidence required for final judgement.

## 6. Test and audit tooling

Files:

- `tests/presentation.test.ts`
- `package.json`
- `.github/workflows/validation.yml`
- `scripts/audit-static.sh`
- `maestro/screenshots.yaml`
- `scripts/android-screenshots.sh`

Expected behavior:

- presentation contracts have deterministic unit coverage;
- `npm run audit:premerge` provides one-command automated evidence;
- CI enforces architecture residue/boundary checks;
- screenshot YAML and shell runner agree on exactly eleven evidence files.

Audit priority: **high**.

## 7. Audit/product documentation

Files:

- `README.md`
- `AGENTS.md`
- `CLAUDE.md`
- `docs/EXPRESSIVE_ARCADE_VISUAL_REFACTOR_PLAN.md`
- `docs/VISUAL_REFACTOR_BASELINE.md`
- `docs/VISUAL_REFACTOR_INCIDENTS.md`
- `docs/PERFORMANCE_REVIEW_NOTES.md`
- `docs/AUDIT_READINESS.md`
- `docs/AUDIT_REVIEW_GUIDE.md`
- `docs/AUDIT_FINDING_TEMPLATE.md`

Audit priority: **medium**; confirm documents describe actual code rather than intended code.

## Explicitly not changed by design

The audit should flag any accidental difference in these areas:

- six gameplay object IDs and interaction positions;
- ten ordered gameplay rules and resource math;
- completion/failure semantics;
- game save format/domain;
- settings domain;
- product scope (one room, no progression/monetization/new content);
- human fun gate remains a future product gate rather than a CI result.
