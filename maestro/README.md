# Android validation with Maestro

Pyjamada keeps two reproducible Android flows: the stable Classic V1.1 screenshot tour and the Systemic Bedroom Prototype scenario.

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

## Systemic Bedroom Prototype

Against an installed build, run:

```bash
maestro test maestro/systemic.yaml
```

The systemic flow covers:

```text
Menu
 -> Systemic Prototype
 -> repeated alarm / noisy wardrobe route
 -> house-awake failure
 -> TRY AGAIN
 -> clean deterministic restart
 -> Menu
```

It captures three evidence screenshots: run start, noise failure and restarted state. Domain-level efficient-success, near-miss and chaos scenarios are covered separately by `npm run test:systemic`.

On Apple Silicon with Homebrew, the Classic screenshot runner automatically uses `openjdk@17`. Set `PYJAMADA_JAVA_HOME` to an alternate Java 17 home when needed.
For flow-only Classic iteration against an already-built APK, use `SKIP_BUILD=1 npm run screenshots:android`.
