# Expressive Arcade Refactor — Incident Log

This log records implementation incidents, constraints, deviations and decisions that should be evaluated after the visual refactor. Entries are append-only during the branch unless an item is explicitly resolved.

## Severity

- **S1 blocker** — prevents the current milestone.
- **S2 significant** — requires an architectural/product decision or meaningful rework.
- **S3 contained** — workaround exists; review later.
- **S4 note** — useful implementation observation.

## Incidents

### INC-001 — Android baseline cannot be captured from the GitHub execution environment

- **Phase:** AR-00 / AR-13
- **Severity:** S3
- **Status:** Open / external validation required
- **Observation:** the branch can inspect and rewrite the deterministic Maestro tour, but this execution environment has no attached Android emulator on which to run `npm run screenshots:android`.
- **Impact:** actual visual evidence and side-by-side judgement must come from a developer machine/device.
- **Mitigation:** test IDs, logical viewport and the final eleven-shot screenshot journey are deterministic and checked as part of the static audit contract; CI remains responsible for game semantics, presentation semantics and type safety.
- **Evaluation:** run the final eleven-shot tour locally and review composition/state readability before approving the merge if visual QA is a merge gate.

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

### INC-004 — Screen-level React ticker advances sprite animation

- **Phase:** AR-04 / AR-10 / AR-11
- **Severity:** S3
- **Status:** Open / explicit audit decision required
- **Observation:** stable idle clips and transient reactions advance through one screen-level 80 ms presentation tick. Leaf sprites contain no timers and gameplay state contains no animation clock, but the tick updates React state while `GameScreen` is mounted.
- **Impact:** the game screen/canvas path re-renders at the presentation cadence. Static inspection cannot prove whether that cost is material on the Android target.
- **Pre-audit cleanup:** obsolete `PixelArtKit`/`PixelBlocks` rendering and the legacy palette compatibility layer were removed; atlas indexes remain module-level caches; transient event lifetimes are bounded.
- **Decision needed:** measure on Android and choose ACCEPT, FIX BEFORE MERGE, or FOLLOW-UP as described in `docs/PERFORMANCE_REVIEW_NOTES.md`.
- **Evaluation:** focus on JS-thread work, touch responsiveness and stacked-noise FX rather than generic FPS assumptions.

### INC-005 — Wally PNG atlas committed with corrupt IDAT data

- **Phase:** AR-02 / audit remediation
- **Severity:** S2
- **Status:** Resolved in branch; Android visual inspection remains external
- **Observation:** strict audit inspection found `assets/game/wally/wally.png` had a mismatched IDAT CRC and zlib checksum. Raw-deflate recovery also exposed corrupted scanline data in the sixth atlas row; the defect was broader than a missing final physical scanline.
- **Root cause evidence:** the historical `wally.png.b64` in commit `94b53ec4` decodes to the same corrupt binary, so Git history does not contain an independent complete source.
- **Recovery:** frames 0..49 were preserved pixel-for-pixel. Frames 50..56 were reconstructed from recoverable pixels and intact frame relationships inside the same atlas. Exact evidence and transformations are documented in `docs/WALLY_ATLAS_RECONSTRUCTION.md`.
- **Prevention:** `npm run assets:validate` now performs PNG chunk CRC, strict zlib, scanline length/filter and expected-dimension checks on all three production atlases and runs in CI / `audit:premerge`.
- **Evaluation:** the reconstructed `fail_exhausted` and `fail_late` clips should be inspected during local Android visual QA; binary integrity itself is no longer an open blocker once CI passes.

## Review rules

- Do not close an incident just because its surrounding milestone completes.
- S1/S2 incidents must be resolved before merge.
- S3 incidents are explicitly dispositioned by the team audit.
- Manual visual quality, device performance and human-fun observations are never inferred from CI.
