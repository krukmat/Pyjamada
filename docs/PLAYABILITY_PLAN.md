# Playability and Contextual Legibility Plan

Scope: make the bedroom run **playable** and **understandable from the screen
alone**, before any further art-direction work.

Palette, typography and the mid-1980s reference discussion are explicitly
**out of scope** for this plan. They are downstream of it: there is no point
tuning hue or bitmap type while the player character renders upside down and
the noise meter does not show the value that kills the run.

This plan is separate from `docs/AUDIT_REMEDIATION_PLAN.md`. That plan makes
the branch *auditable*; this one makes the game *play*. Task IDs use the `J-`
prefix and do not overlap.

## Evidence baseline

All findings below were observed on the current branch, not inferred.

| # | Finding | Evidence |
|---|---|---|
| 1 | Wally renders **rotated 180° and displaced off the floor** whenever `facing === 'left'`. Facing right is correct. | `04_bed_wake` vs `03_run_start_sleepy` captures; `AtlasSprite` builds `Skia.RSXform(-scale, 0, tx, ty)`, and an RSXform with `ssin = 0` and negative `scos` is a uniform negative scale — a 180° rotation, not a horizontal mirror. |
| 2 | `AtlasSprite` has **no test coverage**. | No test in `tests/presentation.test.ts` references it. |
| 3 | The play field occupies **~17% of the screen**: 256×256 dp inside 411×914 dp. | `adb shell wm size/density` → 1080×2400 @ 420dpi = 411×914 dp. `viewport = floor((411-32)/128)*128 = 256`. |
| 4 | The viewport misses the next integer scale by **5 dp**. 384 dp needs a 27 dp padding budget; the formula reserves 32. | Same formula. 384 dp would be ~39% of the screen — 2.25× the current area. |
| 5 | The **NOISE meter does not encode the failure threshold**. It maps `noise/100` onto 6 segments, but the run fails at 85. A player dies showing 5 of 6 segments. | `ResourceStat ... max={100}`; `SYSTEMIC_LIMITS.noiseFailure = 85`. |
| 6 | Meter granularity is **16.7 points per segment**. Most single actions produce no visible meter movement; picking up the keys (`noise +2`) moves nothing. | `PixelMeter segments={6}`. |
| 7 | **TIME shows no deadline.** The HUD reads `07`; the run fails past 50. | `ArcadeStat label="TIME" value={String(state.timeSpent)}`. |
| 8 | The objective strip shows **no progress**. It reads `GET DRESSED + FIND KEYS` unchanged for the whole run, although `flags.dressed` and `collected` are available. | `GameScreen` objective strip. |
| 9 | The player **cannot see the cost of an action before taking it**. The prompt says `ACTION · ALARM CLOCK`; the `+18` noise appears only after the fact, as text. | `actionPrompt` renders `target.label` only. |
| 10 | **77% of player input is walking.** The winning line is 26 inputs: 20 moves, 6 actions. The time-out route is 49. There is no hold-to-repeat; every step is a discrete tap. | Runtime replay of the tour sequences; `Control` uses `onPress` only. |
| 11 | The winning line ends at **noise 81 against a failure threshold of 85** — a 4-point margin, unverified as intentional. | Runtime replay of the happy path. |
| 12 | Energy starts at **35/100**, so the meter opens at 2 of 6 segments — it reads as damaged, not as a full tank. | `createSystemicRun`. |
| 13 | The game is **turn-based**: `timeSpent` advances only on input. The 80 ms ticker drives animation only. | `SystemicRuntime`; `GameScreen` `setInterval`. |
| 14 | Screenshots 12–14 fail in the Maestro driver, not in gameplay. The three input sequences each reach their intended failure state when replayed against the pure runtime. | Runtime replay: `house-awake` noise 92, `exhausted` energy 0, `too-late` time 51. |
| 15 | A failed evidence run **archives zero diagnostics**. `archive_failed_attempt()` globs PNGs with `-maxdepth 1` while Maestro writes to a nested timestamped directory, and `cleanup()` removes the report directory on EXIT. | `scripts/android-screenshots.sh`; `artifacts/android-screenshots-failed/` contains only `FAILURE.txt`. |

Findings 1, 3, 5, 7, 8 and 9 are the contextual-legibility core: the player
cannot reliably read *where they are*, *how close they are to losing*, *how
close they are to winning*, or *what the next button will cost*.

## Dependency graph

```text
Phase 0 — see the game
  J-01 ─┬─→ J-02
        └─→ J-03
  J-04 ─────────────────────────────┐
                                    │ (verification surface for phases 1-4)
Phase 1 — the character and the frame
  J-05 → J-06 → J-07 ───────────────┤
  J-08 ─────────────────────────────┤
                                    │
Phase 2 — the HUD stops lying       │
  J-09 ─┐                           │
  J-10 ─┼───────────────────────────┤
  J-11 ─┘                           │
        │                           │
Phase 3 — the player can anticipate │
        └─→ J-12 → J-13             │
  J-07 + J-12 → J-14 ───────────────┤
                                    │
Phase 4 — it plays without fatigue  │
  J-07 → J-15 → J-16 ───────────────┘
                    │
Phase 5 — design decisions (gated)
  J-17 → J-18 → J-19 (conditional)
  J-13 + J-15 + J-16 → J-20
```

Two dependencies carry the plan's actual reasoning:

- **J-20 depends on phases 3 and 4 shipping first.** The turn-based / real-time
  question is the most expensive decision here. Do not answer it until
  hold-to-repeat, tap-to-walk and the anticipation cues exist, because those may
  make the turn-based structure read as arcade enough and retire the question
  for free.
- **J-19 depends on J-17, not on opinion.** No balance number changes before a
  solver reports the actual outcome space.

## Phase 0 — See the game

Nothing in phases 1–4 can be accepted without a capture route. J-01 is the only
task that converts "the tour failed" into "the tour failed at this command".

| ID | Size | Depends on | Task and single output | Acceptance criterion |
|---|---:|---|---|---|
| J-01 | XS | — | Run `maestro --device <id> test --test-output-dir artifacts/maestro-debug maestro/screenshots.yaml` directly, bypassing the runner, and record the failing command for shots 12–14. | The exact failing command and its Maestro error are recorded; no rebuild is performed. |
| J-02 | S | J-01 | Split the tour into a base flow (01–11) and a failures flow (12–14), keeping the 14-name screenshot contract intact. | Each flow runs standalone from `launchApp: clearState: true`; `validate-screenshot-contract` still agrees on 14 names across both files. |
| J-03 | S | J-01 | Make a failed run preserve diagnostics: remove `-maxdepth 1` from the PNG sweep and archive the Maestro report before `cleanup()` deletes it. | A forced failure leaves the partial PNGs and the Maestro report in the failed-attempt archive; the regression test covers the nested-directory case. |
| J-04 | S | — | Add a scripted playtest capture path using `adb shell screenrecord` plus `adb exec-out screencap`, independent of Maestro and of the test hooks. | A full run is captured as video on a connected device with no test-hooks build and no accessibility-hierarchy dependency; documented in `docs/ANDROID_SMOKE_TEST.md` as exploratory evidence, not audit evidence. |

J-04 exists because pacing and feel cannot be judged from stills. It is the
evidence surface for every "does it play better" question in phases 3–5.

## Phase 1 — The character and the frame

| ID | Size | Depends on | Task and single output | Acceptance criterion |
|---|---:|---|---|---|
| J-05 | S | — | Add `AtlasSprite` transform tests covering both facings, anchor offsets and integer-scale enforcement. | Tests assert the emitted transform and placement for `facing: 'right'` and `facing: 'left'`; the left case **fails against current code**, reproducing the 180° defect. |
| J-06 | S | J-05 | Replace the negated-`scos` RSXform with a true horizontal mirror (a `Group` `scaleX(-1)` around the sprite's anchor, or a corrected transform). | J-05's left-facing test passes; the right-facing case is byte-identical to before; Wally is upright in both directions. |
| J-07 | S | J-06 | Verify ground contact and anchor for both facings, and confirm the contact shadow stays under the sprite. | A left-facing capture places Wally on the floor plane at the same `y` as right-facing; the shadow is not detached. |
| J-08 | S | — | Recover the next integer viewport scale and use the vertical space, without breaking integer pixel scaling. | The play field reaches 384 dp on a 411 dp device (≈39% of screen, up from ≈17%); scale stays an integer; the layout still fits on a 360 dp device without clipping the HUD or controls. |

J-05 is deliberately first and deliberately failing. The defect survived
because `AtlasSprite` has no tests and because 20 of 26 inputs on the happy
path are `right`, so the broken branch is rarely on screen.

## Phase 2 — The HUD stops lying

These three are one coherent change to what the HUD claims, and share one
approval boundary even though they are scored and reviewed separately.

| ID | Size | Depends on | Task and single output | Acceptance criterion |
|---|---:|---|---|---|
| J-09 | S | — | Make the NOISE meter encode `noiseFailure`, not `maxNoise`, and raise segment resolution so a single action is visible. | The meter is full at 85, not 100; a `noise +2` action produces a visible change; the danger zone is distinguishable from the safe zone without relying on hue alone. |
| J-10 | XS | — | Show the deadline alongside elapsed time. | TIME reads as a value against `SYSTEMIC_LIMITS.deadline`; the displayed limit comes from the constant, not a literal. |
| J-11 | S | — | Make the objective strip show live progress from `flags.dressed` and `collected`. | Each objective component shows done/not-done and updates on the action that satisfies it; the strip still states the goal before any progress exists. |

Constraint for all three: read-only consumption of gameplay state. No task in
this phase may change `SYSTEMIC_LIMITS`, rules or persisted state.

## Phase 3 — The player can anticipate

Phase 2 tells the player their current state. Phase 3 is what makes the game
*understandable*: today the only way to learn that a third alarm press is fatal
is to die to it.

| ID | Size | Depends on | Task and single output | Acceptance criterion |
|---|---:|---|---|---|
| J-12 | S | J-09, J-10, J-11 | Show the pending action's cost in the action prompt, read from the target's `baseEffect`. | Standing on an object shows its time/energy/noise cost before ACTION is pressed; the values match what the runtime then applies; no gameplay module is modified. |
| J-13 | S | J-12 | Mark a pending action that would cross a failure threshold. | An action that would push noise past `noiseFailure`, energy to 0, or time past `deadline` is marked as lethal before it is taken; a safe action is not; the marking is not hue-only. |
| J-14 | S | J-07, J-12 | Make interaction consequence readable **at the object**, not only in the text panel. | The interacted object and its noise burst are visible at the object's origin for the event's lifetime; the existing `VisualOrigin` contract is used unchanged; no new persisted state. |

J-13 is the task that turns the run from trial-and-error into a puzzle the
player can reason about. It is also the cheapest possible answer to finding 11:
a lethal-action marker makes a 4-point margin fair even if the margin stays.

## Phase 4 — It plays without fatigue

| ID | Size | Depends on | Task and single output | Acceptance criterion |
|---|---:|---|---|---|
| J-15 | S | J-07 | Add hold-to-repeat on the movement controls at a fixed step cadence. | Holding ◀/▶ emits the same discrete `left`/`right` inputs at a fixed interval; releasing stops within one step; a single tap still emits exactly one input; the run stays deterministic and replayable. |
| J-16 | M | J-15 | Add tap-to-walk: tapping a room object walks to it by emitting the same discrete inputs. | Tapping an object moves the player to it using only existing inputs, stops on arrival, is interruptible by any control, and cannot walk past the room bounds or through an ended run. |

Both tasks change **only how inputs are produced**, never what an input does.
The rule engine, the six objects, the ten rules and the save format are
untouched, so a recorded input sequence still replays identically.

This is where the 77% walking figure is spent. If it does not measurably
improve the feel on J-04 video evidence, that is itself the strongest available
argument for J-20.

## Phase 5 — Design decisions (gated)

Nothing in this phase is implemented without an explicit decision recorded
first. J-19 and J-20 cross the gameplay contract and require decomposition.

| ID | Size | Depends on | Task and single output | Acceptance criterion |
|---|---:|---|---|---|
| J-17 | S | — | Commit a solver that enumerates the run's outcome space and reports win margins, minimum inputs, and how many distinct winning lines exist. | The solver runs against the pure runtime with no presentation import, is covered by tests, and reports the margin distribution for every winning line — not just the tour's. |
| J-18 | S | J-17 | **Decision, no code.** Record whether the 4-point win margin, the 35/100 starting energy and the 50-step deadline are intended, citing J-17 output. | The decision is recorded with evidence and states explicitly whether any constant changes; a decision to change nothing is a valid, recorded outcome. |
| J-19 | M | J-18 | **Conditional.** Retune only the constants J-18 approved. | Decomposed into one constant per subtask; every change has a failing-then-passing test; save compatibility is unaffected. |
| J-20 | M | J-13, J-15, J-16 | **Decision, no code.** Record whether the run stays turn-based or gains autonomous time pressure, judged on post-phase-4 video evidence. | The decision cites J-04 evidence of the improved build, not the current one; it states the consequence for determinism, save format and the arcade reference; "stay turn-based" is a valid, recorded outcome. |

J-20 is the only task that can reconcile the mid-1980s arcade reference with
the current design, and it is deliberately last. Wonder Boy and Mario Bros are
continuous-motion games; this is a turn-based resource puzzle. That gap is
mechanical, not chromatic, and it is a product decision — not something to
resolve by changing sprites.

## Task routing ledger

Score evidence is `final band (base) · C/F/D/T/A/K/P/X`. Calculator output
controls; scores below were produced by `npm run rri`, not from memory.
Per the standing instruction for this branch, the local-model bundle is not
used: the primary context authors every task and the user is the human
reviewer wherever the band requires one.

| ID | RRI evidence | Route | Gate |
|---|---|---|---|
| J-01 | `23 Low (base 23) · 0/0/1/2/1/2/1/2` | Repo tooling + device; no source edit | Bounded request |
| J-02 | `25 Low (base 25) · 1/2/1/1/0/2/1/3` | Primary; flow files + contract checker | Bounded request |
| J-03 | `22 Low (base 22) · 1/1/1/1/0/2/1/2` | Primary; runner + its test | Bounded request |
| J-04 | `27 Moderate (base 27) · 1/1/1/2/1/2/1/2` | Primary + device | Compact card |
| J-05 | `29 Moderate (base 29) · 1/0/2/4/0/2/0/2` | Primary; tests only | Compact card; 2nd reviewer on behavior |
| J-06 | `34 Moderate (base 34) · 1/1/2/1/0/3/3/2` | Primary; `AtlasSprite` + tests | Compact card; 2nd reviewer required |
| J-07 | `36 Moderate (base 36) · 0/1/2/2/1/3/2/3` | Primary + device evidence | Compact card; 2nd reviewer required |
| J-08 | `39 Moderate (base 39) · 0/0/2/3/1/3/3/2` | Primary; `GameScreen` layout | Compact card; 2nd reviewer required |
| J-09 | `41 High (base 41) · 1/2/2/2/1/3/3/2` | Primary; HUD + meter + tests | 1st reviewer, approval, independent 2nd |
| J-10 | `32 Moderate (base 32) · 0/0/2/2/0/3/3/1` | Primary; HUD only | Compact card; 2nd reviewer required |
| J-11 | `36 Moderate (base 36) · 0/0/2/2/1/3/3/2` | Primary; objective strip | Compact card; 2nd reviewer required |
| J-12 | `42 High (base 42) · 1/0/2/2/2/3/3/3` | Primary; `GameScreen` only, reads `SystemicContent` | 1st reviewer, approval, independent 2nd |
| J-13 | `45 High (base 45) · 1/0/3/2/2/3/3/3` | Primary; `GameScreen` only | 1st reviewer, approval, independent 2nd |
| J-14 | `42 High (base 42) · 1/2/2/2/2/3/2/3` | Primary; `FxSystem` + `GameCanvas` + tests | 1st reviewer, approval, independent 2nd |
| J-15 | `45 High (base 45) · 1/1/2/3/2/3/3/2` | Primary; controls + tests | 1st reviewer, approval, independent 2nd |
| J-16 | `52 High (base 52) · 1/1/3/3/3/3/3/3` | Primary; controls + canvas input | 1st reviewer, approval, independent 2nd |
| J-17 | `31 Moderate (base 31) · 2/1/2/1/1/2/1/3` | Repo tooling; solver + tests | Compact card |
| J-18 | `50 High (base 50; floor architecture_policy) · 0/0/3/2/3/3/4/4` | Primary; decision record only | Human decision required |
| J-19 | `56 Complex (base 56; floor gameplay_contract) · 1/2/4/2/2/3/4/4` | Primary; **decomposition required** | Decompose; approve plan and each subtask |
| J-20 | `60 Complex (base 60; floor architecture_policy) · 0/0/3/3/4/4/4/5` | Primary; decision record only; **decomposition required** | Decompose; human decision required |

Phases 2 and 3 land in Moderate/High mainly because of the `src/app/**` path
floors (D2/P3/K3), not because any single change is large. They are
user-visible presentation changes over read-only gameplay state.

## Invariants this plan does not touch

- Six objects and ten ordered rules.
- Gameplay determinism, and the ban on `src/game/systemic` importing
  presentation or render code.
- Rule IDs terminating at `VisualEventMapper`.
- The save schema and the settings/game storage split.
- Persisted transient presentation state — still none.

J-19 and J-20 are the only tasks that may propose changing any of these, and
neither may proceed without a recorded human decision.

## Verification

Every task uses the repository checks from `AGENTS.md`:

```bash
npm run test:all
npm run typecheck
```

Tasks with device acceptance criteria (J-01, J-04, J-07, J-08, J-14, J-15,
J-16, J-20) additionally require an Android run. Per `AGENTS.md`, visual and
device results are recorded only when that run actually happened.

Closure for the plan as a whole uses `npm run audit:premerge`.
