# Expressive Arcade Refactor — Incident Log

This log records implementation incidents, constraints, deviations and decisions that should be evaluated after the visual refactor. Entries are append-only during the branch unless an item is explicitly resolved.

## Severity

- **S1 blocker** — prevents the current milestone.
- **S2 significant** — requires an architectural/product decision or meaningful rework.
- **S3 contained** — workaround exists; review later.
- **S4 note** — useful implementation observation.

## Incidents

### INC-001 — Android baseline cannot be captured from the GitHub execution environment

- **Phase:** AR-00
- **Severity:** S3
- **Status:** Open / external validation required
- **Observation:** the branch can inspect and rewrite the deterministic Maestro tour, but this execution environment has no attached Android emulator on which to run `npm run screenshots:android`.
- **Impact:** the pre-refactor nine-screen baseline must be captured or retained from a developer machine for final side-by-side review.
- **Mitigation:** the current tour, test IDs, logical viewport and screenshot names are frozen in `docs/VISUAL_REFACTOR_BASELINE.md`; CI remains responsible for game semantics and type safety.
- **Evaluation:** compare the final eleven-shot tour with the last pre-refactor local screenshots before merge.

### INC-002 — Binary sprite authoring is a separate delivery concern from atlas architecture

- **Phase:** AR-02
- **Severity:** S3
- **Status:** Accepted
- **Observation:** GitHub source edits are text-first, while production sprite sheets are binary assets.
- **Impact:** atlas/animation contracts must not depend on the mechanism used to author the PNG files.
- **Decision:** implement atlas manifests, deterministic clips, anchor rules and the Skia atlas renderer first. Original binary assets are delivered during AR-04/AR-05 and remain replaceable without gameplay changes.
- **Evaluation:** confirm final assets are original, nearest-neighbour safe and validated by manifests.

### INC-003 — `Systemic*` remains the internal gameplay vocabulary

- **Phase:** AR-03
- **Severity:** S4
- **Status:** Accepted
- **Observation:** the consolidated product has one game path, but the pure gameplay engine still uses `Systemic*` type/module names.
- **Impact:** presentation code must not interpret this naming as a second product mode.
- **Decision:** do not rename the gameplay engine during an art refactor; presentation modules use neutral visual/animation terminology.
- **Evaluation:** consider a separate naming cleanup only if the internal terminology becomes confusing to contributors.
