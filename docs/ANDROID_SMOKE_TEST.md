# Android V1 Smoke Test Gate

Run this before approving any scope beyond V1.

## Environment

- Node.js >= 22.13
- Android Studio / Android SDK configured
- Android NDK available for React Native Skia
- one emulator or representative physical Android device

## Setup

```bash
npm install
npx expo-doctor
npx expo run:android
```

## Gate A — startup / renderer

- [ ] App starts without native/Metro errors.
- [ ] Main menu renders correctly.
- [ ] `NEW GAME`, `CONTINUE`, and `SETTINGS` are visible.
- [ ] Skia viewport renders at the intended 128x128 logical scale without smoothing/artifacts.
- [ ] Touch controls fit the target screen without clipping.

## Gate B — CU-01

- [ ] New Game opens room-01.
- [ ] Initial player position is stable.
- [ ] After a save exists, New Game requests replacement confirmation.
- [ ] Cancel preserves the previous save.
- [ ] Confirmed replacement starts from the deterministic initial state.

## Gate C — CU-03 rapid input / progression

- [ ] Rapid repeated left/right taps do not lose or reorder visible movement.
- [ ] Key can be collected.
- [ ] Locked door blocks movement.
- [ ] ACTION consumes the key and unlocks the door.
- [ ] Player can reach room-02 and room-03.
- [ ] Slice completion alert appears only on first completion transition.

## Gate D — CU-02 / persistence

1. Progress into room-02 or room-03.
2. Force-stop/kill the app process.
3. Relaunch the app.

- [ ] Continue is enabled for the compatible save.
- [ ] Continue restores room, player position, inventory and progression flags.
- [ ] A deliberately corrupted/incompatible save does not enable Continue.
- [ ] Starting New Game can replace the incompatible save after confirmation.

## Gate E — CU-06

- [ ] Toggle audio setting and change music/SFX levels.
- [ ] Switch control layout to mirrored.
- [ ] Rapidly tap volume +/- several times; all increments are reflected in order.
- [ ] Enter gameplay and verify mirrored controls are applied.
- [ ] Force-stop/relaunch app; settings remain restored.
- [ ] Game save remains unaffected by settings changes.

## Gate F — lifecycle sanity

- [ ] Background/foreground does not crash the app.
- [ ] Returning from background keeps the current in-memory state.
- [ ] Process termination still recovers from the persisted state via Continue.

## Decision

**GO** only when all critical checks above pass without native crashes, storage-order anomalies, touch-order anomalies, or unusable viewport scaling.

If a critical check fails, fix V1 before implementing new use cases or broadening content fidelity.
