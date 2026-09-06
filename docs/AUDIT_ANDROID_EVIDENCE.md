# Android Release Evidence Ledger

This is the immutable evidence record for the release candidate build
required by V-01. Later Android evidence (V-02 through V-05) must reference
this same revision and artifact; if the candidate changes, this record is
superseded by a new entry, not edited in place.

## V-01: release build record

- **Compiled revision:** `aa29ab9d5119425ed89560eac2b02267a190f329`
  (`feat/expressive-arcade-visual-refactor`)
- **Evidence revision:** `1d803e9ce21f9793f54996f08f3daf1445841f8b` — the
  build was produced at `aa29ab9`; exactly one commit sits between that
  revision and this evidence record (`docs: close A-01/A-03/F-01 remediation
  evidence gaps`, verified via `git log aa29ab9..1d803e9 --oneline`), and it
  touches only `docs/WALLY_ATLAS_RECONSTRUCTION.md` and
  `docs/PRESENTATION_POLICY.md` — no code, asset, dependency or build
  configuration path (verified via `git diff aa29ab9 1d803e9 --name-only`) —
  so the artifact below remains valid evidence for the current HEAD.
  **Re-verification rule:** before trusting this note on any later HEAD,
  re-run `git diff --name-only <this evidence revision> <current HEAD>` and
  confirm every changed path is documentation-only; if any code, asset,
  dependency or build-config path appears, this record is stale and V-01
  must be rebuilt and re-recorded rather than reused.
- **Command:** `cd android && ./gradlew :app:assembleRelease`, invoked by
  `scripts/android-screenshots.sh` (which builds before the Maestro tour
  unless `SKIP_BUILD=1` is set).
- **Java:** OpenJDK 17.0.19 (Homebrew `openjdk@17`), pinned by the script via
  `JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home`.
- **Android SDK/build config** (resolved live via `./gradlew -q
  :app:properties`, from Expo SDK 57's `expo-root-project` autolinking
  defaults, not a locally pinned value):
  - `compileSdkVersion 36`
  - `targetSdkVersion 36`
  - `minSdkVersion 24`
  - `buildToolsVersion 36.0.0`
  - `ndkVersion 27.1.12297006`
- **ABI:** single `arm64-v8a` native library set, no ABI splits configured
  (verified by listing `lib/` entries inside the built APK) — matches the
  arm64-v8a emulator target used for the checked-in manual screenshot
  evidence in `docs/screenshots/`.
- **Build type:** `release`.
- **Result:** `BUILD SUCCESSFUL in 4m 18s`, 419 actionable tasks executed.
- **Artifact:** `android/app/build/outputs/apk/release/app-release.apk`
  - size: 41364511 bytes
  - versionName: `0.3.0`, versionCode: `1`
  - sha256: `b015d50a03cf9887f60948ce02fbe7adafbcd1df37f537b8236494af27d7124f`
  - baseline profiles included for API 28–30 and API 31+
- **No AAPT2 resource-processing error** occurred for any of the Wally,
  object, or FX atlas PNGs; `processReleaseResources` and
  `optimizeReleaseResources` both completed before `packageRelease`.

This record makes no visual-quality or performance claim. Those remain
V-02 through V-05 (Android visual QA) and P-01 through P-03 (INC-004
performance decision), both still outstanding.

## V-02: screenshot tour execution record (2026-09-06, FAILED)

- **Command:** `npm run screenshots:android`, against the V-01 candidate
  above (`aa29ab9`, APK sha256
  `b015d50a03cf9887f60948ce02fbe7adafbcd1df37f537b8236494af27d7124f`).
- **Environment:** Maestro 2.6.1, emulator `emulator-5554`, `arm64-v8a`
  (matches the built APK's single ABI). Install/launch succeeded; the tour
  progressed through 11 of 14 scripted checkpoints (`01_main_menu` through
  `11_continue_restore`) with every intermediate assertion passing.
- **Result: FAILED.** The tour stopped inside the `house-awake`
  failure-scenario block, immediately after the second `exit-button` →
  `new-game-button` re-entry that follows the continue/restore checkpoint.
  `extendedWaitUntil visible id: game-screen timeout: 20000` in
  `maestro/screenshots.yaml` timed out; `game-screen` never became visible.
  No screenshot after `11_continue_restore` was produced. Partial evidence
  was written to `artifacts/android-screenshots-failed/`; the prior
  successful evidence set under `artifacts/android-screenshots/` was left
  unchanged per the T-02 staging contract.
- **Root cause (independently confirmed twice — direct code inspection and a
  separate fresh-context review):** not a Maestro/device/tooling fault. It is
  a real app-behavior gap. `App.tsx:70-92` (`handleNewGame`) shows a native
  `Alert.alert('Replace saved game?', ...)` and returns without touching
  `view`/`gameState` whenever `canContinue` is `true` and the call is not
  already an explicit overwrite. `canContinue` is set `true` by the very
  first successful save (`App.tsx:45` on mount-read, `App.tsx:85` after the
  first new game) and is never reset to `false` while a valid save exists, so
  every later `new-game-button` tap in the same session opens this
  confirmation. The Maestro flow never taps "Replace", so it hangs to the
  full timeout. Filed as **FINDING-006** in `docs/AUDIT_REPORT.md`; tracked
  as task **V-02b** in `docs/AUDIT_REMEDIATION_PLAN.md`, blocking V-02 from
  being considered passed and blocking V-03/V-04.
- **Not yet attempted:** any fix to either the Maestro flow or `App.tsx`.
  V-02b must be scored (`npm run rri --`), authorized, and closed with a full
  successful re-run of `npm run screenshots:android` before V-02 can be
  marked passed.

## Dependency gate verification

The plan's dependency graph requires A-03, A-05, Q-05, C-03, T-02, T-03 and
T-05 before V-01 can call this "the final candidate" rather than an
arbitrary build. The catalogue's own status column is stale (it marks
everything but B-00 as "pending"); each dependency was independently
re-checked against live repo state rather than trusted from that column:

| Dependency | Verification | Result |
|---|---|---|
| A-03 | This same build: `:app:assembleRelease` succeeded, no AAPT2 error for any atlas | Satisfied |
| A-05 | `npm run audit:android-assets` run live: all three atlas PNGs compile via AAPT2 | Satisfied |
| Q-05 | `npm run test:all`, `npm run typecheck`, `npm run audit:premerge` all run live, all green | Satisfied |
| C-03 | `tests/presentation.test.ts` contains the event-consumer/clip-reachability check (`rushed-threshold` → `WALLY_RUSH` coverage, labeled "C-03" in-line); included in and passing under `npm run test:all` | Satisfied |
| T-02 | `scripts/android-screenshots.sh` stages to `mktemp`-created directories and has an `archive_failed_attempt` path that preserves the last successful evidence set separately from a failed run | Satisfied |
| T-03 | `maestro/screenshots.yaml` has exactly 14 uniquely named checkpoints (`grep -c takeScreenshot`) covering menu/HUD/controls/settings/restart/continue plus all three failure outcomes (`HOUSE AWAKE!`, `OUT OF ENERGY!`, `TOO LATE!`); `audit-static.sh`'s screenshot-contract check confirms flow/runner name agreement | Satisfied |
| T-05 | `src/app/GameScreen.tsx` implements the `lastTransientClipRef` latch described in the plan's transient-capture requirement, in-line labeled "T-05" | Satisfied |

All seven gates are satisfied against current HEAD, independent of the
plan document's own stale status column.

## V-02b: fix execution and re-run record (2026-09-06)

- **Mechanism:** YAML-only, RRI 22 Low (see `docs/AUDIT_REMEDIATION_PLAN.md`
  V-02b rows). `App.tsx` was not modified; confirmed via `git diff`/`git log`
  showing no changes to that file from this task.
- **Change:** `maestro/screenshots.yaml` — inserted a
  `runFlow: when: visible: text: "Replace saved game?" -> tapOn: "Replace"`
  guard immediately after each of the three `new-game-button` taps inside the
  `house-awake`, `exhausted`, and `too-late` failure-scenario blocks (the
  guard is absent from the very first `new-game-button` tap near the top of
  the file, which runs on a clean state with no prior save and so never
  triggers the dialog). Uses Maestro's existing conditional-execution
  pattern, matching the ANR-recovery `runFlow: when: visible` block already
  present earlier in the same file.
- **Verification run:** `npm run audit:premerge` — **PASS** (gameplay,
  settings, presentation tests; typecheck; static architecture audit;
  screenshot name-contract check unaffected, still 14/14 names agreed).
- **Re-run:** `npm run screenshots:android` against the same V-01 candidate —
  **PASS**. All three `runFlow when "Replace saved game?"` guards fired and
  tapped "Replace" exactly where expected; the full tour completed all 14
  checkpoints, including `12_fail_house_awake`, `13_fail_exhausted`, and
  `14_fail_too_late`. Confirmed on disk: `artifacts/android-screenshots/`
  contains exactly 14 PNG files, `01_main_menu.png` through
  `14_fail_too_late.png`.
- **Review:** 1st Reviewer (task analysis) — fresh-context general-purpose
  subagent, disclosed degraded-independence substitute for the excluded
  local-model bundle — **PASS**. 2nd Reviewer (solution) — same substitute
  arrangement, separate fresh context — **PASS** (a first 2nd-Reviewer
  attempt returned REVISE after reading this file mid-edit and citing a
  documentation gap that had already been closed by the time its report
  landed; a second fresh-context reviewer independently re-verified the
  current file content, on-disk artifacts, and diff, and returned PASS with
  no open findings).
- **Residual/accepted debt:** the real player-facing UX gap (native "Replace
  saved game?" confirmation appears on every New Game after the first save,
  with no warning) remains open in FINDING-006 and is not fixed by this task.

## Status

| Task | Status |
|---|---|
| V-01 | Closed. 1st Reviewer (task analysis) PASS, 2nd Reviewer (solution) PASS, human approval recorded 2026-09-06 per the RRI 43 High gate |
| V-02 | Closed. Initial run 2026-09-06 **FAILED** at the `house-awake` scenario's new-game re-entry (root cause FINDING-006); re-run after V-02b **PASSED**, all 14 checkpoints present |
| V-02b | Closed. RRI 22 Low, YAML-only mechanism. 1st Reviewer PASS, 2nd Reviewer PASS (2026-09-06). `App.tsx` unmodified; FINDING-006's player-facing UX gap remains open as accepted debt |
| V-03, V-04, V-05 | Ready to start — V-02/V-02b dependency satisfied |
