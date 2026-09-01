# Expressive Arcade Refactor — Team Audit Guide

Use this guide to review `feat/expressive-arcade-visual-refactor` before any merge to `main`.

## Objective

Determine whether the refactor is technically sound, maintainable and safe to merge while preserving the deterministic gameplay contract. The audit is not a vote on whether every visual choice is personally preferred; visual findings should be tied to readability, causality, consistency, accessibility, performance or product intent.

## Severity model

- **Critical** — data loss/corruption, broken deterministic gameplay, unsafe asset provenance, crash-level renderer defect, architectural violation that invalidates the refactor.
- **High** — likely user-visible regression, lifecycle desynchronization, serious performance/control-latency risk, persistence inconsistency, major maintainability flaw.
- **Medium** — contained design debt, moderate performance risk, incomplete abstraction, test gap, confusing API or documentation issue.
- **Low** — cleanup, naming, minor duplication, style/readability improvement with no material behavior risk.

Every finding should state one recommended disposition: **fix before merge**, **accept debt**, **follow-up issue**, or **not a defect**.

## Reviewer tracks

### A. Gameplay/domain architecture

Review:

- `src/game/systemic/`
- `src/game/presentation/VisualEventMapper.ts`
- `docs/PRESENTATION_POLICY.md`

Questions:

- Can presentation influence gameplay outcomes indirectly?
- Does any renderer/animator need to understand rule IDs?
- Are semantic visual events sufficiently generic to support future objects/rules?
- Can rapid input cause the visual event mapper to misrepresent the final gameplay state?
- Did any visual requirement accidentally alter the six-object / ten-rule behavior?

### B. Presentation lifecycle

Review:

- `PresentationRuntime.ts`
- `VisualEvent.ts`
- `WallyAnimator.ts`
- `ObjectAnimator.ts`
- `FxSystem.ts`

Questions:

- Are channel superseding rules deterministic and understandable?
- Can multiple semantic events in one gameplay update incorrectly erase one another?
- Are event lifetimes consistent with clip durations?
- Does wall-clock expiry during background/foreground transitions produce a valid stable state?
- Does restart clear every transient effect?
- Does continue reconstruct stable state without hidden presentation persistence?

### C. Atlas/render architecture

Review:

- `src/game/presentation/atlas/`
- `AssetSources.ts`
- `GameCanvas.tsx`
- binary assets under `assets/game/`

Questions:

- Are atlas bounds/frame IDs/anchors validated adequately?
- Does horizontal facing preserve the Wally ground anchor?
- Are integer placement and nearest-neighbour rules enforced consistently?
- Are the three atlas files logically replaceable without gameplay changes?
- Are procedural primitives being used only where they are cheaper/clearer than sprite data?
- Are any objects rendered even when their stable state should be visually absent?

### D. Performance

Start with `docs/PERFORMANCE_REVIEW_NOTES.md` and `INC-004`.

Questions:

- Is the 80 ms React-level ticker acceptable on the target Android device?
- Does the ticker rerender more of `GameScreen` than necessary?
- Are object/FX resolution allocations material at the current scale?
- Would Skia `useClock`/Reanimated shared values reduce JS-thread work enough to justify the complexity?
- Is input responsiveness measurably affected during stacked FX/noise events?
- Are screen-shake and atlas transforms allocation-heavy in practice?

Do not require a performance rewrite without measurement. Record device/emulator, build type and observed metrics with the finding.

### E. UX / visual communication

Use the eleven-shot Maestro tour plus direct play.

Questions:

- Can `sleepy`, `rushed` and `startled` be distinguished without a Wally text label?
- Are all six objects recognizable and visually distinct from decoration?
- Is `ACTION` discoverable without persistent diagnostic text?
- Do noise/energy changes read visually before the reaction prose is read?
- Is the background restrained relative to Wally, interactables and FX?
- Does physical comedy clarify consequences rather than obscure them?
- Are success/failure beats immediately understandable?

### F. Persistence / restore / regression

Review:

- `AsyncStorageGameSaveRepository`
- codec/state tests
- `App.tsx`
- screenshot checkpoint `11_continue_restore`

Questions:

- Does the save payload remain free of frame/timestamp/event state?
- Can corrupted/incompatible saves still fail safely?
- Does restart persist the reset gameplay state?
- Does exiting/re-entering leave presentation in a stable derived state?
- Are telemetry/retry semantics unchanged by the presentation layer?

### G. Tests and tooling

Run:

```bash
npm install
npm run audit:premerge
```

Then inspect test quality, not only green status.

Questions:

- Are tests checking meaningful contracts or implementation trivia?
- Are important event-channel collisions covered?
- Do production atlas manifests receive the same validation as fixtures?
- Are efficient/near-miss/chaos gameplay paths still represented?
- Does `scripts/audit-static.sh` protect real architectural invariants without being overly brittle?
- Is `maestro/screenshots.yaml` deterministic enough for repeated review?

## Audit anti-patterns

Avoid:

- approving based solely on CI;
- treating Android screenshots as executed when only the Maestro YAML was validated;
- requesting a full engine rewrite to solve a measured-local issue;
- mixing feature expansion (new rooms, monetization, progression) into this refactor audit;
- reopening the removed Classic/Systemic product split;
- classifying subjective aesthetic preference as High/Critical without a usability or product consequence;
- modifying gameplay math to make an animation easier.

## Expected audit output

The team should finish with:

1. a normalized list of findings using `docs/AUDIT_FINDING_TEMPLATE.md`;
2. a disposition for every finding;
3. an explicit decision on `INC-004` performance strategy;
4. a statement on Android visual QA evidence;
5. a final recommendation: **merge**, **merge after fixes**, or **do not merge**.
