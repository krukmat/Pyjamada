# AGENTS.md

## Mission

Keep Pyjamada small, deterministic and easy to iterate. There is one active gameplay path: the systemic bedroom run. Do not recreate parallel Classic/prototype implementations.

The current visual branch adds an expressive arcade presentation layer. Gameplay truth remains in `src/game/systemic`; animation, sprite atlases and FX remain presentation-only.

## Working rules

- Treat `src/game/systemic` as the authoritative game domain.
- Gameplay code must not import `src/game/presentation` or renderer modules.
- Keep game rules pure TypeScript and UI-independent.
- `VisualEventMapper` is the boundary from completed gameplay updates to semantic visual events.
- Rule IDs must not become renderer/animator APIs.
- Transient animation/FX state is never persisted.
- Restart clears transient presentation; continue derives stable visuals from gameplay state.
- Preserve the six-object / ten-rule contract unless a task explicitly changes gameplay.
- Persist only validated run states through `GameSavePort`.
- Keep settings independent from game saves.
- Prefer deleting obsolete experimental paths over compatibility layers; Git history is the archive.
- Avoid speculative rooms, progression, monetization or live-ops until the current loop has passed human playtesting.
- Use original project assets only; do not copy protected game sprites/compositions.

## Required checks

For ordinary changes:

```bash
npm run test:all
npm run typecheck
```

For audit/pre-merge work:

```bash
npm run audit:premerge
```

For visual evidence, run locally on Android:

```bash
npm run screenshots:android
```

Do not report screenshot quality or device performance as validated unless that local/device run was actually performed.

## Audit documents

Start with:

- `docs/AUDIT_READINESS.md`
- `docs/AUDIT_REVIEW_GUIDE.md`
- `docs/AUDIT_FINDING_TEMPLATE.md`
- `docs/VISUAL_REFACTOR_INCIDENTS.md`
- `docs/PERFORMANCE_REVIEW_NOTES.md`
- `docs/PRESENTATION_POLICY.md`

## Active product documentation

- `README.md`
- `docs/GAMEPLAY.md`
- `docs/ANDROID_SMOKE_TEST.md`
- `CLAUDE.md`
