# Audit Remediation Baseline — B-00

Status: **done**. Read-only checkpoint. No source, asset, config, dependency
or service state was changed to produce this document.

## Revisions

| Ref | Revision |
|---|---|
| Feature branch HEAD (`feat/expressive-arcade-visual-refactor`) | `bcb9dd6dc282b2409946e11b37c0858db8e437f3` |
| Base (`main`) | `2d53246bec1c34458c389928691a8fc23a1dbb6c` |

Command used: `git rev-parse HEAD` / `git rev-parse main`.

## Worktree state

`git status --short` at baseline time:

```text
?? docs/AUDIT_REMEDIATION_PLAN.md
```

One untracked file, the remediation plan itself (this task's sibling
document). No other unrelated worktree changes are present. This file
(`docs/AUDIT_REMEDIATION_BASELINE.md`) did not exist before this task.

## Feature-diff scope

`git diff main...HEAD --stat` reports 56 changed files, +5913/-410 lines,
matching the audit's recorded scope in `docs/AUDIT_REPORT.md` and
`docs/AUDIT_CHANGESET.md`. No re-derivation performed here; this baseline only
confirms the diff boundary is unchanged since the audit was written.

## `npm run audit:premerge` — PASS

Full run executed at baseline time. Summary of stages, all green:

- `test:game`, `test:presentation`, `test:app`, `test:agent-instructions`,
  `test:rri` (Node test runner suites) — all pass.
- `agent:check` (`sync-agent-instructions.mjs --check`) — synchronized, no
  drift.
- `typecheck` (`tsc --noEmit`) — no errors.
- `audit:static` (`scripts/audit-static.sh`) — shell syntax, gameplay→
  presentation dependency boundary, legacy renderer removal, screenshot audit
  contract, and presentation-policy/incident-log checks all pass.

Exact command: `npm run audit:premerge`. Result: **PASS**, no failures, no
skipped stage.

## Execution-surface readiness

Probed read-only; nothing installed, started, or upgraded.

| Surface | Status | Evidence |
|---|---|---|
| Node / npm | ready | Node `v22.23.0`, npm `10.9.8` (`node --version`, `npm --version`); satisfies the `>=22.13.0` NODE key requirement. |
| PNG encoder (for A-01) | ready | Node runtime PNG decode/encode already exercised by `scripts/validate-png-assets.mjs`; no external encoder binary required beyond Node. |
| Java | ready (version note) | `java -version` → OpenJDK `26.0.1` (Homebrew) on `PATH` via `/opt/homebrew/opt/openjdk/bin/java`. The routing ledger's APK key names "Java 17" as the reference toolchain; this environment resolves a newer OpenJDK instead. Treat as **ready with a version discrepancy to verify**, not silently assumed compatible — A-03 must record actual build success or failure with this exact toolchain, not assume Java 17 parity. |
| Android SDK / AAPT2 / adb | ready | SDK root `/opt/homebrew/share/android-commandlinetools` (both `ANDROID_HOME` and `ANDROID_SDK_ROOT` set). `aapt2` present under `build-tools/{34.0.0,35.0.0,36.0.0}/aapt2`. `adb` present at `platform-tools/adb`. Generated `android/` project exists with executable `android/gradlew`. |
| Emulator / device | ready | `adb devices` lists one attached device: `emulator-5554`. `getprop ro.build.version.release` → `14`; `getprop ro.product.cpu.abi` → `arm64-v8a`. Already running; this baseline did not start it. |
| Maestro | not verified here | Not probed in this pass; `scripts/android-screenshots.sh` / `maestro/screenshots.yaml` presume its presence. T-01/T-02/V-02 must confirm directly before relying on it. |
| Local model adapter/model (Low bundle) | ready | `ollama` binary present (`/usr/local/bin/ollama`). `ollama list` shows all three exact pinned models: `devstral-small-2:24b-instruct-2512-q4_K_M`, `gemma4:26b-a4b-it-qat`, `gpt-oss:20b`. Per this task's explicit authorization, the Low bundle is available but **not used** — all remediation implementation in this pass is authored directly by the primary agent, no local-model delegation. |

No command in this list was installed, upgraded, or started as part of B-00.
The emulator and Ollama were already running/present when probed.

## Scope note carried forward

This baseline supersedes the routing-ledger assumption in
`docs/AUDIT_REMEDIATION_PLAN.md` that Android/device/profiling evidence would
be `NOT EXECUTED` for lack of a target. A working emulator and full native
toolchain are present, so V-01–V-05 and P-01–P-03 are in scope for this
remediation pass, subject to their own task-by-task RRI, review gates, and
explicit human approval before closure — this baseline does not itself
authorize their execution.

## Acceptance check

- Revisions, commands, and versions above are reproducible from the exact
  commands cited.
- No unrelated worktree change is present beyond the sibling plan document.
- Every execution surface is classified `ready` (with one noted version
  discrepancy to verify, not assumed), never silently inferred.
- No tool was installed, and no emulator/service was started, by this task.
- No gameplay, save, or settings semantic change was made or required.

RRI: `13 Low (base 13) · C/F/D/T/A/K/P/X = 0/0/1/0/1/1/0/3`. Dominant
drivers: `X` (context breadth across toolchain/service probes), `D`
(environment/domain classification), `K` (read-only coupling to multiple
subsystems). No modifier, no risk floor.

1st Reviewer / task analysis: n/a — baseline/audit synthesis is not delegated
to a local developer.
2nd Reviewer / solution: n/a — primary self-check plus reproducibility of the
cited commands is recorded as verification, not independent review.
Verification: `npm run audit:premerge` — PASS. `git status --short` — clean
except the pre-existing untracked plan document.
