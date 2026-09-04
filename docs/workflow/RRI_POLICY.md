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
