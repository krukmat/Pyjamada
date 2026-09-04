<!-- GENERATED FILE. Do not edit directly. Run: npm run agent:sync -->
# Codex startup instruction bootstrap

The following canonical sources are projected in full so Codex loads them before work begins.

<!-- BEGIN SOURCE: AGENTS.md -->
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
<!-- END SOURCE: AGENTS.md -->
<!-- BEGIN SOURCE: docs/workflow/AGENT_WORKFLOW_GUIDE.md -->
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
<!-- END SOURCE: docs/workflow/AGENT_WORKFLOW_GUIDE.md -->
<!-- BEGIN SOURCE: docs/workflow/HITL_AUTONOMY_POLICY.md -->
# Human-in-the-Loop Autonomy Policy

This policy states when work may proceed and when explicit human approval is
required. It does not grant permission beyond the user's request.

## Approval boundary

Read-only inspection, diagnosis, planning, and scoring do not require approval.
Writing is allowed only inside the task scope authorized by the user and the
repository sandbox.

| Final RRI | Default autonomy gate |
|---|---|
| 0–25 Low | A clear user request authorizes bounded implementation; no extra card |
| 26–40 Moderate | Present a compact card and wait, unless the current request already authorizes the exact bounded implementation; record that authorization |
| 41–55 High | Present after the 1st Reviewer passes; wait for explicit approval; require an independent 2nd Reviewer before closure |
| 56–70 Complex | Decompose first; human approves the plan/subtask; both reviewers gate executable work |
| 71–85 Critical | Decompose; both reviewers plus human approval/diff review per executable boundary |
| 86–100 Extreme | 1st Reviewer checks decomposition; no aggregate implementation or 2nd review |

An explicit instruction such as “implement this bounded change and do not ask
again” may waive the ordinary 26–55 presentation checkpoint. It does not waive
the always-approval actions below, scope limits, required review, decomposition,
or verification.

## Always requires explicit approval

Ask immediately before the action, even when an implementation card was already
approved:

- deleting or overwriting user data or material files when the exact target was
  not explicitly requested;
- committing, pushing, publishing, deploying, opening/merging a PR, or writing
  to an external system;
- installing or upgrading dependencies, SDKs, native toolchains, or plugins;
- schema/save-format migration that can make existing persisted data unreadable;
- handling or exposing secrets, credentials, private data, or permissions;
- paid operations or actions with material real-world consequences.

Safe, reversible file edits inside the repository are not “overwriting” for this
rule when they are the clearly requested implementation and user changes are
preserved.

## Scope change and reapproval

Stop, update the RRI, and request renewed approval when the implementation would:

- add an unapproved product behavior or dependency;
- cross a new architecture or persistence boundary;
- activate a higher risk floor;
- materially expand allowed paths;
- turn a reversible operation into an irreversible or outward-facing one.

Small test fixtures, type fixes, and documentation sync required by the approved
acceptance criteria do not need reapproval when they stay inside the stated
boundary and do not activate a new risk.

## Review authority

Model review and automated checks advise; they never supply human approval.
Likewise, human approval does not replace tests or an independent review required
by the RRI band.

If a required reviewer is unavailable, report the missing gate. A human may
perform the independent review or explicitly waive that review for the bounded
task, but the waiver must be recorded and may not fabricate a `PASS`.

A Low task delegated to a local developer requires a fresh 1st Reviewer for its
task analysis and a separately resolved fresh 2nd Reviewer for its solution.
Use the workflow guide's fixed local bindings. Both must pass; no role may fill
or waive another, and cloud substitution requires explicit rerouting.

## Approval wording

End a required card with:

`Execution has not started. Approve this task to proceed.`

If the current request already supplies a valid bounded authorization, state:

`Authorization: current user request; no additional checkpoint required.`
<!-- END SOURCE: docs/workflow/HITL_AUTONOMY_POLICY.md -->
<!-- BEGIN SOURCE: docs/workflow/RRI_POLICY.md -->
# Required Reasoning Index (RRI) v2

RRI routes required reasoning, context, caution and verification. It is not a
time score, execution selector or permission. V2 uses eight factors, a 100 cap,
categorical floors and deterministic planned/actual comparison.

## Formula

Each variable is an integer from 0 to 5:

```text
base = round(20 × (
  0.12C + 0.08F + 0.15D + 0.15T +
  0.12A + 0.14K + 0.16P + 0.08X
))

adjusted = base + quality modifiers
final RRI = min(100, max(adjusted, active risk floors))
```

Weights total 1.00. Compared with the source scheme, raw file count and
cyclomatic complexity carry less weight; impact, coupling, domain reasoning,
and verification carry more. A large mechanical rename should not outrank a
small persistence or gameplay-contract change.

Low-confidence variables are raised by one, capped at 5, before the base is
calculated. Mark only variables whose evidence is genuinely incomplete.

## Variables

| Var | Meaning | 0 | 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|---|---|
| C | Maximum cyclomatic complexity created/materially changed | non-code or CC 1–5 | 6–10 | 11–20 | 21–30 | 31–50 | >50 |
| F | Planned/actual unique files | 0–1 | 2 | 3–5 | 6–10 | 11–20 | >20 |
| D | Domain reasoning | docs/copy | simple constants/logic | normal app or presentation logic | gameplay/state/integration | persistence/native/async core | security, irreversible or safety-critical logic |
| T | Verification risk | strong focused tests | good nearby tests | partial tests or manual evidence | fragile/indirect tests | no tests in area | no tests for high-impact logic |
| A | Ambiguity | exact acceptance + edge cases | mostly exact | a few open details | meaningful interpretation | open-ended design | vague outcome |
| K | Coupling/side effects | pure/local | isolated file/class | contained module effects | framework/state/storage integration | async/events/native/lifecycle effects | distributed or critical external effects |
| P | User/API/data impact | none | cosmetic/internal | internal behavior | user-visible behavior or internal API | gameplay contract, public API, persisted data | security, destructive data loss, permissions, critical external impact |
| X | Context required | one function | one file | 2–5 files | one complete subsystem | several subsystems | repository-wide or multi-repository architecture |

For code, estimate CC as 1 plus decision points in the functions materially
changed (`if`, conditional branch, loop, case/match arm, and boolean short
circuit that adds a path). Use `--C` with written justification when raw CC is
not meaningful.

## Pyjamada path floors

The calculator raises D/P/K to these minimums. Score higher when the actual
change warrants it.

| Path | D floor | P floor | K floor | Reason |
|---|---:|---:|---:|---|
| `docs/**`, Markdown | 0 | 0 | 0 | Documentation only |
| `tests/**` | 0 | 0 | 0 | Test-only surface |
| `src/game/systemic/**` | 3 | 4 | 3 | Authoritative gameplay contract |
| `src/game/presentation/**` | 2 | 1 | 3 | Transient events/animation coupling |
| `src/game/render/**` | 2 | 1 | 3 | Renderer/framework boundary |
| `src/game/ports/GameSavePort.ts`, `src/platform/storage/**` | 4 | 4 | 3 | Persisted run state |
| `src/platform/settings/**`, `src/settings/**` | 3 | 4 | 3 | Persisted settings boundary |
| `src/app/**`, `App.tsx` | 2 | 3 | 3 | User-visible orchestration |
| `scripts/**`, `maestro/**` | 1 | 1 | 2 | Tooling/evidence workflow |
| `assets/game/**` | 1 | 2 | 1 | User-visible original game assets |
| `package.json` | 1 | 1 | 2 | Script/tooling floor; dependency changes also use the categorical risk |
| `app.json`, native config | 3 | 3 | 3 | Build/runtime surface |

Unknown paths receive no automatic floor and must be judged explicitly.

## Quality modifiers

Modifiers represent avoidable task-shaping risk, not domain impact:

| Modifier | Value | Use when |
|---|---:|---|
| `mixed_change` | +6 | Refactor and functional behavior change cannot be separated |
| `no_verification` | +12 | No credible automated or manual verification strategy exists |

Modifiers are applied once each. `no_verification` also imposes a Complex floor
because unverified implementation must be decomposed or given an observable
acceptance strategy.

## Categorical risk floors

| Risk key | Minimum RRI | Meaning |
|---|---:|---|
| `dependency_or_native` | 41 | Dependency, SDK, native build, permissions, or release configuration |
| `architecture_policy` | 41 | Binding architecture/process policy or cross-boundary decision |
| `gameplay_contract` | 56 | Changes the six-object/ten-rule contract or authoritative gameplay semantics |
| `persistence_schema` | 56 | Save/settings format or migration compatibility |
| `external_write` | 56 | Commit/push/publish/deploy or write to an external service |
| `destructive` | 71 | Delete/overwrite/data-loss possibility |
| `sensitive_data` | 71 | Secrets, private data, authorization, ownership, or permissions |

Floors do not imply authorization. The HITL policy may still require a separate
approval immediately before an action.

## Bands and gates

| RRI | Band | Effort | Execution gate |
|---|---|---|---|
| 0–25 | Low | S | Eligible delegation uses the workflow guide's fixed three-role local bundle; both reviewers mandatory |
| 26–40 | Moderate | M | Compact card unless precisely authorized; 1st Reviewer condition-based, 2nd required for behavior changes |
| 41–55 | High | L | Mandatory 1st Reviewer, explicit approval, mandatory independent 2nd Reviewer |
| 56–70 | Complex | L | Decompose first; approve plan and executable subtask |
| 71–85 | Critical | XL | Decompose; both reviewers and human approval/diff review per boundary |
| 86–100 | Extreme | XL | 1st reviews decomposition; no implementation/2nd review until subtasks exist |

Decomposition is also required when `F >= 4` together with `K >= 3`, when the
task mixes independently acceptable behavior changes, or after two failed
repairs for the same acceptance gap.

## Using the calculator

Before implementation:

```bash
npm run rri -- \
  --touches <planned-path> --touches <planned-path> \
  --cc <raw-cc> \
  --D <0-5> --T <0-5> --A <0-5> --K <0-5> --P <0-5> --X <0-5> \
  [--modifier mixed_change] [--modifier no_verification] \
  [--risk gameplay_contract] [--low-confidence A,X]
```

Use `--C <0-5>` instead of `--cc` for non-code work. Use `--json` for durable
evidence. At closure, run it again against the actual unique paths when the
scope or risk classification changed; report a band change rather than hiding
it.

The tool decides arithmetic, floors, capability/role routes and decomposition.
The author owns truthful paths, complexity, subjective inputs, modifiers,
risks and evidence. Separately classify execution eligibility: Low resolves
the local model bundle, but only eligible bounded work is delegated.

## Reporting

Record at least:

```text
RRI <final> <band> (base <base>, modifiers <...>, floors <...>)
Dominant drivers: <two or three variables/risks>
Capability route: <model>/<effort>; approval <gate>; review <route>
Execution: <primary surface>; local developer <eligible|ineligible|unavailable + reason>; environment <commands/device/service>
1st Reviewer: <identity/context/status>; 2nd Reviewer: <identity/context/status>
```

Never calculate by memory when the script is available.
<!-- END SOURCE: docs/workflow/RRI_POLICY.md -->
<!-- BEGIN SOURCE: docs/workflow/TASK_CARD_TEMPLATE.md -->
# Task Brief and Compact Approval Card

Use blocks 1–3 for every staged task, including Low. Add 4–6 when HITL requires
a decision; link oversized definitions and RRI evidence.

## 1. Decision

`<ID or short name> | <status> | RRI <score> <band> | Effort <S/M/L/XL> | <approval gate>`

| Route | Resolved value |
|---|---|
| Orchestrator | `<responsible context>` |
| Capability route | `<model>/<reasoning effort> — short rationale>` |
| Primary execution | `<primary agent | local model developer | repository tooling | device/GUI | external service>` |
| Local developer | `<eligible | ineligible | unavailable> — <model/adapter if resolved> — <reason>` |
| Required environment | `<project commands, runtime/service readiness, device or n/a>` |
| 1st Reviewer — task analysis | `<model/human, fresh context, required/optional/n/a>` |
| 2nd Reviewer — solution | `<model/human, separate fresh context, required/optional/n/a>` |
| Escalation | `<capability trigger -> route; operational trigger -> equivalent route/pause>` |
| RRI evidence | `<base, modifiers, floors, dominant drivers, artifact>` |

For Low local delegation, resolve the placeholders literally as: Author
`devstral-small-2:24b-instruct-2512-q4_K_M`; 1st Reviewer
`gemma4:26b-a4b-it-qat`; 2nd Reviewer `gpt-oss:20b` with
`num_ctx=131072`. All use Ollama in separate contexts.

## 2. Scope and acceptance

- Objective: `<one sentence>`
- In scope: `<paths and behaviors>`
- Out of scope: `<explicit boundaries>`
- Acceptance:
  - `<observable success criterion>`
  - `<failure/edge criterion>`
- Evidence: `<commands and manual checks>`

## 3. Execution workflow

| Phase | Responsible | Gate/output |
|---|---|---|
| Scope and score | `<orchestrator>` | Frozen boundary + RRI evidence |
| 1st Reviewer — task analysis | `<reviewer or n/a>` | `PASS`, `REVISE`, or `BLOCKED` |
| Human approval | `<user or recorded bounded authorization>` | Scope authorization only |
| Implement | `<authoring context/model>` | In-scope candidate change |
| Verify | `<orchestrator>` | Exact project-local command/manual/device evidence |
| 2nd Reviewer — solution | `<independent reviewer or exemption>` | `PASS`, `REVISE`, or `BLOCKED` |
| Close | `<orchestrator>` | Outcome, evidence, residual risk, status sync |

```text
1st Reviewer / task analysis: <reviewer/context> - <PASS|REVISE|BLOCKED|n/a>
2nd Reviewer / solution: <reviewer/context> - <PASS|REVISE|BLOCKED|n/a>
```

For a local-model handoff, also record exact allowed paths, supplied context,
expected patch format and fallback if the adapter/model is unavailable. Both
reviewers are mandatory when the local developer authors a Low task, and the
local author cannot fill either role. Cloud is not an implicit Low fallback;
record `unavailable` and pause for rerouting. For ineligibility, state why.

## 4. Diagrams (approval card only)

Add a compact workflow or technical-boundary diagram only when it makes a
multi-step route, dependency direction, or state boundary materially easier to
approve. Never add more than two.

## 5. References (approval card only)

`Task: <path> | Plan: <path> | Governing: <only material docs>`

## 6. Approval (approval card only)

`Execution has not started. Approve this task to proceed.`

When a precise current request already authorizes the bounded task and the HITL
policy permits it, replace the line with:

`Authorization: current user request; no additional checkpoint required.`
<!-- END SOURCE: docs/workflow/TASK_CARD_TEMPLATE.md -->
