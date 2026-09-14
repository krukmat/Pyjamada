# Wally Atlas Reconstruction Record

## Scope

This record documents the repair of `assets/game/wally/wally.png` discovered during the pre-merge audit of `feat/expressive-arcade-visual-refactor`.

The repair is intentionally limited to the corrupted Wally atlas. Gameplay contracts, atlas dimensions, frame coordinates and animation clip IDs are unchanged.

## Corrupted source

- Git blob: `1bcb54b547579b1a8ceb21c417090ddf2dfd793d`
- File size: 4244 bytes
- Declared IHDR: 240x168, 8-bit RGBA, non-interlaced
- Historical `.png.b64` in parent commit `94b53ec4` decodes to the same corrupted binary; it is not an independent recoverable source.

Strict validation found:

- the IDAT PNG chunk CRC does not match;
- zlib validation fails with `incorrect data check`;
- raw-deflate recovery yields only 160746 bytes instead of the expected 161448 bytes;
- decoded scanline corruption becomes visible before the final physical row, so the defect is broader than a missing final scanline.

## Recoverable region

The first five complete atlas rows are intact: frames 0 through 49. They occupy physical PNG rows 0 through 139 and were preserved pixel-for-pixel in the repaired atlas.

Only the final seven defined frames, indexes 50 through 56, occupy the affected sixth atlas row. Atlas slots 57 through 59 are unused.

Affected clips:

- `fail_noise_2` — frame 50
- `fail_exhausted_0..2` — frames 51..53
- `fail_late_0..2` — frames 54..56

## Reconstruction evidence

The reconstruction uses only intact original pixels from this same atlas plus the still-recoverable prefix of the damaged final row.

### Frame 50 — `fail_noise_2`

The recoverable top section is pixel-identical to intact `fail_noise_0` (frame 48). Frame 50 is reconstructed from frame 48. This creates a coherent recoil/return sequence and matches all recoverable pixels.

### Frames 51..53 — `fail_exhausted_0..2`

The recoverable top sections are pixel-identical to `rest_0..2` (frames 41..43) shifted down by exactly one logical pixel. Each exhausted frame is reconstructed from its corresponding rest frame with that one-pixel downward translation.

This transformation matches all recoverable top pixels and produces the intended visually sunk/exhausted posture while remaining inside the 24x28 frame.

### Frames 54..56 — `fail_late_0..2`

The recoverable head region is retained. One clearly corrupted pixel in local position `(15, 9)` had RGB `(23,16,207)` while every equivalent outline pixel uses `(23,16,31)`; its blue component is restored to the atlas outline color.

The destroyed lower-body region is reconstructed from the intact `walk_rushed_0..2` frames, shifted down two logical pixels. The recoverable late head is preserved over those bodies. This part is an explicit inferential reconstruction rather than byte-perfect recovery, but it uses the existing rushed pose language and palette instead of inventing a new asset vocabulary.

## Repaired binary

- New Git blob: `d153e8fbfee289c96a29721ecd23e630298bf053`
- Dimensions: 240x168 RGBA
- First 50 frames: pixel-identical to the recoverable original
- Frame/clip coordinates: unchanged

Strict local validation of the repaired PNG confirmed:

- PNG signature valid;
- IHDR/IDAT/IEND CRCs valid;
- zlib stream inflates successfully;
- inflated data length is exactly 161448 bytes;
- all 168 PNG scanline filter bytes are in the valid range 0..4;
- strict Pillow decode succeeds.

## Preventing recurrence

`scripts/audit-assets.mjs` validates all committed game atlas PNGs in CI. It checks:

- PNG signature and chunk boundaries;
- chunk CRCs;
- strict zlib decompression;
- expected inflated scanline length;
- legal PNG filter bytes;
- the real, decoded PNG dimensions against the same atlas manifest the game renders from (not a separately maintained expected-dimensions table);
- frame bounds, clip frame references, and duplicate frame/clip IDs in that manifest (`validateSpriteAtlasManifest`).

A manifest/PNG mismatch or an invalid frame fails with the asset path in the diagnostic (A-04).

Run locally with:

```bash
npm run assets:validate
```

The same check is included in `npm run audit:premerge` and GitHub validation.

## A-01: encoder parameters

The repaired atlas was re-encoded with Pillow (`PIL.Image.save`, default
`compress_level=6`, no `optimize` flag). Verified directly against the
committed binary rather than trusted from memory:

- container: PNG, IHDR 240x168, 8-bit RGBA, non-interlaced — identical to the
  corrupted source;
- zlib stream header `0x78 0x9c` (CM=8 deflate, CINFO=7 → 32K window,
  FLEVEL=2) — the exact header Pillow's default encoder produces, and
  distinct from pngcrush/oxipng/zopfli output;
- inflated payload is exactly 161448 bytes (168 scanlines × (1 filter byte +
  240×4 RGBA bytes)), matching the pre-corruption expected size noted above;
- scanline filter bytes present in the encoded stream: `{0, 1, 2, 4}` (None,
  Sub, Up, Paeth) — consistent with Pillow's per-row adaptive filter
  selection, not a fixed single filter;
- no ancillary chunks beyond `IHDR`/`IDAT`/`IEND` (no `tEXt`/`iCCP`/`gAMA`),
  so the file carries no extra metadata for Android's AAPT2 to strip or
  choke on.

This is an Android-compatible encoder: AAPT2 accepts standard 8-bit RGBA PNG
with deflate compression and no exotic ancillary chunks, and A-03 confirms
`:app:assembleRelease` packages this exact file without a resource-processing
error.

## A-03: release packaging record

The repaired Wally atlas, object atlas and FX atlas were packaged through
AAPT2 and a full clean release build, exercised via
`npm run screenshots:android` (which builds before running the Maestro tour
unless `SKIP_BUILD=1` is set):

- command: `cd android && ./gradlew :app:assembleRelease` (invoked by
  `scripts/android-screenshots.sh`);
- Java: OpenJDK 17.0.19 (Homebrew `openjdk@17`), pinned by the script via
  `JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home`
  regardless of the shell's default `JAVA_HOME`;
- Android SDK: `compileSdkVersion 36`, `targetSdkVersion 36`,
  `minSdkVersion 24`, `buildToolsVersion 36.0.0`, `ndkVersion 27.1.12297006`
  (resolved from Expo SDK 57's `expo-root-project`/autolinking defaults, not
  a locally pinned value — confirmed live via
  `./gradlew -q :app:properties`);
- ABI: single `arm64-v8a` native library set (no ABI splits configured;
  verified by listing `lib/` entries inside the built APK) — matches the
  arm64-v8a emulator target used for the manual screenshot evidence;
- result: `BUILD SUCCESSFUL in 4m 18s`, 419 actionable tasks executed,
  producing `android/app/build/outputs/apk/release/app-release.apk`
  (41364511 bytes, versionName `0.3.0`, versionCode 1), plus baseline-profile
  `.dm` artifacts for API ranges 28–30 and 31+;
- source revision: `aa29ab9d5119425ed89560eac2b02267a190f329` on
  `feat/expressive-arcade-visual-refactor`.

No AAPT2 resource-processing error occurred for any of the three atlas PNGs;
`processReleaseResources` and `optimizeReleaseResources` both completed
before `packageRelease`/`assembleRelease`. This record is packaging evidence
only — it makes no visual-quality claim, which remains separate manual
Android QA (V-series).

## Audit disposition

The corrupted binary itself is a merge blocker. Once the repaired atlas and asset-integrity validation are green in CI, the binary-integrity blocker is considered remediated.

Android visual QA remains separate: the reconstructed failure animations should be inspected in the normal local screenshot/device review, especially `fail_exhausted` and `fail_late`.
