# Agent Workflow Guide

This guide defines Pyjamada's adapted AI-assisted workflow without importing
another project's product rules.

`AGENTS.md` is the short entry point. This guide owns the procedure;
`RRI_POLICY.md` owns scoring and model routing; `HITL_AUTONOMY_POLICY.md` owns
the approval boundary.

## Session-start loading

Codex loads generated `AGENTS.override.md`; Claude expands root `CLAUDE.md`
imports. Both preload all five canonical sources. After source changes, run
`npm run agent:sync`; verify with `npm run agent:check`.

## Core principles

- The user's requested outcome and the repository invariants define the work.
- Read-only discovery is always allowed. Mutating work stays inside the
  authorized scope.
- RRI selects minimum capability/control, not certainty or execution surface.
- A task card is a decision projection. It links to detailed evidence instead
  of duplicating a plan or the complete RRI rubric.
- Model choice follows capability; operational failure alone does not raise it.
- Never claim tests, device evidence or review that did not run.

## Canonical workflow

### 1. Discover

Inspect the worktree, applicable instructions, architecture, tests, and active
documentation. Preserve unrelated user changes. Resolve contradictions before
editing.

### 2. Bound the task

Define:

- one-sentence objective;
- allowed files, modules, behaviors, and external systems;
- explicit exclusions;
- acceptance criteria, including at least one failure or edge condition when
  behavior changes;
- verification commands and any manual evidence required;
- whether the work contains destructive or outward-facing actions.

Split the task when its parts can be accepted independently, when refactoring
and behavior change can be separated, or when the RRI policy requires it.

### 3. Score and route

Run the calculator before executable staged work:

```bash
npm run rri -- \
  --touches src/game/systemic/SystemicRuntime.ts \
  --touches tests/game.test.ts \
  --cc 8 --D 3 --T 1 --A 0 --K 3 --P 3 --X 2
```

Use planned paths before work and actual paths at closure; use `--json` for
evidence. The calculator derives path floors; the author supplies the judgments
required by `RRI_POLICY.md`.

Resolve two independent routes:

1. **Capability route:** model tier, reasoning effort, approval, review and
   decomposition from the final RRI band.
2. **Execution surface:** primary agent, local model developer, repository-local
   tooling, device/GUI, or external service from the work actually required.

A task may use several surfaces: a Low patch can use a local model plus project
checks, while device evidence still needs a device. A task-local model pin must
meet the band and record its rationale.

### 4. Present the decision

Use `TASK_CARD_TEMPLATE.md` for analyzed, presented or staged tasks, including
Low. Show RRI, capability, execution, local eligibility/reason, environment,
verification, reviewers and authorization.

When HITL requires a checkpoint, add the approval blocks and only useful
diagrams/references.

The initial request counts as authorization only when it clearly names a
bounded implementation. Broad approval of a plan does not authorize every
later high-risk subtask. Record any explicit bounded waiver.

### 5. 1st Reviewer — review the task analysis

For RRI 41+, use a fresh context to challenge scope, acceptance criteria, RRI
inputs, risk floors, and the verification plan before implementation. The
reviewer must not approve its own analysis.

For RRI 26–40, this review is recommended when behavior, persistence, native
configuration, or architectural boundaries change. It may be omitted for a
fully specified and easily reversible task, with the omission recorded.

For delegated Low, this review is mandatory before handoff and uses the fixed
local binding below in a fresh invocation. The future author cannot review it.

Review result: `PASS`, `REVISE`, or `BLOCKED`, with concrete findings.

### 6. Implement

Work only within the approved boundary. Stop and re-score before continuing if:

- the affected paths or behavior expand materially;
- a new categorical risk appears;
- a required acceptance criterion cannot be met;
- two bounded repair attempts fail for the same reason;
- verification becomes unavailable or unreliable.

Prefer decomposition. Capability failure may justify a higher route after
re-scoring; service, quota, authentication or runner failure does not.

### 7. Verify

Run focused checks while iterating, then the repository checks required by
`AGENTS.md`. For ordinary changes:

```bash
npm run test:all
npm run typecheck
```

Use `npm run audit:premerge` for audit or pre-merge work. Visual and device
claims require the Android run named in `AGENTS.md`; otherwise record them as
not run.

### 8. 2nd Reviewer — review the solution

Behavior-changing development work at RRI 26+ receives a fresh-context review
before closure. RRI 41+ requires it. The reviewer examines the actual diff,
acceptance criteria, test evidence, unintended scope, and repository invariants.

The reviewer must be independent of the authoring context. Prefer a different
model/provider; otherwise use a fresh context at the same or higher capability
tier and disclose the degraded independence. If no independent review route is
available, do not invent one: record that fact and ask for human review when the
band requires it.

Review result: `PASS`, `REVISE`, or `BLOCKED`. One bounded repair cycle is
normal; repeated repair failures trigger re-scoring or decomposition.

For locally authored Low, this review uses the fixed binding below. Run it
separately from reviewer 1 and author, after verification and before closure.

### 9. Close

Report outcome/scope, exact verification, review result/exemption, planned versus
actual paths and RRI changes, skipped evidence, assumptions, residual risk and
any required task/plan/audit synchronization.

A task is not complete while a required review is `REVISE` or `BLOCKED`.

## Execution-surface routing

Choose surfaces from task requirements; one task may use several:

| Surface | Select when | Required card detail |
|---|---|---|
| Primary agent | Analysis, docs/policy/plans, architecture, audit synthesis or orchestration | Direct-execution reason |
| Local model developer | Low bounded code/test/mechanical patch; exact paths/context, deterministic check, no categorical hazard | `eligible`, `ineligible` or `unavailable`; adapter/model and reason |
| Repository-local tooling | Tests, typecheck, build, lint, audit, emulator or scripts | Exact commands/readiness |
| Device/GUI | Visual, hardware, lifecycle or interaction evidence | Target and observed evidence |
| External service | Remote read/write, publication or deployment | Service, boundary and approval |

For local delegation, the primary agent remains orchestrator. Send objective,
acceptance, exact paths, context, constraints and verification. The delegate
returns a candidate patch. The orchestrator validates/applies it and runs
checks; the delegate cannot review or approve its task, expand scope, act
destructively or claim project verification. Both review gates are required.

Low role bindings are fixed and local: author
`devstral-small-2:24b-instruct-2512-q4_K_M`; 1st Reviewer
`gemma4:26b-a4b-it-qat`; 2nd Reviewer `gpt-oss:20b` with
`num_ctx=131072`. Each role gets a separate invocation/context.

Local development is ineligible for broad docs/workflow/policy/ADR/plan work,
investigation, ambiguous design, native/device operations,
persistence/security/external/destructive work, or RRI above Low. State the
reason instead of omitting the field. Resolve adapter/model from local
configuration; never inherit another project's model. Missing adapter/model or
stopped service means `unavailable`, not a different RRI. Do not substitute a
cloud model silently; pause for an explicitly authorized reroute.

## Capability/model-selection procedure

Model IDs resolve stable capability tiers. Recheck vendor availability without
rewriting RRI or execution criteria merely because a model name changes.

| RRI band | Default authoring route | Starting effort | Use it for |
|---|---|---|---|
| 0–25 Low | local Devstral binding above | reasoning off | Eligible bounded code/test/mechanical patches; non-delegable work stays with the orchestrator |
| 26–40 Moderate | `gpt-5.6-terra` | `medium` | Normal multi-file implementation, familiar debugging, contained state or UI changes |
| 41–55 High | `gpt-5.6-terra` | `high` | Coupled/stateful work with a clear strategy; use `gpt-5.6-sol`/`high` when architecture, persistence, security, novelty, or unresolved ambiguity dominates |
| 56–70 Complex | `gpt-5.6-sol` | `high`, then `xhigh` only if needed | Decomposition, architecture-sensitive implementation, deep debugging, high-impact boundaries |
| 71–85 Critical | `gpt-5.6-sol` | `xhigh` | Approved subtasks only, with human diff review and independent solution review |
| 86–100 Extreme | `gpt-5.6-sol` | `max` | Analysis, ADR/risk work, and decomposition only; no direct aggregate implementation |

Selection criteria, in order:

1. Respect modality and tool requirements.
2. Meet the RRI band's minimum capability.
3. Confirm context capacity and reliable structured/patch output for the task.
4. Prefer the least costly model that reliably meets acceptance and review
   requirements.
5. Raise reasoning effort before raising model tier when the issue is bounded
   multi-step reasoning, not missing capability.
6. Raise model tier for novel architecture, long-context synthesis, persistent
   data/security impact, or evidenced repeated reasoning failure.
7. Do not raise tier for an operational-only failure. Use the equivalent route,
   pause, or ask the user.
8. After capability-related failure, re-score ambiguity, context, coupling, and
   verification rather than promoting silently.

Reviewer routing:

| Final band | Review route |
|---|---|
| 0–25 | Fixed local bundle above; fresh 1st and separately fresh 2nd mandatory |
| 26–40 | 1st optional as above; fresh 2nd `gpt-5.6-terra`/`medium` for behavior changes or human equivalent |
| 41–55 | Both required; fresh `gpt-5.6-terra`/`high` or `gpt-5.6-sol`/`high`, at least author capability |
| 56–85 | Both required; fresh `gpt-5.6-sol` at band effort plus HITL human review |
| 86–100 | 1st reviews decomposition; 2nd is n/a until an executable subtask exists |

The author never fills either reviewer role or grants human approval. For local
delegation, record the two reviewers as separate gates and contexts.

## Compact evidence lines

Cards and closure reports use these lines when applicable:

```text
1st Reviewer / task analysis: <reviewer/context> - <PASS|REVISE|BLOCKED|n/a>
2nd Reviewer / solution: <reviewer/context> - <PASS|REVISE|BLOCKED|n/a>
Verification: <commands/manual evidence> - <PASS|FAIL|NOT RUN>
```

## Authority order

For product and architecture truth, follow `AGENTS.md` and active product/audit
documents. For agent workflow mechanics, this guide controls. The RRI and HITL
documents control their respective detailed topics. A direct user instruction
for the current task overrides defaults when it is safe, lawful, and explicitly
bounded; record the override.
