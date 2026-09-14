# Expressive Arcade Refactor — Performance Review Notes

This is a focused audit aid, not a claim that performance has been profiled on Android.

**P-01 status:** protocol frozen on 2026-09-06; scenario amendment authorized
and applied on 2026-09-07 before any P-02 capture. P-01 defines how P-02 must
capture evidence; it contains no measured performance result and does not
disposition `INC-004`.

## Current rendering cadence

`GameScreen` advances visual presentation with one screen-level `setInterval` at 80 ms (~12.5 Hz). The ticker updates `nowMs`, causing the game screen/canvas path to re-render while mounted. Leaf sprites contain no timers, and gameplay state contains no animation time.

This design was chosen to establish a deterministic presentation boundary quickly and is tracked as `INC-004` for explicit review.

## Work performed per presentation refresh

At a high level:

1. `PresentationRuntime.snapshot()` prunes expired events.
2. `GameCanvas` resolves Wally's current clip/frame.
3. six object visual frames are resolved from stable state + relevant transient event.
4. FX frames are resolved for currently active semantic events.
5. screen shake is derived from the latest strong noise burst.
6. Skia renders three cached image sources plus procedural background/shadow rectangles.

Atlas indexes are constructed at module load and reused. Gameplay state is not mutated by this process.

## Static strengths

- Only one presentation ticker exists; no per-object/per-sprite timers.
- Atlas frame/clip indexes are module-level caches.
- Only three sprite images are loaded by `useImage`.
- FX lifetimes are bounded and pruned.
- The logical world remains 128 px, limiting sprite/object count and layout complexity.
- Stable presentation is reconstructible from gameplay state; no animation-history replay is required.

## Static concerns to measure

### P1 — React-level cadence

The 80 ms state update re-renders `GameScreen`, not only Skia-derived animation values. Determine whether this creates material JS-thread work on the Android target.

### P2 — Per-refresh temporary allocations

`GameCanvas` creates the six-object mapping and FX result arrays each refresh. `AtlasSprite` constructs sprite/transform arrays for each render. At the current scene size this may be trivial, but it should be measured rather than assumed.

### P3 — Event stacking

Noise bursts are intentionally additive. Repeated rapid actions can increase active FX entries until their short lifetimes expire. Validate that the bounded lifetimes prevent visible frame pacing degradation during the chaos route.

### P4 — Image readiness

`useImage` returns `null` while loading. Verify on cold launch that the room does not produce an unacceptable actor/object blank interval or layout/readability problem.

### P5 — Input responsiveness

Gameplay input is applied immediately and does not wait for animation. Validate that JS/render work does not create perceived touch latency during repeated movement/action sequences.

## Candidate strategies

### Option A — Keep current ticker

Accept if Android measurements show stable frame pacing and no material touch latency. Lowest complexity and easiest deterministic test model.

### Option B — Move animation time to Skia/Reanimated

React Native Skia exposes `useClock`, and the project already has Reanimated 4.x. A deeper renderer pass could derive frames/transforms on the UI thread/shared values rather than React state. This potentially reduces JS churn but increases integration complexity because current frame resolution is pure TypeScript and returns atlas-frame metadata.

Do not choose this option solely because it sounds more optimized; measure first.

### Option C — Hybrid

Keep semantic event creation/lifetimes in the existing pure TypeScript presentation runtime, but move only continuously advancing visual values (clock, frame selection, shake transform) to Skia/Reanimated. This preserves the gameplay/presentation boundary while reducing React cadence.

## P-01 frozen release-profile protocol

P-02 must execute this protocol once against the release candidate below,
without changing application code, assets, dependencies, native configuration,
the APK, or this protocol during capture. Generated evidence belongs under the
ignored directory `artifacts/android-performance/<product-revision>/`; P-02
must record its ordered SHA-256 manifest in the audit evidence rather than
claim that ignored local files are durable repository artifacts.

### Fixed target and toolchain

| Field | Frozen value |
|---|---|
| Product revision represented by the APK | `aa29ab9d5119425ed89560eac2b02267a190f329` |
| APK | `android/app/build/outputs/apk/release/app-release.apk`; release `0.3.0` (`versionCode 1`); 41364511 bytes; SHA-256 `b015d50a03cf9887f60948ce02fbe7adafbcd1df37f537b8236494af27d7124f` |
| Package / build | `com.krukmat.pyjamada`; non-debug `release`; single `arm64-v8a` native library set |
| Device | Android emulator `emulator-5554`; Google `sdk_gphone64_arm64`; Android 14 / API 34; `arm64-v8a` |
| Display | 1080 x 2400 physical pixels at 420 dpi; 60.000004 Hz; portrait |
| Frame/CPU trace | On-device Perfetto 34.0 through host ADB 1.0.41 / 37.0.0-14910828 |
| Per-thread CPU samples | Android Toybox `top` 0.8.9 in thread/batch mode, correlated with `/proc/<pid>/task/*/comm` |
| Frame summary | `adb shell dumpsys gfxinfo com.krukmat.pyjamada reset` followed by `framestats` |
| Video inspection | Android `screenrecord` 1.3 at 1080 x 2400, 20 Mbit/s; host FFmpeg/ffprobe 8.1.2 |

The target is the immutable V-01/V-05 artifact, not the later documentation
HEAD. Before capture, P-02 must re-run and save the following identity checks:

```bash
git rev-parse HEAD
git diff --name-only aa29ab9d5119425ed89560eac2b02267a190f329 HEAD
stat -f '%z' android/app/build/outputs/apk/release/app-release.apk
shasum -a 256 android/app/build/outputs/apk/release/app-release.apk
adb devices -l
adb -s emulator-5554 shell getprop ro.product.model
adb -s emulator-5554 shell getprop ro.build.version.release
adb -s emulator-5554 shell getprop ro.build.version.sdk
adb -s emulator-5554 shell getprop ro.product.cpu.abi
adb -s emulator-5554 shell wm size
adb -s emulator-5554 shell wm density
adb -s emulator-5554 shell dumpsys display
adb version
adb -s emulator-5554 shell perfetto --version
ffmpeg -version
ffprobe -version
```

Abort the run if the APK hash/size, package, ABI, API, display mode, refresh
rate, or device serial differs. Later documentation and evidence-workflow
changes are allowed only when the saved changed-path diff proves that they
cannot alter the installed APK; a `package.json` change must be inspected as
content and is acceptable only when dependency fields and build inputs are
unchanged. P-02 must separately identify the product, protocol, and evidence
revisions. Any product code, asset, dependency, or build-configuration change
invalidates this candidate and sends work back to V-01.

### Run controls

- Install the frozen APK once with `adb -s emulator-5554 install -r` and use
  the same installed process for all warm trials. Do not run Maestro, an
  inspector, Android Studio profiling, or `screenrecord` during the primary
  Perfetto/`gfxinfo` pass.
- Use the standard touch-control layout. Resolve and save the centre point of
  `move-left-button`, `move-right-button`, `action-button`,
  `new-game-button`, `continue-button`, `restart-button`, and `exit-button`
  from a UI hierarchy dump before the trials. Drive measured actions with
  `adb shell input tap` at those recorded centres so stimulus cadence is
  repeatable; no test hook is used as a metric source.
- A **fresh run** means exit to the menu, choose New Game, and accept the known
  `Replace saved game?` confirmation when it appears. This resets gameplay
  through the product UI without clearing package or emulator data.
- Complete one unrecorded warm-up route before warm trials. For each measured
  trial, prepare the stated start state, wait five seconds for transient events
  to expire, reset `gfxinfo`, then begin capture. Use three primary trials per
  scenario in the order below. Preserve the order, UTC start/end timestamps,
  actual input timestamps, and any deviation.
- Keep emulator display mode, host power state, emulator allocation, and other
  foreground host workloads unchanged across the set. Record host model/OS,
  emulator uptime, app PID/TIDs, and Android thermal status at the beginning
  and end. These are comparability metadata, not performance claims.

### Scenario matrix

All primary windows are 20 seconds. An action described as rapid has a target
start-to-start interval of 120 ms; P-02 records actual host timestamps rather
than assuming that the target cadence was achieved.

| ID | Prepared state and measured stimulus | Required evidence |
|---|---|---|
| `I` — idle | Fresh run, no input for the whole window. | Three trace/framestats trials; one separate video trial. |
| `M` — movement | Fresh run; issue exactly 40 alternating left/right taps at four taps per second for 10 seconds, then observe 10 seconds. The run remains active at noise 80. | Three trace/framestats trials; one video with at least ten isolated touch-response samples. |
| `A1` — first alarm | Follow the V-02 route to the untouched alarm: two left + action at bed, four right + action at slippers, four right to alarm. After the five-second settle, press Action once at second 2. Recreate the state for every trial. | Three trace/framestats trials; one separate video trial. |
| `C-A` — stacked alarm | Fresh run, six right to the alarm; after settling, issue three rapid Action presses starting at second 2. The third press reaches the `HOUSE AWAKE!` objective-failure beat. | Three trace/framestats trials; one video covering stacking, shake, failure FX, and touch response. |
| `C-W` — wardrobe/fumble chaos | Follow the canonical route: two left + Action at bed, four right + Action at slippers, four right + two Actions at alarm, five right to wardrobe. Assert startled, energy 65, noise 59, time 23 before settling. Issue two rapid Action presses starting at second 2. Both produce a fumble; the first remains active at noise 73, and the second reaches `HOUSE AWAKE!` at noise 87. | Three trace/framestats trials; one video covering repeated fumble/noise FX, the expected failure beat, and touch response. |
| `O-S` — objective-success beats | Follow the canonical V-02 success route through bed, slippers, first and repeated alarm, and arrive at wardrobe. Begin the window after settling; press Action once to dress, move right five times at four taps per second, then press Action at keys to reach `READY!`. | Three trace/framestats trials; one video covering dress, key collection, success FX, and touch response. |

`C-A` supplies the objective-failure beat and `O-S` supplies the success beat;
both must be present. If a setup lands on the wrong object or produces the
wrong HUD/reaction state, discard that trial, record why, and repeat it from a
fresh run. Do not relabel it as the intended scenario.

The 2026-09-07 amendment corrects two deterministic setup errors identified
by P-02's independent High task-analysis reviewer (`REVISE`). The original
60-move M route failed on tap 43 and ignored its remaining 17 inputs. The
original fresh-run C-W route remained sleepy through all four wardrobe
actions and never emitted `WALLY_FUMBLE`. In-memory execution of the unchanged
systemic rules and visual mapper verified the corrected routes above. This
is protocol validation, not measured Android performance. No other scenario,
capture method, product code, or candidate APK changed. P-02 records the
amended protocol file hash alongside its base Git revision so the uncommitted
authorized amendment is attributable without creating a commit.

### Primary trace and frame capture

For each trial, use a unique `<scenario>-<trial>` name. Start a 64 MB,
24-second Perfetto envelope first. After it confirms that its data sources are
ready, reset frame statistics, record the measured-window UTC start, and run
21 one-second `top` samples (20 first-to-last intervals) in a separate shell.
The scenario stimulus begins with that sampler and lasts exactly 20 seconds:

```bash
adb -s emulator-5554 shell perfetto --background-wait \
  -o /data/misc/perfetto-traces/<scenario>-<trial>.pftrace \
  -t 24s -b 64mb sched freq idle gfx view wm am input binder_driver
adb -s emulator-5554 shell dumpsys gfxinfo com.krukmat.pyjamada reset
adb -s emulator-5554 shell top -H -b -d 1 -n 21 -p <app-pid> \
  -o PID,TID,%CPU,TIME+,CMDLINE
```

Apply the scenario stimulus only after Perfetto confirms that its data sources
have started. After it ends, save the raw `.pftrace`, the complete output of
`adb -s emulator-5554 shell dumpsys gfxinfo com.krukmat.pyjamada framestats`,
the app PID and `/proc/<pid>/task/*/comm` thread-name mapping, and the command
log. Remove only the exact device-side trace after its pulled hash matches the
host copy.

Use the first/last cumulative `TIME+` values and the one-second samples to
report app-thread CPU work, in milliseconds and as a percentage of the
20-second window:

- total running CPU time across all app threads;
- UI/main-thread running time (TID equal to PID);
- summed JS running time for every observed `mqt_v_js` thread, retaining each
  individual TID row;
- `RenderThread` running time;
- the five other app threads with the greatest running time.

Do not infer a missing thread name. Preserve the raw `top` samples and thread
table and mark the corresponding aggregate `NOT CAPTURED` if a relevant thread
cannot be identified or disappears before its final cumulative sample. The
raw Perfetto scheduling trace remains the correlation source for P-03; a
later analysis tool may not replace the CPU values captured here without
recording that derivation separately. From each freshly reset `gfxinfo`
result, copy total frames, both reported jank/deadline fields when present,
missed vsync, high-input-latency, slow-UI-thread, slow-bitmap-upload,
slow-draw-command counts, and p50/p90/p95/p99 CPU and GPU frame times. Keep the
complete `framestats` table as the source of truth.

### Separate video pass

Video is a separate replay of each scenario and is never used as the primary
CPU/frame-pacing trial. Before recording, save the current value of Android's
`show_touches` with `adb -s emulator-5554 shell settings get system
show_touches`, enable it with `settings put system show_touches 1`, and restore
the exact recorded value after the full video set (`settings delete` if it was
unset). Run `screenrecord` in one shell and drive the scenario from another:

```bash
adb -s emulator-5554 shell screenrecord --size 1080x2400 \
  --bit-rate 20M --time-limit 20 /sdcard/<scenario>-video.mp4
adb -s emulator-5554 pull /sdcard/<scenario>-video.mp4 \
  artifacts/android-performance/<product-revision>/
ffprobe -v error -show_streams -show_format \
  artifacts/android-performance/<product-revision>/<scenario>-video.mp4
```

Use the actual video time base/frame rate reported by `ffprobe`. For each
isolated sample, count frames from the first visible touch marker to the first
corresponding visual response (Wally/object movement, HUD/reaction change, or
FX). Record every sample plus median and maximum milliseconds; also record
missed, duplicated, or visibly queued responses and a plain `perceptible:
yes/no` operator observation. The frame-count value is limited to one encoded
video frame and is not presented as instrument-grade input latency.

For cold image readiness, perform three additional process-cold video trials:
prepare a resumable stable gameplay save, return to the menu, run `am
force-stop com.krukmat.pyjamada`, confirm `pidof` is empty, start the release
activity with `adb -s emulator-5554 shell am start -W -n
com.krukmat.pyjamada/.MainActivity`, and choose Continue. Record `am start -W` output and count from the
Continue touch to (a) the first game-canvas frame and (b) the first frame with
Wally and all six object visuals present. Record any blank/partial interval;
do not clear package data. Cold trials are separate from `I`.

For `A1`, `C-A`, `C-W`, and `O-S`, inspect the video frame by frame and record
the peak number of simultaneously visible FX sprites, the frame timestamp,
and the visible clip types. This is explicitly a visible lower bound when
sprites overlap; do not convert source event counts into a measured visual
count. `I` and `M` still receive a peak field, normally zero unless the video
shows otherwise.

### Required result record and failure semantics

P-02 must produce one environment/identity record, one row per primary trial,
one row per video scenario, three cold-readiness rows, and an ordered SHA-256
manifest. Every scenario row has these fields:

```text
scenario | trial | UTC window | setup assertion | trace file/hash
framestats file/hash | app/main/JS/RenderThread CPU ms and %
frames + frame percentiles + jank/deadline/input counters
video file/hash | touch samples/median/max/perceptible
cold first-canvas/full-room ms | visible peak FX/timestamp/types
deviation | PASS CAPTURED / NOT CAPTURED
```

`PASS CAPTURED` means the evidence is complete and attributable; it is not a
performance verdict. A missing trace, truncated/zero-frame video, unresolved
thread identity, wrong start state, profiler failure, thermal interruption, or
unexplained trial deviation is recorded as `NOT CAPTURED`. Repeat once when
safe; otherwise P-02 remains open. Never fill a missing metric from another
trial, static inspection, the old screenshot tour, or the pre-P-01 exploratory
`gfxinfo` state.

P-03 compares the three trials and scenario deltas against same-run idle,
correlates any frame/touch degradation with observed JS/main/RenderThread work,
and judges cold blanks and visible FX load. It must not use a generic FPS target
detached from this 60 Hz emulator or require a rewrite solely because a
profiler counter is non-zero.

## Decision requested from audit

Resolve `INC-004` with one of:

- **ACCEPT:** current cadence is adequate for the project/target.
- **FIX BEFORE MERGE:** measured issue justifies a targeted optimization.
- **FOLLOW-UP:** current cadence is acceptable for this merge but a UI-thread animation migration should be tracked separately.
