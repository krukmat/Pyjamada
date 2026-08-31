# Pyjamada

Pyjamada is an Android-first React Native experiment: a tiny domestic adventure where a simple morning routine turns into a chain of systemic consequences.

The game intentionally has one active gameplay model. Move around the bedroom, interact with a small set of objects, manage **time / energy / noise**, and get Wally dressed with the keys before the house wakes up or the morning collapses.

## Core loop

`move → interact → consequence → adapt → succeed/fail → retry`

Six objects drive the current room: bed, slippers, alarm clock, wardrobe, keys and window. Ten deterministic rules combine those objects with Wally's state (`sleepy`, `normal`, `rushed`, `startled`) to produce efficient, near-miss and chaos runs.

## Stack

- React Native + Expo
- TypeScript
- React Native Skia
- AsyncStorage
- Maestro for Android screenshot tours

Gameplay rules are pure TypeScript. React/Skia render state but do not own gameplay semantics.

## Run

```bash
npm install
npm start
npm run android
```

## Validate

```bash
npm run test:all
npm run typecheck
```

Generate the current Android visual tour with:

```bash
npm run screenshots:android
```

After an APK is already built:

```bash
SKIP_BUILD=1 npm run screenshots:android
```

Screenshots are written to `artifacts/android-screenshots/`.

## Current architecture

```text
App
├── MainMenu
├── SettingsScreen
└── GameScreen
    ├── HUD + touch controls
    └── GameCanvas
         ↓
Systemic runtime (pure TypeScript)
├── object definitions
├── ordered rule engine
├── objective resolution
├── codec / persistence validation
└── telemetry
```

The `systemic` folder name describes the gameplay architecture, not a second product mode. There is no Classic/prototype split in the active application.

## Scope

The current build is deliberately small. It validates whether a single room with reusable rules can create curiosity, understandable cause/effect and voluntary retries before adding more rooms, progression or monetization.

See `docs/GAMEPLAY.md` for the active design contract and `docs/ANDROID_SMOKE_TEST.md` for device validation.
