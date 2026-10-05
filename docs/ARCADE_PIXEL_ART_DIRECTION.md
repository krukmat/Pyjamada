# Pyjamada — 80s Arcade Pixel Art Direction

Status: PHASE 1 IN PROGRESS — steps 1-4 complete, 2026-09-28. Next: step 5 (tileset + objects).
Supersedes the rendering technique of: `docs/WONDER_BOY_VISUAL_REWORK_PLAN.md` (that plan's
composition/layering goals remain valid; its Skia-primitive execution does not).

## Decisions already made (do not re-litigate)

- **Technique:** generated pixel-art atlases. Chosen over improved Skia primitives (cannot
  reach the target look) and over a hybrid (freezes the two-visual-language collision that is
  part of the current problem).
- **Reference:** Wonder Boy warmth as the base, Ghosts'n Goblins gothic as the house darkens.
- **Phase 1 scope:** bedroom vertical slice only, as an art-direction proof.
- **Approval:** phase 1 is approved to implement. Later phases are not.

## Where to resume

Steps 1-4 (pipeline, palette, grid, Wally) are implemented and verified. Step 4 is the first
visually judgeable point; the user has seen an upscaled preview of the hand-drawn frames but
**the Android screenshot run has not happened**, so visual acceptance is still open.

Start at step 5 (bedroom tileset and the six objects).

Open gates before closure, per RRI 44 High:

- 1st Reviewer (task analysis) — **waived by the user on 2026-09-28**, in session, for
  phase 1. Recorded as an explicit exemption, not a `PASS`.
- 2nd Reviewer (solution) — required, independent fresh context, before closure. Still open.
- Android screenshot run — the visual acceptance gate; a human judges it. Still open.

Step 4 (Wally redraw) is the first visually judgeable point — stop there and show the user
before investing in the tileset.

### Step 4 scoping decision (settled)

Wally's atlas is **57** frames across 20 clips (an earlier note said 59; the manifest is the
authority and the test now asserts against it). The user chose option 2 on 2026-09-28:

- **Hand-drawn (4 clips):** `idle_normal`, `walk_normal`, `idle_sleepy`, `collect_keys`, built
  from ten distinct poses.
- **Derived (16 clips):** correct clip ids, frame counts and timing, but reusing hand-drawn
  poses as declared placeholders. `DERIVED_CLIPS` in `WallyPixels.ts` lists them, and the test
  asserts every manifest clip is classified exactly once — a placeholder can never be mistaken
  for finished art.

Those sixteen clips still need their own drawing before phase 1 can close.

### Implemented in steps 1-3

| Step | Artifact | Notes |
|---|---|---|
| 1 Pipeline | `scripts/generate-sprites.mjs`, `scripts/generate-sprites.test.mjs` | Deterministic RGBA8 PNG encoder; `npm run sprites:build` and `npm run sprites:check`. 15 tests. |
| 1 Registry | `src/game/presentation/atlas/pixels/index.ts` | `SPRITE_SOURCES`, intentionally empty until step 4; the generator treats that as a clean no-op. |
| 2 Palette | `src/game/presentation/atlas/pixels/ArcadePalette.ts`, `tests/arcade-palette.test.ts` | Ten named ramps x four value steps, both poles, linear blend, flattened 42-slot layout. |
| 3 Grid | `src/game/render/StageViewport.ts`, `tests/stage-viewport.test.ts` | `integerStageScaleForScreenWidth`; scale clamped to 1-4 and floored. |
| 4 Wally | `src/game/presentation/atlas/pixels/WallyPixels.ts`, `tests/wally-pixels.test.ts`, regenerated `assets/game/wally/wally.png` | Ten hand-drawn 24x28 poses; test binds frame ids/order/geometry to the manifest. |

Two implementation details worth carrying forward:

- The generator now pads rows shorter than the frame width with transparent, so sources are
  written without hand-counted trailing dots. An over-long row is still an error.
- The generator's index alphabet was widened from 36 to 62 characters
  (`0-9`, `a-z`, `A-Z`). The flattened palette needs 42 slots, so 36 could not address it.
- `stageDimensionsForScreenWidth` previously produced fractional scales (e.g. 2.34) because
  it floored the pixel height and divided back. It now floors the *scale* and multiplies up,
  so `stageScale(height)` in `GameCanvas` re-derives the same integer. The stage is slightly
  smaller at some widths; that leftover width is dead space the caller centres.

## Problem

The gameplay screen does not read as an 80s arcade game. Android screenshot evidence
(`artifacts/android-screenshots/`, 2026-09-18) shows three compounding causes.

### 1. Scenes are drawn with vector primitives, not pixel art

Every room is built from Skia `Rect`, `RoundedRect`, `Circle` and `Line` calls. Example,
`src/game/render/KitchenPresentation.tsx`: the kitchen is ~20 axis-aligned rectangles in
flat greys. There is no dithering, no material value ramp, no hand-placed pixel, no texture.

Vector primitives cannot express what makes Wonder Boy look like Wonder Boy. That look is a
per-pixel decision: 3–4 value ramps per material, manual anti-aliasing, selective outlines,
dithered gradients. A rectangle has one value and a hard machine edge.

Consequence: rooms read as wireframes or UI mockups. `23_kitchen_arrival.png` is the clearest
case — it reads as a greyscale layout diagram, not a kitchen.

### 2. Two visual languages collide

Wally and the ghost are real atlas sprites (`assets/game/wally/`, `assets/game/monsters/`).
Rooms are code-drawn primitives. A pixel-art actor standing in a vector room reads as a sticker
on a background, not as an inhabitant of a place. Visible in `03_haunted_sleepy.png` and
`06_ghost_active.png`: Wally has chunky pixel outlines; the wardrobe behind him has clean
vector edges at a different effective resolution.

The 128×128 logical world is not enforced as a pixel grid at render time, so primitives render
at screen resolution while sprites render at sprite resolution. There is no single pixel size.

### 3. The palette is muddy and lacks value separation

`SCENE_TOKENS` in `src/game/render/VisualLanguage.ts` carries ~50 desaturated colours in a
narrow mid-value band (`#775845`, `#705461`, `#85564d`, `#8a5f77`). 80s arcade palettes were
small, saturated and widely separated in value — a hardware constraint that became the style.

Consequence: in `03_haunted_sleepy.png` the bed, floor, wardrobe and wall occupy nearly the
same value. Wally separates only because of his outline. Interactive objects do not pop.

### Secondary issues

- The gameplay viewport is a rounded-corner card floating in dead space, roughly a third of
  screen height. Arcade games fill the frame.
- The HUD is a translucent panel overlapping the scene top, with hairline type — a debug
  overlay, not an arcade HUD.
- `assets/game/` holds 5 PNGs with no source form in the repo. They cannot be reviewed in a
  diff, regenerated, or edited systematically.

## Direction

> Wonder Boy warmth as the base; Ghosts'n Goblins gothic as the house darkens.

Early rooms (bedroom, hallway, living room, kitchen) use a warm, saturated, cheerful palette
with high readability. As the narrative descends (basement, laboratory, ghost encounters,
nightmare), the palette shifts to the gothic register: colder, harder silhouettes, dramatic
value contrast, deeper blacks.

This maps onto progression the game already has. It is one palette system with two poles and a
per-room blend, not two art styles.

### Non-negotiable constraints

- Original art only. No Pyjamarama, Wonder Boy, Ghosts'n Goblins or other protected sprites,
  tiles, compositions or palettes. Reference the *principles*, never the pixels.
- Gameplay contracts untouched: six objects, ten rules, deterministic updates, save format.
- `src/game/systemic` stays free of presentation imports.
- Rule IDs terminate at `VisualEventMapper`.

## Technical approach: generated pixel atlases

Sprites are authored as **pixel data in TypeScript**, committed to the repo, and compiled to
PNG atlases by a build script.

```text
src/game/presentation/atlas/pixels/*.ts     <- source of truth, reviewable in diff
        │  (npm run sprites:build)
        ▼
assets/game/**/*.png                        <- generated artifact
        │
        ▼
existing SpriteAtlas / manifest / AtlasSprite pipeline  <- unchanged
```

Each source module exports a palette plus frames as index-into-palette rows:

```ts
export const WALLY_PALETTE = ['transparent', '#1a1220', '#e7a06f', ...] as const;
export const WALLY_IDLE_0 = [
  '....11111....',
  '...1222221...',
  ...
];
```

Why this and not an external art tool:

- **Reviewable.** A sprite change is a readable diff, not an opaque binary blob.
- **Deterministic.** Regenerating from source yields byte-identical PNGs; testable in CI.
- **Systematic.** Palette shifts (the Wonder Boy → G'nG ramp) apply across every sprite by
  changing one palette table, not by repainting each asset.
- **No new runtime dependency.** The script runs at build/author time; the app still loads PNGs
  through the atlas pipeline that already exists.
- **No external tooling required** for a contributor to make a change.

Rooms move from primitive calls to **tilesets**: 16×16 tiles authored the same way, composed
via a room tilemap. This is what gives rooms the same pixel density as actors and resolves
issue #2.

### Pixel grid enforcement

One logical pixel must equal an integer number of screen pixels, identical for sprites, tiles
and any remaining primitive. `StageViewport` already exists and is the right home for this.
Non-integer scaling is the difference between crisp arcade art and blurry approximate art.

## Phase 1 — Bedroom vertical slice

**Goal:** bring one room end-to-end to the target look, as an art-direction proof. If the
result is not compelling, the direction is wrong and little has been spent.

Scope is the bedroom only. Other rooms keep their current rendering and are untouched.

### In scope

| Area | Work |
|---|---|
| Pipeline | `scripts/generate-sprites.mjs` + `npm run sprites:build` + determinism test |
| Palette | New arcade palette module: warm base pole, gothic pole, blend function |
| Grid | Integer pixel-scale enforcement in `StageViewport` |
| Wally | Redrawn sprite: idle, walk, jump, interact, sleepy, startled |
| Tileset | Bedroom tiles: wall, floor, skirting, window frame, ceiling |
| Objects | Six interactive objects as pixel sprites: bed, alarm clock, wardrobe, slippers, window, keys |
| Composition | Bedroom rebuilt as tilemap + props; viewport fills more of the screen |

### Out of scope

- Other rooms (hallway, living room, kitchen, bathroom, attic, basement, laboratory)
- Enemy/ghost redraw
- FX redraw
- HUD redesign beyond removing the chrome that blocks the scene
- Main menu, settings, fonts, branding
- Any gameplay, rule, save-format or audio change

### Acceptance

- A static screenshot of the bedroom reads as an 80s arcade game, not a UI mockup.
- Wally and all six interactive objects are identifiable with the HUD text hidden.
- Wally and the room share one pixel density; no mixed-resolution seam.
- `npm run sprites:build` is deterministic: a rerun leaves the tree clean.
- Gameplay is unchanged: `npm run audit:premerge` passes.
- Restart clears presentation; continue reconstructs stable visuals from loaded state.
- **Edge:** at every supported viewport size the pixel scale stays an integer — no fractional
  scaling, no shimmer when Wally moves.

### Evidence

```bash
npm run sprites:build      # new; must leave tree clean on rerun
npm run sprites:check      # new; fails if a committed PNG drifts from its source
npm run audit:premerge     # tests + typecheck + static architecture checks
npm run screenshots:android  # MANUAL, on an Android target — the real acceptance gate
```

Evidence recorded for steps 1-3 on 2026-09-28:

```text
npm run audit:premerge - PASS (tests + typecheck + static architecture checks)
npm run sprites:build then npm run sprites:check - PASS (rerun leaves the tree clean)
node scripts/audit-assets.mjs - PASS (generated wally.png matches the atlas: 240x168, 57 frames)
npm run screenshots:android - NOT RUN (no Android target in session; still the acceptance gate)
1st Reviewer / task analysis: waived by the user, 2026-09-28 - n/a (exemption, not PASS)
2nd Reviewer / solution: not yet run - OPEN
```

Visual acceptance is a human judgement on the Android screenshots. It cannot be automated and
must not be claimed without an actual device run.

### Scope expansion — step 4b, wiring the sprite (2026-09-28)

This plan assumed Wally was already "a real atlas sprite" whose art merely needed redrawing. He
was not. In the bedroom run the actor on screen was `IllustratedWally`, posed from Skia
`Circle`/`Rect`/`RoundedRect` primitives; `WALLY_ATLAS_SOURCE` was exported from
`AssetSources.ts` and imported by no screen. The only Wally atlas actually loaded was
`haunted-wally.png`, in `HauntedGameScreen`. Redrawing `wally.png` therefore could not change a
single pixel of what the game displays.

Closing that gap crosses two boundaries the plan had not allocated:

| Path | Change | Floors |
|---|---|---|
| `src/game/render/WallySprite.tsx` (new) | Chooses the atlas when the image has decoded, `IllustratedWally` while it has not. | D2 / P1 / K3 |
| `src/game/render/GameCanvas.tsx` | New `wallyImage` prop; the bedroom branch renders `WallySprite`. | D2 / P1 / K3 |
| `src/app/GameScreen.tsx` | Loads `WALLY_ATLAS_SOURCE` through `useImage` and passes it down. | D2 / P3 / K3 |

Authorized in session by the user ("conecta el sprite") after the gap was reported rather than
absorbed silently. Invariants hold: the animator still owns clip identity and timing,
`WallyVisualFrame` already carried the resolved `AtlasFrame`, rule IDs still terminate at
`VisualEventMapper`, and nothing transient is persisted. `IllustratedWally` stays as the
pre-decode fallback, so the actor is never missing from the stage.

```text
npm run audit:premerge - PASS, 2026-09-28 (8 suites, 84 tests, 0 failures; typecheck; static checks)
npm run screenshots:android - NOT RUN at time of writing; requires an APK rebuilt from this branch
2nd Reviewer / solution: not yet run - OPEN
```

All of this work lives on branch `arcade`, held off `main` until Phase 1 closes.

### RRI

```text
RRI 44 High (base 44, modifiers none, floors none)
Dominant drivers: K (8.4), P (6.4), D (6.0)
Capability route: gpt-5.6-terra/high; approval explicit; review independent fresh context
Execution: primary agent + repository tooling + Android device for visual evidence
Local developer: ineligible — art direction is open-ended design judgement, not a bounded patch
Gate: 1st Reviewer required before implementation; 2nd Reviewer required before closure
```

Artifact: `npm run rri -- --touches scripts/generate-sprites.mjs --touches src/game/presentation/atlas/pixels/WallyPixels.ts --touches src/game/presentation/atlas/manifests.ts --touches src/game/render/VisualLanguage.ts --touches src/game/render/IllustratedBedroomScene.tsx --touches assets/game/wally/wally.png --touches docs/WONDER_BOY_VISUAL_REWORK_PLAN.md --cc 9 --D 2 --T 2 --A 2 --K 3 --P 2 --X 3`

### Ordered steps

1. ~~**Pipeline** — sprite generator, npm script, determinism test. No visual change yet.~~ DONE
2. ~~**Palette** — arcade palette module with both poles and the blend; unit-tested.~~ DONE
3. ~~**Grid** — integer pixel scale in `StageViewport`; verify no regression in current rooms.~~ DONE
4. ~~**Wally** — redraw as pixel source; swap the atlas; confirm all semantic clips resolve.~~ DONE (4 clips hand-drawn, 16 derived)
5. **Tileset + objects** — bedroom tiles and the six objects.
6. **Composition** — rebuild the bedroom as tilemap + props; enlarge the viewport.
7. **Evidence** — Android screenshot run; human visual acceptance.

Steps 1–3 are foundation and carry no visual payoff on their own. Step 4 is the first point
where the direction becomes visible and judgeable — a useful early checkpoint.

## Later phases (not approved, sketch only)

- **Phase 2** — roll the tileset system to the remaining warm rooms (hallway, living room,
  kitchen, bathroom).
- **Phase 3** — gothic pole: basement, laboratory, attic; ghost and enemy redraw.
- **Phase 4** — FX pass in the new language.
- **Phase 5** — HUD and menu in the arcade register.

## Risk

- **Art quality is the real risk.** The pipeline is straightforward; whether the generated
  pixel art is *good* is a judgement call that only the Android screenshots settle. Phase 1 is
  deliberately one room so this is cheap to reverse.
- **Volume of pixel authoring.** A tileset plus six objects plus an actor is substantial. If it
  proves too slow, the fallback is fewer, larger tiles and simpler props — not a return to
  primitives.
- **Regression in untouched rooms.** Step 3 touches shared `StageViewport`. Mitigated by
  running the full screenshot contract before and after.
