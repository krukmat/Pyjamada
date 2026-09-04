# Independent Architecture Audit — Expressive Arcade Visual Refactor

## Decision

**NOT READY TO MERGE**

The reviewed branch preserves the gameplay domain and save contract, and the canonical automated audit is green. It is nevertheless not mergeable in its current state: the committed Wally atlas prevents an Android release build, and reproducible presentation-channel errors misassign or fail to interrupt visual reactions. Android visual QA and device performance review could not be completed because the release APK could not be built.

## Scope and reviewed revisions

- Feature: `feat/expressive-arcade-visual-refactor` at `b007fc3`
- Base: `main` at `2d53246bec1c34458c389928691a8fc23a1dbb6c`
- Diff: 43 files, 3,153 insertions, 410 deletions
- Audit date: 2026-09-01
- Source changes made by this audit: none
- Audit artifact created: `docs/AUDIT_REPORT.md`

The requested audit, architecture, performance, policy, incident, product, and contributor documents were read first. Their claims were then checked against the complete diff, production code, tests, assets, scripts, and executable behavior.

## Evidence executed

| Evidence | Result |
|---|---|
| `npm run audit:premerge` | **PASS** — gameplay, settings, and presentation tests; TypeScript; static audit |
| `git diff --check main...HEAD` | **PASS** |
| Gameplay diff under `src/game/systemic`, storage, settings, and their existing tests | **No changes** |
| Production atlas manifest validation | **PASS** for all three declared manifests |
| PNG dimensions vs declared atlas dimensions | **MATCH**: Wally 240×168, objects 256×192, FX 128×64 |
| `npm run screenshots:android` | **FAIL** during release build at `:app:mergeReleaseResources` |
| Android visual QA | **ATTEMPTED, NOT COMPLETED** — zero tour screenshots produced |
| Android performance/profile review | **NOT EXECUTED** — no runnable feature-branch APK |

Android context: `sdk_gphone64_arm64`, Android 14 / API 34, `arm64-v8a`, release build. No visual-quality, frame-pacing, touch-latency, or cold-image-loading claim is made in this report.

## Findings summary

| ID | Severity | Area | Disposition | Merge blocking |
|---|---|---|---|---|
| FINDING-001 | High | assets / tooling | fix-before-merge | Yes |
| FINDING-002 | High | presentation | fix-before-merge | Yes |
| FINDING-003 | Medium | presentation / rendering | fix-before-merge | No, but must be dispositioned |
| FINDING-004 | Medium | tests / tooling | fix-before-merge | No, but must be dispositioned |
| FINDING-005 | Low | presentation / dead code | follow-up-issue | No |

Totals: **0 Critical, 2 High, 2 Medium, 1 Low**.

## Defects

## FINDING-001 — The Wally atlas cannot be packaged into the Android release APK

- Severity: High
- Area: assets / tooling
- Status: open
- Recommended disposition: fix-before-merge

### Observation

The canonical Android screenshot command cannot build the feature branch. AAPT2 exits while compiling the committed Wally PNG. The failure is reproducible independently of Gradle and is isolated to that atlas encoding; the committed objects and FX atlases compile successfully, and a temporary lossless re-encoding of the same Wally image also compiles successfully.

This independently reopens the delivery part of `INC-002`: real Git blobs and typed sources exist, but one production blob is not usable by the target Android build path.

### Evidence

- `assets/game/wally/wally.png`
- `src/game/presentation/AssetSources.ts:3`
- `src/game/presentation/atlas/manifests.ts:114`
- `npm run screenshots:android` fails at `:app:mergeReleaseResources` while compiling `assets_game_wally_wally.png`.
- Re-running `:app:mergeReleaseResources` fails at the same resource.
- The Metro-generated resource is byte-identical to the committed PNG.
- Direct Android SDK 36 AAPT2 compilation results:
  - Wally atlas: exit 138
  - objects atlas: exit 0
  - FX atlas: exit 0
  - temporary re-encoded Wally atlas: exit 0
- `npm run audit:premerge` still passes, showing that the current audit package does not detect this failure class.

### Impact

The Android-first product cannot produce the release APK required by the repository's visual tour. The branch therefore lacks both a shippable target build and the required in-game visual evidence.

### Recommendation

Losslessly re-encode the Wally PNG with an Android-compatible encoder, verify that its dimensions and pixel content remain correct, then run a clean release build and the full eleven-shot tour. Add an automated check that validates production PNG decoding/packageability rather than validating only self-declared TypeScript manifest bounds.

### Resolution / owner decision

Open.

## FINDING-002 — Presentation consumers violate event-channel ownership

- Severity: High
- Area: presentation
- Status: open
- Recommended disposition: fix-before-merge

### Observation

The runtime assigns events to channels, but the animators consume events owned by other channels. This produces two independently reproducible correctness failures:

1. `WallyAnimator` treats `OBJECT_INTERACT` and other object-channel events as Wally reactions. A later `WALLY_MOVE` correctly supersedes the old actor-channel event but cannot supersede the object-channel entry, so Wally moves in gameplay position while continuing to render the prior object-reaction pose.
2. `ObjectAnimator` treats every generic `WALLY_FUMBLE` actor event as a wardrobe event. The gameplay rule emits a fumble for any startled interaction except the bed, so interacting with the alarm while startled animates the wardrobe across the room even though it was not touched.

### Evidence

- Channel contract: `src/game/presentation/VisualEvent.ts:48-75`
- Runtime supersession: `src/game/presentation/PresentationRuntime.ts:24-43`
- Cross-channel Wally selection: `src/game/presentation/WallyAnimator.ts:45-64`
- Cross-channel wardrobe selection: `src/game/presentation/ObjectAnimator.ts:17-24` and `:39-45`
- General fumble gameplay rule: `src/game/systemic/SystemicRuleEngine.ts:60-63`
- Targeted action→move probe after an alarm interaction:
  - active events: `OBJECT_INTERACT`, `NOISE_BURST`, `WALLY_MOVE`, `NOISE_BURST`
  - player position advances from 48 to 52
  - selected Wally clip remains `alarm_recoil`, not `walk_normal`
- Targeted startled-alarm probe:
  - interacted object: `alarm-clock`
  - mapped events include `WALLY_FUMBLE`
  - selected wardrobe clip: `wardrobe_fumble`

### Impact

Rapid input and the intended chaos route can visually contradict the completed gameplay update. Actor interruption is not governed by the documented actor channel, and unrelated objects can react without a causal event. This undermines the central purpose of the refactor: trustworthy visual causality over a deterministic game.

### Recommendation

Make channel ownership match consumption. Wally reaction events should live on or be translated to the actor channel; object reactions should carry the affected `objectId` and be consumed only by that object. Add tests for action→move interruption, same-timestamp collisions, and startled fumbles at every eligible non-bed object.

### Resolution / owner decision

Open.

## FINDING-003 — Active FX origins are recomputed from the latest gameplay action

- Severity: Medium
- Area: presentation / rendering
- Status: open
- Recommended disposition: fix-before-merge

### Observation

Several semantic events do not contain an origin or object identifier. `FxSystem.originFor` therefore resolves them from the current `state.lastAction` on every presentation refresh, rather than from the action that created the active event. A subsequent input can move an existing noise, energy, rush, fumble, or related effect to the newest player/object position.

### Evidence

- `src/game/presentation/FxSystem.ts:26-31`
- `src/game/presentation/FxSystem.ts:53-68`
- `src/game/presentation/VisualEvent.ts:5-23`
- Targeted alarm→move probe:
  - alarm origin: x=48, y=87
  - after one immediate move, player x=52
  - the still-active prior alarm `noise` event resolves at x=52, y=88

### Impact

Additive effects can teleport or collapse onto the latest action, weakening spatial causality precisely during rapid-input and stacked-FX scenarios. The gameplay state remains correct, but the presentation can attribute consequences to the wrong place.

### Recommendation

Capture immutable presentation context when the event is mapped or pushed—at minimum an object/player origin or affected object ID—and resolve every active FX entry from its own context. Cover object→move and object-A→object-B sequences with deterministic clock tests.

### Resolution / owner decision

Open.

## FINDING-004 — Validation misses high-value failure, collision, and binary-asset cases

- Severity: Medium
- Area: tests / tooling
- Status: open
- Recommended disposition: fix-before-merge

### Observation

The tests cover nominal wake, alarm, wardrobe, window, success, restore, basic channel replacement, expiry, and manifest fixtures. They do not cover the cross-channel and origin cases above, any objective-failure presentation, or coupling between manifest dimensions and actual PNG files. The Android tour reaches only the success outcome; none of the three new failure clips/banners/FX paths is captured.

The static boundary check also rejects `systemic` imports of `presentation` but does not reject imports of renderer/UI modules, despite the documented UI-independence invariant.

### Evidence

- Nominal presentation coverage: `tests/presentation.test.ts:46-132`
- Success-only objective assertion: `tests/presentation.test.ts:95-104`
- Success-only tour outcome: `maestro/screenshots.yaml:107-120`
- No failure route appears in `maestro/screenshots.yaml`.
- Manifest tests validate declared manifest values but never read production PNG dimensions or exercise AAPT2: `tests/presentation.test.ts:29-44`.
- Boundary grep covers `presentation`, not `render` or `app`: `scripts/audit-static.sh:13-16`.
- The complete `npm run audit:premerge` passes while FINDING-001 remains reproducible.

### Impact

The advertised one-command evidence package can be green while the target release build is broken and important presentation behavior is incorrect. Failure presentation and the real asset pipeline have no end-to-end evidence.

### Recommendation

Add focused unit tests for channel collisions, unrelated-object fumbles, event-stable FX origins, all objective-failure reasons, and stable reconstruction for every Wally/object state. Add a failure checkpoint to the Android tour. Validate real PNG dimensions and Android resource compatibility in CI or in a dedicated asset audit. Extend the static dependency check to renderer/UI imports.

### Resolution / owner decision

Open.

## FINDING-005 — The presentation surface contains unconsumed events and unreachable clips

- Severity: Low
- Area: presentation / dead code
- Status: open
- Recommended disposition: follow-up-issue

### Observation

Several declared semantics are produced or stored without a consumer, and several production clips cannot be selected by current code.

### Evidence

- `WALLY_STATE_STABLE` is emitted by `VisualEventMapper` but has a zero lifetime and is dropped by `PresentationRuntime`.
- `ENERGY_LOSS` and `NO_TARGET` receive lifetimes/channels but have no animator, FX, or UI consumer.
- `wardrobe_opening`, `wardrobe_open`, and `keys_idle` are declared in `manifests.ts` but are never selected.
- `visualEventSupersedesChannel` returns true exactly when a channel exists, making the additional policy function currently tautological.

### Impact

The unused surface makes the semantic contract look more complete than the implemented feedback and increases the chance that future changes rely on behavior that does not exist. It is not a current gameplay or release blocker.

### Recommendation

Either connect each semantic/clip to an intentional behavior and test it, or remove it until required. Keep the public presentation vocabulary smaller than the implementation rather than larger.

### Resolution / owner decision

Open; suitable for a follow-up cleanup if it is not addressed with the channel fix.

## Risks — not established defects

### INC-004 / React-level presentation ticker

Disposition: **FOLLOW-UP; not independently a merge defect on static evidence.**

The single 80 ms ticker rerenders `GameScreen`, snapshots/prunes the runtime, resolves six objects and Wally, allocates small atlas transform arrays, and resolves active FX. Against this 128-pixel, six-object scene, the architecture is proportionate enough that a UI-thread rewrite is not justified without measurement. Module-level atlas indexes, three image sources, bounded event lifetimes, and the lack of leaf timers are positive.

However, no frame pacing or touch-latency evidence was obtained because the APK build failed. Additive noise has bounded lifetime but no cardinality cap, and the full screen rerenders even when only stable idle animation advances. After FINDING-001 is fixed, measure the normal, movement, alarm, stacked-chaos, and success paths on the target Android baseline. Choose ACCEPT or a targeted hybrid migration from observed cost, not architectural fashion.

### Screenshot repeatability

The tour takes screenshots immediately after text assertions and stable loop phases are based on absolute wall-clock time. Exact transient/idle frames may therefore vary even when gameplay state is stable. This is a risk to pixel-level comparison, not a proven usability defect; the tour currently serves manual state evidence rather than deterministic image snapshots.

### Cold image readiness and visual readability

`useImage` legitimately returns `null` while the three atlases load, and the canvas renders the environment without sprites during that interval. The duration and visual consequence were not measurable. Wally-state readability, object recognition, control layout, HUD hierarchy, screen shake, and success/failure clarity remain unverified in-game because no feature-branch APK ran.

## Accepted trade-offs / not defects

- **Gameplay/presentation isolation:** `src/game/systemic` is unchanged from `main` and has no presentation/render imports. Presentation reads completed updates and state; gameplay never reads presentation state.
- **Persistence reconstruction:** no clip ID, frame, timestamp, active event, or FX state is added to the save domain. New game, continue, exit, and restart reset transient presentation; stable slippers, keys, wardrobe, window, and Wally state are derived from validated gameplay state.
- **`Systemic*` vocabulary / INC-003:** accepted internal naming. It does not create a second product path.
- **Procedural environment plus atlases:** an appropriate split for this scene. The obsolete procedural sprite renderer and palette compatibility path are removed.
- **Wall-clock expiry:** acceptable for non-authoritative presentation. Background time can expire effects without advancing gameplay.
- **Atlas rendering design:** integer viewport scale, integer placement checks, nearest-neighbor sampling, module-level manifest indexes, and ground-anchor mirroring are structurally sound.
- **Gameplay contract:** no six-object, ten-rule, objective, resource, save, telemetry, or settings semantic changes were found in the diff.

## Future improvements

- Make the screenshot runner preserve the last successful evidence set until a new build and tour complete successfully.
- Compare every YAML screenshot path with every runner expectation rather than checking four names plus a count.
- Consider resetting stable animation phase on mount/restart only if repeatable frame-level screenshots become a requirement.
- Remove legacy “Prototype save” wording in codec errors during a separate naming cleanup; it is not a parallel implementation.
- Record asset authoring/export parameters so future atlas replacements use a known Android-compatible PNG pipeline.

## Merge blockers and path to readiness

1. Replace/re-encode the Wally atlas and prove a clean Android release build.
2. Correct actor/object event ownership and add the rapid-input/unrelated-fumble tests.
3. Fix or explicitly disposition the Medium FX-origin and validation findings.
4. Run and review the complete Android visual tour after the build is fixed, including failure evidence.
5. Record target-device performance evidence and close `INC-004` as ACCEPT, FOLLOW-UP, or FIX BEFORE MERGE.
6. Re-run `npm run audit:premerge` and `npm run screenshots:android` on the final reviewed HEAD.

**NOT READY TO MERGE**
