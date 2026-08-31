# AGENTS.md

## Mission

Keep Pyjamada small, deterministic and easy to iterate. There is one active gameplay path: the systemic bedroom run. Do not recreate parallel Classic/prototype implementations.

## Working rules

- Treat `src/game/systemic` as the authoritative game domain.
- Keep game rules pure TypeScript and UI-independent.
- Keep React/Skia focused on presentation and input wiring.
- Preserve the six-object / ten-rule contract unless a task explicitly changes gameplay.
- Persist only validated run states through `GameSavePort`.
- Keep settings independent from game saves.
- Prefer deleting obsolete experimental paths over compatibility layers; Git history is the archive.
- Avoid speculative rooms, progression, monetization or live-ops until the current loop has passed human playtesting.

## Required checks

```bash
npm run test:all
npm run typecheck
```

For visual changes also run locally:

```bash
npm run screenshots:android
```

## Active documentation

- `README.md`
- `docs/GAMEPLAY.md`
- `docs/ANDROID_SMOKE_TEST.md`
- `CLAUDE.md`
