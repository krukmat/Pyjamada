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
  so the artifact below remained valid evidence through that evidence
  revision.
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

This V-01 record alone makes no visual-quality or performance claim. Android
visual QA is recorded chronologically by V-02 through V-05 below; the INC-004
performance decision remains P-01 through P-03.

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
arbitrary build. At V-01 execution, completion was proven from live repository
state rather than inferred from catalogue status text; each dependency was
independently re-checked:

| Dependency | Verification | Result |
|---|---|---|
| A-03 | This same build: `:app:assembleRelease` succeeded, no AAPT2 error for any atlas | Satisfied |
| A-05 | `npm run audit:android-assets` run live: all three atlas PNGs compile via AAPT2 | Satisfied |
| Q-05 | `npm run test:all`, `npm run typecheck`, `npm run audit:premerge` all run live, all green | Satisfied |
| C-03 | `tests/presentation.test.ts` contains the event-consumer/clip-reachability check (`rushed-threshold` → `WALLY_RUSH` coverage, labeled "C-03" in-line); included in and passing under `npm run test:all` | Satisfied |
| T-02 | `scripts/android-screenshots.sh` stages to `mktemp`-created directories and has an `archive_failed_attempt` path that preserves the last successful evidence set separately from a failed run | Satisfied |
| T-03 | `maestro/screenshots.yaml` has exactly 14 uniquely named checkpoints (`grep -c takeScreenshot`) covering menu/HUD/controls/settings/restart/continue plus all three failure outcomes (`HOUSE AWAKE!`, `OUT OF ENERGY!`, `TOO LATE!`); `audit-static.sh`'s screenshot-contract check confirms flow/runner name agreement | Satisfied |
| T-05 | `src/app/GameScreen.tsx` implements the `lastTransientClipRef` latch described in the plan's transient-capture requirement, in-line labeled "T-05" | Satisfied |

All seven gates were satisfied for the V-01 execution snapshot. Later sections
record the subsequent Android execution and review steps separately.

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

## V-05: immutable reviewed-evidence manifest (2026-09-06)

- **Task decision:** `V-05 | closed | RRI 14 Low (base 14) | Effort S |
  authorized by the user's explicit approval`. Inputs:
  `0/0/0/1/0/1/1/3`; no modifier, categorical floor, or decomposition
  trigger. Dominant drivers: repository context (`X`), evidence impact (`P`),
  and verification (`T`).
- **Execution route:** Primary-agent documentation synthesis. Local developer
  **ineligible** because this task consolidates broad audit evidence rather
  than producing a bounded code/test/mechanical patch. Required environment:
  repository-local Git, SHA-256 tooling, and audit commands; no new device run
  is claimed or required for this consolidation.
- **V-05 review gates:** 1st Reviewer / task analysis: **n/a**; 2nd Reviewer /
  solution: **n/a**. This is a non-delegated Low documentation-only task with
  no behavior change. The reviewer results required by V-05's acceptance
  criterion are the independent V-03/V-04 results attached to the reviewed
  evidence below: both tasks' 1st and 2nd Reviewers returned **PASS**.

### Evidence identity

Every manifest row below inherits this exact identity:

| Field | Immutable value |
|---|---|
| Reviewed product revision | `aa29ab9d5119425ed89560eac2b02267a190f329` (`feat/expressive-arcade-visual-refactor`) |
| Reviewed Android artifact | `android/app/build/outputs/apk/release/app-release.apk`; 41364511 bytes; SHA-256 `b015d50a03cf9887f60948ce02fbe7adafbcd1df37f537b8236494af27d7124f`; release `0.3.0` (`versionCode 1`) |
| Device / runner | Android emulator `emulator-5554`; ABI `arm64-v8a`; Maestro `2.6.1` |
| Successful capture record | V-02b full-tour re-run recorded by `063c61102f610ff31dc2a75c267f0fd002130261`; 14/14 checkpoints passed after the YAML-only FINDING-006 guard |
| Human-visible review record | V-03/V-04 closure `cb51a1e3647a3e9d035e5bb90029e4f976c12ce3`; V-03 1st/2nd Reviewer **PASS** and V-04 1st/2nd Reviewer **PASS** |
| Ledger authoring base | `42be05c1da8a9f68ec6aeeadc33e395066ef5162`; this is documentation context only and is **not** represented as the built or device-tested revision |
| Capture time / set size | All 14 preserved PNGs have filesystem timestamp `2026-09-06T17:39:53+0200`; 957493 bytes total |
| Ordered-manifest SHA-256 | `17322d4a387ef8621c18f20b6980e8d2cc047554004ef4f6361782cfc0daa406`, calculated by hashing the lexically ordered `shasum -a 256` manifest shown below |

The APK remains evidence for the explicitly identified reviewed product
revision, not for later `HEAD`s. In particular, later commits include evidence
workflow and `package.json` changes, so V-05 does not weaken V-01's
re-verification rule or claim that the APK was rebuilt from the ledger
authoring base.

### Scenario and screenshot manifest

`V-03 PASS` and `V-04 PASS` in this table mean the applicable task's complete
review record passed both independent reviewer gates; they do not convert a
qualified checkpoint into an unconditional visual pass.

| # | Scenario / asserted state | Screenshot | Bytes | SHA-256 | Reviewed disposition |
|---:|---|---|---:|---|---|
| 01 | Clean launch; main menu visible | `artifacts/android-screenshots/01_main_menu.png` | 96640 | `4201478476f9362121f9665b0e2e73c40cf735f3b6b6d17300bce70815f01578` | V-04 **PASS** (entry flow) |
| 02 | Settings opened; audio and control-layout rows visible | `artifacts/android-screenshots/02_settings.png` | 80660 | `e46da02f4d199a8486ebc9c78cfba24198793abb6c03213847fdbef93ab1d15d` | V-04 **PASS** (settings) |
| 03 | Fresh run; objective and sleepy initial state visible | `artifacts/android-screenshots/03_run_start_sleepy.png` | 57282 | `6ed3667713c32d5acf9f6ac3adb5315ba1460d7839fc491be682fca900a59b12` | V-03 **PASS** (atlas/Wally); V-04 **PASS** (new game) |
| 04 | Bed interaction; `Five more minutes` state visible | `artifacts/android-screenshots/04_bed_wake.png` | 62462 | `850e372ce50e60304bd08c49897df34431921a94581d0622ab9eb844e1014554` | V-03 **PASS** (reaction causality) |
| 05 | Slippers interaction; `Soft steps unlocked` visible | `artifacts/android-screenshots/05_slippers.png` | 58769 | `d98c24020cb6aa6624e64d9c3723c8e802e1a8a1195f6185ac5cd5e55aa0f122` | V-03 reviewed concrete minor defect: [FINDING-007](AUDIT_REPORT.md#finding-007--slippers-is-visually-hard-to-distinguish-from-wally-at-its-room-position) |
| 06 | First alarm interaction; quiet-awake state visible | `artifacts/android-screenshots/06_alarm.png` | 60720 | `79c3eab89423739f88b56b06c3dab3be7d486999b6a9275f85ed7efe42f66ba6` | V-03 **PASS** (reaction causality) |
| 07 | Repeated alarm; startled/panic state visible | `artifacts/android-screenshots/07_startled.png` | 61015 | `7e66e0dc000ea38a16ca279fb392e678ecf9792c392adb65b24e436928ae48b1` | V-03 **PASS** (reaction causality); stacked FX/shake **NOT VERIFIABLE** from static evidence |
| 08 | Wardrobe interaction; dressed state visible | `artifacts/android-screenshots/08_wardrobe_fumble.png` | 65381 | `4a1040a2e8e96df6ada36645478d951aa07e2f9553e9b6e4dea03ffcb60083b2` | V-03 **PASS** (reaction causality) |
| 09 | Keys acquired; `READY! DRESSED · KEYS · GO` visible | `artifacts/android-screenshots/09_success.png` | 73275 | `dd882748bd139a32e13208bfe0a3a81751c43113feefe6e2e648221b5b64fd78` | V-04 **PASS** (objective complete), with filename-only naming nit |
| 10 | Restart; stable initial gameplay state reconstructed | `artifacts/android-screenshots/10_restart.png` | 57993 | `7296e532b798be9a2407da946bacd17ac115acec0665abdea0312a84e23e8b17` | V-04 **PASS** (restart) |
| 11 | Continue; stable post-bed state reconstructed | `artifacts/android-screenshots/11_continue_restore.png` | 63223 | `0fa8510057c8ea0e44d99f074070467bc4c607f714055d086f9fd9a13b1ef8fb` | V-04 **PASS** (continue) |
| 12 | Noise failure; `HOUSE AWAKE!` visible | `artifacts/android-screenshots/12_fail_house_awake.png` | 74951 | `3b0fa10242a5723c67e1fd246effc076118ddab733b22c97897670e966b4e4f3` | V-04 **PASS** (failure); capture used the accepted [FINDING-006](AUDIT_REPORT.md#finding-006--new-game-silently-blocks-on-an-unhandled-native-confirmation-once-a-save-exists) test-flow guard |
| 13 | Energy failure; `OUT OF ENERGY!` visible | `artifacts/android-screenshots/13_fail_exhausted.png` | 77001 | `8baf15ddc321fe9d510b701db93fef8dc34362939a32e55279e750aa2a6c4630` | V-04 **PASS** (failure); capture used the FINDING-006 test-flow guard |
| 14 | Time failure; `TOO LATE!` visible | `artifacts/android-screenshots/14_fail_too_late.png` | 68121 | `df134cf4c94be48e30d5a5c817b3be92a76dd901f7f98efa77754b0d93a23955` | V-04 **PASS** (failure); capture used the FINDING-006 test-flow guard |

### Open defects and evidence limits

- [FINDING-006](AUDIT_REPORT.md#finding-006--new-game-silently-blocks-on-an-unhandled-native-confirmation-once-a-save-exists)
  remains accepted debt for player UX. Its test-blocking portion is resolved
  only by the conditional Maestro guard; V-05 does not claim a product fix.
- [FINDING-007](AUDIT_REPORT.md#finding-007--slippers-is-visually-hard-to-distinguish-from-wally-at-its-room-position)
  remains open accepted debt for slippers/Wally legibility.
- Stacked FX and screen shake remain **NOT VERIFIABLE** from this static set,
  for the timing reason documented in V-03. They are evidence limitations,
  not silently converted to defects or passes.
- The PNG directory is ignored by Git. These hashes detect any mutation of
  the preserved local set, but do not make the PNGs retrievable from a clean
  clone. Durable artifact publication would require a separately authorized
  storage or repository-scope decision.

This section is append-only evidence. If the candidate, APK, device run, or
any screenshot changes, add a superseding manifest with new identities and
hashes; do not rewrite this one.

## Status

| Task | Status |
|---|---|
| V-01 | Closed. 1st Reviewer (task analysis) PASS, 2nd Reviewer (solution) PASS, human approval recorded 2026-09-06 per the RRI 43 High gate |
| V-02 | Closed. Initial run 2026-09-06 **FAILED** at the `house-awake` scenario's new-game re-entry (root cause FINDING-006); re-run after V-02b **PASSED**, all 14 checkpoints present |
| V-02b | Closed. RRI 22 Low, YAML-only mechanism. 1st Reviewer PASS, 2nd Reviewer PASS (2026-09-06). `App.tsx` unmodified; FINDING-006's player-facing UX gap remains open as accepted debt |
| V-03 | Closed. RRI 34 M. No blank-atlas/misplaced-reaction defect found. One minor visual-legibility defect recorded (FINDING-007, slippers hard to distinguish). Shake/stacked-FX recorded NOT VERIFIABLE from static evidence (structural, not a defect). 1st/2nd Reviewer PASS |
| V-04 | Closed. RRI 34 M. All seven flows PASS. One cosmetic evidence-naming nit noted (not filed as a finding). 1st/2nd Reviewer PASS |
| V-05 | Closed. RRI 14 Low. Immutable 14-row SHA-256 manifest identifies the reviewed candidate/APK, device, scenarios, V-03/V-04 reviewer results, and unresolved FINDING-006/FINDING-007 links; no new device run claimed |
