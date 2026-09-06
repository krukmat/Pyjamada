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

## Status

| Task | Status |
|---|---|
| V-01 | Closed. 1st Reviewer (task analysis) PASS, 2nd Reviewer (solution) PASS, human approval recorded 2026-09-06 per the RRI 43 High gate |
| V-02 | Not started — no `npm run screenshots:android` (Maestro) run has been executed against this candidate; only the manually captured `docs/screenshots/` evidence set exists |
| V-03, V-04, V-05 | Not started — depend on V-02 |
