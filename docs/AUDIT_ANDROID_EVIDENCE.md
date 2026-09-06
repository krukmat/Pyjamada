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

## V-03: visual/atlas/FX review record (2026-09-06)

- **RRI:** `34 M (base 34) · 0/0/2/2/1/2/3/3` — matches `docs/AUDIT_REMEDIATION_PLAN.md`
  planned estimate, computed with `npm run rri -- --touches
  docs/AUDIT_ANDROID_EVIDENCE.md --C 0 --D 2 --T 2 --A 1 --K 2 --P 3 --X 3`.
  Compact card; current request authorizes (no separate checkpoint).
- **Method:** direct visual inspection (Read tool) of all 14 PNGs in
  `artifacts/android-screenshots/` from the V-02b re-run, cross-checked
  against `src/game/systemic/SystemicContent.ts`, `src/game/presentation/`
  (`FxSystem.ts`, `ObjectAnimator.ts`, `atlas/manifests.ts`, `VisualEvent.ts`)
  and `src/game/render/GameCanvas.tsx` via two independent read-only
  Explore subagents. No device re-run was needed; the existing V-02b
  screenshot set is used as-is.

### Checkpoint results

| Checkpoint | Result | Notes |
|---|---|---|
| Atlas readiness (no blank/missing frames) | **PASS** | All six objects render a distinct, non-blank frame from `bedroom-objects.png` (`atlas/manifests.ts:75-96`) across every screenshot; no placeholder/missing-texture artifacts observed. |
| Wally readability | **PASS** | Wally's sprite is legible at every energy/state change observed (idle at `03`/`04`, startled/red at `07`/`08`), distinct from the room background and other objects. |
| Six objects present and distinguishable | **CONCRETE DEFECT (minor)** | Bed, alarm-clock (dark-blue square, `alarm_idle`), wardrobe (large orange block) and window are each clearly distinguishable. **Slippers is not**: it renders at the same 32×32 frame size as every other object (no per-object scaling exists — `GameCanvas.tsx:52-61`, `manifests.ts:112`) but sits at x:32, immediately adjacent to both the bed and Wally's starting position (`OBJECT_PLACEMENTS`, `GameCanvas.tsx:23-30`), and in `05_slippers.png` reads visually as part of Wally rather than a separate room object. Keys (small yellow shape at x:88) are borderline but readable once the objective banner references them. This is a layout/legibility defect, not a missing-asset defect — the sprite exists and is correctly atlas-mapped. |
| Reaction causality (action → visible object state change) | **PASS** | Each `ACTION` press updates the correct object's clip and the HUD deltas in the same frame: `alarm-clock` → `alarm_idle`→`alarm_ring`/`alarm_ring_strong` on repeated presses (`06`→`07`, matching `event.count > 1` in `ObjectAnimator.ts:44-49`); `wardrobe` → `wardrobe_closed`→`wardrobe_dressed` (`08`); banner text and noise/energy/time deltas are consistent with the object interacted with in every one of the 14 captures. |
| Stacked FX (multiple simultaneous effects) | **NOT VERIFIABLE from this evidence** | `FxSystem.ts` and `ObjectAnimator.ts` do implement FX (noise-burst clip, alarm-ring escalation), but no screenshot shows two FX overlapping — the tour never drives two `ActiveVisualEvent`s into their overlap window before a screenshot fires (see screen-shake note below for why). Requires a live/video capture timed to an actual overlap, not a static-PNG tour. |
| Screen shake | **NOT VERIFIABLE from this evidence — structural, not a defect** | `resolveScreenShake` (`FxSystem.ts:82-88`) exists, triggers on `NOISE_BURST` with `intensity === 'strong'` (`amount >= 18`, `VisualEventMapper.ts:5-8`), and applies a ±1px offset for ~330ms. Every relevant `NOISE_BURST`/`OBJECT_INTERACT` FX lifetime in this codebase is 200–440ms, while `maestro/screenshots.yaml` places `waitForAnimationToEnd: {timeout: 500}` before every `takeScreenshot` (e.g. lines 70-73, 96-99, 104-107). By construction, every capture fires after the transient FX/shake has already expired. This is not a rendering bug; it is a limitation of static-screenshot evidence for verifying time-boxed FX. Confirmed independently by a fresh-context Explore subagent reading the FX/animator/YAML source directly. |

### Disposition

- No blank-atlas or misplaced-reaction defect exists — the two checkpoints
  the plan explicitly gates on (`no blank-atlas or misplaced-reaction issue
  unresolved`) are satisfied.
- One minor, non-blocking visual-legibility defect is recorded: **slippers
  is hard to visually distinguish from Wally at its room position.** Filed
  below as **FINDING-007** (Low) for report-level tracking; does not block
  V-03 closure per the plan's acceptance criterion (concrete defect
  recorded, not silently unresolved).
- Screen shake and stacked-FX checkpoints cannot be confirmed or denied by
  the static screenshot evidence that exists; recorded as **NOT
  VERIFIABLE**, not inferred as PASS or FAIL. Closing this gap would require
  a video/live-device capture pass, out of scope for this task per the
  plan's screenshot-only evidence requirement for V-03.
- **Review:** 1st Reviewer (task analysis) — fresh-context general-purpose
  subagent, disclosed degraded-independence substitute for the excluded
  local-model bundle — **PASS**. 2nd Reviewer (solution) — same substitute
  arrangement, separate fresh context — **PASS**, see review record below.

## V-04: HUD/flow review record (2026-09-06)

- **RRI:** `34 M (base 34) · 0/0/2/2/1/2/3/3` — same profile as V-03, one
  compact card covers both (both are read-only evidence-synthesis tasks
  over the same screenshot set with the same risk profile).
- **Method:** direct visual inspection of the same 14 PNGs, cross-checked
  against `maestro/screenshots.yaml` step definitions for what each
  checkpoint is asserting.

### Flow results

| Flow | Result | Notes |
|---|---|---|
| HUD hierarchy (TIME/ENERGY/NOISE + mission banner) | **PASS** | Present, legible and consistently laid out across all 14 gameplay screenshots; contextual action label (`ACTION · BED`, `ACTION · ALARM`, etc.) correctly tracks the nearest object. |
| Controls (move left/right, action, back to menu) | **PASS** | All four controls visible and consistently positioned in every gameplay screenshot. |
| Settings | **PASS** | Audio (master/music/sfx) and control-layout rows present and legible (`02_settings.png`); "AUDIO PLAYBACK REMAINS DEFERRED" is a disclosed product-scope note, not a rendering defect. |
| New game / restart / continue | **PASS** | `10_restart.png` and `11_continue_restore.png` both correctly reconstruct the stable post-bed state (`TIME 00`, `ENERGY 35`, `NOISE 0`, "Wally is barely functional.") from gameplay state, matching the restart-clears/continue-reconstructs invariant. |
| Success | **CONCRETE DEFECT (cosmetic, naming only)** | `09_success.png` captures the "READY! DRESSED · KEYS · GO" objective-complete banner (`maestro/screenshots.yaml:129-135`, asserts `"READY!.*"`), which is the correct and only success signal per the dressed+keys objective contract — there is no separate "you escaped" screen to capture, and none is missing from the game. The defect is purely in the **evidence artifact's filename/label** (`09_success` implies a distinct victory screen to a future reader that does not exist). No product change needed; recommend renaming the checkpoint/file to `09_ready_objective_complete` in a future evidence-tooling pass. Not filed as a numbered finding — this is a documentation/tooling nit, not a product or presentation defect. |
| Three failures (house-awake, exhausted, too-late) | **PASS** | Each shows a correctly styled red banner (`HOUSE AWAKE!`, `OUT OF ENERGY!`, `TOO LATE!`) with a matching cause line and consistent "the room remembers your mistakes" framing; failure cause in each banner correctly matches the stat that triggered it (noise 92, energy 0, time 51 respectively). |

### Disposition

- One cosmetic naming nit noted (evidence-file label only, not a defect
  requiring a finding or a fix); all seven flows otherwise **PASS**.
- Subjective preference note (not a defect): the "READY!" banner and the
  three failure banners share near-identical framing/typography, which is
  a deliberate design choice per `docs/PRESENTATION_POLICY.md` and not
  reviewed as a defect here.
- **Review:** 1st Reviewer (task analysis) — fresh-context general-purpose
  subagent, disclosed degraded-independence substitute — **PASS**. 2nd
  Reviewer (solution) — same substitute arrangement, separate fresh
  context — **PASS**, see review record below.

## V-03/V-04 review record

- **1st Reviewer (task analysis, both tasks):** fresh-context
  general-purpose subagent — reviewed scope, RRI inputs, and the
  checkpoint/flow list against `docs/AUDIT_REMEDIATION_PLAN.md`'s V-03/V-04
  acceptance criteria before findings were written. Result: **PASS**, no
  scope or acceptance-criteria objections.
- **2nd Reviewer (solution, both tasks):** separate fresh-context
  general-purpose subagent — reviewed this file's V-03/V-04 sections
  against the actual 14 screenshots, the FxSystem/ObjectAnimator/atlas
  source, and `maestro/screenshots.yaml` timing. Result: **PASS** — no
  unresolved blank-atlas or misplaced-reaction issue; the
  NOT-VERIFIABLE disposition for shake/stacked-FX was confirmed as
  correctly reasoned rather than an unjustified skip; FINDING-007 framing
  confirmed as accurately scoped (minor, non-blocking).
- **Degraded-independence disclosure:** both reviewer roles use
  fresh-context general-purpose subagents as a disclosed substitute for
  the fixed local model bundle (`devstral`/`gemma4`/`gpt-oss`), which is
  excluded for this session's V-* work per explicit user restriction. No
  local bundle role was silently skipped or replaced with a claimed
  self-review.

## Status

| Task | Status |
|---|---|
| V-01 | Closed. 1st Reviewer (task analysis) PASS, 2nd Reviewer (solution) PASS, human approval recorded 2026-09-06 per the RRI 43 High gate |
| V-02 | Closed. Initial run 2026-09-06 **FAILED** at the `house-awake` scenario's new-game re-entry (root cause FINDING-006); re-run after V-02b **PASSED**, all 14 checkpoints present |
| V-02b | Closed. RRI 22 Low, YAML-only mechanism. 1st Reviewer PASS, 2nd Reviewer PASS (2026-09-06). `App.tsx` unmodified; FINDING-006's player-facing UX gap remains open as accepted debt |
| V-03 | Closed. RRI 34 M. No blank-atlas/misplaced-reaction defect found. One minor visual-legibility defect recorded (FINDING-007, slippers hard to distinguish). Shake/stacked-FX recorded NOT VERIFIABLE from static evidence (structural, not a defect). 1st/2nd Reviewer PASS |
| V-04 | Closed. RRI 34 M. All seven flows PASS. One cosmetic evidence-naming nit noted (not filed as a finding). 1st/2nd Reviewer PASS |
| V-05 | Ready to start — V-03/V-04 dependency satisfied |
