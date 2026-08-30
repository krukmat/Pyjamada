# Pyjamada

Android-first React Native/TypeScript validation project for a faithful Pyjamarama-style architecture without distributing copyrighted source assets.

## V1 baseline — v0.5 reviewed

Explicit use cases covered:

- **CU-01 — Start New Game**
- **CU-02 — Continue Saved Game**
- **CU-03 — Minimal Vertical Slice Gameplay**
- **CU-06 — Configure Game**

Supporting capability:

- **CU-05 — Persist Game Progress**, internal only; not a standalone player-facing use case.

This completes the functional scope approved for V1. It does **not** represent a complete Pyjamarama port or commercial MVP.

See [`docs/V1_REVIEW.md`](docs/V1_REVIEW.md) for the integrated review and go/no-go gates.

## Vertical slice

```text
room-01
  ↓
collect bedroom-key
  ↓
locked door collision
  ↓
ACTION consumes key
  ↓
bedroomDoorUnlocked
  ↓
room-02
  ↓
room-03
  ↓
verticalSliceReached
```

The slice uses three logical 128×128 rooms, touch input, Skia rendering, minimal inventory, one interaction/puzzle flag and persistent state.

## Reliability hardening in v0.5

- game-save writes are serialized;
- rapid gameplay input advances from an authoritative in-memory state ref rather than a stale render closure;
- `CONTINUE` is enabled only for a compatible decoded save;
- confirmed New Game replacement uses one overwrite write rather than `clear -> save`;
- save codec validates coordinates, inventory, flags and V1 progression consistency;
- rapid settings changes are serialized and volume controls submit deltas;
- integrated V1 tests cover New Game → gameplay → save → Continue and settings/save isolation.

## CU-06 settings

Settings are stored separately from the game save:

- audio ON/OFF;
- music volume;
- SFX volume;
- standard/mirrored touch-control layout.

The touch layout affects CU-03 controls immediately. Audio values are persisted but source-faithful audio playback is intentionally deferred.

## Architecture

```text
React Native Shell
   ├── CU-01 New Game
   ├── CU-02 Continue
   ├── CU-06 Settings
   └── CU-03 Gameplay UI

TypeScript Game Core
   ├── GameState
   ├── updateGame()
   ├── rooms / collision / inventory / progression
   └── GameStateCodec

React Native Skia
   └── 128×128 logical renderer

Persistence
   ├── GameSavePort → AsyncStorageGameSaveRepository
   └── GameSettingsPort → AsyncStorageGameSettingsRepository
```

Architectural rules:

- Game rules/state remain outside React UI components.
- Skia renders game state; it does not own gameplay decisions.
- Game save and application settings are separate domains and storage keys.
- Use cases depend on ports, not directly on AsyncStorage.
- Save/settings schemas are versioned and validated.
- No original/remake sprites, maps, audio or other copyrighted Pyjamarama assets are included.

## Stack

- Expo SDK 57
- React Native 0.86
- React 19.2.3
- TypeScript
- React Native Skia 2.6.2
- AsyncStorage 2.2.0 behind explicit persistence ports
- Node.js 22.13+ required by Expo SDK 57

Current official Expo documentation maps SDK 57 to React Native 0.86 / React 19.2.3, recommends Skia 2.6.2 and AsyncStorage 2.2.0. Native Android execution remains a required V1 gate despite this version-level compatibility check.

## Run

```bash
npm install
npx expo start
```

For Android native development:

```bash
npx expo run:android
```

## Tests

```bash
npm run test:cu01
npm run test:cu02
npm run test:cu03
npm run test:cu06
npm run test:integration
npm run test:v1
```

Specifications:

- [`docs/CU-01.md`](docs/CU-01.md)
- [`docs/CU-02.md`](docs/CU-02.md)
- [`docs/CU-03.md`](docs/CU-03.md)
- [`docs/CU-06.md`](docs/CU-06.md)

## Deferred after V1

- broader/full Classic Mode port;
- source-authentic art/audio replacement;
- advanced settings/accessibility;
- monetization, Google Play Billing and entitlements;
- Premium Extras / Challenge Packs;
- backend/accounts/cloud saves;
- iOS/App Store/StoreKit.

## V1 decision point

Do **not** expand scope automatically. First perform the Android runtime smoke test defined in `docs/V1_REVIEW.md`; then decide whether to approve a broader fidelity/content phase.
