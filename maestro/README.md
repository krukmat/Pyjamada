# Android screenshots with Maestro

The screenshot tour captures the menu, settings, and the three-room V1 gameplay path on a real Android emulator.

## Prerequisites

- Node.js 22.13 or newer and project dependencies installed.
- Android SDK with `adb`, an emulator, and the NDK used by React Native Skia.
- Java 17.
- Maestro available on `PATH`.
- One booted Android emulator visible in `adb devices`.

## Run

```bash
npm run screenshots:android
```

The runner detects the emulator ABI, builds and installs a self-contained release APK, runs `maestro/screenshots.yaml`, and copies the PNG files to `artifacts/android-screenshots/`.

On Apple Silicon with Homebrew, the runner automatically uses `openjdk@17`. Set `PYJAMADA_JAVA_HOME` to an alternate Java 17 home when needed.
For flow-only iteration against an already-built APK, use `SKIP_BUILD=1 npm run screenshots:android`.
