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


## P-02: Android performance capture attempt (2026-09-07)
**Status: OPEN / NOT CAPTURED.** All 18 primary trials, six scenario videos and three process-cold videos were saved. Seventeen primary metric rows are complete; A1-3 lacks a complete app CPU total. Required marker-based touch and cold-readiness latency is unavailable. This evidence does not close P-02 and does not disposition INC-004.
### Task card and review gates
- Objective: execute the authorized amended P-01 protocol on the unchanged V-01 APK and retain attributable raw evidence, including explicit failures.
- Scope: this evidence ledger and `docs/AUDIT_REMEDIATION_PLAN.md`; generated command transcripts, traces, frame statistics, videos and analysis under the ignored artifact directory below. No application, asset, dependency, native configuration or save-format changes. P-03 owns interpretation.
- RRI: planned 43 High; execution/actual **45 High** (base45, native floor41, no modifiers; C/F/D/T/A/K/P/X=0/1/2/3/1/4/3/3). The second authored status document explains the increase; raw generated evidence is not implementation-file count.
- Orchestrator/execution: primary agent with repository tooling and Android emulator. Local developer **ineligible** for native profiling/device operation. Capability route: `gpt-5.6-terra/high`; no Low local-author substitution.
- Authorization: user explicitly approved the two P-01 corrections and continuation of P-02. No additional checkpoint required within this scope.
- 1st Reviewer / task analysis: fresh `gpt-5.6-terra/high` (`p02_amended_analysis`) — **PASS**, after correcting the ledger from planned43 to execution45. Original P-02 analysis was REVISE for M/C-W setup errors.
- Architect (optional): local Ollama `gpt-oss:20b` — **PASS** on invariants in the earlier review; complementary only.
- 2nd Reviewer / solution: **PENDING** — independent review of this incomplete capture record; a review PASS cannot close missing capture criteria.
- Verification: `npm run audit:premerge` **PASS** after the protocol amendment (includes `test:all`, `typecheck` and static architecture/asset checks). Final evidence-integrity checks recorded below. `npm run screenshots:android` was not rerun: it is the separate screenshot/build tour, not this immutable release-profile protocol.
- Escalation: missing observability invokes frozen P-01 failure semantics; retain evidence and leave P-02 open. Any new input-origin method requires a bounded P-01 amendment and re-review.
### Identity and comparability
- Product revision: `aa29ab9d5119425ed89560eac2b02267a190f329`. APK release0.3.0/versionCode1, non-debug, arm64-v8a only, 41,364,511bytes; SHA-256 `b015d50a03cf9887f60948ce02fbe7adafbcd1df37f537b8236494af27d7124f`.
- Protocol/evidence base HEAD: `f2aae044c9e27afe88e5201d26479ed32dab0635`. Authorized uncommitted amendment is captured in `identity-working-diff.txt`; frozen protocol SHA-256 `f36b427cbe5a91ce75ea050a81d3e72b8492e15ef2d5be77225edd31e1e2d00c` (`protocol.md`). No commit was created.
- Emulator `emulator-5554`, Google sdk_gphone64_arm64, Android14/API34/arm64-v8a; portrait1080×2400,420dpi,60.000004Hz. ADB1.0.41/build37.0.0-14910828; Perfetto34.0; Toybox0.8.9; FFmpeg/ffprobe8.1.2. Full metadata is in the identity files.
- Same warm app PID **28080** for the primary set; main TID28080; JS TIDs28134,28159,28161 each retained separately. `RenderThread` and top-five other threads are identified in `primary-results.json`, with raw before/after `/proc` names and all21 `top` samples per trial. Cold trials intentionally terminate the warm process after the warm passes.
- One APK install, one unrecorded canonical success warm-up. UI dumps resolve button centres, including terminal/menu variants; setup HUD assertions and post-window screenshots are retained. No test-hook value was used as a metric.
- Primary windows lasted **20.001644–20.007063s** by host monotonic clock (20s target plus host scheduling/serialization overhead). Actual movement intervals:245.078–254.783ms; stacked-alarm115.539–122.161ms; wardrobe117.768–124.676ms. UTC and every input timestamp are retained.
- Thermal status0 at recorded start/end; AC power metadata retained. No local model inference, tests, Maestro, inspector or screenrecord ran during the primary trace windows. Videos use a separate20s screenrecord pass with0.8s encoder startup prelude before scenario stimulus; no video timing is substituted for primary metrics.
- `show_touches` was originally unset and was restored to unset after the main video pass and each retry. No package/emulator data clear occurred. Device-side evidence copies were retained.
### Primary trial results
CPU cells are cumulative first/last sample differences in ms (% of the20,000ms target), summed across identified threads. Summing threads is not a single-core utilization bound. The full per-thread sample series/top-five others, all frame counters and hashes are retained in `primary-results.json`, `primary-summary.tsv`, raw `*-top.txt`, `*-threads-*.txt` and `*-framestats.txt`. `PASS CAPTURED` below applies only to that primary metric row, not overall performance or the video acceptance criteria.
| Trial | UTC start → end | App CPU | Main CPU | JS CPU | RenderThread CPU | Frames | Jank | Status |
|---|---|---:|---:|---:|---:|---:|---|---|
| I-1 | 06:10:26.506271 → 06:10:46.508741 | 2690 (13.45%) | 1210 (6.05%) | 590 (2.95%) | 500 (2.50%) | 252 | 16 (6.35%) | PASS CAPTURED |
| I-2 | 06:11:47.584715 → 06:12:07.587707 | 2680 (13.40%) | 1140 (5.70%) | 640 (3.20%) | 500 (2.50%) | 258 | 18 (6.98%) | PASS CAPTURED |
| I-3 | 06:12:25.943446 → 06:12:45.950514 | 2660 (13.30%) | 1120 (5.60%) | 590 (2.95%) | 530 (2.65%) | 258 | 20 (7.75%) | PASS CAPTURED |
| M-1 | 06:13:04.865951 → 06:13:24.872608 | 4840 (24.20%) | 1810 (9.05%) | 820 (4.10%) | 1730 (8.65%) | 409 | 108 (26.41%) | PASS CAPTURED |
| M-2 | 06:13:43.293066 → 06:14:03.295833 | 4760 (23.80%) | 1830 (9.15%) | 830 (4.15%) | 1640 (8.20%) | 434 | 111 (25.58%) | PASS CAPTURED |
| M-3 | 06:14:21.341021 → 06:14:41.353779 | 5910 (29.55%) | 2280 (11.40%) | 990 (4.95%) | 2000 (10.00%) | 427 | 115 (26.93%) | PASS CAPTURED |
| A1-1 | 06:15:00.150486 → 06:15:20.157035 | 2710 (13.55%) | 1170 (5.85%) | 590 (2.95%) | 560 (2.80%) | 263 | 25 (9.51%) | PASS CAPTURED |
| A1-2 | 06:15:53.970268 → 06:16:13.974860 | 2350 (11.75%) | 1020 (5.10%) | 540 (2.70%) | 430 (2.15%) | 256 | 13 (5.08%) | PASS CAPTURED |
| A1-3 | 06:16:32.659051 → 06:16:52.662928 | NOT CAPTURED | 1010 (5.05%) | 560 (2.80%) | 420 (2.10%) | 253 | 13 (5.14%) | NOT CAPTURED |
| C-A-1 | 06:17:11.135321 → 06:17:31.137085 | 2870 (14.35%) | 1220 (6.10%) | 630 (3.15%) | 550 (2.75%) | 262 | 24 (9.16%) | PASS CAPTURED |
| C-A-2 | 06:17:49.366346 → 06:18:09.371605 | 2330 (11.65%) | 1110 (5.55%) | 530 (2.65%) | 340 (1.70%) | 248 | 7 (2.82%) | PASS CAPTURED |
| C-A-3 | 06:18:27.798602 → 06:18:47.803664 | 2370 (11.85%) | 1080 (5.40%) | 540 (2.70%) | 390 (1.95%) | 251 | 10 (3.98%) | PASS CAPTURED |
| C-W-1 | 06:19:06.702039 → 06:19:26.707433 | 2360 (11.80%) | 1080 (5.40%) | 530 (2.65%) | 380 (1.90%) | 249 | 8 (3.21%) | PASS CAPTURED |
| C-W-2 | 06:19:45.890671 → 06:20:05.896347 | 3820 (19.10%) | 1390 (6.95%) | 690 (3.45%) | 1220 (6.10%) | 304 | 65 (21.38%) | PASS CAPTURED |
| C-W-3 | 06:20:25.772943 → 06:20:45.776137 | 5220 (26.10%) | 1720 (8.60%) | 1040 (5.20%) | 1770 (8.85%) | 333 | 106 (31.83%) | PASS CAPTURED |
| O-S-1 | 06:21:08.801014 → 06:21:28.804105 | 7440 (37.20%) | 2770 (13.85%) | 1580 (7.90%) | 2030 (10.15%) | 338 | 145 (42.90%) | PASS CAPTURED |
| O-S-2 | 06:21:50.154798 → 06:22:10.161317 | 8280 (41.40%) | 3380 (16.90%) | 1680 (8.40%) | 2200 (11.00%) | 355 | 177 (49.86%) | PASS CAPTURED |
| O-S-3 | 06:22:32.820671 → 06:22:52.825056 | 9000 (45.00%) | 3740 (18.70%) | 1620 (8.10%) | 2680 (13.40%) | 306 | 149 (48.69%) | PASS CAPTURED |

| Trial | CPU p50/p90/p95/p99 (ms) | GPU p50/p90/p95/p99 (ms) | Missed vsync / high-input / slow UI / bitmap / draw | Deadline / legacy deadline |
|---|---|---|---|---|
| I-1 | 7ms / 10ms / 16ms / 44ms | 7ms / 9ms / 11ms / 21ms | 1 / 1 / 2 / 0 / 9 | 16 / 5 |
| I-2 | 7ms / 10ms / 12ms / 20ms | 7ms / 8ms / 9ms / 13ms | 1 / 4 / 1 / 0 / 4 | 18 / 2 |
| I-3 | 7ms / 10ms / 12ms / 20ms | 7ms / 9ms / 11ms / 15ms | 1 / 3 / 1 / 0 / 5 | 20 / 1 |
| M-1 | 9ms / 20ms / 22ms / 27ms | 7ms / 10ms / 11ms / 17ms | 0 / 83 / 2 / 1 / 79 | 108 / 26 |
| M-2 | 8ms / 20ms / 22ms / 27ms | 7ms / 9ms / 10ms / 12ms | 0 / 94 / 2 / 2 / 63 | 111 / 30 |
| M-3 | 10ms / 23ms / 27ms / 40ms | 7ms / 10ms / 11ms / 22ms | 1 / 126 / 4 / 3 / 70 | 115 / 58 |
| A1-1 | 7ms / 9ms / 11ms / 19ms | 7ms / 8ms / 9ms / 11ms | 0 / 1 / 1 / 0 / 8 | 25 / 1 |
| A1-2 | 7ms / 8ms / 9ms / 17ms | 7ms / 7ms / 8ms / 10ms | 0 / 3 / 0 / 0 / 4 | 13 / 0 |
| A1-3 | 7ms / 8ms / 9ms / 17ms | 7ms / 8ms / 8ms / 9ms | 0 / 0 / 0 / 0 / 5 | 13 / 0 |
| C-A-1 | 7ms / 11ms / 15ms / 31ms | 7ms / 9ms / 11ms / 17ms | 0 / 3 / 1 / 1 / 7 | 24 / 2 |
| C-A-2 | 7ms / 8ms / 9ms / 17ms | 7ms / 7ms / 8ms / 8ms | 0 / 1 / 1 / 0 / 1 | 7 / 0 |
| C-A-3 | 7ms / 9ms / 10ms / 16ms | 7ms / 8ms / 8ms / 10ms | 0 / 0 / 0 / 0 / 3 | 10 / 0 |
| C-W-1 | 7ms / 8ms / 9ms / 18ms | 7ms / 8ms / 8ms / 11ms | 0 / 0 / 0 / 0 / 3 | 8 / 0 |
| C-W-2 | 9ms / 12ms / 15ms / 25ms | 8ms / 11ms / 11ms / 13ms | 0 / 2 / 2 / 0 / 12 | 65 / 2 |
| C-W-3 | 11ms / 19ms / 25ms / 42ms | 10ms / 14ms / 15ms / 23ms | 2 / 27 / 3 / 0 / 53 | 106 / 25 |
| O-S-1 | 15ms / 36ms / 48ms / 89ms | 12ms / 18ms / 24ms / 4950ms | 12 / 55 / 20 / 1 / 104 | 145 / 65 |
| O-S-2 | 17ms / 34ms / 44ms / 61ms | 13ms / 19ms / 23ms / 4950ms | 9 / 81 / 14 / 0 / 142 | 177 / 88 |
| O-S-3 | 15ms / 61ms / 97ms / 150ms | 12ms / 4950ms / 4950ms / 4950ms | 18 / 35 / 37 / 0 / 119 | 149 / 83 |

**A1-3 limitation:** binder TIDs30905/30906 first appear at sample11; both remain at displayed TIME+0:00.00 through sample20, but there is no first-boundary sample. The observed-thread subtotal2340ms is retained only as a subtotal, not the missing app total. Main1010ms, JS560ms and RenderThread420ms remain attributable. This was discovered after the cold trials had terminated PID28080. A new-process isolated retry would violate the same-process warm-set control and is not used to repair the row.
**A1-1 command deviation:** an after-capture assertion expected “Quiet.” rather than the actual “Quiet?”. All files were already saved and the HUD17/65/31 was correct. Only that host text assertion was corrected before the next trial; the original capture is retained and not relabelled. See `orchestration-deviation-A1-1.json`.
### Separate video evidence
Every listed video has a matching device/host SHA-256 and complete ffprobe metadata. Frame references are zero-based decoded frame indices and original presentation timestamps (PTS). These are variable-frame-rate videos; `r_frame_rate` is not treated as a constant sampling period. Peak fields below are conservative visible lower bounds in the inspected action/FX windows. Overlapping or banner-occluded sprites are not counted from semantic events. The exact exhaustive peak and some overlapping clip identities remain unresolved.
| Scenario | Video duration (s) | Visible FX lower bound / frame / PTS | Distinguishable types | Touch evidence / row status |
|---|---:|---|---|---|
| I | 20.077011 | 0 / 0 / 0.000000s | none in inspected idle frames | n/a: no input; PASS CAPTURED |
| M | 19.994522 | 2 / 172 / 8.283789s | shock, noise | NOT CAPTURED: no distinguishable touch marker; button feedback is not a substitute; NOT CAPTURED |
| A1 | 20.099344 | 1 / 49 / 2.954978s | noise | NOT CAPTURED: no distinguishable touch marker; button feedback is not a substitute; NOT CAPTURED |
| C-A | 20.029544 | 2 / 62 / 3.038933s | shock, noise | NOT CAPTURED: no distinguishable touch marker; button feedback is not a substitute; NOT CAPTURED |
| C-W | 20.086533 | 2 / 55 / 2.939389s | clothing_burst, noise | NOT CAPTURED: no distinguishable touch marker; button feedback is not a substitute; NOT CAPTURED |
| O-S | 19.977722 | 2 / 25 / 1.026200s | clothing_burst, noise | NOT CAPTURED: no distinguishable touch marker; button feedback is not a substitute; NOT CAPTURED |

No distinguishable Android touch marker was observed in the inspected control frames. Button pressed feedback is visible, but is not substituted for the protocol’s marker origin. The M replay contains40 accepted movements by final HUD and was retried once with `show_touches=1` explicitly read back; the retry again had no distinguishable marker. Consequently isolated marker-to-response samples, median/max, and the protocol’s perceptible yes/no observation remain **NOT CAPTURED**. No claim is made that individual responses were never missed, duplicated or queued. The retry was after cold trials and is diagnostic only, not a same-process replacement for the original set. No further unchanged marker-method retries were attempted.
Frame inspection confirms visible alarm recoil/shake, noise/shock overlays, wardrobe effects and failure/success banners. It does not prove every overlapping fumble/dust instance or exact peak count. Representative decoded-frame sheets and `*-frame-times.json` are retained for human review. These observations are not an INC-004 verdict.
### Process-cold image readiness
All four records below include force-stop, an empty PID check, `am start -W`, a menu dump, Continue input timestamps and the restored7/65/4 HUD. Marker-relative first-canvas/full-room latency is **NOT CAPTURED** in every record. The additional interval below is the PTS difference from an observed empty game-view frame to the next full-room frame; it is not a substitute for the requested touch latency or a precise duration of a physical-display blank.
| Video | Duration(s) | Empty view frame / PTS | Full room frame / PTS | Adjacent-frame interval(ms) | Status |
|---|---:|---|---|---:|---|
| cold-1.mp4 | 20.064867 | 66 / 4.462789s | 67 / 4.538778s | 75.989 | NOT CAPTURED |
| cold-2.mp4 | 20.037100 | 68 / 3.904944s | 69 / 3.959911s | 54.967 | NOT CAPTURED |
| cold-3.mp4 | 18.045500 | 72 / 4.039511s | 73 / 4.064389s | 24.878 | NOT CAPTURED |
| cold-3-retry.mp4 | 20.091589 | 81 / 4.210600s | 82 / 4.256033s | 45.433 | NOT CAPTURED |

The original cold3 video is18.045500s despite a20s screenrecord request; this unexplained short capture is retained as a deviation. Its single retry is20.091589s and shows the same empty-view/full-room sequence, but the missing touch origin still prevents acceptance.
### Evidence location, integrity and next gate
Raw and derived files remain local and ignored at `artifacts/android-performance/aa29ab9d5119425ed89560eac2b02267a190f329/20260907T060746Z/`. They are **not durable repository artifacts**. The ordered SHA-256 manifest below records their identity for later archival; archiving/publishing has not been performed. `SHA256SUMS` excludes itself; its SHA-256 is `480ece51f0adaec973f869809a3f00fe8afdc1da4486f7e221c575131a5e6c68`.
P-02 remains open. Before another comparable capture, P-01 needs a validated visible input-origin method and a readiness check that verifies required CPU fields while the warm process still exists. Any revised method must receive its own bounded review/authorization. Keep the current failures and raw data; do not fill missing metrics from another trial, host timestamps, the screenshot tour or source event counts. P-03 and final merge disposition remain pending.
<details>
<summary>Ordered SHA-256 manifest</summary>

```text
f84ee05d6c2859fc3c68c0d5478579b9724da3fc848e300bf4c96ec8fcc51e76  A1-1-confirm-dump.txt
33d6f2df3ccae5d1abd409c057c71624d8f8473c9d73811740e97b4a83ca8b11  A1-1-confirm.xml
532edd32fa6af9b6745438b4b07c6801bd1b74b7efd72785ac1d2e652075795e  A1-1-controls.json
7c3f0c92821d82a4a104d327f34623975fb4e6a658db26a5f19f1d59e981e697  A1-1-device-hash.txt
f84ee05d6c2859fc3c68c0d5478579b9724da3fc848e300bf4c96ec8fcc51e76  A1-1-end-dump.txt
f642d8de0b04466b66544056d5ffcd68787cb20ef9a16cab27eabb49d0279a16  A1-1-end-texts.json
70cdf5da45521149d6dbe3c7ef673caea6aa78552892a859a938d5ba3fadc658  A1-1-end.png
5789f7bb3f3ad258e0d399930660898c78839c744f37e4d86459520872b74ed2  A1-1-end.xml
731fbee90ba0adba054fc32f797421160a4e73c37c6b6c717f5ab272043d4826  A1-1-framestats.txt
3e22291fa818b4cc11c04e338dcf785e5deaf223793d89a07b44ffd9e3d92f0e  A1-1-gfx-reset.txt
fd31cc9f81062d587479ca4f22dc85db47105e6a12096d015e2fe053e6283d73  A1-1-inputs.json
e20c53b8cc3f443daabc8d0207fda2265c84fe1ac9a89a56f5dd9a1ee1385a87  A1-1-perfetto-start.txt
d8db7bcc1a43b3492647f4b15a86daccb5c87f8ac8ad1cbdf0501914a64ae458  A1-1-pull.txt
f84ee05d6c2859fc3c68c0d5478579b9724da3fc848e300bf4c96ec8fcc51e76  A1-1-setup-dump.txt
cb209c212eee4fb7746d0c0a66c789070e114a4fc8ffa0acd8a89b80daba6733  A1-1-setup-texts.json
104b0e3127e5a968920b71d54961cada7dad610de2692b9bdf19bf59053ca468  A1-1-setup.png
948ea6ab11c817bc556a03327c780d039a8b79a380fca3bfddf881265f4fa1ad  A1-1-setup.xml
3644ac575cb467dbe2854a2f2293fdf805ad5400c174ccfa10c7f075deb3a0d8  A1-1-threads-after.txt
3644ac575cb467dbe2854a2f2293fdf805ad5400c174ccfa10c7f075deb3a0d8  A1-1-threads-before.txt
2afabb4e0ef677311bf65b51ee99dc12f696aa733138141f51b59eeca8689318  A1-1-top.txt
896d870ac0c18ad327d825b644a7d26301d5216f6be17c5ddc0b0c403e740436  A1-1-window.json
79a91aa0300fe31272a7ad11ba73d792d4cad5676f8c60f3f932e16e498d741d  A1-1.pftrace
f84ee05d6c2859fc3c68c0d5478579b9724da3fc848e300bf4c96ec8fcc51e76  A1-2-confirm-dump.txt
33d6f2df3ccae5d1abd409c057c71624d8f8473c9d73811740e97b4a83ca8b11  A1-2-confirm.xml
532edd32fa6af9b6745438b4b07c6801bd1b74b7efd72785ac1d2e652075795e  A1-2-controls.json
6ddc3ca7a6c061bc2c36e1b967e102c0151d740c194595624d22ebbe9683a11b  A1-2-device-hash.txt
f84ee05d6c2859fc3c68c0d5478579b9724da3fc848e300bf4c96ec8fcc51e76  A1-2-end-dump.txt
f642d8de0b04466b66544056d5ffcd68787cb20ef9a16cab27eabb49d0279a16  A1-2-end-texts.json
89ad13fd1938b1ac78819a3ec885f4d2d99ce6b4e6202a117b947289c8a40411  A1-2-end.png
5789f7bb3f3ad258e0d399930660898c78839c744f37e4d86459520872b74ed2  A1-2-end.xml
813fc3963289d06473b0c7f50ede0965d63a5d16561423b81ac92b771a415cb6  A1-2-framestats.txt
a12110359be9e39c670b77b6e2f1f3a0bc4ca4c0a9c651d8662cde467efe6b35  A1-2-gfx-reset.txt
02506cf7fb637ac2bb8b93aefa341281439069123842c2afd53d6f331701d66a  A1-2-inputs.json
1b4e8d418771d0afb8c2e918478c14a3d0f2f80c2971feca33a2e21fcb01c06c  A1-2-perfetto-start.txt
f6f4da22049732a8987d3f16d8b22abfab5ef327d429689a4894040387734cff  A1-2-pull.txt
f84ee05d6c2859fc3c68c0d5478579b9724da3fc848e300bf4c96ec8fcc51e76  A1-2-setup-dump.txt
cb209c212eee4fb7746d0c0a66c789070e114a4fc8ffa0acd8a89b80daba6733  A1-2-setup-texts.json
b1e3276949786ebb44393a192ea5cf71f3b62d48d1cadc7461dac228022e811c  A1-2-setup.png
948ea6ab11c817bc556a03327c780d039a8b79a380fca3bfddf881265f4fa1ad  A1-2-setup.xml
3644ac575cb467dbe2854a2f2293fdf805ad5400c174ccfa10c7f075deb3a0d8  A1-2-threads-after.txt
3644ac575cb467dbe2854a2f2293fdf805ad5400c174ccfa10c7f075deb3a0d8  A1-2-threads-before.txt
bbcbd597858e25488ffd9c28d3fa1b6947ae318c8e04f5ad81d1e3103d950baa  A1-2-top.txt
7104f40f1b58dc401e3ee6eacead0f8c5893934f46259430d413affa5e435d70  A1-2-window.json
5f60e82d1e08eda999ce339f12735d8a7f201e78bbbf990c4061b8ddffdeb6b3  A1-2.pftrace
f84ee05d6c2859fc3c68c0d5478579b9724da3fc848e300bf4c96ec8fcc51e76  A1-3-confirm-dump.txt
33d6f2df3ccae5d1abd409c057c71624d8f8473c9d73811740e97b4a83ca8b11  A1-3-confirm.xml
532edd32fa6af9b6745438b4b07c6801bd1b74b7efd72785ac1d2e652075795e  A1-3-controls.json
454ab4a2a8d982cb229ccf905d8b8c0d5cb4cb0817524b019a1c6df6a041cea5  A1-3-device-hash.txt
f84ee05d6c2859fc3c68c0d5478579b9724da3fc848e300bf4c96ec8fcc51e76  A1-3-end-dump.txt
f642d8de0b04466b66544056d5ffcd68787cb20ef9a16cab27eabb49d0279a16  A1-3-end-texts.json
487dc755e85a288006cef7bfa63c2171f117949746a46f049ad0e388148bdccb  A1-3-end.png
5789f7bb3f3ad258e0d399930660898c78839c744f37e4d86459520872b74ed2  A1-3-end.xml
cc66a2ee367cb1e7111b8573b35dc7194c30427330b20777384cb2a071d3dff7  A1-3-framestats.txt
2d673ed06d9c33b5e92b4a43182ff4d3e3a133ecd744b54072676b9c1d07a057  A1-3-gfx-reset.txt
9df016328ac43e03de80030d4a8efda2114d610f5db9da45a000b9e94572937b  A1-3-inputs.json
50ba0dd53f0c9dccffc2f59d6870447fe3610e48c3af49bca083b8f54c6169fc  A1-3-perfetto-start.txt
27fbbb58ec784fe212f2b84964d7145adac68ff17b68e910f2e724c67ac6e8bf  A1-3-pull.txt
f84ee05d6c2859fc3c68c0d5478579b9724da3fc848e300bf4c96ec8fcc51e76  A1-3-setup-dump.txt
cb209c212eee4fb7746d0c0a66c789070e114a4fc8ffa0acd8a89b80daba6733  A1-3-setup-texts.json
1fa92817ba1822562df8bb5fb0629a143efd5a1ef76986b6868c771ad9d8ac87  A1-3-setup.png
948ea6ab11c817bc556a03327c780d039a8b79a380fca3bfddf881265f4fa1ad  A1-3-setup.xml
32331db7e68c0295181fb0320df998a660fa7f3d94c69a977d496db7ec72903a  A1-3-threads-after.txt
3644ac575cb467dbe2854a2f2293fdf805ad5400c174ccfa10c7f075deb3a0d8  A1-3-threads-before.txt
1284d256ea52ff5b404a56151a7d2ba84ccb7b1b22917a45cfe5558b2bf53073  A1-3-top.txt
8a781b32e64f4d9b2388747024ca3170ab8b0ddeffd3a45fa11f52d0ca537d8a  A1-3-window.json
2293274d798872b5afa148deecd6d920f87244a648bfb1683498de775fbe2129  A1-3.pftrace
f84ee05d6c2859fc3c68c0d5478579b9724da3fc848e300bf4c96ec8fcc51e76  A1-video-confirm-dump.txt
33d6f2df3ccae5d1abd409c057c71624d8f8473c9d73811740e97b4a83ca8b11  A1-video-confirm.xml
a0d7c538478eb39e9334c7aabe387172cdb9fc2271529c2c63cac4b5b072baa3  A1-video-controls.json
7c483e0a78cf8de8b04393168616bbd9893302a25ae5e3fbaabd4dbabcef1221  A1-video-device-hash.txt
f84ee05d6c2859fc3c68c0d5478579b9724da3fc848e300bf4c96ec8fcc51e76  A1-video-end-dump.txt
f642d8de0b04466b66544056d5ffcd68787cb20ef9a16cab27eabb49d0279a16  A1-video-end-texts.json
4776e3711db383179842dd1cbf9a62b86b7953703f529a31482686f766c91225  A1-video-end.png
5789f7bb3f3ad258e0d399930660898c78839c744f37e4d86459520872b74ed2  A1-video-end.xml
ab91daccba16f6fe2ab6235db34454a3b30153849a8413144a602f4b19ba3aba  A1-video-ffprobe.json
6f4d9de3426c2e29a2fd361ae88ac691e56bb6b0ae8c57257aec4d4e8a43ee7d  A1-video-frame-times.json
57061e4d2a3da6173bf7a3df503c6117f3cfe1fba12b2b980992513db453b205  A1-video-inputs.json
f40918d974d9a7f236b5bdb894550f85daa5c4d4718fb2e1f1f0a598542b86d5  A1-video-pull.txt
709d9463e55bc6ab1673587ee7c11cf484f371dbccbc2611d2b7b1359ce9ffbe  A1-video-record.json
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  A1-video-screenrecord.txt
f84ee05d6c2859fc3c68c0d5478579b9724da3fc848e300bf4c96ec8fcc51e76  A1-video-setup-dump.txt
cb209c212eee4fb7746d0c0a66c789070e114a4fc8ffa0acd8a89b80daba6733  A1-video-setup-texts.json
11e2c3d21fbaaf70e034aa6d702f7baddd0c352cf0e6355a011b8842fc5b53b8  A1-video-setup.png
948ea6ab11c817bc556a03327c780d039a8b79a380fca3bfddf881265f4fa1ad  A1-video-setup.xml
09e1df6dc9123456429175ee97c115e7a30a3ed76fb21901bbdacc0a545a7108  A1-video-sheet-0.jpg
c7711220d3210c39e9582427656d6b9cef9e3684573152b0755c59e382f2b691  A1-video-sheet-1.jpg
0c0d27163fa203c4fb54145b6231290eb57a72be7093c81ad056dc344ea31f0e  A1-video.mp4
f84ee05d6c2859fc3c68c0d5478579b9724da3fc848e300bf4c96ec8fcc51e76  C-A-1-confirm-dump.txt
33d6f2df3ccae5d1abd409c057c71624d8f8473c9d73811740e97b4a83ca8b11  C-A-1-confirm.xml
6d98c879e5ed51db35708559eb047dceb458a4e89ad192f8e694f179233bb629  C-A-1-controls.json
b53da019a1f61d123e6ea462f90e5895931bf09dbc5099d2484ffef1bdca0b54  C-A-1-device-hash.txt
f84ee05d6c2859fc3c68c0d5478579b9724da3fc848e300bf4c96ec8fcc51e76  C-A-1-end-dump.txt
81a04cd816a7e16450c6429b7a23076e6c7aa5c930a7d22f58eef597173a5aea  C-A-1-end-texts.json
b87c9ce72e4595755657f0a3117f2ba823a4d8a2a27709de4ee81eb3fe77dd8b  C-A-1-end.png
cdffdebb2aefeb8aabe51dae2e912bae9c976f24f44fddd6a8942df49bdea51c  C-A-1-end.xml
934d633f38cac6b80fdcfaad4cee486ed9f2017c2602a69d6f22a23383462b74  C-A-1-framestats.txt
f59edd8dbc5763e9ba38e46fb697d7daa5efd46924638f0121965f540aaff413  C-A-1-gfx-reset.txt
8218a2928aad56b33525527f60161285242d0390dbd14ca7cc336814e868a737  C-A-1-inputs.json
53ebfcb21e6a40e3876a4979ca57c7a2a9c642f30f0a413a796a62cc4f3dd265  C-A-1-perfetto-start.txt
39b30cdb8cd386daa82bd448d2bb81b160fe2c9c9b4d0cebfcb31ed1ff34acc9  C-A-1-pull.txt
f84ee05d6c2859fc3c68c0d5478579b9724da3fc848e300bf4c96ec8fcc51e76  C-A-1-setup-dump.txt
e7393a59e4cbc50f0fbf993a40370988635dbefadef5a289c87dd7f508978db6  C-A-1-setup-texts.json
0ce8f592fe090cbf4dc58e6515b76afedbd34dd15413cb63354fd50d34f6524a  C-A-1-setup.png
8e1c3994a5928127f97cd457f759f60e20c5da93ea821d360e96dbf71f48ea7b  C-A-1-setup.xml
32331db7e68c0295181fb0320df998a660fa7f3d94c69a977d496db7ec72903a  C-A-1-threads-after.txt
32331db7e68c0295181fb0320df998a660fa7f3d94c69a977d496db7ec72903a  C-A-1-threads-before.txt
43d1119e689848d6e3fc9e84a766581ba72a776cff4a297a66fb4d073b9c0f92  C-A-1-top.txt
99aa20ee986a1b61b18af5a318e39ceb10ee8cc190e59d76c578be771e39946e  C-A-1-window.json
27a0e6c5721c163f84bcc2e7add2131449133b3d2257e79dc087c349c8c8ec59  C-A-1.pftrace
f84ee05d6c2859fc3c68c0d5478579b9724da3fc848e300bf4c96ec8fcc51e76  C-A-2-confirm-dump.txt
33d6f2df3ccae5d1abd409c057c71624d8f8473c9d73811740e97b4a83ca8b11  C-A-2-confirm.xml
6d98c879e5ed51db35708559eb047dceb458a4e89ad192f8e694f179233bb629  C-A-2-controls.json
6e667e1c1575d0375d369e03578d8eb308f7936acd281147ed2a9fc09aea588c  C-A-2-device-hash.txt
f84ee05d6c2859fc3c68c0d5478579b9724da3fc848e300bf4c96ec8fcc51e76  C-A-2-end-dump.txt
81a04cd816a7e16450c6429b7a23076e6c7aa5c930a7d22f58eef597173a5aea  C-A-2-end-texts.json
d851d16c1770ae4aa5c0373f77f8c3b3202b3eeb7307a7263e30baa03e3d3193  C-A-2-end.png
cdffdebb2aefeb8aabe51dae2e912bae9c976f24f44fddd6a8942df49bdea51c  C-A-2-end.xml
d28f27a1fd07d08a6759bf28c45d5fe38f92e2e5efddc1326fa98d3b4050ff06  C-A-2-framestats.txt
de177929ddb1d6fca9fdca794f1f6a6f976d0b05b6475bef9cbfb5482d5bed78  C-A-2-gfx-reset.txt
b09c43215ca403eee4265865eaec86fcd9e329b0d1a1a5dd4a6d03c9febdc5b1  C-A-2-inputs.json
f19d8d37cbe3ce254596ed2985fcaa9cf040a3038c5f844185f1816a0ba6cd36  C-A-2-perfetto-start.txt
bf3601509a0fc7a52853930e0010ea1b042e2acf2c28f5815f166276c84bf0b9  C-A-2-pull.txt
f84ee05d6c2859fc3c68c0d5478579b9724da3fc848e300bf4c96ec8fcc51e76  C-A-2-setup-dump.txt
e7393a59e4cbc50f0fbf993a40370988635dbefadef5a289c87dd7f508978db6  C-A-2-setup-texts.json
d98591cc7886fcd8a31d23c954ba89bb442e380d5e69377ecc4f8df118d8aacc  C-A-2-setup.png
8e1c3994a5928127f97cd457f759f60e20c5da93ea821d360e96dbf71f48ea7b  C-A-2-setup.xml
32331db7e68c0295181fb0320df998a660fa7f3d94c69a977d496db7ec72903a  C-A-2-threads-after.txt
32331db7e68c0295181fb0320df998a660fa7f3d94c69a977d496db7ec72903a  C-A-2-threads-before.txt
7c2b435f41fecef9b4b17db427821fb8a79a7bd6940eb9bd6a347a18a10fdbea  C-A-2-top.txt
893c7ca16307c974c8777a2f61281e7b344ef7978c2c9057937609cd101a1de3  C-A-2-window.json
8ea69d352691c552d8bce32051b9619b672cda286261dfedd56399722ba603a5  C-A-2.pftrace
f84ee05d6c2859fc3c68c0d5478579b9724da3fc848e300bf4c96ec8fcc51e76  C-A-3-confirm-dump.txt
33d6f2df3ccae5d1abd409c057c71624d8f8473c9d73811740e97b4a83ca8b11  C-A-3-confirm.xml
6d98c879e5ed51db35708559eb047dceb458a4e89ad192f8e694f179233bb629  C-A-3-controls.json
6724de9e8954f6fddc6613bb0ef2912b52cfff5b14009181729505d8f8970324  C-A-3-device-hash.txt
f84ee05d6c2859fc3c68c0d5478579b9724da3fc848e300bf4c96ec8fcc51e76  C-A-3-end-dump.txt
81a04cd816a7e16450c6429b7a23076e6c7aa5c930a7d22f58eef597173a5aea  C-A-3-end-texts.json
528cb450648ca4cc8cb5136a4778c504fa377915e5638c886c14b9a50add0fae  C-A-3-end.png
cdffdebb2aefeb8aabe51dae2e912bae9c976f24f44fddd6a8942df49bdea51c  C-A-3-end.xml
ca5bfd24ec72f95e7df6c082a38899aad69a8ff81687cdac2ef0984c467559da  C-A-3-framestats.txt
e8e50a8ca23bf3e3c5316f82ce79edb6a6afde9fb29413751c602185e11e53be  C-A-3-gfx-reset.txt
8b7c454fb714324c7a953d030e459c8bde157e459dc33611e5ea3b23494d5ae4  C-A-3-inputs.json
baa8e27e8478bcb08314d2c256759d534af7dcaa66a260684ac2223312cdfc23  C-A-3-perfetto-start.txt
e08349e8ebd779c087aceadb130f5d901b379ff085d2297af40f9a96c5670ec2  C-A-3-pull.txt
f84ee05d6c2859fc3c68c0d5478579b9724da3fc848e300bf4c96ec8fcc51e76  C-A-3-setup-dump.txt
e7393a59e4cbc50f0fbf993a40370988635dbefadef5a289c87dd7f508978db6  C-A-3-setup-texts.json
7828d172075a6d5eaa581a91405ea6e9b30cdb30c85eafda9f82f0fa310c9405  C-A-3-setup.png
8e1c3994a5928127f97cd457f759f60e20c5da93ea821d360e96dbf71f48ea7b  C-A-3-setup.xml
32331db7e68c0295181fb0320df998a660fa7f3d94c69a977d496db7ec72903a  C-A-3-threads-after.txt
32331db7e68c0295181fb0320df998a660fa7f3d94c69a977d496db7ec72903a  C-A-3-threads-before.txt
2b2655417a6e636bb3edc3a0b6c67948863aab42cd717895ae5a4e34aa5af22a  C-A-3-top.txt
9090f6540a8da37f9e3a4a34d798455222092fc3fbe7d881c404700d6a30ddf2  C-A-3-window.json
32b24004785411cb037b10153d73dd8ba01f265b1620a23aafeae20dede8b115  C-A-3.pftrace
f84ee05d6c2859fc3c68c0d5478579b9724da3fc848e300bf4c96ec8fcc51e76  C-A-video-confirm-dump.txt
33d6f2df3ccae5d1abd409c057c71624d8f8473c9d73811740e97b4a83ca8b11  C-A-video-confirm.xml
a0d7c538478eb39e9334c7aabe387172cdb9fc2271529c2c63cac4b5b072baa3  C-A-video-controls.json
37bfa5f7c04929c5df1d956782abdbd4dd1186514e7ac6926786e705b1c66957  C-A-video-device-hash.txt
f84ee05d6c2859fc3c68c0d5478579b9724da3fc848e300bf4c96ec8fcc51e76  C-A-video-end-dump.txt
81a04cd816a7e16450c6429b7a23076e6c7aa5c930a7d22f58eef597173a5aea  C-A-video-end-texts.json
4955a166c739ac4d8bbd225876dfd347c8769221a4edd8dd6f251cd1cf631c38  C-A-video-end.png
cdffdebb2aefeb8aabe51dae2e912bae9c976f24f44fddd6a8942df49bdea51c  C-A-video-end.xml
26cb076b4891621f893a5d5f2e79b701215228fd850923664b0f442ca9a98dac  C-A-video-ffprobe.json
5eb88553d174335e1a8bb09130983d82b6dea059635142d500454538d78f6c43  C-A-video-frame-times.json
8ff04c6ea8d3f0fceb418c5fe01dc7e202aa484d2b179d5fd76be96027e6c2f3  C-A-video-inputs.json
73b6258d1072a5991b62325f36309502ec3b718dad93c1a7dfe8cb30916e4431  C-A-video-pull.txt
d8e8928d5a0c66018cb80a5b2f44d1b3c4ac25a3a552d1f009456c6285af809e  C-A-video-record.json
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  C-A-video-screenrecord.txt
f84ee05d6c2859fc3c68c0d5478579b9724da3fc848e300bf4c96ec8fcc51e76  C-A-video-setup-dump.txt
e7393a59e4cbc50f0fbf993a40370988635dbefadef5a289c87dd7f508978db6  C-A-video-setup-texts.json
f07b2ff8bc153107fbe92219f1ea24415d0b2558248f2e90414efb11529845dd  C-A-video-setup.png
8e1c3994a5928127f97cd457f759f60e20c5da93ea821d360e96dbf71f48ea7b  C-A-video-setup.xml
ab6f1089b19d1ba804c060b5f6c92a5ac58a41f56dfb24eedc2b2dd64f8d3256  C-A-video-sheet-0.jpg
65592073b972e3416d4c0c752f4ccaf7f9acf885eaf261cf84195e0a96ecf839  C-A-video-sheet-1.jpg
f5af7b01e48d63d65af0bbfe8d1765b663bb569acd2c910ae64398059a856126  C-A-video.mp4
f84ee05d6c2859fc3c68c0d5478579b9724da3fc848e300bf4c96ec8fcc51e76  C-W-1-confirm-dump.txt
33d6f2df3ccae5d1abd409c057c71624d8f8473c9d73811740e97b4a83ca8b11  C-W-1-confirm.xml
a0d7c538478eb39e9334c7aabe387172cdb9fc2271529c2c63cac4b5b072baa3  C-W-1-controls.json
f7b4fed96c2aeb723e2ef34850988ff01163bf763c6b2019f47eb659519dda96  C-W-1-device-hash.txt
f84ee05d6c2859fc3c68c0d5478579b9724da3fc848e300bf4c96ec8fcc51e76  C-W-1-end-dump.txt
0945d21332780893094ed579d6383f964606ce28474f5bd824bdfbeab2c2a2d0  C-W-1-end-texts.json
e6fecfbc7b0b44c0fa68bb1d190eab410bcc9368af0bc37f56f2a770ea5d7112  C-W-1-end.png
8f4a8fdcc561396e455b61b2d73c3e981aae631507b0ec69c329abe1a7f3e532  C-W-1-end.xml
ea5109db7129a50c3f1e001f501c5b431ec5cb75ce698d2dfbc70b6b1d7ec3f4  C-W-1-framestats.txt
5f2b3e281515d5768561d2fcc4cb7bf3377ea8ceb9b3ca863d8b6fd5762521bf  C-W-1-gfx-reset.txt
fb328b3074d36f2f947e065c10dadd39b6bd8212d9f82e98c6af6b4b21d72195  C-W-1-inputs.json
25d0dfdbce003a803db5246ad857c82e27d60aafe7053fb6f315c595a0402a49  C-W-1-perfetto-start.txt
46890b6f194059e6c9c4f7a08f40e62d9c1b7c5a77ca235832fdd30d1bb5814b  C-W-1-pull.txt
f84ee05d6c2859fc3c68c0d5478579b9724da3fc848e300bf4c96ec8fcc51e76  C-W-1-setup-dump.txt
fec1f04a7337b22b971c4942751965e12649d144658b997b0917a68ec6be3f9d  C-W-1-setup-texts.json
7742b5259bf5214765230a9ec9345e6cdc7cc70b8c50e06bb5d03deec4797268  C-W-1-setup.png
118105c978df80148d186d2066635f5dc56b4bcb0019c6962452dff80e22e2d7  C-W-1-setup.xml
32331db7e68c0295181fb0320df998a660fa7f3d94c69a977d496db7ec72903a  C-W-1-threads-after.txt
32331db7e68c0295181fb0320df998a660fa7f3d94c69a977d496db7ec72903a  C-W-1-threads-before.txt
4fedc438b012482e36d46a0fd9412ed69c3189bea479b7c4682c27aa88df19cb  C-W-1-top.txt
def396603c032bdca800060275db10c5dff6496ad75c7f0bcf609a0f2e5f50c9  C-W-1-window.json
e1f955ff66d44b3adcd25210acdd1052c77ba0634b4764f1afbeb4b65de05e3e  C-W-1.pftrace
f84ee05d6c2859fc3c68c0d5478579b9724da3fc848e300bf4c96ec8fcc51e76  C-W-2-confirm-dump.txt
33d6f2df3ccae5d1abd409c057c71624d8f8473c9d73811740e97b4a83ca8b11  C-W-2-confirm.xml
a0d7c538478eb39e9334c7aabe387172cdb9fc2271529c2c63cac4b5b072baa3  C-W-2-controls.json
b19a19516fd7004b83124498db0554e9c7b8cde1e6e733ed14dae7f932a40632  C-W-2-device-hash.txt
f84ee05d6c2859fc3c68c0d5478579b9724da3fc848e300bf4c96ec8fcc51e76  C-W-2-end-dump.txt
0945d21332780893094ed579d6383f964606ce28474f5bd824bdfbeab2c2a2d0  C-W-2-end-texts.json
9ca11cdd6a9d35ffa303cec0747f60dbf74589c233dbe23ab3d8ef92560259b0  C-W-2-end.png
8f4a8fdcc561396e455b61b2d73c3e981aae631507b0ec69c329abe1a7f3e532  C-W-2-end.xml
0468708c3d48faf7d2f4984b81736f8a5399ef217d37af0cbe6253e33e961d44  C-W-2-framestats.txt
461588437a35f122fc7e2db8b29a59fe99d966639f4e9ab92dc2ea663c5dc3b5  C-W-2-gfx-reset.txt
234b26c7ebdef1ec45c2a546f623ef9afd0512e8f6b1047bc6f58494a508b0a6  C-W-2-inputs.json
076bf60e85a6335cb2c1460c0f5133db889714dc62d06fdb2eeaa845c1090976  C-W-2-perfetto-start.txt
a33fd161e7e8b48278abfa865103eeee810dc186d1286d446eeae76dd1e19551  C-W-2-pull.txt
f84ee05d6c2859fc3c68c0d5478579b9724da3fc848e300bf4c96ec8fcc51e76  C-W-2-setup-dump.txt
fec1f04a7337b22b971c4942751965e12649d144658b997b0917a68ec6be3f9d  C-W-2-setup-texts.json
6089343d4d04b2210c4b9d6007b2321b07d736903c025226ae35818f01f955b0  C-W-2-setup.png
118105c978df80148d186d2066635f5dc56b4bcb0019c6962452dff80e22e2d7  C-W-2-setup.xml
32331db7e68c0295181fb0320df998a660fa7f3d94c69a977d496db7ec72903a  C-W-2-threads-after.txt
32331db7e68c0295181fb0320df998a660fa7f3d94c69a977d496db7ec72903a  C-W-2-threads-before.txt
fb9dd2cd238eee0b945439688c3d886bfcedda637e29dd707b63da8b973ce271  C-W-2-top.txt
f04aef68de45f4d5ed3467f8cd2a6519e1ca4dcf21a06397ba2f20d37b0ca00e  C-W-2-window.json
e113e8912329afa50cb9567ea2245d8739cb7c3a522a0736a0f9f86ba9dafa09  C-W-2.pftrace
f84ee05d6c2859fc3c68c0d5478579b9724da3fc848e300bf4c96ec8fcc51e76  C-W-3-confirm-dump.txt
33d6f2df3ccae5d1abd409c057c71624d8f8473c9d73811740e97b4a83ca8b11  C-W-3-confirm.xml
a0d7c538478eb39e9334c7aabe387172cdb9fc2271529c2c63cac4b5b072baa3  C-W-3-controls.json
1bb5dc4df95c1ee8a914630542f4d4b662e6ccc0b9f24a57e4e2a3ec3d3c6064  C-W-3-device-hash.txt
f84ee05d6c2859fc3c68c0d5478579b9724da3fc848e300bf4c96ec8fcc51e76  C-W-3-end-dump.txt
0945d21332780893094ed579d6383f964606ce28474f5bd824bdfbeab2c2a2d0  C-W-3-end-texts.json
00b0742f9d4cf1de50a5c39cc0709e30544cf6eeb73c514f05a63dfd11a272f1  C-W-3-end.png
8f4a8fdcc561396e455b61b2d73c3e981aae631507b0ec69c329abe1a7f3e532  C-W-3-end.xml
e25f216818516b655bd7714478887f45260463a95a29ab46eba84da42f34d701  C-W-3-framestats.txt
705c8c86c5a4ed2d643672829fb3746574677c533a1e08d82359c1922b923ab9  C-W-3-gfx-reset.txt
2a875656befa1bef0850901455e752e4828f7bc523896996e8763bd20bb0a4b2  C-W-3-inputs.json
aafd53f9d3053948b77e532d9e5c0423d4afacc968c75d3c787e04b036c6c1d9  C-W-3-perfetto-start.txt
f71a639745a916c6e01dd2126e869ea15b48dde61377085bc871792b33273b4c  C-W-3-pull.txt
f84ee05d6c2859fc3c68c0d5478579b9724da3fc848e300bf4c96ec8fcc51e76  C-W-3-setup-dump.txt
fec1f04a7337b22b971c4942751965e12649d144658b997b0917a68ec6be3f9d  C-W-3-setup-texts.json
465b9b08dade57acc49a1393a5538f5e1678fee45c6c9e55fbc928d3e6b7f987  C-W-3-setup.png
118105c978df80148d186d2066635f5dc56b4bcb0019c6962452dff80e22e2d7  C-W-3-setup.xml
32331db7e68c0295181fb0320df998a660fa7f3d94c69a977d496db7ec72903a  C-W-3-threads-after.txt
32331db7e68c0295181fb0320df998a660fa7f3d94c69a977d496db7ec72903a  C-W-3-threads-before.txt
ac92881fd9ef8daabc534a37a3e49bb21a6e06d1778dd7de74b3e6a6954d9e38  C-W-3-top.txt
63259830c319fc006320d365a663a420f708b9cb8a6569234d21d5ffb47293af  C-W-3-window.json
cd3044c4024d9e77f055925e6a754b37bad4448ef1e1bcc8f35e370bd38ff64e  C-W-3.pftrace
f84ee05d6c2859fc3c68c0d5478579b9724da3fc848e300bf4c96ec8fcc51e76  C-W-video-confirm-dump.txt
33d6f2df3ccae5d1abd409c057c71624d8f8473c9d73811740e97b4a83ca8b11  C-W-video-confirm.xml
a0d7c538478eb39e9334c7aabe387172cdb9fc2271529c2c63cac4b5b072baa3  C-W-video-controls.json
1d9b522fb2e48fab45404f2e252f7708b5bc53973e1fdf27e4ef34b3bbc1e215  C-W-video-device-hash.txt
f84ee05d6c2859fc3c68c0d5478579b9724da3fc848e300bf4c96ec8fcc51e76  C-W-video-end-dump.txt
0945d21332780893094ed579d6383f964606ce28474f5bd824bdfbeab2c2a2d0  C-W-video-end-texts.json
5d20f54bbf1887484382c2bd1b3caad66c7f15cf6c5752fd44dfe73f886ef4d1  C-W-video-end.png
8f4a8fdcc561396e455b61b2d73c3e981aae631507b0ec69c329abe1a7f3e532  C-W-video-end.xml
5f4b7ec19929218be3d06e4e8fdb927f2457af6cc9f3452c9a1a84ad95d4d8e8  C-W-video-ffprobe.json
cbcefc4e87e78e25615a1f5fcbea63079ac6e97f93f701d3701dfca156ca2288  C-W-video-frame-times.json
8dcc11ba019dfb27ce820319d1fc52722f60a229ff50756a832df3b29cd8d11b  C-W-video-inputs.json
879adebd1da05c6f4d34ade97720074f97cb094776a37a96220f196a3d559405  C-W-video-pull.txt
dd8f266c81d6a8d4e9e7dce423acd6114f09aba62fac9ee836820ab701f13de2  C-W-video-record.json
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  C-W-video-screenrecord.txt
f84ee05d6c2859fc3c68c0d5478579b9724da3fc848e300bf4c96ec8fcc51e76  C-W-video-setup-dump.txt
fec1f04a7337b22b971c4942751965e12649d144658b997b0917a68ec6be3f9d  C-W-video-setup-texts.json
6b00ea67b360d00612ecded6123dc1270f673a17062e16106c0ff8d837b220cc  C-W-video-setup.png
118105c978df80148d186d2066635f5dc56b4bcb0019c6962452dff80e22e2d7  C-W-video-setup.xml
0ce8dba6d65ab49b5954bba6e27156b00a90cfe6a29538ef5d8ebbdc3ad6dd17  C-W-video-sheet-0.jpg
05e28bf3175397cf39133e3cb5b5d94a4ff97509ac1e233ecc360e38393ce496  C-W-video-sheet-1.jpg
3c3c0fcc4daab6cc8dbbbb8e80f21a8d0bb1c74df3bde7d42ea57b45b3a28d70  C-W-video.mp4
f84ee05d6c2859fc3c68c0d5478579b9724da3fc848e300bf4c96ec8fcc51e76  I-1-confirm-dump.txt
33d6f2df3ccae5d1abd409c057c71624d8f8473c9d73811740e97b4a83ca8b11  I-1-confirm.xml
58fb4ba056e7dc049a7a404df7abe47559571242857175246b7cec462066a654  I-1-controls.json
f6f49187d66282faf9567df03db943fff1a858584a1075ca1e2c06017c5f40d5  I-1-device-hash.txt
f84ee05d6c2859fc3c68c0d5478579b9724da3fc848e300bf4c96ec8fcc51e76  I-1-end-dump.txt
7444db29b9cf8f51e624ede19eeb9e8a8a12e980092f1a59087318045a6c7287  I-1-end-texts.json
572e1589978cc08f60aa3d1b8128675a770dd562e43e4f356a757b7acfae8ca6  I-1-end.png
898ccdafda500b3f4277dce53dd7b63d25039d184af9edf1032b55616cea5528  I-1-end.xml
e371dfb2be65bce36c9f2b484ba0db0332aae8e1790298b1e908f24a6a75a5c0  I-1-framestats.txt
0431ff1fa014dba47b4be594063c71699971716d86f74136bfdf33041ca49e44  I-1-gfx-reset.txt
4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945  I-1-inputs.json
6b45365bd9e37e4e0c485309ac6703d2e283f04f6ca80b1c4e56913365d73c05  I-1-perfetto-start.txt
e637072013cea2e09d638ce75ad1e43fc99698402512cfd861e8c497e9513ff8  I-1-pull.txt
f84ee05d6c2859fc3c68c0d5478579b9724da3fc848e300bf4c96ec8fcc51e76  I-1-setup-dump.txt
7444db29b9cf8f51e624ede19eeb9e8a8a12e980092f1a59087318045a6c7287  I-1-setup-texts.json
5b1cd22a5f752777ee81df35f8f80c28f34d1ab1f05b59dfe881a7b5cce7fb31  I-1-setup.png
898ccdafda500b3f4277dce53dd7b63d25039d184af9edf1032b55616cea5528  I-1-setup.xml
7d34d4d871829a022fb3b43dc06856baa42e52195dbb3da057766ea157c49810  I-1-threads-after.txt
9c2693d98fe7c00ff7b146cb1eaf06aa3d330b5b548d3becdf6d3d969d5d3ec7  I-1-threads-before.txt
e5631b38a4a28a5f985c3b5016d89f45926063e66032ab2d0264d140d8f5ca85  I-1-top.txt
734bda7ba7ee9fad68d595677fac500345840c9f1823a598df618f476b88e9d4  I-1-window.json
7625057f7f6b08afd94844a9e384616918afe795a65074a5fdd0c0c21cf171d4  I-1.pftrace
f84ee05d6c2859fc3c68c0d5478579b9724da3fc848e300bf4c96ec8fcc51e76  I-2-confirm-dump.txt
33d6f2df3ccae5d1abd409c057c71624d8f8473c9d73811740e97b4a83ca8b11  I-2-confirm.xml
58fb4ba056e7dc049a7a404df7abe47559571242857175246b7cec462066a654  I-2-controls.json
fbf86f0b498e886356fc9e29e6dd5b83d2e752ca3131fcb1fd4a25f5c677dd71  I-2-device-hash.txt
f84ee05d6c2859fc3c68c0d5478579b9724da3fc848e300bf4c96ec8fcc51e76  I-2-end-dump.txt
7444db29b9cf8f51e624ede19eeb9e8a8a12e980092f1a59087318045a6c7287  I-2-end-texts.json
c1fd2bb67c77b5e88f10552a696782c3e5af0954dcfa56a79f4fd8cdaa534390  I-2-end.png
898ccdafda500b3f4277dce53dd7b63d25039d184af9edf1032b55616cea5528  I-2-end.xml
b4a72da6783a5572b795f1587a4cf41e9b0cb0c9d8b0ec51c5ecfaa937c06823  I-2-framestats.txt
a78da2ac27cea2a035d7444b1bd37d53ce9abc7623c57f540820b44c088a2000  I-2-gfx-reset.txt
4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945  I-2-inputs.json
7ac1ce5adfd3076b870a9edffb056aaf0da6ba87c8fbbad8469a11822f0abd8c  I-2-perfetto-start.txt
a6aae10a22b9e5838e2cbf05ae589f90c73b2e6271e37ddad2a6f16948f09ab7  I-2-pull.txt
f84ee05d6c2859fc3c68c0d5478579b9724da3fc848e300bf4c96ec8fcc51e76  I-2-setup-dump.txt
7444db29b9cf8f51e624ede19eeb9e8a8a12e980092f1a59087318045a6c7287  I-2-setup-texts.json
1aff9bc573eb4d72367e0a1cbe9435f16176b52032b51de65b32c11557757381  I-2-setup.png
898ccdafda500b3f4277dce53dd7b63d25039d184af9edf1032b55616cea5528  I-2-setup.xml
4dd9c560bc7d97245cb7d83a53ab62fc117ae19e216a84720f5e85eb0b56970e  I-2-threads-after.txt
4dd9c560bc7d97245cb7d83a53ab62fc117ae19e216a84720f5e85eb0b56970e  I-2-threads-before.txt
1260ed47fc3d9e9d0ddab39cef27c12879c053053eb3e05943f2a4207a060471  I-2-top.txt
fc8cf7d21c8b7b9f9eb400b40382d29d7f25cfa7c5318a3a3801e9ce120cb353  I-2-window.json
3b7783252137dd17cfa9b9c30fa1bb02361d8aebdc9ebdebe3ea508f19926294  I-2.pftrace
f84ee05d6c2859fc3c68c0d5478579b9724da3fc848e300bf4c96ec8fcc51e76  I-3-confirm-dump.txt
33d6f2df3ccae5d1abd409c057c71624d8f8473c9d73811740e97b4a83ca8b11  I-3-confirm.xml
58fb4ba056e7dc049a7a404df7abe47559571242857175246b7cec462066a654  I-3-controls.json
6aaab6748f2eaaedecccade0dd8da562017cb6dfd2f09ed9ebd10cabb3d578e0  I-3-device-hash.txt
f84ee05d6c2859fc3c68c0d5478579b9724da3fc848e300bf4c96ec8fcc51e76  I-3-end-dump.txt
7444db29b9cf8f51e624ede19eeb9e8a8a12e980092f1a59087318045a6c7287  I-3-end-texts.json
c1fd2bb67c77b5e88f10552a696782c3e5af0954dcfa56a79f4fd8cdaa534390  I-3-end.png
898ccdafda500b3f4277dce53dd7b63d25039d184af9edf1032b55616cea5528  I-3-end.xml
2ccaa02e7edd9db95bd1cb3af9688db3581c0104b5a6575f8044f390fe0ef26a  I-3-framestats.txt
f50dce67aae6afd5662b4d190a30a497f83736593eec5f887519455a9204eb26  I-3-gfx-reset.txt
4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945  I-3-inputs.json
d134b082733e54686d75e24de14130b966f743bd68469cec7ce859ac3ca30949  I-3-perfetto-start.txt
e05c12627085238688cd404594defae3389caafaa715b43b4fcba5f019ff62fe  I-3-pull.txt
f84ee05d6c2859fc3c68c0d5478579b9724da3fc848e300bf4c96ec8fcc51e76  I-3-setup-dump.txt
7444db29b9cf8f51e624ede19eeb9e8a8a12e980092f1a59087318045a6c7287  I-3-setup-texts.json
9c051bde785c55ec6ef12cb3623af62e024eb02ea600c091eb8e5d1582d5e14c  I-3-setup.png
898ccdafda500b3f4277dce53dd7b63d25039d184af9edf1032b55616cea5528  I-3-setup.xml
4dd9c560bc7d97245cb7d83a53ab62fc117ae19e216a84720f5e85eb0b56970e  I-3-threads-after.txt
4dd9c560bc7d97245cb7d83a53ab62fc117ae19e216a84720f5e85eb0b56970e  I-3-threads-before.txt
145595c27cad4d65d7e1a3c44ce72aeb1385f74eaf3e4de05acea09490c8e927  I-3-top.txt
f5ae5659f6cb7b3692e94040de396a327a383dbb99d150ed0c661d01f31dc060  I-3-window.json
4a97c201f9402364905a68579d41780fece4babb2358a7c400b647ce4a58b4b6  I-3.pftrace
f84ee05d6c2859fc3c68c0d5478579b9724da3fc848e300bf4c96ec8fcc51e76  I-video-confirm-dump.txt
33d6f2df3ccae5d1abd409c057c71624d8f8473c9d73811740e97b4a83ca8b11  I-video-confirm.xml
a0d7c538478eb39e9334c7aabe387172cdb9fc2271529c2c63cac4b5b072baa3  I-video-controls.json
c5ddf993b7df802eb0396bfe2a319dadd2f4fc99e73cdfeedc31896fe7d3b11b  I-video-device-hash.txt
f84ee05d6c2859fc3c68c0d5478579b9724da3fc848e300bf4c96ec8fcc51e76  I-video-end-dump.txt
7444db29b9cf8f51e624ede19eeb9e8a8a12e980092f1a59087318045a6c7287  I-video-end-texts.json
2b1d801b99b5d992aed6af9fcbe434ca8fbb8704eb21f56763136545bb257e59  I-video-end.png
898ccdafda500b3f4277dce53dd7b63d25039d184af9edf1032b55616cea5528  I-video-end.xml
c95c193c5f96cdd460743b1ebf32d067ddad6b528620b38272c87eac60a0d10d  I-video-ffprobe.json
2fc8d3b8c6d36661515c991f3793d7483454c51e66df6b20d3a24a40fff057d5  I-video-frame-times.json
4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945  I-video-inputs.json
9e67a7eae3723d6404dbf24cdee4ef5d432016199125a0f7195cf5a2a0d6a8f4  I-video-pull.txt
7e2bf1b1b8a4436bcc19480a14e543ee7035a45fd1032d7e40d5d86b066d8132  I-video-record.json
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  I-video-screenrecord.txt
f84ee05d6c2859fc3c68c0d5478579b9724da3fc848e300bf4c96ec8fcc51e76  I-video-setup-dump.txt
7444db29b9cf8f51e624ede19eeb9e8a8a12e980092f1a59087318045a6c7287  I-video-setup-texts.json
652690710333606738f9be6ccabc7453f93d0530cd34fc3c3f3d9bb2ea68795a  I-video-setup.png
898ccdafda500b3f4277dce53dd7b63d25039d184af9edf1032b55616cea5528  I-video-setup.xml
1c5b19a396bd32dd9d4e25c8b464594b659d4f3d2e24fd1847604a61d4e0cf56  I-video-sheet-0.jpg
57d10c4996bbd60ead5b4aad53f041a33d76492a56adbeaef18307fc78c1cd75  I-video-sheet-1.jpg
02ad4a957494b3930d2f1292bd13052fd20a0999cab76a392301e54d7ad9690d  I-video.mp4
f84ee05d6c2859fc3c68c0d5478579b9724da3fc848e300bf4c96ec8fcc51e76  M-1-confirm-dump.txt
33d6f2df3ccae5d1abd409c057c71624d8f8473c9d73811740e97b4a83ca8b11  M-1-confirm.xml
58fb4ba056e7dc049a7a404df7abe47559571242857175246b7cec462066a654  M-1-controls.json
7f7f0864cef87978a8cd2e673ad353f04b31713cc6070013b5cd78da9742f488  M-1-device-hash.txt
f84ee05d6c2859fc3c68c0d5478579b9724da3fc848e300bf4c96ec8fcc51e76  M-1-end-dump.txt
10433919f2da557398cb4579ef98b991cf316b55215743d9c3b22c851feb3be9  M-1-end-texts.json
d6c5fe041e49ccdf6bed75e80094181fa182a95e2546d68b79775de9ee4aa03c  M-1-end.png
f1d8e68d5167afed06fe2b3499cc51d8197546d988b09e56e30c6028daa70b2f  M-1-end.xml
5421cc57a2824e1bb60dc35d7314b81c5b99f97b4535b487b41284d166a430bf  M-1-framestats.txt
bcb3cf7c4930c29d777afd266054d3205735e55f757aa2c30285ce1d0578f1d9  M-1-gfx-reset.txt
16ed6046f67dc6bf812416071c9aa337772bf9ffaebbc222e4c78dbea3d46787  M-1-inputs.json
7076740afcf7d34ee7b18b4fd2547482021778003b4a1eb997d1021a370337b5  M-1-perfetto-start.txt
b5e57469de7a9612f2ada03104bfa4d6dd1074dda09ed5e1aaa154568a7a7268  M-1-pull.txt
f84ee05d6c2859fc3c68c0d5478579b9724da3fc848e300bf4c96ec8fcc51e76  M-1-setup-dump.txt
7444db29b9cf8f51e624ede19eeb9e8a8a12e980092f1a59087318045a6c7287  M-1-setup-texts.json
c1fd2bb67c77b5e88f10552a696782c3e5af0954dcfa56a79f4fd8cdaa534390  M-1-setup.png
898ccdafda500b3f4277dce53dd7b63d25039d184af9edf1032b55616cea5528  M-1-setup.xml
4dd9c560bc7d97245cb7d83a53ab62fc117ae19e216a84720f5e85eb0b56970e  M-1-threads-after.txt
4dd9c560bc7d97245cb7d83a53ab62fc117ae19e216a84720f5e85eb0b56970e  M-1-threads-before.txt
88b640a09be82d1e338aca748eff4e8fb95867fbf0e6a0c8451a44ea67d458ff  M-1-top.txt
a54cab044ef21040bb2b37d129f77feeec328b384cc6c55207a253885cbe2b13  M-1-window.json
48c951734e2bf288790819284c77bff1532c27deee3f2cffb777b69e52b06aa6  M-1.pftrace
f84ee05d6c2859fc3c68c0d5478579b9724da3fc848e300bf4c96ec8fcc51e76  M-2-confirm-dump.txt
33d6f2df3ccae5d1abd409c057c71624d8f8473c9d73811740e97b4a83ca8b11  M-2-confirm.xml
58fb4ba056e7dc049a7a404df7abe47559571242857175246b7cec462066a654  M-2-controls.json
f565f4d86f0c7133e76369a281b2ea39da59a7919b7fa72e17accda51b63fd01  M-2-device-hash.txt
f84ee05d6c2859fc3c68c0d5478579b9724da3fc848e300bf4c96ec8fcc51e76  M-2-end-dump.txt
10433919f2da557398cb4579ef98b991cf316b55215743d9c3b22c851feb3be9  M-2-end-texts.json
292e81ee385c3c5c8b9e02d0ab166154620f4d6433f35d4f17e3584ae6588719  M-2-end.png
f1d8e68d5167afed06fe2b3499cc51d8197546d988b09e56e30c6028daa70b2f  M-2-end.xml
fb7a23af755e489e567541a7fa4ca5db27964bb2f5d1dd90128f8659c36fbf78  M-2-framestats.txt
511bb0bba6b135049729322baed94e7a492e6bfcdca838370647aca76288d873  M-2-gfx-reset.txt
338ff1502a8154583489162be4a176751a9c6a0c8e98836720619af4e6cfe3e1  M-2-inputs.json
659b81e838ea53b1858309ef17c0a6d606bf2714639b7fe3d18ebb5a4706cd3b  M-2-perfetto-start.txt
2ffa3b65cc109d5dbe84bb2b0f9900b3af156cd9c1ae0ccf8160bd08aa6e1db7  M-2-pull.txt
f84ee05d6c2859fc3c68c0d5478579b9724da3fc848e300bf4c96ec8fcc51e76  M-2-setup-dump.txt
7444db29b9cf8f51e624ede19eeb9e8a8a12e980092f1a59087318045a6c7287  M-2-setup-texts.json
05b04b6699274c5680c71556d0ee68876ea654478eae6223e6ee428edfb12172  M-2-setup.png
898ccdafda500b3f4277dce53dd7b63d25039d184af9edf1032b55616cea5528  M-2-setup.xml
4dd9c560bc7d97245cb7d83a53ab62fc117ae19e216a84720f5e85eb0b56970e  M-2-threads-after.txt
4dd9c560bc7d97245cb7d83a53ab62fc117ae19e216a84720f5e85eb0b56970e  M-2-threads-before.txt
173b80691818447fe5eec39b5619bd88a9c7e786bb07db3911008b646ade976f  M-2-top.txt
c097a9f9c5dad28cd162f8b14cf91f57ce3f30c8b510bd9dc16e6e38fac48b27  M-2-window.json
e77d15383617963779eaf6b89cc4e77d3c0d23c18d9cea4a3dc6649f5d3dcde8  M-2.pftrace
f84ee05d6c2859fc3c68c0d5478579b9724da3fc848e300bf4c96ec8fcc51e76  M-3-confirm-dump.txt
33d6f2df3ccae5d1abd409c057c71624d8f8473c9d73811740e97b4a83ca8b11  M-3-confirm.xml
58fb4ba056e7dc049a7a404df7abe47559571242857175246b7cec462066a654  M-3-controls.json
224fe6d4abb262c9f179806720cbe7366088ab41db7da9be247307bbdaf40e76  M-3-device-hash.txt
f84ee05d6c2859fc3c68c0d5478579b9724da3fc848e300bf4c96ec8fcc51e76  M-3-end-dump.txt
10433919f2da557398cb4579ef98b991cf316b55215743d9c3b22c851feb3be9  M-3-end-texts.json
abe7a5246dc61b2dfd171f9d5febac8fe102d85284abd19267a3f64a6a897dac  M-3-end.png
f1d8e68d5167afed06fe2b3499cc51d8197546d988b09e56e30c6028daa70b2f  M-3-end.xml
5d665342eeced00b50cc8a4989778e86112c25fef58f7c8833e58967d57b79dc  M-3-framestats.txt
a0d74d543f84f3b5d4a024e0bbee17313b978a178f433e2143cd7f4bc48e0add  M-3-gfx-reset.txt
7b067fdf9f998e50ba942e4a5f7016fcc76dd96af7c47541b01673011f2d2879  M-3-inputs.json
b474cf679e46957d64392a076c0038ef1fb601e7ec47d52e3fa87d3614e94175  M-3-perfetto-start.txt
8d33a8f0c1c73709efa953c9f1595fad062e5f10b4bd792d2b76eab4423f391f  M-3-pull.txt
f84ee05d6c2859fc3c68c0d5478579b9724da3fc848e300bf4c96ec8fcc51e76  M-3-setup-dump.txt
7444db29b9cf8f51e624ede19eeb9e8a8a12e980092f1a59087318045a6c7287  M-3-setup-texts.json
5e69ccf11dcc6e0a8c7e7aa013f2b7f568c2dcb5506cd173be116cf2a02954e9  M-3-setup.png
898ccdafda500b3f4277dce53dd7b63d25039d184af9edf1032b55616cea5528  M-3-setup.xml
4dd9c560bc7d97245cb7d83a53ab62fc117ae19e216a84720f5e85eb0b56970e  M-3-threads-after.txt
4dd9c560bc7d97245cb7d83a53ab62fc117ae19e216a84720f5e85eb0b56970e  M-3-threads-before.txt
c6777056de58c1deeab3d3c75a5129f5a855e102cb791cd8a950a49bb70ec82c  M-3-top.txt
f238c6d81c84b6c3de47bddf47dbc5b2c215fe8c18b56eb06b76bacb1dacd08a  M-3-window.json
fb9599c7ede2dc437acbf93333f9d0a9b7ac90a07f7a5d5a2946d3c1a0ef7431  M-3.pftrace
2f559c913a864440a27f558f5922c3bbd9cd1e93f910522f418bbf97b8fdbfa8  M-contact.jpg
144810f4efff8393dd861acf88852029eb5d920d2fb423c6ce0fc3ad32077a37  M-late-FX.jpg
49df64f4bc597b1c4ff35b4604c1e708b4d4cd973800248fe261e20c492390d1  M-touch-inspection.jpg
f84ee05d6c2859fc3c68c0d5478579b9724da3fc848e300bf4c96ec8fcc51e76  M-video-confirm-dump.txt
33d6f2df3ccae5d1abd409c057c71624d8f8473c9d73811740e97b4a83ca8b11  M-video-confirm.xml
a0d7c538478eb39e9334c7aabe387172cdb9fc2271529c2c63cac4b5b072baa3  M-video-controls.json
31a63373116bb85e618b03cc25e7b10dbd8415d00a25b6efd19e71bbfd71ddfd  M-video-device-hash.txt
f84ee05d6c2859fc3c68c0d5478579b9724da3fc848e300bf4c96ec8fcc51e76  M-video-end-dump.txt
10433919f2da557398cb4579ef98b991cf316b55215743d9c3b22c851feb3be9  M-video-end-texts.json
7fa83c2e7220588d2af09c5068c84c63aa34ebd0913d74919d25786f8992b7a9  M-video-end.png
f1d8e68d5167afed06fe2b3499cc51d8197546d988b09e56e30c6028daa70b2f  M-video-end.xml
a5329687ed036200740452721d61510acf91f1eddb351675e7411e6c9ef35b1a  M-video-ffprobe.json
f0aabd53edd1b5004d3034633e567738c47c9c4f236ae80b114df66f190e9716  M-video-frame-times.json
87f4c7bd96b461e2f24cc07495314266c095e109d2e5965e456120ba5fe24ae0  M-video-inputs.json
6e7ad7e0594e26f9201779e6af75cc466f7a7c538f3f383740521ff691503b1e  M-video-pull.txt
4323f00f72bea9a1457c33e7b45bafa71bc0beb495d62d387785530c6b727caf  M-video-record.json
f84ee05d6c2859fc3c68c0d5478579b9724da3fc848e300bf4c96ec8fcc51e76  M-video-retry-confirm-dump.txt
33d6f2df3ccae5d1abd409c057c71624d8f8473c9d73811740e97b4a83ca8b11  M-video-retry-confirm.xml
a0d7c538478eb39e9334c7aabe387172cdb9fc2271529c2c63cac4b5b072baa3  M-video-retry-controls.json
11837f01f9e16d6c0dade6e5999976ec5a8343748310b9c8f4dbf5d4462d51ad  M-video-retry-device-hash.txt
f84ee05d6c2859fc3c68c0d5478579b9724da3fc848e300bf4c96ec8fcc51e76  M-video-retry-end-dump.txt
10433919f2da557398cb4579ef98b991cf316b55215743d9c3b22c851feb3be9  M-video-retry-end-texts.json
6071c61dcac370df535138b3fba235a9c39aaa327e4ac0ea1dff05e20bb1150b  M-video-retry-end.png
f1d8e68d5167afed06fe2b3499cc51d8197546d988b09e56e30c6028daa70b2f  M-video-retry-end.xml
549c698e2578ce7425d58208528ef5fe79f58cfe5c2475a1b6f700b6c2d5ef82  M-video-retry-ffprobe.json
7cf84556445e77421acdf83565ffccae026fe4c31dd5d133cf0a05acb76e637a  M-video-retry-frame-times.json
4af3ceca3f215a98f0bd2ecb64bd0ae6cd5141fbc8a595e57c29e0140d2e2f1d  M-video-retry-inputs.json
92cf21eb4f8add767d3709a987e2667d4d855511125ab22bea7b9046b780ec1f  M-video-retry-pull.txt
8a51d9bc3e196163f0e6b052cf73f7f196287d4bd054abb383c400265115051d  M-video-retry-record.json
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  M-video-retry-screenrecord.txt
f84ee05d6c2859fc3c68c0d5478579b9724da3fc848e300bf4c96ec8fcc51e76  M-video-retry-setup-dump.txt
7444db29b9cf8f51e624ede19eeb9e8a8a12e980092f1a59087318045a6c7287  M-video-retry-setup-texts.json
f7bac1465a69ee8aafbb3d35894765de3cba127dd20b0cee49d1db14808a6690  M-video-retry-setup.png
898ccdafda500b3f4277dce53dd7b63d25039d184af9edf1032b55616cea5528  M-video-retry-setup.xml
2d048dbd023e31ea0afd5eb8e78f560f021b2e0c009e78964db95fd62b23639e  M-video-retry-sheet-0.jpg
f6fd4fd4d4fd313e0e2bc679e59c4a1b1df5a195cd4a3d9d8840a5b08930512f  M-video-retry-sheet-1.jpg
72beb6ffba8b940bd4c3acb5fee237a3e8690b1af4899a856a752991f9e8e82a  M-video-retry.mp4
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  M-video-screenrecord.txt
f84ee05d6c2859fc3c68c0d5478579b9724da3fc848e300bf4c96ec8fcc51e76  M-video-setup-dump.txt
7444db29b9cf8f51e624ede19eeb9e8a8a12e980092f1a59087318045a6c7287  M-video-setup-texts.json
cc986635774bfb7429cc20eda8cd9f09d189993adfd7c5df912b15c0ba148c6d  M-video-setup.png
898ccdafda500b3f4277dce53dd7b63d25039d184af9edf1032b55616cea5528  M-video-setup.xml
08dab22e2586b7dd98ff2770fae83f6ead01ecb58e0640fdfae48108bfde6945  M-video-sheet-0.jpg
adf69eef490013858b35ed57ac75218a6d544f10ed3655f4403b95dc51586135  M-video-sheet-1.jpg
31a29e896f035cd939ee97d92942abfe4d56653db539647c08df7c921fca4491  M-video.mp4
f84ee05d6c2859fc3c68c0d5478579b9724da3fc848e300bf4c96ec8fcc51e76  O-S-1-confirm-dump.txt
33d6f2df3ccae5d1abd409c057c71624d8f8473c9d73811740e97b4a83ca8b11  O-S-1-confirm.xml
a0d7c538478eb39e9334c7aabe387172cdb9fc2271529c2c63cac4b5b072baa3  O-S-1-controls.json
d1643414d6b247888926a55576235b022036d78647b593f5530c1f01e7708c2b  O-S-1-device-hash.txt
f84ee05d6c2859fc3c68c0d5478579b9724da3fc848e300bf4c96ec8fcc51e76  O-S-1-end-dump.txt
dab0df6aa312f8c5ab1abb01c7ba24a349764574c29cd25a3a020e00fa34a47c  O-S-1-end-texts.json
6f747be275151bb194a43e869cc11c38466c9cb79e1d6d5f61bf90d70f4ce77a  O-S-1-end.png
13f3139cf58110260a1f99ddb61d47dccda5941bd80b174cfb0d199e9488646a  O-S-1-end.xml
567a225c6c80d0f14ed85d563f5b1abf725954b2f5ca6f01f26d216b4d3128d2  O-S-1-framestats.txt
62549fd4639e5d871fb008c81d92fd417d3d56cb0e0bebb87092e34f5abba881  O-S-1-gfx-reset.txt
890cba9bb0d44f4c99f86265edfffc052d3e1c9259aea0b7daae50f62f6ae55c  O-S-1-inputs.json
f502b50b5699bc6b011d3ad1ee8892e5a44c2c5533fbade44d98404e352c83ec  O-S-1-perfetto-start.txt
5f6c14196048c88ff531e7aa7d58e98fcac26a9eaf2000c780134887755a4cda  O-S-1-pull.txt
f84ee05d6c2859fc3c68c0d5478579b9724da3fc848e300bf4c96ec8fcc51e76  O-S-1-setup-dump.txt
fec1f04a7337b22b971c4942751965e12649d144658b997b0917a68ec6be3f9d  O-S-1-setup-texts.json
7b6fb5a053abc0e489a53902c66983b643a44b245ed3e3e5a3234ef4097b7522  O-S-1-setup.png
118105c978df80148d186d2066635f5dc56b4bcb0019c6962452dff80e22e2d7  O-S-1-setup.xml
32331db7e68c0295181fb0320df998a660fa7f3d94c69a977d496db7ec72903a  O-S-1-threads-after.txt
32331db7e68c0295181fb0320df998a660fa7f3d94c69a977d496db7ec72903a  O-S-1-threads-before.txt
1347f52609b487e19006faecd164617e3e27757a6707215b0ae42ddf8f60ef92  O-S-1-top.txt
07d3b6c964f8a5ca5ca4b8554b58960b801a0fbe47e6bd201110cd894a1f1b74  O-S-1-window.json
63a872a83a722450fced4a6bfc82aa3d342862f5f02348549a3f12586b10c2a1  O-S-1.pftrace
f84ee05d6c2859fc3c68c0d5478579b9724da3fc848e300bf4c96ec8fcc51e76  O-S-2-confirm-dump.txt
33d6f2df3ccae5d1abd409c057c71624d8f8473c9d73811740e97b4a83ca8b11  O-S-2-confirm.xml
a0d7c538478eb39e9334c7aabe387172cdb9fc2271529c2c63cac4b5b072baa3  O-S-2-controls.json
e1db761d414848160581109248259a5ff0309da6dbe804e0dea29a15805c1c16  O-S-2-device-hash.txt
f84ee05d6c2859fc3c68c0d5478579b9724da3fc848e300bf4c96ec8fcc51e76  O-S-2-end-dump.txt
dab0df6aa312f8c5ab1abb01c7ba24a349764574c29cd25a3a020e00fa34a47c  O-S-2-end-texts.json
f994669855fcb20b65a90a1b6e5ed847820ee0e7f55dde7960f764d59774d694  O-S-2-end.png
13f3139cf58110260a1f99ddb61d47dccda5941bd80b174cfb0d199e9488646a  O-S-2-end.xml
6b28ec3d08452e959e87987ed830ab79aa4188e549bf3ceae51112e54222643e  O-S-2-framestats.txt
c40af779febfeae06e5ab6a27ff303b94f03c2536f9f41ea085a9b249df8a78b  O-S-2-gfx-reset.txt
d756715cda140199b0def4b943e4d0929673debd96aec7648bf64c34a03f150a  O-S-2-inputs.json
96589c6f054a6cba3faf6e574d149855894c133962e5e0bd0fb1980b07571419  O-S-2-perfetto-start.txt
1786bb642fd8f06a05d6b47607b7c4113242cad4a8b24d57efe0113819604a92  O-S-2-pull.txt
f84ee05d6c2859fc3c68c0d5478579b9724da3fc848e300bf4c96ec8fcc51e76  O-S-2-setup-dump.txt
fec1f04a7337b22b971c4942751965e12649d144658b997b0917a68ec6be3f9d  O-S-2-setup-texts.json
ad946db329dd9f4f776dd157c1ad97bf6450f486cd58f56573d5b02216749953  O-S-2-setup.png
118105c978df80148d186d2066635f5dc56b4bcb0019c6962452dff80e22e2d7  O-S-2-setup.xml
32331db7e68c0295181fb0320df998a660fa7f3d94c69a977d496db7ec72903a  O-S-2-threads-after.txt
32331db7e68c0295181fb0320df998a660fa7f3d94c69a977d496db7ec72903a  O-S-2-threads-before.txt
7733618c345477ba391d6cf292b074383c0f0952aea6d3c4d66f01b3f5625932  O-S-2-top.txt
7b4242067dd72a05d04bee0a8eca2e4d257d7a4f70a2aab750a8ec9eb2fc41a8  O-S-2-window.json
886c61fcd5bcb4c84c6e5c0ce5f2528653f1498f5b8181318d6d8c73f5c641e4  O-S-2.pftrace
f84ee05d6c2859fc3c68c0d5478579b9724da3fc848e300bf4c96ec8fcc51e76  O-S-3-confirm-dump.txt
33d6f2df3ccae5d1abd409c057c71624d8f8473c9d73811740e97b4a83ca8b11  O-S-3-confirm.xml
a0d7c538478eb39e9334c7aabe387172cdb9fc2271529c2c63cac4b5b072baa3  O-S-3-controls.json
4b584db8c8762d3bdcb13684ed46a59a39a909d7102547a438466c8253681026  O-S-3-device-hash.txt
f84ee05d6c2859fc3c68c0d5478579b9724da3fc848e300bf4c96ec8fcc51e76  O-S-3-end-dump.txt
dab0df6aa312f8c5ab1abb01c7ba24a349764574c29cd25a3a020e00fa34a47c  O-S-3-end-texts.json
1bf0399b4a0618bcc29e2ac3b680a4f829feb2f62b7bb853c2f2a12472a46a3e  O-S-3-end.png
13f3139cf58110260a1f99ddb61d47dccda5941bd80b174cfb0d199e9488646a  O-S-3-end.xml
63657a09f028dac7daf7ca419313a47915f16c6764836608daea7a3d893fa674  O-S-3-framestats.txt
45f91f5289cf621b1ce7f866e27cd6ee86e673f740b0de7ccde2bba63accd5d7  O-S-3-gfx-reset.txt
87eb04dbd0274f906aefec5730b36b00a3c327bf36e33626d5d677057b0be947  O-S-3-inputs.json
21124d883146b99d7dc9f67c936ceb4f9c9e605ea3d1c0f8c44d332a68dd3d41  O-S-3-perfetto-start.txt
883acf204fb3b2242795513e8525b3c5d73451234a142ab087a6810ac2e5daa4  O-S-3-pull.txt
f84ee05d6c2859fc3c68c0d5478579b9724da3fc848e300bf4c96ec8fcc51e76  O-S-3-setup-dump.txt
fec1f04a7337b22b971c4942751965e12649d144658b997b0917a68ec6be3f9d  O-S-3-setup-texts.json
0ff4b6dfc97c15c82ecf93b4bb1e837e927331cdaad83a5216260efa7f28e675  O-S-3-setup.png
118105c978df80148d186d2066635f5dc56b4bcb0019c6962452dff80e22e2d7  O-S-3-setup.xml
32331db7e68c0295181fb0320df998a660fa7f3d94c69a977d496db7ec72903a  O-S-3-threads-after.txt
32331db7e68c0295181fb0320df998a660fa7f3d94c69a977d496db7ec72903a  O-S-3-threads-before.txt
00d5a61488f400439f541bf71322410e3cd8c2ae52e532e85395b179f156a0d2  O-S-3-top.txt
87ff3e70768424666c3ccf162dba029c55568e5ce3ed88572625f782412fa62c  O-S-3-window.json
8a9674205532cda3cad082b1d1891820198427b2e87432bd2064d091a595ef19  O-S-3.pftrace
92a53c05c77903ee80d2634fa796c1b01a173678be39014bd714051572f2c7e7  O-S-success-detail.jpg
f84ee05d6c2859fc3c68c0d5478579b9724da3fc848e300bf4c96ec8fcc51e76  O-S-video-confirm-dump.txt
33d6f2df3ccae5d1abd409c057c71624d8f8473c9d73811740e97b4a83ca8b11  O-S-video-confirm.xml
a0d7c538478eb39e9334c7aabe387172cdb9fc2271529c2c63cac4b5b072baa3  O-S-video-controls.json
2a49f23459df75bdefdc489286594f1c7de5d62ccbf11f4d3f24f04a71433908  O-S-video-device-hash.txt
f84ee05d6c2859fc3c68c0d5478579b9724da3fc848e300bf4c96ec8fcc51e76  O-S-video-end-dump.txt
dab0df6aa312f8c5ab1abb01c7ba24a349764574c29cd25a3a020e00fa34a47c  O-S-video-end-texts.json
9b2191d05192f2430b7780af87b0c3f5040b98cd0eaa6c85708e01ffaee7dc24  O-S-video-end.png
13f3139cf58110260a1f99ddb61d47dccda5941bd80b174cfb0d199e9488646a  O-S-video-end.xml
7ce4139014a8442752169b67b9a055f894c603a40b6da5d03769d77728d260cf  O-S-video-ffprobe.json
cd544c96d46d79f9ac2ae58d7111d779b4d503f550a5abbc4f1088385eb26bdc  O-S-video-frame-times.json
5c7328cb2621969876603191e93cc7dc76782d846f004a4975012b6f712fb886  O-S-video-inputs.json
55a54927ae61f68a0187ae165e7a065dca259edfc0d9aa414750838b83cd21a2  O-S-video-pull.txt
41227fc1e76b9ccc08f432a24f5565d650ea00213cf40767fa57d982d5751284  O-S-video-record.json
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  O-S-video-screenrecord.txt
f84ee05d6c2859fc3c68c0d5478579b9724da3fc848e300bf4c96ec8fcc51e76  O-S-video-setup-dump.txt
fec1f04a7337b22b971c4942751965e12649d144658b997b0917a68ec6be3f9d  O-S-video-setup-texts.json
d320d16d8649764380d1861296171f14f13af71a4cf772f61133a49abe1da896  O-S-video-setup.png
118105c978df80148d186d2066635f5dc56b4bcb0019c6962452dff80e22e2d7  O-S-video-setup.xml
d923453ffa9d86799bc437184c5d0e164c1d5edd094803685ee48c75887eb54b  O-S-video-sheet-0.jpg
a6430b8a64c175966664afa84bb8298860a1a001cd113e5dacfafd51475f20a1  O-S-video-sheet-1.jpg
097419309e0a5e93a9cdfae5ada34e3537b9c693d9197015586a79cfb4f04a41  O-S-video.mp4
049c11d64b48eeb504c5e38bcf61d5ce2eac14b5e79291f79d196d34dbc4274b  capture-commands-v2.py
cb6e267d89e2420ca303c6064f47154e6e96ca90a6792f9c07615eb5082f8326  capture-commands.py
e88cee00a4ec76b57fe49f030c60849c19f243fee3ad14fed80a62dc42987d12  capture-status.json
f84ee05d6c2859fc3c68c0d5478579b9724da3fc848e300bf4c96ec8fcc51e76  cold-1-confirm-dump.txt
33d6f2df3ccae5d1abd409c057c71624d8f8473c9d73811740e97b4a83ca8b11  cold-1-confirm.xml
f05122fe329a9f6943f2ea53fa90527259f874842bf64f9be130d01be33a2f55  cold-1-device-hash.txt
f84ee05d6c2859fc3c68c0d5478579b9724da3fc848e300bf4c96ec8fcc51e76  cold-1-end-dump.txt
e1cdde55bb0c0e02d15ec988c5a6d61424450deeef8861ef967a3b74d0ecf15a  cold-1-end-texts.json
1d950d7326dfd2a7bf55f25165534c2aca2b77525e2698e39fefbbe31d8b8937  cold-1-end.png
31ae2edf6a9dc2a9e3414aee9ba531aa4eaa3ba93998a0399061f96f4ee115b0  cold-1-end.xml
75f54f149ae8522a11674453fb82cd6038e7c09b0bfb77055aa4ed5007de7b7f  cold-1-ffprobe.json
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  cold-1-force-stop.txt
c44ac1d98dafd48b4852e15d167fa7ab8f407c18d50dc4d87010e49f42c64786  cold-1-frame-times.json
5866ecb5336444038a2924404af3d9da0f921b98e4ec66d8126015ba0275ba86  cold-1-launch.txt
f84ee05d6c2859fc3c68c0d5478579b9724da3fc848e300bf4c96ec8fcc51e76  cold-1-menu-dump.txt
f4fb81039925d43ba0ba41894bbe6b014af8239addf69ad147dec430ec17dbf9  cold-1-menu.xml
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  cold-1-pid-empty.txt
901b3e9b2c5dff36ecbb3c3767edb7aa9e43f6f5d3fd0ad9262543bccdde18d9  cold-1-pull.txt
ada894d2ff5a2cf5b133e35dddd9909c021c650fb9e50bef3c5cd58c39af7e8c  cold-1-record.json
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  cold-1-screenrecord.txt
dbd66e9a713b628c715378ebf9d33ca5450b3a38882079efca71c27c39209cd7  cold-1-sheet-0.jpg
408d0440babf5b956ab85ccb5d1ff0aae56d8bd24042ecf200df46b407205a17  cold-1-sheet-1.jpg
67ffdb626f5807bcc85237713a17a52a2d9561f3ebece3e8a2bda7a685fb781f  cold-1-sheet-2.jpg
f84ee05d6c2859fc3c68c0d5478579b9724da3fc848e300bf4c96ec8fcc51e76  cold-1-stable-dump.txt
c749fbca136b242cb8ac38ca1fe258c9c530a4ca92836fb87e4452ee669e25f5  cold-1-stable-texts.json
a752d2b1ceacfd25fa622ef2f6c0eab4f709aa1939ba0ccb514fc14018d5027d  cold-1-stable.xml
9d5c0896674c1f4cc54a477ff66f0663a813c39ce4392466fdbc09c1a8b058a9  cold-1-transition-exact.jpg
f53e976ff93ac8e4dceaace77846981f6cdcc7ce9491206e79eaad38f6bcd331  cold-1-transition-overview.jpg
7d2a30f2d282bc72a9cba5809cd77fa93cf33aabd9bb2a6b2bcc6ec3d2bc9b92  cold-1.mp4
f84ee05d6c2859fc3c68c0d5478579b9724da3fc848e300bf4c96ec8fcc51e76  cold-2-confirm-dump.txt
33d6f2df3ccae5d1abd409c057c71624d8f8473c9d73811740e97b4a83ca8b11  cold-2-confirm.xml
2b370a9d3f9528356fe4fd152cbfb1ee3159ba0d622dd8afa4bfaff33bea1cf3  cold-2-device-hash.txt
f84ee05d6c2859fc3c68c0d5478579b9724da3fc848e300bf4c96ec8fcc51e76  cold-2-end-dump.txt
e1cdde55bb0c0e02d15ec988c5a6d61424450deeef8861ef967a3b74d0ecf15a  cold-2-end-texts.json
2936938c855dba3e3b01d877a25a953231c5e04ce299c4761560f2a1fba88c92  cold-2-end.png
31ae2edf6a9dc2a9e3414aee9ba531aa4eaa3ba93998a0399061f96f4ee115b0  cold-2-end.xml
80ae85d867d7ff1071da8550ca396d16e8e08872c5cabdd63059b5d884dc3695  cold-2-ffprobe.json
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  cold-2-force-stop.txt
f54a13cc7ea3193d1eecde72c25fce2dfb9861f1620c219e1226026c5461a02c  cold-2-frame-times.json
d503aa22079494fa6c575634156af5490e18640d719aa7612a6e80f5d4c80384  cold-2-launch.txt
f84ee05d6c2859fc3c68c0d5478579b9724da3fc848e300bf4c96ec8fcc51e76  cold-2-menu-dump.txt
f4fb81039925d43ba0ba41894bbe6b014af8239addf69ad147dec430ec17dbf9  cold-2-menu.xml
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  cold-2-pid-empty.txt
f890048bdb9e0f008d027c11cab60e6ca8843a6ca1f9c254d3ca4d604ad6866e  cold-2-pull.txt
607c9683404fe01dcaa8b33c797ac0ecf24ea003594621fa345bcd0ed4558ae2  cold-2-record.json
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  cold-2-screenrecord.txt
691e5b47b8a9710c0ccf10bbaac47c46cf1f1f6306082802670db72bf9abb368  cold-2-sheet-0.jpg
df4786dac4bb32fc6386bb936b109b57aa99b30933ba239804dd498ef4b47782  cold-2-sheet-1.jpg
464434c52cbad2ea6c8a2435c25080e827e7032740c8b073b2fe3b58491f064e  cold-2-sheet-2.jpg
f84ee05d6c2859fc3c68c0d5478579b9724da3fc848e300bf4c96ec8fcc51e76  cold-2-stable-dump.txt
c749fbca136b242cb8ac38ca1fe258c9c530a4ca92836fb87e4452ee669e25f5  cold-2-stable-texts.json
a752d2b1ceacfd25fa622ef2f6c0eab4f709aa1939ba0ccb514fc14018d5027d  cold-2-stable.xml
71adc351c358f48fa0016bb207816ac251abd34ee48207a56191ee5b98e81922  cold-2-transition-exact.jpg
6250acb6ae12798643701f8e0c83fc90ace2ed9a46e96889d8c629ec39c691a1  cold-2-transition-overview.jpg
86f2a6f31fb46a43405b68bf3cd8b7f303715cf6a1f2d5076fb4a6c4e3b27059  cold-2.mp4
f84ee05d6c2859fc3c68c0d5478579b9724da3fc848e300bf4c96ec8fcc51e76  cold-3-confirm-dump.txt
33d6f2df3ccae5d1abd409c057c71624d8f8473c9d73811740e97b4a83ca8b11  cold-3-confirm.xml
63521c3855ce76f60f595d4dfb58908620134167a061f4c4a7712acab8d17e26  cold-3-device-hash.txt
f84ee05d6c2859fc3c68c0d5478579b9724da3fc848e300bf4c96ec8fcc51e76  cold-3-end-dump.txt
e1cdde55bb0c0e02d15ec988c5a6d61424450deeef8861ef967a3b74d0ecf15a  cold-3-end-texts.json
b7072ab9611c54187dff09ba0091553c3002852c00e8ca1566b9f7a6f7271c53  cold-3-end.png
31ae2edf6a9dc2a9e3414aee9ba531aa4eaa3ba93998a0399061f96f4ee115b0  cold-3-end.xml
1ae4dd20134371f72753a503209f571c1018f3282f679a7064ab68a0466f9831  cold-3-ffprobe.json
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  cold-3-force-stop.txt
72d2bcdfbd7055e0284ed79fa5fd8c51af9f319917cd96b24cd5e295c190304d  cold-3-frame-times.json
b58dc636b7a3ca382bb3ce5c01e661d93d6b2cfb4c086305a8fa35be27cbbd6c  cold-3-launch.txt
f84ee05d6c2859fc3c68c0d5478579b9724da3fc848e300bf4c96ec8fcc51e76  cold-3-menu-dump.txt
f4fb81039925d43ba0ba41894bbe6b014af8239addf69ad147dec430ec17dbf9  cold-3-menu.xml
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  cold-3-pid-empty.txt
710437f2c1cbcfa7692dc5b1bf5282d709381025ecdefcf96ae5fe973be2d393  cold-3-pull.txt
97bed9f1a4d3f69ce90c54e1aeaa848f0366f857221d7c9d8781d83230af2c63  cold-3-record.json
f84ee05d6c2859fc3c68c0d5478579b9724da3fc848e300bf4c96ec8fcc51e76  cold-3-retry-confirm-dump.txt
33d6f2df3ccae5d1abd409c057c71624d8f8473c9d73811740e97b4a83ca8b11  cold-3-retry-confirm.xml
0822edc8151a16d58411fb1b7c79011a903a3bd22da7b0e35fc7d3b15e4ffd2c  cold-3-retry-device-hash.txt
f84ee05d6c2859fc3c68c0d5478579b9724da3fc848e300bf4c96ec8fcc51e76  cold-3-retry-end-dump.txt
e1cdde55bb0c0e02d15ec988c5a6d61424450deeef8861ef967a3b74d0ecf15a  cold-3-retry-end-texts.json
9a6687100e0c09a3bebb1969dc89318c2c9fd71435b797f9478ccc8761d9c7f0  cold-3-retry-end.png
31ae2edf6a9dc2a9e3414aee9ba531aa4eaa3ba93998a0399061f96f4ee115b0  cold-3-retry-end.xml
96fb83ed064e457b9de95ba965fa2b573add9d6c922b2a86eb43fcf2b3d824c9  cold-3-retry-ffprobe.json
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  cold-3-retry-force-stop.txt
64c12159c212b983524ef21a2c44f7b0d7a55e1fae4975c053234390ce26f2d7  cold-3-retry-frame-times.json
5a43bd5583ecf09b9e8b60f6c950f7222f9222231acdcdc2f70fa03b46e8db1b  cold-3-retry-launch.txt
f84ee05d6c2859fc3c68c0d5478579b9724da3fc848e300bf4c96ec8fcc51e76  cold-3-retry-menu-dump.txt
f4fb81039925d43ba0ba41894bbe6b014af8239addf69ad147dec430ec17dbf9  cold-3-retry-menu.xml
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  cold-3-retry-pid-empty.txt
86414da77924dcd5c2e9cd3a24c02d16c731512f6ee4ef002e98d5d0c291db75  cold-3-retry-pull.txt
e60b66bc09d241cb6ce1c86fbe6fc247e8a252eea50ffefea68beaaad75a9b5c  cold-3-retry-record.json
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  cold-3-retry-screenrecord.txt
d4d233222472381ce03e577d0220d5e6dfc50878a32802a5604157147559765b  cold-3-retry-sheet-0.jpg
e4f8b44c59115555ad7a7bdc6d91f16f4c20907001ac2e2d3d26f9996afbe1bc  cold-3-retry-sheet-1.jpg
7ca39e6b7fe2cff453ab5308cfc8cdd6b970c0ffd035a192f9b69389f0bcb7a5  cold-3-retry-sheet-2.jpg
f84ee05d6c2859fc3c68c0d5478579b9724da3fc848e300bf4c96ec8fcc51e76  cold-3-retry-stable-dump.txt
c749fbca136b242cb8ac38ca1fe258c9c530a4ca92836fb87e4452ee669e25f5  cold-3-retry-stable-texts.json
a752d2b1ceacfd25fa622ef2f6c0eab4f709aa1939ba0ccb514fc14018d5027d  cold-3-retry-stable.xml
5b1d96f9e7655a6f84faab77396c3fd5765aebc8ae7261c65d01fafaaa4e8ffe  cold-3-retry-transition-exact.jpg
511e1b4732d1a4d76a31ca60343db7c3f4656ded8a779940bb08dedfe645e7f2  cold-3-retry-transition-overview.jpg
13e9f53cdc82fdceed1aefdb4fa6a9e38fa2cd1e89f408c8ee207b7234d9a592  cold-3-retry.mp4
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  cold-3-screenrecord.txt
71da3dda6c3f6d4dfb973c9840ec6c7351055712b43a0ef36b1aa028859cee8e  cold-3-sheet-0.jpg
320d7d3da2d2bd8030a8c410b0f17c6c2b9d9a658ddcd7e7d62683472c85328c  cold-3-sheet-1.jpg
0129365460e1a4f38cd826289720f66c5dc0fea73ce4210900ea91b54e9defc9  cold-3-sheet-2.jpg
f84ee05d6c2859fc3c68c0d5478579b9724da3fc848e300bf4c96ec8fcc51e76  cold-3-stable-dump.txt
c749fbca136b242cb8ac38ca1fe258c9c530a4ca92836fb87e4452ee669e25f5  cold-3-stable-texts.json
a752d2b1ceacfd25fa622ef2f6c0eab4f709aa1939ba0ccb514fc14018d5027d  cold-3-stable.xml
2de8423e33b58ae9a1e53c55c81674256823c18c02717d743c6fdeaa2b6ccc47  cold-3-transition-exact.jpg
b07f7382eec7f4fd60127433f885e0b18c8b308f971ecf72c406f78d61063a0d  cold-3-transition-overview.jpg
9da38555d9c55ede2d19b6f7a5f2b31b69d2cf6f2d502d3d3bf031bb7f7b4c53  cold-3.mp4
424532fe50a994e20b780c23a535af7e8543732366da706af335311fbf738c08  cold-results.json
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  cold-retry-touches-enable.txt
4355a46b19d348dc2f57c046f8ef63d4538ebb936000f3c9ee954a27460dd865  cold-retry-touches-enabled-readback.txt
38e0b9de817f645c4bec37c0d4a3e58baecccb040f5718dc069a72c7385a0bed  cold-retry-touches-original.txt
56a9b16222dd35e89411e3e11524bb879ac61b98187a6cb8ddb37a0a9c677a5b  cold-retry-touches-restore.txt
38e0b9de817f645c4bec37c0d4a3e58baecccb040f5718dc069a72c7385a0bed  cold-retry-touches-restored-readback.txt
2faeb6f73f240e489f377ab116c1cf8b5c774b00753bc83c31edef23acb1f48d  commands.jsonl
f84ee05d6c2859fc3c68c0d5478579b9724da3fc848e300bf4c96ec8fcc51e76  controls-game-dump.txt
898ccdafda500b3f4277dce53dd7b63d25039d184af9edf1032b55616cea5528  controls-game.xml
a0d7c538478eb39e9334c7aabe387172cdb9fc2271529c2c63cac4b5b072baa3  controls.json
f84ee05d6c2859fc3c68c0d5478579b9724da3fc848e300bf4c96ec8fcc51e76  fresh-initial-dump.txt
7444db29b9cf8f51e624ede19eeb9e8a8a12e980092f1a59087318045a6c7287  fresh-initial-texts.json
5a9fa19ebad92cdf0db4eebd2750041e25c6762c1dc69b7116ee74c2157a374d  fresh-initial.png
898ccdafda500b3f4277dce53dd7b63d25039d184af9edf1032b55616cea5528  fresh-initial.xml
d0df2e522d462a51a8e96dd09cc9e2b24d3d6d5ed19a6ce429c36cf41e7ff847  fx-detail.jpg
7f10c3cd4593d1d6ded27d658e7c05216011c955c200aac551caad0c979d4d90  identity-abi.txt
683d71d175dbc319593df41928f02fcfa1f3bcf70e7606a6a10af3482dcc4d8f  identity-adb-version.txt
9a92adbc0cee38ef658c71ce1b1bf8c65668f166bfb213644c895ccb1ad07a25  identity-android.txt
ea243e5457028e97f9bc93b37a72f8e80ea61ae081911bb037765590ee6aa435  identity-api.txt
c866cd8deaab88e15a3b160735b9d72f6114f5b28ef33449ab7211f4b6b5f4a1  identity-apk-badging.txt
8d609614562cdf6fafa5807325a461e114e965f6dd095057a733c726b1d572d1  identity-apk-sha256.txt
86493acebc9dc7b0a396db9b486fa2d27749180bb6b678768782a0e6b0b41543  identity-apk-size.txt
c4d910beb2bd2a0e1934a659e6f50c1ce400c0186723be9ba5dacf57bc99b11e  identity-density.txt
ad7db251931ebf5f3c4476d9d35c9626d6402764a3bc32fa67a998ecdb40ab46  identity-devices.txt
42418b6528318f025553c0a84ca9ef2d2f306fbf89c881e56b03192892f77a37  identity-display.txt
6c3ea69e80c8471211344794f5c5a1932c682721f5e396cc1b40ff94794b5a5e  identity-emulator-cpu.txt
c680b2a5334f84f2e512b2b7789089278f2bdc745b9746afa3c25c441926ad68  identity-emulator-memory.txt
f8ac3e85f9d872a04974c30fb018ac7dac19cd139fb8ccd5c88c96b3b9985400  identity-ffmpeg-version.txt
7830ff2625c5a3b9b0882f4e45920b823a68b727bda7f8be9681dd31f07fd740  identity-ffprobe-version.txt
c58c4c2e5e50676314fa6de964d5ff5055f1c61195ac4d7f20ba25afb093739a  identity-head.txt
715f32ac431a2ac906e97f7722879a3c6a9995983aee96eed26c60df08e70570  identity-host.txt
2e781b655b0a1fbca1235d182864661fab33a2a3ef3d4521e580f04b0b009ead  identity-model.txt
c17b1a7f66f91ea3910d9acf96f92499ac53185160b14323bcb531989064ae2b  identity-package.txt
ed1c01e62df1fc2e31e1b67d5172ac3bce5160f148b61bcfa7ef21cb51b1a03a  identity-perfetto.txt
bdc1de6cddd7801dcacf13c58df009181702f5906a23a1807311d16ac13a2635  identity-power-source.txt
f877dc5dccc58b9f334a333705eaffba7b4ab119d75f13a8ca359de178544059  identity-power.txt
c040c39cda45eb30c145d21eb52bd43431cc9d3dbfa9fbecbfd34a0f4e3789f2  identity-product-diff.txt
12b4fd555b18c43f6c0c4c1deaa8592c79031dd809139d576cbac614172bdad9  identity-screenrecord.txt
07377115fb06f1cbbbfdc0f30fb6862024571638f1173d6dc4311c06f720df45  identity-size.txt
6b8957bd92dba471cca1eafcb32a93c58e92a213d71006ba730a41cd3639cb40  identity-status.txt
e7c267a0113715fc872a03a657ebc166867a089d39f41e570be1791c24f49508  identity-thermal.txt
4ae91e3799d1859128bf7c227605379be45a585d08efa2d0d76c7fbca3bb1b58  identity-top.txt
368c3a287c2fb0d0b7fcafac6ce89359eff5179df4f8b8ad6474f4a74e121df9  identity-uptime.txt
d8c25d09caf7bcf7f991fcdd73d0f1d0922ae57de74113fea245c581e43dc2c1  identity-working-diff.txt
f84ee05d6c2859fc3c68c0d5478579b9724da3fc848e300bf4c96ec8fcc51e76  initial-dump.txt
04072864a1f2b46118ee26afc0ea9a2433a3f7e0fce09514472505f20b665d14  initial-launch.txt
7ffaf5c4a1eb0ec862117faaf2133435485c795f0bdb08ab603f621123ef3082  initial-texts.json
2c886196a94faaaae96bdd5b17ed376174add4d841584bbf1cc47342d38a8f95  initial.png
f4fb81039925d43ba0ba41894bbe6b014af8239addf69ad147dec430ec17dbf9  initial.xml
781a31c82430c97897af612ece5e0ca2205e301cb5ff121ce2660541ea5182c7  install.txt
f84ee05d6c2859fc3c68c0d5478579b9724da3fc848e300bf4c96ec8fcc51e76  new-confirm-dump.txt
f29950a289c73deadd0263abb89ff9b0e4adae9592fb3e2a5f4c885b98337e5e  new-confirm-texts.json
33d6f2df3ccae5d1abd409c057c71624d8f8473c9d73811740e97b4a83ca8b11  new-confirm.xml
bef170d2cdf61ff0652e90f7936c84b5c7e875d1f39a730d727cd6587ff7c773  orchestration-deviation-A1-1.json
03f215fdf5f5e9e2ed08abce289398a52315b191172805fb8085997c0c9f8f81  primary-results.json
28d7c58eceeb7618218d7fdfc56f48d00be133f8d229956d7fa97501024d2536  primary-summary.tsv
e7c267a0113715fc872a03a657ebc166867a089d39f41e570be1791c24f49508  primary-thermal-end.txt
42a3a77ee120a2776a9aa2b5faf0dbaf78e459e9ec5eeae9716b8b1a53c192b4  primary-uptime-end.txt
f36b427cbe5a91ce75ea050a81d3e72b8492e15ef2d5be77225edd31e1e2d00c  protocol.md
42f8d43be69655db1d165c408c7f5c29e1e3c11baabb384c97c8ccef60082344  pyjamada-p02-analyze.py
642b9c0e7f448433b6011e7e5dd009e83a21668837d6ed98f73a1d4304077f3a  pyjamada-p02-frames.py
77300fe173935eb3d0a0a8271a4d0b4dd219692cc6dffa113358f8eb31b5b9a8  pyjamada-p02-report.py
0269135d4e2ebc22d68384c0807d1eec0d99b3e54d2f4c65e148a5a2c1114cbc  pyjamada-p02-video.py
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  retry-touches-enable.txt
4355a46b19d348dc2f57c046f8ef63d4538ebb936000f3c9ee954a27460dd865  retry-touches-enabled-readback.txt
38e0b9de817f645c4bec37c0d4a3e58baecccb040f5718dc069a72c7385a0bed  retry-touches-original.txt
56a9b16222dd35e89411e3e11524bb879ac61b98187a6cb8ddb37a0a9c677a5b  retry-touches-restore.txt
38e0b9de817f645c4bec37c0d4a3e58baecccb040f5718dc069a72c7385a0bed  retry-touches-restored-readback.txt
625f5c9014edab2968fffa5299bfbebefc317a13f673ddbe1d35ff5143296208  review-analysis.json
8b41fedc207ae99350fff0d05f0c80c94126b917293e14a8c7c179433c29adff  revisions.json
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  show-touches-enable.txt
38e0b9de817f645c4bec37c0d4a3e58baecccb040f5718dc069a72c7385a0bed  show-touches-original.txt
56a9b16222dd35e89411e3e11524bb879ac61b98187a6cb8ddb37a0a9c677a5b  show-touches-restore.txt
38e0b9de817f645c4bec37c0d4a3e58baecccb040f5718dc069a72c7385a0bed  show-touches-restored-value.txt
f88e9080585ab64fd1f0559dcedeed2ccab186760a4ad696db9020110dc48886  video-results.json
e7c267a0113715fc872a03a657ebc166867a089d39f41e570be1791c24f49508  video-thermal-end.txt
78f891ebdc2a2b4f67746367833c365f7f5c630c29858106794870379f823b83  video-uptime-end.txt
35be542553c9bb42f2818630183064eea266f9b350d4e7e589fd044f86807f4f  warm-process.json
e7c267a0113715fc872a03a657ebc166867a089d39f41e570be1791c24f49508  warm-thermal-start.txt
991c5ed448bb448a19e111e40bad5afdaa9e1b2613661281a444240caaf14256  warm-uptime-start.txt
f84ee05d6c2859fc3c68c0d5478579b9724da3fc848e300bf4c96ec8fcc51e76  warmup-end-dump.txt
dab0df6aa312f8c5ab1abb01c7ba24a349764574c29cd25a3a020e00fa34a47c  warmup-end-texts.json
78f3a38e52944f4f55a54a4d489c917568d3a987d9d15669b8ace7686b166e1a  warmup-end.png
13f3139cf58110260a1f99ddb61d47dccda5941bd80b174cfb0d199e9488646a  warmup-end.xml
f84ee05d6c2859fc3c68c0d5478579b9724da3fc848e300bf4c96ec8fcc51e76  warmup-success-dump.txt
13f3139cf58110260a1f99ddb61d47dccda5941bd80b174cfb0d199e9488646a  warmup-success.xml
```

</details>
