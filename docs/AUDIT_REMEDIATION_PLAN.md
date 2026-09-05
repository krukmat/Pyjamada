# Audit Remediation Plan — Expressive Arcade Visual Refactor

## Purpose and current decision

This document turns the findings in `docs/AUDIT_REPORT.md` into small, dependency-ordered remediation tasks for `feat/expressive-arcade-visual-refactor` against `main`.

Current audit decision: **NOT READY TO MERGE**.

This is a plan only. It does not resolve a finding and it is not Android visual or performance evidence. Source-code fixes, merge, and PR creation require separate authorization.

## Scope and invariants

Every task must preserve these constraints:

- `src/game/systemic` remains the authoritative gameplay domain.
- The six-object / ten-rule contract does not change.
- Gameplay does not import presentation, renderer, React, Skia, or app-screen modules.
- `VisualEventMapper` remains the boundary from completed gameplay updates to semantic visual events.
- Rule IDs terminate at that boundary.
- Transient events, animation frames, FX, timestamps, and clips are never persisted.
- Restart clears transient presentation; continue reconstructs stable visuals from validated gameplay state.
- Settings and game saves remain independent.
- No parallel or compatibility gameplay path is introduced.
- Only original project assets are used.

Changing an invariant requires a separate architecture decision and is outside this remediation.

## Complexity policy

The estimates are relative engineering complexity, not commitments:

| Size | Intended scope | Typical uncertainty |
|---|---|---|
| XS | One local edit or one read-only verification, normally no more than half a day | Low |
| S | One cohesive behavior with focused tests, normally no more than one day | Low to moderate |
| M | Multiple behaviors, subsystems, or evidence types; must be split before execution | Moderate to high |
| L | Cross-cutting or open-ended work; must be split or replanned | High |

Execution rule: no task larger than **S** may start. If an S task exposes a second behavior, an unknown platform constraint, or changes more than one acceptance boundary, stop and create additional XS/S tasks before continuing.

## Workflow compliance contract

Engineering size and RRI are independent. `XS`/`S` bounds delivery scope; RRI
selects capability, approval and review. Execution surface is resolved a third
time from the work actually required. A Low task is therefore not automatically
a local-model task, and a small native build can still be High.

All tasks below are **pending**. Approval to maintain this plan is not approval
to execute its remediation tasks. Before starting one task, the orchestrator
must project its catalogue row and routing-ledger row into blocks 1–3 of
`docs/workflow/TASK_CARD_TEMPLATE.md`, replace planned paths with the exact
allowed paths, run `npm run rri -- ...`, and resolve current environment
readiness. Moderate tasks need an exact bounded authorization/card; High tasks
need task-analysis review and explicit human approval. Always-approval actions
in `docs/workflow/HITL_AUTONOMY_POLICY.md` remain separate.

The repository binding for eligible Low work is Ollama with local Devstral
(author), Gemma4 (1st Reviewer) and GPT-OSS 128K (2nd Reviewer). Each task must
precheck all three exact models. A missing model/service makes the local route
`unavailable` and pauses it for explicit rerouting; cloud is not an implicit
fallback and availability does not change RRI. Other tasks state ineligibility.

Planned scores use RRI v2 and the factor order `C/F/D/T/A/K/P/X`. There are no
quality modifiers. `native` means the `dependency_or_native` floor raised the
result to at least 41. Re-score before implementation when actual paths, a
factor, a risk, or T-04's selected mechanism changes; never silently inherit the
planned score.

Environment keys used by the routing ledger:

| Key | Required local stack and evidence |
|---|---|
| DOC | Repository and Git read/write only; record referenced evidence and run `git diff --check`. |
| NODE | Node `>=22.13.0`, installed project dependencies; focused check plus `npm run test:all` and `npm run typecheck`. Audit/tooling changes also run `npm run audit:premerge`. |
| APK | NODE + Java 17, Android SDK/AAPT2, generated `android/`, adb and a literal recorded ABI. Build with `NODE_ENV=production ./android/gradlew -p android :app:assembleRelease "-PreactNativeArchitectures=<ABI>" --no-daemon`; do not install missing tooling without approval. |
| DEVICE | APK + one recorded running emulator/device and Maestro; execute `npm run screenshots:android` and report PASS/FAIL/NOT RUN, never an inferred result. |
| PROFILE | DEVICE + the release-profile tool and protocol frozen by P-01; no performance claim without raw evidence attributable to one revision/device. |

Capability keys used by the routing ledger:

| Key | Capability route | Gate and review |
|---|---|---|
| L | Ollama: `devstral-small-2:24b-instruct-2512-q4_K_M` author; `gemma4:26b-a4b-it-qat` 1st; `gpt-oss:20b` (`num_ctx=131072`) 2nd | Eligible bounded work uses all three local roles in separate contexts; both reviewers must pass. Missing runtime/model blocks pending explicit reroute. |
| M | `gpt-5.6-terra` / medium | Exact bounded authorization/card; 1st Reviewer condition-based and fresh 2nd Reviewer for behavior or validation-tool changes. |
| H | `gpt-5.6-terra` / high | Mandatory fresh 1st Reviewer, explicit human approval and mandatory independent fresh 2nd Reviewer. |
| HS | `gpt-5.6-sol` / high | Same High gates; promoted because repository-wide context dominates. |

Planned distribution: **12 Low, 18 Moderate and 11 High** tasks (T-05 is
provisionally High), with no Complex aggregate task. This distribution is a
result of the task boundaries and evidence requirements, not the XS/S labels.

## Complexity assessment of the original plan

| Original task | Assessed complexity | Reason | Replacement |
|---|---:|---|---|
| R-00 Baseline and scope lock | S | One bounded audit checkpoint | B-00 |
| R-01 Repair Wally atlas | M | Mixed asset mutation, pixel proof, and Android packaging | A-01–A-03 |
| R-02 Harden real-asset validation | L | Cross-platform parser checks plus Android/CI integration | A-04–A-05 |
| R-03 Specify and test event ownership | M | Actor and six object channels have distinct contracts | E-01–E-02 |
| R-04 Implement channel-safe consumption | L | Mapper, two animators, type guards, and supersession policy | E-03–E-06 |
| R-05 Specify and test immutable FX origins | M | Contract design and multiple lifecycle regressions | F-01–F-02 |
| R-06 Implement immutable FX context | M | Event creation, storage, resolution, and cleanup | F-03–F-05 |
| R-07 Complete regression and architecture coverage | L | Objective, reconstruction, lifecycle, dependency, and app regression scopes | Q-01–Q-05 |
| R-08 Remove dead presentation surface | M | Event API cleanup and atlas cleanup are independent | C-01–C-03 |
| R-09 Harden Android screenshot evidence | L | Contract validation, output safety, scenario coverage, and timing | T-01–T-05 |
| R-10 Execute Android release and visual QA | L | Build, execution, visual inspection, and evidence reporting | V-01–V-05 |
| R-11 Measure and disposition INC-004 | L | Protocol design, profiling, interpretation, and possibly unknown optimization | P-01–P-03 plus conditional replanning |
| R-12 Final verification and re-audit | M | Automated verification, review, and report decision | Z-01–Z-03 |

The revised plan contains only XS and S tasks. The former 13 work packages are now 41 independently verifiable tasks. T-04 is intentionally a decision task and T-05 is its separately approved implementation boundary.

## Finding disposition

| Finding / incident | Severity | Planned disposition | Merge status |
|---|---:|---|---|
| FINDING-001 — Android-incompatible Wally atlas | High | Fix and add regression gates | Blocking |
| FINDING-002 — Event-channel ownership violations | High | Fix with channel-specific tests | Blocking |
| FINDING-003 — Mutable FX origins | Medium | Fix before final QA | Required |
| FINDING-004 — Validation gaps | Medium | Close essential automated and device-evidence gaps | Required |
| FINDING-005 — Dead semantic/clip surface | Low | Remove unused presentation surface | Required by this plan |
| INC-004 — React-level presentation ticker | S3 risk | Measure, then explicitly disposition | Decision required |
| Screenshot repeatability | Risk | Harden the evidence workflow | Required before final visual tour |
| Cold image readiness / visual readability | Unverified risk | Execute Android QA | Evidence required |

## Dependency map

Work may proceed in parallel only where this graph permits it.

```text
B-00
├── A-01 → A-02 → A-03 ───────────────┐
│             └→ A-04 → A-05 ─────────┤
├── E-01 ─┐                            │
│         ├→ E-03 → E-04 ─┐           │
├── E-02 ─┘                ├→ E-06 ─┐  │
│                          └→ E-05 ─┤  │
│                                   │  │
│   E-03 → F-01 → F-02 → F-03       │  │
│                         └→ F-04 → F-05
│                                   │  │
├── Q-04 ────────────────────────────┤  │
└── T-01 → T-02 ─────────────────────┤  │
                                    │  │
E-06 + F-05                         │  │
├── Q-01 → T-03 ────────────────────┤  │
├── Q-02 ────────────────────────────┤  │
├── Q-03 ────────────────────────────┤  │
└── T-04 → T-05 ──────────────────────┘  │
                                        │
Q-01 + Q-02 + Q-03 + Q-04 → Q-05       │
Q-05 → C-01 ─┐                          │
Q-05 → C-02 ─┴→ C-03 ──────────────────┤
                                        │
A-03 + A-05 + Q-05 + C-03 + T-02 + T-03 + T-05
└── V-01 → V-02 ─┬→ V-03 ─┐
                  └→ V-04 ─┴→ V-05

V-01 → P-01
V-02 + P-01 → P-02 → P-03

V-05 + P-03 → Z-01 → Z-02 → Z-03
```

The two blocking implementation paths are the asset path (`A-*`) and semantic presentation path (`E-*` plus `F-*`). Android execution starts only after both paths, regression coverage, cleanup, and evidence tooling are complete.

## Task catalogue

All tasks start with status **pending**. A task is complete only when its stated output and acceptance criterion exist.

### B — Baseline

| ID | Size | Depends on | Task and single output | Acceptance criterion |
|---|---:|---|---|---|
| B-00 | S | — | **done** — `docs/AUDIT_REMEDIATION_BASELINE.md` created with remediation start revisions, worktree state, `npm run audit:premerge` (PASS), feature-diff scope, and read-only readiness for Node/npm, PNG encoder, Java/Android SDK/AAPT2/adb, emulator, and the project-local model adapter/model. | Revisions, commands and versions are reproducible; unrelated changes are identified; every later execution surface is `ready`, `unavailable`, or `not required`; no tool is installed/started and no gameplay/save/settings semantic change is required. |

### A — Asset repair and packaging gates

| ID | Size | Depends on | Task and single output | Acceptance criterion |
|---|---:|---|---|---|
| A-01 | XS | B-00 | Losslessly re-encode only `assets/game/wally/wally.png` with an Android-compatible encoder. | The file remains a 240×168 RGBA PNG with the same frame layout; encoder parameters are recorded. |
| A-02 | XS | A-01 | Compare decoded pre/post atlas pixels and run the existing atlas-manifest checks. | Decoded RGBA pixels are identical and existing manifest validation passes. |
| A-03 | S | A-02 | Compile Wally, object, and FX PNGs through AAPT2 and run the repository's clean release build command for the ABI recorded in B-00. | Every PNG packages successfully and `:app:assembleRelease` produces a non-empty APK; the exact Java, SDK, ABI and command are recorded. |
| A-04 | S | A-02 | Extend the platform-neutral asset audit to decode committed PNGs and validate real dimensions, bounds, references, and duplicate IDs. | A real PNG/manifest mismatch or invalid frame fails with the asset path in the diagnostic. |
| A-05 | S | A-04 | Add `npm run audit:android-assets` as an explicit Android resource-compilation gate separate from the platform-neutral asset audit. | Reintroducing the original incompatible Wally blob fails `npm run audit:android-assets`; the neutral audit cannot masquerade as packaging validation. |

### E — Semantic event ownership

| ID | Size | Depends on | Task and single output | Acceptance criterion |
|---|---:|---|---|---|
| E-01 | S | B-00 | Add actor-channel contract tests for move interruption, latest-event replacement, and objective priority. | Old behavior reproduces the alarm-action→move defect; expectations use semantic channels, not rule IDs. |
| E-02 | S | B-00 | Add object-channel contract tests for actual target ownership, per-object coexistence, and same-object replacement. | Old behavior reproduces the alarm→wardrobe fumble defect and covers all eligible target objects. |
| E-03 | S | E-01, E-02 | Make `VisualEventMapper` emit explicit actor- and object-owned semantic reactions, including target identity where needed. | Mapper tests show every reaction on exactly its intended channel; gameplay and save types are unchanged. |
| E-04 | XS | E-03 | Restrict `WallyAnimator` to `actor:wally` plus the intentional objective channel. | Movement interrupts the older actor reaction and objective priority remains intact. |
| E-05 | XS | E-03 | Restrict `ObjectAnimator` to `object:<objectId>` and remove generic fumble inference. | No object consumes actor or another object's event; wardrobe animation requires a wardrobe-owned event. |
| E-06 | S | E-04, E-05 | Centralize channel predicates and replace the tautological supersession helper with explicit same-channel sequence semantics. | Same-clock ordering is deterministic; a new event replaces only the relevant channel; all E-series tests pass. |

### F — Immutable FX origins

| ID | Size | Depends on | Task and single output | Acceptance criterion |
|---|---:|---|---|---|
| F-01 | XS | E-03 | Define the presentation-only `VisualOrigin` contract and a documented event-to-origin matrix. | Actor, object, resource, noise, objective, and fumble FX each have one unambiguous origin rule. |
| F-02 | S | F-01 | Add fake-clock regression tests for alarm origin, cross-object actions, player-position capture, successive movement FX, and restart. | Tests reproduce teleporting FX against old behavior and never expect origin from a later `state.lastAction`. |
| F-03 | S | F-02 | Capture and store `VisualOrigin` when each FX-capable semantic event is created. | Every active FX event owns immutable origin data for its lifetime. |
| F-04 | XS | F-03 | Resolve FX frames only from captured origin and remove the current `state.lastAction` fallback. | Existing FX cannot move after a later gameplay action; `resolveFxFrames` no longer receives gameplay state if unused. |
| F-05 | XS | F-04 | Verify FX expiry, maximum active cardinality behavior, and reset cleanup with the fake clock. | Expired/restarted FX and origins disappear; all F-series tests pass without persistence changes. |

### Q — Regression and architecture coverage

| ID | Size | Depends on | Task and single output | Acceptance criterion |
|---|---:|---|---|---|
| Q-01 | S | E-06, F-05 | Cover `too-late`, `house-awake`, and `exhausted` presentation outcomes. | Each reason selects its intended actor clip, FX, and objective presentation. |
| Q-02 | S | E-06, F-05 | Cover stable reconstruction for every Wally state and all six objects. | Stable visuals reconstruct from gameplay state alone, with no persisted presentation data. |
| Q-03 | S | E-06, F-05 | Cover new game, restart, continue, expiry, same-timestamp collisions, and stacked FX lifecycle. | Restart clears transients, continue derives stable state, and ordering/expiry are deterministic. |
| Q-04 | XS | B-00 | Extend dependency checks so gameplay rejects presentation, renderer, React/Skia, and app-screen imports. | A fixture import from each forbidden layer fails the boundary audit. |
| Q-05 | XS | Q-01, Q-02, Q-03, Q-04 | Run focused and full regression checks for HUD, settings, controls, save codec, gameplay, types, and audit suite. | `npm run test:all`, `npm run typecheck`, and `npm run audit:premerge` pass with no behavior change outside presentation. |

### C — Dead presentation surface

| ID | Size | Depends on | Task and single output | Acceptance criterion |
|---|---:|---|---|---|
| C-01 | S | Q-05 | Remove unused `WALLY_STATE_STABLE`, `ENERGY_LOSS`, and `NO_TARGET` presentation types/mappings only. | Every remaining visual event has a tested consumer or documented runtime purpose; gameplay/HUD events remain intact. |
| C-02 | XS | Q-02, Q-05 | Remove unreachable `wardrobe_opening`, `wardrobe_open`, and `keys_idle` production clips. | No reachable stable/transient state references the removed clips and atlas validation passes. |
| C-03 | XS | C-01, C-02 | Run event-consumer and clip-reachability validation after cleanup. | Every production event and clip is reachable or explicitly justified; full required checks remain green. |

### T — Screenshot evidence tooling

| ID | Size | Depends on | Task and single output | Acceptance criterion |
|---|---:|---|---|---|
| T-01 | S | B-00 | Validate YAML screenshot names against runner expectations in both directions. | Missing, extra, duplicate, or renamed screenshots fail with exact names. |
| T-02 | S | T-01 | Stage each evidence run in a temporary directory and publish it only after complete build/tour success. | A failed run preserves the last successful evidence set and records the failed attempt separately. |
| T-03 | S | Q-01 | Update `maestro/screenshots.yaml`, its expected-name contract and `docs/ANDROID_SMOKE_TEST.md` with success and all three failure outcomes while retaining Wally, six-object, menu, HUD, controls, settings, restart, and continue checkpoints. | Flow, runner and documentation agree on one uniquely named checkpoint for every required outcome. |
| T-04 | XS | E-06, F-05 | Select exactly one transient-capture mechanism and document its readiness signal, clock/timing contract, production isolation, planned paths, failure behavior and recalculated T-05 RRI in `docs/ANDROID_SMOKE_TEST.md`. | The decision rejects the other alternatives with evidence and leaves no unresolved implementation branch; an app/runtime hook is explicitly test-only and disabled in normal builds. |
| T-05 | S | T-04 | Implement only the transient-capture contract selected by T-04. | Every transient checkpoint has a repeatable trigger and machine-observable readiness condition; default application timing/behavior is unchanged and the selected failure case is covered. |

### V — Android release and visual QA

| ID | Size | Depends on | Task and single output | Acceptance criterion |
|---|---:|---|---|---|
| V-01 | XS | A-03, A-05, Q-05, C-03, T-02, T-03, T-05 | Build the final candidate release APK and record revision, target, ABI, Android version, and build type. | Clean release build passes on the exact recorded candidate HEAD. |
| V-02 | S | V-01 | Execute `npm run screenshots:android` without modifying the candidate during the run. | The complete tour succeeds and every expected screenshot is present; otherwise status is NOT EXECUTED/FAILED, never inferred. |
| V-03 | S | V-02 | Review atlas readiness, Wally readability, six objects, reaction causality, stacked FX, and screen shake. | Each checkpoint has a recorded pass or concrete defect; no blank-atlas or misplaced-reaction issue is unresolved. |
| V-04 | S | V-02 | Review HUD hierarchy, controls, settings, new game, restart, continue, success, and three failures. | Each flow has a recorded pass or concrete defect; subjective preferences are separated from policy/usability defects. |
| V-05 | XS | V-03, V-04 | Consolidate the immutable Android evidence ledger for the reviewed revision. | Evidence identifies device, revision, scenario, screenshot, reviewer result, and unresolved defect links. |

If no Android target is available, V-02 through V-05 remain **NOT EXECUTED** and the branch cannot pass final remediation.

### P — INC-004 performance decision

| ID | Size | Depends on | Task and single output | Acceptance criterion |
|---|---:|---|---|---|
| P-01 | S | V-01 | Define a release-profile protocol for idle, movement, first alarm, stacked alarm/wardrobe chaos, and objective beats. | Protocol fixes device/build/tooling and records JS/render work, frame pacing, touch response, cold readiness, and peak FX count. |
| P-02 | S | V-02, P-01 | Capture the protocol once on the final candidate without changing code during measurement. | Raw evidence is attributable to one revision/device and covers every scenario; missing data is marked, not invented. |
| P-03 | S | P-02 | Interpret results and record exactly `ACCEPT`, `FOLLOW-UP`, or `FIX BEFORE MERGE` for INC-004. | The decision cites measured evidence and evaluates the 80 ms ticker against observed behavior rather than a generic target. |

If P-03 returns **FIX BEFORE MERGE**, do not begin an open-ended optimization under P-03. Create a new micro-plan of XS/S tasks from the observed bottleneck, implement only the measured fix, then repeat V-01 through P-03. A likely hybrid—keeping semantic lifetimes in pure TypeScript while moving only continuous clock/frame/shake work—remains a hypothesis until profiling supports it.

### Z — Closure

| ID | Size | Depends on | Task and single output | Acceptance criterion |
|---|---:|---|---|---|
| Z-01 | S | V-05, P-03, any conditional INC-004 tasks | Run `npm run test:all`, `npm run typecheck`, `npm run audit:premerge`, `npm run screenshots:android`, and `git diff --check main...HEAD` on one unchanged HEAD. | Every command passes on the same recorded revision and Android evidence belongs to it. |
| Z-02 | S | Z-01 | Re-review the complete diff against `main`, including remediation, gameplay isolation, persistence, settings, and dead code. | Every original finding has direct code/test/evidence disposition and no remediation regression is open. |
| Z-03 | XS | Z-02 | Update `docs/AUDIT_REPORT.md` with resolution evidence, INC-004 disposition, residual risks, and final decision. | Report concludes with exactly `READY TO MERGE`, `READY AFTER FIXES`, or `NOT READY TO MERGE`, justified by completed gates. |

## Task routing ledger

This ledger is the compact task-card projection for the planned state. Score
evidence is `final capability-key (base; optional floor) · C/F/D/T/A/K/P/X`.
The calculator output, not the table arithmetic, controls. `Primary` means the
orchestrating Codex/Claude context at the listed capability; `repo tooling`,
`device` and `profile` are execution surfaces, not model substitutions.

### Baseline and assets

| ID | Planned RRI evidence | Primary execution and planned boundary | Local developer | Environment and verification |
|---|---|---|---|---|
| B-00 | `13 L (base 13) · 0/0/1/0/1/1/0/3` | Primary; read-only repository/toolchain inventory and `docs/AUDIT_REMEDIATION_BASELINE.md`. | Ineligible — broad audit baseline and environment classification. | DOC + readiness probes + `npm run audit:premerge`. |
| A-01 | `17 L (base 17) · 0/0/1/1/0/1/2/1` | Repo asset tool; only `assets/game/wally/wally.png`, with original blob retained for comparison. | Ineligible — binary asset transformation is not a candidate text patch. | B-00-approved lossless encoder; dimensions/mode and encoder parameters recorded. |
| A-02 | `15 L (base 15) · 0/1/1/0/0/1/2/1` | Repo tooling; decoded pre/post bytes and existing manifest checks, no production edit. | Ineligible — verification-only task. | NODE + pixel-diff command recorded + `npm run test:presentation`. |
| A-03 | `41 H (base 35; native floor) · 0/1/3/1/0/3/3/2` | APK/resource tooling; the three committed atlases and generated Android build only. | Ineligible — native build/device toolchain. | APK; direct AAPT2 probes + recorded `:app:assembleRelease`; no visual claim. |
| A-04 | `29 M (base 29) · 1/2/1/1/1/2/2/2` | Primary; `scripts/audit-assets.mjs`, focused tests and `package.json` command only. | Ineligible — Moderate validation-tool design exceeds Low delegation. | NODE; negative corrupt/mismatch fixtures + `npm run audit:premerge`. |
| A-05 | `41 H (base 33; native floor) · 1/1/2/1/1/3/2/2` | Primary + APK tooling; Android asset-audit script and `package.json` command only. | Ineligible — native packaging gate and High route. | APK; `npm run audit:android-assets` negative blob fixture + `npm run audit:premerge`. |

### Semantic presentation, FX and regression

| ID | Planned RRI evidence | Primary execution and planned boundary | Local developer | Environment and verification |
|---|---|---|---|---|
| E-01 | `25 L (base 25) · 2/0/2/0/1/2/1/2` | Local Devstral; actor-channel cases in `tests/presentation.test.ts` only. | Policy-eligible / configured — fixed L bundle; runtime precheck required, otherwise blocked for reroute. | NODE; focused failing-old/passing-new test + ordinary required checks. |
| E-02 | `25 L (base 25) · 2/0/2/0/1/2/1/2` | Local Devstral; object-channel cases in `tests/presentation.test.ts` only. | Policy-eligible / configured — fixed L bundle; runtime precheck required, otherwise blocked for reroute. | NODE; all eligible object targets covered + ordinary required checks. |
| E-03 | `45 H (base 45) · 2/2/2/1/1/4/3/3` | Primary; `VisualEvent`, mapper, runtime and focused tests; no systemic/save types. | Ineligible — High coupled event-contract implementation. | NODE; E-series focused tests + `npm run audit:premerge`. |
| E-04 | `34 M (base 34) · 1/1/2/1/0/3/3/2` | Primary; `WallyAnimator` and focused tests only. | Ineligible — Moderate user-visible behavior change. | NODE; interruption/objective edge tests + ordinary required checks. |
| E-05 | `34 M (base 34) · 1/1/2/1/0/3/3/2` | Primary; `ObjectAnimator` and focused tests only. | Ineligible — Moderate user-visible behavior change. | NODE; cross-object negative tests + ordinary required checks. |
| E-06 | `45 H (base 45) · 2/2/2/1/1/4/3/3` | Primary; presentation channel predicates, runtime/animators and tests only. | Ineligible — High lifecycle/coupling change. | NODE; same-clock and per-channel tests + `npm run audit:premerge`. |
| F-01 | `28 M (base 28) · 0/1/2/0/1/3/2/2` | Primary; presentation-only `VisualOrigin` type and `docs/PRESENTATION_POLICY.md` matrix. | Ineligible — contract/policy definition and Moderate route. | NODE; typecheck and matrix-to-event completeness test. |
| F-02 | `23 L (base 23) · 2/0/2/0/0/2/1/2` | Local Devstral; fake-clock regressions in one test file. | Policy-eligible / configured — fixed L bundle; runtime precheck required, otherwise blocked for reroute. | NODE; old behavior must reproduce before production fix + ordinary checks after handoff. |
| F-03 | `45 H (base 45) · 2/2/2/1/1/4/3/3` | Primary; presentation event/mapper/runtime context plus focused tests. | Ineligible — High event-lifecycle implementation. | NODE; immutable-origin tests + `npm run audit:premerge`. |
| F-04 | `38 M (base 38) · 2/2/2/1/0/3/3/2` | Primary; `FxSystem`, `GameCanvas` call boundary and focused tests. | Ineligible — Moderate renderer/presentation behavior change. | NODE; later-action negative tests + ordinary required checks. |
| F-05 | `23 L (base 23) · 2/0/2/0/0/2/1/2` | Local Devstral; fake-clock lifecycle tests only. | Policy-eligible / configured — fixed L bundle; runtime precheck required, otherwise blocked for reroute. | NODE; expiry/cardinality/reset edges + ordinary required checks. |
| Q-01 | `28 M (base 28) · 2/0/2/0/1/2/2/2` | Primary; presentation outcome tests only. | Ineligible — Moderate multi-outcome domain reasoning. | NODE; all three failure reasons + success regression. |
| Q-02 | `28 M (base 28) · 2/0/2/0/1/2/2/2` | Primary; stable reconstruction tests only. | Ineligible — Moderate six-object/state matrix. | NODE; every Wally state and six objects + ordinary checks. |
| Q-03 | `31 M (base 31) · 2/0/2/0/1/3/2/2` | Primary; presentation lifecycle/collision tests only. | Ineligible — Moderate lifecycle coupling. | NODE; restart/continue/expiry/collision/stacked FX + ordinary checks. |
| Q-04 | `19 L (base 19) · 1/1/1/0/0/2/1/2` | Local Devstral; `scripts/audit-static.sh` and isolated negative fixtures. | Policy-eligible / configured — fixed L bundle; runtime precheck required, otherwise blocked for reroute. | NODE; each forbidden import fixture fails + `npm run audit:premerge`. |
| Q-05 | `20 L (base 20) · 0/0/1/0/0/2/1/5` | Repo tooling; unchanged working revision, no source edit. | Ineligible — verification-only repository-wide task. | NODE; exact three commands in its acceptance criterion. |

### Cleanup and screenshot tooling

| ID | Planned RRI evidence | Primary execution and planned boundary | Local developer | Environment and verification |
|---|---|---|---|---|
| C-01 | `37 M (base 37) · 1/2/2/1/1/3/2/3` | Primary; unused presentation event declarations/mappings and tests only. | Ineligible — Moderate API cleanup across coupled files. | NODE; event-consumer reachability + `npm run audit:premerge`. |
| C-02 | `28 M (base 28) · 1/1/2/1/0/3/1/2` | Primary; production manifest clips and focused tests only. | Ineligible — Moderate atlas contract cleanup. | NODE; clip-reference negative search and manifest tests. |
| C-03 | `18 L (base 18) · 0/0/1/0/0/2/1/4` | Repo tooling; reachability and full checks, no source edit. | Ineligible — verification-only task. | NODE; consumer/clip audit + `npm run audit:premerge`. |
| T-01 | `26 M (base 26) · 1/2/1/1/1/2/1/2` | Primary; screenshot contract checker, runner/YAML inputs and tests. | Ineligible — Moderate evidence-tool behavior. | NODE; missing/extra/duplicate/rename negative fixtures + audit checks. |
| T-02 | `33 M (base 33) · 2/1/1/2/1/3/1/2` | Primary; atomic evidence staging in runner and focused tests. | Ineligible — Moderate filesystem/evidence lifecycle behavior. | NODE; forced-failure preservation test + `npm run audit:premerge`; no material deletion. |
| T-03 | `32 M (base 32) · 1/2/1/2/1/2/2/2` | Primary; Maestro flow, expected-name contract and Android smoke documentation. | Ineligible — Moderate multi-scenario evidence design. | NODE; static flow/name/documentation contract; device execution remains V-02. |
| T-04 | `31 M (base 31) · 0/0/1/2/2/2/2/3` | Primary; one decision recorded in `docs/ANDROID_SMOKE_TEST.md`, no implementation. | Ineligible — evidence-design decision and documentation. | DOC + `npm run rri -- --json ...` for exact T-05 paths; status blocks T-05 until PASS. |
| T-05 | `42 H provisional (base 42) · 2/2/2/2/1/3/2/3` | Primary; only the runner/YAML/test paths selected by T-04. | Ineligible — High timing/evidence coupling. | NODE + contract failure test + audit checks. Re-score after T-04; an app/runtime hook starts at RRI 50 and must be split if it crosses a second acceptance boundary. |

### Android evidence, performance and closure

| ID | Planned RRI evidence | Primary execution and planned boundary | Local developer | Environment and verification |
|---|---|---|---|---|
| V-01 | `41 H (base 35; native floor) · 0/0/3/1/0/3/3/3` | APK tooling on one recorded candidate HEAD; build only. | Ineligible — native release build. | APK; non-empty release APK and immutable revision ledger. |
| V-02 | `41 H (base 39; native floor) · 0/1/2/2/1/3/3/3` | Device/GUI + repo tooling on V-01 HEAD; no edits during run. | Ineligible — device execution and native evidence. | DEVICE; `npm run screenshots:android` with exact expected set. |
| V-03 | `34 M (base 34) · 0/0/2/2/1/2/3/3` | Human/Primary visual review of immutable screenshots and, when needed, live device. | Ineligible — subjective visual/device review. | DEVICE evidence from V-02; checkpoint-by-checkpoint ledger. |
| V-04 | `34 M (base 34) · 0/0/2/2/1/2/3/3` | Human/Primary UX flow review of immutable evidence. | Ineligible — subjective UX/device review. | DEVICE evidence from V-02; flow-by-flow ledger. |
| V-05 | `14 L (base 14) · 0/0/0/1/0/1/1/3` | Primary; `docs/AUDIT_ANDROID_EVIDENCE.md` synthesis only. | Ineligible — broad evidence synthesis, not a bounded code patch. | DOC; all ledger references resolve to V-02 artifacts/revision. |
| P-01 | `31 M (base 31) · 0/0/1/2/2/2/2/3` | Primary + human reviewer; freeze protocol in `docs/PERFORMANCE_REVIEW_NOTES.md`. | Ineligible — profiling design/ADR-like decision. | DOC; tool/device/scenario/metric/failure fields complete before capture. |
| P-02 | `43 H (base 43; native floor active) · 0/0/2/3/1/4/3/3` | Device/profile tooling only; one unchanged candidate. | Ineligible — native profiling and device operation. | PROFILE; raw attributable output for every scenario or explicit missing data. |
| P-03 | `38 M (base 38) · 0/0/2/2/2/2/3/4` | Primary + human reviewer; evidence interpretation only. | Ineligible — broad performance synthesis/decision. | DOC + P-02 raw evidence; exact three-valued disposition. |
| Z-01 | `41 HS (base 35; native floor) · 0/0/2/1/0/3/3/5` | Repo tooling + device on one immutable HEAD. | Ineligible — repository-wide/native verification-only task. | NODE + DEVICE; exact commands in Z-01, each independently recorded. |
| Z-02 | `48 HS (base 48) · 0/3/3/1/1/4/3/5` | Fresh Primary reviewer + human review of complete diff/evidence. | Ineligible — repository-wide independent review. | DOC; `git diff main...HEAD`, finding traceability and invariant checklist. |
| Z-03 | `24 L (base 24) · 0/0/1/1/1/1/2/4` | Primary; update only `docs/AUDIT_REPORT.md` from completed evidence. | Ineligible — audit synthesis/final decision. | DOC; report links every finding and does not infer skipped device/profile evidence. |

For every `policy-eligible / configured` row, Devstral receives only exact
paths/content, acceptance and patch contract. Gemma4 must pass the analysis in
a fresh local context before handoff; GPT-OSS 20B at `num_ctx=131072` must pass
the verified solution in a separate local context before closure. The Primary
validates/applies the patch and runs checks. No local role receives approval,
repository-wide discovery, device control or completion authority.

## Next task card — B-00

This expanded card is the ready-to-present form of the first task. Later tasks
use the same projection immediately before their execution.

### 1. Decision

`B-00 | done | RRI 13 Low | Effort S | approved and executed`

| Route | Resolved value |
|---|---|
| Orchestrator | Primary Codex/Claude session. |
| Capability route | Primary orchestration only — B-00 was non-delegable documentation, so the Low local-model bundle was n/a. |
| Primary execution | Primary agent + repository-local read-only tooling. |
| Local developer | Ineligible — baseline/audit synthesis is excluded from local patch delegation. |
| Required environment | Repository shell; Git, Node/npm and read-only tool readiness probes; no device required; `npm run audit:premerge`. |
| 1st Reviewer — task analysis | n/a; B-00 is not delegated to a local developer. |
| 2nd Reviewer — solution | n/a; Primary self-check plus reproducibility checks is verification, not independent review. |
| Escalation | Missing tool/service is recorded `unavailable`; do not install or start it. New mutation/risk/path requires a new task and RRI. |
| RRI evidence | Base/final 13; no modifier/floor; `C/F/D/T/A/K/P/X = 0/0/1/0/1/1/0/3`; dominant context, domain/tool classification and coupling. |

### 2. Scope and acceptance

- Objective: freeze the exact remediation starting point and execution-surface readiness without changing product or tooling state.
- In scope: read Git revisions/status/diff, run `npm run audit:premerge`, inspect command/version readiness, and create only `docs/AUDIT_REMEDIATION_BASELINE.md`.
- Out of scope: source/assets/config changes, dependency or SDK installation, starting Ollama/emulators/services, Android build/tour, finding remediation, commit/push/PR.
- Acceptance:
  - baseline records literal commands, versions/results, feature/base revisions, diff scope, unrelated worktree changes and PASS/FAIL for the audit command;
  - PNG encoder, Java/Android SDK/AAPT2/adb, emulator, Maestro and local-model adapter/model are each `ready`, `unavailable`, or `not required`, never inferred;
  - a missing command or stopped service is evidence, not permission to install/start it.
- Evidence: `git status --short`, literal revision/diff commands recorded by the task, command/version probes, `npm run audit:premerge`, and no matches from `rg -n '[ \t]+$' docs/AUDIT_REMEDIATION_BASELINE.md`.

### 3. Execution workflow

| Phase | Responsible | Gate/output |
|---|---|---|
| Scope and score | Orchestrator | Exact single output path + fresh RRI JSON. |
| 1st Reviewer — task analysis | n/a | Low-band self-check; B-00 is not local-developer work. |
| Human approval | User | A future clear request to execute B-00; this plan-maintenance request does not authorize it. |
| Implement | Primary | One baseline Markdown artifact; no delegated or external mutation. |
| Verify | Primary | Reproducibility, audit command and diff whitespace check. |
| 2nd Reviewer — solution | n/a | Primary self-check is recorded under verification, never as independent review. |
| Close | Orchestrator | Evidence summary, unavailable surfaces, residual blockers and status sync. |

B-00 is complete. Output: `docs/AUDIT_REMEDIATION_BASELINE.md` (`npm run
audit:premerge` PASS; no source/asset/config change; no tool/service
installed or started). Self-review: `PASS`. Later tasks (A-*, E-*, ...)
still each require their own separate authorization.

## Recommended execution batches

These are coordination batches, not larger implementation tasks. Each task remains independently reviewed and completed.

1. **Baseline:** B-00.
2. **Parallel foundations:** asset tasks A-01–A-05; event-contract tasks E-01–E-02; dependency task Q-04; tooling tasks T-01–T-02.
3. **Semantic correction:** E-03–E-06, then F-01–F-05.
4. **Coverage and cleanup:** Q-01–Q-03, Q-05, C-01–C-03, T-03–T-05.
5. **Android evidence:** V-01–V-05 and P-01–P-03.
6. **Closure:** Z-01–Z-03.

Each handed-off task keeps the ordinary required checks green. A temporarily failing regression test may prove a defect locally, but no intentionally red intermediate change set is handed off. No merge or PR is part of this plan unless separately authorized.

## Merge gates and exit criteria

The branch remains **NOT READY TO MERGE** until Z-03 completes.

Mandatory gates:

- FINDING-001 and FINDING-002 are fixed and verified.
- FINDING-003 and the essential FINDING-004 gaps are fixed and verified.
- FINDING-005 is closed under the removal policy above.
- Android release build and visual QA complete on the final reviewed HEAD.
- INC-004 has an evidence-backed disposition; `FIX BEFORE MERGE` has completed its additional remediation loop.
- All automated and Android checks pass on the same unchanged revision.
- Defects, residual risks, accepted trade-offs, and future improvements remain separately classified in the final audit report.

Only then may the audit decision change. A deferred non-blocking risk must record owner, rationale, and follow-up before any merge-ready conclusion.
