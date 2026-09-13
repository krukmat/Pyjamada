# Pyjamada — Wonder-Boy-Inspired Visual Rework Plan

Status: ACTIVE
Branch: `feat/expressive-arcade-visual-refactor`
Scope: gameplay presentation only; menus, typography polish and non-gameplay shell are deferred.

## Objective

Transform the gameplay screen from a functional expressive-arcade prototype into a charming, layered, illustrated 2D domestic adventure inspired by the visual principles of classic/modern Wonder Boy — without copying protected characters, layouts, art, sprites or UI.

The target is not a reskin. The target is a substantial scene/presentation rework.

New visual constitution:

> Charming layered world + expressive actors + exaggerated consequences.

A static gameplay screenshot should read as an illustrated 2D adventure scene rather than a React Native canvas with functional sprites.

## Non-negotiable gameplay boundary

Preserve:

- `SystemicRuntime` semantics and deterministic gameplay;
- the six canonical objects and their logical positions/radii;
- the ten ordered rules;
- objective/failure semantics;
- resources, save/continue and restart behavior;
- `GameRuntime -> VisualEventMapper -> PresentationRuntime` isolation;
- semantic visual-event contracts and presentation reconstruction from gameplay state.

Visual coordinates may be projected, scaled, layered, offset or animated without changing gameplay coordinates.

## Rework policy

Visual compatibility is not a goal.

Any current visual element may be deleted or replaced when it limits the target direction, including:

- Wally sprite artwork;
- bedroom-object artwork;
- domestic FX artwork;
- current room composition;
- current background and contact-shadow treatment;
- obsolete rendering helpers;
- visual compatibility paths;
- arcade-oriented styling inside the gameplay viewport.

Architecture with proven value should be retained unless it becomes a material constraint.

## Deferred work

Not part of this pass unless required for gameplay readability:

- final main-menu redesign;
- settings redesign;
- final font/bitmap-font system;
- branding shell;
- loading screens;
- decorative menu iconography.

## Target scene model

```text
Far atmosphere / sky / exterior
        ↓
Distant architecture / silhouettes
        ↓
Room shell / wall / window light
        ↓
Secondary dressing / furniture
        ↓
Interactive gameplay objects
        ↓
Wally / actor plane
        ↓
Transient semantic FX
        ↓
Foreground framing / occlusion
        ↓
Minimal gameplay HUD overlay
```

The world should feel layered even though gameplay remains a compact single-room systemic puzzle.

## Technical direction

### Stage projection

Introduce a presentation-only `StageViewport` abstraction.

Responsibilities:

- map the existing 128x128 logical gameplay world into screen pixels;
- provide integer-safe placement for atlas sprites;
- provide presentation-only parallax offsets derived from player position;
- centralize actor/object visual scaling;
- keep gameplay hit/radius logic completely untouched.

### Camera model

For the single-room version, use a restrained presentation camera rather than a scrolling platformer camera:

- no gameplay-relative camera state;
- subtle horizontal parallax as Wally moves;
- optional micro-pan/recoil from semantic events;
- existing screen shake stays presentation-only;
- room boundaries remain visually stable enough for object recognition.

### Rendering model

Prefer compositional layers in Skia over global post-processing.

Priority:

1. composition;
2. silhouettes;
3. palette/value hierarchy;
4. foreground/background separation;
5. light/shadow overlays;
6. animation and FX;
7. shaders only when they add measurable value.

Do not use a global retro/CRT filter as a substitute for art direction.

## Visual hierarchy

Value order:

1. atmosphere/background — lowest contrast;
2. room dressing — low/medium contrast;
3. interactive objects — medium/high contrast;
4. Wally — highest persistent character contrast;
5. transient FX — highest short-lived contrast.

The player should identify Wally and the six interactive objects before reading any text.

## Work phases

### WB-00 — Visual reset and constitution

Goal: remove the obligation to preserve the current arcade look and establish the new scene grammar.

Tasks:

- inventory gameplay visual paths;
- classify each as KEEP / REWORK / DELETE;
- replace dark arcade palette assumptions with a warmer illustrated-room palette;
- document scale, contrast, depth and layering rules;
- establish original-art/no-copy constraint.

Acceptance:

- gameplay contracts untouched;
- visual policy explicitly allows destructive rework;
- `GameCanvas` can evolve independently of menus/settings.

Gate A: visual foundation ready.

### WB-01 — StageViewport and layered room foundation

Goal: stop treating the 128x128 world as a flat square bitmap-like surface.

Tasks:

- add `StageViewport`;
- centralize logical-to-render projection;
- add presentation-only layer offsets;
- split scene into far, room, gameplay and foreground planes;
- expand background geometry beyond viewport edges to support parallax safely.

Acceptance:

- logical positions/rules remain unchanged;
- Wally/object alignment stays correct;
- visible depth exists without new external art assets;
- no jitter from non-integer atlas placement.

Gate B: layered scene foundation.

### WB-02 — Bedroom composition rebuild

Goal: make the room itself visually desirable.

Tasks:

- replace the current rectangular wall/floor composition;
- create a stronger window/exterior focal area;
- introduce framing furniture and asymmetry;
- establish warm/cool light contrast;
- create foreground occlusion elements;
- remove prototype-looking decoration.

Acceptance:

- room reads as a coherent illustrated domestic space in a static screenshot;
- objects remain visually separable from dressing;
- depth works without HUD text.

### WB-03 — Wally v2

Goal: make Wally the visual anchor of the game.

Tasks:

- re-evaluate current atlas artwork and frame dimensions;
- redraw/replace the atlas if it limits silhouette or expression;
- retain semantic clip IDs where useful;
- improve sleepy/normal/rushed/startled differentiation;
- strengthen anticipation, recoil, overshoot and recovery without changing gameplay duration semantics.

Acceptance:

- all gameplay states are recognizable without labels;
- all required semantic clips resolve;
- atlas integrity validation passes.

### WB-04 — Six-object art pass

Goal: make interactive objects belong to the room while remaining readable.

Objects:

- bed;
- slippers;
- alarm-clock;
- wardrobe;
- keys;
- window.

Tasks:

- rebuild object atlas where needed;
- improve material/volume/readability;
- keep stable-state reconstruction from gameplay state;
- improve transient interactions and visual reactions.

Acceptance:

- 6/6 objects identifiable without action-prompt text;
- stable/transient states remain deterministic.

### WB-05 — Atmosphere, parallax and lighting

Goal: achieve the illustrated-adventure depth associated with the target direction.

Tasks:

- exterior sky/architecture layers;
- subtle parallax ratios;
- window light spill;
- room shadow overlays;
- small ambient motion;
- controlled additive/multiply-like compositing where supported and justified.

Acceptance:

- motion adds depth without making a one-room scene feel like a scrolling platformer;
- interactive objects remain highest-priority room elements;
- no parallax layer can affect input/gameplay.

### WB-06 — FX integration

Goal: preserve Pyjamada's physical comedy while matching the new scene.

Tasks:

- replace prototype/arcade-looking FX as necessary;
- rework shock/noise/dust/sparkle/sleep/motion/success/failure visuals;
- integrate FX with scene lighting and actor motion;
- tune screen shake and micro camera response.

Acceptance:

- consequences are visually obvious before text feedback;
- stacked FX remain bounded;
- presentation never blocks gameplay.

### WB-07 — Minimal gameplay HUD integration

Goal: prevent the current HUD from degrading the scene while deferring full UI redesign.

Tasks:

- reduce viewport chrome;
- keep only essential time/energy/noise/objective information;
- move diagnostic-looking feedback away from the visual focal area;
- preserve test IDs and functionality.

Acceptance:

- the gameplay scene dominates the screen;
- HUD remains legible and functionally complete;
- no menu/font scope expansion.

### WB-08 — Presentation timing and render performance

Goal: ensure richer visuals do not magnify existing render debt.

Tasks:

- measure/revisit INC-004 (80 ms React ticker);
- decide whether presentation clock should move toward Skia/Reanimated;
- minimize React-driven redraw work;
- cache immutable geometry/images/transforms where useful;
- check texture-memory impact of new art.

Acceptance:

- INC-004 disposition backed by Android evidence;
- no obvious touch-latency regression;
- no uncontrolled animation/FX allocations.

### WB-09 — Visual QA and polish

Goal: evaluate the result as a game, not only as code.

Tasks:

- adapt screenshot tour around visual states;
- capture Android evidence locally;
- inspect start/wake/slippers/alarm/startled/wardrobe/success/failure/continue;
- tune saturation, depth, clipping, contrast and FX density;
- remove remaining obsolete visual assets/code.

Acceptance:

- deterministic automated gates green;
- Android visual QA executed externally;
- no claim of SG-14/human fun from CI;
- branch ready for dedicated team audit.

Gate C: visual branch audit-ready.

## Initial KEEP / REWORK / DELETE map

| Area | Decision | Reason |
|---|---|---|
| `SystemicRuntime` / gameplay | KEEP | canonical gameplay contract |
| `VisualEventMapper` | KEEP | correct semantic boundary |
| `PresentationRuntime` | KEEP / EXTEND | useful transient-state architecture |
| `WallyAnimator` | KEEP / REWORK clips | semantic mapping has value; art/timing may change |
| `ObjectAnimator` | KEEP / REWORK clips | state reconstruction has value |
| `FxSystem` | KEEP / REWORK visuals | lifecycle useful, style replaceable |
| `AtlasSprite` + manifests | KEEP | valid production asset pipeline |
| `GameCanvas` composition | REWORK HEAVILY | primary visual bottleneck |
| current dark bedroom primitives | DELETE / REPLACE | conflicts with charming illustrated target |
| current contact-shadow/vignette treatment | REWORK | useful concept, too arcade/prototype-like |
| current visual palette | REPLACE | optimized for dark arcade look |
| current Wally/object/FX PNG art | PROVISIONAL | retain only until replacement beats it |
| menu/settings visual styling | DEFER | explicitly outside current objective |

## Evidence and gates

Automated evidence:

```bash
npm run assets:validate
npm run test:all
npm run typecheck
npm run audit:static
```

Android/local evidence remains required for:

- composition quality;
- parallax feel;
- frame pacing;
- input responsiveness;
- reconstructed/new atlas appearance;
- final aesthetic acceptance.

## Immediate execution order

1. WB-00 visual reset/palette policy.
2. WB-01 StageViewport + layered scene.
3. WB-02 full bedroom composition.
4. review static/Android evidence before committing to expensive sprite redraw.
5. WB-03/WB-04 actor and object art production.
6. WB-05/WB-06 depth, light and consequences.
7. WB-07 minimal HUD cleanup.
8. WB-08 performance decision.
9. WB-09 final QA/polish.

## Success criterion

The pass is successful when the gameplay scene can stand on its own visually: a colorful, inviting, layered domestic adventure with an immediately readable protagonist and interactive environment, carrying the charm/depth principles associated with Wonder Boy while remaining unmistakably original Pyjamada.
