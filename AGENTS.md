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

## Agent workflow

- Codex startup uses the generated `AGENTS.override.md`, which projects this
  file plus the canonical workflow, HITL, RRI and task-card documents in full.
  Never edit the override directly; run `npm run agent:sync` and verify with
  `npm run agent:check`.
- Follow `docs/workflow/AGENT_WORKFLOW_GUIDE.md` for scoped work, review and closure.
- Compute staged executable work with `npm run rri -- <arguments>` using
  `docs/workflow/RRI_POLICY.md`; do not score from memory.
- Follow `docs/workflow/HITL_AUTONOMY_POLICY.md` for approval boundaries.
- Use the core of `docs/workflow/TASK_CARD_TEMPLATE.md` whenever a task is
  analyzed/presented or staged. Expand it only when RRI/HITL requires approval.
- Resolve RRI capability separately from execution surface. Always state whether
  a local developer is eligible, ineligible, or unavailable and list the actual
  project-local commands/device/service needed for evidence.
- Concrete model IDs come from the workflow guide's current capability mapping.
  Recheck official vendor guidance when model availability may have changed.
- Record reviewers separately: 1st Reviewer checks task analysis; 2nd Reviewer
  checks the solution. Delegated Low uses the guide's fixed three-role local
  bundle; RRI 41+ also requires both. Never claim self-review as independent
  or silently replace a required local role with cloud.
- Stop and re-score when scope expands materially, a new categorical risk appears,
  or repeated repairs expose a capability or task-definition gap.

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
- `docs/workflow/AGENT_WORKFLOW_GUIDE.md`
