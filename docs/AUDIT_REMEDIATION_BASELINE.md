# Audit Remediation Baseline (B-00)

Read-only baseline for `docs/AUDIT_REMEDIATION_PLAN.md`. No source, asset,
config, dependency, or service state was changed to produce this record.

## Revisions

| Item | Value |
|---|---|
| Feature branch | `feat/expressive-arcade-visual-refactor` |
| Feature HEAD | `b007fc3214a1e5456900ffab741eedef7cda4933` |
| Base branch | `main` |
| Merge-base (`main`...HEAD) | `2d53246bec1c34458c389928691a8fc23a1dbb6c` |

Command used:

```bash
git rev-parse HEAD
git branch --show-current
git merge-base main HEAD
```

## Worktree state

`git status --short` at baseline time:

```text
 M AGENTS.md
 M CLAUDE.md
 M README.md
 M package.json
?? AGENTS.override.md
?? docs/AUDIT_REMEDIATION_PLAN.md
?? docs/AUDIT_REPORT.md
?? docs/workflow/
?? scripts/agent-instructions.test.mjs
?? scripts/rri.mjs
?? scripts/rri.test.mjs
?? scripts/sync-agent-instructions.mjs
```

These are unrelated worktree changes: workflow/RRI/audit-governance
documentation and tooling added for the audit process itself, not part of the
expressive-arcade-visual-refactor feature diff and not modified by B-00.

## Feature diff scope (`main...HEAD`)

`git diff --stat main...HEAD` reports **43 files changed, 3153
insertions(+), 410 deletions(-)**, spanning presentation runtime
(`src/game/render/GameCanvas.tsx`, `PixelArtKit.tsx` removed,
`VisualLanguage.ts`), new presentation tests (`tests/presentation.test.ts`),
and related atlas/manifest and app-shell files. This matches the scope
`docs/AUDIT_REPORT.md` was written against; no additional feature-diff
scope was discovered.

## `npm run audit:premerge`

**Result: PASS** (exit code 0).

Covers, in order: `test:all` (game/settings/presentation suites plus
`scripts/agent-instructions.test.mjs`), `agent:check` (no instruction
drift), `typecheck` (`tsc --noEmit`, clean), and `audit:static`
(`scripts/audit-static.sh`: shell syntax, gameplay→presentation dependency
boundary, legacy renderer removal, screenshot audit contract, presentation
policy/incident log — all passed).

## Execution-surface readiness

| Surface | Status | Evidence |
|---|---|---|
| Node/npm | ready | `node --version` → `v22.23.0` (meets `>=22.13.0`); project dependencies installed (`audit:premerge` ran clean) |
| Java | ready | `java -version` → OpenJDK `26.0.1` (Homebrew) |
| Android SDK / AAPT2 | ready | `$ANDROID_HOME=/opt/homebrew/share/android-commandlinetools`; build-tools `34.0.0`, `35.0.0`, `36.0.0` present; `aapt2` binary confirmed at `build-tools/36.0.0/aapt2` (not on shell `PATH` by default — invoke via full path or `$ANDROID_HOME`) |
| Generated `android/` project | ready | `android/` directory present in the worktree |
| adb | ready | `adb` resolves to `android-commandlinetools/platform-tools/adb` |
| Emulator | ready | `adb devices` lists one attached device: `emulator-5554` (state `device`) |
| Maestro | ready | `maestro` resolves at `/opt/homebrew/bin/maestro` |
| PNG encoder | partially ready | No dedicated CLI encoder (`pngcrush`, `optipng`, `pngquant`, `zopflipng`) found on `PATH`; Python `Pillow 11.3.0` is available and can perform a lossless re-encode for A-01. Record as `ready (Pillow)`, not `unavailable`, since a lossless-capable encoder exists — but A-01 must record which one it actually uses. |
| Local-model adapter/model | ready (unconfirmed as project-authorized) | Ollama service reachable at `127.0.0.1:11434` with model `qwen3.8:27b-mlx` loaded. This is host-level availability only — `docs/AUDIT_REMEDIATION_PLAN.md` states no *project-local model selection* is configured as of publication. Until a task explicitly records this adapter/model as the authorized route, `policy-eligible / unavailable` rows in the routing ledger remain unavailable by policy, not by host readiness. |

No tool was installed and no service (emulator, Ollama) was started by this
task; all of the above were already running or already present in the
environment.

## B-00 acceptance check

- [x] Baseline records literal commands, versions/results, feature/base
      revisions, diff scope, and unrelated worktree changes.
- [x] `npm run audit:premerge` recorded PASS/FAIL (PASS).
- [x] Every execution surface is recorded `ready`, `unavailable`, or
      `not required` — none inferred. Two surfaces (PNG encoder,
      local-model adapter) needed a qualified status; both are stated
      explicitly above rather than rounded to a plain `ready`/`unavailable`.
- [x] No source/asset/config change, no install, no service start.

## Solution review (self-review, Low band)

`PASS` — scope stayed read-only; single output file
(`docs/AUDIT_REMEDIATION_BASELINE.md`); no gameplay, presentation, save, or
settings semantic change; no independent review required at RRI 13 Low.

## Residual notes for later tasks

- **A-05 / A-03 routing note:** the plan's routing ledger marks `A-03`/`A-05`
  with the `native` floor partly because AAPT2/Android tooling was assumed
  unavailable at publication. This baseline shows AAPT2, the Android SDK,
  an emulator, and Maestro are all actually present and running in this
  environment. This does not change RRI (native floor is categorical, not
  conditioned on tool presence) but it does mean the `DEVICE`/`APK`
  environment keys can likely be satisfied without new tool installation —
  re-confirm at the start of A-03/A-05/V-01 rather than assuming
  unavailability from the plan text.
- **Local-model routes (E-01, E-02, F-02, F-05, Q-04):** an Ollama instance
  with a loaded model exists on the host, but no task in this plan has yet
  recorded it as the project's authorized adapter/model per
  `docs/workflow/AGENT_WORKFLOW_GUIDE.md`. Treat these rows as
  `policy-eligible / unavailable` until a task does that recording
  explicitly; do not silently start using the host Ollama instance as if it
  were pre-authorized.

`Execution has not started` no longer applies to B-00 — B-00 is complete.
Subsequent tasks (A-*, E-*, ...) still require their own separate
authorization per `docs/workflow/HITL_AUTONOMY_POLICY.md`.
