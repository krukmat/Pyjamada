# Android Validation

Pyjamada has one Android gameplay path and one screenshot tour.

## Fast validation

```bash
npm run test:all
npm run typecheck
```

## Local visual tour

Start an Android emulator and run:

```bash
npm run screenshots:android
```

The command stages the run in a temporary directory and only publishes it to
`artifacts/android-screenshots/` after the full build/tour succeeds — a
failed run leaves the last successful evidence set untouched and records the
failed attempt separately in `artifacts/android-screenshots-failed/`
(`FAILURE.txt` plus whatever partial screenshots it managed to produce). It
builds a release APK unless `SKIP_BUILD=1` is supplied, installs it, and runs
the Maestro flow in `maestro/screenshots.yaml`, which writes exactly fourteen
named PNG files. `scripts/validate-screenshot-contract.mjs` (`npm run
audit:static`) checks the flow and the runner's expected-name list agree in
both directions — a missing, extra, duplicate, or renamed screenshot fails
with the exact name involved. The build step also sets
`EXPO_PUBLIC_PYJAMADA_TEST_HOOKS=1` (see T-05 below), enabling a hidden
readiness element the flow waits on before each transient-pose screenshot.

For repeated UI iteration after the APK already exists:

```bash
SKIP_BUILD=1 npm run screenshots:android
```

The tour covers, from one continuous run unless noted:

1. main menu
2. settings screen
3. run start (sleepy)
4. bed/wake interaction
5. slippers (quiet steps)
6. alarm (first press)
7. startled state (second alarm press)
8. wardrobe fumble
9. successful objective (keys collected while dressed)
10. deterministic restart
11. continue/restore (exit mid-run, re-enter, presentation reconstructed from gameplay state)
12. failure: house-awake (noise reaches the 85 threshold), fresh run
13. failure: exhausted (energy reaches the 0 floor), fresh run
14. failure: too-late (time exceeds the 50 deadline), fresh run

Each failure outcome starts a fresh run (exit to the main menu, then new game)
because the objective is terminal once failed or completed — there is no
restart button mid-run, only after an outcome.

## T-04 — transient-capture decision

Several existing screenshots (`04_bed_wake`, `05_slippers`, `06_alarm`,
`07_startled`, `08_wardrobe_fumble`) are meant to capture a short-lived Wally
reaction pose (`wake`, `equip_slippers`, `alarm_recoil`, `fumble`; see
`WallyAnimator.selectWallyVisual`), not the idle pose Wally falls back to once
that pose's `visualEventLifetimeMs` (360–440ms) elapses. Today the flow taps
the trigger and immediately screenshots with no signal that the transient pose
is actually still showing — on a real device the tap-to-screenshot latency
(UI settle, IPC, frame capture) is not bounded below that window, so the
screenshot can just as easily land on the idle fallback. This is a real,
pre-existing gap, not a hypothetical one; it is deferred to T-05 rather than
folded into T-03 because fixing it changes application code, not just the
flow/contract.

**Alternatives considered and rejected:**

1. **Fixed wall-clock sleep before the screenshot.** Not a readiness
   condition — a delay short enough to reliably beat device/emulator jitter
   risks the pose already having reverted, and a delay long enough to be safe
   risks the same thing from the other side. It also silently goes stale if
   `visualEventLifetimeMs` values change, since nothing ties the sleep to the
   actual contract.
2. **Global test-build timing multiplier** (stretch `visualEventLifetimeMs`/
   animation durations under a build flag). Rejected because it would make
   default application timing differ between the build under test and a real
   release build, directly conflicting with T-05's own acceptance criterion
   ("default application timing/behavior is unchanged"), and it still only
   narrows the race, it does not remove it.
3. **Screen recording plus offline frame extraction.** Same underlying race
   (still guessing a wall-clock offset for the target frame), for
   substantially more tooling/CI cost than an "S"-sized task should carry.
4. **Maestro's built-in `waitForAnimationToEnd`/`assertVisible` alone, no
   app change.** `waitForAnimationToEnd` waits for the screen to stop
   changing, which is the opposite of what is needed mid-transient, and
   neither command can introspect which atlas clip the Skia canvas is
   currently drawing. Ruled out as not solving the problem at all, not just
   as a worse solution.
5. **Descope: drop transient-pose screenshots, capture only stable/idle
   poses and outcome banners.** The most defensible runner-up — transient FX
   and reaction lifecycle are already covered deterministically by
   `tests/presentation.test.ts` under a fake clock (F-02, F-05, Q-01–Q-03).
   Rejected as the selected path only because device screenshots also verify
   something the unit tests structurally cannot: that these specific
   short-lived clips actually render correctly through the real Skia/GPU
   pipeline on device, which is exactly the failure mode FINDING-001 was
   about. The plan's own T-04/T-05 acceptance criteria already anticipate and
   authorize an app/runtime hook, so this option is recorded as a reasonable
   fallback if T-05 is deferred, not adopted now.

**Selected mechanism: app/runtime debug-readiness hook, test-only.**

- **Readiness signal:** `GameScreen` renders one hidden `Text` element with a
  stable `testID` (`debug-wally-clip`) whose content is the Wally animator's
  currently resolved `clipId` (from `selectWallyVisual`, the same pure
  computation `resolveWallyVisualFrame`/`GameCanvas` already use for
  rendering), refreshed on the existing ~80ms UI timer. The element uses a
  real 1×1 point footprint with `opacity: 0` and `pointerEvents: 'none'`, not
  a literal zero size — a `width:0, height:0` view risks Android's
  accessibility layer reporting it as not-visible, which would break the
  Maestro wait this hook exists to serve; `opacity: 0` hides it from a human
  without affecting that. Maestro waits for the exact clip id
  (`extendedWaitUntil: { visible: { id: debug-wally-clip, text:
  "<expected-clip>" } }`) immediately before each transient screenshot,
  replacing the previous blind tap-then-screenshot.
- **Clock/timing contract:** the hook only reads state the app already
  computes for rendering; it does not touch `Date.now()`, animation
  durations, or `visualEventLifetimeMs`. Gameplay and presentation timing are
  bit-for-bit identical whether or not the hook is enabled.
- **Production isolation:** gated by a single build-time check,
  `process.env.EXPO_PUBLIC_PYJAMADA_TEST_HOOKS === '1'` (an Expo public env
  var inlined at Metro bundle time). Unset — the default for `npm run
  android`, ordinary release builds, and CI unless explicitly opted in — the
  hook renders `null`. Only `scripts/android-screenshots.sh` sets it, and
  only for its own build step.
- **Planned paths (T-05):** `src/app/GameScreen.tsx` (render the hook);
  `src/app/testHooks.ts` (single-source `isTestHooksEnabled()` helper, unit
  testable); `scripts/android-screenshots.sh` (set the env var before
  building); `maestro/screenshots.yaml` (add the five `extendedWaitUntil`
  waits); `tests/app-test-hooks.test.ts` (unit coverage for the helper);
  `docs/ANDROID_SMOKE_TEST.md` (this section plus the tour list once
  implemented).
- **Failure behavior:** if the expected clip id never appears within the
  wait's timeout, that Maestro step fails outright — no fallback screenshot,
  no silent pass. A regression that breaks or renames a transient reaction is
  a hard tour failure, which is the intended behavior.
- **Recalculated T-05 RRI:**

  ```text
  npm run rri -- \
    --touches src/app/GameScreen.tsx --touches src/app/testHooks.ts \
    --touches scripts/android-screenshots.sh --touches maestro/screenshots.yaml \
    --touches docs/ANDROID_SMOKE_TEST.md --touches tests/app-test-hooks.test.ts \
    --C 0 --D 2 --T 3 --A 2 --K 3 --P 3 --X 2 --json
  ```

  `RRI 46 High (base 46, no modifiers, no categorical floor)`. Dominant
  drivers: P (user-visible app-orchestration surface, 9.6), T (the core
  claim — no race — is only verifiable by an actual device run, 9.0), K
  (build-flag/render/Maestro coordination, 8.4). High band requires a fresh
  1st Reviewer on the task analysis, explicit human approval before starting,
  and an independent fresh 2nd Reviewer on the solution before closure — T-05
  does not start until that approval is recorded here or in the task's
  closure notes.

This decision rejects alternatives 1–4 outright and defers alternative 5 to a
fallback only if T-05 is not authorized. No implementation branch is left
open: T-05, if authorized, implements exactly the mechanism above and nothing
else.

## CI emulator smoke

`.github/workflows/android-emulator-smoke.yml` builds and launches the release APK on a Pixel 6 / API 35 emulator and publishes APK/screenshot/logcat evidence. It is technical smoke coverage, not a substitute for the human fun gate.
