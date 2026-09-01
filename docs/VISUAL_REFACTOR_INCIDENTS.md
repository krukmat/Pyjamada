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
- **Status:** Resolved
- **Observation:** GitHub source edits are text-first, while production sprite sheets are binary assets.
- **Resolution:** production PNGs are stored as real Git blobs and referenced through typed asset sources; manifests remain text and independently validated.
- **Result:** Wally, bedroom objects and domestic FX can be replaced without touching gameplay semantics or animation contracts.
- **Evaluation:** final visual review still needs to confirm original-art quality and nearest-neighbour rendering on Android.

### INC-003 — `Systemic*` remains the internal gameplay vocabulary

- **Phase:** AR-03
- **Severity:** S4
- **Status:** Accepted
- **Observation:** the consolidated product has one game path, but the pure gameplay engine still uses `Systemic*` type/module names.
- **Impact:** presentation code must not interpret this naming as a second product mode.
- **Decision:** do not rename the gameplay engine during an art refactor; presentation modules use neutral visual/animation terminology.
- **Evaluation:** consider a separate naming cleanup only if the internal terminology becomes confusing to contributors.

### INC-004 — Low-frequency screen ticker temporarily advances sprite animation

- **Phase:** AR-04 / AR-10
- **Severity:** S3
- **Status:** Open until AR-11 performance pass
- **Observation:** stable idle clips and transient reactions must advance even when gameplay state is not changing. The first integrated implementation uses one screen-level animation tick rather than timers inside sprites or gameplay state.
- **Impact:** React re-renders at the chosen arcade animation cadence while the game screen is mounted.
- **Decision:** acceptable through Gate C because it preserves a clean gameplay/presentation boundary and keeps all leaf sprites timer-free.
- **Evaluation:** AR-11 must either move cadence to a Skia/shared-value driver or demonstrate that the current cadence is cheap enough on the Android target.

## Review rules

- Do not close an incident just because its surrounding milestone completes.
- S1/S2 incidents must be resolved before merge.
- S3 incidents are re-evaluated at Gate D.
- Manual visual quality and human-fun observations are never inferred from CI.
