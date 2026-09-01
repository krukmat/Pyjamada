# Expressive Arcade Refactor — Baseline

Frozen at the start of AR-00 from `main` commit `2d53246bec1c34458c389928691a8fc23a1dbb6c`.

## Product baseline

- One active gameplay path.
- Logical world: **128 × 128**.
- Android game viewport is quantized to multiples of 128 and capped at 384 logical-render pixels by `GameScreen`.
- Gameplay input: left / action / right.
- Stable resources: time, energy, noise and Wally state.
- Six interactables: bed, slippers, alarm clock, wardrobe, keys and window.
- Ten deterministic gameplay rules.
- Save domain: `pyjamada:game:v1:run`.

## Current renderer

`GameCanvas.tsx` is a single Skia canvas. The render tree is effectively:

```text
Canvas
├── BedroomBackdrop
│   ├── background Rects
│   └── floor PixelBlocks
├── BedroomAtmosphere
│   └── window / moonlight PixelBlocks
├── BedroomObjects
│   ├── bed / slippers / alarm / wardrobe PixelBlocks
│   └── KeySprite
├── HeroContactShadow
└── Wally
    └── state-coloured PixelBlocks
```

The main maintainability/performance concern is not raw draw count; it is that large object and actor block arrays are recreated inside React render functions and visual state/pose selection is tightly embedded in the renderer.

## Current screen diagnostics

The default gameplay screen simultaneously exposes:

- TIME
- ENERGY
- NOISE
- WALLY text state
- objective copy
- `NEAR: ...`
- reaction prose
- numeric resource deltas
- rule trace

This is the baseline the AR-08 pass must simplify.

## Stable test IDs used by Maestro

- `main-menu-screen`
- `new-game-button`
- `continue-button`
- `settings-button`
- `game-screen`
- `move-left-button`
- `move-right-button`
- `action-button`
- `restart-button`
- `exit-button`
- `game-reaction`

These IDs should remain stable unless `maestro/screenshots.yaml` changes in the same commit.

## Historical nine-shot visual tour

1. `01_main_menu`
2. `02_run_start`
3. `03_bed_wake`
4. `04_slippers`
5. `05_alarm`
6. `06_startled`
7. `07_wardrobe`
8. `08_success`
9. `09_restart`

The final refactor expands this to eleven shots and adds explicit chaos/failure plus settings evidence.

## Baseline commands

```bash
npm run test:all
npm run typecheck
npm run screenshots:android
```

The first two are CI gates. Android screenshots require an emulator/device and remain a developer-side visual gate; see INC-001.

## Refactor checklist

- [x] Freeze logical size, viewport behavior and test IDs.
- [x] Inventory current render tree.
- [x] Record current screenshot tour.
- [ ] Introduce richer art-direction tokens.
- [ ] Introduce deterministic atlas/animation contracts.
- [ ] Introduce semantic visual-event boundary.
- [ ] Replace actor/object block arrays with expressive asset-backed presentation.
- [ ] Rebuild bedroom and FX.
- [ ] Reduce diagnostic HUD text.
- [ ] Integrate app shell.
- [ ] Harden interruption/restart/save behavior.
- [ ] Remove obsolete rendering path.
- [ ] Complete final screenshot review.
