# Android validation with Maestro

Pyjamada keeps separate Android flows for the stable Classic V1.1 baseline, systemic smoke validation, and the systemic visual screenshot tour.

## Prerequisites

- Node.js 22.13 or newer and project dependencies installed.
- Android SDK with `adb`, an emulator, and the NDK used by React Native Skia.
- Java 17.
- Maestro available on `PATH`.
- One booted Android emulator visible in `adb devices`.

## Classic V1.1 screenshot tour

```bash
npm run screenshots:android
```

The runner detects the emulator ABI, builds and installs a self-contained release APK, runs `maestro/screenshots.yaml`, and copies the PNG files to `artifacts/android-screenshots/`.

The flow covers menu, settings and the deterministic Bedroom → key → door → Hall → Landing path.

## Systemic visual screenshot tour

```bash
npm run screenshots:systemic:android
```

The runner uses the same release-build/emulator setup, runs `maestro/systemic-screenshots.yaml`, and copies exactly nine visual checkpoints to `artifacts/android-systemic-screenshots/`:

```text
Menu
 -> Systemic run start
 -> Bed wake / normal Wally
 -> Slippers equipped
 -> Alarm interaction
 -> Startled Wally + rule trace
 -> Wardrobe chained consequence
 -> Successful dressed + keys outcome
 -> Clean deterministic restart
```

Use this command when reviewing the systemic skin, HUD, object states, Wally states, consequence feedback and restart baseline.

## Systemic smoke flow

Against an installed build, the shorter functional scenario remains available as:

```bash
maestro test maestro/systemic.yaml
```

It covers start → deterministic noise failure → TRY AGAIN → clean restart → menu. Domain-level efficient-success, near-miss and chaos scenarios are covered separately by `npm run test:systemic`.

On Apple Silicon with Homebrew, both screenshot runners automatically use `openjdk@17`. Set `PYJAMADA_JAVA_HOME` to an alternate Java 17 home when needed.
For flow-only iteration against an already-built APK, use `SKIP_BUILD=1 npm run screenshots:android` or `SKIP_BUILD=1 npm run screenshots:systemic:android`.
