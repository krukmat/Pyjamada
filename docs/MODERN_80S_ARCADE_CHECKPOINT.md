# Modern 80s Arcade Visual Checkpoint

Status: IMPLEMENTATION CHECKPOINT — Android recapture required
Branch: `feat/expressive-arcade-visual-refactor`

## Target

The gameplay screen is being shaped as an original **modern 80s arcade storybook**:

> Arcade-first readability + Wonder-Boy-inspired charm + modern depth/polish + Pyjamada domestic comedy.

This is a design-principle reference only. No protected character, sprite, composition, layout or UI from another game is to be copied.

## Completed visual passes

### ARC-01 — Wally design

- stronger, larger hero silhouette;
- original hair/face/hand/foot language;
- expressive eye/brow/mouth states;
- teal pajama identity with yellow accent;
- visually distinct dressed state;
- stronger sleepy / normal / rushed / startled poses.

### ARC-02 — Wally motion

- explicit anticipation → impact → recovery key poses;
- differentiated movement cadence per Wally state;
- stronger wake, recoil, fumble and interaction actions;
- theatrical success and distinct failure poses;
- tighter arcade-oriented frame timing while preserving semantic clip selection.

### ARC-03 — Interactive objects

- six procedural Skia object renderers reworked for iconic silhouette/readability;
- wardrobe rescaled to match the new hero proportions;
- alarm and keys use stronger 80s-style graphic shapes;
- transient object reactions consume the complete frame progression;
- gameplay locations/radii remain untouched.

### ARC-04 — Bedroom stage

- bedroom reorganized as a horizontal three-beat stage;
- left sleep/cool zone;
- center decision/warm zone;
- right escape/sunrise zone;
- exterior and window strengthened as depth/final-direction cues;
- layered parallax remains presentation-only.

### ARC-05 — Light and color

- background/floor values slightly restrained so Wally remains primary;
- cool-left / warm-center / sunrise-right atmosphere;
- local lamp/window pools;
- subtle presentation-only hero focus light;
- stronger contact shadows and interaction cue sizing.

### ARC-06 — Semantic FX

- graphical shock/starburst language;
- clearer noise waves;
- stronger motion streaks;
- success/failure impact bursts;
- quieter dust/steps/sleep effects remain subordinate;
- VisualEvent/FxSystem origin and lifetime contracts unchanged.

### ARC-07 — Gameplay HUD

- gameplay HUD reduced to light mission/stats capsules;
- action prompt reduced and contextual;
- feedback chrome removed;
- controls narrowed and visually subordinated to the stage;
- Maestro-facing copy/test IDs preserved;
- menu/settings/final typography remain deferred.

## Architecture after the pass

```text
SystemicRuntime
      ↓
VisualEventMapper
      ↓
PresentationRuntime
      ↓
WallyAnimator / ObjectAnimator / FxSystem
      ↓
semantic clip + resolved frame
      ↓
GameCanvas / Skia
      ├── IllustratedBedroomScene
      ├── ArcadeStageLighting
      ├── IllustratedWally + WallyArcadeMotion
      ├── IllustratedObject
      ├── IllustratedFx
      └── presentation-only camera/focus
```

The historical PNG atlas/manifests remain validated and still provide frame/clip contracts where required, but the gameplay artwork is now primarily procedural Skia illustration.

## Invariants preserved

- six canonical gameplay objects;
- ten ordered rules;
- deterministic gameplay/resources/failure precedence;
- logical player/object coordinates and interaction radii;
- save/continue/restart semantics;
- gameplay → presentation dependency direction;
- no persisted transient animation state;
- animations do not block gameplay.

## Evidence state

Automated CI remains responsible for:

```bash
npm run assets:validate
npm run test:all
npm run typecheck
npm run audit:static
```

Android visual evidence is separate. The currently versioned `docs/screenshots/` set predates the completed ARC-01…ARC-07 pass and must be regenerated before judging the latest Wally proportions, stage composition, lighting, HUD density or FX balance.

Run locally:

```bash
npm run screenshots:android
```

or, with the release APK already built:

```bash
SKIP_BUILD=1 npm run screenshots:android
```

## Required Android review after recapture

Prioritize visual inspection of:

1. `03_run_start_sleepy` — Wally silhouette/scale and sleep-zone hierarchy;
2. `06_alarm` / `07_startled` — recoil, alarm readability and FX density;
3. `08_wardrobe` — Wally/wardrobe relative scale and interaction clarity;
4. `09_success` — success pose, keys and burst hierarchy;
5. `12_fail_house_awake`, `13_fail_exhausted`, `14_fail_too_late` — failure-pose differentiation;
6. `11_continue_restore` — stable visual reconstruction after persistence.

Classify findings as:

- P0: composition/readability blocker;
- P1: Wally/object appeal or scale issue;
- P2: lighting/color/FX balance;
- P3: polish.

## Known non-visual gate

INC-004 / the screen-level React presentation ticker remains an audit/performance question. No Android frame-pacing claim should be made from CI alone.

Likewise, automated evidence does not satisfy the human SG-14 fun gate.
